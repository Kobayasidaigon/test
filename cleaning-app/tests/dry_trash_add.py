# -*- coding: utf-8 -*-
"""trash_add.py の下見。10/31 に読んだ本番の並びをまねた見本で、落ちないか・増えないかを見る。"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
import trash_add
from trash_add import build_trash

SEC = 'やることリスト（上から順に）'
BAN = {
 '枇杷島': ['routine_ban_v3_01','routine_ban_v3_02','ban_saunamat_pickup','ban_showermat_pickup','routine_ban_v3_08','routine_ban_v3_11','c1792550010475151','routine_ban_v3_10','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_17','routine_ban_studio_volume','routine_ban_studio_mic','ban_vacuum_sink','ban_trashbin_clean','ban_saunamat_box_wash','ban_trash_dispose','ban_mop_clean','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
 '笠寺': ['routine_ban_v3_01','routine_ban_v3_02','ban_saunamat_pickup','ban_showermat_pickup','routine_ban_v3_08','routine_ban_v3_11','routine_ban_v3_10','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_16','routine_ban_v3_17','routine_ban_studio_volume','routine_ban_studio_mic','ban_vacuum_sink','ban_trashbin_clean','ban_saunamat_box_wash','ban_trash_dispose','ban_mop_clean','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
 '萩野通': ['routine_ban_v3_01','routine_ban_v3_02','routine_ban_v3_05','c1789726016085825','ban_showermat_pickup','c1789726050880903','routine_ban_v3_08','routine_ban_v3_11','routine_ban_v3_07','c178904793741516','c1789047953499532','routine_ban_v3_13','routine_ban_v3_14','routine_ban_v3_15','routine_ban_v3_03','routine_ban_v3_16','routine_ban_v3_17','routine_ban_studio_volume','ban_trash_dispose','ban_mop_clean','routine_ban_v3_18','routine_ban_v3_19','routine_ban_v3_20','routine_ban_v3_21'],
}
PROT = [('サーバー本体','c1781262038243946'),('サーバー本体','c178247099955576')] + \
       [('衛生管理【水・土】', i) for i in ['pk_health','pk_grooming','pk_handwash','pk_autodoor','pk_sink','pk_hosecover']]

def mk():
    kv = {'clean_笠寺_x': '1'}
    for s, ids in BAN.items():
        kv['sdef_%s_customItems_routine_ban' % s] = json.dumps([{'id': i, 'section': SEC, 'title': 't'+i, 'desc': ''} for i in ids], ensure_ascii=False)
    for s in ['枇杷島', '笠寺']:
        kv['sdef_%s_customItems_protein_kasadera' % s] = json.dumps([{'id': i, 'section': sec, 'title': 't'+i} for sec, i in PROT], ensure_ascii=False)
    return kv

fails = []
def ck(name, cond, extra=''):
    print(('  OK   ' if cond else '  NG   ') + name + (('  ' + extra) if extra else ''))
    if not cond: fails.append(name)

for psec, ppos in [('サーバー本体', 2), ('衛生管理【水・土】', 8)]:
    trash_add.PROTEIN_SECTION = psec
    print('=== プロテインの区分: %s ===' % psec)
    kv = mk()
    w, r = build_trash(kv)
    ck('書く鍵は5件（遅番3・プロテイン2）', len(w) == 5, str(sorted(w)))
    ck('記録の鍵は無い', not any(k.startswith(('clean_', 'periodicDone_')) for k in w))
    for s, ids in BAN.items():
        got = [c['id'] for c in json.loads(w['sdef_%s_customItems_routine_ban' % s])]
        n = got.index('ban_petbottle_check')
        ck('%s 遅番: ゴミ回収のすぐ下' % s, got[n-1] == 'routine_ban_v3_17')
        ck('%s 遅番: ほかはそのまま' % s, [i for i in got if i != 'ban_petbottle_check'] == ids, '%d→%d' % (len(ids), len(got)))
    for s in ['枇杷島', '笠寺']:
        rows = json.loads(w['sdef_%s_customItems_protein_kasadera' % s])
        got = [c['id'] for c in rows]
        ck('%s プロテイン: %s の最後（%d番目）' % (s, psec, ppos), got.index('pk_trashbin') == ppos and rows[ppos]['section'] == psec)
        ck('%s プロテイン: ほかはそのまま' % s, [i for i in got if i != 'pk_trashbin'] == [i for _, i in PROT])
    kv.update(w)
    w2, r2 = build_trash(kv)
    ck('2回目は書くものなし', not w2 and len(r2['same']) == 5)

# 止まる場合
trash_add.PROTEIN_SECTION = 'サーバー本体'
def stops(kv):
    try: build_trash(kv); return False
    except SystemExit: return True
kv = mk(); kv['sdef_萩野通_customItems_routine_ban'] = json.dumps([{'id': 'a', 'section': SEC}])
ck('遅番にゴミ回収が無ければ止まる', stops(kv))
kv = mk(); del kv['sdef_笠寺_customItems_protein_kasadera']; kv['customItems_protein_kasadera'] = '[{"id":"x","section":"サーバー本体"}]'
ck('プロテインが共通なら止まる', stops(kv))
trash_add.PROTEIN_SECTION = 'ない区分'
ck('区分が無ければ止まる', stops(mk()))

print('\n失敗 %d 件' % len(fails))
sys.exit(1 if fails else 0)
