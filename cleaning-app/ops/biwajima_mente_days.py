# -*- coding: utf-8 -*-
"""枇杷島 中番の「ジムエリア マシンメンテ」を月・火・水だけ出す（2026-11-20 daigoさんの依頼）。

やること: sdef_枇杷島_customItems_routine_hiru の routine_hiru_mmente に days: [1, 2, 3] を付ける。
          （アプリは test 側の days 対応版で、当たらない日はこの行を出さず数えない）
やらないこと: 他の行・他の店舗・記録を触る。id・並び・中身は変えない。何度流しても同じ。
"""
import json

STORE = '枇杷島'
KEY = 'sdef_%s_customItems_routine_hiru' % STORE
ITEM = 'routine_hiru_mmente'
DAYS = [1, 2, 3]   # 0=日 1=月 2=火 3=水


def build(kv):
    raw = kv.get(KEY)
    try:
        items = json.loads(raw) if isinstance(raw, str) else None
    except Exception:
        items = None
    if not isinstance(items, list):
        raise SystemExit('::error::枇杷島 中番の項目一覧が読めません。止めます')
    hits = [i for i in items if isinstance(i, dict) and i.get('id') == ITEM]
    if len(hits) != 1:
        raise SystemExit('::error::ジムエリア マシンメンテの行が1つに決まりません（%d件）' % len(hits))
    it = hits[0]
    rep = {'title': it.get('title'), 'before_days': it.get('days'), 'after_days': DAYS,
           'rows': len(items)}
    if it.get('days') == DAYS:
        return {}, rep
    out = [dict(i, days=DAYS) if isinstance(i, dict) and i.get('id') == ITEM else i for i in items]
    # 他の行が変わっていないこと
    for a, b in zip(items, out):
        if a is not it and a != b:
            raise SystemExit('::error::他の行が変わります。止めます')
    return {KEY: json.dumps(out, ensure_ascii=False)}, rep
