// 組めないときの説明と、条件をゆるめる提案。
//
// 説明: 足りないマスごとに、「なぜ、ほかの人を入れられないか」を1人ずつ調べて、理由ごとに数える。
// 提案: 条件を1つゆるめた状態で、実際に組み直す。組み直した結果で不足が減ったものだけを出す。
//       確かめていない提案は出さない（仕様書の決まり）。提案には、組み直した結果そのものを付けるので、
//       画面はそれをそのまま採用できる（「言ったとおりにならない」ことが起きない）。
import { buildCalendar } from './calendar'
import { checkPlan, whyNot, type BlockReason, type CheckReport } from './check'
import { formatDay } from './dates'
import { countLocked, isLocked, shiftAt, unlockAll } from './schedule'
import { solve } from './solver'
import type { Schedule, ShiftPlan } from './types'

/** そのスタッフを、足りないマスに入れられない理由 */
export type SlotReason =
  | BlockReason
  /** 手で固定したマスなので、動かさない */
  | 'locked'
  /** 同じ日の、別の勤務に入っている */
  | 'otherShift'
  /** 入れられる（手で直した表でだけ出る。自動作成の直後には出ない） */
  | 'free'

/** 理由の言い方。「休み希望3人」のように、後ろに人数を付けて使う */
export const REASON_LABELS: Record<SlotReason, string> = {
  closedDay: '店を開けない日',
  offWish: '休み希望',
  fixedOff: '固定の休み',
  cannotWork: 'この勤務に入れない人',
  locked: '手で固定したマスの人',
  otherShift: '同じ日の別の勤務に入っている人',
  maxDays: '勤務日数の上限に届いている人',
  maxConsecutive: '連勤の上限',
  forbiddenPair: '続けて入れない組み合わせ',
  free: '入れられる人',
}

/** 理由を数える順番（先にあるものほど、動かしようのない理由） */
const REASON_ORDER: SlotReason[] = ['offWish', 'fixedOff', 'cannotWork', 'closedDay', 'locked', 'otherShift', 'maxDays', 'maxConsecutive', 'forbiddenPair', 'free']

export type SlotExplanation = {
  day: number
  shiftId: string
  /** 役割の不足の説明なら、その札の id。人数の不足なら null */
  tagId: string | null
  need: number
  have: number
  missing: number
  /** 理由ごとの人数。人数が0の理由は入らない */
  reasons: Array<{ reason: SlotReason; staffIds: string[] }>
  /** そのまま画面に出せる文 */
  text: string
}

function reasonFor(plan: ShiftPlan, schedule: Schedule, calendar: ReturnType<typeof buildCalendar>, staffId: string, day: number, shiftId: string): SlotReason {
  const hard = whyNot(plan, schedule, staffId, day, shiftId, calendar)
  for (const r of ['offWish', 'fixedOff', 'cannotWork', 'closedDay'] as const) if (hard.includes(r)) return r
  if (isLocked(schedule, staffId, day)) return 'locked'
  const now = shiftAt(schedule, staffId, day)
  if (now !== null && now !== shiftId) return 'otherShift'
  for (const r of ['maxDays', 'maxConsecutive', 'forbiddenPair'] as const) if (hard.includes(r)) return r
  return 'free'
}

/**
 * 足りないところを、理由つきで説明する。
 * 人数の不足（tagId が null）と、役割の不足（tagId あり）の両方を、日の順に返す。
 */
export function explainShortages(plan: ShiftPlan, schedule: Schedule = plan.schedule, report: CheckReport = checkPlan(plan, schedule)): SlotExplanation[] {
  const calendar = buildCalendar(plan)
  const shiftName = (id: string) => {
    const s = plan.shiftTypes.find((x) => x.id === id)
    return s ? s.name || s.symbol || '（名前のない勤務）' : '（消した勤務）'
  }
  const tagName = (id: string) => plan.tags.find((t) => t.id === id)?.name ?? '（消した札）'
  const staffName = (id: string) => `${plan.staff.find((s) => s.id === id)?.name || '（名前なし）'}さん`
  const out: SlotExplanation[] = []

  const build = (day: number, shiftId: string, tagId: string | null, need: number, have: number) => {
    const groups = new Map<SlotReason, string[]>()
    for (const staff of plan.staff) {
      if (shiftAt(schedule, staff.id, day) === shiftId) continue
      // 役割の不足は、その札を持つ人だけが埋められる
      if (tagId !== null && !staff.tagIds.includes(tagId)) continue
      const reason = reasonFor(plan, schedule, calendar, staff.id, day, shiftId)
      const list = groups.get(reason)
      if (list) list.push(staff.id)
      else groups.set(reason, [staff.id])
    }
    const reasons = REASON_ORDER.filter((r) => groups.has(r)).map((reason) => ({ reason, staffIds: groups.get(reason)! }))
    const blocked = reasons.filter((r) => r.reason !== 'free')
    const free = reasons.find((r) => r.reason === 'free')

    const head =
      tagId === null
        ? `${formatDay(plan.year, plan.month, day)}の${shiftName(shiftId)}: 必要${need}人に対して${have}人です。`
        : `${formatDay(plan.year, plan.month, day)}の${shiftName(shiftId)}: 「${tagName(tagId)}」の人が、必要${need}人に対して${have}人です。`
    let body: string
    if (blocked.length > 0) {
      body = `入れない理由: ${blocked.map((r) => `${REASON_LABELS[r.reason]}${r.staffIds.length}人`).join('、')}。`
    } else if (!free) {
      body = tagId === null ? 'ほかに入れられる人がいません。' : `「${tagName(tagId)}」の札を持つ人が、ほかにいません。`
    } else {
      body = ''
    }
    const tail = free ? `まだ入れられる人が${free.staffIds.length}人います（${free.staffIds.map(staffName).join('、')}）。` : ''
    out.push({ day, shiftId, tagId, need, have, missing: need - have, reasons, text: [head, body, tail].filter(Boolean).join('') })
  }

  for (const s of report.shortages) build(s.day, s.shiftId, null, s.need, s.have)
  for (const s of report.roleShortages) build(s.day, s.shiftId, s.tagId, s.need, s.have)
  out.sort((a, b) => a.day - b.day || (a.tagId === null ? 0 : 1) - (b.tagId === null ? 0 : 1))
  return out
}

/** 条件に当たるときの、ひとことの注意（マスを押したときの選択肢に添える） */
export const BLOCK_NOTES: Record<BlockReason, string> = {
  closedDay: '店を開けない日です',
  offWish: '休み希望が出ています',
  fixedOff: '固定の休みの曜日です',
  cannotWork: 'この曜日のこの勤務には、入れない設定です',
  maxDays: '月の勤務日数の上限をこえます',
  maxConsecutive: '連勤の上限をこえます',
  forbiddenPair: '前後の日と、続けて入れない組み合わせになります',
}

export type CellOption = {
  /** 勤務の種類の id。休みは null */
  shiftId: string | null
  /** いま、そのマスに入っているものか */
  current: boolean
  /** これを選ぶと当たる、必ず守る条件。空なら問題なし */
  reasons: BlockReason[]
  /** 注意の文（reasons を文にしたもの）。問題がなければ空 */
  notes: string[]
}

/**
 * マスを押したときの選択肢（休み + 勤務の種類ぜんぶ）を、注意つきで返す。
 * 条件に当たるものも、選べなくはしない（店長の判断で入れることはある。入れたら、点検が知らせる）。
 */
export function cellOptions(plan: ShiftPlan, schedule: Schedule, staffId: string, day: number): CellOption[] {
  const calendar = buildCalendar(plan)
  const now = shiftAt(schedule, staffId, day)
  const options: CellOption[] = [{ shiftId: null, current: now === null, reasons: [], notes: [] }]
  for (const s of plan.shiftTypes) {
    const reasons = whyNot(plan, schedule, staffId, day, s.id, calendar)
    options.push({ shiftId: s.id, current: now === s.id, reasons, notes: reasons.map((r) => BLOCK_NOTES[r]) })
  }
  return options
}

/** ゆるめる条件 */
export type Relaxation =
  /** 条件は変えずに、別の種で組み直す */
  | { kind: 'reseed'; seed: number }
  /** 連勤の上限を value 日にする */
  | { kind: 'maxConsecutive'; value: number }
  /** 続けて入れない組み合わせを1つやめる */
  | { kind: 'removePair'; pairId: string }
  /** 何人かの、月の勤務日数の上限を by 日ふやす */
  | { kind: 'raiseMaxDays'; staffIds: string[]; by: number }
  /** 手で固定したマスをすべて外す */
  | { kind: 'unlockAll' }

export type Suggestion = {
  relaxation: Relaxation
  /** 何を変えるか（例: 連勤の上限を6日にする） */
  label: string
  /** 変える前の、足りない人数（のべ） */
  before: number
  /** 変えて組み直した後の、足りない人数（のべ） */
  after: number
  /** 足りないところが、すべて埋まったか */
  solved: boolean
  /** そのまま画面に出せる文 */
  text: string
  /** 条件を変えて組み直した結果。採用するときは、いまの plan をこれに置きかえる */
  plan: ShiftPlan
  /** 組み直した結果の点検 */
  check: CheckReport
}

export type SuggestionResult = {
  /** 効き目のあった提案。よく埋まる順 */
  suggestions: Suggestion[]
  /** 試したが、足りないところが減らなかったもの（何を試したかを正直に見せるため） */
  noEffect: string[]
  /** まとめの文 */
  text: string
}

export type SuggestOptions = {
  /** 組み直すときの手間の倍率。初期値は 0.5（提案は数が多いので、少し軽くする） */
  effort?: number
  /** 途中経過（何個めを試しているか） */
  onProgress?: (done: number, total: number) => void
}

function applyRelaxation(plan: ShiftPlan, r: Relaxation): ShiftPlan {
  switch (r.kind) {
    case 'reseed':
      return plan
    case 'maxConsecutive':
      return { ...plan, rules: { ...plan.rules, maxConsecutive: r.value } }
    case 'removePair':
      return { ...plan, rules: { ...plan.rules, forbiddenPairs: plan.rules.forbiddenPairs.filter((p) => p.id !== r.pairId) } }
    case 'raiseMaxDays':
      return { ...plan, staff: plan.staff.map((s) => (r.staffIds.includes(s.id) && s.maxDays !== null ? { ...s, maxDays: s.maxDays + r.by } : s)) }
    case 'unlockAll':
      return { ...plan, schedule: unlockAll(plan.schedule) }
  }
}

function describe(plan: ShiftPlan, r: Relaxation): { label: string; when: string } {
  const shiftName = (id: string) => {
    const s = plan.shiftTypes.find((x) => x.id === id)
    return s ? s.name || s.symbol || '（名前のない勤務）' : '（消した勤務）'
  }
  switch (r.kind) {
    case 'reseed':
      return { label: '条件を変えずに、別の案で組み直す', when: '条件を変えずに、別の案で組み直すと' }
    case 'maxConsecutive':
      return { label: `連勤の上限を${r.value}日にする`, when: `連勤の上限を${r.value}日にすると` }
    case 'removePair': {
      const p = plan.rules.forbiddenPairs.find((x) => x.id === r.pairId)
      const name = p ? `「${shiftName(p.first)}の次の日に${shiftName(p.next)}を入れない」` : 'この組み合わせ'
      return { label: `${name}をやめる`, when: `${name}をやめると` }
    }
    case 'raiseMaxDays': {
      // 人数が多いときは、名前を3人までにして、文が長くなりすぎないようにする（だれのことかは relaxation.staffIds でわかる）
      const all = r.staffIds.map((id) => `${plan.staff.find((s) => s.id === id)?.name || '（名前なし）'}さん`)
      const names = all.length <= 3 ? all.join('・') : `${all.slice(0, 2).join('・')}など${all.length}人`
      return { label: `${names}の勤務日数の上限を${r.by}日ふやす`, when: `${names}の勤務日数の上限を${r.by}日ふやすと` }
    }
    case 'unlockAll':
      return { label: '手で固定したマスをすべて外す', when: '手で固定したマスをすべて外して組み直すと' }
  }
}

/**
 * どの条件をゆるめると埋まるかを、実際に組み直して確かめる。
 * plan には、説明したい表（自動作成の結果）が入っていること。
 * 何度も組み直すので時間がかかる（自動作成の数回ぶん）。画面からは Web Worker の中で呼ぶ（client.ts）。
 */
export function suggestRelaxations(plan: ShiftPlan, options: SuggestOptions = {}): SuggestionResult {
  const effort = options.effort ?? 0.5
  const base = checkPlan(plan)
  const before = base.missingTotal
  if (before === 0) return { suggestions: [], noEffect: [], text: '足りないところはありません。' }

  const seed = plan.schedule.seed ?? 1
  const explanations = explainShortages(plan, plan.schedule, base)
  const blockedBy = (reason: SlotReason): string[] => {
    const ids = new Set<string>()
    for (const e of explanations) for (const r of e.reasons) if (r.reason === reason) r.staffIds.forEach((id) => ids.add(id))
    return plan.staff.filter((s) => ids.has(s.id)).map((s) => s.id)
  }

  // 試すものを、ゆるめ方の小さい順に並べる
  const candidates: Array<{ relaxation: Relaxation; group: string }> = [
    { relaxation: { kind: 'reseed', seed: seed + 101 }, group: 'reseed' },
    { relaxation: { kind: 'reseed', seed: seed + 202 }, group: 'reseed' },
  ]
  const limit = plan.rules.maxConsecutive
  if (limit !== null) {
    candidates.push({ relaxation: { kind: 'maxConsecutive', value: limit + 1 }, group: 'maxConsecutive' })
    candidates.push({ relaxation: { kind: 'maxConsecutive', value: limit + 2 }, group: 'maxConsecutive' })
  }
  for (const p of plan.rules.forbiddenPairs.slice(0, 4)) candidates.push({ relaxation: { kind: 'removePair', pairId: p.id }, group: `pair:${p.id}` })
  const capped = blockedBy('maxDays')
  if (capped.length > 0) {
    candidates.push({ relaxation: { kind: 'raiseMaxDays', staffIds: capped, by: 1 }, group: 'maxDays' })
    candidates.push({ relaxation: { kind: 'raiseMaxDays', staffIds: capped, by: 2 }, group: 'maxDays' })
  }
  if (countLocked(plan.schedule) > 0) candidates.push({ relaxation: { kind: 'unlockAll' }, group: 'unlock' })

  const suggestions: Suggestion[] = []
  const noEffect: string[] = []
  const solvedGroups = new Set<string>()
  const groupBest = new Map<string, number>()
  // 条件を変えなくても別の案で減らせた数。条件をゆるめる提案は、これより良くなったときだけ出す
  // （たまたま良い案に当たっただけなのに「この条件のせい」と言ってしまわないため）
  let bar = before

  candidates.forEach(({ relaxation, group }, index) => {
    options.onProgress?.(index, candidates.length)
    // 同じ種類の、より小さいゆるめ方ですべて埋まったなら、大きいほうは試さない
    if (solvedGroups.has(group)) return
    const relaxed = applyRelaxation(plan, relaxation)
    const result = solve(relaxed, { seed: relaxation.kind === 'reseed' ? relaxation.seed : seed, effort })
    const { label, when } = describe(plan, relaxation)
    const after = result.check.missingTotal
    // 必ず守る条件の違反が増える案は、出さない
    if (result.check.violations.length > base.violations.length || after >= bar) {
      if (relaxation.kind !== 'reseed') noEffect.push(label)
      return
    }
    // 同じ種類の、より小さいゆるめ方と同じだけしか減らないなら、大きいほうは出さない（6日で足りるのに7日をすすめない）
    const smaller = groupBest.get(group)
    if (smaller !== undefined && after >= smaller) return
    groupBest.set(group, after)
    if (relaxation.kind === 'reseed') bar = after
    if (after === 0) solvedGroups.add(group)
    suggestions.push({
      relaxation,
      label,
      before,
      after,
      solved: after === 0,
      text: after === 0 ? `${when}、足りないところがすべて埋まります。` : `${when}、足りない人数が、のべ${before}人から${after}人に減ります。`,
      plan: { ...relaxed, schedule: result.schedule },
      check: result.check,
    })
  })
  options.onProgress?.(candidates.length, candidates.length)

  // 別の案でさらに減ったあとでは、先に見つけた「条件をゆるめる提案」が見劣りすることがある。最後にそろえる
  const kept = suggestions.filter((s) => s.relaxation.kind === 'reseed' || s.after < bar || s.after === 0)
  for (const s of suggestions) if (!kept.includes(s)) noEffect.push(s.label)
  kept.sort((a, b) => a.after - b.after)

  let text: string
  if (kept.length > 0) {
    text = '条件を変えて、実際に組み直して確かめました。'
  } else if (noEffect.length > 0) {
    text = `次の条件をゆるめて組み直してみましたが、足りないところは減りませんでした: ${noEffect.join('、')}。休み希望が重なっているか、入れる人の数が足りていません。必要な人数か、休み希望を見直してください。`
  } else {
    text = 'ゆるめて試せる条件がありませんでした。休み希望が重なっているか、入れる人の数が足りていません。必要な人数か、休み希望を見直してください。'
  }
  return { suggestions: kept, noEffect, text }
}
