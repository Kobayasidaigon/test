# -*- coding: utf-8 -*-
"""routine_add.py の下見。本番の一覧をまねた見本で、落ちないか・増えないかを見る。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
from routine_add import build_routine, plan_for, ALL_STORES, SLOTS

# 調査で出た本番の並びをそのまま写した見本（抜粋ではなく全件）
REAL = {
('笠寺','routine_asa'): ['routine_asa_v3_01','routine_asa_v3_02','routine_asa_v3_03','routine_asa_v3_04','routine_asa_v3_05','asa_saunamat_pickup','routine_asa_v3_07','routine_asa_v3_06','routine_asa_v3_08','routine_asa_v3_10','routine_asa_v3_09','routine_asa_v3_13','routine_asa_v3_14','asa_golf_a','routine_asa_inventory','routine_asa_v3_16'],
('笠寺','routine_hiru'): ['routine_hiru_v3_01','routine_hiru_v3_02','hiru_saunamat_pickup','routine_hiru_v3_11','routine_hiru_v3_06','routine_hiru_floor_machine','routine_hiru_v3_05','routine_hiru_studio','hiru_locker_lost','routine_hiru_v3_09','routine_hiru_v3_03','routine_hiru_v3_08','routine_hiru_v3_13','routine_hiru_inventory','routine_hiru_v3_14'],
('笠寺','routine_ban'): ['routine_ban_v3_01','routine_ban_v3_02','ban_saunamat_pickup','ban_showermat_pickup','routine_ban_v3_08','routine_ban_v3_11','routine_ban_v3_10','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_16','routine_ban_v3_17','routine_ban_studio_volume','routine_ban_studio_mic','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
('枇杷島','routine_asa'): ['routine_asa_v3_01','routine_asa_v3_02','routine_asa_v3_03','routine_asa_v3_04','asa_saunamat_pickup','routine_asa_v3_05','asa_showermat_pickup','routine_asa_v3_07','routine_asa_v3_06','routine_asa_v3_08','routine_asa_v3_10','routine_asa_v3_09','routine_asa_v3_13','routine_asa_v3_14','routine_asa_v3_15','asa_golf_a','routine_asa_inventory','routine_asa_v3_16'],
('枇杷島','routine_hiru'): ['routine_hiru_v3_01','routine_hiru_v3_02','hiru_saunamat_pickup','routine_hiru_v3_11','routine_hiru_v3_06','hiru_cup','routine_hiru_floor_machine','routine_hiru_v3_05','routine_hiru_studio','hiru_locker_lost','routine_hiru_v3_09','routine_hiru_v3_03','routine_hiru_v3_08','routine_hiru_v3_13','routine_hiru_inventory','routine_hiru_v3_14'],
('枇杷島','routine_ban'): ['routine_ban_v3_01','routine_ban_v3_02','ban_saunamat_pickup','ban_showermat_pickup','routine_ban_v3_08','routine_ban_v3_11','routine_ban_v3_10','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_17','routine_ban_studio_volume','routine_ban_studio_mic','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
('萩野通','routine_asa'): ['routine_asa_v3_01','routine_asa_v3_02','routine_asa_v3_03','routine_asa_v3_04','routine_asa_v3_05','asa_showermat_pickup','routine_asa_v3_07','routine_asa_v3_06','c1790045467765788','c1789095762733332','routine_asa_v3_10','routine_asa_v3_09','routine_asa_v3_11','routine_asa_v3_13','routine_asa_v3_14','c1790304025802715','routine_asa_v3_15','asa_golf_a','routine_asa_inventory','routine_asa_v3_16'],
('萩野通','routine_hiru'): ['routine_hiru_v3_01','routine_hiru_v3_02','routine_hiru_saunamat','routine_hiru_v3_07','routine_hiru_v3_11','routine_hiru_v3_06','routine_hiru_floor_machine','routine_hiru_mmente','routine_hiru_v3_05','routine_hiru_studio','hiru_locker_lost','routine_hiru_v3_10','c1790246468370937','routine_hiru_v3_03','routine_hiru_v3_08','routine_hiru_v3_13','routine_hiru_inventory','routine_hiru_v3_14'],
('萩野通','routine_ban'): ['routine_ban_v3_01','routine_ban_v3_02','routine_ban_v3_05','c1789726016085825','ban_showermat_pickup','c1789726050880903','routine_ban_v3_08','routine_ban_v3_11','routine_ban_v3_07','c178904793741516','c1789047953499532','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_16','routine_ban_v3_17','routine_ban_studio_volume','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
}
INV = {'routine_asa_inventory':'在庫管理システム入力','routine_hiru_inventory':'在庫管理システム入力',
       'routine_ban_v3_18':'在庫管理システム入力','routine_asa_v3_18':'在庫管理システム入力'}
SEC = 'やることリスト（上から順に）'

def mk():
    kv = {}
    for (store, slot), ids in REAL.items():
        kv['sdef_%s_customItems_%s' % (store, slot)] = json.dumps(
            [{'id': i, 'section': SEC, 'title': INV.get(i, 'つくりもの:' + i), 'desc': ''} for i in ids],
            ensure_ascii=False)
    return kv

fails = []
def ck(name, cond, extra=''):
    print(('  OK   ' if cond else '  NG   ') + name + (('  ' + extra) if extra else ''))
    if not cond: fails.append(name)

kv = mk()
w1, r1 = build_routine(kv)

print('=== 1回目 ===')
ck('書き換える鍵は9件', len(w1) == 9, str(sorted(w1)))
ck('足すのは 3店舗x3時間帯x2 + 遅番2店舗x3 = 24件', len(r1['added']) == 24, str(len(r1['added'])))
ck('すでに入っていたものは無い', not r1['same'])
ck('中身が違うものは無い', not r1['differs'])
ck('下ろしてあるものは無い', not r1['hidden'])
ck('書く鍵はすべて sdef_ の customItems_', all(k.startswith('sdef_') and '_customItems_routine_' in k for k in w1))
ck('記録の鍵は1つも無い', not any(k.startswith(('clean_','periodicDone_','proofLog_','nums_','daySkip_','cleanHistory_')) for k in w1))

# 並び: いまある項目が1つも減っていない／順番も同じ／新しいのは在庫管理の直前
print('=== 並び ===')
for (store, slot), ids in REAL.items():
    k = 'sdef_%s_customItems_%s' % (store, slot)
    out = json.loads(w1[k])
    got = [c['id'] for c in out]
    want_new = [x['id'] for x in plan_for(store, slot)]
    kept = [i for i in got if i not in set(want_new)]
    inv = [i for i in got if INV.get(i)]
    pos_new = [got.index(i) for i in want_new]
    label = '%s/%s' % (store, slot)
    ck(label + ': いまある項目がそのままの順で残る', kept == ids)
    ck(label + ': 足した数', len(got) == len(ids) + len(want_new), '%d→%d (+%d)' % (len(ids), len(got), len(want_new)))
    ck(label + ': 在庫管理システム入力の直前に入る',
       bool(inv) and max(pos_new) + 1 == got.index(inv[0]))
    ck(label + ': 頼まれた順に並ぶ', pos_new == sorted(pos_new))
    ck(label + ': 区分はいまの区分', all(c['section'] == SEC for c in out))
    ck(label + ': idの重なりなし', len(got) == len(set(got)))

# 2回目（もう一度流す）
print('=== 2回目（増えないこと）===')
kv2 = dict(kv); kv2.update(w1)
w2, r2 = build_routine(kv2)
ck('書き換える鍵は0件', len(w2) == 0, str(sorted(w2)))
ck('すでに入っていた扱いが24件', len(r2['same']) == 24, str(len(r2['same'])))

# 人が名前を変えていたら上書きしない
print('=== 人が名前を変えていた場合 ===')
kv3 = dict(kv2)
k = 'sdef_笠寺_customItems_routine_ban'
lst = json.loads(kv3[k])
for c in lst:
    if c['id'] == 'ban_mop_clean': c['title'] = 'モップの洗浄（店舗ルール）'
kv3[k] = json.dumps(lst, ensure_ascii=False)
w3, r3 = build_routine(kv3)
ck('上書きしない（書き換え0件）', len(w3) == 0, str(sorted(w3)))
ck('違いとして報告される', any(x[2] == 'ban_mop_clean' for x in r3['differs']))

# 下ろしてある（hiddenItems_）に同じidがあったら気づける
print('=== 下ろしてある一覧に同じidがあった場合 ===')
kv4 = mk()
kv4['sdef_萩野通_hiddenItems_routine_hiru'] = json.dumps(['hiru_mop_clean'])
w4, r4 = build_routine(kv4)
ck('足すけれど、下ろしてあることを報告する', any(x[2] == 'hiru_mop_clean' for x in r4['hidden']))

# 一覧が共通だったら止まる
print('=== 一覧が共通だった場合 ===')
kv5 = mk(); del kv5['sdef_笠寺_customItems_routine_asa']
kv5['customItems_routine_asa'] = json.dumps([{'id':'x','section':SEC,'title':'在庫管理システム入力'}], ensure_ascii=False)
try:
    build_routine(kv5); ck('止まる', False)
except SystemExit as e:
    ck('止まる', '共通' in str(e), str(e)[:60])

# 目印が無い時は末尾に足す（止まらない）
print('=== 在庫管理システム入力が無い場合 ===')
kv6 = mk()
k = 'sdef_枇杷島_customItems_routine_hiru'
lst = [c for c in json.loads(kv6[k]) if not INV.get(c['id'])]
kv6[k] = json.dumps(lst, ensure_ascii=False)
w6, r6 = build_routine(kv6)
out6 = json.loads(w6[k])
ck('末尾に足す', [c['id'] for c in out6][-2:] == ['hiru_trash_dispose','hiru_mop_clean'])
ck('いまある項目はそのまま', [c['id'] for c in out6][:len(lst)] == [c['id'] for c in lst])

print('')
print('dry_routine  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
