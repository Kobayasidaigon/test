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
# 題名は店舗ごとに言い回しが違うことがあるので、候補を並べてよい（上から順に探す）。
# ぼかした一致はしない。並べた通りの題名が無ければ止める。
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
    (B, ('ランニングマシンのカバー・ベルト・サイドの清掃',   # 萩野通の実際の題名
          'カバー・ベルト・サイドの清掃')),
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

# 現場が題名を変えても見失わないように、idでも引けるようにしておく。
# idは項目の身元そのもので、記録もidで繋がっているから、題名より確か。
# 題名で引けなかったときだけ、ここを見る（エリアも揃っていないと採らない。
# floor と machine の両方に mat があるため）。
ID_HINTS = {
    'フロアのモップ・掃除機掛け':           (('floor', 'sweep'),),
    '汗・水滴の拭き取り（重点箇所）':        (('floor', 'floor_sweat'),),
    '備品の整頓（定位置へ）':              (('floor', 'tidy'),),
    'アルコール台':                      (('floor', 'c1781246540349698'),),
    'マット・ラバー床の除菌清掃':           (('floor', 'mat'),),
    '鏡の清掃':                         (('floor', 'mirror'),),
    'ストレッチエリア':                   (('floor', 'c1780379683936973'),),
    'ランニングマシンの下の清掃':           (('machine', 'c1782283932435859'),),
    'マシンの足場':                      (('machine', 'c1781086515964550'),),
    'ランニングマシンの清掃・除菌':          (('machine', 'treadmill'),),
    'ランニングマシンのカバー・ベルト・サイドの清掃': (('machine', 'cardio_belt'),),
    'エアロバイクの清掃・除菌':             (('machine', 'bike'),),
    '階段マシンの清掃':                   (('machine', 'c1781085764206927'),),
    'ウェイトスタックマシンの清掃・除菌':      (('machine', 'strength'),),
    'グリップ・ハンドルの除菌':             (('machine', 'strength_grip'),),
    'ダンベル・バーベルの清掃・整頓':         (('machine', 'dumbbell'),),
    'ラック・ベンチの清掃':                (('machine', 'rack'),),
    'プレートの整頓（重量順）':             (('machine', 'plate'),),
    'マシン・ダンベル台の埃の清掃':          (('machine', 'c1780379236456485'),),
    '小物類の清掃・整頓':                 (('machine', 'small'),),
}

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


def hidden_items(kv, store, area, builtin):
    """その店舗で下ろしてある（画面に出ていない）項目。題名は編集を反映した方。

    計画に載っている項目が「この店舗には無い」のか「題名が違う」のかを
    見分けるために使う。下ろしてあるなら対象外、そうでないなら止める。
    """
    hidden = jload(defread(kv, store, 'hiddenItems_' + area), [])
    edits = jload(defread(kv, store, 'itemEdits_' + area), {})
    custom = jload(defread(kv, store, 'customItems_' + area), [])
    out = []
    for g in builtin.get(area, []):
        for it in g['items']:
            if it['id'] in hidden:
                ed = edits.get(it['id']) or {}
                out.append({'id': it['id'],
                            'title': ed.get('title') if ed.get('title') is not None else it['title']})
    for ci in custom:
        if isinstance(ci, dict) and ci.get('id') in hidden:
            out.append({'id': ci['id'], 'title': ci.get('title') or ''})
    return out


def build(kv, store, builtin):
    """書くもの（after）と、人が読むための報告を返す。"""
    writes = {}
    report = {'matched': [], 'unmatched_plan': [], 'left_alone': [], 'store': store}

    index = {}          # 正規化した題名 -> [(エリア, 項目), ...]
    by_id = {}          # (エリア, id) -> 項目（題名が変わっていても引けるように）
    hidden_ids = set()  # 下ろしてある (エリア, id)
    hidden_index = {}   # 正規化した題名 -> [(エリア, 項目id), ...]（下ろしてあるもの）
    before_ids = {}     # エリア -> 見えている項目idの集合
    items_by_area = {}
    for area in AREAS:
        items = visible_items(kv, store, area, builtin)
        items_by_area[area] = items
        before_ids[area] = set(i['id'] for i in items)
        for i in items:
            index.setdefault(norm(i['title']), []).append((area, i))
            by_id[(area, i['id'])] = i
        for i in hidden_items(kv, store, area, builtin):
            hidden_index.setdefault(norm(i['title']), []).append((area, i['id']))
            hidden_ids.add((area, i['id']))

    assigned = {}       # (エリア, id) -> 新しい区分
    report['ambiguous'] = []
    for sec, title in PLAN:
        names = (title,) if isinstance(title, str) else tuple(title)
        hits = []
        for nm in names:
            hits = index.get(norm(nm)) or []
            if hits:
                title = nm
                break
        if not hits:
            # 題名で引けないときは id で引く。現場が題名を変えても、
            # 項目そのものは同じ（記録も id で繋がっている）。
            for a, iid in ID_HINTS.get(names[0], ()):
                if (a, iid) in by_id:
                    hits = [(a, by_id[(a, iid)])]
                    report.setdefault('by_id', []).append(
                        (sec, names[0], '%s:%s' % (a, iid), by_id[(a, iid)]['title']))
                    break
        if not hits:
            # この店舗で「下ろしてある」項目なら、無くて当たり前。止めずに飛ばす。
            # 下ろしてもいないのに見つからないときだけ、題名の食い違いとして止める。
            off = []
            for nm in names:
                off += hidden_index.get(norm(nm)) or []
            for a, iid in ID_HINTS.get(names[0], ()):
                if (a, iid) in hidden_ids:
                    off.append((a, iid))
            if off:
                report.setdefault('not_here', []).append(
                    (sec, names[0], '、'.join('%s:%s' % x for x in off)))
            else:
                report['unmatched_plan'].append((sec, '／'.join(names)))
            continue
        if len(hits) > 1:
            # 同じ題名が2か所にある。どちらを指しているか決められないので黙って選ばない。
            report['ambiguous'].append(
                (sec, title, ['%s:%s' % (a, i['id']) for a, i in hits]))
            continue
        area, item = hits[0]
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


# ===== マシンメンテ（machine_mente）のホコリ取り・拭き上げを 月・木 に寄せる =====
# このエリアは weekCycle（月・木 / 火・金 / 水・土 の3枠）で回っているが、
# どの枠を開いても全項目が並ぶ。区分名に【月・木】を入れると、
# 曜日わけの仕組み（sectionDayGroup）が効いて 月・木 のときだけ出るようになる。
#
# 項目のidは変えない。区分名を書き換えるだけなので、記録は1件も動かない。
MENTE_AREA = 'machine_mente'
MENTE_RENAME = [
    ('ホコリ取り', 'ホコリ取り【月・木】'),
    ('拭き上げ（上はウエス・足元は雑巾）', '拭き上げ（上はウエス・足元は雑巾）【月・木】'),
]


def build_mente(kv, store):
    """ホコリ取り・拭き上げの区分名に【月・木】を付ける。無い店舗は何もしない。"""
    writes = {}
    report = {'store': store, 'moved': [], 'already': [], 'missing': []}

    custom = jload(defread(kv, store, 'customItems_' + MENTE_AREA), [])
    if not custom:
        report['missing'].append('このエリア自体が無い')
        return writes, report

    new_custom = json.loads(json.dumps(custom))
    changed = False
    for old, new in MENTE_RENAME:
        hit = [c for c in new_custom if isinstance(c, dict) and c.get('section') == old]
        done = [c for c in new_custom if isinstance(c, dict) and c.get('section') == new]
        if not hit and done:
            report['already'].append((new, len(done)))
            continue
        if not hit:
            report['missing'].append(old)
            continue
        for c in hit:
            c['section'] = new
            changed = True
        report['moved'].append((old, new, [c.get('id') for c in hit]))
    if changed:
        writes['sdef_%s_customItems_%s' % (store, MENTE_AREA)] = json.dumps(
            new_custom, ensure_ascii=False)

    # 区分の一覧にも、新しい名前で載せ替える（載っていた場合だけ）
    secs = jload(defread(kv, store, 'customSections_' + MENTE_AREA), [])
    new_secs = [dict(MENTE_RENAME).get(x, x) for x in secs]
    if new_secs != secs:
        writes['sdef_%s_customSections_%s' % (store, MENTE_AREA)] = json.dumps(
            new_secs, ensure_ascii=False)

    # --- 検算: 項目が1つも消えない・増えない ---
    before = [c.get('id') for c in custom if isinstance(c, dict)]
    after = [c.get('id') for c in new_custom if isinstance(c, dict)]
    if sorted(before) != sorted(after):
        raise SystemExit('::error::%s の %s で項目が変わります' % (store, MENTE_AREA))
    return writes, report


# ===== ホコリ取り・拭き上げを「マシンメンテ」から「マシン・器具」へ移す =====
# フロア・マシン清掃の行で見られるようにするため。
#
# 記録はエリアごとに分かれて保存されている（clean_<店舗>_<担当>_<エリア>_<日付>）。
# エリアをまたぐと、その項目の過去の記録は画面から見えなくなる（「記録なし」に戻る）。
# 記録そのものは消えない。idも変えないので、元に戻せば history も戻る。
#
# 元のエリアからは「下ろす」だけにして、定義は残しておく（戻せるように）。
MOVE_SECTIONS = [
    ('ホコリ取り【月・木】', 'ホコリ取り'),
    ('拭き上げ（上はウエス・足元は雑巾）【月・木】', '拭き上げ（上はウエス・足元は雑巾）'),
]
MOVE_FROM = 'machine_mente'
MOVE_TO = 'machine'
MOVE_AFTER = 'A 床・鏡まわり【月・木】'   # 並び順でこの区分の次に入れる（同じ 月・木 なので）


def build_move(kv, store):
    writes = {}
    report = {'store': store, 'moved': [], 'already': [], 'missing': []}

    src = jload(defread(kv, store, 'customItems_' + MOVE_FROM), [])
    if not src:
        report['missing'].append('%s が無い' % MOVE_FROM)
        return writes, report

    dst = jload(defread(kv, store, 'customItems_' + MOVE_TO), [])
    hidden_src = jload(defread(kv, store, 'hiddenItems_' + MOVE_FROM), [])
    dst_ids = set(c.get('id') for c in dst if isinstance(c, dict))

    new_dst = json.loads(json.dumps(dst))
    new_hidden = list(hidden_src)
    want_secs = []
    changed = False

    for new_name, old_name in MOVE_SECTIONS:
        hit = [c for c in src if isinstance(c, dict)
               and c.get('section') in (new_name, old_name)]
        if not hit:
            report['missing'].append(new_name)
            continue
        want_secs.append(new_name)
        for c in hit:
            iid = c.get('id')
            if iid in dst_ids:
                report['already'].append((new_name, iid))
            else:
                moved = json.loads(json.dumps(c))
                moved['section'] = new_name   # 移した先でも 月・木 のままにする
                new_dst.append(moved)
                dst_ids.add(iid)
                report['moved'].append((new_name, iid, c.get('title')))
                changed = True
            if iid not in new_hidden:
                new_hidden.append(iid)
                changed = True

    if not changed:
        return writes, report

    writes['sdef_%s_customItems_%s' % (store, MOVE_TO)] = json.dumps(new_dst, ensure_ascii=False)
    writes['sdef_%s_hiddenItems_%s' % (store, MOVE_FROM)] = json.dumps(new_hidden, ensure_ascii=False)

    # 移した先の区分の一覧と並び順
    secs = jload(defread(kv, store, 'customSections_' + MOVE_TO), [])
    new_secs = list(secs) + [s for s in want_secs if s not in secs]
    if new_secs != secs:
        writes['sdef_%s_customSections_%s' % (store, MOVE_TO)] = json.dumps(
            new_secs, ensure_ascii=False)

    order = jload(defread(kv, store, 'sectionOrder_' + MOVE_TO), [])
    new_order = [x for x in order if x not in want_secs]
    at = new_order.index(MOVE_AFTER) + 1 if MOVE_AFTER in new_order else len(new_order)
    new_order[at:at] = want_secs
    if new_order != order:
        writes['sdef_%s_sectionOrder_%s' % (store, MOVE_TO)] = json.dumps(
            new_order, ensure_ascii=False)

    # --- 検算 ---
    ids_dst = [c.get('id') for c in new_dst if isinstance(c, dict)]
    if len(ids_dst) != len(set(ids_dst)):
        raise SystemExit('::error::%s の %s で項目が重複します' % (store, MOVE_TO))
    lost = set(c.get('id') for c in dst if isinstance(c, dict)) - set(ids_dst)
    if lost:
        raise SystemExit('::error::%s の %s で項目が消えます: %s'
                         % (store, MOVE_TO, '、'.join(sorted(lost))))
    # 元のエリアの定義は消さない（下ろすだけ）
    if len(jload(defread(kv, store, 'customItems_' + MOVE_FROM), [])) != len(src):
        raise SystemExit('::error::%s の %s の定義を消そうとしています' % (store, MOVE_FROM))
    return writes, report
