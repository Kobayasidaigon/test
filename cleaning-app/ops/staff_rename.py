# -*- coding: utf-8 -*-
"""連名の記録から、ある1人の名前だけを外す。清掃の記録は消さない。

やりたいこと:
  「友◯◯・山◯◯・上◯◯」のような連名（2人以上で1枚）の記録から、
  対象の1人だけを名前から外す。「友◯◯・山◯◯」に付け替える。
  記録（どの項目にチェックが付いたか）はそのまま移す。

なぜ消さないか:
  記録は担当者ごとに1つの鍵になっている（clean_<店舗>_<担当者>_<エリア>_<日付>）。
  連名の鍵を消すと、一緒に入っていた人の清掃記録まで消える。
  名前を付け替えれば、その人だけを外して記録は残せる。

名前について:
  実名はこのファイルに書かない。頭の文字（TARGET_PREFIX）で探し、
  その頭文字に当てはまる人が店舗の記録の中に1人だけであることを確かめてから動く。
  2人以上当てはまったら止める（取り違えを防ぐ）。

やらないこと:
  - 対象が単独で入っている記録には触らない（名前が空になるため。あったら止める）
  - 期間外（CUT 以降）の記録に触る
  - 他の店舗に触る
  - 定期清掃・写真・名簿・シフト表に触る
"""
import json
import re

STORE = '笠寺'
CUT = '2026-10-15'        # この日より前だけが対象
TARGET_PREFIX = '上'      # 外す人の名字の頭文字


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def split_key(k):
    """clean_<店舗>_<担当者>_<エリア>_<日付> を分解。合わなければ None。"""
    pre = 'clean_' + STORE + '_'
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


def members(staff):
    return [p.strip() for p in str(staff).split('・') if p.strip()]


def mask(n):
    out = []
    for p in members(n):
        out.append(p[0] + '○' * max(1, len(p) - 1))
    return '・'.join(out) or '(空)'


def merge_rec(target, src):
    """2つの記録を合わせる。付いているチェックは落とさない。"""
    out = dict(target or {})
    for k, v in (src or {}).items():
        if v:
            out[k] = v
        elif k not in out:
            out[k] = v
    return out


def build_rename(kv):
    """書き換える鍵・消す鍵と、報告を返す。読むだけで、ここでは書かない。"""
    # ---- 対象の人を1人に絞る ----
    found = set()
    for k in kv:
        p = split_key(k)
        if not p:
            continue
        for m in members(p['staff']):
            if m.startswith(TARGET_PREFIX):
                found.add(m)
    if not found:
        raise SystemExit('::error::「%s」で始まる担当者が %s の記録に見つかりません'
                         % (TARGET_PREFIX, STORE))
    if len(found) > 1:
        raise SystemExit('::error::「%s」で始まる担当者が %d人います（%s）。'
                         '取り違えるので止めます'
                         % (TARGET_PREFIX, len(found),
                            '、'.join(sorted(mask(x) for x in found))))
    target = list(found)[0]

    writes = {}
    deletes = []
    acc = {}      # 新しい鍵 -> 合わせた記録
    report = {'target': mask(target), 'moved': [], 'solo': [], 'kept': [],
              'merged': [], 'ticks': 0}

    for k in sorted(kv):
        p = split_key(k)
        if not p:
            continue
        ms = members(p['staff'])
        if target not in ms:
            continue
        if p['date'] >= CUT:
            report['kept'].append((p['date'], p['area'], mask(p['staff'])))
            continue
        rest = [m for m in ms if m != target]
        if not rest:
            # 単独の記録。名前から外すと担当者が居なくなるので、人が決めること
            report['solo'].append((p['date'], p['area']))
            continue
        new_staff = '・'.join(rest)
        new_key = 'clean_%s_%s_%s_%s' % (STORE, new_staff, p['area'], p['date'])
        if new_key == k:
            continue
        src = jload(kv.get(k), {}) or {}
        if new_key not in acc:
            base = jload(kv.get(new_key), {}) or {}
            if kv.get(new_key) is not None:
                report['merged'].append((p['date'], p['area'], mask(new_staff)))
            acc[new_key] = base
        acc[new_key] = merge_rec(acc[new_key], src)
        deletes.append(k)
        n = len([1 for v in src.values() if v])
        report['ticks'] += n
        report['moved'].append((p['date'], p['area'], mask(p['staff']),
                                mask(new_staff), n))

    if report['solo']:
        raise SystemExit('::error::対象が単独で入っている記録が %d件あります。'
                         '名前が空になるので止めます（消すのか残すのか決めてください）'
                         % len(report['solo']))

    for nk, rec in acc.items():
        writes[nk] = json.dumps(rec, ensure_ascii=False)

    # ---- 念のための確かめ ----
    for k in writes:
        p = split_key(k)
        if not p:
            raise SystemExit('::error::書こうとしている鍵の形がおかしい')
        if p['date'] >= CUT:
            raise SystemExit('::error::期間外の鍵を書こうとしています')
        if target in members(p['staff']):
            raise SystemExit('::error::外したはずの名前が残っています')
    for k in deletes:
        p = split_key(k)
        if not p or p['date'] >= CUT:
            raise SystemExit('::error::期間外の鍵を消そうとしています')
        if target not in members(p['staff']):
            raise SystemExit('::error::対象の名前が入っていない鍵を消そうとしています')
    if set(writes) & set(deletes):
        raise SystemExit('::error::同じ鍵を書いて消そうとしています')

    return writes, deletes, report
