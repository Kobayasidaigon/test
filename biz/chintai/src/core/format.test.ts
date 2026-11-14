import { describe, expect, it } from 'vitest'
import {
  daysInMonth,
  formatDateJa,
  formatMonthDayJa,
  formatMonths,
  formatYen,
  formatYenOrBlank,
  isValidAmount,
  isValidDate,
  MAX_AMOUNT,
  parseAmountInput,
  parseDate,
} from './format'

describe('formatYen', () => {
  it('3けたごとにカンマを入れて、円を付ける', () => {
    expect(formatYen(0)).toBe('0円')
    expect(formatYen(999)).toBe('999円')
    expect(formatYen(1000)).toBe('1,000円')
    expect(formatYen(16500)).toBe('16,500円')
    expect(formatYen(1234567)).toBe('1,234,567円')
  })
  it('マイナスは、全角のマイナスを付ける', () => {
    expect(formatYen(-1000)).toBe('−1,000円')
  })
  it('未入力は「未入力」', () => {
    expect(formatYenOrBlank(null)).toBe('未入力')
    expect(formatYenOrBlank(0)).toBe('0円')
  })
})

describe('formatMonths', () => {
  it('0.5 刻みに合うときは「約」を付けない', () => {
    expect(formatMonths(1)).toBe('1か月分')
    expect(formatMonths(0.5)).toBe('0.5か月分')
    expect(formatMonths(1.5)).toBe('1.5か月分')
    expect(formatMonths(2)).toBe('2か月分')
  })
  it('合わないときは「約」を付けて、小数第2位まで', () => {
    expect(formatMonths(1.37)).toBe('約1.37か月分')
    expect(formatMonths(0.2)).toBe('約0.2か月分')
    expect(formatMonths(1.1)).toBe('約1.1か月分')
  })
  it('0 に近い値を「0か月分」と言い切らない', () => {
    expect(formatMonths(0.004)).toBe('約0か月分')
  })
})

describe('日付', () => {
  it('その月の日数（うるう年を含む）', () => {
    expect(daysInMonth(2027, 1)).toBe(31)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29) // うるう年
    expect(daysInMonth(2100, 2)).toBe(28) // 100で割れる年は、うるう年ではない
    expect(daysInMonth(2000, 2)).toBe(29) // 400で割れる年は、うるう年
    expect(daysInMonth(2027, 4)).toBe(30)
    expect(daysInMonth(2027, 12)).toBe(31)
  })
  it('正しい日付を分ける', () => {
    expect(parseDate('2027-03-20')).toEqual({ year: 2027, month: 3, day: 20 })
    expect(parseDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 })
  })
  it('暦にない日や、形の違う文字は null', () => {
    expect(parseDate('2027-02-29')).toBeNull()
    expect(parseDate('2027-04-31')).toBeNull()
    expect(parseDate('2027-13-01')).toBeNull()
    expect(parseDate('2027-00-10')).toBeNull()
    expect(parseDate('2027-03-00')).toBeNull()
    expect(parseDate('2027-3-20')).toBeNull()
    expect(parseDate('2027/03/20')).toBeNull()
    expect(parseDate('20270320')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate(20270320)).toBeNull()
  })
  it('遠すぎる年は通さない（打ちまちがい対策）', () => {
    expect(parseDate('1999-12-31')).toBeNull()
    expect(parseDate('2000-01-01')).not.toBeNull()
    expect(parseDate('2100-12-31')).not.toBeNull()
    expect(parseDate('2101-01-01')).toBeNull()
  })
  it('isValidDate', () => {
    expect(isValidDate('2027-03-20')).toBe(true)
    expect(isValidDate('2027-02-30')).toBe(false)
  })
  it('日本語の日付にする。形が違えば、そのまま返す', () => {
    expect(formatDateJa('2026-11-14')).toBe('2026年11月14日')
    expect(formatMonthDayJa('2027-03-05')).toBe('3月5日')
    expect(formatDateJa('こわれた日付')).toBe('こわれた日付')
  })
})

describe('parseAmountInput', () => {
  it('ふつうの数字', () => {
    expect(parseAmountInput('16500')).toBe(16500)
    expect(parseAmountInput('0')).toBe(0)
  })
  it('カンマ、円、¥、空白が入っていてもよい', () => {
    expect(parseAmountInput('16,500')).toBe(16500)
    expect(parseAmountInput('16,500円')).toBe(16500)
    expect(parseAmountInput('¥82,000')).toBe(82000)
    expect(parseAmountInput(' 5 500 ')).toBe(5500)
  })
  it('全角の数字と記号', () => {
    expect(parseAmountInput('１６，５００円')).toBe(16500)
    expect(parseAmountInput('￥８２０００')).toBe(82000)
    expect(parseAmountInput('０')).toBe(0)
  })
  it('「万」を受け付ける（小数の誤差が出ない）', () => {
    expect(parseAmountInput('8万')).toBe(80000)
    expect(parseAmountInput('8.2万')).toBe(82000)
    expect(parseAmountInput('7.8万')).toBe(78000)
    expect(parseAmountInput('１．６５万円')).toBe(16500)
  })
  it('空、文字、マイナス、小数の円は null', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('   ')).toBeNull()
    expect(parseAmountInput('円')).toBeNull()
    expect(parseAmountInput('abc')).toBeNull()
    expect(parseAmountInput('-100')).toBeNull()
    expect(parseAmountInput('−100')).toBeNull()
    expect(parseAmountInput('1.5')).toBeNull()
    expect(parseAmountInput('1e5')).toBeNull()
    expect(parseAmountInput('万')).toBeNull()
  })
  it('上限（1億円未満）を超える数は null', () => {
    expect(parseAmountInput(String(MAX_AMOUNT))).toBe(MAX_AMOUNT)
    expect(parseAmountInput(String(MAX_AMOUNT + 1))).toBeNull()
    expect(parseAmountInput('10000万')).toBeNull()
    expect(parseAmountInput('99999999999999999999')).toBeNull()
  })
})

describe('isValidAmount', () => {
  it('0 以上の整数で、上限以下', () => {
    expect(isValidAmount(0)).toBe(true)
    expect(isValidAmount(78000)).toBe(true)
    expect(isValidAmount(MAX_AMOUNT)).toBe(true)
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false)
    expect(isValidAmount(-1)).toBe(false)
    expect(isValidAmount(1.5)).toBe(false)
    expect(isValidAmount(NaN)).toBe(false)
    expect(isValidAmount(Infinity)).toBe(false)
    expect(isValidAmount('78000')).toBe(false)
    expect(isValidAmount(null)).toBe(false)
  })
})
