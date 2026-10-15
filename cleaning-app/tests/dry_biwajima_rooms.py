# -*- coding: utf-8 -*-
"""biwajima_rooms.py の下見。本番の形を写した見本で確かめる。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
from biwajima_rooms import build_rooms, SAUNA_ROOMS, SHOWER_ROOMS, EXTRA_SAUNA_IDS, DST, SRC

# 本番から写した形（項目の中身は短くしてある）
SAUNA_TPL = ['bench', 'heater', 'c1781140965234718', 'c1781141036611316',
             'c1781141054077782', 'c1781141149684111', 'vent', 'sauna_shoerack',
             'sauna_amenity3', 'sauna_quickle']
SHOWER_TPL = ['floor', 'drain', 'door_glass', 'door_packing', 'head', 'caran', 'wall',
              'mirror', 'vent', 'c1784802235908', 'trash', 'shower_amenity3']
BUILTIN = {
    'sauna': [('サウナ室', ['bench', 'heater', 'wall2']), ('備品', ['mat', 'stock'])],
    'shower': [('床・排水', ['floor', 'drain', 'haircatch']), ('扉', ['door_glass']),
               ('アメニティ', ['soap', 'trash', 'mat', 'stock'])],
}

def mk():
    kv = {}
    kv['sdef_%s_customAreas' % SRC] = json.dumps([
        {'key': 'sauna_b1', 'name': 'サウナ男A', 'icon': 'flame', 'hidden': True},
        {'key': 'shower_b1', 'name': 'シャワー男1', 'icon': 'shower-head',
         'hidden': True, 'carryForward': True},
    ], ensure_ascii=False)
    kv['sdef_%s_customItems_sauna_b1' % SRC] = json.dumps(
        [{'id': i, 'section': 'サウナ男A', 'title': 'さ:' + i, 'method': 'や'} for i in SAUNA_TPL],
        ensure_ascii=False)
    kv['sdef_%s_customItems_shower_b1' % SRC] = json.dumps(
        [{'id': i, 'section': 'シャワー男1', 'title': 'シ:' + i} for i in SHOWER_TPL],
        ensure_ascii=False)
    # 枇杷島：部屋はまだ無い。共通のサウナ・シャワーを使っている
    kv['sdef_%s_customAreas' % DST] = json.dumps([
        {'key': 'machine_mente', 'name': 'マシンメンテ', 'icon': 'cog'},
        {'key': 'toilet_w', 'name': '女性トイレ'},
    ], ensure_ascii=False)
    kv['sdef_%s_customItems_sauna' % DST] = json.dumps(
        [{'id': 'c1781141211047287', 'section': '備品・換気', 'title': 'サーキュレーターの清掃作動確認'},
         {'id': 'sauna_shoerack', 'section': '備品・換気', 'title': '靴置きの清掃'}],
        ensure_ascii=False)
    kv['sdef_%s_customItems_shower' % DST] = json.dumps(
        [{'id': 'c1784802235908', 'section': '換気', 'title': '室内の臭いチェック'}],
        ensure_ascii=False)
    kv['sdef_%s_hiddenItems_shower' % DST] = json.dumps(['haircatch'])
    kv['sdef_%s_customItems_routine_asa' % DST] = json.dumps([
        {'id': 'routine_asa_v3_01', 'section': 'やること', 'title': 'サウナ電源'},
        {'id': 'routine_asa_v3_04', 'section': 'やること', 'title': 'サウナ清掃',
         'desc': '1チェック＝男女両方', 'link': 'sauna'},
        {'id': 'routine_asa_v3_05', 'section': 'やること', 'title': 'シャワー清掃',
         'desc': 'マット交換も', 'link': 'shower'},
        {'id': 'routine_asa_v3_16', 'section': 'やること', 'title': '報告'},
    ], ensure_ascii=False)
    return kv

fails = []
def ck(n, c, e=''):
    print(('  OK   ' if c else '  NG   ') + n + (('  ' + e) if e else ''))
    if not c: fails.append(n)

kv = mk()
w, r = build_rooms(kv, BUILTIN)

print('=== 1回目 ===')
ck('作る部屋は12室', len(r['rooms']) == 12, str(len(r['rooms'])))
ck('飛ばした部屋は無い', not r['skipped'])
ck('笠寺・萩野通には触らない',
   not any(('_%s_' % SRC) in k or '萩野通' in k for k in w), str([k for k in w if SRC in k]))
ck('記録の鍵は1つも無い',
   not any(k.startswith(('clean_','periodicDone_','proofLog_','nums_','daySkip_')) for k in w))
ck('枇杷島だけの項目を拾えている',
   [x[0] for x in r['extra']] == EXTRA_SAUNA_IDS, str(r['extra']))

print('=== サウナ5室 ===')
for key, name in SAUNA_ROOMS:
    rows = json.loads(w['sdef_%s_customItems_%s' % (DST, key)])
    ids = [c['id'] for c in rows]
    ck('%s(%s): 見本10件＋枇杷島の1件＝11件' % (key, name), len(rows) == 11, str(len(rows)))
    ck('%s: 見本の並びのまま' % key, ids[:10] == SAUNA_TPL, str(ids[:3]))
    ck('%s: サーキュレーターが末尾' % key, ids[-1] == 'c1781141211047287', ids[-1])
    ck('%s: 区分は部屋の名前' % key, all(c['section'] == name for c in rows))
    ck('%s: やり方も写っている' % key, rows[0].get('method') == 'や')
    secs = json.loads(w['sdef_%s_customSections_%s' % (DST, key)])
    ck('%s: 区分の登録も部屋の名前' % key, secs == [name], str(secs))

print('=== シャワー7室 ===')
for key, name in SHOWER_ROOMS:
    rows = json.loads(w['sdef_%s_customItems_%s' % (DST, key)])
    ids = [c['id'] for c in rows]
    ck('%s(%s): 12件' % (key, name), len(rows) == 12, str(len(rows)))
    ck('%s: 見本の並びのまま' % key, ids == SHOWER_TPL)
    ck('%s: 区分は部屋の名前' % key, all(c['section'] == name for c in rows))

print('=== エリアの印 ===')
areas = json.loads(w['sdef_%s_customAreas' % DST])
ck('いまのエリアは先頭のまま',
   [a['key'] for a in areas[:2]] == ['machine_mente', 'toilet_w'], str([a['key'] for a in areas[:2]]))
ck('12室が末尾に足される', len(areas) == 14, str(len(areas)))
sa = [a for a in areas if a['key'] == 'sauna_b3'][0]
sh = [a for a in areas if a['key'] == 'shower_b5'][0]
ck('サウナ: タブに出さない印', sa.get('hidden') is True)
ck('サウナ: 持ち越しの印は付かない', 'carryForward' not in sa)
ck('サウナ: アイコンも見本から', sa.get('icon') == 'flame', str(sa.get('icon')))
ck('サウナ男C の名前', sa.get('name') == 'サウナ男C', str(sa.get('name')))
ck('シャワー: タブに出さない印', sh.get('hidden') is True)
ck('シャワー: 持ち越しの印が付く', sh.get('carryForward') is True)
ck('シャワー: アイコンも見本から', sh.get('icon') == 'shower-head')
ck('サウナ男Bのシャワー の名前', sh.get('name') == 'サウナ男Bのシャワー', str(sh.get('name')))

print('=== やることリストの行き先 ===')
asa = json.loads(w['sdef_%s_customItems_routine_asa' % DST])
ids = [c['id'] for c in asa]
ck('並びも件数も変わらない', ids == ['routine_asa_v3_01','routine_asa_v3_04',
                                    'routine_asa_v3_05','routine_asa_v3_16'], str(ids))
s4 = [c for c in asa if c['id'] == 'routine_asa_v3_04'][0]
s5 = [c for c in asa if c['id'] == 'routine_asa_v3_05'][0]
ck('サウナ清掃が5室を開く',
   s4['link'] == 'sauna_b1,sauna_b2,sauna_b3,sauna_b4,sauna_b5', s4['link'])
ck('シャワー清掃が7室を開く',
   s5['link'] == ','.join('shower_b%d' % n for n in range(1, 8)), s5['link'])
ck('題も説明もそのまま', s4['title'] == 'サウナ清掃' and s4['desc'] == '1チェック＝男女両方')
ck('差し替えは2件と報告される', len(r['links']) == 2, str(len(r['links'])))

print('=== 共通エリアを下げる ===')
hs = json.loads(w['sdef_%s_hiddenItems_sauna' % DST])
hw = json.loads(w['sdef_%s_hiddenItems_shower' % DST])
ck('サウナ: 組み込み5件＋追加2件を下げる', set(hs) == {'bench','heater','wall2','mat','stock',
                                                   'c1781141211047287','sauna_shoerack'}, str(sorted(hs)))
ck('シャワー: もとの下ろし分も残す', 'haircatch' in hw)
ck('シャワー: 組み込みも追加も全部', {'floor','drain','door_glass','soap','trash',
                                  'c1784802235908'} <= set(hw), str(sorted(hw)))
ck('記録は消さない（clean_ を書かない）', not any('clean_' in k for k in w))

print('=== 2回目（増えないこと）===')
kv2 = dict(kv); kv2.update(w)
w2, r2 = build_rooms(kv2, BUILTIN)
ck('書き換える鍵は0件', len(w2) == 0, str(sorted(w2)))
ck('12室とも飛ばされる', len(r2['skipped']) == 12, str(len(r2['skipped'])))

print('=== 止まるべき場合 ===')
def stops(name, fix, word):
    kvx = mk(); fix(kvx)
    try:
        build_rooms(kvx, BUILTIN); ck(name, False, '止まらなかった')
    except SystemExit as e:
        ck(name, word in str(e), str(e)[:70])

stops('見本の部屋が無い',
      lambda k: k.__setitem__('sdef_%s_customAreas' % SRC, json.dumps([])), '見本が取れない')
stops('見本の項目が空',
      lambda k: k.__setitem__('sdef_%s_customItems_sauna_b1' % SRC, json.dumps([])), '項目が読めません')
stops('見本に下ろしてある項目がある',
      lambda k: k.__setitem__('sdef_%s_hiddenItems_shower_b1' % SRC, json.dumps(['floor'])),
      '下ろしてある項目があります')
stops('枇杷島だけの項目が見つからない',
      lambda k: k.__setitem__('sdef_%s_customItems_sauna' % DST, json.dumps([])), 'がありません')
stops('やることリストが共通',
      lambda k: k.__setitem__('customItems_routine_asa',
                              k.pop('sdef_%s_customItems_routine_asa' % DST)), '共通')

print('')
print('dry_biwajima  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
