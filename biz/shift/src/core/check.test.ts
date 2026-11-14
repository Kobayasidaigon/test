import { describe, expect, it } from 'vitest'
import { checkPlan, violationsByCell, whyNot } from './check'
import { emptySchedule } from './schedule'
import { range, tinyPlan, workOn } from './testkit'
import type { ShiftPlan } from './types'

/** st1 に、sh1 を days の日に入れた表 */
const st1Works = (days: number[], shiftId = 'sh1') => workOn(emptySchedule(), 'st1', shiftId, days)
const kinds = (plan: ShiftPlan, schedule = plan.schedule) => checkPlan(plan, schedule).violations.map((v) => v.kind)

describe('点検: 必ず守る条件', () => {
  it('空の表は、違反が0件。足りないところは、必要人数のぶんだけ出る', () => {
    const r = checkPlan(tinyPlan())
    expect(r.violations).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.shortages).toHaveLength(31)
    expect(r.missingTotal).toBe(31)
    expect(r.summary[0]).toContain('0件')
  })

  it('スタッフが1人もいなくても、落ちない', () => {
    const r = checkPlan(tinyPlan({ staff: [] }))
    expect(r.ok).toBe(true)
    expect(r.shortages).toHaveLength(31)
  })

  it('店を開けない日に勤務が入っていたら、違反', () => {
    const plan = tinyPlan({ closed: { weekdays: [], days: [10] } })
    const r = checkPlan(plan, st1Works([10]))
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]).toMatchObject({ kind: 'closedDay', staffId: 'st1', days: [10] })
    expect(r.violations[0].message).toContain('12月10日（木）')
    expect(r.ok).toBe(false)
  })

  it('休み希望の日に勤務が入っていたら、違反。「入りたい」の希望は、違反にはならない', () => {
    const plan = tinyPlan({ wishes: { st1: { '3': { kind: 'off' }, '4': { kind: 'shift', shiftId: 'sh2' } } } })
    expect(kinds(plan, st1Works([3]))).toEqual(['offWish'])
    expect(kinds(plan, st1Works([4]))).toEqual([])
    // ほかの人の休み希望は、関係ない
    expect(kinds(plan, workOn(emptySchedule(), 'st2', 'sh1', [3]))).toEqual([])
  })

  it('固定の休みの曜日に勤務が入っていたら、違反（1日は火曜）', () => {
    const plan = tinyPlan()
    plan.staff[0].fixedOffWeekdays = [2]
    expect(kinds(plan, st1Works([1]))).toEqual(['fixedOff'])
    expect(kinds(plan, st1Works([2]))).toEqual([])
  })

  it('入れない曜日・勤務に入っていたら、違反。同じ曜日の、別の勤務なら違反ではない', () => {
    const plan = tinyPlan()
    plan.staff[0].cannotWork = { sh2: [3] } // 水曜の遅番には入れない
    expect(kinds(plan, st1Works([2], 'sh2'))).toEqual(['cannotWork'])
    expect(kinds(plan, st1Works([2], 'sh1'))).toEqual([])
    expect(kinds(plan, st1Works([3], 'sh2'))).toEqual([]) // 木曜の遅番は入れる
  })

  describe('連続勤務の上限（5日）', () => {
    const plan = tinyPlan({ rules: { ...tinyPlan().rules, maxConsecutive: 5 } })

    it('ちょうど5日は、違反ではない', () => {
      expect(kinds(plan, st1Works(range(1, 5)))).toEqual([])
    })
    it('6日続くと違反。印は、こえた日（6日め）に付く', () => {
      const r = checkPlan(plan, st1Works(range(1, 6)))
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]).toMatchObject({ kind: 'maxConsecutive', days: [6] })
      expect(r.violations[0].message).toContain('6日続けて')
    })
    it('8日続くと、こえた3日すべてに印が付く（違反は1件として数える）', () => {
      const r = checkPlan(plan, st1Works(range(10, 17)))
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0].days).toEqual([15, 16, 17])
    })
    it('あいだに休みが1日あれば、続きは切れる', () => {
      expect(kinds(plan, st1Works([...range(1, 5), ...range(7, 11)]))).toEqual([])
    })
    it('月の終わりまで続いても、同じように数える', () => {
      expect(kinds(plan, st1Works(range(27, 31)))).toEqual([])
      const r = checkPlan(plan, st1Works(range(26, 31)))
      expect(r.violations[0]).toMatchObject({ kind: 'maxConsecutive', days: [31] })
    })
    it('上限を決めていなければ、何日続いても違反ではない', () => {
      expect(kinds(tinyPlan(), st1Works(range(1, 31)))).toEqual([])
    })
    it('上限が1日なら、2日続いただけで違反', () => {
      const p = tinyPlan({ rules: { ...tinyPlan().rules, maxConsecutive: 1 } })
      expect(kinds(p, st1Works([1, 3, 5]))).toEqual([])
      expect(kinds(p, st1Works([1, 2]))).toEqual(['maxConsecutive'])
    })

    describe('前の月の終わりから続いているとき', () => {
      const carried = (tail: Array<string | null>) => ({ ...plan, carry: { year: 2026, month: 11, tail: { st1: tail } } })

      it('前の月の3日 + 今月の2日 = 5日は、違反ではない', () => {
        expect(kinds(carried([null, 'sh1', 'sh1', 'sh1']), st1Works([1, 2]))).toEqual([])
      })
      it('前の月の3日 + 今月の3日 = 6日は、違反。印は今月の3日に付く', () => {
        const r = checkPlan(carried([null, 'sh1', 'sh1', 'sh1']), st1Works([1, 2, 3]))
        expect(r.violations).toHaveLength(1)
        expect(r.violations[0]).toMatchObject({ kind: 'maxConsecutive', days: [3] })
        expect(r.violations[0].message).toContain('前の月')
      })
      it('前の月だけで上限をこえていたら、今月の1日から印が付く', () => {
        const r = checkPlan(carried(['sh1', 'sh1', 'sh1', 'sh1', 'sh1', 'sh1']), st1Works([1, 2]))
        expect(r.violations[0].days).toEqual([1, 2])
      })
      it('前の月の末日が休みなら、つながらない', () => {
        expect(kinds(carried(['sh1', 'sh1', 'sh1', 'sh1', null]), st1Works(range(1, 5)))).toEqual([])
      })
      it('今月の1日が休みなら、前の月の続きは今月の違反にならない', () => {
        expect(kinds(carried(['sh1', 'sh1', 'sh1', 'sh1', 'sh1', 'sh1', 'sh1']), st1Works(range(2, 6)))).toEqual([])
      })
      it('前の月にあって、今はない勤務の種類でも、「勤務していた」として数える', () => {
        expect(kinds(carried(['old', 'old', 'old']), st1Works([1, 2, 3]))).toEqual(['maxConsecutive'])
      })
      it('ほかの人の続きとは、まざらない', () => {
        expect(kinds(carried(['sh1', 'sh1', 'sh1']), workOn(emptySchedule(), 'st2', 'sh1', range(1, 5)))).toEqual([])
      })
    })
  })

  describe('続けて入れない組み合わせ（遅番の次の日に早番）', () => {
    const plan = tinyPlan({ rules: { ...tinyPlan().rules, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }] } })

    it('遅番 → 早番 は違反。2つのマスに印が付く', () => {
      const s = workOn(st1Works([4], 'sh2'), 'st1', 'sh1', [5])
      const r = checkPlan(plan, s)
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]).toMatchObject({ kind: 'forbiddenPair', days: [4, 5] })
    })
    it('早番 → 遅番 は違反ではない（向きがある）', () => {
      expect(kinds(plan, workOn(st1Works([4], 'sh1'), 'st1', 'sh2', [5]))).toEqual([])
    })
    it('あいだに休みが1日あれば、違反ではない', () => {
      expect(kinds(plan, workOn(st1Works([4], 'sh2'), 'st1', 'sh1', [6]))).toEqual([])
    })
    it('別の人どうしなら、違反ではない', () => {
      expect(kinds(plan, workOn(st1Works([4], 'sh2'), 'st2', 'sh1', [5]))).toEqual([])
    })
    it('前の月の末日が遅番で、今月の1日が早番なら、違反。印は1日に付く', () => {
      const p = { ...plan, carry: { year: 2026, month: 11, tail: { st1: ['sh1', 'sh2'] } } }
      const r = checkPlan(p, st1Works([1], 'sh1'))
      expect(r.violations[0]).toMatchObject({ kind: 'forbiddenPair', days: [1] })
      expect(r.violations[0].message).toContain('前の月の末日')
      // 末日が休みなら違反ではない
      const q = { ...plan, carry: { year: 2026, month: 11, tail: { st1: ['sh2', null] } } }
      expect(kinds(q, st1Works([1], 'sh1'))).toEqual([])
    })
  })

  it('月の勤務日数の上限: ちょうどは違反ではなく、1日こえると違反（印は付けない）', () => {
    const plan = tinyPlan()
    plan.staff[0].maxDays = 3
    expect(kinds(plan, st1Works([1, 3, 5]))).toEqual([])
    const r = checkPlan(plan, st1Works([1, 3, 5, 7]))
    expect(r.violations[0]).toMatchObject({ kind: 'maxDays', days: [] })
    expect(r.violations[0].message).toContain('4日')
  })

  it('上限が0日の人は、1日入っただけで違反', () => {
    const plan = tinyPlan()
    plan.staff[0].maxDays = 0
    expect(kinds(plan, st1Works([1]))).toEqual(['maxDays'])
  })

  it('1つのマスが2つの条件に合わないときは、2件とも出る', () => {
    const plan = tinyPlan({ closed: { weekdays: [], days: [3] }, wishes: { st1: { '3': { kind: 'off' } } } })
    expect(kinds(plan, st1Works([3])).sort()).toEqual(['closedDay', 'offWish'])
  })

  it('いないスタッフのマスが表に残っていても、落ちない', () => {
    const r = checkPlan(tinyPlan(), workOn(emptySchedule(), 'ghost', 'sh1', [1]))
    expect(r.ok).toBe(true)
  })
})

describe('点検: なるべく満たす条件', () => {
  it('人数の不足と、多すぎを数える', () => {
    let s = workOn(emptySchedule(), 'st1', 'sh1', [1, 2])
    s = workOn(s, 'st2', 'sh1', [2])
    const r = checkPlan(tinyPlan(), s)
    expect(r.shortages.find((x) => x.day === 1)).toBeUndefined()
    expect(r.surpluses).toEqual([{ day: 2, shiftId: 'sh1', need: 1, have: 2, extra: 1 }])
    expect(r.shortages.find((x) => x.day === 3)).toEqual({ day: 3, shiftId: 'sh1', need: 1, have: 0, missing: 1 })
    expect(r.shortages).toHaveLength(29)
  })

  it('人が要らない勤務に入っていたら、「多い」として出る', () => {
    const r = checkPlan(tinyPlan(), st1Works([1], 'sh2'))
    expect(r.surpluses).toEqual([{ day: 1, shiftId: 'sh2', need: 0, have: 1, extra: 1 }])
  })

  it('役割の最低人数: 札を持つ人がいなければ不足。持つ人がいれば不足ではない', () => {
    const plan = tinyPlan({ needs: { ...tinyPlan().needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    plan.staff[1].tagIds = ['tag1']
    const noKey = checkPlan(plan, st1Works([1]))
    expect(noKey.roleShortages.find((x) => x.day === 1)).toMatchObject({ shiftId: 'sh1', tagId: 'tag1', need: 1, have: 0, missing: 1 })
    const withKey = checkPlan(plan, workOn(emptySchedule(), 'st2', 'sh1', [1]))
    expect(withKey.roleShortages.find((x) => x.day === 1)).toBeUndefined()
    // 人数の不足と、役割の不足は、別べつに数える
    expect(noKey.missingTotal).toBe(30 + 31)
  })

  it('役割の最低人数は、その日その勤務に人が要らないときは調べない', () => {
    const base = tinyPlan()
    const plan = tinyPlan({ needs: { ...base.needs, overrides: { '1': { sh1: 0 } }, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] } })
    const r = checkPlan(plan)
    expect(r.roleShortages.find((x) => x.day === 1)).toBeUndefined()
    expect(r.roleShortages).toHaveLength(30)
  })

  it('月の勤務日数の下限: ちょうどなら出ない。1日足りないと出る', () => {
    const plan = tinyPlan()
    plan.staff[0].minDays = 3
    expect(checkPlan(plan, st1Works([1, 2, 3])).minDaysShort).toEqual([])
    const r = checkPlan(plan, st1Works([1, 2]))
    expect(r.minDaysShort).toHaveLength(1)
    expect(r.minDaysShort[0]).toMatchObject({ staffId: 'st1', count: 2, min: 3 })
    expect(r.ok).toBe(true) // 下限は「なるべく」なので、違反ではない
  })

  it('かなわなかった「この勤務に入りたい」を出す', () => {
    const plan = tinyPlan({ wishes: { st1: { '2': { kind: 'shift', shiftId: 'sh1' } } } })
    expect(checkPlan(plan, st1Works([2], 'sh1')).wishesUnmet).toEqual([])
    expect(checkPlan(plan, st1Works([2], 'sh2')).wishesUnmet[0]).toMatchObject({ day: 2, wishedShiftId: 'sh1', actualShiftId: 'sh2' })
    expect(checkPlan(plan).wishesUnmet[0]).toMatchObject({ day: 2, actualShiftId: null })
  })

  describe('毎週1日の休み（2026年12月。6日が日曜）', () => {
    const weekly = (weekStart: 0 | 1) => tinyPlan({ rules: { ...tinyPlan().rules, weeklyDayOff: true, weekStart } })

    it('日曜から土曜まで7日ぜんぶ勤務なら、出る', () => {
      const r = checkPlan(weekly(0), st1Works(range(6, 12)))
      expect(r.weeksWithoutOff).toHaveLength(1)
      expect(r.weeksWithoutOff[0].days).toEqual(range(6, 12))
    })
    it('7日続いていても、週の区切りをまたいでいれば出ない（週ごとに1日休めている）', () => {
      expect(checkPlan(weekly(0), st1Works(range(7, 13))).weeksWithoutOff).toEqual([])
      // 週の始まりを月曜にすると、同じ7日が1つの週になる
      expect(checkPlan(weekly(1), st1Works(range(7, 13))).weeksWithoutOff).toHaveLength(1)
    })
    it('選んでいなければ、調べない', () => {
      expect(checkPlan(tinyPlan(), st1Works(range(6, 12))).weeksWithoutOff).toEqual([])
    })
    it('月の初めの切れた週は、前の月の勤務がわからないので調べない', () => {
      expect(checkPlan(weekly(0), st1Works(range(1, 5))).weeksWithoutOff).toEqual([])
    })
    it('前の月の勤務を引き継いでいれば、月の初めの週も調べる', () => {
      // 11月29日（日）・30日（月）も勤務 → 12月5日（土）までの週に休みがない
      const plan = { ...weekly(0), carry: { year: 2026, month: 11, tail: { st1: [null, 'sh1', 'sh1'] } } }
      const r = checkPlan(plan, st1Works(range(1, 5)))
      expect(r.weeksWithoutOff).toHaveLength(1)
      expect(r.weeksWithoutOff[0].days).toEqual(range(1, 5))
      expect(r.weeksWithoutOff[0].message).toContain('前の月')
      // 前の月の30日が休みなら、出ない
      const rested = { ...weekly(0), carry: { year: 2026, month: 11, tail: { st1: ['sh1', null] } } }
      expect(checkPlan(rested, st1Works(range(1, 5))).weeksWithoutOff).toEqual([])
    })
    it('月の終わりの切れた週（27日〜31日）は、調べない', () => {
      expect(checkPlan(weekly(0), st1Works(range(27, 31))).weeksWithoutOff).toEqual([])
    })
  })

  it('まとめの文は、0件のときも「0件」と言う', () => {
    const plan = tinyPlan({ needs: { weekly: { sh1: [0, 0, 0, 0, 0, 0, 0], sh2: [0, 0, 0, 0, 0, 0, 0] }, overrides: {}, roleMins: [] } })
    const r = checkPlan(plan)
    expect(r.summary).toEqual(['必ず守る条件（休み希望、定休日、連勤の上限など）の違反は、0件です。', '必要な人数は、すべての日でそろっています（不足は0件）。'])
    expect(r.missingTotal).toBe(0)
  })
})

describe('violationsByCell', () => {
  it('マスごとに、違反の文をまとめる', () => {
    const plan = tinyPlan({ closed: { weekdays: [], days: [3] }, wishes: { st1: { '3': { kind: 'off' } } } })
    const map = violationsByCell(checkPlan(plan, st1Works([3])))
    expect(map.get('st1:3')).toHaveLength(2)
    expect(map.get('st1:4')).toBeUndefined()
  })
})

describe('whyNot（このマスにこの勤務を入れたら、どの条件に当たるか）', () => {
  it('何にも当たらなければ、空', () => {
    expect(whyNot(tinyPlan(), emptySchedule(), 'st1', 1, 'sh1')).toEqual([])
  })
  it('1マスで決まる理由', () => {
    const plan = tinyPlan({ closed: { weekdays: [], days: [10] }, wishes: { st1: { '3': { kind: 'off' } } } })
    plan.staff[0].fixedOffWeekdays = [0]
    plan.staff[0].cannotWork = { sh2: [3] }
    expect(whyNot(plan, emptySchedule(), 'st1', 10, 'sh1')).toEqual(['closedDay'])
    expect(whyNot(plan, emptySchedule(), 'st1', 3, 'sh1')).toEqual(['offWish'])
    expect(whyNot(plan, emptySchedule(), 'st1', 6, 'sh1')).toEqual(['fixedOff'])
    expect(whyNot(plan, emptySchedule(), 'st1', 2, 'sh2')).toEqual(['cannotWork'])
  })
  it('月の勤務日数の上限: 休みのマスに足すときだけ数える（勤務の種類を変えるだけなら、日数は増えない）', () => {
    const plan = tinyPlan()
    plan.staff[0].maxDays = 2
    const s = st1Works([1, 2])
    expect(whyNot(plan, s, 'st1', 5, 'sh1')).toEqual(['maxDays'])
    expect(whyNot(plan, s, 'st1', 2, 'sh2')).toEqual([])
  })
  it('連勤の上限: 前と後ろの続きをつなげて数える', () => {
    const plan = tinyPlan({ rules: { ...tinyPlan().rules, maxConsecutive: 5 } })
    // 1〜3日と5〜6日が勤務。4日を入れると6日続きになる
    const s = st1Works([1, 2, 3, 5, 6])
    expect(whyNot(plan, s, 'st1', 4, 'sh1')).toEqual(['maxConsecutive'])
    expect(whyNot(plan, s, 'st1', 8, 'sh1')).toEqual([])
    // 前の月から続いているぶんも数える
    const carried = { ...plan, carry: { year: 2026, month: 11, tail: { st1: ['sh1', 'sh1', 'sh1', 'sh1', 'sh1'] } } }
    expect(whyNot(carried, emptySchedule(), 'st1', 1, 'sh1')).toEqual(['maxConsecutive'])
    expect(whyNot(carried, emptySchedule(), 'st1', 2, 'sh1')).toEqual([])
  })
  it('続けて入れない組み合わせ: 前の日とも、次の日とも見る', () => {
    const plan = tinyPlan({ rules: { ...tinyPlan().rules, forbiddenPairs: [{ id: 'fp1', first: 'sh2', next: 'sh1' }] } })
    expect(whyNot(plan, st1Works([4], 'sh2'), 'st1', 5, 'sh1')).toEqual(['forbiddenPair'])
    expect(whyNot(plan, st1Works([5], 'sh1'), 'st1', 4, 'sh2')).toEqual(['forbiddenPair'])
    expect(whyNot(plan, st1Works([4], 'sh2'), 'st1', 5, 'sh2')).toEqual([])
  })
  it('いないスタッフや、ない日を聞いても、落ちない', () => {
    expect(whyNot(tinyPlan(), emptySchedule(), 'ghost', 1, 'sh1')).toEqual([])
    expect(whyNot(tinyPlan(), emptySchedule(), 'st1', 40, 'sh1')).toEqual([])
  })
})
