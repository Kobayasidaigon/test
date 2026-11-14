import { describe, expect, it } from 'vitest'
import { formatYen, isPositiveYen, isYen, parseYen, sumYen } from './money'
import { LIMITS } from './types'

describe('isYen / isPositiveYen', () => {
  it('0 以上、上限までの整数だけを通す', () => {
    expect(isYen(0)).toBe(true)
    expect(isYen(1)).toBe(true)
    expect(isYen(LIMITS.maxAmount)).toBe(true)
    expect(isYen(LIMITS.maxAmount + 1)).toBe(false)
    expect(isYen(-1)).toBe(false)
    expect(isYen(1.5)).toBe(false)
    expect(isYen(Number.NaN)).toBe(false)
    expect(isYen(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isYen('100')).toBe(false)
    expect(isYen(null)).toBe(false)
    expect(isYen(undefined)).toBe(false)
  })
  it('取引の金額は 1 以上', () => {
    expect(isPositiveYen(0)).toBe(false)
    expect(isPositiveYen(1)).toBe(true)
    expect(isPositiveYen(LIMITS.maxAmount)).toBe(true)
    expect(isPositiveYen(LIMITS.maxAmount + 1)).toBe(false)
  })
})

describe('sumYen', () => {
  it('空なら 0', () => {
    expect(sumYen([])).toBe(0)
  })
  it('上限の金額を、1年度の上限の件数だけ足しても、整数として正確', () => {
    const values = Array.from({ length: LIMITS.maxTransactionsPerYear }, () => LIMITS.maxAmount)
    const total = sumYen(values)
    expect(total).toBe(LIMITS.maxAmount * LIMITS.maxTransactionsPerYear)
    expect(Number.isSafeInteger(total)).toBe(true)
  })
})

describe('formatYen', () => {
  it('3桁ごとにカンマを入れる', () => {
    expect(formatYen(0)).toBe('0')
    expect(formatYen(999)).toBe('999')
    expect(formatYen(1000)).toBe('1,000')
    expect(formatYen(12345)).toBe('12,345')
    expect(formatYen(1234567)).toBe('1,234,567')
    expect(formatYen(999999999)).toBe('999,999,999')
  })
  it('マイナスは △。minus を選ぶと -', () => {
    expect(formatYen(-1200)).toBe('△1,200')
    expect(formatYen(-1200, { negative: 'minus' })).toBe('-1,200')
    expect(formatYen(-1)).toBe('△1')
  })
  it('「円」を付けられる', () => {
    expect(formatYen(1200, { unit: true })).toBe('1,200円')
    expect(formatYen(-1200, { unit: true })).toBe('△1,200円')
  })
})

describe('parseYen', () => {
  const value = (text: string) => {
    const r = parseYen(text)
    return r.ok ? r.value : `だめ: ${r.message}`
  }
  it('ふつうの数字を読む', () => {
    expect(value('12000')).toBe(12000)
    expect(value('0')).toBe(0)
    expect(value('1')).toBe(1)
  })
  it('カンマ、円、¥、空白が入っていても読む', () => {
    expect(value('12,000')).toBe(12000)
    expect(value('12,000円')).toBe(12000)
    expect(value('¥12,000')).toBe(12000)
    expect(value('\\12,000')).toBe(12000)
    expect(value(' 1 200 ')).toBe(1200)
    expect(value('+500')).toBe(500)
  })
  it('全角の数字と記号を読む', () => {
    expect(value('１２０００')).toBe(12000)
    expect(value('１２，０００')).toBe(12000)
    expect(value('１２、０００円')).toBe(12000)
    expect(value('￥３，０００')).toBe(3000)
    expect(value('　５００　')).toBe(500)
  })
  it('先頭の 0 は捨てる', () => {
    expect(value('00120')).toBe(120)
    expect(value('000')).toBe(0)
  })
  it('空は断る', () => {
    expect(parseYen('').ok).toBe(false)
    expect(parseYen('   ').ok).toBe(false)
    expect(parseYen('円').ok).toBe(false)
  })
  it('マイナスは断る（全角や △ も）', () => {
    for (const text of ['-500', '－500', '−500', '△500', '▲500', 'ー500']) {
      const r = parseYen(text)
      expect(r.ok, text).toBe(false)
      if (!r.ok) expect(r.message).toContain('マイナス')
    }
  })
  it('小数は断る（全角の点も）', () => {
    for (const text of ['12.5', '12.0', '0.5', '.5', '12.', '１２．５']) {
      const r = parseYen(text)
      expect(r.ok, text).toBe(false)
      if (!r.ok) expect(r.message).toContain('小数')
    }
  })
  it('数字でない文字は断る', () => {
    for (const text of ['abc', '1e3', '１万', '千円', '12a', '0x10', '1/2', 'NaN', 'Infinity']) {
      expect(parseYen(text).ok, text).toBe(false)
    }
  })
  it('上限ちょうどは通し、1円でもこえたら断る', () => {
    expect(value(String(LIMITS.maxAmount))).toBe(LIMITS.maxAmount)
    expect(parseYen(String(LIMITS.maxAmount + 1)).ok).toBe(false)
    // 桁が多すぎて、数にすると正確でなくなるものも断る
    expect(parseYen('99999999999999999999999').ok).toBe(false)
    expect(parseYen('9007199254740993').ok).toBe(false)
  })
  it('読んだ値は、必ず整数', () => {
    for (const text of ['12000', '１２，０００', '00120', '999999999']) {
      const r = parseYen(text)
      expect(r.ok && Number.isInteger(r.value)).toBe(true)
    }
  })
})
