# -*- coding: utf-8 -*-
"""萩野通のホワイトニング備品補充に「補充前の数」と毎回の写真を付ける（2026-11-16 の依頼）。

対象（萩野通の店舗別定義だけ。笠寺・枇杷島は触らない）:
  朝番 routine_asa_v3_11  ホワイトニング備品補充
  中番 routine_hiru_v3_10 ホワイトニング・エステ備品補充
  遅番 routine_ban_v3_13  ホワイトニング・エステ備品補充
付けるもの:
  nums      補充前の数（ホワイトニング備品は3つで1セット。セット数を1つ入れる）
  stock     ふりかえりで番ごとに並べるまとめ名
  photoEach 毎回その場の写真を撮らないと済みにならない
  photoNote 写真の案内に出す「撮るもの」
  desc      行の下に出す説明
  stockFull 補充後の数が毎回決まっていれば入れる（減った数が出る）。None なら付けない
やらないこと: id・題名・並び・記録（clean_ / nums_）は変えない。
何度流しても同じ結果になる。
"""
import json

STORE = '萩野通'
TARGETS = [
    ('customItems_routine_asa', 'routine_asa_v3_11', '朝番'),
    ('customItems_routine_hiru', 'routine_hiru_v3_10', '中番'),
    ('customItems_routine_ban', 'routine_ban_v3_13', '遅番'),
]
STOCK_FULL = None
FIELDS = {
    'nums': [{'id': 'before', 'label': '補充前の数（セット）'}],
    'stock': 'ホワイトニング備品',
    'photoEach': True,
    'photoNote': '補充したあとのホワイトニング備品（全部が写るように）',
    'desc': '補充する前に残っているホワイトニング備品のセット数を入れて、補充後を撮ってください（エステ備品は数えません）',
}


def build(kv):
    writes, report = {}, []
    for key, item_id, label in TARGETS:
        k = 'sdef_%s_%s' % (STORE, key)
        if k not in kv:
            raise SystemExit('::error::%s がありません（萩野通の店舗別定義が無い）' % k)
        items = json.loads(kv[k])
        hit = [c for c in items if isinstance(c, dict) and c.get('id') == item_id]
        if len(hit) != 1:
            raise SystemExit('::error::%s に %s が %d 件' % (k, item_id, len(hit)))
        c = hit[0]
        if 'ホワイトニング' not in (c.get('title') or ''):
            raise SystemExit('::error::%s の題名がホワイトニングではありません: %s' % (item_id, c.get('title')))
        want = dict(FIELDS)
        if STOCK_FULL is not None:
            want['stockFull'] = STOCK_FULL
        before_ids = [x.get('id') for x in items if isinstance(x, dict)]
        changed = {f: v for f, v in want.items() if c.get(f) != v}
        if STOCK_FULL is None and 'stockFull' in c:
            changed['stockFull'] = '(外す)'
            del c['stockFull']
        for f, v in want.items():
            c[f] = v
        after_ids = [x.get('id') for x in items if isinstance(x, dict)]
        assert before_ids == after_ids
        report.append((label, item_id, c.get('title'), sorted(changed)))
        if changed:
            writes[k] = json.dumps(items, ensure_ascii=False)
    return writes, report
