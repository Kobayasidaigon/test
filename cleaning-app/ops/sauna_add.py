# -*- coding: utf-8 -*-
"""笠寺のサウナ3部屋に「クイックルワイパーの交換」を1件ずつ足す。

笠寺のサウナは部屋ごとにエリアが分かれている（sauna_b1 サウナ男A /
sauna_b2 サウナ男B / sauna_b3 サウナ女）。3部屋で同じ項目が並ぶ作りで、
項目のidも3部屋そろえてある（bench・vent・sauna_shoerack など）ので、
新しい項目も同じidで3部屋に入れる。

やること:
  - sdef_笠寺_customItems_sauna_b1/b2/b3 の末尾に1件足す
  - 区分（section）は、その部屋に今ある項目から読む（勝手に作らない）

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ / periodicDone_ など）を触る
"""
import json

STORE = '笠寺'
ROOMS = ['sauna_b1', 'sauna_b2', 'sauna_b3']

# 3部屋で共通のid。bench / vent / sauna_shoerack と同じ付け方にそろえる。
# ★ 一度入れたら変えない（記録はこのidで結び付く）
NEW_ID = 'sauna_quickle'
NEW_TITLE = 'クイックルワイパーの交換'
NEW_DESC = ''


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


def section_of(items, area):
    """その部屋で使われている区分。1つに決まらなければ止める。"""
    secs = []
    for c in items:
        if not isinstance(c, dict):
            continue
        s = c.get('section')
        if s and s not in secs:
            secs.append(s)
    if len(secs) != 1:
        raise SystemExit(
            '::error::%s の区分が1つに決まりません（%s）。'
            'どの区分に入れるか決め直してください' % (area, '、'.join(secs) or 'なし'))
    return secs[0]


def build_sauna(kv):
    writes = {}
    report = {'added': [], 'same': [], 'updated': [], 'rooms': []}

    for area in ROOMS:
        key = 'customItems_' + area
        raw, src = defread(kv, STORE, key)
        items = jload(raw, [])
        if not isinstance(items, list):
            raise SystemExit('::error::%s の項目一覧が読めません' % area)
        if not items:
            raise SystemExit('::error::%s に項目がありません。'
                             '思っている部屋と違う可能性があるので止めます' % area)

        before_ids = [c.get('id') for c in items if isinstance(c, dict)]
        sec = section_of(items, area)

        # すでに下ろしてある（hiddenItems_）ところに同じidが入っていないか見る。
        # 入っていたら足しても画面に出ないので、気づけるように報告する。
        hid = jload(defread(kv, STORE, 'hiddenItems_' + area)[0], [])
        hidden_warn = NEW_ID in (hid if isinstance(hid, list) else [])

        ent = {'id': NEW_ID, 'section': sec, 'title': NEW_TITLE, 'desc': NEW_DESC}
        cur = None
        for c in items:
            if isinstance(c, dict) and c.get('id') == NEW_ID:
                cur = c
                break

        if cur is None:
            new_items = list(items) + [ent]
            report['added'].append((area, sec))
        else:
            # 題名などが手で直されているかもしれない。中身が同じなら何もしない。
            merged = dict(cur)
            merged.setdefault('section', sec)
            merged.setdefault('title', NEW_TITLE)
            if json.dumps(cur, ensure_ascii=False, sort_keys=True) == \
               json.dumps(merged, ensure_ascii=False, sort_keys=True):
                report['same'].append((area, cur.get('section'), cur.get('title')))
                report['rooms'].append((area, src, sec, len(before_ids),
                                        len(before_ids), hidden_warn))
                continue
            new_items = [dict(merged) if (isinstance(c, dict) and c.get('id') == NEW_ID)
                         else c for c in items]
            report['updated'].append((area, cur.get('title')))

        after_ids = [c.get('id') for c in new_items if isinstance(c, dict)]
        lost = [i for i in before_ids if i not in after_ids]
        if lost:
            raise SystemExit('::error::%s の項目が消えます: %s' % (area, '、'.join(lost)))
        if len(after_ids) != len(set(after_ids)):
            raise SystemExit('::error::%s で項目のidが重複します' % area)

        writes['sdef_%s_%s' % (STORE, key)] = json.dumps(new_items, ensure_ascii=False)
        report['rooms'].append((area, src, sec, len(before_ids), len(after_ids), hidden_warn))

    return writes, report
