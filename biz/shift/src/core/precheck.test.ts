import { describe, expect, it } from 'vitest'
import { precheck } from './precheck'
import { makeSample, SAMPLES } from './samples'
import { tinyPlan } from './testkit'

describe('組む前の下見', () => {
  it('問題がなければ、どちらも空', () => {
    expect(precheck(tinyPlan())).toEqual({ blockers: [], warnings: [] })
  })
  it('サンプルは、どれも止まらない', () => {
    for (const s of SAMPLES) expect(precheck(makeSample(s.id, 2026, 12)).blockers).toEqual([])
  })
  it('スタッフがいない、勤務の種類がない、必要な人数がすべて0人、のときは始められない', () => {
    expect(precheck(tinyPlan({ staff: [] })).blockers[0]).toContain('スタッフ')
    expect(precheck(tinyPlan({ shiftTypes: [] })).blockers[0]).toContain('勤務の種類')
    expect(precheck(tinyPlan({ needs: { weekly: {}, overrides: {}, roleMins: [] } })).blockers[0]).toContain('必要な人数')
    expect(precheck(tinyPlan({ staff: [], shiftTypes: [] })).blockers).toHaveLength(2)
  })
  it('毎日が定休日なら、必要な人数が0人になるので、始められない', () => {
    expect(precheck(tinyPlan({ closed: { weekdays: [0, 1, 2, 3, 4, 5, 6], days: [] } })).blockers[0]).toContain('必要な人数')
  })
  it('下限が上限より大きい人を知らせる（同じなら知らせない）', () => {
    const plan = tinyPlan()
    plan.staff[0].minDays = 10
    plan.staff[0].maxDays = 10
    expect(precheck(plan).warnings).toEqual([])
    plan.staff[0].maxDays = 9
    expect(precheck(plan).warnings[0]).toContain('青木さん')
  })
  it('記号が空、記号が重なっている、を知らせる', () => {
    const plan = tinyPlan()
    plan.shiftTypes[1].symbol = '早'
    expect(precheck(plan).warnings.join('')).toContain('記号「早」が、2つの勤務で使われています')
    plan.shiftTypes[1].symbol = ''
    expect(precheck(plan).warnings.join('')).toContain('名前か記号が空')
  })
  it('役割の最低人数があるのに、その札を持つ人がいない', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    expect(precheck(plan).warnings[0]).toContain('「鍵を持っている」の札を持つスタッフがいません')
    plan.staff[0].tagIds = ['tag1']
    expect(precheck(plan).warnings).toEqual([])
  })
  it('全員が入れるだけ入っても足りないときは、先に言う', () => {
    // 必要なのは、のべ31人。3人の上限が 10・10・10 なら、ちょうど30人で、1人足りない
    const plan = tinyPlan()
    for (const st of plan.staff) st.maxDays = 10
    const w = precheck(plan).warnings
    expect(w).toHaveLength(1)
    expect(w[0]).toContain('のべ31人ぶん')
    expect(w[0]).toContain('のべ30人ぶん')
    // 1人の上限を11日にすると、ちょうど足りるので、言わない
    plan.staff[0].maxDays = 11
    expect(precheck(plan).warnings).toEqual([])
  })
  it('休み希望・固定の休み・入れない勤務も、入れる日数から引いて数える', () => {
    const plan = tinyPlan({ staff: [tinyPlan().staff[0]] })
    expect(precheck(plan).warnings).toEqual([]) // 1人で31日、ちょうど
    plan.wishes = { st1: { '5': { kind: 'off' } } }
    expect(precheck(plan).warnings[0]).toContain('のべ30人ぶん')
    plan.wishes = {}
    plan.staff[0].fixedOffWeekdays = [0] // 日曜4回
    expect(precheck(plan).warnings[0]).toContain('のべ27人ぶん')
    plan.staff[0].fixedOffWeekdays = []
    plan.staff[0].cannotWork = { sh1: [6] } // 土曜の早番（4回）。遅番は必要0人なので、土曜は入れる勤務がない
    expect(precheck(plan).warnings[0]).toContain('のべ27人ぶん')
  })
})
