// CSV の書き出し（有料版の機能）。Excel でそのまま開けるように、UTF-8 の BOM 付き・改行は CRLF にする。
import { buildCalendar } from './calendar'
import { formatMonth, WEEKDAY_LABELS } from './dates'
import { shiftAt } from './schedule'
import { summarize } from './stats'
import type { Schedule, ShiftPlan } from './types'

/** 休みのマスに書く文字 */
export const CSV_OFF = '休'
/** 店を開けない日のマスに書く文字 */
export const CSV_CLOSED = '定休'

/**
 * 利用者が入れた文字を、CSV の1マスにする。
 * = + - @ で始まる文字は、Excel が計算式として動かしてしまうことがあるので、頭に ' を付けて文字として読ませる
 * （ほかの人から受け取ったファイルを読み込んで書き出す、という使い方でも安全にするため）。
 */
export function csvText(value: string): string {
  let v = value
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`
  return v
}

/** 見出しに書く勤務の名前。名前が空なら記号、それも空なら「名前のない勤務」（見出しが「の回数」だけにならないように） */
function labelOf(s: { name: string; symbol: string }): string {
  return s.name || s.symbol || '名前のない勤務'
}

/** シフト表を CSV の文字列にする。schedule を省くと、plan に入っている表を書き出す */
export function toCsv(plan: ShiftPlan, schedule: Schedule = plan.schedule): string {
  const calendar = buildCalendar(plan)
  const summary = summarize(plan, schedule, calendar)
  const symbolOf = new Map(plan.shiftTypes.map((s) => [s.id, s.symbol || s.name]))
  const rows: string[][] = []

  rows.push([csvText(plan.storeName || '（店の名前なし）'), formatMonth(plan.year, plan.month)])
  rows.push([])
  rows.push([
    '名前',
    ...calendar.map((d) => `${d.day}(${WEEKDAY_LABELS[d.weekday]}${d.holiday ? '・祝' : ''})`),
    '勤務日数',
    '休みの日数',
    '土日祝の回数',
    ...plan.shiftTypes.map((s) => csvText(`${labelOf(s)}の回数`)),
    '勤務時間（時間）',
  ])
  plan.staff.forEach((st, i) => {
    const sum = summary.staff[i]
    rows.push([
      csvText(st.name),
      ...calendar.map((d) => {
        const id = shiftAt(schedule, st.id, d.day)
        if (id === null) return d.closed ? CSV_CLOSED : CSV_OFF
        return csvText(symbolOf.get(id) ?? '？')
      }),
      String(sum.workDays),
      String(sum.offDays),
      String(sum.weekendHolidayDays),
      ...plan.shiftTypes.map((s) => String(sum.byShift[s.id] ?? 0)),
      // 60で割り切れない分は、小数2けたまで（Excel で合計しやすいよう、数のまま出す）
      String(Math.round((sum.minutes / 60) * 100) / 100),
    ])
  })

  rows.push([])
  plan.shiftTypes.forEach((s, si) => {
    rows.push([csvText(`${labelOf(s)}（必要な人数）`), ...summary.days.map((d) => String(d.slots[si].need))])
    rows.push([csvText(`${labelOf(s)}（入っている人数）`), ...summary.days.map((d) => String(d.slots[si].have))])
  })

  rows.push([])
  rows.push(['記号', '勤務', '時間'])
  for (const s of plan.shiftTypes) rows.push([csvText(s.symbol), csvText(labelOf(s)), `${s.start}〜${s.end}`])

  return '﻿' + rows.map((r) => r.join(',')).join('\r\n') + '\r\n'
}

/** 書き出すファイルの名前 */
export function csvFileName(plan: ShiftPlan): string {
  const store = plan.storeName.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '')
  return `シフト表_${plan.year}年${String(plan.month).padStart(2, '0')}月${store ? `_${store}` : ''}.csv`
}
