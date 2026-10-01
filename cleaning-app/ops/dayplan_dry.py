# -*- coding: utf-8 -*-
import json, io, sys
sys.path.insert(0, '.')
from plan import build, visible_items, AREAS

kv = json.load(io.open('state.json', encoding='utf-8'))['kv']
builtin = json.load(io.open('builtin.json', encoding='utf-8'))
store = sys.argv[1] if len(sys.argv) > 1 else '枇杷島'

writes, rep = build(kv, store, builtin)

print('=== 引き当てられた項目 (%d件) ===' % len(rep['matched']))
for sec, area, iid, title in rep['matched']:
    print('  %-22s %-8s %-20s %s' % (sec, area, iid, title))

print('')
print('=== 引き当てられなかった計画 (%d件) ===' % len(rep['unmatched_plan']))
for sec, title in rep['unmatched_plan']:
    print('  %-22s %s' % (sec, title))
if not rep['unmatched_plan']:
    print('  なし')

print('')
print('=== 計画に出てこない＝そのまま置いておく項目 (%d件) ===' % len(rep['left_alone']))
for area, iid, title, sec in rep['left_alone']:
    print('  %-8s %-14s %-28s （今: %s）' % (area, iid, title, sec))

print('')
print('=== 足される項目 ===')
print('  ' + ('、'.join(rep.get('added') or []) or 'なし'))

print('')
print('=== 書き換える鍵 (%d件) ===' % len(writes))
for k in sorted(writes):
    print('  ' + k)

# もう一度流しても増えないこと
kv2 = dict(kv); kv2.update(writes)
w2, _ = build(kv2, store, builtin)
print('')
print('2回目に書き換える鍵: %d件 %s' % (len(w2), '（増えない）' if not w2 else '← 増えている'))
json.dump(writes, io.open('after_%s.json' % store, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
