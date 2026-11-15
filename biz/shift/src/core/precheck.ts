// 組む前の下見。入力に「このままでは組めない」「組んでも必ず足りなくなる」ところがないかを、先に言う。
// 自動作成を回さなくてもわかることだけを調べる（速い。入力のたびに呼んでよい）。
import { buildCalendar } from './calendar'
import type { ShiftPlan } from './types'

export type Precheck = {
  /** これがあるうちは、自動作成を始められない */
  blockers: string[]
  /** 組めるが、先に知っておいたほうがよいこと */
  warnings: string[]
}

export function precheck(plan: ShiftPlan): Precheck {
  const blockers: string[] = []
  const warnings: string[] = []
  const calendar = buildCalendar(plan)

  if (plan.staff.length === 0) blockers.push('スタッフが、まだ1人も入っていません。①でスタッフを入れてください。')
  if (plan.shiftTypes.length === 0) blockers.push('勤務の種類が、まだありません。①で勤務の種類を入れてください。')
  const totalNeed = calendar.reduce((n, d) => n + Object.values(d.needs).reduce((a, b) => a + b, 0), 0)
  if (plan.shiftTypes.length > 0 && totalNeed === 0) blockers.push('必要な人数が、すべて0人です。②で、曜日ごとの必要な人数を入れてください。')
  if (blockers.length > 0) return { blockers, warnings }

  for (const s of plan.shiftTypes) {
    if (s.name === '' || s.symbol === '') warnings.push(`勤務の種類に、名前か記号が空のものがあります（${s.name || s.symbol || '名前なし'}）。表で見分けられないので、入れてください。`)
  }
  const symbols = plan.shiftTypes.map((s) => s.symbol).filter((x) => x !== '')
  const dup = symbols.find((x, i) => symbols.indexOf(x) !== i)
  if (dup) warnings.push(`記号「${dup}」が、2つの勤務で使われています。表で見分けられないので、別の記号にしてください。`)

  // 名前が空の人、同じ名前の人がいると、表でも、点検の文でも、だれのことか見分けられない
  const unnamed = plan.staff.filter((st) => st.name.trim() === '').length
  if (unnamed > 0) warnings.push(`名前が空のスタッフが、${unnamed}人います。表で見分けられないので、①で名前を入れてください。`)
  const nameCount = new Map<string, number>()
  for (const st of plan.staff) {
    const n = st.name.trim()
    if (n !== '') nameCount.set(n, (nameCount.get(n) ?? 0) + 1)
  }
  const sameNames = [...nameCount].filter(([, c]) => c > 1).map(([n]) => n)
  if (sameNames.length > 0) warnings.push(`同じ名前のスタッフがいます（${sameNames.join('、')}）。表や点検の文で見分けられないので、①で「佐藤（花）」のように、ちがう名前にしてください。`)

  for (const st of plan.staff) {
    if (st.minDays !== null && st.maxDays !== null && st.minDays > st.maxDays) {
      warnings.push(`${st.name || '（名前なし）'}さんの勤務日数は、下限（${st.minDays}日）が上限（${st.maxDays}日）より大きくなっています。`)
    }
  }

  for (const rm of plan.needs.roleMins) {
    if (!plan.staff.some((s) => s.tagIds.includes(rm.tagId))) {
      const tag = plan.tags.find((t) => t.id === rm.tagId)?.name ?? '（消した札）'
      warnings.push(`「${tag}」の札を持つスタッフがいません。この役割の最低人数は、満たせません。`)
    }
  }

  // 全員が上限いっぱいまで入っても、必要な人数に届かないなら、どこかが必ず足りなくなる
  let capacity = 0
  for (const st of plan.staff) {
    const wishes = plan.wishes[st.id] ?? {}
    let days = 0
    for (const d of calendar) {
      if (d.closed || wishes[String(d.day)]?.kind === 'off' || st.fixedOffWeekdays.includes(d.weekday)) continue
      if (plan.shiftTypes.some((s) => (d.needs[s.id] ?? 0) > 0 && !st.cannotWork[s.id]?.includes(d.weekday))) days++
    }
    capacity += st.maxDays === null ? days : Math.min(days, st.maxDays)
  }
  if (capacity < totalNeed) {
    warnings.push(`必要な人数は、1か月で、のべ${totalNeed}人ぶんです。全員が入れるだけ入っても、のべ${capacity}人ぶんにしかなりません。どこかが必ず足りなくなります。`)
  }
  return { blockers, warnings }
}
