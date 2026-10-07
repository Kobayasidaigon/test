# -*- coding: utf-8 -*-
"""上に見せる「清掃状況ページ」に何を載せるか決めるための下調べ。読み取り専用。

本番は この環境から直接見えないので、何が載せられるのかを先に数える。
ここで出た数字をそのまま見本に入れて、載せる・載せないを決めてもらう。

数えるもの（店舗ごと）:
  1. 月次点検の記録（月・点数・×と△の項目）  ← これが無いと主役が立たない
  2. 直近14日の記録（記録のある日数・チェック総数・記入した人数）
  3. エリアごとの「まるごと記録が無い日」      ← 行けていない所
  4. 率の低い項目 上位8（初回に付いた日つき） ← 増やしたばかりを見分ける
  5. 定期清掃（当てはまる件数・記録のある件数・日付を過ぎている件数）

書き込みは1件もしない。
"""
import json
import re
from datetime import date, timedelta

STORES = ['笠寺', '枇杷島', '萩野通']
RECENT = 14          # 「直近」の日数
RATE_MIN_DAYS = 7    # 率を出すのに最低これだけ対象日がほしい
TOP_N = 8


# ---- 読むだけの道具（アプリの defRead と同じ順）----
def defread(kv, store, key):
    v = kv.get('sdef_%s_%s' % (store, key))
    return kv.get(key) if v is None else v


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        return json.loads(v)
    except Exception:
        return fallback


def base_area(key):
    """時間帯（@routine_hiru）と曜日の枠（#d1）を落とす。アプリの baseArea と同じ。"""
    s = str(key or '')
    h = s.find('#')
    if h >= 0:
        s = s[:h]
    at = s.find('@')
    return s if at < 0 else s[:at]


def parse_record_key(k, store):
    """clean_<店舗>_<担当>_<エリア>_<日付> を分解。アプリの parseRecordKey と同じ。"""
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
    return {'staff': mid[:us], 'area': mid[us + 1:], 'date': d}


def parse_builtin(src):
    """index.html から組み込みのエリアと項目を読む。{エリア鍵: {name, groups}}。"""
    out = {}
    for m in re.finditer(r'key: "([a-z0-9_]+)", name: "([^"]+)"', src):
        key, name = m.group(1), m.group(2)
        i = m.start()
        j = src.find('\n  {\n    key: "', i)
        blk = src[i:j if j > 0 else i + 12000]
        groups = []
        for g in re.finditer(r'\{ section: "([^"]+)", items: \[(.*?)\n      \]\}', blk, re.S):
            groups.append({
                'section': g.group(1),
                'items': [{'id': a, 'title': b} for a, b in
                          re.findall(r'\{ id: "([^"]+)", title: "([^"]+)"', g.group(2))],
            })
        out[key] = {'name': name, 'groups': groups}
    return out


def is_routine(key):
    return str(key or '').startswith('routine_')


def visible_items(kv, store, area, builtin):
    """いま画面に出ている項目 [(id, 題名)]。組み込みに無いエリア（追加エリア）も通る。"""
    hidden = jload(defread(kv, store, 'hiddenItems_' + area), []) or []
    edits = jload(defread(kv, store, 'itemEdits_' + area), {}) or {}
    custom = jload(defread(kv, store, 'customItems_' + area), []) or []
    out = []
    for g in (builtin.get(area) or {}).get('groups', []):
        for it in g['items']:
            if it['id'] in hidden:
                continue
            ed = edits.get(it['id']) or {}
            t = ed.get('title')
            out.append((it['id'], t if t is not None else it['title']))
    for ci in custom:
        if isinstance(ci, dict) and ci.get('id') and ci.get('id') not in hidden:
            out.append((ci['id'], ci.get('title') or ''))
    return out


def all_areas(kv, store, builtin):
    """その店舗のエリア [(鍵, 名前)]。やることリスト（朝番など）は外す。"""
    out = [(k, v['name']) for k, v in builtin.items() if not is_routine(k)]
    have = set(k for k, _ in out)
    for a in (jload(defread(kv, store, 'customAreas'), []) or []):
        if isinstance(a, dict) and a.get('key') and a['key'] not in have and not is_routine(a['key']):
            out.append((a['key'], a.get('name') or a['key']))
    return out


# ---- 本体 ----
def collect(kv, builtin, today=None):
    today = today or date.today().isoformat()
    t0 = date.fromisoformat(today)
    window = [(t0 - timedelta(days=n)).isoformat() for n in range(RECENT)]
    wset = set(window)

    tasks = jload(kv.get('periodicTasks'), []) or []
    report = {'today': today, 'stores': []}

    for store in STORES:
        # --- 記録をぜんぶ拾う（日付 → エリア → 付いた項目id） ---
        byday = {}                 # 日付 -> {エリア: set(id)}
        staff_by_day = {}          # 日付 -> set(担当)
        first_seen = {}            # (エリア, id) -> いちばん古い日付
        ever = set()               # 一度でも記録が付いたエリア（窓の外も見る）
        for k, v in kv.items():
            if not k.startswith('clean_'):
                continue
            p = parse_record_key(k, store)
            if not p:
                continue
            rec = jload(v, {}) or {}
            if not isinstance(rec, dict):
                continue
            ar = base_area(p['area'])
            ids = [i for i, on in rec.items() if on]
            d = byday.setdefault(p['date'], {}).setdefault(ar, set())
            d.update(ids)
            if ids:
                staff_by_day.setdefault(p['date'], set()).add(p['staff'])
                ever.add(ar)
            for i in ids:
                key = (ar, i)
                if key not in first_seen or p['date'] < first_seen[key]:
                    first_seen[key] = p['date']

        # --- 月次点検 ---
        insp = jload(kv.get('inspection_' + store), []) or []
        insp = [e for e in insp if isinstance(e, dict) and e.get('month')]
        insp.sort(key=lambda e: e['month'], reverse=True)
        insp_out = []
        for e in insp[:4]:
            rows = e.get('rows') or []
            insp_out.append({
                'month': e.get('month'), 'date': e.get('date'), 'score': e.get('score'),
                'ng': [r.get('title') for r in rows if isinstance(r, dict) and r.get('score') == 0],
                'mid': [r.get('title') for r in rows if isinstance(r, dict) and r.get('score') == 3],
            })

        # --- 直近14日 ---
        rec_days = sorted(d for d in byday if d in wset)
        checks = sum(len(ids) for d in rec_days for ids in byday[d].values())
        staffs = sorted(set(s for d in rec_days for s in staff_by_day.get(d, ())))

        # --- エリアごと（店舗が動いていた日だけを分母にする）---
        areas = all_areas(kv, store, builtin)
        area_rows = []
        for ak, an in areas:
            items = visible_items(kv, store, ak, builtin)
            if not items:
                continue
            ids = set(i for i, _ in items)
            hit = [d for d in rec_days if byday[d].get(ak)]
            zero = [d for d in rec_days if not byday[d].get(ak)]
            area_rows.append({'key': ak, 'name': an, 'items': len(ids),
                              'days': len(hit), 'zero': len(zero), 'of': len(rec_days),
                              'ever': ak in ever})

            # --- 項目ごとの率（そのエリアに記録があった日を分母にする）---
            for iid, title in items:
                if len(hit) < RATE_MIN_DAYS or ak not in ever:
                    continue
                on = sum(1 for d in hit if iid in byday[d][ak])
                first = first_seen.get((ak, iid))
                report.setdefault('_items', []).append({
                    'store': store, 'area': an, 'title': title, 'id': iid,
                    'on': on, 'of': len(hit), 'first': first,
                })

        # --- 定期清掃 ---
        dm = jload(kv.get('periodicDone_' + store), {}) or {}
        mine = [t for t in tasks if isinstance(t, dict)
                and (not t.get('stores') or store in (t.get('stores') or []))]
        done_n = sum(1 for t in mine if (dm.get(t.get('id')) or {}).get('date'))
        over = []
        unset = 0
        for t in mine:
            d = dm.get(t.get('id')) or {}
            nxt = d.get('next')
            if not nxt and not d.get('date'):
                unset += 1
                continue
            if nxt and nxt <= today:
                over.append((t.get('title'), nxt))

        report['stores'].append({
            'store': store, 'insp': insp_out,
            'rec_days': len(rec_days), 'of': RECENT, 'checks': checks, 'staff': len(staffs),
            'areas': sorted([r for r in area_rows if r['ever']],
                            key=lambda r: r['zero'], reverse=True),
            'never': [r for r in area_rows if not r['ever']],
            'periodic': {'mine': len(mine), 'done': done_n, 'unset': unset, 'over': over},
        })
    return report


def low_items(report, store, top=TOP_N):
    """率の低い項目。初回が直近なら「増やしたばかり」の目印を付ける。"""
    t0 = date.fromisoformat(report['today'])
    rows = [r for r in report.get('_items', []) if r['store'] == store]
    for r in rows:
        r['pct'] = int(round(r['on'] / r['of'] * 100)) if r['of'] else 0
        r['new'] = bool(r['first'] and (t0 - date.fromisoformat(r['first'])).days <= RECENT)
    rows.sort(key=lambda r: (r['pct'], -r['of']))
    return rows[:top]
