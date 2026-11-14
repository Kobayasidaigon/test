import { describe, expect, it, vi } from 'vitest'
import { site } from '@/site.config'
import { buildCalendar } from './calendar'
import { makeSample, SAMPLES } from './samples'
import { isScheduleEmpty } from './schedule'
import { solve } from './solver'
import { validatePlan } from './storage'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

/** 2026年12月から13か月ぶん */
const MONTHS: Array<[number, number]> = Array.from({ length: 13 }, (_, k) => [2026 + Math.floor((11 + k) / 12), ((11 + k) % 12) + 1])

describe('サンプルのデータ', () => {
  it('美容室・飲食店・薬局の3種類', () => {
    expect(SAMPLES.map((s) => s.label)).toEqual(['美容室', '飲食店', '薬局'])
  })

  it('どの月で作っても、保存の検査を通る（ない日を指さない、ない勤務を指さない）', () => {
    for (const s of SAMPLES) {
      for (const [y, m] of [...MONTHS, [2028, 2], [2030, 2], [2099, 12]] as Array<[number, number]>) {
        const r = validatePlan(makeSample(s.id, y, m))
        if (!r.ok) throw new Error(`${s.id} ${y}-${m}: ${r.reason}`)
      }
    }
  })

  it('スタッフは、無料版の上限（8人）以下', () => {
    for (const s of SAMPLES) expect(makeSample(s.id, 2026, 12).staff.length).toBeLessThanOrEqual(site.pricing.free.staffLimit)
  })

  it('表は空で始まる（「組む」を押すと埋まる）。希望と、役割の最低人数が入っている', () => {
    for (const s of SAMPLES) {
      const plan = makeSample(s.id, 2026, 12)
      expect(isScheduleEmpty(plan.schedule)).toBe(true)
      expect(Object.keys(plan.wishes).length).toBeGreaterThan(0)
      expect(plan.needs.roleMins.length).toBeGreaterThan(0)
    }
  })

  it('希望は、入れない日に出していない（固定の休みの曜日や定休日に「入りたい」と言っていない）', () => {
    for (const s of SAMPLES) {
      for (const [y, m] of MONTHS) {
        const plan = makeSample(s.id, y, m)
        const cal = buildCalendar(plan)
        for (const st of plan.staff) {
          for (const [day, w] of Object.entries(plan.wishes[st.id] ?? {})) {
            if (w.kind !== 'shift') continue
            const d = cal[Number(day) - 1]
            expect(d.closed, `${s.id} ${y}-${m} ${st.name} ${day}日`).toBeNull()
            expect(st.fixedOffWeekdays.includes(d.weekday)).toBe(false)
            expect(st.cannotWork[w.shiftId]?.includes(d.weekday) ?? false).toBe(false)
          }
        }
      }
    }
  })

  it('美容室と薬局は、13か月のどの月でも、足りないところなく組める', () => {
    for (const id of ['salon', 'pharmacy'] as const) {
      for (const [y, m] of MONTHS) {
        const r = solve(makeSample(id, y, m), { seed: 1 })
        expect(r.check.violations, `${id} ${y}-${m}`).toEqual([])
        expect(r.check.missingTotal, `${id} ${y}-${m}`).toBe(0)
        expect(r.check.minDaysShort, `${id} ${y}-${m}`).toEqual([])
      }
    }
  })

  it('飲食店は、13か月のどの月でも、「キッチン」が足りない日が出る（組めないときの説明を見せるため）', () => {
    for (const [y, m] of MONTHS) {
      const plan = makeSample('restaurant', y, m)
      const r = solve(plan, { seed: 1 })
      expect(r.check.violations, `${y}-${m}`).toEqual([])
      expect(r.check.roleShortages.length, `${y}-${m}`).toBeGreaterThan(0)
      expect(r.check.roleShortages.every((x) => x.tagId === 'tag1'), `${y}-${m}`).toBe(true)
    }
  })
})
