# -*- coding: utf-8 -*-
"""ゴミ箱の項目を2つ足す（2026-10-31 の依頼）。

頼まれたこと:
  3店舗の【遅番】に
    ・ペットボトルのゴミ箱確認
  笠寺・枇杷島の【プロテイン】に
    ・プロテイン用ゴミ箱の清掃

入れる場所:
  遅番は「ゴミ回収・袋取り付け」（routine_ban_v3_17）のすぐ下。3店舗ともある。
  プロテインは PROTEIN_SECTION の区分の最後。

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ / periodicDone_ など）を触る
  - 同じidがもう入っていたら、何も書かない（何度流しても増えない）
"""
import json

# ★ idは一度入れたら変えない（記録はこのidで結び付く）
BAN_STORES = ['笠寺', '枇杷島', '萩野通']
BAN_KEY = 'customItems_routine_ban'
BAN_ITEM = {'id': 'ban_petbottle_check', 'title': 'ペットボトルのゴミ箱確認'}
BAN_ANCHOR_ID = 'routine_ban_v3_17'      # ゴミ回収・袋取り付け。この直後に入れる

PROTEIN_STORES = ['笠寺', '枇杷島']
PROTEIN_KEY = 'customItems_protein_kasadera'
PROTEIN_ITEM = {'id': 'pk_trashbin', 'title': 'プロテイン用ゴミ箱の清掃'}
# 毎日出る区分。水・土だけにするなら '衛生管理【水・土】' にする
PROTEIN_SECTION = 'サーバー本体'


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


def _insert(kv, store, key, item, where_fn, label, report, writes):
    raw, src = defread(kv, store, key)
    items = jload(raw, None)
    if not isinstance(items, list) or not items:
        raise SystemExit('::error::%s / %s の項目一覧が読めません' % (store, label))
    if src != 'みせべつ':
        raise SystemExit('::error::%s / %s の項目一覧が共通です。'
                         '店舗別に分けるかどうかは人が決めてください' % (store, label))
    have = {c.get('id'): c for c in items if isinstance(c, dict)}
    if item['id'] in have:
        report['same'].append((store, label, item['id'], have[item['id']].get('title')))
        return
    at, sec = where_fn(items)
    row = {'id': item['id'], 'section': sec, 'title': item['title'], 'desc': ''}
    out = list(items[:at]) + [row] + list(items[at:])
    before_ids = [c.get('id') for c in items if isinstance(c, dict)]
    kept = [c.get('id') for c in out if isinstance(c, dict) and c.get('id') != item['id']]
    if kept != before_ids:
        raise SystemExit('::error::%s / %s でいまある項目の並びが変わります。止めます'
                         % (store, label))
    k = 'sdef_%s_%s' % (store, key)
    if k in writes:
        raise SystemExit('::error::同じ鍵に2回書こうとしています: %s' % k)
    writes[k] = json.dumps(out, ensure_ascii=False)
    report['added'].append((store, label, sec, at, item['id'], item['title'],
                            len(items), len(out)))


def _after_anchor(items):
    for n, c in enumerate(items):
        if isinstance(c, dict) and c.get('id') == BAN_ANCHOR_ID:
            return n + 1, c.get('section')
    raise SystemExit('::error::遅番に「ゴミ回収・袋取り付け」（%s）がありません。'
                     '入れる場所を決め直してください' % BAN_ANCHOR_ID)


def _end_of_section(items):
    last = -1
    for n, c in enumerate(items):
        if isinstance(c, dict) and c.get('section') == PROTEIN_SECTION:
            last = n
    if last < 0:
        raise SystemExit('::error::プロテインに「%s」の区分がありません' % PROTEIN_SECTION)
    return last + 1, PROTEIN_SECTION


def build_trash(kv):
    """書き換える鍵と、何をするかの報告を返す。読むだけで、ここでは書かない。"""
    writes = {}
    report = {'added': [], 'same': []}
    for store in BAN_STORES:
        _insert(kv, store, BAN_KEY, BAN_ITEM, _after_anchor, '遅番', report, writes)
    for store in PROTEIN_STORES:
        _insert(kv, store, PROTEIN_KEY, PROTEIN_ITEM, _end_of_section, 'プロテイン',
                report, writes)
    return writes, report
