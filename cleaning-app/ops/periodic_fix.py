# -*- coding: utf-8 -*-
"""定期清掃の手直し。

  1) シフト提出の4件を消す
  2) 月末準備を、やること1つずつに分ける（5件）
  3) インストラクターレッスンの集計を、やること1つずつに分ける（2件）

消す前に periodicDone_（いつやったかの記録）を読んで、
その項目に実施記録が付いていないかを確かめる。付いていたら止める。
（記録は MUST_NOT_TOUCH なので読むだけ。書かない）
"""
import json

ALL = ['笠寺', '枇杷島', '萩野通']

# 1) 消すもの
DROP = [
    'p_shift_irai10',
    'p_shift_shime15',
    'p_shift_irai25',
    'p_shift_shime_end',
]

# 2) 月末準備を分ける。先頭は元のidを使い回す（記録があっても繋がるように）
MONTH_END = [
    ('p_getsumatsu_junbi', '月末準備：チラシ交換',
     '店舗に設置されているチラシを、新しいものに交換してください。'),
    ('p_me_kanban', '月末準備：入口の看板交換',
     '入口の看板を、新しいものに交換してください。'),
    ('p_me_pop', '月末準備：引き落とし日付のポップ修正',
     '引き落とし日付のポップを直してください。\n'
     '\nクレジットの引き落とし日は15日'
     '\n口座の引き落とし日は27日'),
    ('p_me_locker', '月末準備：ロッカーの解約確認',
     'ロッカーの解約を確認してください。\n\n確認方法は「困ったメモ」に載っています。'),
    ('p_me_lesson_hyo', '月末準備：インストラクターレッスン表の交換',
     'インストラクターレッスン表を、新しいものに交換してください。'),
]
ME_AREA = '事務・連絡'
ME_DESC = '18:00ごろ'
ME_REPEAT = {'kind': 'monthEnd', 'every': 1, 'before': 0}

# 3) インストラクターレッスンの集計も、2つのことが1つに入っていたので分ける。
#    先頭は元のidを使い回す。
LESSON = [
    ('p_lesson_shukei', 'インストラクターレッスンの集計を送付',
     '先月分のレッスン表を、美和さんに送付してください。\n'
     '\n送付方法は「困ったメモ」をご確認ください。'),
    ('p_campaign_print', '紹介キャンペーンの用紙を印刷',
     '先月分の紹介キャンペーン特典のお渡しが、11日より開始します。\n'
     '\n「困ったメモ」を確認のうえ、'
     '\n対象となる紹介キャンペーンの用紙の印刷をお願いします。'),
]
LESSON_AREA = '事務・連絡'
LESSON_DESC = '10:00ごろ'
LESSON_REPEAT = {'kind': 'month', 'every': 1, 'day': 1}

# 分ける組（まとめて同じやり方で入れる）
GROUPS = [
    (MONTH_END, ME_AREA, ME_DESC, ME_REPEAT, 30),
    (LESSON, LESSON_AREA, LESSON_DESC, LESSON_REPEAT, 30),
]


def done_records(kv, task_id):
    """その定期項目に付いている実施記録（店舗ごと）。読むだけ。"""
    out = []
    for store in ALL:
        try:
            dm = json.loads(kv.get('periodicDone_' + store) or '{}')
        except Exception:
            dm = {}
        d = dm.get(task_id)
        # next（次にやる日）だけなら、まだやっていない
        if isinstance(d, dict) and d.get('date'):
            out.append((store, d.get('date'), d.get('staff')))
    return out


def build_fix(kv):
    writes = {}
    report = {'dropped': [], 'kept_has_record': [], 'added': [], 'updated': [], 'same': []}

    try:
        tasks = json.loads(kv.get('periodicTasks') or '[]')
    except Exception:
        tasks = []
    if not isinstance(tasks, list):
        raise SystemExit('::error::periodicTasks が一覧ではありません')

    before_ids = [t.get('id') for t in tasks if isinstance(t, dict)]
    new_tasks = []

    # --- 1) 消す ---
    for t in tasks:
        if not isinstance(t, dict):
            continue
        if t.get('id') in DROP:
            rec = done_records(kv, t.get('id'))
            if rec:
                # やった記録がある項目を黙って消さない。残して報告する。
                report['kept_has_record'].append((t.get('id'), t.get('title'), rec))
                new_tasks.append(t)
            else:
                report['dropped'].append((t.get('id'), t.get('title')))
            continue
        new_tasks.append(t)

    by_id = {t.get('id'): t for t in new_tasks if isinstance(t, dict)}

    # --- 2) 3) まとまっていた項目を、やること1つずつに分ける ---
    for items, area, desc, repeat, interval in GROUPS:
        for tid, title, method in items:
            ent = {
                'id': tid, 'area': area, 'title': title, 'desc': desc,
                'method': method, 'repeat': dict(repeat), 'interval': interval,
                'lastDone': None, 'lastStaff': '',
            }
            cur = by_id.get(tid)
            if cur is None:
                new_tasks.append(ent)
                by_id[tid] = ent
                report['added'].append((tid, title))
                continue
            keep = {k: cur.get(k) for k in ('lastDone', 'lastStaff') if cur.get(k)}
            merged = dict(ent)
            merged.update(keep)
            if json.dumps(cur, ensure_ascii=False, sort_keys=True) == \
               json.dumps(merged, ensure_ascii=False, sort_keys=True):
                report['same'].append((tid, title))
            else:
                cur.clear()
                cur.update(merged)
                report['updated'].append((tid, title))

    after_ids = [t.get('id') for t in new_tasks if isinstance(t, dict)]
    if len(after_ids) != len(set(after_ids)):
        raise SystemExit('::error::定期項目のidが重複します')
    # 消すと決めたもの以外が消えていないこと
    lost = set(before_ids) - set(after_ids) - set(d[0] for d in report['dropped'])
    if lost:
        raise SystemExit('::error::消すつもりのない定期項目が消えます: %s' % '、'.join(sorted(lost)))

    if report['dropped'] or report['added'] or report['updated']:
        writes['periodicTasks'] = json.dumps(new_tasks, ensure_ascii=False)
    report['before'] = len(before_ids)
    report['after'] = len(after_ids)
    return writes, report
