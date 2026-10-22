# -*- coding: utf-8 -*-
"""プロテイン清掃の「衛生管理」6項目を、水・土の曜日わけにする。

なぜ:
  週2回の項目が毎日の分母に入っているので、やっていない日は必ず 7/13 止まりになる。
  区分名に「水・土」を入れると、アプリは水曜・土曜だけ出して、その日だけ数える
  （sectionDayGroup / vOffDay。フロア・マシン清掃と同じ仕組み）。

やること:
  その6項目の「区分」だけを書き換える。項目のid・題・並びは1文字も変えない。
  idを変えないので、今までの記録はそのまま残る。

やらないこと:
  - 項目を足す・消す・並べ替える
  - ほかの項目（サーバー本体・補充ゴミ）の区分を変える
  - 清掃の記録・名簿・シフト表に触る（別の鍵なので手が届かない）
"""
import json

STORES = ['枇杷島', '笠寺']
AREA = 'protein_kasadera'
KEY = 'customItems_' + AREA
IDS = ['pk_health', 'pk_grooming', 'pk_handwash',
       'pk_autodoor', 'pk_sink', 'pk_hosecover']
NEW_SECTION = '衛生管理【水・土】'
MUST_CONTAIN = '衛生管理'      # 書き換える前の区分名に、これが入っていること


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def where(kv, store):
    """その店舗の項目定義が、どの鍵にあるか。(鍵, 中身) を返す。"""
    pk = 'sdef_%s_%s' % (store, KEY)
    if kv.get(pk) is not None:
        return pk, jload(kv[pk], None)
    if kv.get(KEY) is not None:
        return KEY, jload(kv[KEY], None)
    return None, None


def build_days(kv):
    """書く鍵と報告を返す。読むだけで、ここでは書かない。"""
    writes = {}
    report = {'stores': [], 'keys': []}

    for store in STORES:
        key, rows = where(kv, store)
        if key is None:
            raise SystemExit('::error::%s の %s が見つかりません' % (store, KEY))
        if not isinstance(rows, list):
            raise SystemExit('::error::%s の %s の形がおかしい' % (store, key))

        # もう水・土になっていたら、その店舗は飛ばす（2回流しても増えない）
        cur = [r for r in rows
               if isinstance(r, dict) and r.get('id') in IDS]
        if cur and all(str(r.get('section') or '') == NEW_SECTION for r in cur) \
           and len(cur) == len(IDS):
            report['stores'].append((store, key, ['すでに ' + NEW_SECTION], len(rows)))
            continue

        found, before_sec = [], set()
        out = []
        for r in rows:
            if not isinstance(r, dict) or not r.get('id'):
                out.append(r)
                continue
            if r['id'] in IDS:
                sec = str(r.get('section') or '')
                if MUST_CONTAIN not in sec:
                    raise SystemExit('::error::%s の %s の区分が思っていたものと違います: %r'
                                     % (store, r['id'], sec))
                before_sec.add(sec)
                found.append(r['id'])
                c = dict(r)
                c['section'] = NEW_SECTION
                out.append(c)
            else:
                out.append(r)

        missing = [i for i in IDS if i not in found]
        if missing:
            raise SystemExit('::error::%s に無い項目があります: %s'
                             % (store, '、'.join(missing)))

        # ---- 念のための確かめ ----
        if len(out) != len(rows):
            raise SystemExit('::error::項目の数が変わりました（%d → %d）'
                             % (len(rows), len(out)))
        for a, b in zip(rows, out):
            if not isinstance(a, dict):
                continue
            if a.get('id') != b.get('id'):
                raise SystemExit('::error::項目の並びが変わりました')
            for k in set(list(a.keys()) + list(b.keys())):
                if k == 'section':
                    continue
                if a.get(k) != b.get(k):
                    raise SystemExit('::error::区分のほかを変えようとしています: %s の %s'
                                     % (a.get('id'), k))
        changed = [b for a, b in zip(rows, out)
                   if isinstance(a, dict) and a.get('section') != b.get('section')]
        if len(changed) != len(IDS):
            raise SystemExit('::error::区分が変わる項目が %d件です（%d件のはず）'
                             % (len(changed), len(IDS)))

        body = json.dumps(out, ensure_ascii=False)
        if key in writes and writes[key] != body:
            raise SystemExit('::error::同じ鍵に違う中身を書こうとしています: %s' % key)
        writes[key] = body
        report['stores'].append((store, key, sorted(before_sec), len(rows)))

    report['keys'] = sorted(writes)
    return writes, report
