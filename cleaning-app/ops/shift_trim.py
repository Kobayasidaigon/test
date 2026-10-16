# -*- coding: utf-8 -*-
"""シフト表から、ある1人の「ある日より前」の行だけを外す。

なぜ要るか:
  アプリは、見ている日のシフト表から担当者の行を自動で入れる
  （shiftStaffInWindow は、今日ではなく「開いている日」のシフトを見る）。
  だから、まだ居なかった日のシフトが残っていると、その日を開いたときに
  その人が担当者として出てしまう。

何をするか:
  shiftSchedule_<店舗> = {"日付": [{n:名前, s:開始, e:終了}, ...]} から、
  CUT より前の日にある「対象の人」の行だけを外す。
  行が無くなった日は、その日ごと落とす（シフトの無い日と同じ形になる）。

やらないこと:
  - CUT 以降のシフトに触る（その人はもう居るので、そのまま）
  - ほかの人の行に触る
  - 清掃の記録・名簿・履歴・写真のログに触る（別の鍵なので手が届かない）

名前について:
  実名はこのファイルに書かない。頭の文字（TARGET_PREFIX）で探し、
  その頭文字に当てはまる人がシフト表の中に1人だけであることを確かめてから動く。
  2人以上当てはまったら止める（取り違えを防ぐ）。
"""
import json
import re

STORE = '笠寺'
CUT = '2026-10-15'        # この日より前だけが対象
TARGET_PREFIX = '上'      # 外す人の名字の頭文字
KEY = 'shiftSchedule_' + STORE

DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def mask(n):
    s = str(n or '')
    return (s[0] + '○' * max(1, len(s) - 1)) if s else '(空)'


def rows_of(sched, day):
    v = sched.get(day)
    return v if isinstance(v, list) else []


def build_trim(kv):
    """書き換える鍵と報告を返す。読むだけで、ここでは書かない。"""
    raw = kv.get(KEY)
    if raw is None:
        raise SystemExit('::error::%s がありません' % KEY)
    sched = jload(raw, None)
    if not isinstance(sched, dict):
        raise SystemExit('::error::%s の形がおかしい（日付ごとの表ではない）' % KEY)

    # ---- 対象の人を1人に絞る ----
    found = set()
    for day in sched:
        for x in rows_of(sched, day):
            if isinstance(x, dict) and str(x.get('n') or '').startswith(TARGET_PREFIX):
                found.add(x['n'])
    if not found:
        raise SystemExit('::error::「%s」で始まる人が %s のシフト表に居ません'
                         % (TARGET_PREFIX, STORE))
    if len(found) > 1:
        raise SystemExit('::error::「%s」で始まる人が %d人います（%s）。'
                         '取り違えるので止めます'
                         % (TARGET_PREFIX, len(found),
                            '、'.join(sorted(mask(x) for x in found))))
    target = list(found)[0]

    out = {}
    report = {'target': mask(target), 'removed': [], 'emptied': [],
              'kept': [], 'skipped': []}
    for day in sorted(sched):
        rows = rows_of(sched, day)
        if not DATE.match(str(day)):
            # 日付の形でない鍵は、中身を見ずにそのまま残す
            out[day] = sched[day]
            report['skipped'].append(str(day))
            continue
        if day >= CUT:
            out[day] = rows
            for x in rows:
                if isinstance(x, dict) and x.get('n') == target:
                    report['kept'].append((day, x.get('s'), x.get('e')))
            continue
        left, gone = [], []
        for x in rows:
            if isinstance(x, dict) and x.get('n') == target:
                gone.append((day, x.get('s'), x.get('e')))
            else:
                left.append(x)
        report['removed'].extend(gone)
        if left:
            out[day] = left
        elif gone:
            report['emptied'].append(day)      # その人だけだった日は落とす
        else:
            out[day] = rows                    # もともと空の日はそのまま

    if not report['removed']:
        return {}, report                      # することなし

    # ---- 念のための確かめ ----
    for day, rows in out.items():
        if not DATE.match(str(day)) or day >= CUT:
            continue
        for x in (rows if isinstance(rows, list) else []):
            if isinstance(x, dict) and x.get('n') == target:
                raise SystemExit('::error::外したはずの行が残っています')
    for day in sorted(sched):
        if not DATE.match(str(day)) or day < CUT:
            continue
        if rows_of(sched, day) != out.get(day):
            raise SystemExit('::error::%s 以降のシフトを変えようとしています' % CUT)
    before_rows = sum(len(rows_of(sched, d)) for d in sched)
    after_rows = sum(len(v) for v in out.values() if isinstance(v, list))
    if before_rows - after_rows != len(report['removed']):
        raise SystemExit('::error::外す行の数が合いません（%d → %d / 外すのは %d行）'
                         % (before_rows, after_rows, len(report['removed'])))

    return {KEY: json.dumps(out, ensure_ascii=False)}, report
