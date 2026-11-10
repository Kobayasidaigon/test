# -*- coding: utf-8 -*-
"""笠寺のプロテインを朝番から中番（昼番）へ移す（2026-11-10 の依頼）。

頼まれたこと:
  「笠寺のプロテインを昼番に移してください」

今の形（2026-11-05 時点で読んだもの）:
  笠寺の朝番のやることリストに
    routine_asa_v3_08 「プロテインサーバーまわりの清掃・補充」 link=protein_kasadera
  がある。プロテインのタブで付けたチェックは、この行がある時間帯の記録になる。

やること:
  - 朝番（sdef_笠寺_customItems_routine_asa）から、link=protein_kasadera の行を抜く
  - 中番（sdef_笠寺_customItems_routine_hiru）の「水素水サーバー本体の拭き上げ」
    （routine_hiru_v3_06）のすぐ下に、同じ題・説明・link の行を入れる
    id は hiru_protein、addedAt に入れた日を付ける（7日間「新」が出る）
  - 分担（shares_routine_asa / shares_routine_hiru）に protein_kasadera が
    入っていたら止める（人が決める）

やらないこと:
  - プロテインのタブの項目（customItems_protein_kasadera）・区分・曜日わけ
  - 枇杷島・萩野通
  - 記録（clean_ など）。今までの朝番の記録はそのまま残る
  - 同じ行がもう中番にあって朝番に無ければ、何も書かない（何度流しても同じ）
"""
import json

STORE = '笠寺'
LINK = 'protein_kasadera'
ASA_KEY = 'customItems_routine_asa'
HIRU_KEY = 'customItems_routine_hiru'
NEW_ID = 'hiru_protein'                 # ★ 一度入れたら変えない
ANCHOR_ID = 'routine_hiru_v3_06'        # 水素水サーバー本体の拭き上げ。この直後に入れる


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def links(row):
    return [x.strip() for x in str(row.get('link') or '').split(',') if x.strip()]


def read_list(kv, key):
    k = 'sdef_%s_%s' % (STORE, key)
    if kv.get(k) is None:
        raise SystemExit('::error::%s がありません（共通のままなら人が決める）' % k)
    rows = jload(kv[k], None)
    if not isinstance(rows, list) or not rows:
        raise SystemExit('::error::%s が読めません' % k)
    return k, rows


def build_move(kv, today):
    writes, report = {}, {}

    for slot in ('routine_asa', 'routine_hiru'):
        sh = jload(kv.get('sdef_%s_shares_%s' % (STORE, slot)), [])
        if isinstance(sh, list) and any(LINK in (s.get('areas') or [])
                                         for s in sh if isinstance(s, dict)):
            raise SystemExit('::error::%s の分担に %s が入っています。人が決めてください'
                             % (slot, LINK))

    ak, asa = read_list(kv, ASA_KEY)
    hk, hiru = read_list(kv, HIRU_KEY)

    in_asa = [r for r in asa if isinstance(r, dict) and LINK in links(r)]
    in_hiru = [r for r in hiru if isinstance(r, dict) and LINK in links(r)]
    report['asa_before'] = [(r.get('id'), r.get('title')) for r in in_asa]
    report['hiru_before'] = [(r.get('id'), r.get('title')) for r in in_hiru]

    if not in_asa and in_hiru:
        report['same'] = True
        return writes, report
    if len(in_asa) != 1:
        raise SystemExit('::error::朝番のプロテインの行が %d 行です（1行のはず）' % len(in_asa))
    if in_hiru:
        raise SystemExit('::error::中番にもうプロテインの行があります')
    src = in_asa[0]
    if links(src) != [LINK]:
        raise SystemExit('::error::朝番の行がプロテイン以外にもつながっています: %r' % src.get('link'))
    if any(isinstance(r, dict) and r.get('id') == NEW_ID for r in hiru):
        raise SystemExit('::error::中番に %s がもうあります' % NEW_ID)

    # 朝番から抜く
    new_asa = [r for r in asa if r is not src]
    # 中番へ入れる
    at = next((i for i, r in enumerate(hiru)
               if isinstance(r, dict) and r.get('id') == ANCHOR_ID), None)
    if at is None:
        raise SystemExit('::error::中番に %s（目印の行）がありません' % ANCHOR_ID)
    row = {k: v for k, v in src.items() if k not in ('id', 'addedAt')}
    row['id'] = NEW_ID
    row['section'] = hiru[at].get('section') or src.get('section')
    row['addedAt'] = today
    new_hiru = list(hiru[:at + 1]) + [row] + list(hiru[at + 1:])

    # ---- 念のための確かめ ----
    if len(new_asa) != len(asa) - 1 or len(new_hiru) != len(hiru) + 1:
        raise SystemExit('::error::行の数がおかしい')
    if [r for r in new_hiru if r is not row] != hiru:
        raise SystemExit('::error::中番のいまある行が変わります')

    writes[ak] = json.dumps(new_asa, ensure_ascii=False)
    writes[hk] = json.dumps(new_hiru, ensure_ascii=False)
    report['moved'] = {'from': src, 'to': row, 'after': (hiru[at].get('id'), hiru[at].get('title')),
                       'asa': (len(asa), len(new_asa)), 'hiru': (len(hiru), len(new_hiru))}
    report['hiru_after'] = [(r.get('id'), r.get('title')) for r in new_hiru if isinstance(r, dict)]
    return writes, report
