// 集計。表の右に出す「スタッフごとの集計」と、下に出す「日ごとの過不足」を作る。
import { buildCalendar, type DayInfo } from './calendar'
import { parseTime } from './dates'
import { shiftAt } from './schedule'
import type { Schedule, ShiftPlan, ShiftType } from './types'

/** 1回の勤務の長さ（分）。休憩を引いたもの。終了が開始と同じか前なら、次の日にまたがるとみなす */
export function shiftMinutes(shift: ShiftType): number {
  const start = parseTime(shift.start)
  const end = parseTime(shift.end)
  if (start === null || end === null) return 0
  const span = end > start ? end - start : end + 24 * 60 - start
  return Math.max(0, span - Math.max(0, shift.breakMinutes))
}

/** 分を「152時間30分」の形にする */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

export type StaffSummary = {
  staffId: string
  /** 勤務日数 */
  workDays: number
  /** 休みの日数（月の日数 − 勤務日数。定休日もふくむ） */
  offDays: number
  /** 土曜・日曜・祝日に入った回数 */
  weekendHolidayDays: number
  /** 勤務の種類ごとの回数。キーは勤務の種類の id（0回のものも入る） */
  byShift: Record<string, number>
  /** 勤務時間の合計（分）。休憩を引いたもの */
  minutes: number
}

export type DaySlot = {
  shiftId: string
  need: number
  have: number
  /** have − need。負なら不足、正なら多い */
  diff: number
}

export type DaySummary = {
  day: number
  /** 勤務の種類ごとの過不足（plan.shiftTypes と同じ順） */
  slots: DaySlot[]
  /** その日に入っている人数の合計 */
  totalHave: number
  /** その日の必要人数の合計 */
  totalNeed: number
}

export type Summary = {
  /** plan.staff と同じ順 */
  staff: StaffSummary[]
  /** 1日から末日まで */
  days: DaySummary[]
  /** のべの勤務日数（全員の合計） */
  totalWorkDays: number
  /** のべの必要人数（全部の日の合計） */
  totalNeed: number
}

/** 集計する。schedule を省くと、plan に入っている表を集計する */
export function summarize(plan: ShiftPlan, schedule: Schedule = plan.schedule, calendar: DayInfo[] = buildCalendar(plan)): Summary {
  const minutesOf = new Map(plan.shiftTypes.map((s) => [s.id, shiftMinutes(s)]))

  const staff: StaffSummary[] = plan.staff.map((st) => {
    const byShift: Record<string, number> = {}
    for (const s of plan.shiftTypes) byShift[s.id] = 0
    let workDays = 0
    let weekendHolidayDays = 0
    let minutes = 0
    for (const d of calendar) {
      const id = shiftAt(schedule, st.id, d.day)
      if (id === null) continue
      workDays++
      if (d.isWeekendOrHoliday) weekendHolidayDays++
      if (id in byShift) byShift[id]++
      minutes += minutesOf.get(id) ?? 0
    }
    return { staffId: st.id, workDays, offDays: calendar.length - workDays, weekendHolidayDays, byShift, minutes }
  })

  const days: DaySummary[] = calendar.map((d) => {
    const slots: DaySlot[] = plan.shiftTypes.map((s) => {
      const have = plan.staff.filter((st) => shiftAt(schedule, st.id, d.day) === s.id).length
      const need = d.needs[s.id] ?? 0
      return { shiftId: s.id, need, have, diff: have - need }
    })
    return {
      day: d.day,
      slots,
      totalHave: slots.reduce((n, s) => n + s.have, 0),
      totalNeed: slots.reduce((n, s) => n + s.need, 0),
    }
  })

  return {
    staff,
    days,
    totalWorkDays: staff.reduce((n, s) => n + s.workDays, 0),
    totalNeed: days.reduce((n, d) => n + d.totalNeed, 0),
  }
}
