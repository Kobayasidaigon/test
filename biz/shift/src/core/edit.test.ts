import { describe, expect, it, vi } from 'vitest'
import { buildCalendar } from './calendar'
import {
  addShiftType, addStaff, addTag, applyShiftPreset, blankPlan, canWork, cycleWish, hasMonthData, nextId, removeShiftType, removeStaff, removeTag,
  addForbiddenPair, removeForbiddenPair, setRoleMin, updateRules,
  setCanWork, setDayNeed, setMonth, setWeeklyNeed, setWish, SHIFT_PRESETS, toggleClosedDay, updateShiftType, updateStaff,
} from './edit'
import { carryToNextMonth } from './carry'
import { makeSample, SAMPLES } from './samples'
import { emptySchedule, isLocked, setCell, shiftAt } from './schedule'
import { solve } from './solver'
import { validatePlan } from './storage'
import { tinyPlan } from './testkit'
import type { ShiftPlan } from './types'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

/** 希望・表・固定・引き継ぎが入った plan */
function full(id: 'salon' | 'restaurant' | 'pharmacy' = 'salon'): ShiftPlan {
  const dec = makeSample(id, 2026, 12)
  const jan0 = carryToNextMonth({ ...dec, schedule: solve(dec, { seed: 1, effort: 0.05 }).schedule })
  const jan = { ...jan0, wishes: { st1: { '5': { kind: 'off' as const }, '6': { kind: 'shift' as const, shiftId: 'sh2' } } }, needs: { ...jan0.needs, overrides: { '3': { sh1: 4, sh2: 1 } } } }
  let schedule = solve(jan, { seed: 1, effort: 0.05 }).schedule
  schedule = setCell(schedule, 'st1', 10, 'sh2')
  schedule = setCell(schedule, 'st2', 11, null)
  return { ...jan, schedule }
}
const valid = (plan: ShiftPlan) => {
  const r = validatePlan(plan)
  if (!r.ok) throw new Error(r.reason)
  return true
}

describe('nextId', () => {
  it('まだ使われていない id を作る', () => {
    expect(nextId('st', [])).toBe('st1')
    expect(nextId('st', ['st1', 'st2'])).toBe('st3')
    // あいだを消したあとでも、残っている id とぶつからない
    expect(nextId('st', ['st1', 'st3'])).toBe('st4')
    expect(nextId('st', ['st2', 'st3'])).toBe('st4')
  })
})

describe('blankPlan と、勤務の種類のひな形', () => {
  it('ひな形は3種類。どれで始めても、保存の検査を通る', () => {
    expect(SHIFT_PRESETS).toHaveLength(3)
    for (const preset of SHIFT_PRESETS) {
      const plan = blankPlan(2026, 12, preset.id)
      expect(valid(plan)).toBe(true)
      expect(plan.shiftTypes.map((s) => s.name)).toEqual(preset.shiftTypes.map((s) => s.name))
      // 記号は1〜2文字で、ひな形の中で重ならない
      const symbols = preset.shiftTypes.map((s) => s.symbol)
      expect(symbols.every((x) => [...x].length >= 1 && [...x].length <= 2)).toBe(true)
      expect(new Set(symbols).size).toBe(symbols.length)
    }
  })
  it('連続勤務の上限の初期値は5日', () => {
    expect(blankPlan(2026, 12).rules.maxConsecutive).toBe(5)
  })
  it('知らないひな形の名前なら、1つめを使う', () => {
    expect(blankPlan(2026, 12, 'nothing').shiftTypes).toEqual(SHIFT_PRESETS[0].shiftTypes)
  })
  it('ひな形のデータを、plan の書きかえで汚さない', () => {
    const plan = blankPlan(2026, 12)
    plan.shiftTypes[0].name = '書きかえた'
    expect(SHIFT_PRESETS[0].shiftTypes[0].name).toBe('早番')
  })
})

describe('スタッフ', () => {
  it('足す・直す', () => {
    let plan = addStaff(tinyPlan(), '遠藤')
    expect(plan.staff.map((s) => s.id)).toEqual(['st1', 'st2', 'st3', 'st4'])
    plan = updateStaff(plan, 'st4', { maxDays: 10 })
    expect(plan.staff[3]).toMatchObject({ name: '遠藤', maxDays: 10 })
    expect(valid(plan)).toBe(true)
  })
  it('消すと、その人の希望・表・固定・前の月の勤務も消える。消したあとも、保存の検査を通る', () => {
    const plan = full()
    const next = removeStaff(plan, 'st1')
    expect(next.staff.some((s) => s.id === 'st1')).toBe(false)
    expect(next.wishes.st1).toBeUndefined()
    expect(next.schedule.work.st1).toBeUndefined()
    expect(next.schedule.locked.st1).toBeUndefined()
    expect(next.carry!.tail.st1).toBeUndefined()
    expect(next.schedule.locked.st2).toEqual([11]) // ほかの人は、そのまま
    expect(valid(next)).toBe(true)
    expect(JSON.stringify(plan)).toContain('"st1"') // もとの plan は変わらない
  })
  it('全員を1人ずつ消していっても、ずっと検査を通る', () => {
    let plan = full('restaurant')
    for (const st of [...plan.staff]) {
      plan = removeStaff(plan, st.id)
      expect(valid(plan)).toBe(true)
    }
    expect(plan.staff).toEqual([])
  })
})

describe('入れる曜日と勤務', () => {
  it('切りかえられる。入れるに戻すと、あとが残らない', () => {
    let st = tinyPlan().staff[0]
    expect(canWork(st, 3, 'sh2')).toBe(true)
    st = setCanWork(st, 3, 'sh2', false)
    st = setCanWork(st, 1, 'sh2', false)
    expect(st.cannotWork).toEqual({ sh2: [1, 3] })
    expect(canWork(st, 3, 'sh2')).toBe(false)
    expect(canWork(st, 3, 'sh1')).toBe(true)
    st = setCanWork(setCanWork(st, 3, 'sh2', true), 1, 'sh2', true)
    expect(st.cannotWork).toEqual({})
  })
  it('固定の休みの曜日は、どの勤務にも入れない', () => {
    const st = { ...tinyPlan().staff[0], fixedOffWeekdays: [0 as const] }
    expect(canWork(st, 0, 'sh1')).toBe(false)
    expect(canWork(st, 1, 'sh1')).toBe(true)
  })
})

describe('勤務の種類', () => {
  it('足すと、まだ使っていない色になり、必要人数は0人から始まる', () => {
    const plan = addShiftType(tinyPlan(), { name: '通し', symbol: '通' })
    const added = plan.shiftTypes[2]
    expect(added).toMatchObject({ id: 'sh3', name: '通し', symbol: '通' })
    expect(['egg', 'sky']).not.toContain(added.color)
    expect(plan.needs.weekly.sh3).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(valid(plan)).toBe(true)
    expect(updateShiftType(plan, 'sh3', { start: '10:00' }).shiftTypes[2].start).toBe('10:00')
  })
  it('消すと、それを指しているものが、すべて消える。消したあとも、保存の検査を通る', () => {
    const plan = full()
    const next = removeShiftType(plan, 'sh2')
    expect(next.shiftTypes.map((s) => s.id)).toEqual(['sh1'])
    expect(next.needs.weekly.sh2).toBeUndefined()
    expect(next.needs.overrides).toEqual({ '3': { sh1: 4 } })
    expect(next.needs.roleMins.every((r) => r.shiftId !== 'sh2')).toBe(true)
    expect(next.rules.forbiddenPairs).toEqual([])
    expect(next.rules.balanceShiftIds).toEqual([])
    expect(next.wishes.st1).toEqual({ '5': { kind: 'off' } })
    expect(next.staff.every((s) => !('sh2' in s.cannotWork))).toBe(true)
    expect(JSON.stringify(next.schedule.work)).not.toContain('sh2')
    // 遅番で固定していたマスは、固定ごと消える（「休みで固定」に化けない）。休みの固定は残る
    expect(shiftAt(next.schedule, 'st1', 10)).toBeNull()
    expect(isLocked(next.schedule, 'st1', 10)).toBe(false)
    expect(isLocked(next.schedule, 'st2', 11)).toBe(true)
    expect(valid(next)).toBe(true)
  })
  it('どのサンプルでも、勤務の種類を1つずつ全部消していって、ずっと検査を通る', () => {
    for (const s of SAMPLES) {
      let plan = full(s.id)
      for (const st of [...plan.shiftTypes]) {
        plan = removeShiftType(plan, st.id)
        expect(valid(plan)).toBe(true)
      }
      expect(plan.schedule.work).toEqual({})
    }
  })
  it('ひな形に入れかえると、前の種類を指していたものは残らない', () => {
    const next = applyShiftPreset(full(), 'am-pm-day')
    expect(next.shiftTypes.map((s) => s.name)).toEqual(['午前', '午後', '1日'])
    expect(next.schedule.work).toEqual({})
    expect(next.needs.roleMins).toEqual([])
    expect(valid(next)).toBe(true)
    expect(applyShiftPreset(tinyPlan(), 'nothing')).toEqual(tinyPlan())
  })
})

describe('役割の札', () => {
  it('足す。消すと、スタッフの札と、その札の最低人数も消える', () => {
    const plan = full()
    const added = addTag(plan, '受付')
    expect(added.tags[added.tags.length - 1]).toEqual({ id: 'tag3', name: '受付' })
    const next = removeTag(plan, 'tag2')
    expect(next.tags.map((t) => t.id)).toEqual(['tag1'])
    expect(next.staff.every((s) => !s.tagIds.includes('tag2'))).toBe(true)
    expect(next.needs.roleMins.map((r) => r.id)).toEqual(['rm1', 'rm2'])
    expect(valid(next)).toBe(true)
  })
})

describe('必要な人数', () => {
  it('曜日ごとの人数を書く。負の数や小数は、0以上の整数に直す', () => {
    let plan = setWeeklyNeed(tinyPlan(), 'sh2', 6, 3)
    expect(plan.needs.weekly.sh2).toEqual([0, 0, 0, 0, 0, 0, 3])
    plan = setWeeklyNeed(plan, 'sh2', 0, -2)
    plan = setWeeklyNeed(plan, 'sh2', 1, 2.9)
    expect(plan.needs.weekly.sh2).toEqual([0, 2, 0, 0, 0, 0, 3])
  })
  it('日ごとの上書きを書く・やめる', () => {
    let plan = setDayNeed(tinyPlan(), 24, 'sh1', 3)
    expect(plan.needs.overrides).toEqual({ '24': { sh1: 3 } })
    expect(buildCalendar(plan)[23].needs.sh1).toBe(3)
    plan = setDayNeed(plan, 24, 'sh1', null)
    expect(plan.needs.overrides).toEqual({})
  })
})

describe('役割の最低人数と、条件', () => {
  it('役割の最低人数を足す。同じ勤務・同じ札なら人数だけ変える。0人にすると消える', () => {
    let plan = setRoleMin(tinyPlan(), 'sh2', 'tag1', 1)
    expect(plan.needs.roleMins).toEqual([{ id: 'rm1', shiftId: 'sh2', tagId: 'tag1', count: 1 }])
    plan = setRoleMin(plan, 'sh2', 'tag1', 2)
    expect(plan.needs.roleMins).toEqual([{ id: 'rm1', shiftId: 'sh2', tagId: 'tag1', count: 2 }])
    plan = setRoleMin(plan, 'sh1', 'tag1', 1)
    expect(plan.needs.roleMins.map((r) => r.id)).toEqual(['rm1', 'rm2'])
    expect(valid(plan)).toBe(true)
    plan = setRoleMin(plan, 'sh2', 'tag1', 0)
    expect(plan.needs.roleMins.map((r) => r.id)).toEqual(['rm2'])
    // ない決まりを消そうとしても、何も起きない
    expect(setRoleMin(plan, 'sh2', 'tag1', 0).needs.roleMins).toEqual(plan.needs.roleMins)
  })
  it('続けて入れない組み合わせを足す・消す。同じ組み合わせは2つ作らない', () => {
    let plan = addForbiddenPair(tinyPlan(), 'sh2', 'sh1')
    plan = addForbiddenPair(plan, 'sh2', 'sh1')
    expect(plan.rules.forbiddenPairs).toEqual([{ id: 'fp1', first: 'sh2', next: 'sh1' }])
    // 向きが逆なら、別の組み合わせ
    plan = addForbiddenPair(plan, 'sh1', 'sh2')
    expect(plan.rules.forbiddenPairs.map((p) => p.id)).toEqual(['fp1', 'fp2'])
    expect(valid(plan)).toBe(true)
    expect(removeForbiddenPair(plan, 'fp1').rules.forbiddenPairs.map((p) => p.id)).toEqual(['fp2'])
  })
  it('条件を書きかえる', () => {
    const plan = updateRules(tinyPlan(), { maxConsecutive: 6, weeklyDayOff: true })
    expect(plan.rules).toMatchObject({ maxConsecutive: 6, weeklyDayOff: true, balanceWeekend: false })
  })
})

describe('希望', () => {
  it('書く・消す。消すと、空の入れ物が残らない', () => {
    let plan = setWish(tinyPlan(), 'st1', 5, { kind: 'off' })
    expect(plan.wishes).toEqual({ st1: { '5': { kind: 'off' } } })
    plan = setWish(plan, 'st1', 5, null)
    expect(plan.wishes).toEqual({})
  })
  it('押すたびに、なし → 休み希望 → 早番に入りたい → 遅番に入りたい → なし、と回る', () => {
    let plan = tinyPlan()
    const seen: unknown[] = []
    for (let i = 0; i < 5; i++) {
      plan = cycleWish(plan, 'st1', 5)
      seen.push(plan.wishes.st1?.['5'] ?? null)
    }
    expect(seen).toEqual([{ kind: 'off' }, { kind: 'shift', shiftId: 'sh1' }, { kind: 'shift', shiftId: 'sh2' }, null, { kind: 'off' }])
  })
  it('勤務の種類が1つもなければ、なし ⇄ 休み希望 だけで回る', () => {
    let plan = tinyPlan({ shiftTypes: [] })
    plan = cycleWish(plan, 'st1', 5)
    expect(plan.wishes.st1['5']).toEqual({ kind: 'off' })
    plan = cycleWish(plan, 'st1', 5)
    expect(plan.wishes).toEqual({})
  })
})

describe('月を変える', () => {
  it('日付にひもづくものが消える。スタッフや条件は残る', () => {
    const plan = full()
    expect(hasMonthData(plan)).toBe(true)
    const next = setMonth(plan, 2027, 4)
    expect([next.year, next.month]).toEqual([2027, 4])
    expect(next.wishes).toEqual({})
    expect(next.needs.overrides).toEqual({})
    expect(next.closed.days).toEqual([])
    expect(next.schedule).toEqual(emptySchedule())
    expect(next.carry).toBeNull()
    expect(next.staff).toEqual(plan.staff)
    expect(next.rules).toEqual(plan.rules)
    expect(hasMonthData(next)).toBe(false)
    expect(valid(next)).toBe(true)
  })
  it('31日の月から30日の月へ変えても、ない日が残らない', () => {
    let plan = toggleClosedDay(tinyPlan(), 31)
    plan = setWish(plan, 'st1', 31, { kind: 'off' })
    expect(valid(setMonth(plan, 2026, 11))).toBe(true)
  })
  it('同じ月なら、何も消さない', () => {
    const plan = full()
    expect(setMonth(plan, plan.year, plan.month)).toBe(plan)
  })
})

describe('個別の定休日', () => {
  it('切りかえる。ない日は、入れない', () => {
    let plan = toggleClosedDay(tinyPlan(), 24)
    plan = toggleClosedDay(plan, 3)
    expect(plan.closed.days).toEqual([3, 24])
    expect(toggleClosedDay(plan, 24).closed.days).toEqual([3])
    expect(toggleClosedDay(plan, 32).closed.days).toEqual([3, 24])
    expect(toggleClosedDay(plan, 0).closed.days).toEqual([3, 24])
  })
})
