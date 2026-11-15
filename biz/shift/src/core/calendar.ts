// 1か月ぶんの「日ごとの情報」を作る。
// 定休日・祝日・必要な人数の決まりを、ここで1つにまとめる。点検も自動作成も集計も、これを見る。
import { daysInMonth, weekdayOf } from './dates'
import { holidaysInMonth } from './holidays'
import type { ShiftPlan, Weekday } from './types'

/** その日が休み（店を開けない日）である理由 */
export type ClosedReason =
  /** 個別に決めた定休日 */
  | 'date'
  /** 定休日の曜日 */
  | 'weekday'
  /** 祝日が休みになる設定（「休みにする」か、「日曜と同じ」で日曜が定休日） */
  | 'holiday'

export type DayInfo = {
  day: number
  weekday: Weekday
  /** 祝日の名前。祝日でなければ null */
  holiday: string | null
  /** 祝日の日付が見込み（春分・秋分の発表がまだ）なら true */
  holidayProvisional: boolean
  /** 土曜・日曜・祝日のどれかなら true（回数の公平さと集計に使う） */
  isWeekendOrHoliday: boolean
  /** 店を開けない日なら、その理由。開ける日は null */
  closed: ClosedReason | null
  /** その日の必要人数。キーは勤務の種類の id。開けない日はすべて 0 */
  needs: Record<string, number>
  /** 日ごとの上書きが効いている日なら true */
  overridden: boolean
  /** 必要人数に、どの曜日の列を使ったか。祝日を日曜あつかいにした日は 0 になる */
  needsFrom: Weekday
}

/**
 * 祝日が休みになる設定か。
 * 「休みにする」のほか、「日曜と同じ人数」で日曜が定休日のときも、休みになる（日曜と同じ ＝ 休み）。
 * 定休日の曜日の人数は画面に出ない（直せない）ので、その数で祝日を開けると、どこから来た人数かがわからなくなる。
 */
export function holidaysClosed(plan: Pick<ShiftPlan, 'holidayMode' | 'closed'>): boolean {
  return plan.holidayMode === 'closed' || (plan.holidayMode === 'sunday' && plan.closed.weekdays.includes(0))
}

/**
 * 日ごとの情報を、1日から末日まで順に返す（添字は day - 1）。
 *
 * 決まりの強さの順:
 *   1. 個別の定休日（closed.days）… いちばん強い。必ず休み。
 *   2. 日ごとの上書き（needs.overrides）… 定休日の曜日や祝日でも、書いてあれば開ける日になる。
 *   3. 定休日の曜日（closed.weekdays）
 *   4. 祝日（holidayMode）。「日曜と同じ」で日曜が定休日なら、祝日も休み（holidaysClosed）
 *   5. 曜日ごとの必要人数（needs.weekly）
 * 「個別に決めたことは、曜日の決まりより強い」という1つの考え方でそろえている。
 */
export function buildCalendar(plan: ShiftPlan): DayInfo[] {
  const total = daysInMonth(plan.year, plan.month)
  const holidays = holidaysInMonth(plan.year, plan.month)
  const closedDays = new Set(plan.closed.days)
  const closedWeekdays = new Set<number>(plan.closed.weekdays)
  const holidayClosed = holidaysClosed(plan)
  const out: DayInfo[] = []

  for (let day = 1; day <= total; day++) {
    const weekday = weekdayOf(plan.year, plan.month, day)
    const h = holidays.get(day) ?? null
    const override = plan.needs.overrides[String(day)]
    const hasOverride = !!override && Object.keys(override).length > 0

    let closed: ClosedReason | null = null
    if (closedDays.has(day)) closed = 'date'
    else if (hasOverride) closed = null
    else if (closedWeekdays.has(weekday)) closed = 'weekday'
    else if (h && holidayClosed) closed = 'holiday'

    // 上書きで開けた「本来は休みの日」は、曜日の人数を引き継がない（0 から始めて、書いた勤務だけ人数が入る）
    const wouldBeClosed = closedWeekdays.has(weekday) || (!!h && holidayClosed)
    const needsFrom: Weekday = h && plan.holidayMode === 'sunday' ? 0 : weekday

    const needs: Record<string, number> = {}
    for (const st of plan.shiftTypes) {
      let n = 0
      if (!closed) {
        if (!wouldBeClosed) n = plan.needs.weekly[st.id]?.[needsFrom] ?? 0
        if (hasOverride && typeof override[st.id] === 'number') n = override[st.id]
      }
      needs[st.id] = n
    }

    out.push({
      day,
      weekday,
      holiday: h ? h.name : null,
      holidayProvisional: h ? h.provisional : false,
      isWeekendOrHoliday: weekday === 0 || weekday === 6 || !!h,
      closed,
      needs,
      overridden: !closed && hasOverride,
      needsFrom,
    })
  }
  return out
}

/** 開ける日の数 */
export function openDayCount(calendar: DayInfo[]): number {
  return calendar.filter((d) => !d.closed).length
}
