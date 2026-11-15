import { describe, expect, it, vi } from 'vitest'
import { CARRY_TAIL_DAYS, carryNote, carryRuns, carryToNextMonth } from './carry'
import { checkPlan } from './check'
import { cellOptions } from './explain'
import { emptySchedule, shiftAt } from './schedule'
import { solve } from './solver'
import { validatePlan } from './storage'
import { makeSample } from './samples'
import { range, tinyPlan, workOn } from './testkit'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

describe('翌月への引き継ぎ', () => {
  it('次の月になる。12月の次は、次の年の1月', () => {
    const next = carryToNextMonth(tinyPlan())
    expect([next.year, next.month]).toEqual([2027, 1])
    expect(carryToNextMonth(tinyPlan({ month: 3 })).month).toBe(4)
  })

  it('スタッフ・勤務の種類・曜日ごとの必要人数・条件・定休日の曜日は、そのまま持っていく', () => {
    const plan = makeSample('salon', 2026, 12)
    const next = carryToNextMonth(plan)
    expect(next.staff).toEqual(plan.staff)
    expect(next.shiftTypes).toEqual(plan.shiftTypes)
    expect(next.tags).toEqual(plan.tags)
    expect(next.needs.weekly).toEqual(plan.needs.weekly)
    expect(next.needs.roleMins).toEqual(plan.needs.roleMins)
    expect(next.rules).toEqual(plan.rules)
    expect(next.closed.weekdays).toEqual(plan.closed.weekdays)
    expect(next.storeName).toBe(plan.storeName)
    expect(next.holidayMode).toBe(plan.holidayMode)
  })

  it('日付にひもづくもの（個別の定休日、日ごとの上書き、希望、表）は、持っていかない', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      closed: { weekdays: [0], days: [31] },
      needs: { ...base.needs, overrides: { '24': { sh1: 3 } } },
      wishes: { st1: { '5': { kind: 'off' } } },
      schedule: workOn(emptySchedule(), 'st1', 'sh1', [1]),
    })
    const next = carryToNextMonth(plan)
    expect(next.closed).toEqual({ weekdays: [0], days: [] })
    expect(next.needs.overrides).toEqual({})
    expect(next.wishes).toEqual({})
    expect(next.schedule).toEqual(emptySchedule())
  })

  it('前の月の勤務を、まるごと、古い順に残す（31日ぶんまで）', () => {
    let s = workOn(emptySchedule(), 'st1', 'sh1', range(27, 31))
    s = workOn(s, 'st2', 'sh2', [1, 18, 31])
    const next = carryToNextMonth(tinyPlan({ schedule: s }))
    expect(next.carry!.year).toBe(2026)
    expect(next.carry!.month).toBe(12)
    expect(CARRY_TAIL_DAYS).toBe(31)
    expect(next.carry!.tail.st1).toHaveLength(31)
    expect(next.carry!.tail.st1.slice(-6)).toEqual([null, 'sh1', 'sh1', 'sh1', 'sh1', 'sh1'])
    // 添字は「日 − 1」（12月は31日あるので、1日がいちばん古い）
    expect(next.carry!.tail.st2[0]).toBe('sh2')
    expect(next.carry!.tail.st2[17]).toBe('sh2')
    expect(next.carry!.tail.st2[30]).toBe('sh2')
    expect(next.carry!.tail.st3).toEqual(new Array(31).fill(null))
    // 2月（28日）からの引き継ぎは、28日ぶん
    const feb = carryToNextMonth(tinyPlan({ year: 2027, month: 2, schedule: workOn(emptySchedule(), 'st1', 'sh1', [28]) }))
    expect(feb.carry!.tail.st1).toHaveLength(28)
  })

  it('表が空のとき（まだ組んでいないとき）は、前の月の勤務を持たない', () => {
    expect(carryToNextMonth(tinyPlan()).carry).toBeNull()
  })

  it('引き継いだ plan は、保存の検査を通る', () => {
    const plan = makeSample('restaurant', 2026, 12)
    const solved = { ...plan, schedule: solve(plan, { seed: 1, effort: 0.1 }).schedule }
    expect(validatePlan(carryToNextMonth(solved)).ok).toBe(true)
    // 2回つづけて引き継いでも通る
    const jan = carryToNextMonth(solved)
    const janSolved = { ...jan, schedule: solve(jan, { seed: 1, effort: 0.1 }).schedule }
    expect(validatePlan(carryToNextMonth(janSolved)).ok).toBe(true)
  })

  it('もとの plan を書き換えない', () => {
    const plan = tinyPlan({ schedule: workOn(emptySchedule(), 'st1', 'sh1', [31]) })
    const before = JSON.stringify(plan)
    carryToNextMonth(plan)
    expect(JSON.stringify(plan)).toBe(before)
  })
})

describe('引き継いだ月の自動作成: 月をまたぐ条件を守る', () => {
  const base = tinyPlan()

  it('前の月の終わりに5日続けて勤務した人は、上限5日なら、次の月の1日には入らない', () => {
    // 1人だけの店にして、ほかの人に逃げられないようにする
    const dec = tinyPlan({ staff: [base.staff[0]], rules: { ...base.rules, maxConsecutive: 5 }, schedule: workOn(emptySchedule(), 'st1', 'sh1', range(27, 31)) })
    const jan = carryToNextMonth(dec)
    const result = solve(jan, { seed: 1, effort: 0.2 })
    expect(shiftAt(result.schedule, 'st1', 1)).toBeNull()
    expect(result.check.violations).toEqual([])
    expect(result.check.shortages[0]).toMatchObject({ day: 1 })
  })

  it('前の月の終わりに3日続けて勤務した人は、次の月は2日まで続けられる（3日めは入らない）', () => {
    const dec = tinyPlan({ staff: [base.staff[0]], rules: { ...base.rules, maxConsecutive: 5 }, schedule: workOn(emptySchedule(), 'st1', 'sh1', range(29, 31)) })
    const result = solve(carryToNextMonth(dec), { seed: 1 })
    expect(result.check.violations).toEqual([])
    // 1日・2日に入ると 5日続き。3日は必ず休み（1日か2日を休んで3日に入る形もあるが、どれも違反は0件）
    const first3 = [1, 2, 3].filter((d) => shiftAt(result.schedule, 'st1', d) !== null)
    expect(first3.length).toBeLessThanOrEqual(2)
  })

  it('前の月の末日が遅番の人は、「遅番の次の日に早番を入れない」なら、1日の早番には入らない', () => {
    const dec = tinyPlan({
      staff: [base.staff[0]],
      rules: { ...base.rules, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }] },
      schedule: workOn(emptySchedule(), 'st1', 'sh2', [31]),
    })
    const result = solve(carryToNextMonth(dec), { seed: 1, effort: 0.2 })
    expect(shiftAt(result.schedule, 'st1', 1)).toBeNull()
    expect(shiftAt(result.schedule, 'st1', 2)).toBe('sh1')
    expect(result.check.violations).toEqual([])
  })

  it('連勤の上限が15日以上でも、月をまたぐ連勤を数えそこなわない（前の月を、まるごと持っていく）', () => {
    for (const limit of [15, 20, 31]) {
      // 12月の終わりに、上限ちょうどの日数を続けて勤務した（12月の中では、違反なし）
      const dec = tinyPlan({ staff: [base.staff[0]], rules: { ...base.rules, maxConsecutive: limit }, schedule: workOn(emptySchedule(), 'st1', 'sh1', range(31 - limit + 1, 31)) })
      expect(checkPlan(dec).violations).toEqual([])
      const jan = carryToNextMonth(dec)
      expect(carryRuns(jan)[0].run).toBe(limit)
      // 1月1日に入れると、上限をこえる。マスの注意にも、点検にも出る
      expect(cellOptions(jan, jan.schedule, 'st1', 1)[1].reasons).toContain('maxConsecutive')
      const forced = { ...jan, schedule: workOn(emptySchedule(), 'st1', 'sh1', [1]) }
      expect(checkPlan(forced).violations.map((v) => v.kind)).toContain('maxConsecutive')
      // 自動作成は、1月1日に入れない
      for (const seed of [1, 2, 3]) {
        const result = solve(jan, { seed, effort: 0.1 })
        expect(shiftAt(result.schedule, 'st1', 1)).toBeNull()
        expect(result.check.violations).toEqual([])
      }
    }
  })

  it('2月をまるごと勤務した人は、1月の終わりからの連勤も足して数える（2月は28日しかないため）', () => {
    // 1月30日・31日 → 2月の28日ぜんぶ → 3月1日 で、32日続きになる。上限は30日
    const rules = { ...base.rules, maxConsecutive: 30 }
    const jan = tinyPlan({ year: 2027, month: 1, staff: [base.staff[0]], rules, schedule: workOn(emptySchedule(), 'st1', 'sh1', [30, 31]) })
    const feb = carryToNextMonth(jan)
    const mar = carryToNextMonth({ ...feb, schedule: workOn(emptySchedule(), 'st1', 'sh1', range(1, 28)) })
    expect([mar.year, mar.month]).toEqual([2027, 3])
    expect(mar.carry!.tail.st1).toHaveLength(31) // 1月の終わりの3日（29日は休み） + 2月の28日
    expect(mar.carry!.tail.st1[0]).toBeNull()
    expect(carryRuns(mar)[0].run).toBe(30)
    expect(cellOptions(mar, mar.schedule, 'st1', 1)[1].reasons).toContain('maxConsecutive')
    expect(validatePlan(mar).ok).toBe(true)
    // 2月の途中に休みがあれば、1月のぶんは足さない
    const mar2 = carryToNextMonth({ ...feb, schedule: workOn(emptySchedule(), 'st1', 'sh1', range(2, 28)) })
    expect(mar2.carry!.tail.st1).toHaveLength(28)
    expect(carryRuns(mar2)[0].run).toBe(27)
  })

  it('引き継ぎがなければ、1日から入れる（前の月を気にしない）', () => {
    const jan = tinyPlan({ year: 2027, month: 1, staff: [base.staff[0]], rules: { ...base.rules, maxConsecutive: 5 } })
    const result = solve(jan, { seed: 1, effort: 0.2 })
    expect(shiftAt(result.schedule, 'st1', 1)).toBe('sh1')
  })

  it('サンプルを組んで、引き継いで、次の月を組んでも、月をまたぐ違反が0件', () => {
    for (const id of ['salon', 'restaurant', 'pharmacy'] as const) {
      const dec = makeSample(id, 2026, 12)
      const decSolved = { ...dec, schedule: solve(dec, { seed: 1, effort: 0.2 }).schedule }
      const jan = carryToNextMonth(decSolved)
      const result = solve(jan, { seed: 1, effort: 0.2 })
      expect(checkPlan(jan, result.schedule).violations).toEqual([])
    }
  })
})

describe('引き継ぎの様子を見せる', () => {
  it('前の月の終わりに、何日続けて勤務していたか', () => {
    let s = workOn(emptySchedule(), 'st1', 'sh1', range(29, 31))
    s = workOn(s, 'st2', 'sh2', [30])
    const next = carryToNextMonth(tinyPlan({ schedule: s }))
    expect(carryRuns(next)).toEqual([
      { staffId: 'st1', run: 3, lastShiftId: 'sh1' },
      { staffId: 'st2', run: 0, lastShiftId: null },
      { staffId: 'st3', run: 0, lastShiftId: null },
    ])
    expect(carryNote(next)).toContain('2026年12月')
  })
  it('引き継ぎがなければ、空', () => {
    expect(carryRuns(tinyPlan())).toEqual([])
    expect(carryNote(tinyPlan())).toBeNull()
  })
})
