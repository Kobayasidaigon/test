import { describe, expect, it, vi } from 'vitest'
import { checkPlan } from './check'
import { cellOptions, explainShortages, suggestRelaxations } from './explain'
import { makeSample } from './samples'
import { countLocked, emptySchedule, setCell } from './schedule'
import { solve } from './solver'
import { range, tinyPlan, workOn } from './testkit'
import type { ShiftPlan, Staff } from './types'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

const person = (id: string, name: string, patch: Partial<Staff> = {}): Staff => ({ id, name, tagIds: [], fixedOffWeekdays: [], cannotWork: {}, minDays: null, maxDays: null, ...patch })

/** 2026年12月10日（木）の早番に2人が要るが、9人それぞれ別の理由で入れない（1人だけ入れられる）、という表 */
function nineReasons(): ShiftPlan {
  const base = tinyPlan()
  const plan = tinyPlan({
    staff: [
      person('st1', '休み希望'),
      person('st2', '固定の休み', { fixedOffWeekdays: [4] }),
      person('st3', '入れない', { cannotWork: { sh1: [4] } }),
      person('st4', '日数の上限', { maxDays: 2 }),
      person('st5', '連勤'),
      person('st6', '組み合わせ'),
      person('st7', '固定'),
      person('st8', '別の勤務'),
      person('st9', '入れられる'),
    ],
    needs: { ...base.needs, overrides: { '10': { sh1: 2 } } },
    wishes: { st1: { '10': { kind: 'off' } } },
    rules: { ...base.rules, maxConsecutive: 5, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }] },
  })
  let s = emptySchedule()
  s = workOn(s, 'st4', 'sh1', [1, 2])
  s = workOn(s, 'st5', 'sh1', range(5, 9))
  s = workOn(s, 'st6', 'sh2', [9])
  s = setCell(s, 'st7', 10, null) // 休みで固定
  s = workOn(s, 'st8', 'sh2', [10])
  return { ...plan, schedule: s }
}

describe('組めない理由の説明', () => {
  it('入れない理由を、1人ずつ調べて、理由ごとに数える', () => {
    const plan = nineReasons()
    const e = explainShortages(plan).find((x) => x.day === 10 && x.tagId === null)!
    expect(e).toMatchObject({ day: 10, shiftId: 'sh1', need: 2, have: 0, missing: 2 })
    expect(e.reasons).toEqual([
      { reason: 'offWish', staffIds: ['st1'] },
      { reason: 'fixedOff', staffIds: ['st2'] },
      { reason: 'cannotWork', staffIds: ['st3'] },
      { reason: 'locked', staffIds: ['st7'] },
      { reason: 'otherShift', staffIds: ['st8'] },
      { reason: 'maxDays', staffIds: ['st4'] },
      { reason: 'maxConsecutive', staffIds: ['st5'] },
      { reason: 'forbiddenPair', staffIds: ['st6'] },
      { reason: 'free', staffIds: ['st9'] },
    ])
    expect(e.text).toBe(
      '12月10日（木）の早番: 必要2人に対して0人です。入れない理由: 休み希望1人、固定の休み1人、この勤務に入れない人1人、手で固定したマスの人1人、同じ日の別の勤務に入っている人1人、勤務日数の上限に届いている人1人、連勤の上限1人、続けて入れない組み合わせ1人。まだ入れられる人が1人います（入れられるさん）。',
    )
  })

  it('同じ理由の人が何人もいれば、人数をまとめる', () => {
    const plan = tinyPlan({ wishes: { st1: { '10': { kind: 'off' } }, st2: { '10': { kind: 'off' } }, st3: { '10': { kind: 'off' } } } })
    const result = solve(plan, { seed: 1, effort: 0.1 })
    const list = explainShortages({ ...plan, schedule: result.schedule })
    expect(list).toHaveLength(1)
    expect(list[0].reasons).toEqual([{ reason: 'offWish', staffIds: ['st1', 'st2', 'st3'] }])
    expect(list[0].text).toBe('12月10日（木）の早番: 必要1人に対して0人です。入れない理由: 休み希望3人。')
  })

  it('もう入っている人は、理由に数えない', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, overrides: { '10': { sh1: 3 } } }, wishes: { st3: { '10': { kind: 'off' } } } })
    const schedule = workOn(workOn(emptySchedule(), 'st1', 'sh1', [10]), 'st2', 'sh1', [10])
    const e = explainShortages(plan, schedule).find((x) => x.day === 10)!
    expect(e).toMatchObject({ need: 3, have: 2, missing: 1 })
    expect(e.reasons).toEqual([{ reason: 'offWish', staffIds: ['st3'] }])
  })

  it('役割の不足は、その札を持つ人だけを数える', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      needs: { ...base.needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] },
      wishes: { st1: { '10': { kind: 'off' } } },
    })
    plan.staff[0].tagIds = ['tag1']
    const schedule = workOn(emptySchedule(), 'st2', 'sh1', range(1, 31))
    const list = explainShortages(plan, schedule)
    const role = list.find((x) => x.day === 10 && x.tagId === 'tag1')!
    expect(role.reasons).toEqual([{ reason: 'offWish', staffIds: ['st1'] }])
    expect(role.text).toBe('12月10日（木）の早番: 「鍵を持っている」の人が、必要1人に対して0人です。入れない理由: 休み希望1人。')
    // 札を持つ人が入れる日は、「まだ入れられる人」として出る
    const other = list.find((x) => x.day === 11 && x.tagId === 'tag1')!
    expect(other.reasons).toEqual([{ reason: 'free', staffIds: ['st1'] }])
  })

  it('札を持つ人が1人もいないときは、そう言う', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    const schedule = workOn(emptySchedule(), 'st2', 'sh1', [1])
    const e = explainShortages(plan, schedule).find((x) => x.day === 1 && x.tagId === 'tag1')!
    expect(e.reasons).toEqual([])
    expect(e.text).toContain('札を持つ人が、ほかにいません')
  })

  it('足りないところがなければ、空', () => {
    const plan = tinyPlan()
    const result = solve(plan, { seed: 1, effort: 0.1 })
    expect(explainShortages({ ...plan, schedule: result.schedule })).toEqual([])
  })

  it('日の順に並ぶ。同じ日は、人数の不足が先、役割の不足が後', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    const list = explainShortages(plan)
    expect(list.slice(0, 4).map((e) => [e.day, e.tagId])).toEqual([[1, null], [1, 'tag1'], [2, null], [2, 'tag1']])
  })
})

describe('cellOptions（マスを押したときの選択肢）', () => {
  it('休みと、勤務の種類ぜんぶが並ぶ。いま入っているものに印が付く', () => {
    const plan = tinyPlan()
    const options = cellOptions(plan, workOn(emptySchedule(), 'st1', 'sh2', [3]), 'st1', 3)
    expect(options.map((o) => [o.shiftId, o.current])).toEqual([[null, false], ['sh1', false], ['sh2', true]])
    expect(options.every((o) => o.notes.length === 0)).toBe(true)
  })
  it('条件に当たる選択肢には、注意が付く（選べなくはしない）', () => {
    const plan = nineReasons()
    const offWish = cellOptions(plan, plan.schedule, 'st1', 10)
    expect(offWish[0]).toEqual({ shiftId: null, current: true, reasons: [], notes: [] })
    expect(offWish[1]).toMatchObject({ shiftId: 'sh1', reasons: ['offWish'], notes: ['休み希望が出ています'] })
    // 9日が遅番の人の10日: 早番は「続けて入れない組み合わせ」。遅番なら問題なし
    const pair = cellOptions(plan, plan.schedule, 'st6', 10)
    expect(pair[1].notes).toEqual(['前後の日と、続けて入れない組み合わせになります'])
    expect(pair[2].notes).toEqual([])
    // 入れない勤務は、その勤務にだけ注意が付く
    const cannot = cellOptions(plan, plan.schedule, 'st3', 10)
    expect(cannot.map((o) => o.reasons)).toEqual([[], ['cannotWork'], []])
  })
  it('いないスタッフでも落ちない', () => {
    expect(cellOptions(tinyPlan(), emptySchedule(), 'ghost', 1)).toHaveLength(3)
  })
})

/** 組んでから、提案を出す */
function solveAndSuggest(plan: ShiftPlan) {
  const result = solve(plan, { seed: 1, effort: 0.2 })
  const solved = { ...plan, schedule: result.schedule }
  return { result, solved, out: suggestRelaxations(solved, { effort: 0.2 }) }
}

describe('条件をゆるめる提案（実際に組み直して、確かめたものだけを出す）', () => {
  it('連勤の上限: 1人の店で、6日続けて開ける週は、上限を6日にすると埋まる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ staff: [base.staff[0]], closed: { weekdays: [], days: range(7, 31) }, rules: { ...base.rules, maxConsecutive: 5 } })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(1)
    expect(out.suggestions).toHaveLength(1)
    const s = out.suggestions[0]
    expect(s.relaxation).toEqual({ kind: 'maxConsecutive', value: 6 })
    expect(s).toMatchObject({ label: '連勤の上限を6日にする', before: 1, after: 0, solved: true })
    expect(s.text).toBe('連勤の上限を6日にすると、足りないところがすべて埋まります。')
    // 提案に付いている表は、ゆるめた条件で点検して、本当に不足0・違反0
    expect(s.plan.rules.maxConsecutive).toBe(6)
    const recheck = checkPlan(s.plan)
    expect(recheck.missingTotal).toBe(0)
    expect(recheck.violations).toEqual([])
    expect(s.check).toEqual(recheck)
    // 6日で埋まったので、7日は試さない（小さいゆるめ方だけを出す）
    expect(out.suggestions.some((x) => x.relaxation.kind === 'maxConsecutive' && x.relaxation.value === 7)).toBe(false)
  })

  it('続けて入れない組み合わせ: やめると埋まるなら、そう言う', () => {
    const plan = tinyPlan({
      staff: [tinyPlan().staff[0]],
      closed: { weekdays: [], days: range(3, 31) },
      needs: { weekly: {}, overrides: { '1': { sh2: 1 }, '2': { sh1: 1 } }, roleMins: [] },
      rules: { ...tinyPlan().rules, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }] },
    })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(1)
    expect(out.suggestions.map((s) => s.relaxation)).toEqual([{ kind: 'removePair', pairId: 'fp1' }])
    expect(out.suggestions[0].text).toBe('「遅番の次の日に早番を入れない」をやめると、足りないところがすべて埋まります。')
    expect(out.suggestions[0].plan.rules.forbiddenPairs).toEqual([])
    expect(checkPlan(out.suggestions[0].plan).missingTotal).toBe(0)
  })

  it('月の勤務日数の上限: 上限に届いた人の上限をふやすと埋まるなら、そう言う', () => {
    const plan = tinyPlan({ staff: [{ ...tinyPlan().staff[0], maxDays: 3 }], closed: { weekdays: [], days: range(5, 31) } })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(1)
    expect(out.suggestions).toHaveLength(1)
    expect(out.suggestions[0].relaxation).toEqual({ kind: 'raiseMaxDays', staffIds: ['st1'], by: 1 })
    expect(out.suggestions[0].text).toBe('青木さんの勤務日数の上限を1日ふやすと、足りないところがすべて埋まります。')
    expect(out.suggestions[0].plan.staff[0].maxDays).toBe(4)
  })

  it('手で固定したマス: 外すと埋まるなら、そう言う。提案の表では、固定が外れている', () => {
    let plan = tinyPlan({ staff: [tinyPlan().staff[0]], closed: { weekdays: [], days: range(2, 31) } })
    plan = { ...plan, schedule: setCell(plan.schedule, 'st1', 1, null) }
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(1)
    expect(out.suggestions.map((s) => s.relaxation)).toEqual([{ kind: 'unlockAll' }])
    expect(countLocked(out.suggestions[0].plan.schedule)).toBe(0)
    expect(checkPlan(out.suggestions[0].plan).missingTotal).toBe(0)
  })

  it('一部しか埋まらないときは、「何人から何人に減る」と言う。よく埋まる順に並ぶ', () => {
    // 1人の店。1〜6日（6日間）と、8〜14日（7日間）を開ける。7日は定休日。上限は5日
    //   上限5日: どちらのかたまりも1日ずつ空く（のべ2人）
    //   上限6日: 前のかたまりは埋まる。後ろは1日空く（のべ1人）
    //   上限7日: ぜんぶ埋まる
    const base = tinyPlan()
    const plan = tinyPlan({ staff: [base.staff[0]], closed: { weekdays: [], days: [7, ...range(15, 31)] }, rules: { ...base.rules, maxConsecutive: 5 } })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(2)
    expect(out.suggestions.map((s) => [s.label, s.before, s.after, s.solved])).toEqual([
      ['連勤の上限を7日にする', 2, 0, true],
      ['連勤の上限を6日にする', 2, 1, false],
    ])
    expect(out.suggestions[1].text).toBe('連勤の上限を6日にすると、足りない人数が、のべ2人から1人に減ります。')
    expect(out.text).toBe('条件を変えて、実際に組み直して確かめました。')
  })

  it('ゆるめても減らないものは、提案に出さない。何を試したかは、正直に言う', () => {
    // 1人の店。1〜6日と、8〜13日を開ける。上限3日だと、各かたまりで1日ずつ空く（3日 + 休み + 2日）
    // 上限を4日・5日にしても、6日間のかたまりでは1日は休むので、減らない
    const base = tinyPlan()
    const plan = tinyPlan({ staff: [base.staff[0]], closed: { weekdays: [], days: [7, ...range(14, 31)] }, rules: { ...base.rules, maxConsecutive: 3 } })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(2)
    expect(out.suggestions).toEqual([])
    expect(out.noEffect).toEqual(['連勤の上限を4日にする', '連勤の上限を5日にする'])
    expect(out.text).toContain('連勤の上限を4日にする、連勤の上限を5日にする')
    expect(out.text).toContain('足りないところは減りませんでした')
  })

  it('大きいゆるめ方が、小さいゆるめ方と同じだけしか減らさないなら、小さいほうだけを出す', () => {
    // 1人の店。1〜6日（6日間）を開け、10日は休み希望で、8〜12日も開ける。上限は5日
    //   上限5日: 前のかたまりで1日、10日で1日（のべ2人）
    //   上限6日: 前のかたまりが埋まる。10日は休み希望なので埋まらない（のべ1人）
    //   上限7日: 6日と同じ（のべ1人）→ 出さない
    const base = tinyPlan()
    const plan = tinyPlan({
      staff: [base.staff[0]],
      closed: { weekdays: [], days: [7, ...range(13, 31)] },
      wishes: { st1: { '10': { kind: 'off' } } },
      rules: { ...base.rules, maxConsecutive: 5 },
    })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(2)
    expect(out.suggestions.map((s) => [s.label, s.after])).toEqual([['連勤の上限を6日にする', 1]])
    expect(out.noEffect).toEqual([])
  })

  it('休み希望が重なっているだけなら、提案は出さず、理由を言う', () => {
    const plan = tinyPlan({ wishes: { st1: { '10': { kind: 'off' } }, st2: { '10': { kind: 'off' } }, st3: { '10': { kind: 'off' } } } })
    const { out } = solveAndSuggest(plan)
    expect(out.suggestions).toEqual([])
    expect(out.noEffect).toEqual([])
    expect(out.text).toContain('ゆるめて試せる条件がありませんでした')
  })

  it('足りないところがなければ、何も試さない', () => {
    const { out } = solveAndSuggest(tinyPlan())
    expect(out).toEqual({ suggestions: [], noEffect: [], text: '足りないところはありません。' })
  })

  it('提案は、必ず守る条件の違反が増えるものを出さない', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const plan = makeSample('restaurant', 2026, 12)
      const result = solve(plan, { seed, effort: 0.2 })
      const out = suggestRelaxations({ ...plan, schedule: result.schedule }, { effort: 0.2 })
      for (const s of out.suggestions) {
        expect(checkPlan(s.plan).violations).toEqual([])
        expect(s.after).toBeLessThan(s.before)
        expect(s.check.missingTotal).toBe(s.after)
      }
    }
  })

  it('上限に届いた人が多いときは、名前を並べすぎない', () => {
    const base = tinyPlan()
    const people = ['青木', '石川', '上田', '遠藤', '小川'].map((name, i) => ({ ...base.staff[0], id: `st${i + 1}`, name, maxDays: 1 }))
    // 5人とも上限1日。開けるのは10日間で、毎日1人が要るのに、のべ5日ぶんしか入れない。1日ずつふやすと、ちょうど足りる
    const plan = tinyPlan({ staff: people, closed: { weekdays: [], days: range(11, 31) } })
    const { result, out } = solveAndSuggest(plan)
    expect(result.check.missingTotal).toBe(5)
    expect(out.suggestions).toHaveLength(1)
    expect(out.suggestions[0].label).toBe('青木さん・石川さんなど5人の勤務日数の上限を1日ふやす')
    expect(out.suggestions[0].relaxation).toEqual({ kind: 'raiseMaxDays', staffIds: ['st1', 'st2', 'st3', 'st4', 'st5'], by: 1 })
    expect(out.suggestions[0].solved).toBe(true)
  })

  it('途中経過を受け取れる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ staff: [base.staff[0]], closed: { weekdays: [], days: range(7, 31) }, rules: { ...base.rules, maxConsecutive: 5 } })
    const result = solve(plan, { seed: 1, effort: 0.1 })
    const calls: Array<[number, number]> = []
    suggestRelaxations({ ...plan, schedule: result.schedule }, { effort: 0.1, onProgress: (done, total) => calls.push([done, total]) })
    expect(calls[0]).toEqual([0, 4])
    expect(calls[calls.length - 1]).toEqual([4, 4])
  })

  it('サンプルの飲食店: キッチンが足りない週があり、「連勤の上限を6日にする」と、すべて埋まる', () => {
    const plan = makeSample('restaurant', 2026, 12)
    const result = solve(plan, { seed: 1 })
    expect(result.check.shortages).toEqual([])
    expect(result.check.roleShortages).toHaveLength(2)
    const solved = { ...plan, schedule: result.schedule }
    const explanations = explainShortages(solved)
    expect(explanations).toHaveLength(2)
    expect(explanations.every((e) => e.text.includes('「キッチン」の人が、必要1人に対して0人です。'))).toBe(true)
    const out = suggestRelaxations(solved)
    const top = out.suggestions[0]
    expect(top.relaxation).toEqual({ kind: 'maxConsecutive', value: 6 })
    expect(top).toMatchObject({ before: 2, after: 0, solved: true })
    expect(checkPlan(top.plan)).toMatchObject({ missingTotal: 0, violations: [] })
  })
})
