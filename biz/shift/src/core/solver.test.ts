import { describe, expect, it, vi } from 'vitest'
import { buildCalendar } from './calendar'
import { checkPlan } from './check'
import { explainShortages } from './explain'
import { makeSample, SAMPLES } from './samples'
import { emptySchedule, isLocked, setCell, shiftAt } from './schedule'
import { makeRng, nextSeed, RETRY_COUNT, retrySeed, solve, solveBest, WEIGHTS } from './solver'
import { validatePlan } from './storage'
import { randomPlan, range, tinyPlan, workOn } from './testkit'
import type { ShiftPlan } from './types'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

describe('乱数', () => {
  it('同じ種なら同じ列、違う種なら違う列。0以上1未満', () => {
    const a = makeRng(42)
    const b = makeRng(42)
    const c = makeRng(43)
    const xs = Array.from({ length: 50 }, () => a())
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs)
    expect(Array.from({ length: 50 }, () => c())).not.toEqual(xs)
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
  it('決まった種の、はじめの値が変わっていない（ブラウザや版が変わっても同じ結果になることの見張り）', () => {
    const r = makeRng(1)
    expect([r(), r(), r()].map((x) => Math.floor(x * 1e6))).toEqual([627073, 2735, 527447])
  })
})

describe('nextSeed', () => {
  it('まだ組んでいなければ 1。組んであれば、次の数。保存できる範囲をこえない', () => {
    expect(nextSeed(null)).toBe(1)
    expect(nextSeed(1)).toBe(2)
    expect(nextSeed(41)).toBe(42)
    expect(nextSeed(0xffffffff)).toBeLessThanOrEqual(0xffffffff)
    expect(nextSeed(0xffffffff)).toBeGreaterThanOrEqual(1)
  })
})

describe('点数の重み', () => {
  it('人数の不足1人ぶんは、1人を置くことで増えうるほかの点数を全部足したものより重い', () => {
    // 1人を置いたときに増えうるもの:
    //   公平さ … 回数の2乗なので、c 回の人に足すと (2c+1) 倍。土日祝は1か月に多くて14日、勤務の種類と日数は多くて31日
    //   休みのない週、の1件
    const worst = WEIGHTS.fairWeekend * (2 * 14 + 1) + (WEIGHTS.fairShift + WEIGHTS.fairDays) * (2 * 30 + 1) + WEIGHTS.weekNoOff
    expect(worst).toBeLessThan(600)
    expect(WEIGHTS.short).toBeGreaterThan(worst)
    expect(WEIGHTS.role).toBeGreaterThan(worst)
  })
  it('重い順は、人数の不足 > 役割の不足 > 日数の下限 > 人の余り > 入りたい希望', () => {
    expect(WEIGHTS.short).toBeGreaterThan(WEIGHTS.role)
    expect(WEIGHTS.role).toBeGreaterThan(WEIGHTS.minDays)
    expect(WEIGHTS.minDays).toBeGreaterThan(WEIGHTS.surplus)
    expect(WEIGHTS.surplus).toBeGreaterThan(WEIGHTS.wish)
  })
})

describe('自動作成: 必ず守る条件を、1つも破らない（別に書いた点検の関数で確かめる）', () => {
  for (const sample of SAMPLES) {
    it(`サンプル「${sample.label}」`, () => {
      for (const [year, month] of [[2026, 12], [2027, 2], [2027, 5]] as const) {
        const plan = makeSample(sample.id, year, month)
        const result = solve(plan, { seed: 1 })
        expect(result.check.violations).toEqual([])
        // 結果に付いている点検と、あらためて点検したものが同じ
        expect(checkPlan(plan, result.schedule)).toEqual(result.check)
      }
    })
  }

  it('でたらめに作った 120 通りの店（1〜30人、いろいろな条件）で、違反が0件', () => {
    let solved = 0
    for (let seed = 1; seed <= 120; seed++) {
      const staff = [1, 2, 3, 5, 8, 12, 20, 30][seed % 8]
      const plan = randomPlan({ seed, staff, tight: seed % 3 === 0, year: 2026 + (seed % 3), month: 1 + (seed % 12) })
      const result = solve(plan, { seed, effort: 0.1 })
      const report = checkPlan(plan, result.schedule)
      if (report.violations.length > 0) throw new Error(`seed ${seed}: ${report.violations.map((v) => v.message).join(' / ')}`)
      solved++
    }
    expect(solved).toBe(120)
  })

  it('ふつうの手間（effort 1）でも、違反が0件', () => {
    for (const seed of [7, 19]) {
      const plan = randomPlan({ seed, staff: 12 })
      expect(solve(plan, { seed }).check.violations).toEqual([])
    }
  })

  it('入れられる人の少ない、きつい条件でも、人数を足りないままにして、違反は出さない', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const plan = randomPlan({ seed, staff: 6, tight: true, maxOffWishes: 12 })
      const result = solve(plan, { seed, effort: 0.1 })
      expect(result.check.violations).toEqual([])
    }
  })
})

describe('自動作成: 同じ入力なら同じ結果', () => {
  it('同じ種で2回組むと、まったく同じ表になる', () => {
    const plan = makeSample('salon', 2026, 12)
    const a = solve(plan, { seed: 5 })
    const b = solve(JSON.parse(JSON.stringify(plan)) as ShiftPlan, { seed: 5 })
    expect(b.schedule).toEqual(a.schedule)
    expect(b.score).toBe(a.score)
  })
  it('途中経過を受け取っても、結果は変わらない', () => {
    const plan = makeSample('pharmacy', 2026, 12)
    const phases: string[] = []
    const a = solve(plan, { seed: 2, effort: 0.2 })
    const b = solve(plan, { seed: 2, effort: 0.2, onProgress: (p) => phases.push(p.phase) })
    expect(b.schedule).toEqual(a.schedule)
    expect(phases[0]).toBe('greedy')
    expect(phases).toContain('improve')
    expect(phases[phases.length - 1]).toBe('finish')
  })
  it('種を変えると、別の案になる', () => {
    const plan = makeSample('salon', 2026, 12)
    const a = solve(plan, { seed: 1, effort: 0.2 })
    const others = [2, 3, 4].map((seed) => solve(plan, { seed, effort: 0.2 }))
    expect(others.some((o) => JSON.stringify(o.schedule.work) !== JSON.stringify(a.schedule.work))).toBe(true)
    expect(others.map((o) => o.seed)).toEqual([2, 3, 4])
    expect(a.schedule.seed).toBe(1)
  })
  it('種に大きな数や小数をわたしても、保存できる範囲の整数にそろえる', () => {
    const plan = tinyPlan()
    const big = solve(plan, { seed: 1_794_000_000_000, effort: 0.05 })
    expect(Number.isInteger(big.seed)).toBe(true)
    expect(big.seed).toBeGreaterThanOrEqual(0)
    expect(big.seed).toBeLessThanOrEqual(0xffffffff)
    expect(big.schedule.seed).toBe(big.seed)
    expect(validatePlan({ ...plan, schedule: big.schedule }).ok).toBe(true)
    expect(solve(plan, { seed: 2.7, effort: 0.05 }).seed).toBe(2)
  })
  it('手間の倍率におかしな値をわたしても、落ちない', () => {
    const plan = tinyPlan()
    expect(solve(plan, { seed: 1, effort: Number.NaN }).iterations).toBeGreaterThan(0)
    expect(solve(plan, { seed: 1, effort: -3 }).iterations).toBe(0)
  })
  it('plan を書き換えない', () => {
    const plan = makeSample('restaurant', 2026, 12)
    const before = JSON.stringify(plan)
    solve(plan, { seed: 1, effort: 0.1 })
    expect(JSON.stringify(plan)).toBe(before)
  })
})

describe('自動作成: 手で固定したマス', () => {
  it('固定したマスは、勤務も休みも、そのまま残る', () => {
    let plan = tinyPlan()
    plan = { ...plan, schedule: setCell(setCell(plan.schedule, 'st1', 3, 'sh2'), 'st2', 4, null) }
    // 何もしなければ、4日は st2 にも回ってくるはず。固定したので、ほかの人が入る
    const result = solve(plan, { seed: 1, effort: 0.2 })
    expect(shiftAt(result.schedule, 'st1', 3)).toBe('sh2')
    expect(shiftAt(result.schedule, 'st2', 4)).toBeNull()
    expect(isLocked(result.schedule, 'st1', 3)).toBe(true)
    expect(isLocked(result.schedule, 'st2', 4)).toBe(true)
    expect(result.check.shortages).toEqual([])
  })

  it('固定していないマスは、前の表に何が入っていても、作り直す', () => {
    let plan = tinyPlan()
    plan = { ...plan, schedule: workOn(emptySchedule(), 'st1', 'sh2', range(1, 31)) }
    const result = solve(plan, { seed: 1, effort: 0.2 })
    // 遅番は必要0人なので、作り直した表には1つも残らない
    expect(Object.values(result.schedule.work).flatMap((row) => Object.values(row)).includes('sh2')).toBe(false)
  })

  it('でたらめな固定を入れても、固定は変わらず、違反は固定したマスにしか出ない', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const staff = [3, 6, 10, 16][seed % 4]
      const base = randomPlan({ seed, staff })
      const rng = makeRng(seed * 31)
      const total = buildCalendar(base).length
      let schedule = solve(base, { seed, effort: 0.05 }).schedule
      // 表の1割ほどのマスを、でたらめな値で固定する（条件に合わない固定もまざる）
      for (let k = 0; k < Math.ceil((staff * total) / 10); k++) {
        const st = base.staff[Math.floor(rng() * staff)]
        const day = 1 + Math.floor(rng() * total)
        const pick = Math.floor(rng() * 4)
        schedule = setCell(schedule, st.id, day, pick === 3 ? null : base.shiftTypes[pick].id)
      }
      const plan = { ...base, schedule }
      const result = solve(plan, { seed, effort: 0.1 })

      for (const [staffId, days] of Object.entries(schedule.locked)) {
        for (const day of days) {
          expect(shiftAt(result.schedule, staffId, day)).toBe(shiftAt(schedule, staffId, day))
          expect(isLocked(result.schedule, staffId, day)).toBe(true)
        }
      }
      for (const v of result.check.violations) {
        if (v.kind === 'maxDays') {
          // 固定した勤務だけで上限をこえているときにしか、出てはいけない
          const st = plan.staff.find((s) => s.id === v.staffId)!
          const lockedWork = (schedule.locked[v.staffId] ?? []).filter((d) => shiftAt(schedule, v.staffId, d) !== null).length
          expect(lockedWork).toBeGreaterThan(st.maxDays!)
        } else {
          expect(v.days.every((d) => isLocked(schedule, v.staffId, d))).toBe(true)
        }
      }
    }
  })

  it('固定が休み希望に合っていなくても、その固定は残し、点検で知らせる', () => {
    let plan = tinyPlan({ wishes: { st1: { '5': { kind: 'off' } } } })
    plan = { ...plan, schedule: setCell(plan.schedule, 'st1', 5, 'sh1') }
    const result = solve(plan, { seed: 1, effort: 0.1 })
    expect(shiftAt(result.schedule, 'st1', 5)).toBe('sh1')
    expect(result.check.violations.map((v) => v.kind)).toEqual(['offWish'])
  })
})

describe('自動作成: 条件ごとの確かめ', () => {
  it('休み希望の日には入れない。3人とも休み希望の日は、足りないまま出す', () => {
    const plan = tinyPlan({ wishes: { st1: { '10': { kind: 'off' } }, st2: { '10': { kind: 'off' } }, st3: { '10': { kind: 'off' }, '11': { kind: 'off' } } } })
    const result = solve(plan, { seed: 1, effort: 0.2 })
    for (const id of ['st1', 'st2', 'st3']) expect(shiftAt(result.schedule, id, 10)).toBeNull()
    expect(shiftAt(result.schedule, 'st3', 11)).toBeNull()
    expect(result.check.shortages).toEqual([{ day: 10, shiftId: 'sh1', need: 1, have: 0, missing: 1 }])
    expect(result.check.violations).toEqual([])
  })

  it('人が要らない勤務には、自動では入れない', () => {
    // サンプルの飲食店の「通し」は、必要人数が0人
    const plan = makeSample('restaurant', 2026, 12)
    const result = solve(plan, { seed: 1, effort: 0.2 })
    expect(Object.values(result.schedule.work).flatMap((row) => Object.values(row)).includes('sh3')).toBe(false)
  })

  it('店を開けない日には、だれも入れない', () => {
    const plan = tinyPlan({ closed: { weekdays: [0], days: [24, 25] } })
    const result = solve(plan, { seed: 1, effort: 0.2 })
    for (const st of plan.staff) for (const day of [6, 13, 20, 27, 24, 25]) expect(shiftAt(result.schedule, st.id, day)).toBeNull()
    expect(result.check.shortages).toEqual([])
  })

  it('連勤の上限: 1人しかいない店で上限が5日なら、6日めごとに空きが出る', () => {
    const plan = tinyPlan({ staff: [tinyPlan().staff[0]], rules: { ...tinyPlan().rules, maxConsecutive: 5 } })
    const result = solve(plan, { seed: 1 })
    expect(result.check.violations).toEqual([])
    // 31日のうち、5日勤務 + 1日休みのくり返しがいちばん多く入れる形（26日）
    expect(Object.keys(result.schedule.work.st1)).toHaveLength(26)
    expect(result.check.shortages).toHaveLength(5)
  })

  it('月の勤務日数の上限をこえない。上限0日の人は、1日も入らない', () => {
    const plan = tinyPlan()
    plan.staff[0].maxDays = 0
    plan.staff[1].maxDays = 4
    const result = solve(plan, { seed: 1, effort: 0.2 })
    expect(result.schedule.work.st1).toBeUndefined()
    expect(Object.keys(result.schedule.work.st2 ?? {}).length).toBeLessThanOrEqual(4)
    expect(result.check.violations).toEqual([])
  })

  it('月の勤務日数の下限は、必要な人数より多く入れてでも満たす', () => {
    // 必要なのは毎日1人（のべ31人）。3人とも下限15日なら、のべ45人ぶん入ることになる
    const plan = tinyPlan()
    for (const st of plan.staff) st.minDays = 15
    const result = solve(plan, { seed: 1, effort: 0.3 })
    expect(result.check.minDaysShort).toEqual([])
    expect(result.check.shortages).toEqual([])
    expect(result.check.surpluses.length).toBeGreaterThan(0)
  })

  it('下限を決めていなければ、必要な人数より多くは入れない', () => {
    const result = solve(tinyPlan(), { seed: 1, effort: 0.3 })
    expect(result.check.surpluses).toEqual([])
    expect(result.check.shortages).toEqual([])
  })

  it('役割の最低人数: 札を持つ人が1人だけなら、その人が入れる日はその人を入れる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, weekly: { sh1: [2, 2, 2, 2, 2, 2, 2], sh2: [0, 0, 0, 0, 0, 0, 0] }, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    plan.staff[2].tagIds = ['tag1']
    plan.wishes = { st3: { '9': { kind: 'off' } } }
    const result = solve(plan, { seed: 1, effort: 0.3 })
    // 札を持つ st3 は、休み希望の9日以外の毎日に入る
    expect(result.check.roleShortages.map((r) => r.day)).toEqual([9])
    expect(Object.keys(result.schedule.work.st3)).toHaveLength(30)
  })

  it('「この勤務に入りたい」は、ほかに困ることがなければ、かなえる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      needs: { ...base.needs, weekly: { sh1: [1, 1, 1, 1, 1, 1, 1], sh2: [1, 1, 1, 1, 1, 1, 1] } },
      wishes: { st1: { '7': { kind: 'shift', shiftId: 'sh2' } }, st2: { '15': { kind: 'shift', shiftId: 'sh1' } } },
    })
    const result = solve(plan, { seed: 3, effort: 0.3 })
    expect(shiftAt(result.schedule, 'st1', 7)).toBe('sh2')
    expect(shiftAt(result.schedule, 'st2', 15)).toBe('sh1')
    expect(result.check.wishesUnmet).toEqual([])
  })

  it('土日祝の回数を、均等にする（3人で、毎日2人が要る店）', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      needs: { ...base.needs, weekly: { sh1: [2, 2, 2, 2, 2, 2, 2], sh2: [0, 0, 0, 0, 0, 0, 0] } },
      rules: { ...base.rules, balanceWeekend: true, maxConsecutive: 5 },
    })
    const result = solve(plan, { seed: 1 })
    const cal = buildCalendar(plan)
    const counts = plan.staff.map((st) => cal.filter((d) => d.isWeekendOrHoliday && shiftAt(result.schedule, st.id, d.day) !== null).length)
    // 土日は8日、のべ16人ぶん。3人で分けると 5・5・6 になるのが、いちばん均等
    expect(counts.sort()).toEqual([5, 5, 6])
    expect(result.check.shortages).toEqual([])
  })
})

describe('自動作成: 公平さと、週1日の休み', () => {
  const count = (schedule: ShiftPlan['schedule'], staffId: string, shiftId?: string) =>
    Object.values(schedule.work[staffId] ?? {}).filter((id) => shiftId === undefined || id === shiftId).length

  it('上限も下限も決めていない人どうしは、勤務日数がだいたい同じになる（31日を3人で 10・10・11）', () => {
    const result = solve(tinyPlan(), { seed: 1 })
    expect(['st1', 'st2', 'st3'].map((id) => count(result.schedule, id)).sort()).toEqual([10, 10, 11])
  })

  it('均等にしたい勤務（遅番）の回数が、だいたい同じになる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      needs: { ...base.needs, weekly: { sh1: [1, 1, 1, 1, 1, 1, 1], sh2: [1, 1, 1, 1, 1, 1, 1] } },
      rules: { ...base.rules, balanceShiftIds: ['sh2'], maxConsecutive: 6 },
    })
    const result = solve(plan, { seed: 1 })
    expect(result.check.shortages).toEqual([])
    expect(['st1', 'st2', 'st3'].map((id) => count(result.schedule, id, 'sh2')).sort()).toEqual([10, 10, 11])
  })

  it('毎週1日の休み: 連勤の上限を決めていなくても、人が足りていれば、休みのない週を作らない', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ staff: base.staff.slice(0, 2), rules: { ...base.rules, weeklyDayOff: true } })
    const result = solve(plan, { seed: 1 })
    expect(result.check.shortages).toEqual([])
    expect(result.check.weeksWithoutOff).toEqual([])
  })

  it('毎週1日の休みは「なるべく」なので、1人しかいない店では、人数をそろえるほうを優先して、点検で知らせる', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ staff: base.staff.slice(0, 1), rules: { ...base.rules, weeklyDayOff: true } })
    const result = solve(plan, { seed: 1, effort: 0.2 })
    expect(result.check.shortages).toEqual([])
    expect(result.check.violations).toEqual([])
    // 2026年12月で、7日ぜんぶが月の中に入る週は、6〜12日、13〜19日、20〜26日の3つ
    expect(result.check.weeksWithoutOff).toHaveLength(3)
    expect(result.check.summary.join('')).toContain('休みが1日もない週が、3件あります')
  })
})

describe('自動作成: 空のデータ、端の場合', () => {
  it('スタッフが1人もいない', () => {
    const result = solve(tinyPlan({ staff: [] }), { seed: 1 })
    expect(result.schedule.work).toEqual({})
    expect(result.check.ok).toBe(true)
    expect(result.iterations).toBe(0)
  })
  it('勤務の種類が1つもない', () => {
    const result = solve(tinyPlan({ shiftTypes: [], needs: { weekly: {}, overrides: {}, roleMins: [] } }), { seed: 1 })
    expect(result.schedule.work).toEqual({})
    expect(result.check.ok).toBe(true)
  })
  it('必要な人数が、すべて0人', () => {
    const result = solve(tinyPlan({ needs: { weekly: {}, overrides: {}, roleMins: [] } }), { seed: 1 })
    expect(result.schedule.work).toEqual({})
    expect(result.check.missingTotal).toBe(0)
  })
  it('毎日が定休日', () => {
    const result = solve(tinyPlan({ closed: { weekdays: [0, 1, 2, 3, 4, 5, 6], days: [] } }), { seed: 1 })
    expect(result.schedule.work).toEqual({})
    expect(result.check.shortages).toEqual([])
  })
  it('だれも、どの勤務にも入れない', () => {
    const plan = tinyPlan()
    for (const st of plan.staff) st.fixedOffWeekdays = [0, 1, 2, 3, 4, 5, 6]
    const result = solve(plan, { seed: 1 })
    expect(result.schedule.work).toEqual({})
    expect(result.check.shortages).toHaveLength(31)
    expect(result.check.ok).toBe(true)
  })
  it('2月（28日）と、うるう年の2月（29日）', () => {
    for (const year of [2027, 2028]) {
      const plan = tinyPlan({ year, month: 2 })
      const result = solve(plan, { seed: 1, effort: 0.1 })
      expect(result.check.shortages).toEqual([])
      expect(result.check.ok).toBe(true)
    }
  })
})

describe('自動作成: 仕上がり', () => {
  it('足りないマスには、「まだ入れられる人」が残っていない（置けるのに置いていない、がない）', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const plan = randomPlan({ seed, staff: 8, tight: true })
      const result = solve(plan, { seed, effort: 0.1 })
      const explanations = explainShortages({ ...plan, schedule: result.schedule })
      expect(result.check.missingTotal).toBeGreaterThan(0)
      for (const e of explanations) expect(e.reasons.some((r) => r.reason === 'free')).toBe(false)
    }
  })

  it('入れ替えで良くしたあとの点数は、順に置いただけのときより悪くならない', () => {
    for (const seed of [1, 2, 3]) {
      const plan = randomPlan({ seed, staff: 10 })
      const greedy = solve(plan, { seed, effort: 0 })
      const improved = solve(plan, { seed, effort: 0.3 })
      expect(improved.score).toBeLessThanOrEqual(greedy.score)
      expect(improved.check.missingTotal).toBeLessThanOrEqual(greedy.check.missingTotal)
    }
  })
})

describe('自動作成: 本当は埋まるのに、足りないまま止まらない', () => {
  // 3人の店（早番・遅番が毎日1人、遅番の次の日に早番を入れない、連勤5日まで、遅番に鍵の人1人、休み希望あり）。
  // 総当たり（動的計画法）で、足りない人数の本当の最小が0（すべて埋まる）と確かめたもの。
  // 前の作りでは、種1〜60のうち26個で「1人足りない」と出し、条件をゆるめる提案（連勤7日など）をすすめていた
  const all = [0, 1, 2, 3, 4, 5, 6] as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>
  const off = (...days: number[]) => Object.fromEntries(days.map((d) => [String(d), { kind: 'off' as const }]))
  const fillable = tinyPlan({
    year: 2027,
    month: 2,
    staff: [
      { id: 'st1', name: '人1', tagIds: ['tag1'], fixedOffWeekdays: [], cannotWork: {}, minDays: null, maxDays: null },
      { id: 'st2', name: '人2', tagIds: ['tag1'], fixedOffWeekdays: [1], cannotWork: {}, minDays: null, maxDays: null },
      { id: 'st3', name: '人3', tagIds: ['tag1'], fixedOffWeekdays: [], cannotWork: { sh1: all }, minDays: null, maxDays: null },
    ],
    needs: { weekly: { sh1: [1, 1, 1, 1, 1, 1, 1], sh2: [1, 1, 1, 1, 1, 1, 1] }, overrides: {}, roleMins: [{ id: 'rm1', shiftId: 'sh2', tagId: 'tag1', count: 1 }] },
    wishes: { st1: off(11, 12, 13, 14, 23), st2: off(2, 3, 6, 17), st3: off(21) },
    rules: { maxConsecutive: 5, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }], weeklyDayOff: true, weekStart: 0, balanceWeekend: true, balanceShiftIds: ['sh2'] },
  })

  it('総当たりで「すべて埋まる」とわかっている3人の店で、どの種でも、足りないところを残さない', () => {
    const missing = Array.from({ length: 10 }, (_, i) => solve(fillable, { seed: i + 1 }).check.missingTotal)
    expect(missing).toEqual(new Array(10).fill(0))
  })

  it('足りない人数の下限（lowerBound）は、組んだ結果の足りない人数をこえない', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plan = randomPlan({ seed, staff: 1 + (seed % 12), tight: seed % 2 === 0, maxOffWishes: 8 })
      const r = solve(plan, { seed, effort: 0.05 })
      expect(r.lowerBound).toBeGreaterThanOrEqual(0)
      expect(r.lowerBound).toBeLessThanOrEqual(r.check.missingTotal)
    }
  })

  it('下限: 全員が休み希望の日は、その日の必要な人数ぶん。役割の札を持つ人がいない勤務は、役割の人数ぶん', () => {
    const plan = tinyPlan({
      needs: { weekly: { sh1: [2, 2, 2, 2, 2, 2, 2], sh2: [1, 1, 1, 1, 1, 1, 1] }, overrides: {}, roleMins: [{ id: 'rm1', shiftId: 'sh2', tagId: 'tag1', count: 1 }] },
      wishes: { st1: off(5), st2: off(5), st3: off(5) },
    })
    // 5日: 早番2人 + 遅番1人 = 3人足りない。役割（鍵の人）は、札を持つ人がいないので、31日ぶん
    const r = solve(plan, { seed: 1, effort: 0.05 })
    expect(r.lowerBound).toBe(3 + 31)
    expect(r.check.missingTotal).toBe(3 + 31)
  })

  it('solveBest: 足りないところがなければ、1回で終わる（solve と同じ表）', () => {
    const plan = tinyPlan()
    const best = solveBest(plan, { seed: 7, effort: 0.1 })
    expect(best.tries).toBe(1)
    expect(best.schedule).toEqual(solve(plan, { seed: 7, effort: 0.1 }).schedule)
  })

  it('solveBest: 足りない人数が下限と同じなら、それ以上は組み直さない', () => {
    const plan = tinyPlan({ wishes: { st1: off(5), st2: off(5), st3: off(5) } })
    const best = solveBest(plan, { seed: 1, effort: 0.1 })
    expect(best.check.missingTotal).toBe(1)
    expect(best.tries).toBe(1)
  })

  it('solveBest: 足りないところが残ると、別の種でも組み、いちばん良い表を返す。同じ種なら同じ結果。表の種は、渡した種のまま', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const plan = randomPlan({ seed, staff: 8, tight: true })
      const first = solve(plan, { seed, effort: 0.1 })
      const best = solveBest(plan, { seed, effort: 0.1 })
      if (first.check.missingTotal > first.lowerBound) {
        expect(best.tries).toBeGreaterThan(1)
        expect(best.tries).toBeLessThanOrEqual(RETRY_COUNT + 1)
      }
      expect(best.check.missingTotal).toBeLessThanOrEqual(first.check.missingTotal)
      // 組み直したどの案よりも、悪くない
      for (let k = 1; k < best.tries; k++) expect(best.check.missingTotal).toBeLessThanOrEqual(solve(plan, { seed: retrySeed(seed, k), effort: 0.1 }).check.missingTotal)
      expect(best.check.violations).toEqual([])
      expect(best.schedule.seed).toBe(seed)
      expect(solveBest(plan, { seed, effort: 0.1 }).schedule).toEqual(best.schedule)
    }
  })

  it('solveBest: 組み直しの途中経過は retry として届き、何回めかがわかる', () => {
    const plan = randomPlan({ seed: 2, staff: 8, tight: true })
    const seen: Array<{ index: number; total: number }> = []
    const best = solveBest(plan, { seed: 2, effort: 0.05, onProgress: (p) => p.phase === 'retry' && p.retry && seen.push(p.retry) })
    if (best.tries > 1) {
      expect(seen.length).toBeGreaterThan(0)
      expect(seen.every((r) => r.total === RETRY_COUNT && r.index >= 1 && r.index <= RETRY_COUNT)).toBe(true)
    }
  })
})

describe('自動作成: 速さ（目安は、20人 × 31日で3秒以内）', () => {
  it('20人 × 31日', () => {
    const plan = randomPlan({ seed: 3, staff: 20, year: 2026, month: 12 })
    const t0 = performance.now()
    const result = solve(plan, { seed: 1 })
    const ms = performance.now() - t0
    expect(result.check.violations).toEqual([])
    expect(ms).toBeLessThan(3000)
  })
  it('足りないところが残る20人の店で、別の案まで組んでも（solveBest）、目安の時間におさまる', () => {
    const plan = randomPlan({ seed: 5, staff: 20, tight: true })
    const t0 = performance.now()
    const result = solveBest(plan, { seed: 1 })
    const ms = performance.now() - t0
    expect(result.check.violations).toEqual([])
    expect(ms).toBeLessThan(4000)
  })
  it('30人 × 31日（有料版で確かめている人数）', () => {
    const plan = randomPlan({ seed: 4, staff: 30, year: 2026, month: 12 })
    const t0 = performance.now()
    const result = solve(plan, { seed: 1 })
    const ms = performance.now() - t0
    expect(result.check.violations).toEqual([])
    expect(ms).toBeLessThan(5000)
  })
})
