# -*- coding: utf-8 -*-
"""笠寺・枇杷島の中番に「ジムエリア マシンメンテ」の行を足す。

分かったこと（調査済み）:
  マシンメンテのエリアと項目（注油13件）は、3店舗ともすでに入っている。
  足りないのは「やることリストからの入口」で、
  routine_hiru_mmente は萩野通の中番にしか無い。
  そのため笠寺・枇杷島は直近28日の記録が0回だった（誰も開いていない）。

やること:
  萩野通の中番にある routine_hiru_mmente の行を、そのまま複製して
  笠寺・枇杷島の中番に入れる。入れる場所は「フロア・マシン清掃」の直後
  （萩野通と同じ並び）。

なぜ複製するか:
  行の形（link の書き方・説明文・その他の項目）を推測で作ると、
  萩野通と微妙に違うものができる。見本をそのまま使えばズレようがない。
  section だけは、入れる先の店舗で使われている区分に合わせる。

やらないこと:
  - いまある項目を消す・idを変える・並びを入れ替える
  - 記録（clean_ / periodicDone_ など）を触る
  - マシンメンテの項目そのもの（注油13件）には触らない
  - すでに入っていたら何も書かない（何度流しても増えない）
"""
import json

SRC_STORE = '萩野通'          # 見本を取る店舗
DST_STORES = ['笠寺', '枇杷島']
SLOT = 'routine_hiru'         # 中番
ITEM_ID = 'routine_hiru_mmente'
AFTER_ID = 'routine_hiru_floor_machine'   # この直後に入れる（萩野通と同じ）
ANCHOR_TEXT = '在庫管理システム'           # 上が無いときの逃げ場（この直前）
NEED_AREA = 'machine_mente'   # リンク先。ここが空の店舗には入れない


def defread(kv, store, key):
    """店舗ごとの定義。無ければ共通を見る（アプリの defRead と同じ順）。"""
    v = kv.get('sdef_%s_%s' % (store, key))
    if v is None:
        return kv.get(key), 'きょうつう'
    return v, 'みせべつ'


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        return json.loads(v)
    except Exception:
        return fallback


def _items(kv, store, key):
    raw, src = defread(kv, store, key)
    return jload(raw, None), src


def _section_for(items, anchor_idx, where):
    """入れる区分。1つしか無ければそれ。複数あれば目印の行に合わせる。"""
    secs = []
    for c in items:
        if isinstance(c, dict) and c.get('section') and c['section'] not in secs:
            secs.append(c['section'])
    if len(secs) == 1:
        return secs[0]
    if anchor_idx is not None and 0 <= anchor_idx < len(items):
        s = items[anchor_idx].get('section')
        if s:
            return s
    raise SystemExit('::error::%s の区分が決まりません（%s）'
                     % (where, '、'.join(secs) or 'なし'))


def build_mente(kv):
    writes = {}
    report = {'stores': [], 'added': [], 'same': [], 'differs': []}

    # ---- 見本を取る ----
    src_items, src_kind = _items(kv, SRC_STORE, 'customItems_' + SLOT)
    if not isinstance(src_items, list):
        raise SystemExit('::error::%s の中番の一覧が読めません' % SRC_STORE)
    model = None
    for c in src_items:
        if isinstance(c, dict) and c.get('id') == ITEM_ID:
            model = c
            break
    if model is None:
        raise SystemExit('::error::%s の中番に %s がありません。'
                         '見本が取れないので止めます' % (SRC_STORE, ITEM_ID))
    if not str(model.get('link') or '').strip():
        raise SystemExit('::error::見本の行にリンク先がありません。'
                         '入れても何も開かないので止めます')
    report['model'] = {k: model.get(k) for k in ('id', 'title', 'link', 'desc')}

    for store in DST_STORES:
        where = '%s / 中番' % store

        # ---- リンク先のエリアが、その店舗で使える状態か ----
        areas = jload(defread(kv, store, 'customAreas')[0], []) or []
        has_area = any(isinstance(a, dict) and a.get('key') == NEED_AREA for a in areas)
        mente_items = jload(defread(kv, store, 'customItems_' + NEED_AREA)[0], []) or []
        mente_hidden = jload(defread(kv, store, 'hiddenItems_' + NEED_AREA)[0], []) or []
        visible = [c for c in mente_items
                   if isinstance(c, dict) and c.get('id') not in mente_hidden]
        if not has_area:
            raise SystemExit('::error::%s に %s のエリアがありません。'
                             '入れても開く先が無いので止めます' % (store, NEED_AREA))
        if not visible:
            raise SystemExit('::error::%s の %s に見える項目が1件もありません。'
                             '空の画面に案内することになるので止めます' % (store, NEED_AREA))

        # ---- 中番の一覧 ----
        items, src = _items(kv, store, 'customItems_' + SLOT)
        if not isinstance(items, list):
            raise SystemExit('::error::%s の項目一覧が読めません' % where)
        if not items:
            raise SystemExit('::error::%s に項目がありません。'
                             '思っている所と違う可能性があるので止めます' % where)
        if src != 'みせべつ':
            raise SystemExit('::error::%s の項目一覧が共通です。'
                             '店舗別に分けるかは人が決めてください' % where)

        before_ids = [c.get('id') for c in items if isinstance(c, dict)]

        # すでに入っていたら触らない
        cur = None
        for c in items:
            if isinstance(c, dict) and c.get('id') == ITEM_ID:
                cur = c
                break
        if cur is not None:
            if str(cur.get('title') or '') == str(model.get('title') or ''):
                report['same'].append((store, ITEM_ID, str(cur.get('title') or '')))
            else:
                report['differs'].append((store, ITEM_ID, str(cur.get('title') or ''),
                                          str(model.get('title') or '')))
            report['stores'].append((store, src, None, len(items), len(items), 'すでにある'))
            continue

        # ---- 入れる場所 ----
        at, how = None, ''
        for n, c in enumerate(items):
            if isinstance(c, dict) and c.get('id') == AFTER_ID:
                at, how = n + 1, '「%s」の直後' % str(c.get('title') or AFTER_ID)
                break
        if at is None:
            for n, c in enumerate(items):
                if isinstance(c, dict) and ANCHOR_TEXT in str(c.get('title') or ''):
                    at, how = n, '「%s」の直前' % str(c.get('title') or '')
                    break
        if at is None:
            at, how = len(items), '末尾'

        sec = _section_for(items, at - 1 if at > 0 else None, where)
        row = dict(model)          # 見本をそのまま使う
        row['section'] = sec       # 区分だけ入れる先に合わせる

        out = list(items[:at]) + [row] + list(items[at:])
        kept = [c.get('id') for c in out
                if isinstance(c, dict) and c.get('id') != ITEM_ID]
        if kept != before_ids:
            raise SystemExit('::error::%s でいまある項目の並びが変わります。止めます' % where)

        writes['sdef_%s_customItems_%s' % (store, SLOT)] = json.dumps(out, ensure_ascii=False)
        report['added'].append((store, sec, how, str(model.get('title') or ''), len(visible)))
        report['stores'].append((store, src, how, len(items), len(out), '足す'))

    return writes, report
