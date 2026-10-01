# -*- coding: utf-8 -*-
"""index.html から組み込みのエリア定義を抜き、本番に似せた state.json を作る。"""
import json, re, io, sys

src = io.open('/home/user/test/cleaning-app/public/index.html', encoding='utf-8').read()

def area_block(key):
    i = src.find('key: "%s"' % key)
    j = src.find('\n  {\n    key: "', i)
    return src[i:j if j > 0 else i + 6000]

def parse(key):
    blk = area_block(key)
    groups = []
    for m in re.finditer(r'\{ section: "([^"]+)", items: \[(.*?)\n      \]\}', blk, re.S):
        sec, body = m.group(1), m.group(2)
        items = [{'id': a, 'title': b}
                 for a, b in re.findall(r'\{ id: "([^"]+)", title: "([^"]+)"', body)]
        groups.append({'section': sec, 'items': items})
    return groups

builtin = {'floor': parse('floor'), 'machine': parse('machine')}
json.dump(builtin, io.open('builtin.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, gs in builtin.items():
    print(k, sum(len(g['items']) for g in gs), '件 /', len(gs), '区分')

# 本番に似せた店舗データ（引き継ぎ文書に出てくる、組み込みに無い項目を足す）
kv = {}
for store in ['笠寺', '枇杷島', '萩野通']:
    kv['sdef_%s_itemEdits_floor' % store] = json.dumps(
        {'sweep': {'title': 'フロアのモップ・掃除機掛け'}}, ensure_ascii=False)
    kv['sdef_%s_hiddenItems_floor' % store] = json.dumps(['fan'], ensure_ascii=False)  # 9/28 に定期へ移した
    kv['sdef_%s_customItems_floor' % store] = json.dumps([
        {'id': 'c_alcohol', 'section': '整頓・安全・設備', 'title': 'アルコール台'},
        {'id': 'c_stretch', 'section': '床・フロア全体', 'title': 'ストレッチエリア'},
    ], ensure_ascii=False)
    kv['sdef_%s_customItems_machine' % store] = json.dumps([
        {'id': 'c_tread_under', 'section': '有酸素マシン', 'title': 'ランニングマシンの下の清掃'},
        {'id': 'c_ashiba', 'section': '有酸素マシン', 'title': 'マシンの足場'},
        {'id': 'c_stair', 'section': '有酸素マシン', 'title': '階段マシンの清掃'},
        {'id': 'c_dust', 'section': 'フリーウェイト', 'title': 'マシン・ダンベル台の埃の清掃'},
    ], ensure_ascii=False)
    kv['sdef_%s_itemEdits_machine' % store] = json.dumps({
        'cardio_belt': {'title': 'カバー・ベルト・サイドの清掃'},
        'strength': {'title': 'ウェイトスタックマシンの清掃・除菌'},
    }, ensure_ascii=False)
    kv['sdef_%s_customItems_routine_hiru' % store] = json.dumps([
        {'id': 'routine_hiru_floor_machine', 'section': '必須',
         'title': 'フロア・マシン清掃', 'link': 'floor,machine'},
    ], ensure_ascii=False)
    kv['sdef_%s_customAreas' % store] = json.dumps([
        {'key': 'routine_hiru', 'name': '中番', 'icon': 'calendar-clock'},
    ], ensure_ascii=False)

json.dump({'kv': kv}, io.open('state.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('kv', len(kv))
