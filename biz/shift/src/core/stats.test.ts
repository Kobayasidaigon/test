import { describe, expect, it } from 'vitest'
import { emptySchedule } from './schedule'
import { formatMinutes, shiftMinutes, summarize } from './stats'
import { tinyPlan, workOn } from './testkit'
import type { ShiftType } from './types'

const shift = (start: string, end: string, breakMinutes = 0): ShiftType => ({ id: 'x', name: 'x', symbol: 'x', start, end, breakMinutes, color: 'egg' })

describe('shiftMinutes', () => {
  it('終了 − 開始 − 休憩', () => {
    expect(shiftMinutes(shift('09:00', '17:00', 60))).toBe(420)
    expect(shiftMinutes(shift('09:00', '13:00'))).toBe(240)
    expect(shiftMinutes(shift('09:15', '17:45', 45))).toBe(465)
  })
  it('日をまたぐ勤務（22時から翌6時）', () => {
    expect(shiftMinutes(shift('22:00', '06:00', 60))).toBe(420)
  })
  it('開始と終了が同じ時刻なら、24時間とみなす', () => {
    expect(shiftMinutes(shift('09:00', '09:00'))).toBe(24 * 60)
  })
  it('休憩が勤務より長くても、負にはしない', () => {
    expect(shiftMinutes(shift('09:00', '10:00', 120))).toBe(0)
  })
  it('時刻の形が合わなければ 0（落ちない）', () => {
    expect(shiftMinutes(shift('9時', '17:00'))).toBe(0)
    expect(shiftMinutes(shift('09:00', ''))).toBe(0)
  })
})

describe('formatMinutes', () => {
  it('時間と分にする', () => {
    expect(formatMinutes(0)).toBe('0時間')
    expect(formatMinutes(120)).toBe('2時間')
    expect(formatMinutes(150)).toBe('2時間30分')
    expect(formatMinutes(9150)).toBe('152時間30分')
  })
})

describe('summarize', () => {
  it('スタッフごとの集計: 勤務日数、休み、土日祝、勤務の種類ごと、勤務時間', () => {
    // 2026年12月。5日（土）・6日（日）が週末
    let s = workOn(emptySchedule(), 'st1', 'sh1', [1, 2, 5])
    s = workOn(s, 'st1', 'sh2', [6])
    const sum = summarize(tinyPlan(), s)
    expect(sum.staff[0]).toEqual({
      staffId: 'st1',
      workDays: 4,
      offDays: 27,
      weekendHolidayDays: 2,
      byShift: { sh1: 3, sh2: 1 },
      minutes: 4 * 420,
    })
    expect(sum.staff[1]).toMatchObject({ workDays: 0, offDays: 31, weekendHolidayDays: 0, byShift: { sh1: 0, sh2: 0 }, minutes: 0 })
    expect(sum.totalWorkDays).toBe(4)
  })

  it('祝日に入った日も、土日祝の回数に数える（2026年9月21日は月曜の祝日）', () => {
    const plan = tinyPlan({ year: 2026, month: 9 })
    const sum = summarize(plan, workOn(emptySchedule(), 'st1', 'sh1', [21, 24]))
    expect(sum.staff[0].weekendHolidayDays).toBe(1)
  })

  it('日ごとの過不足', () => {
    let s = workOn(emptySchedule(), 'st1', 'sh1', [1, 2])
    s = workOn(s, 'st2', 'sh1', [2])
    const sum = summarize(tinyPlan(), s)
    expect(sum.days).toHaveLength(31)
    expect(sum.days[0]).toEqual({
      day: 1,
      slots: [
        { shiftId: 'sh1', need: 1, have: 1, diff: 0, roleShort: [] },
        { shiftId: 'sh2', need: 0, have: 0, diff: 0, roleShort: [] },
      ],
      totalHave: 1,
      totalNeed: 1,
    })
    expect(sum.days[1].slots[0]).toEqual({ shiftId: 'sh1', need: 1, have: 2, diff: 1, roleShort: [] })
    expect(sum.days[2].slots[0]).toEqual({ shiftId: 'sh1', need: 1, have: 0, diff: -1, roleShort: [] })
    expect(sum.totalNeed).toBe(31)
  })

  it('役割の最低人数が足りない日は、人数がそろっていても roleShort に出る（表の下の行と印刷で、印を出すため）', () => {
    const base = tinyPlan()
    const plan = tinyPlan({
      staff: [{ ...base.staff[0], tagIds: ['tag1'] }, base.staff[1], base.staff[2]],
      needs: { ...base.needs, roleMins: [{ id: 'rm1', shiftId: 'sh1', tagId: 'tag1', count: 1 }] },
    })
    let s = workOn(emptySchedule(), 'st1', 'sh1', [1])
    s = workOn(s, 'st2', 'sh1', [2])
    const sum = summarize(plan, s)
    // 1日: 札のある青木さん → 足りている。2日: 札のない石川さんだけ → 人数はちょうどでも、役割が足りない
    expect(sum.days[0].slots[0].roleShort).toEqual([])
    expect(sum.days[1].slots[0]).toMatchObject({ diff: 0, roleShort: [{ tagId: 'tag1', need: 1, have: 0 }] })
    // 人が要らない勤務（遅番）には、役割の不足を数えない（点検と同じ）
    expect(sum.days[1].slots[1].roleShort).toEqual([])
  })

  it('スタッフも勤務の種類もなくても、落ちない', () => {
    const sum = summarize(tinyPlan({ staff: [], shiftTypes: [], needs: { weekly: {}, overrides: {}, roleMins: [] } }))
    expect(sum.staff).toEqual([])
    expect(sum.days).toHaveLength(31)
    expect(sum.totalNeed).toBe(0)
  })

  it('消した勤務の種類が表に残っていても、落ちない（日数には数える）', () => {
    const sum = summarize(tinyPlan(), workOn(emptySchedule(), 'st1', 'gone', [1]))
    expect(sum.staff[0]).toMatchObject({ workDays: 1, minutes: 0, byShift: { sh1: 0, sh2: 0 } })
  })
})
