# -*- coding: utf-8 -*-
"""上に出す「週1の確定値」を作る。読み取りのみ。

日単位の数字は揺れる（夜にまとめてチェックを付ける日がある）。
週で締めれば確定値になり、店舗どうしの比較も初めてフェアになる。

出すもの（店舗ごと・先週と、その前の週）:
  1. 記録のあった日 / 7日
  2. まるごと手が付かなかったエリア（「使っているエリア」のうち）
  3. 前の週との差

「使っているエリア」＝その前4週間に1度でも記録があったエリア。
その店舗に無い設備（笠寺の共通シャワーなど部屋別へ移したもの）を
混ぜると、毎週「抜けている」と出て意味をなさない。
"""
import json
import re
from datetime import date, timedelta

STORES = ['笠寺', '枇杷島', '萩野通']
USED_WEEKS = 4          # 「使っているエリア」を決めるためにさかのぼる週数


def defread(kv, store, key):
    v = kv.get('sdef_%s_%s' % (store, key))
    return kv.get(key) if v is None else v


def jload(v, fb):
    if not isinstance(v, str):
        return fb
    try:
        return json.loads(v)
    except Exception:
        return fb


def base_area(key):
    s = str(key or '')
    h = s.find('#')
    if h >= 0:
        s = s[:h]
    at = s.find('@')
    return s if at < 0 else s[:at]


def parse_key(k, store):
    pre = 'clean_' + store + '_'
    if not k.startswith(pre):
        return None
    d = k[-10:]
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', d):
        return None
    mid = k[len(pre):len(k) - 11]
    us = mid.find('_')
    if us < 0:
        return None
    return {'area': base_area(mid[us + 1:]), 'date': d}


def area_names(kv, store, builtin):
    """エリア鍵 → 表示名。やることリストは除く（清掃エリアと二重になる）。"""
    out = {}
    for k, v in (builtin or {}).items():
        if not k.startswith('routine_'):
            out[k] = v
    for a in (jload(defread(kv, store, 'customAreas'), []) or []):
        if isinstance(a, dict) and a.get('key') and not str(a['key']).startswith('routine_'):
            out[a['key']] = a.get('name') or a['key']
    return out


def week_of(monday):
    return [(monday + timedelta(days=n)).isoformat() for n in range(7)]


def collect(kv, builtin, today=None):
    t0 = date.fromisoformat(today) if today else date.today()
    # 直近の「終わった週」の月曜。今日が月曜なら先週の月曜。
    last_mon = t0 - timedelta(days=t0.weekday() + 7)
    prev_mon = last_mon - timedelta(days=7)
    weeks = [('先週', last_mon), ('その前の週', prev_mon)]
    used_from = (last_mon - timedelta(weeks=USED_WEEKS)).isoformat()

    report = {'weeks': [(n, m.isoformat(), (m + timedelta(days=6)).isoformat())
                        for n, m in weeks], 'stores': []}

    for store in STORES:
        byday = {}          # 日付 -> set(エリア)
        ever_recent = set() # 直近4週に記録のあったエリア＝使っているエリア
        for k, v in kv.items():
            if not k.startswith('clean_'):
                continue
            p = parse_key(k, store)
            if not p:
                continue
            rec = jload(v, {}) or {}
            if not isinstance(rec, dict) or not any(rec.values()):
                continue
            byday.setdefault(p['date'], set()).add(p['area'])
            if p['date'] >= used_from:
                ever_recent.add(p['area'])

        names = area_names(kv, store, builtin)
        used = [a for a in ever_recent if a in names]

        rows = []
        for label, mon in weeks:
            days = week_of(mon)
            rec_days = [d for d in days if byday.get(d)]
            touched = set()
            for d in days:
                touched |= byday.get(d, set())
            missed = sorted([names[a] for a in used if a not in touched])
            rows.append({'label': label, 'days': len(rec_days), 'missed': missed})
        report['stores'].append({'store': store, 'used': len(used), 'rows': rows})
    return report
