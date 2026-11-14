import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateFromLocal,
  daysBetween,
  daysInMonth,
  defaultFiscalPeriod,
  eraOf,
  fiscalYearLabel,
  formatMonthDay,
  formatSeireki,
  formatWareki,
  isValidDate,
  isWithin,
  makeDate,
  oneYearLater,
  parseDateInput,
  suggestNextLabel,
} from './dates'

describe('isValidDate', () => {
  it('実在する日だけを通す', () => {
    expect(isValidDate('2026-04-01')).toBe(true)
    expect(isValidDate('2024-02-29')).toBe(true) // うるう年
    expect(isValidDate('2025-02-29')).toBe(false)
    expect(isValidDate('2100-02-29')).toBe(false) // 100で割れる年は、うるう年ではない
    expect(isValidDate('2000-02-29')).toBe(true) // 400で割れる年は、うるう年
    expect(isValidDate('2026-04-31')).toBe(false)
    expect(isValidDate('2026-13-01')).toBe(false)
    expect(isValidDate('2026-00-10')).toBe(false)
    expect(isValidDate('2026-04-00')).toBe(false)
  })
  it('形が違うものは通さない', () => {
    expect(isValidDate('2026-4-1')).toBe(false)
    expect(isValidDate('2026/04/01')).toBe(false)
    expect(isValidDate('20260401')).toBe(false)
    expect(isValidDate('2026-04-01T00:00:00')).toBe(false)
    expect(isValidDate('')).toBe(false)
    expect(isValidDate(null)).toBe(false)
    expect(isValidDate(20260401)).toBe(false)
    expect(isValidDate(new Date())).toBe(false)
  })
  it('ありえない年は通さない', () => {
    expect(isValidDate('1899-12-31')).toBe(false)
    expect(isValidDate('1900-01-01')).toBe(true)
    expect(isValidDate('2199-12-31')).toBe(true)
    expect(isValidDate('2200-01-01')).toBe(false)
  })
})

describe('日付の計算', () => {
  it('月の日数', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
  it('makeDate は、実在しない日に null を返す', () => {
    expect(makeDate(2026, 4, 1)).toBe('2026-04-01')
    expect(makeDate(2026, 2, 29)).toBeNull()
    expect(makeDate(2026, 4.5, 1)).toBeNull()
  })
  it('addDays は、月・年・うるう日をまたいでも合う', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01')
    expect(addDays('2026-04-01', -1)).toBe('2026-03-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2026-04-01', 0)).toBe('2026-04-01')
    expect(addDays('2026-04-01', 365)).toBe('2027-04-01')
  })
  it('daysBetween', () => {
    expect(daysBetween('2026-04-01', '2026-04-01')).toBe(0)
    expect(daysBetween('2026-04-01', '2027-03-31')).toBe(364)
    expect(daysBetween('2027-04-01', '2028-03-31')).toBe(365) // うるう日を含む
    expect(daysBetween('2026-04-02', '2026-04-01')).toBe(-1)
  })
  it('isWithin は両端を含む', () => {
    expect(isWithin('2026-04-01', '2026-04-01', '2027-03-31')).toBe(true)
    expect(isWithin('2027-03-31', '2026-04-01', '2027-03-31')).toBe(true)
    expect(isWithin('2026-03-31', '2026-04-01', '2027-03-31')).toBe(false)
    expect(isWithin('2027-04-01', '2026-04-01', '2027-03-31')).toBe(false)
  })
  it('oneYearLater は、月末を月末のまま進める', () => {
    expect(oneYearLater('2026-03-31')).toBe('2027-03-31')
    expect(oneYearLater('2026-12-31')).toBe('2027-12-31')
    expect(oneYearLater('2026-06-15')).toBe('2027-06-15')
    expect(oneYearLater('2024-02-29')).toBe('2025-02-28')
    // 2月28日で終わる年度の次の年がうるう年なら、2月29日で終わる
    expect(oneYearLater('2027-02-28')).toBe('2028-02-29')
    expect(oneYearLater('2026-02-28')).toBe('2027-02-28')
  })
  it('dateFromLocal は、その端末の暦の日付を返す（夜遅くでも、朝早くでも、ずれない）', () => {
    expect(dateFromLocal(new Date(2026, 10, 14, 23, 59, 59))).toBe('2026-11-14')
    expect(dateFromLocal(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01')
    expect(dateFromLocal(new Date(2027, 2, 31, 12, 0, 0))).toBe('2027-03-31')
  })
})

describe('和暦', () => {
  it('令和は 2019年5月1日から', () => {
    expect(eraOf('2019-04-30')).toEqual({ era: '平成', year: 31 })
    expect(eraOf('2019-05-01')).toEqual({ era: '令和', year: 1 })
    expect(eraOf('2026-04-01')).toEqual({ era: '令和', year: 8 })
  })
  it('平成は 1989年1月8日から。それより前は西暦で書く', () => {
    expect(eraOf('1989-01-08')).toEqual({ era: '平成', year: 1 })
    expect(eraOf('1989-01-07')).toBeNull()
    expect(formatWareki('1989-01-07')).toBe('1989年1月7日')
  })
  it('formatWareki', () => {
    expect(formatWareki('2026-04-01')).toBe('令和8年4月1日')
    expect(formatWareki('2027-03-31')).toBe('令和9年3月31日')
    expect(formatWareki('2019-05-01')).toBe('令和元年5月1日')
    expect(formatWareki('2019-04-30')).toBe('平成31年4月30日')
    expect(formatWareki('1989-01-08')).toBe('平成元年1月8日')
  })
  it('正しくない日付は空文字にする（画面を落とさない）', () => {
    expect(formatWareki('')).toBe('')
    expect(formatWareki('2026-02-30')).toBe('')
    expect(formatSeireki('')).toBe('')
    expect(formatMonthDay('こわれた日付')).toBe('')
  })
  it('formatSeireki / formatMonthDay', () => {
    expect(formatSeireki('2026-04-01')).toBe('2026年4月1日')
    expect(formatMonthDay('2026-04-01')).toBe('4月1日')
    expect(formatMonthDay('2026-12-31')).toBe('12月31日')
  })
})

describe('年度の呼び名', () => {
  it('始まりの日から作る', () => {
    expect(fiscalYearLabel('2026-04-01')).toBe('令和8年度')
    expect(fiscalYearLabel('2026-01-01')).toBe('令和8年度')
    expect(fiscalYearLabel('2025-04-01')).toBe('令和7年度')
    expect(fiscalYearLabel('2018-04-01')).toBe('平成30年度')
  })
  it('2019年4月に始まる年度は「令和元年度」', () => {
    expect(fiscalYearLabel('2019-04-01')).toBe('令和元年度')
  })
  it('平成より前は西暦', () => {
    expect(fiscalYearLabel('1988-04-01')).toBe('1988年度')
  })
  it('次の年度の呼び名は、いまの呼び方を続ける', () => {
    expect(suggestNextLabel('令和8年度', '2027-04-01')).toBe('令和9年度')
    expect(suggestNextLabel('令和元年度', '2020-04-01')).toBe('令和2年度')
    expect(suggestNextLabel('2026年度', '2027-04-01')).toBe('2027年度')
    expect(suggestNextLabel('第12期', '2027-04-01')).toBe('第13期')
    expect(suggestNextLabel('令和９年度', '2028-04-01')).toBe('令和10年度')
    expect(suggestNextLabel('令和8年度（第3班）', '2027-04-01')).toBe('令和9年度（第3班）')
  })
  it('数字のない呼び名は、始まりの日から作る', () => {
    expect(suggestNextLabel('ことしの会計', '2027-04-01')).toBe('令和9年度')
  })
})

describe('defaultFiscalPeriod', () => {
  it('4月始まり。今日を含む年度を返す', () => {
    expect(defaultFiscalPeriod('2026-11-14')).toEqual({ startDate: '2026-04-01', endDate: '2027-03-31' })
    expect(defaultFiscalPeriod('2026-04-01')).toEqual({ startDate: '2026-04-01', endDate: '2027-03-31' })
    expect(defaultFiscalPeriod('2026-03-31')).toEqual({ startDate: '2025-04-01', endDate: '2026-03-31' })
    expect(defaultFiscalPeriod('2026-02-10')).toEqual({ startDate: '2025-04-01', endDate: '2026-03-31' })
  })
  it('1月始まり', () => {
    expect(defaultFiscalPeriod('2026-11-14', 1)).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' })
  })
  it('うるう年の2月末で終わる年度', () => {
    expect(defaultFiscalPeriod('2027-06-01', 3)).toEqual({ startDate: '2027-03-01', endDate: '2028-02-29' })
  })
})

describe('parseDateInput', () => {
  const period = { startDate: '2026-04-01', endDate: '2027-03-31' }
  const value = (text: string, p: typeof period | undefined = period) => {
    const r = parseDateInput(text, p)
    return r.ok ? r.value : `だめ: ${r.message}`
  }
  it('年・月・日のそろった書き方を読む', () => {
    expect(value('2026-04-01')).toBe('2026-04-01')
    expect(value('2026/4/1')).toBe('2026-04-01')
    expect(value('2026.4.1')).toBe('2026-04-01')
    expect(value('2026年4月1日')).toBe('2026-04-01')
    expect(value('20260401')).toBe('2026-04-01')
    expect(value('２０２６／４／１')).toBe('2026-04-01')
    expect(value(' 2026/ 4/ 1 ')).toBe('2026-04-01')
  })
  it('和暦を読む', () => {
    expect(value('令和8年4月1日')).toBe('2026-04-01')
    expect(value('R8.4.1')).toBe('2026-04-01')
    expect(value('r8/4/1')).toBe('2026-04-01')
    expect(value('令和元年5月1日')).toBe('2019-05-01')
    expect(value('平成31年4月30日')).toBe('2019-04-30')
    expect(value('H30.4.1')).toBe('2018-04-01')
  })
  it('その元号にない日は断る', () => {
    expect(parseDateInput('令和元年4月30日').ok).toBe(false)
    expect(parseDateInput('平成31年5月1日').ok).toBe(false)
    expect(parseDateInput('令和0年4月1日').ok).toBe(false)
  })
  it('月と日だけなら、会計年度の中に入る年を選ぶ', () => {
    expect(value('4/1')).toBe('2026-04-01')
    expect(value('12/31')).toBe('2026-12-31')
    expect(value('1/15')).toBe('2027-01-15') // 年をまたいだ1〜3月
    expect(value('3/31')).toBe('2027-03-31')
    expect(value('3月31日')).toBe('2027-03-31')
    expect(value('0401')).toBe('2026-04-01')
    expect(value('0105')).toBe('2027-01-05')
    expect(value('４／１')).toBe('2026-04-01')
  })
  it('1月始まりの年度では、どの月も同じ年になる', () => {
    const calendar = { startDate: '2026-01-01', endDate: '2026-12-31' }
    expect(value('1/15', calendar)).toBe('2026-01-15')
    expect(value('12/31', calendar)).toBe('2026-12-31')
  })
  it('うるう日は、うるう日のある年のほうを選ぶ', () => {
    expect(value('2/29', { startDate: '2027-04-01', endDate: '2028-03-31' })).toBe('2028-02-29')
    expect(parseDateInput('2/29', period).ok).toBe(false) // 2027年に2月29日はない
  })
  it('月と日だけで、年度がわからないときは断る', () => {
    expect(parseDateInput('4/1').ok).toBe(false)
  })
  it('実在しない日・読めない文字は断る', () => {
    for (const text of ['', '   ', '2026-02-30', '2026/13/1', '4/31', '13/1', 'あした', '2026', '4', '2026-04', '99999999']) {
      expect(parseDateInput(text, period).ok, text).toBe(false)
    }
  })
})
