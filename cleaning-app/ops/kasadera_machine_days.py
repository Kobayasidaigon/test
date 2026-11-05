# -*- coding: utf-8 -*-
"""笠寺のマシン清掃を、マシン1台ずつ曜日の枠に振り分ける（2026-11-05 の依頼）。

頼まれたこと:
  笠寺だけ。フリーウェイト・有酸素・ウェイトスタックの掃除を、
  曜日ごとに中番（昼番）の清掃へ振り分ける。マシンの一覧は手書きの紙の写真。

入れる場所:
  中番の「フロア・マシン清掃」が開く machine エリア。
  この店の machine はもう【月・木】【火・金】【水・土】で区分が分かれていて、
  区分名に曜日が入っていれば、その曜日だけ画面に出る（他の日は下の1行から開ける）。
  曜日ごとに種類を分ける（daigoさんの指定）: 月・木=フリーウェイト、火・金=有酸素、
  水・土=ウェイトスタック。区分を3つ足し、1台1行で入れる。

隠すもの（消さない。記録はそのまま残る）:
  新しい行と中身が重なる、今の大まかな行。やり方の説明は新しい行へ写す。

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ / periodicDone_ など）を触る
  - 笠寺以外の店舗
  - 同じidがもう入っていたら、その行は足さない（何度流しても増えない）
"""
import datetime
import json

STORE = '笠寺'
AREA = 'machine'

# 曜日の枠。区分名の【】の中はアプリの DAY_GROUPS と同じ書き方にする
DAYS = [('A', '月・木'), ('B', '火・金'), ('C', '水・土')]
KINDS = [('cardio', '有酸素'), ('free', 'フリーウェイト'), ('stack', 'ウェイトスタック')]

# ★ idは一度入れたら変えない（記録はこのidで結び付く）
PLAN = {
    # 水・土 = ウェイトスタック
    'C': {'stack': [
        ('kmd_a_cable', 'ケーブル'), ('kmd_a_tricep', 'トライセプスプレス'),
        ('kmd_a_bicep', 'バイセプスカール'), ('kmd_a_latrow', 'ラットプル・シーテッドロー'),
        ('kmd_a_pecfly', 'ペックフライ'), ('kmd_a_shoulder', 'ショルダープレス'),
        ('kmd_b_chest', 'チェストプレス'), ('kmd_b_lateral', 'ラテラルレイズ'),
        ('kmd_b_seatedrow', 'シーテッドロー'), ('kmd_b_chindip', 'チン・ディップス'),
        ('kmd_b_hip', 'ヒップアダクター・アブダクター'), ('kmd_b_abcrunch', 'アブドミナルクランチ'),
        ('kmd_c_backext', 'バックエクステンション'), ('kmd_c_rotary', 'ロータリートルソー'),
        ('kmd_c_legpress', 'レッグプレス'), ('kmd_c_legext', 'レッグエクステンション'),
        ('kmd_c_legcurl', 'シーテッドレッグカール')]},
    # 火・金 = 有酸素（今の「B 有酸素・マシン【火・金】」と同じ曜日）
    'B': {'cardio': [
        ('kmd_a_tm14', 'トレッドミル 1〜4番'), ('kmd_b_tm58', 'トレッドミル 5〜8番'),
        ('kmd_b_stairs', '階段'), ('kmd_c_cross', 'クロストレーナー（2台）'),
        ('kmd_c_recumbent', 'リカンベントバイク（2台）'), ('kmd_c_aero', 'エアロバイク（2台）')]},
    # 月・木 = フリーウェイト
    'A': {'free': [
        ('kmd_a_lowrow', 'ローロー'), ('kmd_a_latpull', 'ラットプルダウン'),
        ('kmd_a_widechest', 'ワイドチェストプレス'), ('kmd_a_declinechest', 'デクラインチェストプレス'),
        ('kmd_b_legpress', 'レッグプレス'), ('kmd_b_hack', 'ハックスクワット'),
        ('kmd_b_vertbench', 'バーティカルベンチプレス'), ('kmd_b_shoulder', 'ショルダープレス'),
        ('kmd_c_powerrack', 'パワーラック（2台）'), ('kmd_c_smith', 'スミスマシン'),
        ('kmd_c_preacher', 'プリチャー台'), ('kmd_c_bench', 'ベンチ')]},
}

# 隠す行（新しい行と中身が重なるもの）
HIDE = ['treadmill', 'cardio_belt', 'bike', 'c1781085764206927',   # 階段マシンの清掃
        'strength', 'strength_grip', 'rack']

# 組み込み項目の元の説明（itemEdits に無いときに使う。アプリの初期値と同じ）
BUILTIN_METHOD = {
    'treadmill': '①操作パネル・グリップ・手すりを除菌クロスで拭く\n②ベルト表面の汗・ホコリを拭く\n③ベルト両脇・隙間のホコリを除去\n④作動・異音を確認',
    'cardio_belt': '①ベルト表面の汗・ホコリを拭く\n②隙間は細ブラシ・掃除機で除去',
    'bike': '①サドル・ハンドル・操作部を除菌クロスで拭く\n②ペダル・フレームの汗・汚れを拭く\n③作動・異音・ペダルの緩みを確認',
    'strength': '①シート・パッド・背当てを除菌クロスで拭く',
    'strength_grip': '①グリップ・ハンドルを重点的に除菌',
    'rack': '①シート・フレームを拭き上げ\n②汗・粉を除去',
}


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def defread(kv, store, key):
    """店舗ごとの定義。無ければ共通を見る（アプリの defRead と同じ順）。"""
    v = kv.get('sdef_%s_%s' % (store, key))
    if v is None:
        return kv.get(key), 'きょうつう'
    return v, 'みせべつ'


def today_jst():
    t = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    return t.strftime('%Y-%m-%d')


def section_name(day_letter, kind_label):
    return '%s %s【%s】' % (day_letter, kind_label, dict(DAYS)[day_letter])


def _methods(kv, custom):
    """今の行の説明文から、新しい行に写す説明を作る。"""
    edits = jload(defread(kv, STORE, 'itemEdits_' + AREA)[0], {})

    def m(iid):
        ed = edits.get(iid) or {}
        if ed.get('method') is not None:
            return ed['method']
        return BUILTIN_METHOD.get(iid, '')

    stairs = ''
    for c in custom:
        if isinstance(c, dict) and c.get('id') == 'c1781085764206927':
            stairs = c.get('method') or ''
    tm = m('treadmill')
    belt = m('cardio_belt')
    tread = tm + ('\n' + belt if belt else '')
    # 番号を振り直す（①②…が2回出ないように）
    lines = [ln.lstrip('①②③④⑤⑥⑦⑧⑨') for ln in tread.split('\n') if ln.strip()]
    nums = '①②③④⑤⑥⑦⑧⑨'
    tread = '\n'.join(nums[i] + ln for i, ln in enumerate(lines[:9]))
    stack = m('strength')
    grip = m('strength_grip')
    if grip:
        lines = [ln.lstrip('①②③④⑤⑥⑦⑧⑨') for ln in (stack + '\n' + grip).split('\n') if ln.strip()]
        stack = '\n'.join(nums[i] + ln for i, ln in enumerate(lines[:9]))
    free = m('rack')
    lines = [ln.lstrip('①②③④⑤⑥⑦⑧⑨') for ln in (free + '\n' + '①グリップ・ハンドルを重点的に除菌').split('\n') if ln.strip()]
    free = '\n'.join(nums[i] + ln for i, ln in enumerate(lines[:9]))
    return {'tread': tread, 'stairs': stairs, 'bike': m('bike'), 'stack': stack, 'free': free}


def _method_for(iid, kind, meth):
    if kind == 'cardio':
        if 'tm' in iid.split('_')[-1]:
            return meth['tread']
        if iid.endswith('stairs'):
            return meth['stairs']
        return meth['bike']
    return meth['free'] if kind == 'free' else meth['stack']


def build_machine_days(kv, added_at=None):
    """書き換える鍵と、何をするかの報告を返す。読むだけで、ここでは書かない。"""
    added_at = added_at or today_jst()
    writes = {}
    report = {'added': [], 'same': [], 'hidden': [], 'hidden_same': [], 'sections': [],
              'order': None}

    # ---- 項目 ----
    raw, src = defread(kv, STORE, 'customItems_' + AREA)
    if src != 'みせべつ':
        raise SystemExit('::error::%s の machine が共通の定義です。止めます' % STORE)
    custom = jload(raw, None)
    if not isinstance(custom, list):
        raise SystemExit('::error::%s の machine の項目一覧が読めません' % STORE)
    have = {c.get('id') for c in custom if isinstance(c, dict)}
    meth = _methods(kv, custom)
    out = list(custom)
    for d, _ in DAYS:
        for kind, klabel in KINDS:
            sec = section_name(d, klabel)
            for iid, title in PLAN[d].get(kind, []):
                if iid in have:
                    report['same'].append((sec, iid, title))
                    continue
                row = {'id': iid, 'section': sec, 'title': title, 'desc': '',
                       'method': _method_for(iid, kind, meth), 'addedAt': added_at}
                out.append(row)
                report['added'].append((sec, iid, title))
    if out[:len(custom)] != custom:
        raise SystemExit('::error::いまある項目が変わります。止めます')
    if len(out) != len(custom):
        writes['sdef_%s_customItems_%s' % (STORE, AREA)] = json.dumps(out, ensure_ascii=False)

    # ---- 区分 ----
    secs_raw, ssrc = defread(kv, STORE, 'customSections_' + AREA)
    secs = jload(secs_raw, [])
    if ssrc != 'みせべつ' or not isinstance(secs, list):
        raise SystemExit('::error::%s の machine の区分一覧が読めません' % STORE)
    new_secs = [section_name(d, k) for d, _ in DAYS for kk, k in KINDS if kk in PLAN[d]]
    secs_out = list(secs) + [s for s in new_secs if s not in secs]
    if secs_out != secs:
        writes['sdef_%s_customSections_%s' % (STORE, AREA)] = json.dumps(secs_out, ensure_ascii=False)
        report['sections'] = [s for s in new_secs if s not in secs]

    # ---- 並び順（指定があるときだけ。同じ曜日の今の区分のすぐ後ろへ） ----
    ord_raw, osrc = defread(kv, STORE, 'sectionOrder_' + AREA)
    order = jload(ord_raw, [])
    if osrc == 'みせべつ' and isinstance(order, list) and order:
        o2 = list(order)
        for d, dname in DAYS:
            mine = [section_name(d, k) for kk, k in KINDS if kk in PLAN[d] and section_name(d, k) not in o2]
            if not mine:
                continue
            at = None
            for n, s in enumerate(o2):
                if ('【%s】' % dname) in s:
                    at = n + 1
            if at is None:
                o2.extend(mine)
            else:
                o2[at:at] = mine
        if [s for s in o2 if s in order] != order:
            raise SystemExit('::error::今の区分の並びが変わります。止めます')
        if o2 != order:
            writes['sdef_%s_sectionOrder_%s' % (STORE, AREA)] = json.dumps(o2, ensure_ascii=False)
        report['order'] = o2

    # ---- 隠す ----
    hraw, hsrc = defread(kv, STORE, 'hiddenItems_' + AREA)
    hidden = jload(hraw, [])
    if hsrc != 'みせべつ' or not isinstance(hidden, list):
        raise SystemExit('::error::%s の machine の隠す一覧が読めません' % STORE)
    h_out = list(hidden)
    for iid in HIDE:
        if iid in h_out:
            report['hidden_same'].append(iid)
        else:
            h_out.append(iid)
            report['hidden'].append(iid)
    if h_out != hidden:
        writes['sdef_%s_hiddenItems_%s' % (STORE, AREA)] = json.dumps(h_out, ensure_ascii=False)

    return writes, report
