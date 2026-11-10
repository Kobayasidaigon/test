# -*- coding: utf-8 -*-
"""笠寺の遅番に「排水溝ネット交換」を4つ足す（2026-11-10 の依頼）。

頼まれたこと:
  「笠寺の遅番にシャワールームの排水溝ネット交換を追加したい
    男シャワー、女シャワー、男サウナ、女サウナ
    それぞれでチェックを打てるようにして」

やること:
  - 笠寺の遅番（sdef_笠寺_customItems_routine_ban）に4行を足す
    id は ban_drainnet_*、addedAt に入れた日（7日間「新」が出る）
  - 入れる場所は ANCHOR_ID の行のすぐ下（同じ区分）。
    ANCHOR_ID が None なら、シャワー／サウナの行がある区分の最後。

やらないこと:
  - 枇杷島・萩野通
  - いまある行を消す・idを変える・並びを入れ替える
  - 記録（clean_ など）
  - 4行ともすでに入っていたら、何も書かない（何度流しても増えない）
"""
import json

STORE = '笠寺'
KEY = 'customItems_routine_ban'
# ★ idは一度入れたら変えない（記録はこのidで結び付く）
ITEMS = [
    {'id': 'ban_drainnet_shower_m', 'title': '排水溝ネット交換（男シャワー）'},
    {'id': 'ban_drainnet_shower_w', 'title': '排水溝ネット交換（女シャワー）'},
    {'id': 'ban_drainnet_sauna_m', 'title': '排水溝ネット交換（男サウナ）'},
    {'id': 'ban_drainnet_sauna_w', 'title': '排水溝ネット交換（女サウナ）'},
]
ANCHOR_ID = 'ban_trashbin_clean'   # シャワールーム・サウナルームのゴミ箱の清掃。この直後に入れる
HINTS = ('シャワー', 'サウナ', '排水')


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def where(rows):
    if ANCHOR_ID:
        for n, r in enumerate(rows):
            if isinstance(r, dict) and r.get('id') == ANCHOR_ID:
                return n + 1, r.get('section')
        raise SystemExit('::error::遅番に %s（目印の行）がありません' % ANCHOR_ID)
    secs = []
    for r in rows:
        if isinstance(r, dict) and any(h in str(r.get('title') or '') for h in HINTS):
            if r.get('section') not in secs:
                secs.append(r.get('section'))
    if len(secs) != 1:
        raise SystemExit('::error::シャワー／サウナの行がある区分が %d 個です: %r。'
                         'ANCHOR_ID を決めてください' % (len(secs), secs))
    last = max(n for n, r in enumerate(rows) if isinstance(r, dict) and r.get('section') == secs[0])
    return last + 1, secs[0]


def build_add(kv, today):
    writes, report = {}, {}
    k = 'sdef_%s_%s' % (STORE, KEY)
    if kv.get(k) is None:
        raise SystemExit('::error::%s がありません（共通のままなら人が決める）' % k)
    rows = jload(kv[k], None)
    if not isinstance(rows, list) or not rows:
        raise SystemExit('::error::%s が読めません' % k)
    report['before'] = [(r.get('section'), r.get('id'), r.get('title'), r.get('link'))
                        for r in rows if isinstance(r, dict)]
    have = {r.get('id') for r in rows if isinstance(r, dict)}
    new_ids = [it['id'] for it in ITEMS]
    if all(i in have for i in new_ids):
        report['same'] = True
        return writes, report
    if any(i in have for i in new_ids):
        raise SystemExit('::error::一部だけ入っています。人が確かめてください')
    at, sec = where(rows)
    add = [{'id': it['id'], 'section': sec, 'title': it['title'], 'desc': '',
            'addedAt': today} for it in ITEMS]
    out = list(rows[:at]) + add + list(rows[at:])
    # ---- 念のための確かめ ----
    if len(out) != len(rows) + len(ITEMS):
        raise SystemExit('::error::行の数がおかしい')
    if [r for r in out if not any(r is a for a in add)] != rows:
        raise SystemExit('::error::いまある行が変わります')
    writes[k] = json.dumps(out, ensure_ascii=False)
    report['added'] = {'section': sec, 'at': at,
                       'after': report['before'][at - 1] if at > 0 else None,
                       'rows': add, 'count': (len(rows), len(out))}
    return writes, report


# ======================================================================
# もう一つの形（2026-11-10 daigoさん「他のシャワーとサウナのやつを参考に」）:
#   朝番の「シャワー清掃」と同じく、遅番の1行を開くと中でチェックする形。
#   - 笠寺だけのエリア drainnet（排水溝ネット交換、hidden＝タブには出さない）を足す
#     ※ shower_ で始めると進み具合の数から外れる（isShowerArea）ので使わない
#   - その中に 男シャワー・女シャワー・男サウナ・女サウナ の4項目
#   - 遅番の ban_trashbin_clean の下に、drainnet につながる1行
# ======================================================================
AREA_KEY = 'drainnet'                      # ★ 一度入れたら変えない
AREA = {'key': AREA_KEY, 'name': '排水溝ネット交換', 'icon': 'shower-head', 'hidden': True}
AREA_SECTION = '排水溝ネット交換'
AREA_ITEMS = [
    {'id': 'drainnet_shower_m', 'title': '男シャワー'},
    {'id': 'drainnet_shower_w', 'title': '女シャワー'},
    {'id': 'drainnet_sauna_m', 'title': '男サウナ'},
    {'id': 'drainnet_sauna_w', 'title': '女サウナ'},
]
ROW = {'id': 'ban_drainnet', 'title': '排水溝ネット交換', 'desc': '', 'link': AREA_KEY}


def build_area(kv, today):
    writes, report = {}, {}
    ak = 'sdef_%s_customAreas' % STORE
    ik = 'sdef_%s_customItems_%s' % (STORE, AREA_KEY)
    bk = 'sdef_%s_%s' % (STORE, KEY)
    for k in (ak, bk):
        if kv.get(k) is None:
            raise SystemExit('::error::%s がありません' % k)
    areas = jload(kv[ak], None)
    rows = jload(kv[bk], None)
    if not isinstance(areas, list) or not areas or not isinstance(rows, list) or not rows:
        raise SystemExit('::error::エリア一覧か遅番が読めません')
    have_area = any(isinstance(a, dict) and a.get('key') == AREA_KEY for a in areas)
    have_row = any(isinstance(r, dict) and r.get('id') == ROW['id'] for r in rows)
    have_items = kv.get(ik) is not None
    if have_area and have_row and have_items:
        report['same'] = True
        return writes, report
    if have_area or have_row or have_items:
        raise SystemExit('::error::一部だけ入っています。人が確かめてください')
    if kv.get('customItems_' + AREA_KEY) is not None:
        raise SystemExit('::error::共通の customItems_%s があります' % AREA_KEY)
    # 遅番に4行案の行が入っていたら止める（2つの形が混ざらないように）
    if any(isinstance(r, dict) and str(r.get('id', '')).startswith('ban_drainnet_') for r in rows):
        raise SystemExit('::error::4行案の行がもう入っています')

    new_areas = list(areas) + [dict(AREA)]
    items = [{'id': it['id'], 'section': AREA_SECTION, 'title': it['title'], 'desc': '',
              'addedAt': today} for it in AREA_ITEMS]
    at, sec = where(rows)
    row = dict(ROW, section=sec, addedAt=today)
    out = list(rows[:at]) + [row] + list(rows[at:])
    # ---- 念のための確かめ ----
    if new_areas[:-1] != areas or [r for r in out if r is not row] != rows:
        raise SystemExit('::error::いまある中身が変わります')
    writes[ak] = json.dumps(new_areas, ensure_ascii=False)
    writes[ik] = json.dumps(items, ensure_ascii=False)
    writes[bk] = json.dumps(out, ensure_ascii=False)
    report['added'] = {'area': AREA, 'items': items, 'row': row,
                       'after': (rows[at - 1].get('id'), rows[at - 1].get('title')),
                       'areas': (len(areas), len(new_areas)), 'ban': (len(rows), len(out))}
    return writes, report
