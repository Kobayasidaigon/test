# -*- coding: utf-8 -*-
"""mente_add.py の下見。本番の並びを写した見本で、落ちないか・増えないかを見る。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
from mente_add import build_mente, ITEM_ID, DST_STORES

SEC = 'やることリスト（上から順に）'
MENTE_SEC = 'パーツクリーナー・556（注油）を実施'
# 調査で出た本番の中番の並び（全件）
HIRU = {
 '笠寺': ['routine_hiru_v3_01','routine_hiru_v3_02','hiru_saunamat_pickup','routine_hiru_v3_11',
          'routine_hiru_v3_06','routine_hiru_floor_machine','routine_hiru_v3_05','routine_hiru_studio',
          'hiru_locker_lost','routine_hiru_v3_09','routine_hiru_v3_03','routine_hiru_v3_08',
          'routine_hiru_v3_13','hiru_trash_dispose','hiru_mop_clean','routine_hiru_inventory',
          'routine_hiru_v3_14'],
 '枇杷島': ['routine_hiru_v3_01','routine_hiru_v3_02','hiru_saunamat_pickup','routine_hiru_v3_11',
           'routine_hiru_v3_06','hiru_cup','routine_hiru_floor_machine','routine_hiru_v3_05',
           'routine_hiru_studio','hiru_locker_lost','routine_hiru_v3_09','routine_hiru_v3_03',
           'routine_hiru_v3_08','routine_hiru_v3_13','hiru_trash_dispose','hiru_mop_clean',
           'routine_hiru_inventory','routine_hiru_v3_14'],
 '萩野通': ['routine_hiru_v3_01','routine_hiru_v3_02','routine_hiru_saunamat','routine_hiru_v3_07',
           'routine_hiru_v3_11','routine_hiru_v3_06','routine_hiru_floor_machine',
           'routine_hiru_mmente','routine_hiru_v3_05','routine_hiru_studio','hiru_locker_lost',
           'routine_hiru_v3_10','c1790246468370937','routine_hiru_v3_03','routine_hiru_v3_08',
           'routine_hiru_v3_13','hiru_trash_dispose','hiru_mop_clean','routine_hiru_inventory',
           'routine_hiru_v3_14'],
}
TITLES = {'routine_hiru_floor_machine': 'フロア・マシン清掃',
          'routine_hiru_inventory': '在庫管理システム入力',
          'routine_hiru_mmente': 'ジムエリア マシンメンテ'}
DESC = '各項目どれか最低1つは必ず／1週間あいているものを優先／日曜日は全体の点検。チェックは一週間消さない'
MENTE_IDS = ['mmv2_%02d' % n for n in range(1, 14)]

def row(i):
    r = {'id': i, 'section': SEC, 'title': TITLES.get(i, 'つくりもの:' + i), 'desc': ''}
    if i == ITEM_ID:
        r.update({'title': TITLES[i], 'desc': DESC, 'link': 'machine_mente'})
    return r

def mk():
    kv = {}
    for st, ids in HIRU.items():
        kv['sdef_%s_customItems_routine_hiru' % st] = json.dumps(
            [row(i) for i in ids], ensure_ascii=False)
        kv['sdef_%s_customAreas' % st] = json.dumps(
            [{'key': 'machine_mente', 'name': 'マシンメンテ'}], ensure_ascii=False)
        kv['sdef_%s_customItems_machine_mente' % st] = json.dumps(
            [{'id': i, 'section': MENTE_SEC, 'title': 'マシン' + i} for i in MENTE_IDS],
            ensure_ascii=False)
    return kv

fails = []
def ck(name, cond, extra=''):
    print(('  OK   ' if cond else '  NG   ') + name + (('  ' + extra) if extra else ''))
    if not cond: fails.append(name)

kv = mk()
w1, r1 = build_mente(kv)
print('=== 1回目 ===')
ck('書き換える鍵は2件', len(w1) == 2, str(sorted(w1)))
ck('足すのは2件', len(r1['added']) == 2, str(len(r1['added'])))
ck('萩野通は触らない', not any('萩野通' in k for k in w1), str(sorted(w1)))
ck('見本の中身を拾えている',
   r1['model']['link'] == 'machine_mente' and r1['model']['title'] == TITLES[ITEM_ID],
   json.dumps(r1['model'], ensure_ascii=False))
ck('記録の鍵は1つも無い',
   not any(k.startswith(('clean_','periodicDone_','proofLog_','nums_','daySkip_')) for k in w1))

print('=== 並び ===')
for st in DST_STORES:
    k = 'sdef_%s_customItems_routine_hiru' % st
    out = json.loads(w1[k]); got = [c['id'] for c in out]
    kept = [i for i in got if i != ITEM_ID]
    ck(st + ': いまある項目がそのままの順で残る', kept == HIRU[st])
    ck(st + ': 1件だけ増える', len(got) == len(HIRU[st]) + 1,
       '%d→%d' % (len(HIRU[st]), len(got)))
    ck(st + ': フロア・マシン清掃の直後に入る',
       got.index(ITEM_ID) == got.index('routine_hiru_floor_machine') + 1)
    # 萩野通と同じ「絶対の位置」にはならない（店舗ごとに前にある件数が違う）。
    # そろえたいのは「フロア・マシン清掃の直後」という並びのほう。
    ck(st + ': 萩野通と同じ相手の直後に入る',
       got[got.index(ITEM_ID) - 1] == 'routine_hiru_floor_machine')
    new = [c for c in out if c['id'] == ITEM_ID][0]
    ck(st + ': リンク先が machine_mente', new.get('link') == 'machine_mente', str(new.get('link')))
    ck(st + ': 説明文も萩野通と同じ', new.get('desc') == DESC)
    ck(st + ': 区分はその店舗の区分', new.get('section') == SEC, str(new.get('section')))
    ck(st + ': idの重なりなし', len(got) == len(set(got)))

print('=== 2回目（増えないこと）===')
kv2 = dict(kv); kv2.update(w1)
w2, r2 = build_mente(kv2)
ck('書き換える鍵は0件', len(w2) == 0, str(sorted(w2)))
ck('すでにある扱いが2件', len(r2['same']) == 2, str(len(r2['same'])))

print('=== 人が名前を変えていた場合 ===')
kv3 = dict(kv2)
k = 'sdef_笠寺_customItems_routine_hiru'
lst = json.loads(kv3[k])
for c in lst:
    if c['id'] == ITEM_ID: c['title'] = 'マシンの注油（店舗ルール）'
kv3[k] = json.dumps(lst, ensure_ascii=False)
w3, r3 = build_mente(kv3)
ck('上書きしない', len(w3) == 0, str(sorted(w3)))
ck('違いとして報告される', any(x[0] == '笠寺' for x in r3['differs']))

print('=== 止まるべき場合 ===')
def stops(name, fix, word):
    kvx = mk(); fix(kvx)
    try:
        build_mente(kvx); ck(name, False, '止まらなかった')
    except SystemExit as e:
        ck(name, word in str(e), str(e)[:70])

stops('リンク先のエリアが無い店舗',
      lambda k: k.__setitem__('sdef_笠寺_customAreas', json.dumps([])), 'エリアがありません')
stops('リンク先の項目が空の店舗',
      lambda k: k.__setitem__('sdef_枇杷島_customItems_machine_mente', json.dumps([])),
      '見える項目が1件もありません')
stops('リンク先が全部下ろしてある店舗',
      lambda k: k.__setitem__('sdef_笠寺_hiddenItems_machine_mente', json.dumps(MENTE_IDS)),
      '見える項目が1件もありません')
stops('見本が無い（萩野通に行が無い）',
      lambda k: k.__setitem__('sdef_萩野通_customItems_routine_hiru',
                              json.dumps([row('routine_hiru_v3_01')], ensure_ascii=False)),
      '見本が取れない')
def to_shared(k):
    # みせべつを外し、共通の一覧を置く（アプリが共通を見る形にする）
    k['customItems_routine_hiru'] = k.pop('sdef_笠寺_customItems_routine_hiru')
stops('中番の一覧が共通', to_shared, '共通')
stops('中番が空',
      lambda k: k.__setitem__('sdef_笠寺_customItems_routine_hiru', json.dumps([])),
      '項目がありません')

print('=== フロア・マシン清掃が無い店舗（逃げ場）===')
kv6 = mk()
k = 'sdef_枇杷島_customItems_routine_hiru'
lst = [c for c in json.loads(kv6[k]) if c['id'] != 'routine_hiru_floor_machine']
kv6[k] = json.dumps(lst, ensure_ascii=False)
w6, r6 = build_mente(kv6)
got6 = [c['id'] for c in json.loads(w6[k])]
ck('在庫管理システム入力の直前に入る',
   got6.index(ITEM_ID) + 1 == got6.index('routine_hiru_inventory'))
ck('いまある項目はそのまま', [i for i in got6 if i != ITEM_ID] == [c['id'] for c in lst])

print('')
print('dry_mente  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
