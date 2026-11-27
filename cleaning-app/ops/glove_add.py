# -*- coding: utf-8 -*-
"""「グローブ3点確認」を3店舗の ゴルフA と 遅番 に足す（2026-11-27、daigoさん
「三店舗にゴルフAと遅番の締め作業にグローブ3点確認の項目を入れて」）。

入れる場所（3店舗とも同じ）:
  ゴルフA（customItems_golf_a）: 「クラブの本数確認」(ga_clubs) のすぐ下
  遅番（customItems_routine_ban）: 「閉め作業」(routine_ban_v3_20) のすぐ下
区分は目印の行と同じ。ふつうのチェック（数の入力・写真なし）。説明は DESC。

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ など）を触る
  - 同じidがもう入っていたら何も書かない（何度流しても増えない）
"""
import json

STORES = ['笠寺', '枇杷島', '萩野通']
ADDED_AT = '2026-11-27'
TITLE = 'グローブ3点確認'
# daigoさん「手袋が三つあるからそれだね」(2026-11-27)
DESC = 'グローブ（手袋）が3つそろっているか確認'
# ★ idは一度入れたら変えない（記録はこのidで結び付く）
PLAN = [
    # (エリア鍵, 表示名, 新しいid, 目印のid)
    ('golf_a', 'ゴルフA', 'ga_glove3', 'ga_clubs'),
    ('routine_ban', '遅番', 'ban_glove3', 'routine_ban_v3_20'),
]


def jload(v, fb):
    if not isinstance(v, str):
        return fb
    try:
        x = json.loads(v)
        return fb if x is None else x
    except Exception:
        return fb


def build(kv):
    writes, rep = {}, {'added': [], 'same': []}
    for st in STORES:
        for area, label, nid, anchor in PLAN:
            k = 'sdef_%s_customItems_%s' % (st, area)
            if k not in kv:
                raise SystemExit('::error::%s / %s の一覧が店舗別になっていません。止めます' % (st, label))
            items = jload(kv[k], None)
            if not isinstance(items, list) or not items:
                raise SystemExit('::error::%s / %s の一覧が読めません' % (st, label))
            ids = [c.get('id') for c in items if isinstance(c, dict)]
            if nid in ids:
                rep['same'].append((st, label, nid))
                continue
            if anchor not in ids:
                raise SystemExit('::error::%s / %s に目印 %s がありません。入れる場所を決め直してください'
                                 % (st, label, anchor))
            at = next(n for n, c in enumerate(items) if isinstance(c, dict) and c.get('id') == anchor)
            a = items[at]
            row = {'id': nid, 'section': a.get('section'), 'title': TITLE, 'desc': DESC, 'addedAt': ADDED_AT}
            out = items[:at + 1] + [row] + items[at + 1:]
            if [c.get('id') for c in out if isinstance(c, dict) and c.get('id') != nid] != ids:
                raise SystemExit('::error::%s / %s で並びが変わります。止めます' % (st, label))
            writes[k] = json.dumps(out, ensure_ascii=False)
            rep['added'].append((st, label, '「%s」の下' % a.get('title'), at + 1, nid, len(items), len(out)))
    return writes, rep
