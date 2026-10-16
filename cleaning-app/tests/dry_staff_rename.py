# -*- coding: utf-8 -*-
"""staff_rename.py の下見。記録を失わないこと・取り違えないことを確かめる。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
from staff_rename import build_rename, STORE, CUT, TARGET_PREFIX

T = '上西 憲伸'      # 見本の中だけの名前（本番の値はサーバーから読む）
def key(staff, area, date):
    return 'clean_%s_%s_%s_%s' % (STORE, staff, area, date)

def mk():
    return {
      # 期間内の連名3件（本番と同じ形）
      key('友川 一郎・山本 二郎・' + T, 'shower_b1@routine_asa', '2026-10-09'):
          json.dumps({'floor': True, 'drain': True, 'head': False}),
      key('大嶽 梨音・' + T, 'floor@routine_hiru', '2026-10-12'):
          json.dumps({'sweep': True}),
      key('織田 三郎・' + T, 'toilet_m@routine_ban', '2026-10-13'):
          json.dumps({'bowl': True, 'floor': True}),
      # 期間外（触らない）
      key('久保 四郎・' + T, 'floor@routine_asa', '2026-10-15'):
          json.dumps({'sweep': True}),
      # 関係ない人の記録（触らない）
      key('大嶽 梨音', 'machine@routine_hiru', '2026-10-12'):
          json.dumps({'wipe': True}),
      # よその店舗（触らない）
      'clean_枇杷島_' + T + '_floor_2026-10-12': json.dumps({'sweep': True}),
      # 記録以外（触らない）
      'staffRoster': json.dumps({STORE: ['大嶽 梨音', T]}, ensure_ascii=False),
      'periodicDone_' + STORE: json.dumps({'p1': {'date': '2026-10-01'}}),
    }

fails = []
def ck(n, c, e=''):
    print(('  OK   ' if c else '  NG   ') + n + (('  ' + e) if e else ''))
    if not c: fails.append(n)

kv = mk()
w, d, r = build_rename(kv)

print('=== 1回目 ===')
ck('対象は1人に絞れている', r['target'] == '上○○○○', r['target'])
ck('移すのは3件', len(r['moved']) == 3, str(len(r['moved'])))
ck('消す鍵も3件', len(d) == 3, str(len(d)))
ck('書く鍵も3件', len(w) == 3, str(len(w)))
ck('移したチェックは5件（2+1+2）', r['ticks'] == 5, str(r['ticks']))
ck('期間外は触らない', len(r['kept']) == 1 and r['kept'][0][0] == '2026-10-15',
   json.dumps(r['kept'], ensure_ascii=False))

print('=== 書く先・消す先 ===')
ck('新しい鍵に対象の名前が入っていない', all(T not in k for k in w), str([k for k in w if T in k]))
ck('消す鍵はすべて対象を含む', all(T in k for k in d))
ck('期間外の鍵を消さない', all(not k.endswith('2026-10-15') for k in d))
ck('よその店舗に触らない', not any('枇杷島' in k for k in list(w) + d))
ck('記録以外に触らない',
   not any(k.startswith(('staffRoster', 'periodicDone_')) for k in list(w) + d))
ck('同じ鍵を書いて消していない', not (set(w) & set(d)))

print('=== 中身が失われないこと ===')
k1 = key('友川 一郎・山本 二郎', 'shower_b1@routine_asa', '2026-10-09')
ck('3人→2人に付け替わる', k1 in w, str(sorted(w)[:1]))
ck('チェックの中身がそのまま移る',
   json.loads(w[k1]) == {'floor': True, 'drain': True, 'head': False},
   w.get(k1, ''))
k2 = key('大嶽 梨音', 'floor@routine_hiru', '2026-10-12')
ck('2人→1人に付け替わる', k2 in w)
ck('もとの単独記録は消さない',
   key('大嶽 梨音', 'machine@routine_hiru', '2026-10-12') not in d)

print('=== 付け替え先が既にある場合（合わせる）===')
kvm = mk()
# 同じ日・同じ場所に「大嶽 梨音」単独の記録もある状態にする
kvm[key('大嶽 梨音', 'floor@routine_hiru', '2026-10-12')] = json.dumps({'mop': True})
wm, dm, rm = build_rename(kvm)
got = json.loads(wm[key('大嶽 梨音', 'floor@routine_hiru', '2026-10-12')])
ck('もとからあったチェックが残る', got.get('mop') is True, json.dumps(got, ensure_ascii=False))
ck('移してきたチェックも入る', got.get('sweep') is True, json.dumps(got, ensure_ascii=False))
ck('合わせたことを報告する', len(rm['merged']) == 1, str(len(rm['merged'])))

print('=== 2回目（増えないこと）===')
kv2 = dict(kv)
for k in d: kv2.pop(k, None)
kv2.update(w)
w2, d2, r2 = build_rename(kv2)
ck('書く鍵は0件', len(w2) == 0, str(sorted(w2)))
ck('消す鍵も0件', len(d2) == 0, str(d2))

print('=== 止まるべき場合 ===')
def stops(name, fix, word):
    kvx = mk(); fix(kvx)
    try:
        build_rename(kvx); ck(name, False, '止まらなかった')
    except SystemExit as e:
        ck(name, word in str(e), str(e)[:80])

stops('頭文字に当てはまる人が2人いる',
      lambda k: k.__setitem__(key('上野 五郎', 'floor@routine_asa', '2026-10-10'),
                              json.dumps({'sweep': True})), '2人います')
stops('対象が単独で入っている記録がある',
      lambda k: k.__setitem__(key(T, 'floor@routine_asa', '2026-10-10'),
                              json.dumps({'sweep': True})), '単独で入っている')
stops('対象が1人も居ない',
      lambda k: [k.pop(x) for x in list(k) if T in x], '見つかりません')

print('')
print('dry_staff_rename  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
