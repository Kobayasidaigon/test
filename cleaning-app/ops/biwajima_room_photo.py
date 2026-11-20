# -*- coding: utf-8 -*-
"""枇杷島 男性シャワーの各ルームの最後に「ルーム全体の写真」を足す（2026-11-20 daigoさんの依頼）。

朝番「シャワー清掃」を開くと出るルームのうち、男性の4つ:
  shower_b1 シャワー男1 / shower_b2 シャワー男2 /
  shower_b5 サウナ男Bのシャワー / shower_b6 サウナ男Cのシャワー
の末尾に photoEach の項目を1つ足す。押すと撮影の案内が出て、撮ると済みになる
（萩野通のホワイトニングと同じ仕組み。アプリの変更はいらない）。

やらないこと: 女性のルーム・他の店舗・記録（clean_ など）には触らない。何度流しても増えない。
"""
import json

STORE = '枇杷島'
ROOMS = ['shower_b1', 'shower_b2', 'shower_b5', 'shower_b6']
ITEM_ID = 'room_photo'
ADDED = '2026-11-20'


def item(section):
    return {
        'id': ITEM_ID,
        'title': 'ルーム全体の写真',
        'desc': 'このルームの掃除が終わったら最後に1枚',
        'section': section,
        'photoEach': True,
        'photoNote': '入口からルーム全体（床・壁・鏡）が1枚に入るように',
        'addedAt': ADDED,
    }


def build(kv):
    writes, rep = {}, []
    for key in ROOMS:
        k = 'sdef_%s_customItems_%s' % (STORE, key)
        raw = kv.get(k)
        if not isinstance(raw, str):
            raise SystemExit('::error::%s がありません（店舗別の一覧が前提）' % k)
        rows = json.loads(raw)
        if not isinstance(rows, list) or not rows:
            raise SystemExit('::error::%s の中身が空です' % k)
        if any(isinstance(c, dict) and c.get('id') == ITEM_ID for c in rows):
            rep.append((key, 'すでにある'))
            continue
        secs = [c.get('section') for c in rows if isinstance(c, dict) and c.get('section')]
        if not secs:
            raise SystemExit('::error::%s に区分がありません' % k)
        out = rows + [item(secs[-1])]
        writes[k] = json.dumps(out, ensure_ascii=False)
        rep.append((key, '足す（%d→%d件、区分 %s）' % (len(rows), len(out), secs[-1])))
    return writes, rep
