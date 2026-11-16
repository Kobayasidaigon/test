# -*- coding: utf-8 -*-
"""萩野通のマシン清掃を、笠寺と同じ形で1台1行・曜日の枠に振り分ける（2026-11-16 の依頼）。

daigoさんのマシン名一覧（萩野通）を、笠寺（ops/kasadera_machine_days.py, 2026-11-05）と同じ形で入れる:
  中番の「フロア・マシン清掃」が開く machine エリアに、区分を3つ足す。
  月・木=フリーウェイト、火・金=有酸素、水・土=ウェイトスタック。やり方の文は笠寺と同じ。

隠すもの（消さない。記録は残る）: 新しい行と中身が重なる、今の大まかな行（HIDE）。
やらないこと: いまある項目を消す・idを変える・並べ替える／記録を触る／萩野通以外の店舗。
同じidがもう入っていたら足さない（何度流しても増えない）。
"""
import datetime
import json

STORE = '萩野通'
AREA = 'machine'

DAYS = [('A', '月・木'), ('B', '火・金'), ('C', '水・土')]
KINDS = [('free', 'フリーウェイト'), ('cardio', '有酸素'), ('stack', 'ウェイトスタック')]

# やり方（笠寺 2026-11-05 の行と同じ文）
M_FREE = '①シート・フレームを拭き上げ\n②汗・粉を除去\n③グリップ・ハンドルを重点的に除菌'
M_STACK = '①シート・パッド・背当て・小物置き・本体を除菌クロスで拭く\n②マシン本体やワイヤーについた埃をとる\n③グリップ・ハンドルを重点的に除菌'
M_TREAD = '①操作パネル・グリップ・手すりを除菌クロスで拭く\n②カバー、ベルト表面、本体サイドの汗・ホコリを拭く\n③隙間は細ブラシ・掃除機で除去'
M_BIKE = '①サドル・ハンドル・操作部・ドリンクホルダーを除菌クロスで拭く\n②ペダル・フレームの汗・汚れを拭く\n③作動・異音・ペダルの緩みを確認'
M_STAIRS = '①埃とりや掃除機で埃の除去\n②汗とびは拭きあげ\n③ステップはブラシや雑巾で清掃\n④異音動きが悪くないか動作確認'

# ★ idは一度入れたら変えない（記録はこのidで結び付く）。笠寺の kmd_ と分けて hmd_。
PLAN = {
    'A': ('free', M_FREE, [
        ('hmd_f_seatedrow', 'シーテッドロー'), ('hmd_f_latpull', 'ラットプルダウン'),
        ('hmd_f_vertbench', 'バーティカルベンチプレス'), ('hmd_f_incline', 'インクラインプレス'),
        ('hmd_f_legpress', 'レッグプレス'), ('hmd_f_hack', 'ハックスクワット'),
        ('hmd_f_bench', 'ベンチプレス'), ('hmd_f_shoulder', 'ショルダープレス'),
        ('hmd_f_powerrack', 'パワーラック（2台）'), ('hmd_f_smith', 'スミスマシン'),
        ('hmd_f_preacher', 'プリチャー台'), ('hmd_f_flatbench', 'ベンチ')]),
    'B': ('cardio', None, [
        ('hmd_c_tm14', 'トレッドミル 1〜4番', M_TREAD), ('hmd_c_tm58', 'トレッドミル 5〜8番', M_TREAD),
        ('hmd_c_stairs', '階段', M_STAIRS), ('hmd_c_cross', 'クロストレーナー', M_BIKE),
        ('hmd_c_recumbent', 'リカンベントバイク', M_BIKE), ('hmd_c_aero', 'エアロバイク', M_BIKE)]),
    'C': ('stack', M_STACK, [
        ('hmd_s_cable', 'ケーブル'), ('hmd_s_tricep', 'トライセプスプレス'),
        ('hmd_s_bicep', 'バイセプスカール'), ('hmd_s_latrow', 'ラットプル・シーテッドロー'),
        ('hmd_s_pecfly', 'ペックフライ'), ('hmd_s_shoulder', 'ショルダープレス'),
        ('hmd_s_chest', 'チェストプレス'), ('hmd_s_lateral', 'ラテラルレイズ'),
        ('hmd_s_seatedrow', 'シーテッドロー'), ('hmd_s_chindip', 'チン・ディップス'),
        ('hmd_s_adductor', 'ヒップアダクター'), ('hmd_s_abductor', 'ヒップアブダクター'),
        ('hmd_s_abcrunch', 'アブドミナルクランチ'), ('hmd_s_backext', 'バックエクステンション'),
        ('hmd_s_rotary', 'ロータリートルソー'), ('hmd_s_legpress', 'レッグプレス'),
        ('hmd_s_legext', 'レッグエクステンション'), ('hmd_s_legcurl', 'シーテッドレッグカール')]),
}

# 隠す行（新しい行と重なるもの。笠寺で隠したのと同じ考え方）
HIDE = ['treadmill', 'cardio_belt', 'bike', 'c1781085764206927',  # 階段マシンの清掃
        'strength', 'rack']


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def today_jst():
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y-%m-%d')


def section_name(d, klabel):
    return '%s %s【%s】' % (d, klabel, dict(DAYS)[d])


def build(kv, added_at=None, hide=True):
    added_at = added_at or today_jst()
    writes, rep = {}, {'added': [], 'same': [], 'sections': [], 'order': None, 'hidden': [], 'hidden_same': []}
    key = lambda kd: 'sdef_%s_%s%s' % (STORE, kd, AREA)
    kl = dict(KINDS)

    custom = jload(kv.get(key('customItems_')), None)
    if not isinstance(custom, list):
        raise SystemExit('::error::萩野通の machine の項目一覧（店舗別）が読めません。止めます')
    have = {c.get('id') for c in custom if isinstance(c, dict)}
    out = list(custom)
    for d, _ in DAYS:
        kind, meth, rows = PLAN[d]
        sec = section_name(d, kl[kind])
        for r in rows:
            iid, title = r[0], r[1]
            if iid in have:
                rep['same'].append((sec, iid, title)); continue
            out.append({'id': iid, 'section': sec, 'title': title, 'desc': '',
                        'method': r[2] if len(r) > 2 else meth, 'addedAt': added_at})
            rep['added'].append((sec, iid, title))
    if out[:len(custom)] != custom:
        raise SystemExit('::error::いまある項目が変わります。止めます')
    if len(out) != len(custom):
        writes[key('customItems_')] = json.dumps(out, ensure_ascii=False)

    secs = jload(kv.get(key('customSections_')), None)
    if not isinstance(secs, list):
        raise SystemExit('::error::萩野通の machine の区分一覧が読めません')
    new_secs = [section_name(d, kl[PLAN[d][0]]) for d, _ in DAYS]
    secs_out = list(secs) + [s for s in new_secs if s not in secs]
    if secs_out != secs:
        writes[key('customSections_')] = json.dumps(secs_out, ensure_ascii=False)
        rep['sections'] = [s for s in new_secs if s not in secs]

    order = jload(kv.get(key('sectionOrder_')), [])
    if isinstance(order, list) and order:
        o2 = list(order)
        for d, dname in DAYS:
            s = section_name(d, kl[PLAN[d][0]])
            if s in o2:
                continue
            at = None
            for n, x in enumerate(o2):
                if ('【%s】' % dname) in x:
                    at = n + 1
            if at is None:
                o2.append(s)
            else:
                o2.insert(at, s)
        if [s for s in o2 if s in order] != order:
            raise SystemExit('::error::今の区分の並びが変わります。止めます')
        if o2 != order:
            writes[key('sectionOrder_')] = json.dumps(o2, ensure_ascii=False)
        rep['order'] = o2

    if hide:
        hidden = jload(kv.get(key('hiddenItems_')), None)
        if not isinstance(hidden, list):
            raise SystemExit('::error::萩野通の machine の隠す一覧が読めません')
        h = list(hidden)
        for iid in HIDE:
            if iid in h:
                rep['hidden_same'].append(iid)
            else:
                h.append(iid); rep['hidden'].append(iid)
        if h != hidden:
            writes[key('hiddenItems_')] = json.dumps(h, ensure_ascii=False)
    return writes, rep
