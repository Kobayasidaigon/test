import { describe, expect, it } from 'vitest'
import { daysInMonth, formatDay, formatMonth, localToday, nextMonth, nextMonthOf, parseTime, prevMonth, weekdayOf } from './dates'

describe('daysInMonth', () => {
  it('月ごとの日数を返す', () => {
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(daysInMonth(2026, 11)).toBe(30)
    expect(daysInMonth(2027, 4)).toBe(30)
  })
  it('うるう年の2月は29日、そうでない年は28日', () => {
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    // 100で割り切れて400で割り切れない年は、うるう年ではない
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
  })
})

describe('weekdayOf', () => {
  it('知っている日付の曜日と合う', () => {
    expect(weekdayOf(2026, 11, 14)).toBe(6) // 土曜（この道具を作った日）
    expect(weekdayOf(2026, 12, 1)).toBe(2) // 火曜
    expect(weekdayOf(2027, 1, 1)).toBe(5) // 金曜
    expect(weekdayOf(2028, 2, 29)).toBe(2) // 火曜（うるう日）
  })
})

describe('月の前後', () => {
  it('12月の次は、次の年の1月', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 })
    expect(nextMonth(2026, 11)).toEqual({ year: 2026, month: 12 })
  })
  it('1月の前は、前の年の12月', () => {
    expect(prevMonth(2027, 1)).toEqual({ year: 2026, month: 12 })
    expect(prevMonth(2027, 3)).toEqual({ year: 2027, month: 2 })
  })
  it('今日から「来月」を出す。月末でも、年末でも正しい', () => {
    expect(nextMonthOf('2026-11-14')).toEqual({ year: 2026, month: 12 })
    expect(nextMonthOf('2026-12-31')).toEqual({ year: 2027, month: 1 })
    expect(nextMonthOf('2027-01-31')).toEqual({ year: 2027, month: 2 })
  })
  it('形の合わない日付は、だまって進めずに知らせる', () => {
    expect(() => nextMonthOf('2026/11/14')).toThrow()
  })
  it('localToday は、端末の暦の日付を YYYY-MM-DD で返す', () => {
    expect(localToday(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04')
  })
})

describe('parseTime', () => {
  it('時刻を分にする', () => {
    expect(parseTime('09:00')).toBe(540)
    expect(parseTime('9:00')).toBe(540)
    expect(parseTime('00:00')).toBe(0)
    expect(parseTime('23:59')).toBe(1439)
  })
  it('ありえない時刻と、形の合わない文字は null', () => {
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
    expect(parseTime('9時')).toBeNull()
    expect(parseTime('')).toBeNull()
    expect(parseTime('09:0')).toBeNull()
  })
})

describe('文にする', () => {
  it('日と月', () => {
    expect(formatDay(2026, 12, 5)).toBe('12月5日（土）')
    expect(formatMonth(2026, 12)).toBe('2026年12月')
  })
})
