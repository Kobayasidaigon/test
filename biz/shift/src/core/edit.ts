// データを書き換える関数。どれも、もとの plan を書き換えずに新しい plan を返す。
//
// 画面で直接 { ...plan, staff: [...] } と書いてもよいが、
// 「消したものを指している行が残る」（消したスタッフの希望、消した勤務の必要人数 など）と、
// 保存したファイルを読み込むときの検査（storage.ts）で断られてしまう。
// 消す・月を変える、のように後始末が要る操作は、ここの関数を使うこと。
import { daysInMonth } from './dates'
import { emptySchedule } from './schedule'
import type { ShiftColor, ShiftPlan, ShiftType, Staff, Tag, Weekday, Wish } from './types'
import { SHIFT_COLORS } from './types'

/** まだ使われていない id を作る（prefix + 連番）。乱数を使わないので、同じ操作なら同じ id になる */
export function nextId(prefix: string, existing: Iterable<string>): string {
  const used = new Set(existing)
  let n = used.size + 1
  while (used.has(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

/** 勤務の種類のひな形（3種類）。「自分の店で始める」で選べるようにする */
export const SHIFT_PRESETS: Array<{ id: string; label: string; note: string; shiftTypes: ShiftType[] }> = [
  {
    id: 'early-late',
    label: '早番・遅番',
    note: '1日を前半と後半に分ける店に',
    shiftTypes: [
      { id: 'sh1', name: '早番', symbol: '早', start: '09:00', end: '17:00', breakMinutes: 60, color: 'egg' },
      { id: 'sh2', name: '遅番', symbol: '遅', start: '13:00', end: '21:00', breakMinutes: 60, color: 'sky' },
    ],
  },
  {
    id: 'early-late-full',
    label: '早番・遅番・通し',
    note: '開店から閉店まで入る人もいる店に',
    shiftTypes: [
      { id: 'sh1', name: '早番', symbol: '早', start: '09:00', end: '15:00', breakMinutes: 0, color: 'egg' },
      { id: 'sh2', name: '遅番', symbol: '遅', start: '15:00', end: '21:00', breakMinutes: 0, color: 'sky' },
      { id: 'sh3', name: '通し', symbol: '通', start: '09:00', end: '21:00', breakMinutes: 90, color: 'tomato' },
    ],
  },
  {
    id: 'am-pm-day',
    label: '午前・午後・1日',
    note: '午前と午後で診療や受付が分かれる店に',
    shiftTypes: [
      { id: 'sh1', name: '午前', symbol: '前', start: '09:00', end: '13:00', breakMinutes: 0, color: 'egg' },
      { id: 'sh2', name: '午後', symbol: '後', start: '14:00', end: '18:30', breakMinutes: 0, color: 'teal' },
      { id: 'sh3', name: '1日', symbol: '日', start: '09:00', end: '18:30', breakMinutes: 60, color: 'tomato' },
    ],
  },
]

/** 何も入っていない plan。勤務の種類だけ、ひな形から入れておく */
export function blankPlan(year: number, month: number, presetId: string = SHIFT_PRESETS[0].id): ShiftPlan {
  const preset = SHIFT_PRESETS.find((p) => p.id === presetId) ?? SHIFT_PRESETS[0]
  const shiftTypes = preset.shiftTypes.map((s) => ({ ...s }))
  const weekly: Record<string, number[]> = {}
  for (const s of shiftTypes) weekly[s.id] = [1, 1, 1, 1, 1, 1, 1]
  return {
    storeName: '',
    year,
    month,
    closed: { weekdays: [], days: [] },
    holidayMode: 'sunday',
    shiftTypes,
    tags: [],
    staff: [],
    needs: { weekly, overrides: {}, roleMins: [] },
    wishes: {},
    rules: { maxConsecutive: 5, forbiddenPairs: [], weeklyDayOff: true, weekStart: 0, balanceWeekend: true, balanceShiftIds: [] },
    schedule: emptySchedule(),
    carry: null,
  }
}

// ---- スタッフ ----

export function newStaff(plan: ShiftPlan, name = ''): Staff {
  return { id: nextId('st', plan.staff.map((s) => s.id)), name, tagIds: [], fixedOffWeekdays: [], cannotWork: {}, minDays: null, maxDays: null }
}

export function addStaff(plan: ShiftPlan, name = ''): ShiftPlan {
  return { ...plan, staff: [...plan.staff, newStaff(plan, name)] }
}

export function updateStaff(plan: ShiftPlan, staffId: string, patch: Partial<Omit<Staff, 'id'>>): ShiftPlan {
  return { ...plan, staff: plan.staff.map((s) => (s.id === staffId ? { ...s, ...patch } : s)) }
}

/** スタッフを消す。その人の希望、表のマス、固定、前の月の勤務も消す */
export function removeStaff(plan: ShiftPlan, staffId: string): ShiftPlan {
  const drop = <V>(rec: Record<string, V>): Record<string, V> => {
    const { [staffId]: _gone, ...rest } = rec
    return rest
  }
  return {
    ...plan,
    staff: plan.staff.filter((s) => s.id !== staffId),
    wishes: drop(plan.wishes),
    schedule: { ...plan.schedule, work: drop(plan.schedule.work), locked: drop(plan.schedule.locked) },
    carry: plan.carry ? { ...plan.carry, tail: drop(plan.carry.tail) } : null,
  }
}

/** その曜日の、その勤務に入れるか（固定の休みの曜日は、どの勤務にも入れない） */
export function canWork(staff: Staff, weekday: Weekday, shiftId: string): boolean {
  if (staff.fixedOffWeekdays.includes(weekday)) return false
  return !(staff.cannotWork[shiftId]?.includes(weekday) ?? false)
}

/** 「その曜日の、その勤務に入れる／入れない」を切りかえた Staff を返す */
export function setCanWork(staff: Staff, weekday: Weekday, shiftId: string, can: boolean): Staff {
  const set = new Set(staff.cannotWork[shiftId] ?? [])
  if (can) set.delete(weekday)
  else set.add(weekday)
  const cannotWork = { ...staff.cannotWork }
  if (set.size === 0) delete cannotWork[shiftId]
  else cannotWork[shiftId] = [...set].sort((a, b) => a - b)
  return { ...staff, cannotWork }
}

// ---- 勤務の種類 ----

export function addShiftType(plan: ShiftPlan, init: Partial<Omit<ShiftType, 'id'>> = {}): ShiftPlan {
  const id = nextId('sh', plan.shiftTypes.map((s) => s.id))
  // まだ使っていない色を選ぶ（同じ色が並ぶと、表で見分けられない）
  const used = new Set(plan.shiftTypes.map((s) => s.color))
  const color: ShiftColor = SHIFT_COLORS.find((c) => !used.has(c)) ?? SHIFT_COLORS[0]
  const shift: ShiftType = { id, name: '', symbol: '', start: '09:00', end: '18:00', breakMinutes: 60, color, ...init }
  return {
    ...plan,
    shiftTypes: [...plan.shiftTypes, shift],
    needs: { ...plan.needs, weekly: { ...plan.needs.weekly, [id]: [0, 0, 0, 0, 0, 0, 0] } },
  }
}

export function updateShiftType(plan: ShiftPlan, shiftId: string, patch: Partial<Omit<ShiftType, 'id'>>): ShiftPlan {
  return { ...plan, shiftTypes: plan.shiftTypes.map((s) => (s.id === shiftId ? { ...s, ...patch } : s)) }
}

/**
 * 勤務の種類を消す。それを指している必要人数、役割の最低人数、希望、続けて入れない組み合わせ、
 * 表のマス（固定もふくむ）も消す。
 */
export function removeShiftType(plan: ShiftPlan, shiftId: string): ShiftPlan {
  const { [shiftId]: _w, ...weekly } = plan.needs.weekly
  const overrides: ShiftPlan['needs']['overrides'] = {}
  for (const [day, o] of Object.entries(plan.needs.overrides)) {
    const { [shiftId]: _o, ...rest } = o
    if (Object.keys(rest).length > 0) overrides[day] = rest
  }
  const wishes: ShiftPlan['wishes'] = {}
  for (const [staffId, row] of Object.entries(plan.wishes)) {
    const kept: Record<string, Wish> = {}
    for (const [day, w] of Object.entries(row)) if (!(w.kind === 'shift' && w.shiftId === shiftId)) kept[day] = w
    if (Object.keys(kept).length > 0) wishes[staffId] = kept
  }
  const work: ShiftPlan['schedule']['work'] = {}
  const locked: ShiftPlan['schedule']['locked'] = {}
  for (const staff of plan.staff) {
    const row = plan.schedule.work[staff.id] ?? {}
    const keptRow: Record<string, string> = {}
    const removedDays = new Set<number>()
    for (const [day, id] of Object.entries(row)) {
      if (id === shiftId) removedDays.add(Number(day))
      else keptRow[day] = id
    }
    if (Object.keys(keptRow).length > 0) work[staff.id] = keptRow
    // 消えた勤務のマスは、固定も外す（「休みで固定」に化けると、利用者が気づかないまま残ってしまう）
    const keptLocks = (plan.schedule.locked[staff.id] ?? []).filter((d) => !removedDays.has(d))
    if (keptLocks.length > 0) locked[staff.id] = keptLocks
  }
  return {
    ...plan,
    shiftTypes: plan.shiftTypes.filter((s) => s.id !== shiftId),
    staff: plan.staff.map((s) => {
      if (!(shiftId in s.cannotWork)) return s
      const { [shiftId]: _c, ...cannotWork } = s.cannotWork
      return { ...s, cannotWork }
    }),
    needs: { weekly, overrides, roleMins: plan.needs.roleMins.filter((r) => r.shiftId !== shiftId) },
    wishes,
    rules: {
      ...plan.rules,
      forbiddenPairs: plan.rules.forbiddenPairs.filter((p) => p.first !== shiftId && p.next !== shiftId),
      balanceShiftIds: plan.rules.balanceShiftIds.filter((id) => id !== shiftId),
    },
    schedule: { ...plan.schedule, work, locked },
  }
}

/** 勤務の種類を、ひな形のものにまるごと入れかえる（いまの種類を指しているものは、すべて消える） */
export function applyShiftPreset(plan: ShiftPlan, presetId: string): ShiftPlan {
  const preset = SHIFT_PRESETS.find((p) => p.id === presetId)
  if (!preset) return plan
  let next = plan
  for (const s of plan.shiftTypes) next = removeShiftType(next, s.id)
  const weekly: Record<string, number[]> = {}
  for (const s of preset.shiftTypes) weekly[s.id] = [1, 1, 1, 1, 1, 1, 1]
  return { ...next, shiftTypes: preset.shiftTypes.map((s) => ({ ...s })), needs: { ...next.needs, weekly } }
}

// ---- 役割の札 ----

export function addTag(plan: ShiftPlan, name: string): ShiftPlan {
  const tag: Tag = { id: nextId('tag', plan.tags.map((t) => t.id)), name }
  return { ...plan, tags: [...plan.tags, tag] }
}

/** 札を消す。スタッフに付いているその札と、その札の最低人数も消す */
export function removeTag(plan: ShiftPlan, tagId: string): ShiftPlan {
  return {
    ...plan,
    tags: plan.tags.filter((t) => t.id !== tagId),
    staff: plan.staff.map((s) => (s.tagIds.includes(tagId) ? { ...s, tagIds: s.tagIds.filter((id) => id !== tagId) } : s)),
    needs: { ...plan.needs, roleMins: plan.needs.roleMins.filter((r) => r.tagId !== tagId) },
  }
}

// ---- 必要な人数 ----

/** 曜日ごとの必要人数を1つ書きかえる */
export function setWeeklyNeed(plan: ShiftPlan, shiftId: string, weekday: Weekday, count: number): ShiftPlan {
  const row = [...(plan.needs.weekly[shiftId] ?? [0, 0, 0, 0, 0, 0, 0])]
  row[weekday] = Math.max(0, Math.floor(count))
  return { ...plan, needs: { ...plan.needs, weekly: { ...plan.needs.weekly, [shiftId]: row } } }
}

/** 特定の日だけの必要人数を書く。count が null なら、その勤務の上書きをやめる */
export function setDayNeed(plan: ShiftPlan, day: number, shiftId: string, count: number | null): ShiftPlan {
  const key = String(day)
  const row = { ...(plan.needs.overrides[key] ?? {}) }
  if (count === null) delete row[shiftId]
  else row[shiftId] = Math.max(0, Math.floor(count))
  const overrides = { ...plan.needs.overrides }
  if (Object.keys(row).length === 0) delete overrides[key]
  else overrides[key] = row
  return { ...plan, needs: { ...plan.needs, overrides } }
}

/**
 * 役割の最低人数を書く（例: 遅番に「鍵を持っている」人が1人以上）。
 * 同じ勤務・同じ札の決まりがもうあれば、人数だけを書きかえる。count が 0 以下なら、その決まりを消す。
 */
export function setRoleMin(plan: ShiftPlan, shiftId: string, tagId: string, count: number): ShiftPlan {
  const n = Math.floor(count)
  const existing = plan.needs.roleMins.find((r) => r.shiftId === shiftId && r.tagId === tagId)
  let roleMins = plan.needs.roleMins
  if (n <= 0) roleMins = roleMins.filter((r) => r !== existing)
  else if (existing) roleMins = roleMins.map((r) => (r === existing ? { ...r, count: n } : r))
  else roleMins = [...roleMins, { id: nextId('rm', roleMins.map((r) => r.id)), shiftId, tagId, count: n }]
  return { ...plan, needs: { ...plan.needs, roleMins } }
}

// ---- 条件 ----

/** 条件を書きかえる（連勤の上限、週1日の休み、公平さ など） */
export function updateRules(plan: ShiftPlan, patch: Partial<ShiftPlan['rules']>): ShiftPlan {
  return { ...plan, rules: { ...plan.rules, ...patch } }
}

/** 続けて入れない組み合わせを足す（first の次の日に next を入れない）。同じ組み合わせがもうあれば、何もしない */
export function addForbiddenPair(plan: ShiftPlan, first: string, next: string): ShiftPlan {
  const pairs = plan.rules.forbiddenPairs
  if (pairs.some((p) => p.first === first && p.next === next)) return plan
  return updateRules(plan, { forbiddenPairs: [...pairs, { id: nextId('fp', pairs.map((p) => p.id)), first, next }] })
}

export function removeForbiddenPair(plan: ShiftPlan, pairId: string): ShiftPlan {
  return updateRules(plan, { forbiddenPairs: plan.rules.forbiddenPairs.filter((p) => p.id !== pairId) })
}

// ---- 希望 ----

/** 希望を書く。wish が null なら消す */
export function setWish(plan: ShiftPlan, staffId: string, day: number, wish: Wish | null): ShiftPlan {
  const row = { ...(plan.wishes[staffId] ?? {}) }
  if (wish === null) delete row[String(day)]
  else row[String(day)] = wish
  const wishes = { ...plan.wishes }
  if (Object.keys(row).length === 0) delete wishes[staffId]
  else wishes[staffId] = row
  return { ...plan, wishes }
}

/**
 * カレンダーのマスを押すたびに、希望を順に切りかえる:
 *   なし → 休み希望 → 1つめの勤務に入りたい → 2つめ … → なし
 */
export function cycleWish(plan: ShiftPlan, staffId: string, day: number): ShiftPlan {
  const now = plan.wishes[staffId]?.[String(day)] ?? null
  let next: Wish | null
  if (now === null) next = { kind: 'off' }
  else if (now.kind === 'off') next = plan.shiftTypes.length > 0 ? { kind: 'shift', shiftId: plan.shiftTypes[0].id } : null
  else {
    const i = plan.shiftTypes.findIndex((s) => s.id === now.shiftId)
    next = i >= 0 && i + 1 < plan.shiftTypes.length ? { kind: 'shift', shiftId: plan.shiftTypes[i + 1].id } : null
  }
  return setWish(plan, staffId, day, next)
}

// ---- 月 ----

/**
 * 対象の年月を変える。日付にひもづくもの（個別の定休日、日ごとの上書き、希望、表、前の月の勤務）は消える。
 * 画面では、消える前に確かめること（表や希望が入っているとき）。
 */
export function setMonth(plan: ShiftPlan, year: number, month: number): ShiftPlan {
  if (plan.year === year && plan.month === month) return plan
  return {
    ...plan,
    year,
    month,
    closed: { ...plan.closed, days: [] },
    needs: { ...plan.needs, overrides: {} },
    wishes: {},
    schedule: emptySchedule(),
    carry: null,
  }
}

/** 月を変えると消えるものが、いま入っているか（確かめの表示を出すかどうかに使う） */
export function hasMonthData(plan: ShiftPlan): boolean {
  return (
    plan.closed.days.length > 0 ||
    Object.keys(plan.needs.overrides).length > 0 ||
    Object.keys(plan.wishes).length > 0 ||
    Object.keys(plan.schedule.work).length > 0 ||
    Object.keys(plan.schedule.locked).length > 0 ||
    plan.carry !== null
  )
}

/** 個別の定休日を切りかえる */
export function toggleClosedDay(plan: ShiftPlan, day: number): ShiftPlan {
  if (day < 1 || day > daysInMonth(plan.year, plan.month)) return plan
  const set = new Set(plan.closed.days)
  if (set.has(day)) set.delete(day)
  else set.add(day)
  return { ...plan, closed: { ...plan.closed, days: [...set].sort((a, b) => a - b) } }
}
