# -*- coding: utf-8 -*-
"""protein_hygiene_days.py の下見。区分だけが変わること・ほかを壊さないこと。"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
import protein_hygiene_days as M
from protein_hygiene_days import build_days, STORES, KEY, IDS, NEW_SECTION

OLD = '衛生管理（週2回）※9/25から運用開始'


def rows():
    out = [
        {'id': 'c1781262038243946', 'section': 'サーバー本体', 'title': 'レーンの清掃'},
        {'id': 'c178247099955576', 'section': 'サーバー本体', 'title': 'カップホルダー'},
    ]
    for i, t in zip(IDS, ['健康状態の確認', '清潔な身だしなみ', '手洗いとアルコール消毒',
                          '自動扉', '流し台', 'ホースカバー周辺']):
        out.append({'id': i, 'section': OLD, 'title': t, 'method': '手順' + i})
    return out


def mk(per_store=True):
    kv = {}
    if per_store:
        for s in STORES:
            kv['sdef_%s_%s' % (s, KEY)] = json.dumps(rows(), ensure_ascii=False)
    else:
        kv[KEY] = json.dumps(rows(), ensure_ascii=False)
    kv['clean_枇杷島_山田 花子_protein_kasadera@routine_asa_2026-10-22'] = json.dumps(
        {'pk_health': True})
    kv['periodicDone_枇杷島'] = json.dumps({'p1': {'date': '2026-10-01'}})
    return kv


fails = []


def ck(n, c, e=''):
    print(('  OK   ' if c else '  NG   ') + n + (('  ' + e) if e else ''))
    if not c:
        fails.append(n)


print('=== 店舗ごとに定義がある形 ===')
kv = mk(True)
w, r = build_days(kv)
ck('書く鍵は2つ', len(w) == 2, str(sorted(w)))
ck('鍵は店舗ごとのもの',
   sorted(w) == sorted('sdef_%s_%s' % (s, KEY) for s in STORES), str(sorted(w)))
ck('記録の鍵は書かない', not [k for k in w if k.startswith('clean_')])

after = json.loads(w['sdef_%s_%s' % (STORES[0], KEY)])
before = json.loads(kv['sdef_%s_%s' % (STORES[0], KEY)])
ck('項目の数は同じ', len(after) == len(before), '%d/%d' % (len(after), len(before)))
ck('並びは同じ', [x['id'] for x in after] == [x['id'] for x in before])
ck('6項目の区分が水・土になる',
   all(x['section'] == NEW_SECTION for x in after if x['id'] in IDS))
ck('区分名に「水・土」が入っている', '水・土' in NEW_SECTION, NEW_SECTION)
ck('ほかの項目の区分はそのまま',
   all(x['section'] == 'サーバー本体' for x in after if x['id'] not in IDS))
ck('題と手順はそのまま',
   all(a['title'] == b['title'] and a.get('method') == b.get('method')
       for a, b in zip(before, after)))
ck('idは1つも変わらない',
   [x['id'] for x in after] == [x['id'] for x in before])

print('')
print('=== 共通の定義しかない形 ===')
kv2 = mk(False)
w2, r2 = build_days(kv2)
ck('書く鍵は1つ（共通）', sorted(w2) == [KEY], str(sorted(w2)))
ck('中身は同じものになる', len(set(w2.values())) == 1)

print('')
print('=== もう一度流しても増えないか ===')
kv3 = mk(True)
w3, _ = build_days(kv3)
for k, v in w3.items():
    kv3[k] = v
w4, r4 = build_days(kv3)
ck('2回目は書くものが無い', w4 == {}, str(sorted(w4)))
ck('2回目は「すでに」と報告する',
   all('すでに' in ''.join(x[2]) for x in r4['stores']), str(r4['stores']))


def stops(name, fix, want, per_store=True):
    k = mk(per_store)
    fix(k)
    try:
        build_days(k)
        ck('止まる: ' + name, False, '止まらなかった')
    except SystemExit as e:
        ck('止まる: ' + name, want in str(e), str(e)[:80])


print('')
print('=== おかしいときに止まるか ===')
stops('項目が1つ足りない',
      lambda k: k.__setitem__('sdef_%s_%s' % (STORES[0], KEY), json.dumps(
          [x for x in rows() if x['id'] != 'pk_sink'], ensure_ascii=False)),
      '無い項目があります')
stops('区分が思っていたものと違う',
      lambda k: k.__setitem__('sdef_%s_%s' % (STORES[0], KEY), json.dumps(
          [dict(x, section='べつの区分') if x['id'] in IDS else x for x in rows()],
          ensure_ascii=False)),
      '区分が思っていたもの')
stops('定義そのものが無い',
      lambda k: [k.pop('sdef_%s_%s' % (s, KEY)) for s in STORES], 'が見つかりません')
stops('定義の形がおかしい',
      lambda k: k.__setitem__('sdef_%s_%s' % (STORES[0], KEY), json.dumps({'a': 1})),
      '形がおかしい')

print('')
print('dry_protein_hygiene_days  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
