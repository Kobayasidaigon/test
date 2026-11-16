# -*- coding: utf-8 -*-
"""3店舗の遅番に「インスタのメンションストーリー投稿」を足す（2026-11-16 の依頼）。

daigoさん: 「遅番のやることに、インスタのメンションストーリー投稿を追加して欲しいよ 3店舗とも」
入れる場所: ANCHOR_ID の直後（None のあいだは下見で一覧を出すだけ。書かない）。
毎日出るように、曜日の入っていない区分（【月・木】などが無い区分）に入れる。
やらないこと: いまある項目を消す・idを変える・並びを入れ替える、記録（clean_ など）を触る。
同じidがもう入っていたら何も書かない（何度流しても増えない）。
"""
import json, re

STORES = ['笠寺', '枇杷島', '萩野通']
KEY = 'customItems_routine_ban'
ITEM = {'id': 'ban_insta_story', 'title': 'インスタのメンションストーリー投稿',
        'desc': '', 'addedAt': '2026-11-16'}
ANCHOR_ID = 'ban_mop_clean'   # モップの掃除の直後（3店舗とも、在庫管理・施錠・閉め作業の手前）

DAYS = re.compile(r'【[^】]*[月火水木金土日][^】]*】')


def listing(kv):
    out = {}
    for s in STORES:
        k = 'sdef_%s_%s' % (s, KEY)
        items = json.loads(kv[k]) if isinstance(kv.get(k), str) else None
        hid = kv.get('sdef_%s_hiddenItems_routine_ban' % s)
        out[s] = {'src': 'みせべつ' if items is not None else 'きょうつう',
                  'hidden': hid,
                  'items': [(n, c.get('id'), c.get('section'), c.get('title'),
                             bool(c.get('photo') or c.get('photoEach')), c.get('link'))
                            for n, c in enumerate(items or json.loads(kv.get(KEY) or '[]'))
                            if isinstance(c, dict)]}
    return out


def build(kv):
    writes, report = {}, []
    if ANCHOR_ID is None:
        return writes, report
    for s in STORES:
        k = 'sdef_%s_%s' % (s, KEY)
        if not isinstance(kv.get(k), str):
            raise SystemExit('::error::%s がありません（店舗別の遅番が無い）' % k)
        items = json.loads(kv[k])
        if any(isinstance(c, dict) and c.get('id') == ITEM['id'] for c in items):
            report.append((s, 'もう入っている'))
            continue
        at = [n for n, c in enumerate(items) if isinstance(c, dict) and c.get('id') == ANCHOR_ID]
        if len(at) != 1:
            raise SystemExit('::error::%s の遅番に %s が %d 件' % (s, ANCHOR_ID, len(at)))
        sec = items[at[0]].get('section')
        if sec and DAYS.search(sec):
            raise SystemExit('::error::%s の区分「%s」は曜日つき（毎日にならない）' % (s, sec))
        row = dict(ITEM, section=sec)
        out = items[:at[0] + 1] + [row] + items[at[0] + 1:]
        assert [c.get('id') for c in out if c is not row] == [c.get('id') for c in items]
        writes[k] = json.dumps(out, ensure_ascii=False)
        report.append((s, '追加', sec, at[0] + 1, len(items), len(out)))
    return writes, report
