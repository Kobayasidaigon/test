# -*- coding: utf-8 -*-
"""連絡用の仕組みにあった決まりごとを、定期清掃へ入れる。

やること:
  - periodicTasks に11件を足す（すでに同じidがあれば中身を揃えるだけ）
  - 既存の10件には一切触らない

やらないこと:
  - 項目のidを変える・消す
  - periodicDone_（いつやったかの記録）を触る
"""
import json

ALL = ['笠寺', '枇杷島', '萩野通']
BIWA = ['枇杷島']

# (id, 区分, 題名, 補足, 繰り返し, 出す店舗, 本文)
TASKS = [
    ('p_tsukihajime2', '事務・連絡', '月初２', '10:00ごろ',
     {'kind': 'month', 'every': 1, 'day': 1}, ALL,
     '月が替わりましたので、\n今月の目標、先月の目標の振り返りの記載をお願いします。'),

    ('p_lesson_shukei', '事務・連絡', 'インストラクターレッスンの集計を送付', '10:00ごろ',
     {'kind': 'month', 'every': 1, 'day': 1}, ALL,
     '先月分のレッスン表を\n美和さんに送付してください。\n'
     '送付方法は「困ったメモ」を\nご確認ください\n'
     '\n------------------------------------------------\n'
     '先月分の紹介キャンペーン特典の\nお渡しが、11日より開始します。\n'
     '\n「困ったメモ」を確認のうえ、\n対象となる紹介キャンペーンの\n用紙の印刷をお願いします。'),

    ('p_minou_list', '事務・連絡', '未納者リストのリストだし', '10:00ごろ',
     {'kind': 'month', 'every': 1, 'day': 3}, ALL,
     '未納者リストの\n印刷をお願いします。\n\n印刷方法は「困ったメモ」を\nご確認ください。'),

    ('p_shift_irai10', 'シフト', 'シフト提出依頼　10日', '20:00ごろ',
     {'kind': 'month', 'every': 1, 'day': 10}, ALL,
     'シフト提出の締め切りまで5日です。\n\n翌月1日～15日迄の\nシフト提出をお願いします。\n'
     '\n一ヶ月分の予定がお分かりの方は、\nあらかじめ申請いただけますと幸いです。'),

    ('p_shift_shime15', 'シフト', 'シフト提出の締め切り　15日', '12:00ごろ',
     {'kind': 'month', 'every': 1, 'day': 15}, ALL,
     'シフト提出の締め切り日です。\n\n翌月1日～15日迄の\nシフト提出をお願いします。\n'
     '\n一ヶ月分の予定がお分かりの方は、\nあらかじめ申請いただけますと幸いです。'),

    ('p_shift_irai25', 'シフト', 'シフト提出依頼　月末の5日前', '20:00ごろ',
     {'kind': 'monthEnd', 'every': 1, 'before': 5}, ALL,
     'シフト提出の締め切りまで5日です。\n\n翌月15日～末日迄の\nシフト提出をお願いします。\n'
     '\n一ヶ月分の予定がお分かりの方は、\nあらかじめ申請いただけますと幸いです。'),

    ('p_shift_shime_end', 'シフト', 'シフト提出の締め切り　月末', '12:00ごろ',
     {'kind': 'monthEnd', 'every': 1, 'before': 0}, ALL,
     'シフト提出の締め切り日です。\n\n翌月15日～末日迄の\nシフト提出をお願いします。\n'
     '\n一ヶ月分の予定がお分かりの方は、\nあらかじめ申請いただけますと幸いです。'),

    ('p_getsumatsu_junbi', '事務・連絡', '月末準備', '18:00ごろ',
     {'kind': 'monthEnd', 'every': 1, 'before': 0}, ALL,
     '月末のため、以下の対応をお願いいたします。\n'
     '\n・店舗に設置されているチラシ交換'
     '\n・入口の看板交換'
     '\n・引き落とし日付のポップ修正'
     '\n　（クレジットの引き落とし日は15日、口座の引き落とし日は27日です）'
     '\n・ロッカーの解約確認（困ったメモに確認方法が載っています）'
     '\n・インストラクターレッスン表を新しいものに交換してください。'),

    ('p_gomidashi_biwa', 'ゴミ', 'ゴミ出し', '22:00ごろ',
     {'kind': 'week', 'every': 1, 'dow': 3}, BIWA,
     '本日はゴミ出しの日です。\nお店の外にゴミ出しをお願いします。\n'
     '※ごみ袋の使用量が少なくなるようにまとめてください'),

    ('p_son_binder', 'レッスン', 'SON先生のバインダー', '21:00ごろ',
     {'kind': 'week', 'every': 1, 'dow': 6}, BIWA,
     '明日の9時からSON先生のレッスンが行われますので、\n'
     'バインダーを有料ロッカー（40番）に入れてください。'),
]


def repeat_days(r):
    """おおよその間隔（日）。アプリの repeatDays と同じ考え方。"""
    if r['kind'] == 'week':
        return r['every'] * 7
    if r['kind'] in ('month', 'monthEnd'):
        return r['every'] * 30
    return r.get('n', 30)


def build_periodic(kv):
    """periodicTasks に11件を足す。既存には触らない。"""
    writes = {}
    report = {'added': [], 'updated': [], 'same': []}

    try:
        tasks = json.loads(kv.get('periodicTasks') or '[]')
    except Exception:
        tasks = []
    if not isinstance(tasks, list):
        raise SystemExit('::error::periodicTasks が一覧ではありません')

    before_ids = [t.get('id') for t in tasks if isinstance(t, dict)]
    new_tasks = json.loads(json.dumps(tasks))
    by_id = {t.get('id'): t for t in new_tasks if isinstance(t, dict)}

    for tid, area, title, desc, rep, stores, method in TASKS:
        ent = {
            'id': tid, 'area': area, 'title': title, 'desc': desc,
            'method': method, 'repeat': rep, 'interval': repeat_days(rep),
            'lastDone': None, 'lastStaff': '',
        }
        # 全店舗なら stores は持たせない（店舗が増えたときに出なくなるため）
        if len(stores) < len(ALL):
            ent['stores'] = stores

        cur = by_id.get(tid)
        if cur is None:
            new_tasks.append(ent)
            report['added'].append((tid, title))
            continue
        # すでにある場合は、中身をそろえる（いつやったかの記録は別の鍵なので無事）
        keep = {k: cur.get(k) for k in ('lastDone', 'lastStaff') if k in cur}
        merged = dict(ent)
        merged.update({k: v for k, v in keep.items() if v})
        if json.dumps(cur, ensure_ascii=False, sort_keys=True) == \
           json.dumps(merged, ensure_ascii=False, sort_keys=True):
            report['same'].append((tid, title))
        else:
            cur.clear()
            cur.update(merged)
            report['updated'].append((tid, title))

    after_ids = [t.get('id') for t in new_tasks if isinstance(t, dict)]
    lost = set(before_ids) - set(after_ids)
    if lost:
        raise SystemExit('::error::定期項目が消えます: %s' % '、'.join(sorted(lost)))
    if len(after_ids) != len(set(after_ids)):
        raise SystemExit('::error::定期項目のidが重複します')

    if report['added'] or report['updated']:
        writes['periodicTasks'] = json.dumps(new_tasks, ensure_ascii=False)
    report['before'] = len(before_ids)
    report['after'] = len(after_ids)
    return writes, report
