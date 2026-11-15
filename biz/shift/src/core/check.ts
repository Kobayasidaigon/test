// 点検。できあがった表（手で直した表も）が、決めた条件に合っているかを調べる。
//
// 自動作成（solver.ts）とは、わざと別に書いている。
// 自動作成の中の計算にまちがいがあっても、ここで見つけられるようにするため（テストで、自動作成の結果を必ずここに通す）。
// そのため、solver.ts の関数は1つも使っていない。使うのは、日ごとの情報（calendar.ts）と日付の計算だけ。
import { buildCalendar, type DayInfo } from './calendar'
import { formatDay, WEEKDAY_LABELS } from './dates'
import { shiftAt } from './schedule'
import type { Schedule, ShiftPlan, Staff } from './types'

/** 必ず守る条件のうち、そのマスに勤務を入れられない理由 */
export type BlockReason =
  /** 店を開けない日 */
  | 'closedDay'
  /** 休み希望が出ている */
  | 'offWish'
  /** 固定の休みの曜日 */
  | 'fixedOff'
  /** その曜日のその勤務には入れない */
  | 'cannotWork'
  /** 月の勤務日数の上限に届いている */
  | 'maxDays'
  /** 連続勤務の上限をこえる */
  | 'maxConsecutive'
  /** 続けて入れない組み合わせになる */
  | 'forbiddenPair'

export type Violation = {
  kind: BlockReason
  staffId: string
  /** 印を付けるマスの日。月の勤務日数の上限のように、行ぜんたいの話なら空 */
  days: number[]
  /** 画面に出す文 */
  message: string
}

export type Shortage = { day: number; shiftId: string; need: number; have: number; missing: number }
export type RoleShortage = { day: number; shiftId: string; tagId: string; roleMinId: string; need: number; have: number; missing: number }
export type Surplus = { day: number; shiftId: string; need: number; have: number; extra: number }
export type MinDaysShort = { staffId: string; count: number; min: number; message: string }
export type WishUnmet = { staffId: string; day: number; wishedShiftId: string; actualShiftId: string | null; message: string }
export type WeekWithoutOff = { staffId: string; days: number[]; message: string }

export type CheckReport = {
  /** 必ず守る条件の違反。0件なら空 */
  violations: Violation[]
  /** 必要な人数に足りないところ */
  shortages: Shortage[]
  /** 役割の最低人数に足りないところ */
  roleShortages: RoleShortage[]
  /** 必要な人数より多いところ */
  surpluses: Surplus[]
  /** 月の勤務日数の下限に届いていない人 */
  minDaysShort: MinDaysShort[]
  /** かなわなかった「この勤務に入りたい」 */
  wishesUnmet: WishUnmet[]
  /** 1日も休みがない週（毎週1日の休みを選んでいるときだけ調べる） */
  weeksWithoutOff: WeekWithoutOff[]
  /** 足りない人数の合計（のべ）。必要な人数の不足と、役割の不足を足した数 */
  missingTotal: number
  /** 必ず守る条件の違反が0件なら true */
  ok: boolean
  /** 点検結果のまとめ（そのまま画面に出せる文の一覧。0件のときも「0件」と言う） */
  summary: string[]
  /**
   * summary と同じ文に、調子を付けたもの（画面で、色と印を出し分けるのに使う）。
   * ok = 問題なし（0件）、bad = 直したほうがよい（違反、人数の不足）、note = 知らせるだけ（なるべく満たす条件）
   */
  summaryItems: SummaryItem[]
}

export type SummaryItem = { text: string; tone: 'ok' | 'bad' | 'note' }

/** 点検に使う、スタッフごとの下ごしらえ */
type Row = {
  staff: Staff
  /** 添字は day - 1。入っている勤務の種類の id、休みなら null */
  cells: Array<string | null>
  /** 前の月の終わりの勤務（古い順）。引き継ぎがなければ空 */
  tail: Array<string | null>
}

function buildRows(plan: ShiftPlan, schedule: Schedule, calendar: DayInfo[]): Row[] {
  return plan.staff.map((staff) => ({
    staff,
    cells: calendar.map((d) => shiftAt(schedule, staff.id, d.day)),
    tail: plan.carry?.tail[staff.id] ?? [],
  }))
}

/** 前の月の終わりから続いている、連続勤務の日数 */
function tailRun(tail: Array<string | null>): number {
  let n = 0
  for (let i = tail.length - 1; i >= 0 && tail[i] !== null; i--) n++
  return n
}

function nameOf(staff: Staff): string {
  return `${staff.name || '（名前なし）'}さん`
}

function shiftName(plan: ShiftPlan, shiftId: string | null): string {
  if (shiftId === null) return '休み'
  const s = plan.shiftTypes.find((x) => x.id === shiftId)
  if (!s) return '（消した勤務）'
  // 名前が空の勤務は、記号で言う。記号も空なら、そう言う（文の中で、何も書かれないままにしない）
  return s.name || s.symbol || '（名前のない勤務）'
}

/**
 * 表を点検する。schedule を省くと、plan に入っている表を調べる。
 */
export function checkPlan(plan: ShiftPlan, schedule: Schedule = plan.schedule): CheckReport {
  const calendar = buildCalendar(plan)
  const rows = buildRows(plan, schedule, calendar)
  const dayText = (day: number) => formatDay(plan.year, plan.month, day)
  const violations: Violation[] = []

  for (const row of rows) {
    const { staff, cells } = row
    const who = nameOf(staff)
    const wishes = plan.wishes[staff.id] ?? {}

    // 1マスずつ見ればわかる条件
    for (const d of calendar) {
      const shiftId = cells[d.day - 1]
      if (shiftId === null) continue
      const sName = shiftName(plan, shiftId)
      if (d.closed) {
        violations.push({ kind: 'closedDay', staffId: staff.id, days: [d.day], message: `${who}: ${dayText(d.day)}は店を開けない日ですが、${sName}が入っています。` })
      }
      if (wishes[String(d.day)]?.kind === 'off') {
        violations.push({ kind: 'offWish', staffId: staff.id, days: [d.day], message: `${who}: ${dayText(d.day)}は休み希望ですが、${sName}が入っています。` })
      }
      if (staff.fixedOffWeekdays.includes(d.weekday)) {
        violations.push({ kind: 'fixedOff', staffId: staff.id, days: [d.day], message: `${who}: ${WEEKDAY_LABELS[d.weekday]}曜日は固定の休みですが、${dayText(d.day)}に${sName}が入っています。` })
      } else if (staff.cannotWork[shiftId]?.includes(d.weekday)) {
        violations.push({ kind: 'cannotWork', staffId: staff.id, days: [d.day], message: `${who}: ${WEEKDAY_LABELS[d.weekday]}曜日の${sName}には入れない設定ですが、${dayText(d.day)}に入っています。` })
      }
    }

    // 連続勤務の上限。前の月の終わりから続いているぶんも数える
    const limit = plan.rules.maxConsecutive
    if (limit !== null) {
      const carried = tailRun(row.tail)
      let run = carried
      let start = 1
      const flush = (endDay: number) => {
        // endDay は、続きの最後の日。run が上限をこえていたら、こえたぶんの日に印を付ける
        if (run > limit && endDay >= 1) {
          const fromPrev = start === 1 ? carried : 0
          const firstOver = Math.max(1, start + limit - fromPrev)
          const days: number[] = []
          for (let day = firstOver; day <= endDay; day++) days.push(day)
          const span = start === endDay ? dayText(start) : `${dayText(start)}から${dayText(endDay)}まで`
          const prevText = fromPrev > 0 ? `前の月の終わりの${fromPrev}日と合わせて、` : ''
          violations.push({
            kind: 'maxConsecutive',
            staffId: staff.id,
            days,
            message: `${who}: ${prevText}${span}、${run}日続けて勤務です（上限は${limit}日）。`,
          })
        }
      }
      for (const d of calendar) {
        if (cells[d.day - 1] !== null) {
          if (run === 0) start = d.day
          run++
        } else {
          flush(d.day - 1)
          run = 0
        }
      }
      flush(calendar.length)
    }

    // 続けて入れない組み合わせ。1日は、前の月の末日の勤務と組にして見る
    for (const d of calendar) {
      const today = cells[d.day - 1]
      if (today === null) continue
      const before = d.day === 1 ? (row.tail.length > 0 ? row.tail[row.tail.length - 1] : null) : cells[d.day - 2]
      if (before === null) continue
      if (plan.rules.forbiddenPairs.some((p) => p.first === before && p.next === today)) {
        const prevText = d.day === 1 ? '前の月の末日' : dayText(d.day - 1)
        violations.push({
          kind: 'forbiddenPair',
          staffId: staff.id,
          days: d.day === 1 ? [1] : [d.day - 1, d.day],
          message: `${who}: ${prevText}の${shiftName(plan, before)}の次の日（${dayText(d.day)}）に、${shiftName(plan, today)}が入っています。`,
        })
      }
    }

    // 月の勤務日数の上限
    const count = cells.filter((c) => c !== null).length
    if (staff.maxDays !== null && count > staff.maxDays) {
      violations.push({ kind: 'maxDays', staffId: staff.id, days: [], message: `${who}: 勤務が${count}日です（上限は${staff.maxDays}日）。` })
    }
  }

  // ここから下は「なるべく満たす」条件。違反ではなく、知らせるだけ
  const shortages: Shortage[] = []
  const surpluses: Surplus[] = []
  const roleShortages: RoleShortage[] = []
  for (const d of calendar) {
    for (const st of plan.shiftTypes) {
      const need = d.needs[st.id] ?? 0
      const on = rows.filter((r) => r.cells[d.day - 1] === st.id)
      const have = on.length
      if (have < need) shortages.push({ day: d.day, shiftId: st.id, need, have, missing: need - have })
      if (have > need) surpluses.push({ day: d.day, shiftId: st.id, need, have, extra: have - need })
      if (need <= 0) continue
      // 役割の最低人数は、その日その勤務に人が要るときだけ調べる
      for (const rm of plan.needs.roleMins) {
        if (rm.shiftId !== st.id) continue
        const tagged = on.filter((r) => r.staff.tagIds.includes(rm.tagId)).length
        if (tagged < rm.count) {
          roleShortages.push({ day: d.day, shiftId: st.id, tagId: rm.tagId, roleMinId: rm.id, need: rm.count, have: tagged, missing: rm.count - tagged })
        }
      }
    }
  }

  const minDaysShort: MinDaysShort[] = []
  const wishesUnmet: WishUnmet[] = []
  const weeksWithoutOff: WeekWithoutOff[] = []
  for (const row of rows) {
    const { staff, cells } = row
    const who = nameOf(staff)
    const count = cells.filter((c) => c !== null).length
    if (staff.minDays !== null && count < staff.minDays) {
      minDaysShort.push({ staffId: staff.id, count, min: staff.minDays, message: `${who}: 勤務が${count}日で、下限の${staff.minDays}日に${staff.minDays - count}日足りません。` })
    }

    for (const [dayKey, wish] of Object.entries(plan.wishes[staff.id] ?? {})) {
      const day = Number(dayKey)
      if (wish.kind !== 'shift' || day < 1 || day > calendar.length) continue
      const actual = cells[day - 1]
      if (actual !== wish.shiftId) {
        wishesUnmet.push({
          staffId: staff.id,
          day,
          wishedShiftId: wish.shiftId,
          actualShiftId: actual,
          message: `${who}: ${dayText(day)}は${shiftName(plan, wish.shiftId)}の希望でしたが、${shiftName(plan, actual)}になっています。`,
        })
      }
    }

    if (plan.rules.weeklyDayOff) {
      // 週は weekStart の曜日から7日。7日ぜんぶの勤務がわかる週だけ調べる
      // （月の終わりで切れる週は、次の月がまだないので調べない。次の月に引き継いだときに、次の月の側で調べる）
      const tail = row.tail
      const at = (offset: number): string | null | undefined => {
        // offset は 1日を 0 とした通し番号。負の数は前の月
        if (offset >= 0) return offset < cells.length ? cells[offset] : undefined
        const i = tail.length + offset
        return i >= 0 ? tail[i] : undefined
      }
      const firstWeekday = calendar[0].weekday
      const back = (firstWeekday - plan.rules.weekStart + 7) % 7
      for (let start = -back; start + 6 < cells.length; start += 7) {
        let allWork = true
        for (let i = 0; i < 7; i++) {
          const v = at(start + i)
          if (v === undefined || v === null) {
            allWork = false
            break
          }
        }
        if (!allWork) continue
        const days: number[] = []
        for (let i = 0; i < 7; i++) if (start + i >= 0) days.push(start + i + 1)
        const head = start < 0 ? '前の月の終わりから' : `${dayText(days[0])}から`
        weeksWithoutOff.push({ staffId: staff.id, days, message: `${who}: ${head}${dayText(days[days.length - 1])}までの週に、休みが1日もありません。` })
      }
    }
  }

  const missingTotal = shortages.reduce((n, s) => n + s.missing, 0) + roleShortages.reduce((n, s) => n + s.missing, 0)

  const summaryItems: SummaryItem[] = []
  summaryItems.push(
    violations.length === 0
      ? { tone: 'ok', text: '必ず守る条件（休み希望、定休日、連勤の上限など）の違反は、0件です。' }
      : { tone: 'bad', text: `必ず守る条件に合わないところが、${violations.length}件あります。` },
  )
  summaryItems.push(
    shortages.length === 0
      ? { tone: 'ok', text: '必要な人数は、すべての日でそろっています（不足は0件）。' }
      : { tone: 'bad', text: `人数が足りないところが、${shortages.length}か所あります（のべ${shortages.reduce((n, s) => n + s.missing, 0)}人）。` },
  )
  if (plan.needs.roleMins.length > 0) {
    summaryItems.push(
      roleShortages.length === 0
        ? { tone: 'ok', text: '役割の最低人数は、すべてそろっています（不足は0件）。' }
        : { tone: 'bad', text: `役割の最低人数が足りないところが、${roleShortages.length}か所あります。` },
    )
  }
  if (minDaysShort.length > 0) summaryItems.push({ tone: 'note', text: `勤務日数が下限に届いていない人が、${minDaysShort.length}人います。` })
  if (wishesUnmet.length > 0) summaryItems.push({ tone: 'note', text: `かなわなかった勤務の希望が、${wishesUnmet.length}件あります。` })
  if (weeksWithoutOff.length > 0) summaryItems.push({ tone: 'note', text: `休みが1日もない週が、${weeksWithoutOff.length}件あります。` })
  const summary = summaryItems.map((x) => x.text)

  return {
    violations,
    shortages,
    roleShortages,
    surpluses,
    minDaysShort,
    wishesUnmet,
    weeksWithoutOff,
    missingTotal,
    ok: violations.length === 0,
    summary,
    summaryItems,
  }
}

/**
 * マスごとの違反の文をまとめる。キーは `${staffId}:${day}`。
 * 表のマスに印を付けるときに使う。
 */
export function violationsByCell(report: CheckReport): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const v of report.violations) {
    for (const day of v.days) {
      const k = `${v.staffId}:${day}`
      const list = map.get(k)
      if (list) list.push(v.message)
      else map.set(k, [v.message])
    }
  }
  return map
}

/**
 * 「このスタッフの、この日に、この勤務を入れたら」必ず守る条件のどれに当たるかを返す。空なら入れられる。
 * いまそのマスに入っているものは、入れ替えるものとして数える。
 * 画面で、マスを押したときの選択肢に注意を出すのに使える。組めない理由の説明（explain.ts）もこれを使う。
 */
export function whyNot(plan: ShiftPlan, schedule: Schedule, staffId: string, day: number, shiftId: string, calendar: DayInfo[] = buildCalendar(plan)): BlockReason[] {
  const staff = plan.staff.find((s) => s.id === staffId)
  const d = calendar[day - 1]
  if (!staff || !d) return []
  const reasons: BlockReason[] = []
  if (d.closed) reasons.push('closedDay')
  if (plan.wishes[staffId]?.[String(day)]?.kind === 'off') reasons.push('offWish')
  if (staff.fixedOffWeekdays.includes(d.weekday)) reasons.push('fixedOff')
  else if (staff.cannotWork[shiftId]?.includes(d.weekday)) reasons.push('cannotWork')

  const cells = calendar.map((c) => shiftAt(schedule, staffId, c.day))
  const tail = plan.carry?.tail[staffId] ?? []
  const wasOff = cells[day - 1] === null

  if (wasOff && staff.maxDays !== null) {
    const count = cells.filter((c) => c !== null).length
    if (count + 1 > staff.maxDays) reasons.push('maxDays')
  }

  if (plan.rules.maxConsecutive !== null) {
    let run = 1
    let i = day - 2
    while (i >= 0 && cells[i] !== null) {
      run++
      i--
    }
    // 1日までずっと勤務なら、前の月の終わりにつなげる
    if (i < 0) run += tailRun(tail)
    for (let j = day; j < cells.length && cells[j] !== null; j++) run++
    if (run > plan.rules.maxConsecutive) reasons.push('maxConsecutive')
  }

  const before = day === 1 ? (tail.length > 0 ? tail[tail.length - 1] : null) : cells[day - 2]
  const after = day < cells.length ? cells[day] : null
  const pairs = plan.rules.forbiddenPairs
  if ((before !== null && pairs.some((p) => p.first === before && p.next === shiftId)) || (after !== null && pairs.some((p) => p.first === shiftId && p.next === after))) {
    reasons.push('forbiddenPair')
  }
  return reasons
}
