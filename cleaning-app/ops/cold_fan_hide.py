# -*- coding: utf-8 -*-
"""冷風機の項目を3店舗の一覧から下ろす（2026-11-23、daigoさん「冷風機は一旦全店舗消しましょうか」）。

消さずに「隠す」: sdef_<店舗>_hiddenItems_routine_asa に id を足すだけ。
customItems（項目そのもの）と記録は触らないので、隠す一覧から id を外せば元に戻る。
対象: 朝番やることリスト「冷風機の水入れ・保冷剤交換」(routine_asa_v3_15)。
何度流しても同じ（もう隠れていれば何もしない）。
"""
import json

STORES = ['枇杷島', '笠寺', '萩野通']
AREA = 'routine_asa'
IDS = ['routine_asa_v3_15']


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def dread(kv, store, base):
    k = 'sdef_%s_%s' % (store, base)
    return kv[k] if k in kv and kv[k] is not None else kv.get(base)


def build(kv):
    writes, rep = {}, {}
    for st in STORES:
        custom = jload(dread(kv, st, 'customItems_' + AREA), [])
        hidden = jload(dread(kv, st, 'hiddenItems_' + AREA), [])
        if not isinstance(hidden, list):
            raise SystemExit('::error::%s の隠す一覧が読めません' % st)
        titles = {c.get('id'): c.get('title') for c in custom if isinstance(c, dict)}
        r = {'own_items': ('sdef_%s_customItems_%s' % (st, AREA)) in kv,
             'own_hidden': ('sdef_%s_hiddenItems_%s' % (st, AREA)) in kv,
             'hidden_before': list(hidden), 'add': [], 'already': [], 'not_in_list': []}
        h = list(hidden)
        for i in IDS:
            if i not in titles:
                r['not_in_list'].append(i)
            elif i in h:
                r['already'].append(i)
            else:
                h.append(i); r['add'].append((i, titles[i]))
        if h != hidden:
            writes['sdef_%s_hiddenItems_%s' % (st, AREA)] = json.dumps(h, ensure_ascii=False)
        rep[st] = r
    return writes, rep
