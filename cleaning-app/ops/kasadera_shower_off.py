# -*- coding: utf-8 -*-
"""笠寺: いま清掃できないシャワーの部屋を、朝番「シャワー清掃」から一時的に外す（2026-11-27 daigoさんの依頼）。

朝番 routine_asa_v3_05 の link から ROOM を抜くだけ。外した部屋は linkPaused に控えておく
（戻すときは REVERT=1 で link に元の位置へ戻す）。部屋の項目・記録には触らない。何度流しても同じ。
外すと: 残りの部屋が終われば行は済み。管理者ページと LINE「やってね」通知にも出ない。
"""
import json, os

STORE = '笠寺'
ROW = 'routine_asa_v3_05'
ROOM = os.environ.get('ROOM', 'shower_b4')
REVERT = os.environ.get('REVERT', '0') == '1'
KEY = 'sdef_%s_customItems_routine_asa' % STORE
ORDER = ['shower_b1', 'shower_b2', 'shower_b3', 'shower_b4', 'shower_b5', 'shower_b6', 'shower_b7']


def build(kv):
    rep = {'room': ROOM, 'revert': REVERT}
    areas = json.loads(kv.get('sdef_%s_customAreas' % STORE) or '[]')
    a = [x for x in areas if isinstance(x, dict) and x.get('key') == ROOM]
    if not a:
        raise SystemExit('::error::%s が笠寺のエリアにありません' % ROOM)
    rep['area'] = {k: a[0].get(k) for k in ('key', 'name', 'hidden')}
    rows = json.loads(kv[KEY])
    hit = [r for r in rows if isinstance(r, dict) and r.get('id') == ROW]
    if len(hit) != 1:
        raise SystemExit('::error::%s が見つかりません' % ROW)
    r = hit[0]
    links = [x.strip() for x in str(r.get('link') or '').split(',') if x.strip()]
    paused = list(r.get('linkPaused') or [])
    rep['before'] = {'link': r.get('link'), 'linkPaused': r.get('linkPaused')}
    if not REVERT:
        if ROOM not in links:
            rep['note'] = 'すでに外れている'
            return {}, rep
        links = [x for x in links if x != ROOM]
        if ROOM not in paused:
            paused.append(ROOM)
    else:
        if ROOM in links:
            rep['note'] = 'すでに入っている'
            return {}, rep
        links = sorted(links + [ROOM], key=lambda x: ORDER.index(x) if x in ORDER else 99)
        paused = [x for x in paused if x != ROOM]
    if not links:
        raise SystemExit('::error::部屋が1つも残りません')
    r['link'] = ','.join(links)
    if paused:
        r['linkPaused'] = paused
    else:
        r.pop('linkPaused', None)
    rep['after'] = {'link': r['link'], 'linkPaused': r.get('linkPaused')}
    return {KEY: json.dumps(rows, ensure_ascii=False)}, rep
