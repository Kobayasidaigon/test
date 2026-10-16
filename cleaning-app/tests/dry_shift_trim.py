# -*- coding: utf-8 -*-
"""shift_trim.py の下見。ほかの人の行と、15日以降のシフトを守れるか確かめる。"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ops'))
from shift_trim import build_trim, STORE, CUT, KEY, TARGET_PREFIX

T = '上西 憲伸'        # 見本の中だけの名前（本番の値はサーバーから読む）
O = '織田 三郎'
H = '久保 四郎'


def row(n, s, e):
    return {'n': n, 's': s, 'e': e}


def mk():
    sched = {
        # --- CUT より前（外す対象）---
        '2026-10-12': [row(O, '10:00', '19:00'), row(T, '14:00', '18:00')],
        '2026-10-13': [row(T, '14:00', '18:00')],                 # 本人だけ → 日ごと落ちる
        '2026-10-14': [row(T, '15:00', '18:00'), row(O, '09:00', '15:00')],
        '2026-10-11': [row(O, '10:00', '19:00')],                 # 関係ない日
        # --- CUT 以降（触らない）---
        '2026-10-15': [row(H, '10:00', '19:00'), row(T, '15:00', '18:00')],
        '2026-10-18': [row(T, '14:00', '18:00')],
        '2026-11-25': [row(O, '10:00', '19:00')],
    }
    return {
        KEY: json.dumps(sched, ensure_ascii=False),
        'shiftSchedule_枇杷島': json.dumps(
            {'2026-10-12': [row(T, '10:00', '14:00')]}, ensure_ascii=False),
        'staffRoster': json.dumps({STORE: [O, T]}, ensure_ascii=False),
        'clean_%s_%s_floor_2026-10-12' % (STORE, T): json.dumps({'a': True}),
    }


fails = []


def ck(n, c, e=''):
    print(('  OK   ' if c else '  NG   ') + n + (('  ' + e) if e else ''))
    if not c:
        fails.append(n)


kv = mk()
before = json.loads(kv[KEY])
writes, rep = build_trim(kv)
after = json.loads(writes[KEY]) if writes else None

print('=== ふつうに通したとき ===')
ck('書く鍵は1つだけ', list(writes) == [KEY], str(list(writes)))
ck('外す行は3件', len(rep['removed']) == 3, str(len(rep['removed'])))
ck('外した日は 12・13・14', sorted(set(d for d, s, e in rep['removed']))
   == ['2026-10-12', '2026-10-13', '2026-10-14'])
ck('本人だけの日は落ちる', rep['emptied'] == ['2026-10-13'], str(rep['emptied']))
ck('落ちた日は表から消える', '2026-10-13' not in after)
ck('15日以降に本人の行が残る', len(rep['kept']) == 2, str(len(rep['kept'])))
ck('名前は伏せてある', rep['target'] == T[0] + '○' * (len(T) - 1), rep['target'])

print('')
print('=== ほかの人の行を守れているか ===')
ck('12日は相手の行が残る',
   after['2026-10-12'] == [row(O, '10:00', '19:00')], str(after.get('2026-10-12')))
ck('14日は相手の行が残る',
   after['2026-10-14'] == [row(O, '09:00', '15:00')], str(after.get('2026-10-14')))
ck('関係ない日はそのまま', after['2026-10-11'] == before['2026-10-11'])
ck('相手の行は1行も減っていない',
   sum(1 for d in after for x in after[d] if x['n'] == O)
   == sum(1 for d in before for x in before[d] if x['n'] == O))

print('')
print('=== 15日以降は1文字も変わらないか ===')
same = all(before[d] == after.get(d) for d in before if d >= CUT)
ck('15日以降の中身が同じ', same)
ck('15日以降の日数が同じ',
   len([d for d in before if d >= CUT]) == len([d for d in after if d >= CUT]))
ck('本番の形（10-15・10-18）が残る',
   '2026-10-15' in after and '2026-10-18' in after)
ck('先の月（11-25）も残る', '2026-11-25' in after)

print('')
print('=== ほかの鍵に手を出していないか ===')
ck('よその店舗のシフトは書かない', 'shiftSchedule_枇杷島' not in writes)
ck('名簿は書かない', 'staffRoster' not in writes)
ck('清掃の記録は書かない', not [k for k in writes if k.startswith('clean_')])

print('')
print('=== もう一度流しても増えないか ===')
kv2 = mk()
kv2[KEY] = writes[KEY]
w2, r2 = build_trim(kv2)
ck('2回目は することなし', w2 == {}, str(list(w2)))
ck('2回目も15日以降は守る', len(r2['kept']) == 2, str(len(r2['kept'])))


def stops(name, fix, want):
    k = mk()
    fix(k)
    try:
        build_trim(k)
        ck('止まる: ' + name, False, '止まらなかった')
    except SystemExit as e:
        ck('止まる: ' + name, want in str(e), str(e))


print('')
print('=== おかしいときに止まるか ===')
stops('頭文字に当てはまる人が2人いる',
      lambda k: k.__setitem__(KEY, json.dumps(dict(
          json.loads(k[KEY]), **{'2026-10-10': [row('上原 五郎', '10:00', '14:00')]}),
          ensure_ascii=False)), '2人います')
stops('対象が1人も居ない',
      lambda k: k.__setitem__(KEY, json.dumps(
          {'2026-10-12': [row(O, '10:00', '19:00')]}, ensure_ascii=False)), '居ません')
stops('シフト表の鍵が無い', lambda k: k.pop(KEY), 'がありません')
stops('シフト表の形がおかしい',
      lambda k: k.__setitem__(KEY, json.dumps([1, 2, 3])), '形がおかしい')

print('')
print('=== 日付の形でない鍵があっても壊れないか ===')
kv3 = mk()
s3 = json.loads(kv3[KEY])
s3['メモ'] = 'なにか'
kv3[KEY] = json.dumps(s3, ensure_ascii=False)
w3, r3 = build_trim(kv3)
a3 = json.loads(w3[KEY])
ck('日付でない鍵はそのまま残る', a3.get('メモ') == 'なにか', str(a3.get('メモ')))
ck('日付でない鍵は報告に出る', r3['skipped'] == ['メモ'], str(r3['skipped']))
ck('外す行の数は変わらない', len(r3['removed']) == 3, str(len(r3['removed'])))

print('')
print('dry_shift_trim  pass=%d fail=%d' % (0 if fails else 1, len(fails)))
if fails:
    print('落ちた: ' + ' / '.join(fails))
    raise SystemExit(1)
