// テスト用の、でたらめな plan を作る道具。画面からは使わない（index.ts にも入れていない）。
// 種を決めれば同じ plan になるので、「たくさんの形の入力で、必ず守る条件を1つも破らない」ことを確かめられる。
import { emptySchedule } from './schedule'
import { makeRng } from './solver'
import { daysInMonth } from './dates'
import type { ShiftPlan, Staff, Weekday, Wish } from './types'

export type RandomPlanOptions = {
  seed: number
  staff: number
  year?: number
  month?: number
  /** 休み希望を、1人あたり最大で何日入れるか */
  maxOffWishes?: number
  /** 人数の割に必要人数を多くして、わざと組めなくする */
  tight?: boolean
}

export function randomPlan(options: RandomPlanOptions): ShiftPlan {
  const rng = makeRng(options.seed)
  const rint = (n: number) => Math.floor(rng() * n)
  const year = options.year ?? 2026
  const month = options.month ?? 12
  const total = daysInMonth(year, month)
  const n = options.staff
  const maxOff = options.maxOffWishes ?? 4

  const staff: Staff[] = []
  const wishes: ShiftPlan['wishes'] = {}
  for (let i = 0; i < n; i++) {
    const id = `st${i + 1}`
    const full = rng() < 0.6
    const s: Staff = { id, name: `スタッフ${i + 1}`, tagIds: [], fixedOffWeekdays: [], cannotWork: {}, minDays: null, maxDays: null }
    if (rng() < 0.35 || i === 0) s.tagIds.push('tag1')
    if (rng() < 0.3) s.tagIds.push('tag2')
    if (full) {
      s.minDays = 17 + rint(3)
      s.maxDays = 21 + rint(2)
    } else {
      s.maxDays = 8 + rint(8)
      if (rng() < 0.5) s.fixedOffWeekdays = [rint(7) as Weekday]
      const kind = rint(3)
      const all: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
      if (kind === 0) s.cannotWork = { sh2: all, sh3: all }
      else if (kind === 1) s.cannotWork = { sh1: all, sh3: all }
      else s.cannotWork = { sh1: [1, 2, 3, 4, 5] }
    }
    staff.push(s)
    const row: Record<string, Wish> = {}
    const offs = rint(maxOff + 1)
    for (let k = 0; k < offs; k++) row[String(1 + rint(total))] = { kind: 'off' }
    if (rng() < 0.3) {
      const day = String(1 + rint(total))
      if (!row[day]) row[day] = { kind: 'shift', shiftId: rng() < 0.5 ? 'sh1' : 'sh2' }
    }
    if (Object.keys(row).length > 0) wishes[id] = row
  }

  const scale = options.tight ? 0.34 : 0.2
  const base = Math.max(1, Math.round(n * scale))
  const closedWeekday = rng() < 0.5 ? [rint(7) as Weekday] : []
  return {
    storeName: `テストの店${options.seed}`,
    year,
    month,
    closed: { weekdays: closedWeekday, days: rng() < 0.3 ? [1 + rint(total)] : [] },
    holidayMode: (['sunday', 'weekday', 'closed'] as const)[rint(3)],
    shiftTypes: [
      { id: 'sh1', name: '早番', symbol: '早', start: '09:00', end: '17:00', breakMinutes: 60, color: 'egg' },
      { id: 'sh2', name: '遅番', symbol: '遅', start: '13:00', end: '21:00', breakMinutes: 60, color: 'sky' },
      { id: 'sh3', name: '通し', symbol: '通', start: '09:00', end: '21:00', breakMinutes: 90, color: 'tomato' },
    ],
    tags: [
      { id: 'tag1', name: '責任者' },
      { id: 'tag2', name: '鍵を持っている' },
    ],
    staff,
    needs: {
      weekly: {
        sh1: [base + 1, base, base, base, base, base, base + 1],
        sh2: [base + 1, base, base, base, base, base + 1, base + 1],
        sh3: [1, 0, 0, 0, 0, 0, 1],
      },
      overrides: rng() < 0.5 ? { [String(1 + rint(total))]: { sh1: base + 1 } } : {},
      roleMins: [
        { id: 'rm1', shiftId: 'sh2', tagId: 'tag1', count: 1 },
        { id: 'rm2', shiftId: 'sh2', tagId: 'tag2', count: 1 },
      ],
    },
    wishes,
    rules: {
      maxConsecutive: rng() < 0.8 ? 4 + rint(3) : null,
      forbiddenPairs: rng() < 0.8 ? [{ id: 'fp1', first: 'sh2', next: 'sh1' }, { id: 'fp2', first: 'sh3', next: 'sh1' }] : [],
      weeklyDayOff: rng() < 0.8,
      weekStart: rint(7) as Weekday,
      balanceWeekend: rng() < 0.8,
      balanceShiftIds: rng() < 0.7 ? ['sh2'] : [],
    },
    schedule: emptySchedule(),
    carry: null,
  }
}
