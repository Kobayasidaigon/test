// サンプルのデータ（美容室・飲食店・薬局）。「サンプルで試す」の1回で、動く様子を見られるようにする。
//
// - 名前も店も、作りものである（実在の店や人ではない）。
// - どれもスタッフ8人以下にしてある。無料版のままで試せるようにするため。
// - 年月を受け取って作る。希望休は「第2土曜」のように曜日で決めているので、どの月でも同じような形になる。
// - 飲食店のサンプルは、わざと「そのままでは組めない週」を入れてある（組めないときの説明と提案を見せるため）。
import { daysInMonth, weekdayOf } from './dates'
import { emptySchedule } from './schedule'
import type { ShiftPlan, Staff, Weekday, Wish } from './types'

export type SampleId = 'salon' | 'restaurant' | 'pharmacy'

export const SAMPLES: Array<{ id: SampleId; label: string; note: string }> = [
  { id: 'salon', label: '美容室', note: 'スタッフ7人。火曜が定休日。早番と遅番。' },
  { id: 'restaurant', label: '飲食店', note: 'スタッフ8人。月曜が定休日。人が足りない週があり、組めない理由と直し方を見られます。' },
  { id: 'pharmacy', label: '薬局', note: 'スタッフ6人。日曜と祝日が休み。薬剤師が必ず1人いるように組みます。' },
]

/** その月の、n 回めの weekday の日（n は 1 から）。なければ null */
function nthWeekday(year: number, month: number, weekday: Weekday, n: number): number | null {
  const first = weekdayOf(year, month, 1)
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
  return day <= daysInMonth(year, month) ? day : null
}

function staff(id: string, name: string, patch: Partial<Staff> = {}): Staff {
  return { id, name, tagIds: [], fixedOffWeekdays: [], cannotWork: {}, minDays: null, maxDays: null, ...patch }
}

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS_ONLY: Weekday[] = [1, 2, 3, 4, 5]

/** 希望を足す。日が null（その月にない）なら何もしない */
function wish(wishes: ShiftPlan['wishes'], staffId: string, day: number | null, w: Wish): void {
  if (day === null) return
  ;(wishes[staffId] ??= {})[String(day)] = w
}

function salon(year: number, month: number): ShiftPlan {
  const wishes: ShiftPlan['wishes'] = {}
  const d = (weekday: Weekday, n: number) => nthWeekday(year, month, weekday, n)
  // 休み希望
  wish(wishes, 'st1', d(6, 2), { kind: 'off' })
  wish(wishes, 'st2', d(4, 1), { kind: 'off' })
  wish(wishes, 'st2', d(5, 1), { kind: 'off' })
  wish(wishes, 'st3', d(5, 3), { kind: 'off' })
  wish(wishes, 'st3', d(6, 3), { kind: 'off' })
  wish(wishes, 'st3', d(0, 3), { kind: 'off' })
  wish(wishes, 'st5', d(0, 2), { kind: 'off' })
  wish(wishes, 'st6', d(5, 2), { kind: 'off' })
  wish(wishes, 'st7', d(6, 4), { kind: 'off' })
  // この勤務に入りたい
  wish(wishes, 'st5', d(4, 2), { kind: 'shift', shiftId: 'sh1' })
  wish(wishes, 'st6', d(4, 3), { kind: 'shift', shiftId: 'sh2' })

  return {
    storeName: 'サンプル美容室',
    year,
    month,
    closed: { weekdays: [2], days: [] },
    holidayMode: 'sunday',
    shiftTypes: [
      { id: 'sh1', name: '早番', symbol: '早', start: '09:00', end: '18:00', breakMinutes: 60, color: 'egg' },
      { id: 'sh2', name: '遅番', symbol: '遅', start: '11:00', end: '20:00', breakMinutes: 60, color: 'sky' },
    ],
    tags: [
      { id: 'tag1', name: 'スタイリスト' },
      { id: 'tag2', name: '鍵を持っている' },
    ],
    staff: [
      staff('st1', '青木', { tagIds: ['tag1', 'tag2'], minDays: 18, maxDays: 22 }),
      staff('st2', '石川', { tagIds: ['tag1', 'tag2'], minDays: 18, maxDays: 22 }),
      staff('st3', '上田', { tagIds: ['tag1'], minDays: 18, maxDays: 22 }),
      // 夕方に迎えがあるので、早番だけ
      staff('st4', '遠藤', { tagIds: ['tag1'], cannotWork: { sh2: ALL_DAYS }, maxDays: 15 }),
      staff('st5', '小川', { minDays: 18, maxDays: 22 }),
      staff('st6', '加藤', { fixedOffWeekdays: [3], maxDays: 18 }),
      // 土日だけ入る人
      staff('st7', '木下', { fixedOffWeekdays: [1, 3, 4, 5], maxDays: 9 }),
    ],
    needs: {
      // 並びは 日・月・火・水・木・金・土。火曜は定休日
      weekly: { sh1: [3, 2, 0, 2, 2, 2, 3], sh2: [2, 2, 0, 2, 2, 2, 2] },
      overrides: {},
      roleMins: [
        { id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 },
        { id: 'rm2', shiftId: 'sh2', tagId: 'tag1', count: 1 },
        { id: 'rm3', shiftId: 'sh2', tagId: 'tag2', count: 1 },
      ],
    },
    wishes,
    rules: {
      maxConsecutive: 5,
      forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }],
      weeklyDayOff: true,
      weekStart: 0,
      balanceWeekend: true,
      balanceShiftIds: ['sh2'],
    },
    schedule: emptySchedule(),
    carry: null,
  }
}

function restaurant(year: number, month: number): ShiftPlan {
  const wishes: ShiftPlan['wishes'] = {}
  const d = (weekday: Weekday, n: number) => nthWeekday(year, month, weekday, n)

  // 「そのままでは組めない週」: 第3火曜から日曜まで、キッチンのアルバイト（渡辺さん）が休み希望。
  // キッチンに入れるのが社員2人だけになり、2人とも火曜から日曜まで6日続けて出ないと回らない。
  // 連勤の上限が5日のままだと、どちらかが休む日にキッチンが空く。6日にすると埋まる。
  const start = d(2, 3)
  if (start !== null) for (let i = 0; i < 6; i++) wish(wishes, 'st6', start + i, { kind: 'off' })

  wish(wishes, 'st1', d(3, 1), { kind: 'off' })
  wish(wishes, 'st3', d(4, 2), { kind: 'off' })
  wish(wishes, 'st4', d(5, 1), { kind: 'off' })
  wish(wishes, 'st5', d(6, 1), { kind: 'off' })
  wish(wishes, 'st7', d(5, 2), { kind: 'off' })
  wish(wishes, 'st8', d(0, 2), { kind: 'off' })
  wish(wishes, 'st7', d(6, 2), { kind: 'shift', shiftId: 'sh1' })
  wish(wishes, 'st5', d(3, 2), { kind: 'shift', shiftId: 'sh1' })

  return {
    storeName: 'サンプル食堂',
    year,
    month,
    closed: { weekdays: [1], days: [] },
    holidayMode: 'sunday',
    shiftTypes: [
      { id: 'sh1', name: '早番', symbol: '早', start: '10:00', end: '16:00', breakMinutes: 30, color: 'egg' },
      { id: 'sh2', name: '遅番', symbol: '遅', start: '16:00', end: '22:00', breakMinutes: 30, color: 'sky' },
      { id: 'sh3', name: '通し', symbol: '通', start: '10:00', end: '22:00', breakMinutes: 90, color: 'tomato' },
    ],
    tags: [
      { id: 'tag1', name: 'キッチン' },
      { id: 'tag2', name: '鍵を持っている' },
    ],
    staff: [
      staff('st1', '佐藤', { tagIds: ['tag1', 'tag2'], minDays: 19, maxDays: 23 }),
      staff('st2', '鈴木', { tagIds: ['tag1', 'tag2'], minDays: 19, maxDays: 23 }),
      staff('st3', '高橋', { tagIds: ['tag2'], minDays: 19, maxDays: 23 }),
      // 昼だけのパート。土日は休み
      staff('st4', '田中', { fixedOffWeekdays: [0, 6], cannotWork: { sh2: ALL_DAYS, sh3: ALL_DAYS }, maxDays: 16 }),
      staff('st5', '伊藤', { cannotWork: { sh2: ALL_DAYS, sh3: ALL_DAYS }, maxDays: 16 }),
      // 夜だけのアルバイト（キッチン）
      staff('st6', '渡辺', { tagIds: ['tag1'], cannotWork: { sh1: ALL_DAYS, sh3: ALL_DAYS }, maxDays: 18 }),
      // 学生。平日は授業のあと（遅番）だけ
      staff('st7', '山本', { cannotWork: { sh1: WEEKDAYS_ONLY, sh3: ALL_DAYS }, maxDays: 14 }),
      // 学生。土日だけ
      staff('st8', '中村', { fixedOffWeekdays: [2, 3, 4, 5], cannotWork: { sh3: ALL_DAYS }, maxDays: 9 }),
    ],
    needs: {
      // 並びは 日・月・火・水・木・金・土。月曜は定休日。通しは、手で入れるときのために種類だけ用意してある
      weekly: { sh1: [3, 0, 2, 2, 2, 2, 3], sh2: [3, 0, 2, 2, 2, 2, 3], sh3: [0, 0, 0, 0, 0, 0, 0] },
      overrides: {},
      roleMins: [
        { id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 },
        { id: 'rm2', shiftId: 'sh2', tagId: 'tag1', count: 1 },
        { id: 'rm3', shiftId: 'sh2', tagId: 'tag2', count: 1 },
      ],
    },
    wishes,
    rules: {
      maxConsecutive: 5,
      forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }],
      weeklyDayOff: true,
      weekStart: 1,
      balanceWeekend: true,
      balanceShiftIds: ['sh2'],
    },
    schedule: emptySchedule(),
    carry: null,
  }
}

function pharmacy(year: number, month: number): ShiftPlan {
  const wishes: ShiftPlan['wishes'] = {}
  const d = (weekday: Weekday, n: number) => nthWeekday(year, month, weekday, n)
  wish(wishes, 'st1', d(5, 2), { kind: 'off' })
  wish(wishes, 'st2', d(1, 3), { kind: 'off' })
  wish(wishes, 'st2', d(2, 3), { kind: 'off' })
  wish(wishes, 'st3', d(6, 1), { kind: 'off' })
  wish(wishes, 'st4', d(3, 2), { kind: 'off' })
  wish(wishes, 'st6', d(4, 4), { kind: 'off' })
  wish(wishes, 'st5', d(2, 2), { kind: 'shift', shiftId: 'sh3' })

  return {
    storeName: 'サンプル薬局',
    year,
    month,
    closed: { weekdays: [0], days: [] },
    holidayMode: 'closed',
    shiftTypes: [
      { id: 'sh1', name: '1日', symbol: '日', start: '09:00', end: '18:30', breakMinutes: 60, color: 'tomato' },
      { id: 'sh2', name: '午前', symbol: '前', start: '09:00', end: '13:00', breakMinutes: 0, color: 'egg' },
      { id: 'sh3', name: '午後', symbol: '後', start: '14:00', end: '18:30', breakMinutes: 0, color: 'teal' },
    ],
    tags: [{ id: 'tag1', name: '薬剤師' }],
    staff: [
      staff('st1', '松本', { tagIds: ['tag1'], minDays: 19, maxDays: 22 }),
      staff('st2', '井上', { tagIds: ['tag1'], minDays: 19, maxDays: 22 }),
      // 午前だけの薬剤師
      staff('st3', '木村', { tagIds: ['tag1'], cannotWork: { sh1: ALL_DAYS, sh3: ALL_DAYS }, maxDays: 16 }),
      staff('st4', '林', { minDays: 19, maxDays: 22 }),
      staff('st5', '清水', { fixedOffWeekdays: [6], cannotWork: { sh1: ALL_DAYS }, maxDays: 15 }),
      staff('st6', '山口', { cannotWork: { sh1: ALL_DAYS }, maxDays: 13 }),
    ],
    needs: {
      // 並びは 日・月・火・水・木・金・土。日曜は休み。木曜と土曜は午前だけ開ける
      weekly: { sh1: [0, 2, 2, 2, 0, 2, 0], sh2: [0, 1, 1, 1, 3, 1, 3], sh3: [0, 1, 1, 1, 0, 1, 0] },
      overrides: {},
      roleMins: [
        { id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 },
        { id: 'rm2', shiftId: 'sh2', tagId: 'tag1', count: 1 },
      ],
    },
    wishes,
    rules: {
      maxConsecutive: 5,
      forbiddenPairs: [],
      weeklyDayOff: true,
      weekStart: 0,
      balanceWeekend: true,
      balanceShiftIds: [],
    },
    schedule: emptySchedule(),
    carry: null,
  }
}

/** サンプルの plan を作る。表は空（画面で「組む」を押すと埋まる） */
export function makeSample(id: SampleId, year: number, month: number): ShiftPlan {
  if (id === 'salon') return salon(year, month)
  if (id === 'restaurant') return restaurant(year, month)
  return pharmacy(year, month)
}
