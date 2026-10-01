# -*- coding: utf-8 -*-
"""中番「フロア・マシン清掃」を 毎日 / A / B / C の区分に分ける計画を作る。

やること:
  - 区分（customSections_<エリア>）を4つ足す
  - 項目の置き場所（itemEdits_<エリア> の section）だけを書き換える
  - 各グループの最後に「フォロー枠」を1つ足す（新しいid）

やらないこと:
  - 項目のidを変える・消す（記録が迷子になる）
  - 題名・説明・やり方・数値欄を書き換える（既存の itemEdits は残す）
  - 名簿に載っていない項目を隠す（消えたように見えるので、必ず報告して判断を仰ぐ）
"""
import json, sys, re

EVERY = '毎日'
A = 'A 床・鏡まわり【月・木】'
B = 'B 有酸素・マシン【火・金】'
C = 'C フリーウェイト・整頓【水・土】'
SECTIONS = [EVERY, A, B, C]

# 本人確認済みの中身。題名で引き当てる（idは本番を読んでから決まる）。
PLAN = [
    (EVERY, 'フロアのモップ・掃除機掛け'),
    (EVERY, '汗・水滴の拭き取り（重点箇所）'),
    (EVERY, 'アルコール台'),
    (EVERY, '備品の整頓（定位置へ）'),

    (A, 'マット・ラバー床の除菌清掃'),
    (A, '鏡の清掃'),
    (A, 'ストレッチエリア'),
    (A, 'ランニングマシンの下の清掃'),
    (A, 'マシンの足場'),

    (B, 'ランニングマシンの清掃・除菌'),
    (B, 'カバー・ベルト・サイドの清掃'),
    (B, 'エアロバイクの清掃・除菌'),
    (B, '階段マシンの清掃'),
    (B, 'ウェイトスタックマシンの清掃・除菌'),
    (B, 'グリップ・ハンドルの除菌'),

    (C, 'ダンベル・バーベルの清掃・整頓'),
    (C, 'ラック・ベンチの清掃'),
    (C, 'プレートの整頓（重量順）'),
    (C, 'マシン・ダンベル台の埃の清掃'),
    (C, '小物類の清掃・整頓'),
]

FOLLOW_TITLE = 'しばらく空いている項目のフォロー（日付が古いものから）'
FOLLOW_DESC = '「◯日空き」が付いている所を、古いものから拾う枠'

AREAS = ['floor', 'machine']


def norm(s):
    """題名を突き合わせる用。空白・記号ゆれを吸収する。"""
    s = str(s or '')
    s = s.replace('（', '(').replace('）', ')').replace('・', '').replace('　', '')
    s = re.sub(r'[\s　]+', '', s)
    return s


def defread(kv, store, key):
    """店舗ごとの定義。無ければ共通を見る（アプリの defRead と同じ順）。"""
    v = kv.get('sdef_%s_%s' % (store, key))
    if v is None:
        v = kv.get(key)
    return v


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        return json.loads(v)
    except Exception:
        return fallback


def visible_items(kv, store, area, builtin):
    """いま画面に出ている項目（id・題名・今の区分・組み込みかどうか）。"""
    hidden = jload(defread(kv, store, 'hiddenItems_' + area), [])
    edits = jload(defread(kv, store, 'itemEdits_' + area), {})
    custom = jload(defread(kv, store, 'customItems_' + area), [])
    out = []
    for g in builtin.get(area, []):
        for it in g['items']:
            if it['id'] in hidden:
                continue
            ed = edits.get(it['id']) or {}
            out.append({
                'id': it['id'], 'builtin': True,
                'title': ed.get('title') if ed.get('title') is not None else it['title'],
                'section': ed.get('section') or g['section'],
            })
    for ci in custom:
        if not isinstance(ci, dict) or ci.get('id') in hidden:
            continue
        out.append({'id': ci['id'], 'builtin': False,
                    'title': ci.get('title') or '', 'section': ci.get('section') or ''})
    return out


def build(kv, store, builtin):
    """書くもの（after）と、人が読むための報告を返す。"""
    writes = {}
    report = {'matched': [], 'unmatched_plan': [], 'left_alone': [], 'store': store}

    index = {}          # 正規化した題名 -> (エリア, 項目)
    before_ids = {}     # エリア -> 見えている項目idの集合
    items_by_area = {}
    for area in AREAS:
        items = visible_items(kv, store, area, builtin)
        items_by_area[area] = items
        before_ids[area] = set(i['id'] for i in items)
        for i in items:
            index.setdefault(norm(i['title']), (area, i))

    assigned = {}       # (エリア, id) -> 新しい区分
    for sec, title in PLAN:
        hit = index.get(norm(title))
        if not hit:
            report['unmatched_plan'].append((sec, title))
            continue
        area, item = hit
        assigned[(area, item['id'])] = sec
        report['matched'].append((sec, area, item['id'], item['title']))

    # 計画に出てこない項目は、今の区分のまま置いておく（勝手に隠さない）
    for area in AREAS:
        for i in items_by_area[area]:
            if (area, i['id']) not in assigned:
                report['left_alone'].append((area, i['id'], i['title'], i['section']))

    # フォロー枠は「各グループに1つずつ」。A・B・C の項目が多いほうのエリアに置く
    # （エリアごとに1つ作ると、同じ枠が2か所に出てしまう）。
    follow_home = {}
    for sec in (A, B, C):
        cnt = {}
        for (a, i), s2 in assigned.items():
            if s2 == sec:
                cnt[a] = cnt.get(a, 0) + 1
        if cnt:
            follow_home[sec] = max(AREAS, key=lambda a: (cnt.get(a, 0), -AREAS.index(a)))
    report['follow_home'] = dict(follow_home)

    for area in AREAS:
        used = [s for s in SECTIONS if any(
            a == area and assigned[(a, i)] == s for (a, i) in assigned)]
        if not used:
            continue

        # --- 区分の一覧 ---
        secs = jload(defread(kv, store, 'customSections_' + area), [])
        new_secs = list(secs)
        for s in SECTIONS:
            if s in used and s not in new_secs:
                new_secs.append(s)
        # フォロー枠を置く区分（このエリアが「持ち主」になったものだけ）
        follow_secs = [s for s in (A, B, C) if follow_home.get(s) == area]
        if new_secs != secs:
            writes['sdef_%s_customSections_%s' % (store, area)] = json.dumps(
                new_secs, ensure_ascii=False)

        # --- 並び順：今日やる区分を上に。載っていない区分は今までどおり後ろへ ---
        want_order = [x for x in SECTIONS if x in used]
        cur_order = jload(defread(kv, store, 'sectionOrder_' + area), [])
        if cur_order != want_order:
            writes['sdef_%s_sectionOrder_%s' % (store, area)] = json.dumps(
                want_order, ensure_ascii=False)

        # --- 組み込み項目の置き場所（既存の編集は必ず残す）---
        edits = jload(defread(kv, store, 'itemEdits_' + area), {})
        new_edits = json.loads(json.dumps(edits))  # 深い複製
        changed = False
        for i in items_by_area[area]:
            sec = assigned.get((area, i['id']))
            if sec is None or not i['builtin']:
                continue
            e = new_edits.setdefault(i['id'], {})
            if e.get('section') != sec:
                e['section'] = sec
                changed = True
        if changed:
            writes['sdef_%s_itemEdits_%s' % (store, area)] = json.dumps(
                new_edits, ensure_ascii=False)

        # --- カスタム項目の置き場所＋フォロー枠 ---
        custom = jload(defread(kv, store, 'customItems_' + area), [])
        new_custom = json.loads(json.dumps(custom))
        cchanged = False
        for ci in new_custom:
            if not isinstance(ci, dict):
                continue
            sec = assigned.get((area, ci.get('id')))
            if sec is not None and ci.get('section') != sec:
                ci['section'] = sec
                cchanged = True
        have = set(c.get('title') for c in new_custom if isinstance(c, dict))
        for sec in follow_secs:
            fid = 'follow_%s' % {A: 'd1', B: 'd2', C: 'd3'}[sec]
            if any(isinstance(c, dict) and c.get('id') == fid for c in new_custom):
                continue
            new_custom.append({'id': fid, 'section': sec,
                               'title': FOLLOW_TITLE, 'desc': FOLLOW_DESC})
            cchanged = True
        if cchanged:
            writes['sdef_%s_customItems_%s' % (store, area)] = json.dumps(
                new_custom, ensure_ascii=False)

    # --- 検算: 見えている項目が1つも消えていないこと ---
    kv2 = dict(kv); kv2.update(writes)
    for area in AREAS:
        after = visible_items(kv2, store, area, builtin)
        after_ids = set(i['id'] for i in after)
        lost = before_ids[area] - after_ids
        if lost:
            raise SystemExit('::error::%s の %s で項目が消えます: %s'
                             % (store, area, '、'.join(sorted(lost))))
        if len(after_ids) != len(after):
            raise SystemExit('::error::%s の %s で項目が重複します' % (store, area))
        report.setdefault('added', []).extend(
            sorted(after_ids - before_ids[area]))

    return writes, report
