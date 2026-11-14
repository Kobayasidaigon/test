// 日付の扱い。日付は '2026-04-01' の形の文字列で持つ。
// Date を時刻つきで持ち回ると、時差で1日ずれることがある（年度の初日・末日でずれると致命的）ので、
// 計算はすべて UTC の暦で行い、外には文字列だけを出す。
import type { DateString } from './types'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_YEAR = 1900
const MAX_YEAR = 2199

/** 月の日数（うるう年を見る）。 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

/** 年月日から日付の文字列を作る。実在しない日なら null。 */
export function makeDate(year: number, month: number, day: number): DateString | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return null
  if (day > daysInMonth(year, month)) return null
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** 'YYYY-MM-DD' の形で、実在する日か（2月30日などは通さない）。 */
export function isValidDate(value: unknown): value is DateString {
  if (typeof value !== 'string') return false
  const m = DATE_RE.exec(value)
  if (!m) return false
  return makeDate(Number(m[1]), Number(m[2]), Number(m[3])) === value
}

export function dateParts(date: DateString): { year: number; month: number; day: number } {
  const m = DATE_RE.exec(date)
  if (!m) throw new Error(`日付の形が正しくありません: ${date}`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function toUtc(date: DateString): number {
  const { year, month, day } = dateParts(date)
  return Date.UTC(year, month - 1, day)
}

function fromUtc(ms: number): DateString {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** n 日あとの日付（n がマイナスなら前）。 */
export function addDays(date: DateString, n: number): DateString {
  return fromUtc(toUtc(date) + n * 86_400_000)
}

/** a から b までの日数（同じ日なら 0）。 */
export function daysBetween(a: DateString, b: DateString): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

/** 日付が start 〜 end（両端を含む）の中にあるか。 */
export function isWithin(date: DateString, start: DateString, end: DateString): boolean {
  return date >= start && date <= end
}

/**
 * 1年あとの同じ日。月末の日は、次の年も月末にする
 * （2月29日で終わる年度の次は2月28日、その4年後はまた2月29日で終わるように）。
 */
export function oneYearLater(date: DateString): DateString {
  const { year, month, day } = dateParts(date)
  const isMonthEnd = day === daysInMonth(year, month)
  const last = daysInMonth(year + 1, month)
  const nextDay = isMonthEnd ? last : Math.min(day, last)
  return makeDate(year + 1, month, nextDay) ?? date
}

/** Date から、その端末の暦での日付を取る（「今日」を出すときに使う）。 */
export function dateFromLocal(d: Date): DateString {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---- 和暦 ----
// 令和の始まりは 2019年5月1日（元号を改める政令）。出典は sources.ts の 'reiwa-start'。
const ERAS: { name: string; start: DateString; firstYear: number }[] = [
  { name: '令和', start: '2019-05-01', firstYear: 2019 },
  { name: '平成', start: '1989-01-08', firstYear: 1989 },
]

/** その日の元号と年。平成より前は null（西暦で書く）。 */
export function eraOf(date: DateString): { era: string; year: number } | null {
  for (const e of ERAS) {
    if (date >= e.start) return { era: e.name, year: dateParts(date).year - e.firstYear + 1 }
  }
  return null
}

function eraYearText(n: number): string {
  return n === 1 ? '元' : String(n)
}

/** 「令和8年」。平成より前は「1988年」。 */
export function formatWarekiYear(date: DateString): string {
  const e = eraOf(date)
  return e ? `${e.era}${eraYearText(e.year)}年` : `${dateParts(date).year}年`
}

/** 「令和8年4月1日」。正しくない日付なら空文字（画面を落とさないため）。 */
export function formatWareki(date: DateString | ''): string {
  if (!isValidDate(date)) return ''
  const { month, day } = dateParts(date)
  return `${formatWarekiYear(date)}${month}月${day}日`
}

/** 「2026年4月1日」。 */
export function formatSeireki(date: DateString | ''): string {
  if (!isValidDate(date)) return ''
  const { year, month, day } = dateParts(date)
  return `${year}年${month}月${day}日`
}

/** 「4月1日」（出納帳の日付の欄など、年がわかっている場所で使う）。 */
export function formatMonthDay(date: DateString | ''): string {
  if (!isValidDate(date)) return ''
  const { month, day } = dateParts(date)
  return `${month}月${day}日`
}

/**
 * 年度の呼び名を、始まりの日から作る（「令和8年度」）。
 * 元号は、始まりの年の12月31日のものを使う。2019年4月に始まる年度を、
 * 役所の呼び方と同じ「令和元年度」にするため。呼び名は画面で自由に変えられる。
 */
export function fiscalYearLabel(startDate: DateString): string {
  const { year } = dateParts(startDate)
  const e = eraOf(`${pad(year, 4)}-12-31`)
  return e ? `${e.era}${eraYearText(e.year)}年度` : `${year}年度`
}

/**
 * 次の年度の呼び名を考える。
 * 「令和8年度」「2026年度」「第12期」のように数字で終わる呼び名は、数字を1つ進める
 * （団体が自分で決めた呼び方を、次の年度でも続けるため）。それ以外は始まりの日から作る。
 */
export function suggestNextLabel(label: string, nextStartDate: DateString): string {
  const gannen = /^(令和|平成)元(年度?.*)$/.exec(label)
  if (gannen) return `${gannen[1]}2${gannen[2]}`
  // 最初に出てくる数字だけを進める（「令和8年度（第3班）」の 3 は変えない）。全角の数字も読む
  const m = /^([^0-9０-９]*)([0-9０-９]+)(.*)$/.exec(label)
  if (m && m[2].length <= 4) return `${m[1]}${Number(m[2].normalize('NFKC')) + 1}${m[3]}`
  return fiscalYearLabel(nextStartDate)
}

/**
 * 今日を含む会計年度の期間を出す（新しく始めるときの初期値）。
 * startMonth は年度の始まりの月。4月始まりが多いので 4 を初期値にしてある。
 */
export function defaultFiscalPeriod(today: DateString, startMonth = 4): { startDate: DateString; endDate: DateString } {
  const { year, month } = dateParts(today)
  const startYear = month >= startMonth ? year : year - 1
  const startDate = makeDate(startYear, startMonth, 1) ?? today
  return { startDate, endDate: addDays(oneYearLater(startDate), -1) }
}

export type ParseDateResult = { ok: true; value: DateString } | { ok: false; message: string }

/**
 * 入力欄の文字を日付にする。キーボードだけで続けて入れられるように、いろいろな書き方を読む。
 *   2026-04-01 / 2026/4/1 / 2026年4月1日 / 令和8年4月1日 / R8.4.1 / 4/1 / 4月1日 / 0401
 * 月と日だけのときは、その会計年度の中に入る年を選ぶ（年度をまたぐ1〜3月を、まちがえずに入れられる）。
 */
export function parseDateInput(text: string, period?: { startDate: DateString; endDate: DateString }): ParseDateResult {
  const s = text.normalize('NFKC').trim().replace(/\s+/g, '')
  if (s === '') return { ok: false, message: '日付を入れてください。' }
  const bad: ParseDateResult = { ok: false, message: '日付が正しくありません。「4/1」や「2026/4/1」のように入れてください。' }
  const done = (y: number, m: number, d: number): ParseDateResult => {
    const v = makeDate(y, m, d)
    return v ? { ok: true, value: v } : { ok: false, message: 'その日付はありません。月と日を確かめてください。' }
  }

  // 年・月・日がそろっている書き方
  let m = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/.exec(s)
  if (m) return done(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (m) return done(Number(m[1]), Number(m[2]), Number(m[3]))

  // 和暦
  m = /^(令和|平成|R|H|r|h)(元|\d{1,2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/.exec(s)
  if (m) {
    const era = ERAS.find((e) => e.name === (m![1].toUpperCase() === 'R' || m![1] === '令和' ? '令和' : '平成'))!
    const n = m[2] === '元' ? 1 : Number(m[2])
    if (n < 1) return bad
    const r = done(era.firstYear + n - 1, Number(m[3]), Number(m[4]))
    // 「令和1年4月1日」のように、その元号にない日は断る
    if (r.ok && eraOf(r.value)?.era !== era.name) {
      return { ok: false, message: `${era.name}にその日付はありません。年を確かめてください。` }
    }
    return r
  }

  // 月と日だけ
  m = /^(\d{1,2})[-/.月](\d{1,2})日?$/.exec(s) ?? /^(\d{2})(\d{2})$/.exec(s)
  if (m) {
    const month = Number(m[1])
    const day = Number(m[2])
    if (!period) return { ok: false, message: '年も入れてください（例: 2026/4/1）。' }
    const years = [dateParts(period.startDate).year, dateParts(period.endDate).year]
    const candidates = [...new Set(years)].map((y) => makeDate(y, month, day)).filter((v): v is DateString => v !== null)
    if (candidates.length === 0) return { ok: false, message: 'その日付はありません。月と日を確かめてください。' }
    // 年度の中に入る年があればそれを、なければ始まりの年を返す（年度の外の日付として、あとで知らせる）
    const inside = candidates.find((v) => isWithin(v, period.startDate, period.endDate))
    return { ok: true, value: inside ?? candidates[0] }
  }
  return bad
}
