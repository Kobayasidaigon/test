# -*- coding: utf-8 -*-
"""共有ページの「◯/◯」が厳しすぎないかを、本番の実数で測る。読み取り専用。

疑っていること:
  アプリ本体は「今日の曜日でない区分」（【月・木】【火・金】【水・土】）を
  たたんで見せない。なのに共有ページは毎日ぜんぶを分母に入れている。
  マシン・器具のように3区分に分かれている所だと、どの日も3分の1しか
  対象でないのに全部数えるので、何をやっても低く出る。

出すもの（店舗ごと・直近7日）:
  いまの数え方（全項目）と、曜日を考えた数え方を並べて、率の差を見る。

書き込みは1件もしない。
"""
import json
import re
from datetime import date, timedelta

STORES = ['笠寺', '枇杷島', '萩野通']
DAYS_BACK = 7
LIVE_DAYS = 30        # これより古い記録しかないエリアは「使っていない設備」
DAY_GROUPS = [
    {'id': 'd1', 'name': '月・木', 'days': [0, 3]},   # pythonの weekday(): 月=0
    {'id': 'd2', 'name': '火・金', 'days': [1, 4]},
    {'id': 'd3', 'name': '水・土', 'days': [2, 5]},
]


def defread(kv, store, key):
    v = kv.get('sdef_%s_%s' % (store, key))
    return kv.get(key) if v is None else v


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def base_area(key):
    s = str(key or '')
    h = s.find('#')
    if h >= 0:
        s = s[:h]
    at = s.find('@')
    return s if at < 0 else s[:at]


def parse_builtin(src):
    """index.html から組み込みのエリアと項目を読む。{エリア鍵: [(区分, [項目id])]}。"""
    out = {}
    for m in re.finditer(r'key: "([a-z0-9_]+)", name: "([^"]+)"', src):
        key = m.group(1)
        i = m.start()
        j = src.find('\n  {\n    key: "', i)
        blk = src[i:j if j > 0 else i + 14000]
        groups = []
        for g in re.finditer(r'\{ section: "([^"]+)", items: \[(.*?)\n      \]\}', blk, re.S):
            ids = re.findall(r'\{ id: "([^"]+)"', g.group(2))
            groups.append((g.group(1), ids))
        out[key] = groups
    return out


def day_group_of(section):
    s = str(section or '')
    for g in DAY_GROUPS:
        if g['name'] in s:
            return g
    return None


def area_items(kv, store, area_key, builtin):
    """その店舗のそのエリアに出る項目。[(項目id, 区分)] を返す（アプリの getGroups と同じ順）。"""
    hidden = jload(defread(kv, store, 'hiddenItems_' + area_key), []) or []
    edits = jload(defread(kv, store, 'itemEdits_' + area_key), {}) or {}
    custom = jload(defread(kv, store, 'customItems_' + area_key), []) or []
    out = []
    for sec, ids in builtin.get(area_key, []):
        for iid in ids:
            if iid in hidden:
                continue
            ed = edits.get(iid) or {}
            s = ed.get('section') if (ed.get('section') or '').strip() else sec
            out.append((iid, s))
    for c in (custom if isinstance(custom, list) else []):
        if not isinstance(c, dict) or not c.get('id') or c.get('id') in hidden:
            continue
        ed = edits.get(c['id']) or {}
        s = ed.get('section') if (ed.get('section') or '').strip() else (c.get('section') or '')
        out.append((c['id'], s))
    return out


def all_areas(kv, store, builtin):
    keys = list(builtin.keys())
    for a in (jload(defread(kv, store, 'customAreas'), []) or []):
        if isinstance(a, dict) and a.get('key') and a['key'] not in keys:
            keys.append(a['key'])
    return keys


def records(kv, store):
    """{(エリア, 項目id, 日付)} の集合と、エリアごとの最新日。"""
    done = set()
    last = {}
    pre = 'clean_' + store + '_'
    for k, v in kv.items():
        if not k.startswith(pre):
            continue
        d = k[-10:]
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', d):
            continue
        mid = k[len(pre):len(k) - 11]
        us = mid.find('_')
        if us < 0:
            continue
        area = base_area(mid[us + 1:])
        rec = jload(v, {}) or {}
        for iid, on in rec.items():
            if not on:
                continue
            done.add((area, iid, d))
            if area not in last or d > last[area]:
                last[area] = d
    return done, last


def collect(kv, builtin, today):
    """店舗ごと・日ごとに、いまの数え方と曜日を考えた数え方を出す。"""
    out = {}
    for store in STORES:
        done, last = records(kv, store)
        keys = all_areas(kv, store, builtin)
        rows = []
        for n in range(DAYS_BACK):
            d = today - timedelta(days=n)
            ds = d.isoformat()
            wd = d.weekday()
            tot_all = tot_day = n_done = n_off = 0
            for ak in keys:
                # 共有ページと同じく、しばらく記録の無いエリアは数えない
                la = last.get(ak)
                if not la or (d - date.fromisoformat(la)).days > LIVE_DAYS:
                    continue
                for iid, sec in area_items(kv, store, ak, builtin):
                    g = day_group_of(sec)
                    is_today = (g is None) or (wd in g['days'])
                    tot_all += 1
                    if is_today:
                        tot_day += 1
                    else:
                        n_off += 1
                    if (ak, iid, ds) in done:
                        n_done += 1
            rows.append({'date': ds, 'wd': wd, 'done': n_done,
                         'all': tot_all, 'day': tot_day, 'off': n_off})
        out[store] = rows
    return out
