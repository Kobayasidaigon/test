# -*- coding: utf-8 -*-
"""読み取りのみ: 笠寺のシャワー（とくにシャワールームB）がアプリでどう出ているか調べる（2026-11-27）。
人の名前は出さない。書くものは無い（writes は空）。"""
import json, re

STORE = '笠寺'


def j(raw, fb):
    try:
        return json.loads(raw)
    except Exception:
        return fb


def build(kv):
    rep = {}
    pre = 'sdef_%s_' % STORE
    areas = j(kv.get(pre + 'customAreas') or '[]', [])
    rep['areas'] = [{k: a.get(k) for k in ('key', 'name', 'hidden', 'parent', 'group') if k in a}
                    for a in areas if isinstance(a, dict)]
    rep['area_keys_all'] = [a.get('key') for a in areas if isinstance(a, dict)]
    # シャワー・ルームに関係する定義の鍵
    rep['def_keys'] = sorted(k[len(pre):] for k in kv
                             if k.startswith(pre) and re.search(r'shower|room|ルーム', k))
    # やることリストでシャワーに連動している行
    rows = []
    for k in kv:
        if not k.startswith(pre + 'customItems_routine'):
            continue
        for it in j(kv[k], []):
            if not isinstance(it, dict):
                continue
            s = json.dumps(it, ensure_ascii=False)
            if 'shower' in s or 'シャワー' in s:
                rows.append({'list': k[len(pre):], 'item': it})
    rep['routine_rows'] = rows
    # シャワー系エリアの中身（項目名と区分）
    det = {}
    for k in kv:
        m = re.match(r'^' + pre + r'(customItems|hiddenItems|itemEdits|customSections)_(shower\w*)$', k)
        if m:
            v = j(kv[k], kv[k])
            if m.group(1) == 'customItems' and isinstance(v, list):
                v = {'n': len(v), 'sections': sorted(set(str(x.get('section')) for x in v if isinstance(x, dict))),
                     'ids': [x.get('id') for x in v if isinstance(x, dict)]}
            det[m.group(1) + '_' + m.group(2)] = v
    rep['shower_defs'] = det
    # 直近の記録（エリアごとの日別件数。名前は出さない）
    cnt = {}
    cp = 'clean_%s_' % STORE
    for k in kv:
        if not k.startswith(cp):
            continue
        d = k[-10:]
        if d < '2026-11-13':
            continue
        mid = k[len(cp):-11]
        us = mid.find('_')
        area = mid[us + 1:]
        if 'shower' not in area:
            continue
        rec = j(kv[k], {})
        n = len([1 for v in (rec or {}).values() if v]) if isinstance(rec, dict) else 0
        cnt.setdefault(area, {}).setdefault(d, 0)
        cnt[area][d] += n
    rep['recent_counts'] = cnt
    # 記録1件の形（値だけ。名前は鍵にしか入らない）
    sample = None
    for k in sorted(kv):
        if k.startswith(cp) and 'shower' in k and k[-10:] >= '2026-11-25':
            sample = {'area_part': k[len(cp):-11].split('_', 1)[1], 'date': k[-10:], 'value': j(kv[k], kv[k])}
            break
    rep['sample_record'] = sample and {'area_part': sample['area_part'], 'date': sample['date'], 'shape': list((sample['value'] or {}).get('floor', {}).keys())}
    return {}, rep
