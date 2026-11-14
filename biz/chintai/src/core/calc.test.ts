import { describe, expect, it } from 'vitest'
import { brokerageCaps, checkBrokerage, checkProration, compareToMonthly, monthsOf, prorationDays } from './calc'

describe('仲介手数料の上限の目安', () => {
  it('家賃 × 0.55 と、家賃 × 1.1', () => {
    expect(brokerageCaps(78_000)).toEqual({ halfCap: 42_900, fullCap: 85_800 })
    expect(brokerageCaps(100_000)).toEqual({ halfCap: 55_000, fullCap: 110_000 })
    expect(brokerageCaps(63_500)).toEqual({ halfCap: 34_925, fullCap: 69_850 })
  })
  it('円未満は切り捨てる（小数の誤差で1円ずれない）', () => {
    // 55,555 × 0.55 ＝ 30,555.25、× 1.1 ＝ 61,110.5
    expect(brokerageCaps(55_555)).toEqual({ halfCap: 30_555, fullCap: 61_110 })
    // 0.55 を小数のまま掛けると 38,499.99999… になる数。整数で計算しているので、ちょうどになる。
    expect(brokerageCaps(70_000)).toEqual({ halfCap: 38_500, fullCap: 77_000 })
    expect(brokerageCaps(1)).toEqual({ halfCap: 0, fullCap: 1 })
  })
})

describe('checkBrokerage', () => {
  const at = (amount: number | null, rent: number | null = 78_000, commonFee: number | null = 0) => checkBrokerage({ rent, commonFee, amount })

  it('家賃がない（未入力、0）ときは、計算しない', () => {
    expect(at(85_800, null).status).toBe('no-rent')
    expect(at(85_800, 0).status).toBe('no-rent')
    expect(at(85_800, null).halfCap).toBeNull()
  })
  it('金額が未入力のときは、上限の目安だけ出す', () => {
    const r = at(null)
    expect(r.status).toBe('no-amount')
    expect(r.halfCap).toBe(42_900)
    expect(r.fullCap).toBe(85_800)
  })
  it('境界: 0.5か月分＋消費税ちょうどは「以内」、1円超えたら「超えている」', () => {
    expect(at(42_900).status).toBe('within-half')
    expect(at(42_900).overHalf).toBe(0)
    expect(at(42_900).roundingOnly).toBe(false) // ちょうどのときは、端数の話を持ち出さない
    expect(at(42_901).status).toBe('within-full')
    expect(at(42_901).overHalf).toBe(1)
    expect(at(42_901).roundingOnly).toBe(false)
  })
  it('境界: 1か月分＋消費税ちょうどは「以内」、1円超えたら「超えている」', () => {
    expect(at(85_800).status).toBe('within-full')
    expect(at(85_800).roundingOnly).toBe(false)
    expect(at(85_800).overHalf).toBe(42_900)
    expect(at(85_800).overFull).toBe(0)
    expect(at(85_801).status).toBe('over-full')
    expect(at(85_801).overFull).toBe(1)
  })
  it('0円や、少ない額は「以内」', () => {
    expect(at(0).status).toBe('within-half')
    expect(at(39_000).status).toBe('within-half')
  })
  it('上限との差が1円未満のときは、端数の処理の違いとみなす', () => {
    // 55,555 × 0.55 ＝ 30,555.25。切り上げた 30,556 は、0.75円の差。
    const a = at(30_556, 55_555)
    expect(a.status).toBe('within-half')
    expect(a.roundingOnly).toBe(true)
    // 30,557 は 1.75円の差なので、超えている。
    expect(at(30_557, 55_555).status).toBe('within-full')
    // 55,555 × 1.1 ＝ 61,110.5。61,111 は 0.5円の差。
    const b = at(61_111, 55_555)
    expect(b.status).toBe('within-full')
    expect(b.roundingOnly).toBe(true)
    expect(at(61_112, 55_555).status).toBe('over-full')
  })
  it('管理費を足した額での計算と同じ額かどうかを、手がかりとして返す', () => {
    // （78,000＋4,000）× 1.1 ＝ 90,200、× 0.55 ＝ 45,100
    const full = at(90_200, 78_000, 4_000)
    expect(full.status).toBe('over-full')
    expect(full.rentPlusFeeMatch).toBe('full')
    const half = at(45_100, 78_000, 4_000)
    expect(half.status).toBe('within-full')
    expect(half.rentPlusFeeMatch).toBe('half')
  })
  it('管理費がない、または上限以内のときは、手がかりを返さない', () => {
    expect(at(90_200, 78_000, 0).rentPlusFeeMatch).toBeNull()
    expect(at(90_200, 78_000, null).rentPlusFeeMatch).toBeNull()
    expect(at(42_900, 78_000, 4_000).rentPlusFeeMatch).toBeNull()
    expect(at(88_000, 78_000, 4_000).rentPlusFeeMatch).toBeNull()
  })
})

describe('prorationDays', () => {
  it('入居する日を含めて、月の終わりまでの日数を数える', () => {
    expect(prorationDays('2027-03-20')).toEqual({ daysInMonth: 31, days: 12 })
    expect(prorationDays('2027-03-01')).toEqual({ daysInMonth: 31, days: 31 })
    expect(prorationDays('2027-03-31')).toEqual({ daysInMonth: 31, days: 1 })
    expect(prorationDays('2027-04-30')).toEqual({ daysInMonth: 30, days: 1 })
  })
  it('2月と、うるう年', () => {
    expect(prorationDays('2027-02-01')).toEqual({ daysInMonth: 28, days: 28 })
    expect(prorationDays('2028-02-29')).toEqual({ daysInMonth: 29, days: 1 })
    expect(prorationDays('2028-02-15')).toEqual({ daysInMonth: 29, days: 15 })
  })
  it('日付がない、または正しくないときは null', () => {
    expect(prorationDays(null)).toBeNull()
    expect(prorationDays('2027-02-29')).toBeNull()
    expect(prorationDays('3月20日')).toBeNull()
  })
})

describe('checkProration', () => {
  // 家賃 78,000、管理費 4,000、3月20日入居（12日分）。
  // 家賃だけ: 12/31 → 30,193.5、12/30 → 31,200。家賃＋管理費: 12/31 → 31,741.9、12/30 → 32,800。
  // 幅は 30,193〜32,800。1日分（82,000 ÷ 30 を切り上げ）＝ 2,734。
  const at = (amount: number | null) => checkProration({ rent: 78_000, commonFee: 4_000, moveInDate: '2027-03-20', amount })

  it('目安と幅を出す', () => {
    const r = at(31_742)
    expect(r.daysInMonth).toBe(31)
    expect(r.days).toBe(12)
    expect(r.estimateRentOnly).toBe(30_194)
    expect(r.estimateWithFee).toBe(31_742)
    expect(r.low).toBe(30_193)
    expect(r.high).toBe(32_800)
    expect(r.tolerance).toBe(2_734)
  })
  it('目安どおりなら ok（管理費を含む額でも、家賃だけの額でも、30日割りでも）', () => {
    expect(at(31_742).status).toBe('ok')
    expect(at(30_194).status).toBe('ok')
    expect(at(31_200).status).toBe('ok')
    expect(at(32_800).status).toBe('ok')
    expect(at(31_742).matched).toBe('rent')
  })
  it('境界: 幅から1日分までの差は知らせない。それを超えたら知らせる', () => {
    expect(at(32_800 + 2_734).status).toBe('ok')
    expect(at(32_800 + 2_735).status).toBe('high')
    expect(at(30_193 - 2_734).status).toBe('ok')
    expect(at(30_193 - 2_735).status).toBe('low')
  })
  it('大きく違えば high / low', () => {
    expect(at(82_000).status).toBe('high')
    expect(at(10_000).status).toBe('low')
    expect(at(10_000).matched).toBeNull()
  })
  it('管理費だけの日割り（「日割り管理費」の行）として合えば ok', () => {
    // 4,000 × 12 ÷ 31 ＝ 1,548.4
    const r = at(1_548)
    expect(r.status).toBe('ok')
    expect(r.matched).toBe('fee')
    expect(at(0).status).toBe('low')
  })
  it('管理費がない（0、未入力）ときは、家賃だけで見る', () => {
    const r = checkProration({ rent: 78_000, commonFee: null, moveInDate: '2027-03-20', amount: 30_194 })
    expect(r.status).toBe('ok')
    expect(r.estimateWithFee).toBeNull()
    expect(r.high).toBe(31_200)
    expect(checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-03-20', amount: 1_548 }).status).toBe('low')
  })
  it('1日に入居する場合は、1か月分が目安になる（30日割りでも、1か月分を超えない）', () => {
    const r = checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-03-01', amount: 78_000 })
    expect(r.days).toBe(31)
    expect(r.status).toBe('ok')
    expect(r.low).toBe(78_000)
    expect(r.high).toBe(78_000)
  })
  it('月の最後の日に入居する場合は、1日分が目安になる', () => {
    const r = checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-03-31', amount: 2_516 })
    expect(r.days).toBe(1)
    expect(r.estimateRentOnly).toBe(2_516)
    expect(r.status).toBe('ok')
    expect(checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-03-31', amount: 78_000 }).status).toBe('high')
  })
  it('2月（28日の月）: 28日割り、30日割り、31日割りの違いを幅に入れる', () => {
    const r = checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-02-01', amount: 72_800 })
    expect(r.days).toBe(28)
    expect(r.low).toBe(70_451) // 78,000 × 28 ÷ 31
    expect(r.high).toBe(78_000) // 78,000 × 28 ÷ 28
    expect(r.status).toBe('ok')
  })
  it('うるう年の2月29日', () => {
    const r = checkProration({ rent: 87_000, commonFee: 0, moveInDate: '2028-02-29', amount: 3_000 })
    expect(r.daysInMonth).toBe(29)
    expect(r.days).toBe(1)
    expect(r.estimateRentOnly).toBe(3_000)
    expect(r.status).toBe('ok')
  })
  it('家賃か入居する日がないときは、目安を出さない', () => {
    expect(checkProration({ rent: null, commonFee: 0, moveInDate: '2027-03-20', amount: 30_000 }).status).toBe('no-basis')
    expect(checkProration({ rent: 0, commonFee: 0, moveInDate: '2027-03-20', amount: 30_000 }).status).toBe('no-basis')
    expect(checkProration({ rent: 78_000, commonFee: 0, moveInDate: null, amount: 30_000 }).status).toBe('no-basis')
    expect(checkProration({ rent: 78_000, commonFee: 0, moveInDate: '2027-02-30', amount: 30_000 }).status).toBe('no-basis')
  })
  it('金額が未入力のときは、目安だけ出す', () => {
    const r = at(null)
    expect(r.status).toBe('no-amount')
    expect(r.estimateRentOnly).toBe(30_194)
  })
})

describe('月額との比', () => {
  it('monthsOf', () => {
    expect(monthsOf(78_000, 78_000)).toBe(1)
    expect(monthsOf(156_000, 78_000)).toBe(2)
    expect(monthsOf(39_000, 78_000)).toBe(0.5)
    expect(monthsOf(100_000, 78_000)).toBe(1.28)
    expect(monthsOf(100, 0)).toBeNull()
    expect(monthsOf(100, -1)).toBeNull()
  })
  it('家賃と比べる', () => {
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 156_000, base: 'rent' })).toEqual({
      kind: 'months',
      base: 'rent',
      baseAmount: 78_000,
      months: 2,
    })
  })
  it('家賃＋管理費と比べる。管理費がなければ、家賃と比べる', () => {
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 41_000, base: 'rent+fee' })?.months).toBe(0.5)
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 41_000, base: 'rent+fee' })?.base).toBe('rent+fee')
    expect(compareToMonthly({ rent: 78_000, commonFee: null, amount: 39_000, base: 'rent+fee' })?.base).toBe('rent')
  })
  it('管理費と比べる', () => {
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 8_000, base: 'fee' })?.months).toBe(2)
    expect(compareToMonthly({ rent: 78_000, commonFee: 0, amount: 8_000, base: 'fee' })).toBeNull()
  })
  it('auto: 家賃＋管理費にちょうど合うときは、そちらで言う', () => {
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 164_000, base: 'auto' })?.base).toBe('rent+fee')
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 156_000, base: 'auto' })?.base).toBe('rent')
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: 100_000, base: 'auto' })?.base).toBe('rent')
  })
  it('家賃や金額がないときは null', () => {
    expect(compareToMonthly({ rent: null, commonFee: 4_000, amount: 78_000, base: 'rent' })).toBeNull()
    expect(compareToMonthly({ rent: 0, commonFee: 4_000, amount: 78_000, base: 'auto' })).toBeNull()
    expect(compareToMonthly({ rent: 78_000, commonFee: 4_000, amount: null, base: 'rent' })).toBeNull()
  })
})
