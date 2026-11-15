// 日本の祝日を、決まりから計算で出す。
//
// もとにした決まり（国民の祝日に関する法律）:
//   第2条 … 日付が決まっている祝日、月曜に動く祝日（1月・7月・9月・10月の第2または第3月曜日）、春分日・秋分日
//   第3条第2項 … 祝日が日曜日に当たるときは、その日の後で、いちばん近い「祝日でない日」が休日になる（いわゆる振替休日）
//   第3条第3項 … 前の日と次の日が祝日である日（祝日でない日に限る）は休日になる（いわゆる国民の休日）
//
// 春分の日と秋分の日は、法律に日付が書かれていない（「春分日」「秋分日」とだけある）。内閣府「国民の祝日について」によれば、
// 国立天文台が毎年2月に、翌年の春分の日・秋分の日を官報で公表している。
// ここでは計算式で出しているので、発表がまだの年（EQUINOX_ANNOUNCED_THROUGH より先の年）は「見込み」である。
// 2025〜2027年は、公表されている一覧と一致することを holidays.test.ts で確かめている。
//
// 祝日は、必要な人数の初期設定（「祝日は日曜と同じ人数」など）に使うだけ。
// 利用者は、日ごとの上書きや定休日で、どの日も自由に変えられる。
import { daysInMonth, weekdayOf } from './dates'
import { YEAR_MAX, YEAR_MIN } from './types'

export type HolidayKind =
  /** 国民の祝日（第2条） */
  | 'national'
  /** 振替休日（第3条第2項） */
  | 'substitute'
  /** 国民の休日（第3条第3項） */
  | 'citizens'

export type Holiday = {
  month: number
  day: number
  /** 画面に出す名前。振替休日は「振替休日」、国民の休日は「国民の休日」 */
  name: string
  kind: HolidayKind
  /** 春分の日・秋分の日の発表がまだの年で、計算による見込みの日付なら true */
  provisional: boolean
}

/**
 * 春分の日・秋分の日が、公表された一覧で確かめられている最後の年。
 * 2026-11-15 に原文で確かめた: 内閣府のページと CSV は2027年まで。2028年の祝日は、2027年2月に掲載するとある。
 */
export const EQUINOX_ANNOUNCED_THROUGH = 2027

/**
 * 出典（どの文書で、いつ確かめたか）。画面や LP に出典を書くときは、ここから出す。
 * checkedOn の日に、どれも原文（ページと CSV そのもの）を開いて確かめた。confirms は、その原文に書いてあることだけ。
 */
export const HOLIDAY_SOURCES = [
  {
    id: 'cao-list',
    title: '内閣府「国民の祝日について」',
    url: 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html',
    checkedOn: '2026-11-15',
    confirms:
      '令和8年（2026年）と令和9年（2027年）の国民の祝日・休日の一覧。祝日が日曜日に当たるときの休日（祝日法第3条第2項）と、前後を祝日にはさまれた日の休日（同第3項）の説明。春分の日・秋分の日は、国立天文台が毎年2月に翌年の分を官報で公表しているという説明。令和10年（2028年）の国民の祝日は、令和9年（2027年）の2月に掲載するという記載。ページからリンクされている CSV（昭和30年（1955年）から令和9年（2027年）の国民の祝日）の、2025〜2027年の行。',
  },
  {
    id: 'naoj-2025',
    title: '国立天文台 暦計算室「令和 7年(2025)暦要項 国民の祝日」',
    url: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/2025/rekiyou251.html',
    checkedOn: '2026-11-15',
    confirms: '令和7年（2025年）の国民の祝日の一覧と、2月24日・5月6日・11月24日は休日になるという記載。',
  },
] as const

/** その年の祝日を計算できるか（決まりが今と同じで、春分・秋分の式が使える範囲） */
export function isHolidayYearSupported(year: number): boolean {
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX
}

/** 第n月曜日の日 */
function nthMonday(year: number, month: number, n: number): number {
  const first = weekdayOf(year, month, 1)
  // 1日が月曜なら 1、火曜なら 7、…
  const firstMonday = 1 + ((8 - first) % 7)
  return firstMonday + (n - 1) * 7
}

// 春分日・秋分日の近似式（1980〜2099年向けとして、広く使われているもの）。
// 出どころは『新こよみ便利帳』（海上保安庁水路部 暦計算研究会 編）とされているが、この作業では原典を確かめていない。
// そのため、式そのものは根拠にしない。春分の日・秋分の日は国立天文台が官報で公表するので、
// 発表済みの年（2025〜2027年）は公表の日付と一致することをテストで確かめ、それより先の年には「見込み」の印を付けている。
function springEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}
function autumnEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

const key = (month: number, day: number) => month * 100 + day

/** 1年の通し番号（0始まり）から月日を出す。年をまたがない範囲でだけ使う */
function addDays(year: number, month: number, day: number, delta: number): { month: number; day: number } | null {
  let m = month
  let d = day + delta
  while (d > daysInMonth(year, m)) {
    d -= daysInMonth(year, m)
    m += 1
    if (m > 12) return null
  }
  while (d < 1) {
    m -= 1
    if (m < 1) return null
    d += daysInMonth(year, m)
  }
  return { month: m, day: d }
}

const cache = new Map<number, Holiday[]>()

/**
 * その年の祝日と休日を、日付の順に返す。
 * あつかえない年（YEAR_MIN より前、YEAR_MAX より後）は空の一覧を返す。
 */
export function holidaysOfYear(year: number): Holiday[] {
  if (!isHolidayYearSupported(year)) return []
  const hit = cache.get(year)
  if (hit) return hit

  const provisional = year > EQUINOX_ANNOUNCED_THROUGH
  const national: Array<[number, number, string, boolean]> = [
    [1, 1, '元日', false],
    [1, nthMonday(year, 1, 2), '成人の日', false],
    [2, 11, '建国記念の日', false],
    [2, 23, '天皇誕生日', false],
    [3, springEquinoxDay(year), '春分の日', provisional],
    [4, 29, '昭和の日', false],
    [5, 3, '憲法記念日', false],
    [5, 4, 'みどりの日', false],
    [5, 5, 'こどもの日', false],
    [7, nthMonday(year, 7, 3), '海の日', false],
    [8, 11, '山の日', false],
    [9, nthMonday(year, 9, 3), '敬老の日', false],
    [9, autumnEquinoxDay(year), '秋分の日', provisional],
    [10, nthMonday(year, 10, 2), 'スポーツの日', false],
    [11, 3, '文化の日', false],
    [11, 23, '勤労感謝の日', false],
  ]
  const nationalKeys = new Set(national.map(([m, d]) => key(m, d)))
  const provisionalKeys = new Set(national.filter((n) => n[3]).map(([m, d]) => key(m, d)))
  const out: Holiday[] = national.map(([month, day, name, prov]) => ({ month, day, name, kind: 'national', provisional: prov }))
  const taken = new Set(nationalKeys)

  // 振替休日: 日曜日に当たった祝日ごとに、その後でいちばん近い「祝日でない日」
  for (const [month, day] of national) {
    if (weekdayOf(year, month, day) !== 0) continue
    let delta = 1
    let next = addDays(year, month, day, delta)
    while (next && nationalKeys.has(key(next.month, next.day))) {
      delta += 1
      next = addDays(year, month, day, delta)
    }
    if (!next || taken.has(key(next.month, next.day))) continue
    taken.add(key(next.month, next.day))
    out.push({ month: next.month, day: next.day, name: '振替休日', kind: 'substitute', provisional: provisionalKeys.has(key(month, day)) })
  }

  // 国民の休日: 前の日と次の日が祝日で、自分は祝日でない日
  for (const [month, day] of national) {
    const mid = addDays(year, month, day, 1)
    const after = addDays(year, month, day, 2)
    if (!mid || !after) continue
    if (!nationalKeys.has(key(after.month, after.day))) continue
    if (taken.has(key(mid.month, mid.day))) continue
    taken.add(key(mid.month, mid.day))
    const prov = provisionalKeys.has(key(month, day)) || provisionalKeys.has(key(after.month, after.day))
    out.push({ month: mid.month, day: mid.day, name: '国民の休日', kind: 'citizens', provisional: prov })
  }

  out.sort((a, b) => key(a.month, a.day) - key(b.month, b.day))
  cache.set(year, out)
  return out
}

/** その月の祝日。キーは日 */
export function holidaysInMonth(year: number, month: number): Map<number, Holiday> {
  const map = new Map<number, Holiday>()
  for (const h of holidaysOfYear(year)) if (h.month === month) map.set(h.day, h)
  return map
}

/**
 * 祝日について、画面に添える注意の文。注意がいらない年なら null。
 * 春分の日・秋分の日の発表がまだの年は、見込みであることを言う。
 */
export function holidayNotice(year: number): string | null {
  if (!isHolidayYearSupported(year)) return `${year}年の祝日は、この道具では計算できません。祝日の人数は、日ごとの上書きで入れてください。`
  if (year > EQUINOX_ANNOUNCED_THROUGH) {
    return `${year}年の春分の日と秋分の日は、計算による見込みです（国立天文台が、毎年2月に翌年の分を官報で公表しています）。新しく祝日が決まったときも、この道具には入っていません。カレンダーでお確かめください。`
  }
  return null
}
