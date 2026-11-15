// 翌月への引き継ぎ（有料版の機能）。
// スタッフと条件をそのまま次の月へ持っていき、前の月の勤務を「carry」として残す。
// 点検と自動作成は、carry を見て、月をまたぐ連勤・続けて入れない組み合わせ・週1日の休みを数える。
import { daysInMonth, formatMonth, nextMonth } from './dates'
import { emptySchedule, isScheduleEmpty, shiftAt } from './schedule'
import { LIMITS, type Carry, type ShiftPlan } from './types'

/**
 * 前の月の終わりの、最大で何日ぶんを持っていくか。
 * 連勤の上限は 31日まで入れられるので、31日ぶん（前の月をまるごと）持っていく。
 * 14日ぶんにしていたときは、上限が15日以上の店で、月をまたぐ連勤を数えそこなっていた。
 * 保存の検査の上限（LIMITS.carryTail）と同じ数。
 */
export const CARRY_TAIL_DAYS = LIMITS.carryTail

/**
 * 次の月の plan を作る。
 * 持っていくもの: 店の名前、定休日の曜日、祝日のあつかい、勤務の種類、役割の札、スタッフ、曜日ごとの必要人数、役割の最低人数、条件。
 * 持っていかないもの: 個別の定休日、日ごとの上書き、希望、表（日付にひもづくもの）。
 * 表が空のとき（まだ組んでいないとき）は、前の月の勤務を持たない（「全員ずっと休みだった」ことにしないため）。
 */
export function carryToNextMonth(plan: ShiftPlan): ShiftPlan {
  const next = nextMonth(plan.year, plan.month)
  let carry: Carry | null = null
  if (!isScheduleEmpty(plan.schedule)) {
    const total = daysInMonth(plan.year, plan.month)
    // いまの plan が、すぐ前の月から引き継いだものなら、その終わりの勤務もつなげて数える。
    // 月が 31日より短いとき（2月など）に、月をまるごと勤務した人の連勤を、短く数えないため
    const before = plan.carry && nextMonth(plan.carry.year, plan.carry.month).year === plan.year && nextMonth(plan.carry.year, plan.carry.month).month === plan.month ? plan.carry.tail : null
    const tail: Carry['tail'] = {}
    for (const st of plan.staff) {
      const days: Array<string | null> = []
      for (let day = 1; day <= total; day++) days.push(shiftAt(plan.schedule, st.id, day))
      // 前の月のぶんを足すのは、今月に休みが1日もなかった人だけ（休みがあれば、連勤はそこで切れている）
      const earlier = before && !days.includes(null) ? (before[st.id] ?? []) : []
      tail[st.id] = [...earlier, ...days].slice(-CARRY_TAIL_DAYS)
    }
    carry = { year: plan.year, month: plan.month, tail }
  }
  return {
    ...plan,
    year: next.year,
    month: next.month,
    closed: { weekdays: [...plan.closed.weekdays], days: [] },
    needs: { ...plan.needs, overrides: {} },
    wishes: {},
    schedule: emptySchedule(),
    carry,
  }
}

export type CarryRun = {
  staffId: string
  /** 前の月の終わりに、何日続けて勤務していたか */
  run: number
  /** 前の月の末日に入っていた勤務の種類の id。休みなら null */
  lastShiftId: string | null
}

/** 前の月の終わりの様子（画面で「前の月から続いている勤務」を見せるのに使う）。引き継ぎがなければ空 */
export function carryRuns(plan: ShiftPlan): CarryRun[] {
  if (!plan.carry) return []
  return plan.staff.map((st) => {
    const tail = plan.carry!.tail[st.id] ?? []
    let run = 0
    for (let i = tail.length - 1; i >= 0 && tail[i] !== null; i--) run++
    return { staffId: st.id, run, lastShiftId: tail.length > 0 ? tail[tail.length - 1] : null }
  })
}

/** 引き継ぎについての説明の文。引き継ぎがなければ null */
export function carryNote(plan: ShiftPlan): string | null {
  if (!plan.carry) return null
  return `${formatMonth(plan.carry.year, plan.carry.month)}の終わりの勤務を引き継いでいます。月をまたぐ連勤も数えます。`
}
