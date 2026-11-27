# -*- coding: utf-8 -*-
"""グローブ3点確認を入れる場所の下調べ（2026-11-27、読み取りのみ）。

3店舗それぞれで
  - ゴルフA（golf_a）の項目と隠す一覧
  - 遅番（routine_ban）の項目と隠す一覧
  - 名前や項目に「締め」「グローブ」「ゴルフ」が入っているエリア・項目
を出す。書き込みは1件もしない。
"""
import json

STORES = ['笠寺', '枇杷島', '萩野通']


def defread(kv, store, key):
    v = kv.get('sdef_%s_%s' % (store, key))
    return (kv.get(key), 'きょうつう') if v is None else (v, 'みせべつ')


def jload(v, fb):
    if not isinstance(v, str):
        return fb
    try:
        x = json.loads(v)
        return fb if x is None else x
    except Exception:
        return fb


def row(c):
    keep = {k: c.get(k) for k in c if k not in ('method',)}
    return json.dumps(keep, ensure_ascii=False)


def probe(kv):
    out = []
    p = out.append
    for st in STORES:
        p('==================== %s' % st)
        areas, src = defread(kv, st, 'customAreas')
        areas = jload(areas, [])
        p('customAreas (%s): %s' % (src, json.dumps([(a.get('key'), a.get('name'), a.get('hidden')) for a in areas if isinstance(a, dict)], ensure_ascii=False)))
        for ak in ('golf_a', 'golf_b', 'routine_ban'):
            raw, src = defread(kv, st, 'customItems_' + ak)
            items = jload(raw, None)
            hid = jload(defread(kv, st, 'hiddenItems_' + ak)[0], [])
            p('--- %s customItems (%s) %s件  hidden=%s' % (ak, src, len(items) if isinstance(items, list) else None, json.dumps(hid, ensure_ascii=False)))
            for c in (items or []):
                if isinstance(c, dict):
                    p('   ' + row(c))
        # キーワード
        pre = 'sdef_%s_customItems_' % st
        for k in sorted(kv):
            if not k.startswith(pre):
                continue
            for c in jload(kv[k], []) or []:
                if isinstance(c, dict) and any(w in json.dumps(c, ensure_ascii=False) for w in ('締め', 'グローブ', 'ゴルフ', '手袋')):
                    p('  [kw] %s: %s' % (k[len(pre):], row(c)))
    # 共通（店舗別が無いときの元）
    for k in ('customItems_golf_a', 'customItems_routine_ban'):
        p('共通 %s: %s' % (k, 'あり' if kv.get(k) else 'なし'))
    return '\n'.join(out)
