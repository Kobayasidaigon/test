import type { DateString, Yen } from './types'

// 表示のための小さな関数と、入力欄の文字を数字に直す関数。
// Intl に頼らずに書いているのは、静的HTMLの書き出し（Node）とブラウザで、結果が1文字も違わないようにするため。

/** 16500 → '16,500円'。マイナスは '−1,000円'（全角のマイナス）。 */
export function formatYen(amount: Yen): string {
  const n = Math.round(amount)
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${n < 0 ? '−' : ''}${digits}円`
}

/** 金額が未入力（null）のときに '未入力' を返す版。 */
export function formatYenOrBlank(amount: Yen | null): string {
  return amount === null ? '未入力' : formatYen(amount)
}

/** '2027-03-20' → '2027年3月20日'。形が違えば、そのまま返す。 */
export function formatDateJa(date: DateString): string {
  const p = parseDate(date)
  return p ? `${p.year}年${p.month}月${p.day}日` : date
}

/** '2027-03-20' → '3月20日'。 */
export function formatMonthDayJa(date: DateString): string {
  const p = parseDate(date)
  return p ? `${p.month}月${p.day}日` : date
}

/**
 * 1.5 → '1.5か月分'、1 → '1か月分'、1.37 → '約1.37か月分'。
 *
 * exact は、もとの金額が 0.5か月分の刻みにちょうど合っているか（calc.ts の isWholeHalfMonths）。
 * months は小数第2位に丸めた数なので、78,100円 ÷ 78,000円 も 1 になる。丸めた数だけを見て「1か月分」と
 * 言い切ると、「1か月分とは違う額です」という判定と食い違う。ちょうどでないとわかっているときは、
 * exact に false を渡すと、0.5 の刻みでも「約」を付ける。
 */
export function formatMonths(months: number, exact = true): string {
  const half = Math.round(months * 2) / 2
  if (exact && Math.abs(months - half) < 0.005 && half > 0) return `${trimZero(half)}か月分`
  return `約${trimZero(Math.round(months * 100) / 100)}か月分`
}

/**
 * 文字を、1行にそろえる。改行・タブ・全角の空白などの続きを、1つの空白に直して、前後の空白を取る。
 * 行の名前や、送る人の名前は、確認の文面の中にそのまま入る。読み込んだファイルの名前に改行が入っていると、
 * 文面の中に、別の段落として入ってしまうので、表示や文面に使う前に、これを通す。
 */
export function toOneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function trimZero(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '')
}

// ---------------------------------------------------------------------------
// 日付
// ---------------------------------------------------------------------------

export type DateParts = { year: number; month: number; day: number }

/** その月の日数。month は 1〜12。 */
export function daysInMonth(year: number, month: number): number {
  // Date.UTC の「翌月の0日」＝その月の最後の日。時差の影響を受けないように UTC で計算する。
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * 'YYYY-MM-DD' を年月日に分ける。暦にない日（2月30日 など）や、形の違う文字は null。
 * 年は 2000〜2100 だけを通す（入力のまちがいで、遠い年が入るのを防ぐ）。
 */
export function parseDate(text: unknown): DateParts | null {
  if (typeof text !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (year < 2000 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/** 日付として正しいか。 */
export function isValidDate(text: unknown): text is DateString {
  return parseDate(text) !== null
}

// ---------------------------------------------------------------------------
// 入力欄の文字 → 金額
// ---------------------------------------------------------------------------

/** 金額として受け付ける上限。これより大きい数は、打ちまちがいとみなす。 */
export const MAX_AMOUNT = 99_999_999

/**
 * 入力欄の文字を、金額（円の整数）に直す。直せなければ null。
 * 見積書を見ながら打つので、全角の数字、カンマ、「円」、「¥」、空白、「万」（8.2万 → 82,000）を受け付ける。
 * マイナスと小数の円は受け付けない（値引きは、専用の項目に、引かれている額をプラスの数で入れる）。
 */
export function parseAmountInput(text: string): Yen | null {
  const s = text
    .normalize('NFKC') // 全角の数字・記号を半角にそろえる
    .replace(/[,\s，、]/g, '')
    .replace(/^[¥\\]/, '')
    .replace(/円$/, '')
  if (s === '') return null
  const man = /^(\d+(?:\.\d+)?)万$/.exec(s)
  if (man) {
    // 小数の誤差を避けるために、四捨五入して整数にする（8.2万 → 82000）。
    const v = Math.round(Number(man[1]) * 10000)
    return v <= MAX_AMOUNT ? v : null
  }
  if (!/^\d+$/.test(s)) return null
  const v = Number(s)
  return Number.isSafeInteger(v) && v <= MAX_AMOUNT ? v : null
}

/** 金額として正しい値か（0 以上の整数で、上限以下）。 */
export function isValidAmount(value: unknown): value is Yen {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_AMOUNT
}
