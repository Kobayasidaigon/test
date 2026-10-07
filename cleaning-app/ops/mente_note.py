# -*- coding: utf-8 -*-
"""「ジムエリア マシンメンテ」の説明文の「3日で全て実施」をやめる。

本人の指示:
  「３日で全て完了はやめて、1週間あいているものを優先にという文字にして」

やること:
  - やることリストの行（routine_*）の説明文を1か所だけ差し替える
  - 差し替えるのは「3日で全て実施」の部分だけ。前後の文はそのまま

やらないこと:
  - 項目のidを変える・消す
  - 題名を変える
  - 記録を触る
"""
import json
import re

STORES = ['笠寺', '枇杷島', '萩野通']

# 現場が手で直している可能性があるので、言い回しの揺れを並べておく。
# 上から順に探して、最初に当たったものを差し替える。
OLD = [
    '3日で全て実施', '３日で全て実施',
    '3日で全て完了', '３日で全て完了',
    '3日で全ての実施', '３日で全ての実施',
    '3日で全部実施', '３日で全部実施',
]
NEW = '1週間あいているものを優先'


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


def routine_areas(kv, store):
    """やることリストのエリア鍵。組み込みの3つ＋店舗が足したもの。"""
    keys = ['routine_asa', 'routine_hiru', 'routine_ban']
    for a in (jload(defread(kv, store, 'customAreas'), []) or []):
        if isinstance(a, dict) and str(a.get('key') or '').startswith('routine_') \
                and a['key'] not in keys:
            keys.append(a['key'])
    return keys


def build_note(kv):
    writes = {}
    report = {'changed': [], 'already': [], 'looked': 0}

    for store in STORES:
        for area in routine_areas(kv, store):
            key = 'customItems_' + area
            raw = defread(kv, store, key)
            items = jload(raw, [])
            if not isinstance(items, list) or not items:
                continue
            report['looked'] += len(items)
            hit = False
            for it in items:
                if not isinstance(it, dict):
                    continue
                desc = it.get('desc')
                if not isinstance(desc, str) or not desc:
                    continue
                if NEW in desc and not any(o in desc for o in OLD):
                    report['already'].append((store, area, it.get('title'), desc))
                    continue
                for o in OLD:
                    if o in desc:
                        after = desc.replace(o, NEW, 1)
                        report['changed'].append(
                            (store, area, it.get('id'), it.get('title'), desc, after))
                        it['desc'] = after
                        hit = True
                        break
            if hit:
                # 項目は1件も増減しない。確かめてから書く
                before_ids = [c.get('id') for c in jload(raw, []) if isinstance(c, dict)]
                after_ids = [c.get('id') for c in items if isinstance(c, dict)]
                if before_ids != after_ids:
                    raise SystemExit('::error::%s / %s の項目が変わっています' % (store, area))
                writes['sdef_%s_%s' % (store, key)] = json.dumps(items, ensure_ascii=False)

    if not report['changed'] and not report['already']:
        raise SystemExit(
            '::error::「3日で全て実施」に当たる説明文が見つかりませんでした。'
            '言い回しが違うかもしれないので、何も書かずに止めます')
    return writes, report
