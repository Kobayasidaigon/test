# -*- coding: utf-8 -*-
"""shares_set.py の下見。取りこぼし・二重・打ち間違いで止まるか確かめる。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
import shares_set
from shares_set import build_shares, STORE, SHARES


def row(i, link=None):
    d = {'id': i, 'section': 'やること', 'title': i}
    if link:
        d['link'] = link
    return d


def mk():
    """本番と同じ形の見本。SHARES が指しているものを全部そろえる。"""
    kv = {}
    areas, items = set(), {}
    for slot, shares in SHARES.items():
        a, it = set(), []
        for s in shares:
            a |= set(s['areas'])
            it += s['items']
        areas |= a
        # 開く先のある行を1本作って、その分担のエリアを全部ぶら下げる
        rows = [row(slot + '_link', ','.join(sorted(a)))] + [row(x) for x in it]
        items[slot] = rows
        kv['sdef_%s_customItems_%s' % (STORE, slot)] = json.dumps(rows, ensure_ascii=False)
    kv['sdef_%s_customAreas' % STORE] = json.dumps(
        [{'key': k, 'name': k} for k in sorted(areas)], ensure_ascii=False)
    return kv


fails = []


def ck(n, c, e=''):
    print(('  OK   ' if c else '  NG   ') + n + (('  ' + e) if e else ''))
    if not c:
        fails.append(n)


kv = mk()
w, r = build_shares(kv)

print('=== ふつうに通したとき ===')
ck('書く鍵は3つ', len(w) == 3, str(sorted(w)))
ck('鍵の形が shares_', all(k.startswith('sdef_%s_shares_' % STORE) for k in w), str(sorted(w)))
ck('記録の鍵は1つも無い', not [k for k in w if k.startswith('clean_')])
asa = json.loads(w['sdef_%s_shares_routine_asa' % STORE])
ck('朝番は3人ぶん', len(asa) == 3, str(len(asa)))
ck('朝番の名前', [s['name'] for s in asa] == ['男性側', '女性側', '共用・ゴルフ'],
   str([s['name'] for s in asa]))
hiru = json.loads(w['sdef_%s_shares_routine_hiru' % STORE])
ban = json.loads(w['sdef_%s_shares_routine_ban' % STORE])
ck('中番は2人ぶん', len(hiru) == 2, str(len(hiru)))
ck('遅番は2人ぶん', len(ban) == 2, str(len(ban)))
ck('取りこぼしは無い', not r['left'], str(r['left']))

print('')
print('=== 中身が実データと合っているか ===')
mm = [s for s in asa if s['id'] == 'm'][0]
ww = [s for s in asa if s['id'] == 'w'][0]
xx = [s for s in asa if s['id'] == 'x'][0]
ck('男性側にサウナ男A/B/Cが入る',
   all(k in mm['areas'] for k in ['sauna_b1', 'sauna_b2', 'sauna_b3']))
ck('男性側に男性側のシャワー4つが入る',
   all(k in mm['areas'] for k in ['shower_b1', 'shower_b2', 'shower_b5', 'shower_b6']))
ck('女性側にサウナ女A/Bが入る', all(k in ww['areas'] for k in ['sauna_b4', 'sauna_b5']))
ck('女性側に女性側のシャワー3つが入る',
   all(k in ww['areas'] for k in ['shower_b3', 'shower_b4', 'shower_b7']))
ck('男性側と女性側でエリアが重ならない', not (set(mm['areas']) & set(ww['areas'])))
ck('共用にゴルフAが入る', 'golf_a' in xx['areas'])
ck('共用に単独の行12件が入る', len(xx['items']) == 12, str(len(xx['items'])))
ck('男性側・女性側に単独の行は入れていない',
   not mm['items'] and not ww['items'])


def stops(name, fix, want):
    # 見本は「直す前の決め方」から作る。あとで作ると、打ち間違えた鍵のぶんまで
    # 見本に出来てしまい、間違いを見つけられない（実際それで2件すり抜けた）。
    kv0 = mk()
    saved = json.loads(json.dumps(SHARES))
    try:
        fix(shares_set.SHARES)
        try:
            build_shares(kv0)
            ck('止まる: ' + name, False, '止まらなかった')
        except SystemExit as e:
            ck('止まる: ' + name, want in str(e), str(e)[:90])
    finally:
        shares_set.SHARES.clear()
        shares_set.SHARES.update(saved)


print('')
print('=== おかしいときに止まるか ===')
stops('同じエリアを2人に入れる',
      lambda S: S['routine_asa'][1]['areas'].append('toilet_m'), '2つの分担')
stops('同じ項目を2人に入れる',
      lambda S: S['routine_asa'][0]['items'].append('routine_asa_v3_01'), '2つの分担')
stops('打ち間違えたエリア',
      lambda S: S['routine_asa'][0]['areas'].append('sauna_b9'), '無いエリア')
stops('打ち間違えた項目',
      lambda S: S['routine_asa'][2]['items'].append('asa_nothing'), '無い項目')

# 開く先のある行を items に入れてしまった（areas で分けるべき）
def put_link_in_items(S):
    S['routine_asa'][2]['items'].append('routine_asa_link')
stops('開く先のある行を items に入れる', put_link_in_items, 'items ではなく areas')

print('')
print('=== 取りこぼしは止めずに知らせるか ===')
saved = json.loads(json.dumps(SHARES))
try:
    kv2 = mk()                       # 直す前の決め方で見本を作る
    shares_set.SHARES['routine_asa'][2]['items'].pop()   # 1件を分担から外す
    w2, r2 = build_shares(kv2)
    ck('止まらずに書ける', len(w2) == 3, str(len(w2)))
    ck('取りこぼしを知らせる',
       r2['left'] and r2['left'][0][1] == ['routine_asa_v3_16'], str(r2['left']))
finally:
    shares_set.SHARES.clear()
    shares_set.SHARES.update(saved)

print('')
print('dry_shares_set  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
