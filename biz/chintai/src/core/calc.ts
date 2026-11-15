import { daysInMonth, parseDate } from './format'
import type { BrokerageCalc, DateString, MonthsCalc, ProrationCalc, Yen } from './types'

// 計算だけを集めたファイル。文（日本語の説明）は inspect.ts が作る。
//
// 小数の誤差で判定がぶれないように、割り算は最後に1回だけにして、比べるときは整数のまま比べる。

// ---------------------------------------------------------------------------
// 仲介手数料
// ---------------------------------------------------------------------------

/**
 * 仲介手数料の上限の、もとになる数字（国土交通省の告示）。
 * 貸主と借主の合計は「借賃の1か月分の1.1倍」まで。住むための建物では、一方から受け取れるのは、
 * 依頼のときに承諾を得ている場合を除いて「借賃の1か月分の0.55倍」まで。どちらも消費税を含んだ倍率。
 * 分数で持つのは、0.55 のような小数を掛けると誤差が出るため。
 */
export const BROKERAGE_HALF_PERCENT = 55
export const BROKERAGE_FULL_PERCENT = 110

/** 家賃から、仲介手数料の上限の目安（円未満は切り捨て）を出す。 */
export function brokerageCaps(rent: Yen): { halfCap: Yen; fullCap: Yen } {
  return {
    halfCap: Math.floor((rent * BROKERAGE_HALF_PERCENT) / 100),
    fullCap: Math.floor((rent * BROKERAGE_FULL_PERCENT) / 100),
  }
}

/**
 * 仲介手数料を、家賃から計算した上限と比べる。
 *
 * - 計算のもとは家賃だけ（管理費・共益費を含めない）。告示の言葉は「借賃」で、管理費・共益費を含めるかを
 *   はっきり書いた公式の資料は確かめられなかった。そのため、上限を超えているときには、管理費を足した額での
 *   計算と同じかどうか（rentPlusFeeMatch）も調べて、「計算のもとを聞く」材料にする。
 * - 上限との差が1円未満のときは、端数の処理（切り上げ・四捨五入）の違いとみなして、超えた扱いにしない。
 */
export function checkBrokerage(input: { rent: Yen | null; commonFee: Yen | null; amount: Yen | null }): BrokerageCalc {
  const { rent, commonFee, amount } = input
  const blank: BrokerageCalc = {
    kind: 'brokerage',
    status: 'no-rent',
    rent,
    amount,
    lineCount: 1,
    halfCap: null,
    fullCap: null,
    overHalf: 0,
    overFull: 0,
    roundingOnly: false,
    rentPlusFeeMatch: null,
  }
  if (rent === null || rent <= 0) return blank
  const { halfCap, fullCap } = brokerageCaps(rent)
  if (amount === null) return { ...blank, status: 'no-amount', halfCap, fullCap }

  // 100倍した整数どうしで比べる（amount ≤ rent × 0.55 ⇔ amount × 100 ≤ rent × 55）。
  const a = amount * 100
  const half = rent * BROKERAGE_HALF_PERCENT
  const full = rent * BROKERAGE_FULL_PERCENT
  let status: BrokerageCalc['status']
  let roundingOnly = false
  if (a <= half) status = 'within-half'
  else if (a - half < 100) {
    status = 'within-half'
    roundingOnly = true
  } else if (a <= full) status = 'within-full'
  else if (a - full < 100) {
    status = 'within-full'
    roundingOnly = true
  } else status = 'over-full'

  let rentPlusFeeMatch: BrokerageCalc['rentPlusFeeMatch'] = null
  if (status !== 'within-half' && commonFee !== null && commonFee > 0) {
    const base = rent + commonFee
    // 端数の処理の違いを見込んで、1円未満の差は「同じ額」とみなす。
    if (Math.abs(a - base * BROKERAGE_HALF_PERCENT) < 100) rentPlusFeeMatch = 'half'
    else if (Math.abs(a - base * BROKERAGE_FULL_PERCENT) < 100) rentPlusFeeMatch = 'full'
  }

  return {
    kind: 'brokerage',
    status,
    rent,
    amount,
    lineCount: 1,
    halfCap,
    fullCap,
    overHalf: Math.max(0, amount - halfCap),
    overFull: Math.max(0, amount - fullCap),
    roundingOnly,
    rentPlusFeeMatch,
  }
}

// ---------------------------------------------------------------------------
// 日割り家賃
// ---------------------------------------------------------------------------

/** 入居する日から、その月の終わりまでの日数（入居する日を含む）と、その月の日数。 */
export function prorationDays(moveInDate: DateString | null): { daysInMonth: number; days: number } | null {
  const p = parseDate(moveInDate)
  if (!p) return null
  const dim = daysInMonth(p.year, p.month)
  return { daysInMonth: dim, days: dim - p.day + 1 }
}

/**
 * 日割り家賃を、入居する日と月の日数から出した目安と比べる。
 *
 * 日割りの数え方は会社によって違うので、1つの数字と比べない。次の組み合わせで出した額の幅と比べる。
 * - 割る日数: その月の日数、30日、31日
 * - 計算のもと: 家賃だけ、家賃＋管理費
 * 幅から「家賃の1日分」より大きく外れたときだけ、知らせる（'high' / 'low'）。1日分までの差は、
 * 入居する日を数えるかどうかの違いで起こるため、知らせない。
 * 見積書が「日割り家賃」と「日割り管理費」を分けて書いていることもあるので、管理費だけの日割りとして
 * 合うときも 'ok' にする（matched: 'fee'）。
 */
export function checkProration(input: {
  rent: Yen | null
  commonFee: Yen | null
  moveInDate: DateString | null
  amount: Yen | null
}): ProrationCalc {
  const { rent, commonFee, moveInDate, amount } = input
  const d = prorationDays(moveInDate)
  if (rent === null || rent <= 0 || !d) {
    return {
      kind: 'proration',
      status: 'no-basis',
      daysInMonth: d?.daysInMonth ?? null,
      days: d?.days ?? null,
      estimateRentOnly: null,
      estimateWithFee: null,
      low: null,
      high: null,
      tolerance: null,
      matched: null,
    }
  }
  const fee = commonFee !== null && commonFee > 0 ? commonFee : 0
  const divisors = [d.daysInMonth, 30, 31]
  // 30日で割る数え方で、31日ある月の1日に入居した場合に、1か月分を超えないようにする。
  const est = (base: number, divisor: number) => (base * Math.min(d.days, divisor)) / divisor
  const range = (bases: number[]) => {
    const values = bases.flatMap((b) => divisors.map((dv) => est(b, dv)))
    return { low: Math.floor(Math.min(...values)), high: Math.ceil(Math.max(...values)) }
  }
  // 1日分は、いちばん短い割り方（28〜30日）で出す。大きめに取って、知らせすぎないようにする。
  const oneDay = (base: number) => Math.ceil(base / Math.min(d.daysInMonth, 30))

  const main = range(fee > 0 ? [rent, rent + fee] : [rent])
  const tolerance = oneDay(rent + fee)
  const common = {
    kind: 'proration' as const,
    daysInMonth: d.daysInMonth,
    days: d.days,
    estimateRentOnly: Math.round(est(rent, d.daysInMonth)),
    estimateWithFee: fee > 0 ? Math.round(est(rent + fee, d.daysInMonth)) : null,
    low: main.low,
    high: main.high,
    tolerance,
  }
  if (amount === null) return { ...common, status: 'no-amount', matched: null }
  if (amount >= main.low - tolerance && amount <= main.high + tolerance) return { ...common, status: 'ok', matched: 'rent' }
  if (fee > 0) {
    const sub = range([fee])
    const subTolerance = oneDay(fee)
    if (amount >= sub.low - subTolerance && amount <= sub.high + subTolerance) return { ...common, status: 'ok', matched: 'fee' }
  }
  return { ...common, status: amount > main.high ? 'high' : 'low', matched: null }
}

// ---------------------------------------------------------------------------
// 月額との比
// ---------------------------------------------------------------------------

/** 金額が、月額の何か月分にあたるか（小数第2位まで）。月額が 0 以下なら null。 */
export function monthsOf(amount: Yen, monthly: Yen): number | null {
  if (monthly <= 0) return null
  return Math.round((amount / monthly) * 100) / 100
}

/**
 * 金額が、月額の 0.5か月分の刻み（0.5、1、1.5、…）に、ちょうど合っているか。
 * 丸めた数（monthsOf）で見ると、78,100円 ÷ 78,000円 も 1 になり、「1か月分」と言い切ってしまう。
 * 割り算をせずに、整数のまま確かめる。月額が奇数のときの 0.5か月分は円にならないので、1円未満の差は合っているとみなす。
 */
export function isWholeHalfMonths(amount: Yen, monthly: Yen): boolean {
  if (monthly <= 0 || amount <= 0) return false
  const halves = Math.round((amount * 2) / monthly) // 0.5か月分が、いくつ分か
  return halves > 0 && Math.abs(amount * 2 - halves * monthly) < 2
}

/**
 * 金額を、家賃（や家賃＋管理費）と比べる。高い安いの判定ではなく、「何か月分にあたるか」という計算だけ。
 * base は、どの月額と比べるか。'auto' は、家賃＋管理費とちょうど合うときはそちら、そうでなければ家賃。
 */
export function compareToMonthly(input: {
  rent: Yen | null
  commonFee: Yen | null
  amount: Yen | null
  base: 'rent' | 'rent+fee' | 'fee' | 'auto'
}): MonthsCalc | null {
  const { rent, commonFee, amount } = input
  if (amount === null) return null
  const fee = commonFee !== null && commonFee > 0 ? commonFee : 0
  const make = (base: MonthsCalc['base'], baseAmount: number): MonthsCalc | null => {
    const months = monthsOf(amount, baseAmount)
    return months === null ? null : { kind: 'months', base, baseAmount, months, exact: isWholeHalfMonths(amount, baseAmount) }
  }
  if (input.base === 'fee') return fee > 0 ? make('fee', fee) : null
  if (rent === null || rent <= 0) return null
  if (input.base === 'rent') return make('rent', rent)
  if (input.base === 'rent+fee') return fee > 0 ? make('rent+fee', rent + fee) : make('rent', rent)
  // auto: 家賃＋管理費の整数倍（か半分の倍数）にちょうど合うなら、そちらで言う。
  if (fee > 0 && (amount * 2) % (rent + fee) === 0 && (amount * 2) % rent !== 0) return make('rent+fee', rent + fee)
  return make('rent', rent)
}
