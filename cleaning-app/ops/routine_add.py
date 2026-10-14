# -*- coding: utf-8 -*-
"""朝番・中番・遅番のやることリストに項目を足す。

頼まれたこと:
  笠寺・枇杷島の【遅番】に
    ・女性ルーム・男性ルームの洗面台付近の掃除機がけ
    ・シャワールーム・サウナルームのゴミ箱の清掃
    ・サウナマットを入れる箱の水洗い
  3店舗の【朝番・中番・遅番すべて】に
    ・掃除機のゴミ捨て
    ・モップの掃除

入れる場所:
  どの時間帯も区分は「やることリスト（上から順に）」の1つだけ（調査済み）。
  並びは「在庫管理システム入力」の直前に入れる。9つの時間帯すべてに
  この項目があるので、締め作業・報告より前（掃除の流れの最後）に入る。
  並びは画面の「項目を編集」で後からいくらでも動かせる。

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ / periodicDone_ など）を触る
  - 同じidがもう入っていたら、何も書かない（何度流しても増えない）
"""
import json

ALL_STORES = ['笠寺', '枇杷島', '萩野通']
BAN_ONLY_STORES = ['笠寺', '枇杷島']
SLOTS = [('routine_asa', '朝番'), ('routine_hiru', '中番'), ('routine_ban', '遅番')]

# 「この項目の直前に入れる」目印。9つの時間帯すべてにある。
ANCHOR_TEXT = '在庫管理システム'

# ★ idは一度入れたら変えない（記録はこのidで結び付く）
# 遅番だけ（笠寺・枇杷島）
BAN_ONLY_ITEMS = [
    {'id': 'ban_vacuum_sink',       'title': '女性ルーム・男性ルームの洗面台付近の掃除機がけ'},
    {'id': 'ban_trashbin_clean',    'title': 'シャワールーム・サウナルームのゴミ箱の清掃'},
    {'id': 'ban_saunamat_box_wash', 'title': 'サウナマットを入れる箱の水洗い'},
]
# 朝・中・遅すべて（3店舗）。時間帯ごとにidを分ける（asa_/hiru_/ban_ の付け方にそろえる）
EVERY_SLOT_ITEMS = {
    'routine_asa': [
        {'id': 'asa_trash_dispose', 'title': '掃除機のゴミ捨て'},
        {'id': 'asa_mop_clean',     'title': 'モップの掃除'},
    ],
    'routine_hiru': [
        {'id': 'hiru_trash_dispose', 'title': '掃除機のゴミ捨て'},
        {'id': 'hiru_mop_clean',     'title': 'モップの掃除'},
    ],
    'routine_ban': [
        {'id': 'ban_trash_dispose', 'title': '掃除機のゴミ捨て'},
        {'id': 'ban_mop_clean',     'title': 'モップの掃除'},
    ],
}

# 名前の言い直し。いまの名前がここに載っているものと同じときだけ、上の名前に直す。
# 「掃除のゴミ捨て」で入れてしまったが、正しくは「掃除機のゴミ捨て」だった。
# ★ idは変えない（記録はidで結び付いているので、名前だけ直す）
# ここに無い名前（人が店舗の都合で付け替えたもの）は上書きしない。
RETITLE_FROM = {
    'asa_trash_dispose':  ['掃除のゴミ捨て'],
    'hiru_trash_dispose': ['掃除のゴミ捨て'],
    'ban_trash_dispose':  ['掃除のゴミ捨て'],
}


def defread(kv, store, key):
    """店舗ごとの定義。無ければ共通を見る（アプリの defRead と同じ順）。"""
    v = kv.get('sdef_%s_%s' % (store, key))
    if v is None:
        return kv.get(key), 'きょうつう'
    return v, 'みせべつ'


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        return json.loads(v)
    except Exception:
        return fallback


def plan_for(store, slot):
    """その店舗・その時間帯に足す項目の並び（頼まれた順）。"""
    out = []
    if slot == 'routine_ban' and store in BAN_ONLY_STORES:
        out += BAN_ONLY_ITEMS
    out += EVERY_SLOT_ITEMS.get(slot, [])
    return out


def _anchor_index(items):
    """「在庫管理システム入力」が何番目か。無ければ -1。"""
    for n, c in enumerate(items):
        if isinstance(c, dict) and ANCHOR_TEXT in str(c.get('title') or ''):
            return n
    return -1


def _section_for(items, anchor, area):
    """入れる区分を決める。1つしか無ければそれ。複数あれば目印の区分に合わせる。"""
    secs = []
    for c in items:
        if not isinstance(c, dict):
            continue
        s = c.get('section')
        if s and s not in secs:
            secs.append(s)
    if len(secs) == 1:
        return secs[0]
    if anchor >= 0:
        s = items[anchor].get('section')
        if s:
            return s
    raise SystemExit('::error::%s の区分が決まりません（%s）。'
                     'どの区分に入れるか決め直してください' % (area, '、'.join(secs) or 'なし'))


def build_routine(kv):
    """書き換える鍵と、何をするかの報告を返す。読むだけで、ここでは書かない。"""
    writes = {}
    report = {'areas': [], 'added': [], 'same': [], 'differs': [], 'hidden': [],
              'retitled': []}

    for store in ALL_STORES:
        for slot, label in SLOTS:
            want = plan_for(store, slot)
            if not want:
                continue
            key = 'customItems_' + slot
            raw, src = defread(kv, store, key)
            items = jload(raw, None)
            if not isinstance(items, list):
                raise SystemExit('::error::%s / %s の項目一覧が読めません' % (store, label))
            if not items:
                raise SystemExit('::error::%s / %s に項目がありません。'
                                 '思っている所と違う可能性があるので止めます' % (store, label))

            # 一覧が店舗ごとに分かれていることを確かめる。共通の一覧を店舗別に
            # 分けるのは人が決めることなので、そうなっていたら書かずに止める。
            if src != 'みせべつ':
                raise SystemExit(
                    '::error::%s / %s の項目一覧が共通（%s）です。'
                    '店舗別に分けるかどうかは人が決めてください' % (store, label, key))

            before_ids = [c.get('id') for c in items if isinstance(c, dict)]
            anchor = _anchor_index(items)
            sec = _section_for(items, anchor, '%s / %s' % (store, label))

            hid = jload(defread(kv, store, 'hiddenItems_' + slot)[0], [])
            hid = hid if isinstance(hid, list) else []

            have = {}
            for c in items:
                if isinstance(c, dict) and c.get('id'):
                    have[c['id']] = c

            new_rows = []
            retitled = []
            for w in want:
                cur = have.get(w['id'])
                if cur is not None:
                    now_title = str(cur.get('title') or '')
                    if now_title == w['title']:
                        report['same'].append((store, label, w['id'], w['title']))
                    elif now_title in RETITLE_FROM.get(w['id'], []):
                        # 入れたときの言い間違い。名前だけ直す（idはそのまま）。
                        retitled.append((cur, now_title, w['title']))
                        report['retitled'].append((store, label, w['id'],
                                                   now_title, w['title']))
                    else:
                        # 人が名前を変えた等。勝手に上書きしない。
                        report['differs'].append((store, label, w['id'],
                                                  now_title, w['title']))
                    continue
                if w['id'] in hid:
                    report['hidden'].append((store, label, w['id'], w['title']))
                new_rows.append({'id': w['id'], 'section': sec,
                                 'title': w['title'], 'desc': ''})
                report['added'].append((store, label, sec, w['id'], w['title']))

            if new_rows or retitled:
                at = anchor if anchor >= 0 else len(items)
                # 名前を直すものは、同じ並びのまま title だけ差し替える
                fix = {id(c): t for c, _, t in retitled}
                items2 = [dict(c, title=fix[id(c)]) if isinstance(c, dict) and id(c) in fix else c
                          for c in items]
                out = list(items2[:at]) + new_rows + list(items2[at:])
                # いまある項目が1つも減らず、並びも変わっていないことを確かめる
                new_ids = set(r['id'] for r in new_rows)
                kept = [c.get('id') for c in out if isinstance(c, dict) and c.get('id') not in new_ids]
                if kept != before_ids:
                    raise SystemExit('::error::%s / %s でいまある項目の並びが変わります。止めます'
                                     % (store, label))
                writes['sdef_%s_%s' % (store, key)] = json.dumps(out, ensure_ascii=False)
                after_n = len(out)
            else:
                after_n = len(items)

            report['areas'].append((store, label, slot, src, sec,
                                    len(items), after_n,
                                    anchor if anchor >= 0 else None))

    return writes, report
