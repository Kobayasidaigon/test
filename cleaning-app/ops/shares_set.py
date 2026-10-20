# -*- coding: utf-8 -*-
"""枇杷島の「分担」を決める。sdef_<店舗>_shares_<時間帯> を作るだけ。

分け方:
  朝番（3人）… 男性側／女性側／共用・ゴルフ
      男女で分かれている設備（サウナ・シャワー・トイレ・パウダー・エステ）を
      そのまま2つに割り、残り（ゴルフA・プロテイン・フロアと単独の行）を3人目に。
  中番（2人）… ジム・スタジオ／ゴルフ・備品
      中番には男女で分かれた設備が無いので、場所で2つに分ける。
  遅番（2人）… 水まわり／館内・閉め
      遅番で男女に分かれているのはトイレだけ。水まわりをまとめて1人に。

やらないこと:
  - 清掃の記録・名簿・シフト表に触る（別の鍵なので手が届かない）
  - 項目を足す・消す・並べ替える（分担は「どれを誰が」だけを決める）
"""
import json

STORE = '枇杷島'

SHARES = {
    'routine_asa': [
        {
            'id': 'm', 'name': '男性側',
            'areas': ['sauna_b1', 'sauna_b2', 'sauna_b3',
                      'shower_b1', 'shower_b2', 'shower_b5', 'shower_b6',
                      'toilet_m', 'men_room_m', 'esthe_m'],
            'items': [],
        },
        {
            'id': 'w', 'name': '女性側',
            'areas': ['sauna_b4', 'sauna_b5',
                      'shower_b3', 'shower_b4', 'shower_b7',
                      'toilet_w', 'men_room_w', 'esthe_w'],
            'items': [],
        },
        {
            'id': 'x', 'name': '共用・ゴルフ',
            'areas': ['golf_a', 'protein_kasadera', 'floor'],
            'items': ['routine_asa_v3_01', 'routine_asa_v3_02', 'routine_asa_v3_03',
                      'asa_saunamat_pickup', 'asa_showermat_pickup',
                      'routine_asa_v3_13', 'routine_asa_v3_14', 'routine_asa_v3_15',
                      'asa_trash_dispose', 'asa_mop_clean',
                      'routine_asa_inventory', 'routine_asa_v3_16'],
        },
    ],
    'routine_hiru': [
        {
            'id': 'g', 'name': 'ジム・スタジオ',
            'areas': ['floor', 'machine', 'machine_mente', 'studio', 'entrance'],
            'items': ['routine_hiru_v3_01', 'routine_hiru_v3_02', 'hiru_locker_lost',
                      'hiru_trash_dispose', 'hiru_mop_clean'],
        },
        {
            'id': 'b', 'name': 'ゴルフ・備品',
            'areas': ['golf_b', 'hydrogen'],
            'items': ['hiru_saunamat_pickup', 'routine_hiru_v3_11', 'hiru_cup',
                      'routine_hiru_v3_09', 'routine_hiru_v3_03', 'routine_hiru_v3_13',
                      'routine_hiru_inventory', 'routine_hiru_v3_14'],
        },
    ],
    'routine_ban': [
        {
            'id': 't', 'name': '水まわり',
            'areas': ['toilet_m', 'toilet_w'],
            'items': ['ban_saunamat_pickup', 'ban_showermat_pickup',
                      'routine_ban_v3_11', 'routine_ban_v3_15',
                      'ban_vacuum_sink', 'ban_trashbin_clean', 'ban_saunamat_box_wash'],
        },
        {
            'id': 'k', 'name': '館内・閉め',
            'areas': ['vijiris', 'fitshape'],
            'items': ['routine_ban_v3_01', 'routine_ban_v3_02', 'routine_ban_v3_13',
                      'routine_ban_v3_14', 'routine_ban_v3_03', 'routine_ban_v3_17',
                      'routine_ban_studio_volume', 'routine_ban_studio_mic',
                      'ban_trash_dispose', 'ban_mop_clean',
                      'routine_ban_v3_18', 'routine_ban_v3_19',
                      'routine_ban_v3_20', 'routine_ban_v3_21'],
        },
    ],
}


def jload(v, fallback):
    if not isinstance(v, str):
        return fallback
    try:
        v = json.loads(v)
        return fallback if v is None else v
    except Exception:
        return fallback


def defread(kv, key):
    v = kv.get('sdef_%s_%s' % (STORE, key))
    return kv.get(key) if v is None else v


def slot_rows(kv, slot):
    """その時間帯に並んでいる行（下げたものは除く）"""
    rows = jload(defread(kv, 'customItems_' + slot), []) or []
    hid = jload(defread(kv, 'hiddenItems_' + slot), []) or []
    hid = hid if isinstance(hid, list) else []
    return [r for r in rows
            if isinstance(r, dict) and r.get('id') and r['id'] not in hid]


def area_keys(kv):
    out = set()
    for a in (jload(defread(kv, 'customAreas'), []) or []):
        if isinstance(a, dict) and a.get('key'):
            out.add(a['key'])
    return out


def build_shares(kv, builtin_areas=()):
    """書く鍵と報告を返す。読むだけで、ここでは書かない。"""
    writes = {}
    report = {'slots': [], 'left': []}
    known_areas = area_keys(kv) | set(builtin_areas)

    for slot, shares in SHARES.items():
        rows = slot_rows(kv, slot)
        if not rows:
            raise SystemExit('::error::%s の %s に行がありません' % (STORE, slot))
        ids = set(r['id'] for r in rows)
        links = {}
        for r in rows:
            ks = [x.strip() for x in str(r.get('link') or '').split(',') if x.strip()]
            if ks:
                links[r['id']] = ks
        all_link_areas = set()
        for ks in links.values():
            all_link_areas |= set(ks)

        seen_a, seen_i = {}, {}
        rows_of = []
        for s in shares:
            for k in s['areas']:
                if k not in known_areas:
                    raise SystemExit('::error::%s に無いエリアを指しています: %s（%s）'
                                     % (STORE, k, s['name']))
                if k not in all_link_areas:
                    raise SystemExit('::error::%s のどの行からも開かないエリアです: %s（%s）'
                                     % (slot, k, s['name']))
                if k in seen_a:
                    raise SystemExit('::error::エリアが2つの分担に入っています: %s（%s と %s）'
                                     % (k, seen_a[k], s['name']))
                seen_a[k] = s['name']
            for i in s['items']:
                if i not in ids:
                    raise SystemExit('::error::%s に無い項目を指しています: %s（%s）'
                                     % (slot, i, s['name']))
                if i in links:
                    raise SystemExit('::error::開く先のある行は items ではなく areas で分けます: %s'
                                     % i)
                if i in seen_i:
                    raise SystemExit('::error::項目が2つの分担に入っています: %s（%s と %s）'
                                     % (i, seen_i[i], s['name']))
                seen_i[i] = s['name']
            # その分担で出る行数
            n = len([1 for r in rows
                     if (r['id'] in links and set(links[r['id']]) & set(s['areas']))
                     or r['id'] in s['items']])
            rows_of.append((s['name'], n, len(s['areas']), len(s['items'])))

        # どの分担にも入らなかったもの
        left_items = sorted(i for i in ids if i not in links and i not in seen_i)
        left_areas = sorted(k for k in all_link_areas if k not in seen_a)
        if left_items or left_areas:
            report['left'].append((slot, left_items, left_areas))

        writes['sdef_%s_shares_%s' % (STORE, slot)] = json.dumps(
            [{'id': s['id'], 'name': s['name'],
              'areas': s['areas'], 'items': s['items']} for s in shares],
            ensure_ascii=False)
        report['slots'].append((slot, len(rows), rows_of))

    return writes, report
