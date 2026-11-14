// 日付の計算。端末の時刻帯に左右されないよう、すべて UTC の暦で数える。
import type { Weekday } from './types'

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** その月の日数（month は 1〜12） */
export function daysInMonth(year: number, month: number): number {
  // 次の月の「0日」は、この月の末日
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** 曜日（0 = 日曜）。month は 1〜12 */
export function weekdayOf(year: number, month: number, day: number): Weekday {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** today（'YYYY-MM-DD'）の次の月。最初に開いたときの「来月」を決めるのに使う */
export function nextMonthOf(today: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today)
  if (!m) throw new Error(`日付の形が正しくありません: ${today}`)
  return nextMonth(Number(m[1]), Number(m[2]))
}

/** 端末の暦での今日を 'YYYY-MM-DD' で返す（画面から呼ぶ。テストでは日付を直接わたす） */
export function localToday(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** 'HH:MM' を、0時からの分にする。形が合わなければ null */
export function parseTime(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** 「12月5日（土）」の形 */
export function formatDay(year: number, month: number, day: number): string {
  return `${month}月${day}日（${WEEKDAY_LABELS[weekdayOf(year, month, day)]}）`
}

/** 「2026年12月」の形 */
export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`
}
