# -*- coding: utf-8 -*-
"""枇杷島のサウナ・シャワーを部屋別に分ける。

頼まれた構成:
  シャワー 男4つ（サウナB・サウナC・シャワー1・シャワー2）
           女3つ（サウナB・シャワー1・シャワー2）     → 7室
  サウナ   男3つ・女2つ                              → 5室

作り方:
  笠寺の部屋（sauna_b1 / shower_b1）を見本にして、中身をそのまま写す。
  推測で項目を作らない。区分（section）だけ部屋の名前に差し替える。
  エリアに付いている印（hidden / carryForward / icon）も見本からそのまま持ってくる。
    hidden       : タブには出さない（やることリストからだけ開く）
    carryForward : 朝に付けたチェックを中番・遅番でも済みとして出す

枇杷島だけにある項目:
  「サーキュレーターの清掃作動確認」は笠寺のサウナ見本に無いので、
  写したあとサウナ各室の末尾に足す（idはそのまま。記録が迷子にならない）。

いまの共通エリアの扱い:
  sauna / shower は項目を全部 hiddenItems_ に入れて下げる。
  記録（clean_）は1件も消さない。アプリの「エリアを削除」は記録まで消すので使わない。

やらないこと:
  - 笠寺・萩野通には一切触らない
  - 記録（clean_ / periodicDone_ など）を触る
  - いまある customAreas の並びを崩す（末尾に足すだけ）
  - 何度流しても増えない（すでにある部屋は作り直さない）
"""
import json

SRC = '笠寺'          # 見本を取る店舗
DST = '枇杷島'         # 作る店舗

SAUNA_SRC = 'sauna_b1'
SHOWER_SRC = 'shower_b1'

SAUNA_ROOMS = [
    ('sauna_b1', 'サウナ男A'),
    ('sauna_b2', 'サウナ男B'),
    ('sauna_b3', 'サウナ男C'),
    ('sauna_b4', 'サウナ女A'),
    ('sauna_b5', 'サウナ女B'),
]
SHOWER_ROOMS = [
    ('shower_b1', 'シャワー男1'),
    ('shower_b2', 'シャワー男2'),
    ('shower_b3', 'シャワー女1'),
    ('shower_b4', 'シャワー女2'),
    ('shower_b5', 'サウナ男Bのシャワー'),
    ('shower_b6', 'サウナ男Cのシャワー'),
    ('shower_b7', 'サウナ女Bのシャワー'),
]
# 枇杷島のサウナにしか無い項目。写したあと各室の末尾に足す
EXTRA_SAUNA_IDS = ['c1781141211047287']
# 下げる共通エリアと、やることリストの行（どの行のリンク先を差し替えるか）
RETIRE = {'sauna': [k for k, _ in SAUNA_ROOMS], 'shower': [k for k, _ in SHOWER_ROOMS]}


def defread(kv, store, key):
    v = kv.get('sdef_%s_%s' % (store, key))
    if v is None:
        return kv.get(key), 'きょうつう'
    return v, 'みせべつ'


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def _areas(kv, store):
    v = jload(defread(kv, store, 'customAreas')[0], None)
    return v if isinstance(v, list) else None


def _template(kv, area_key, where):
    """見本の部屋から、エリアの印と項目をそのまま取る。"""
    src_areas = _areas(kv, SRC)
    if src_areas is None:
        raise SystemExit('::error::%s のエリア一覧が読めません' % SRC)
    ent = None
    for a in src_areas:
        if isinstance(a, dict) and a.get('key') == area_key:
            ent = a
            break
    if ent is None:
        raise SystemExit('::error::%s に %s がありません。見本が取れないので止めます'
                         % (SRC, area_key))
    items = jload(defread(kv, SRC, 'customItems_' + area_key)[0], None)
    if not isinstance(items, list) or not items:
        raise SystemExit('::error::%s / %s の項目が読めません' % (SRC, area_key))
    bad = [c for c in items if not isinstance(c, dict) or not c.get('id')]
    if bad:
        raise SystemExit('::error::%s / %s に id の無い項目があります' % (SRC, area_key))
    hid = jload(defread(kv, SRC, 'hiddenItems_' + area_key)[0], []) or []
    if hid:
        raise SystemExit('::error::%s / %s に下ろしてある項目があります。'
                         '見本として使うと中身が食い違うので止めます' % (SRC, area_key))
    return ent, items


def _builtin_ids(builtin, area_key):
    out = []
    for _sec, ids in builtin.get(area_key, []):
        out.extend(ids)
    return out


def build_rooms(kv, builtin):
    """書き換える鍵と報告を返す。読むだけで、ここでは書かない。"""
    writes = {}
    report = {'rooms': [], 'skipped': [], 'links': [], 'retire': [], 'extra': []}

    dst_areas = _areas(kv, DST)
    if dst_areas is None:
        raise SystemExit('::error::%s のエリア一覧が読めません' % DST)
    have = set(a.get('key') for a in dst_areas if isinstance(a, dict))

    # 枇杷島だけにある項目を、いまのサウナから拾っておく
    cur_sauna = jload(defread(kv, DST, 'customItems_sauna')[0], []) or []
    extra = []
    for want in EXTRA_SAUNA_IDS:
        found = None
        for c in cur_sauna:
            if isinstance(c, dict) and c.get('id') == want:
                found = c
                break
        if found is None:
            raise SystemExit('::error::%s のサウナに %s がありません。'
                             '写す前提が崩れているので止めます' % (DST, want))
        extra.append(found)
        report['extra'].append((want, str(found.get('title') or '')))

    new_area_entries = []
    for src_key, rooms, add_extra in [(SAUNA_SRC, SAUNA_ROOMS, True),
                                      (SHOWER_SRC, SHOWER_ROOMS, False)]:
        ent, items = _template(kv, src_key, DST)
        for key, name in rooms:
            if key in have:
                report['skipped'].append((key, name, 'エリアがすでにある'))
                continue
            # エリアの印は見本から。名前だけ入れ替える
            a = dict(ent)
            a['key'] = key
            a['name'] = name
            new_area_entries.append(a)
            # 項目は見本をそのまま。区分だけ部屋の名前にする
            rows = []
            for c in items:
                r = dict(c)
                r['section'] = name
                rows.append(r)
            if add_extra:
                for c in extra:
                    r = dict(c)
                    r['section'] = name
                    rows.append(r)
            ids = [r['id'] for r in rows]
            if len(ids) != len(set(ids)):
                raise SystemExit('::error::%s の項目idが重なっています' % key)
            writes['sdef_%s_customItems_%s' % (DST, key)] = json.dumps(rows, ensure_ascii=False)
            writes['sdef_%s_customSections_%s' % (DST, key)] = json.dumps([name], ensure_ascii=False)
            report['rooms'].append((key, name, len(rows),
                                    'あり' if a.get('hidden') else 'なし',
                                    'あり' if a.get('carryForward') else 'なし'))

    if new_area_entries:
        out = list(dst_areas) + new_area_entries
        kept = [a.get('key') for a in out if isinstance(a, dict)][:len(dst_areas)]
        if kept != [a.get('key') for a in dst_areas if isinstance(a, dict)]:
            raise SystemExit('::error::いまあるエリアの並びが変わります。止めます')
        writes['sdef_%s_customAreas' % DST] = json.dumps(out, ensure_ascii=False)

    # ---- やることリストの行き先を差し替える ----
    for slot in ['routine_asa', 'routine_hiru', 'routine_ban']:
        raw, src = defread(kv, DST, 'customItems_' + slot)
        rows = jload(raw, None)
        if not isinstance(rows, list):
            continue
        if src != 'みせべつ':
            raise SystemExit('::error::%s / %s の一覧が共通です。'
                             '店舗別に分けるかは人が決めてください' % (DST, slot))
        changed = False
        out = []
        for c in rows:
            if not isinstance(c, dict):
                out.append(c)
                continue
            link = str(c.get('link') or '').strip()
            if link in RETIRE:
                want = ','.join(RETIRE[link])
                if link != want:
                    d = dict(c)
                    d['link'] = want
                    out.append(d)
                    changed = True
                    report['links'].append((slot, c.get('id'), str(c.get('title') or ''),
                                            link, want))
                    continue
            out.append(c)
        if changed:
            before = [c.get('id') for c in rows if isinstance(c, dict)]
            after = [c.get('id') for c in out if isinstance(c, dict)]
            if before != after:
                raise SystemExit('::error::%s / %s の並びが変わります。止めます' % (DST, slot))
            writes['sdef_%s_customItems_%s' % (DST, slot)] = json.dumps(out, ensure_ascii=False)

    # ---- 共通エリアを下げる（記録は消さない）----
    for area_key in RETIRE:
        cur = jload(defread(kv, DST, 'customItems_' + area_key)[0], []) or []
        ids = _builtin_ids(builtin, area_key)
        ids += [c.get('id') for c in cur if isinstance(c, dict) and c.get('id')]
        ids = sorted(set(i for i in ids if i))
        if not ids:
            raise SystemExit('::error::%s の %s に項目が見つかりません' % (DST, area_key))
        now = jload(defread(kv, DST, 'hiddenItems_' + area_key)[0], []) or []
        now = now if isinstance(now, list) else []
        if set(ids) <= set(now):
            report['retire'].append((area_key, len(ids), 'すでに下がっている'))
            continue
        merged = sorted(set(now) | set(ids))
        writes['sdef_%s_hiddenItems_%s' % (DST, area_key)] = json.dumps(merged, ensure_ascii=False)
        report['retire'].append((area_key, len(ids), '下げる（%d件→%d件）' % (len(now), len(merged))))

    return writes, report
