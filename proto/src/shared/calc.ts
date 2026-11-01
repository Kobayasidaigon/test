// 住む街ガチャ — 計算。家族の入力と2つの街から、項目ごとの差と噛み砕いた説明を出す。
// 方針: 確かめられない項目は 0円にせず「未確認」として合計から外す。一度きりのお金は毎年の差と混ぜない。
import { CITIES, cityById } from './data'
import type { Breakdown, City, Comparison, FamilyInput, IncomeBand, Mood, Source } from './types'

const MEDICAL_HIGHSCHOOL_YEARLY = 36000 // 高校生年代1人の医療費の自己負担の目安（推定。厚労省の年齢別医療費から）
const JUNIOR_HIGH_LUNCH_MONTHLY = 5367 // 中学校給食費の全国平均月額（令和5年度、推定の出典は文科省調査）

export const yenMan = (yen: number, digits = 1) => {
  const v = Math.abs(yen) / 10000
  const s = v >= 100 ? Math.round(v).toLocaleString('ja-JP') : (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ja-JP')
  return `${s}万円`
}

const ageLabel = (age: number) => (age < 0 ? 'これから生まれる子' : `${age}歳の子`)

// ある年（y年後）の子どもたちの年齢
const agesAt = (input: FamilyInput, y: number) =>
  input.children.map((c) => ({ ...c, age: c.age + y })).filter((c) => c.age >= 0 && c.age <= 18)

// 0〜2歳の保育料（その街・その年）。未確認なら null。
function nurseryFee(city: City, band: IncomeBand, kids: { age: number; nursery: boolean }[]): { fee: number | null; lines: string[] } {
  // 就学前（0〜5歳）で園に通う子を、年上から第1子・第2子…と数える（3〜5歳は国の無償化で0円）
  const preschool = kids.filter((k) => k.age <= 5 && (k.age >= 3 || k.nursery)).sort((a, b) => b.age - a.age)
  let fee = 0
  const lines: string[] = []
  for (let i = 0; i < preschool.length; i++) {
    const k = preschool[i]
    if (k.age >= 3) continue
    if (city.nursery.firstChildFree) { lines.push(`${ageLabel(k.age)}: 0円`); continue }
    const order = i + 1
    if (order >= 3 && city.nursery.thirdChild === 'free') { lines.push(`${ageLabel(k.age)}（3人目）: 0円`); continue }
    if (order === 2 && city.nursery.secondChild === 'free') { lines.push(`${ageLabel(k.age)}（2人目）: 0円`); continue }
    const m = city.nursery.monthly[band]
    if (!m) return { fee: null, lines: [`${ageLabel(k.age)}: この年収帯の月額は確認中`] }
    const mid = (m[0] + m[1]) / 2
    const rate = order >= 2 ? 0.5 : 1
    fee += mid * rate * 12
    lines.push(`${ageLabel(k.age)}${order >= 2 ? `（${order}人目・半額）` : ''}: 月 約${Math.round((mid * rate) / 100) * 100}円`)
  }
  return { fee, lines }
}

function sumSources(...lists: Source[][]) {
  const seen = new Set<string>()
  return lists.flat().filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))
}

export function compare(input: FamilyInput, from: City, to: City): Comparison {
  const years = input.years === 18 ? Math.max(1, 18 - Math.min(...input.children.map((c) => Math.max(c.age, 0)), 18)) : input.years
  const items: Breakdown[] = []
  const firstYearKids = agesAt(input, 0)

  // --- 0〜2歳の保育料 ---
  {
    let total = 0, unknown = false
    let detailFrom: string[] = [], detailTo: string[] = []
    let touched = false
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y)
      if (!kids.some((k) => k.age <= 2 && k.nursery)) continue
      touched = true
      const a = nurseryFee(from, input.income, kids)
      const b = nurseryFee(to, input.income, kids)
      if (y === 0 || !detailFrom.length) { detailFrom = a.lines; detailTo = b.lines }
      if (a.fee === null || b.fee === null) { unknown = true; continue }
      total += a.fee - b.fee
    }
    if (touched) {
      const who = firstYearKids.filter((k) => k.age <= 2 && k.nursery).map((k) => ageLabel(k.age)).join('・') || '0〜2歳の子'
      const firstYear = (() => {
        const a = nurseryFee(from, input.income, firstYearKids), b = nurseryFee(to, input.income, firstYearKids)
        return a.fee === null || b.fee === null ? null : a.fee - b.fee
      })()
      const perYear = unknown ? null : total / years
      items.push({
        key: 'nursery', label: '0〜2歳の保育料', icon: 'nursery', perYear, total: unknown ? null : total, oneTime: false,
        confidence: from.nursery.confidence === '確認済' && to.nursery.confidence === '確認済' ? '確認済' : '推定',
        who,
        plain: unknown
          ? `${to.name}の、この年収帯の保育料はまだ確かめられていません。`
          : firstYear !== null && Math.abs(firstYear) >= 10000
            ? `保育園代が、${firstYear > 0 ? `${to.name}だと` : `${from.name}のままだと`}1年目で約${yenMan(Math.abs(firstYear))}安くなります（月にすると約${yenMan(Math.abs(firstYear) / 12)}）。${from.nursery.firstChildFree && !to.nursery.firstChildFree ? `${from.pref}は0〜2歳の第1子から0円だからです。` : ''}${to.nursery.firstChildFree && !from.nursery.firstChildFree ? `${to.pref}${to.region === 'osaka' ? 'の大阪市' : ''}は0〜2歳の第1子から0円だからです。` : ''}`
            : '保育園代の差は、ほとんどありません。',
        detail: `${from.name}: ${detailFrom.join(' / ') || '対象なし'}　${to.name}: ${detailTo.join(' / ') || '対象なし'}。3〜5歳は国の無償化で0円。${to.nursery.note ?? ''}（${to.nursery.fiscalYear}）`,
        sources: sumSources(from.nursery.sources, to.nursery.sources),
      })
    }
  }

  // --- 毎月の現金給付（018サポートなど） ---
  {
    let total = 0, touched = false
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y)
      const v = (c: City) => (c.cash ? kids.filter((k) => k.age <= c.cash!.maxAge).length * c.cash.perChildYearly : 0)
      if (from.cash || to.cash) touched = true
      total += v(to) - v(from)
    }
    if (touched && total !== 0) {
      const c = (to.cash ?? from.cash)!
      const n = firstYearKids.length
      items.push({
        key: 'cash', label: `${c.label}（現金の給付）`, icon: 'cash', perYear: total / years, total, oneTime: false,
        confidence: c.confidence, who: n ? `子ども${n}人` : '子ども',
        plain: to.cash
          ? `${to.pref}は子ども1人に月5,000円（年6万円）を配っています。${n}人なら年${yenMan(n * 60000, 0)}。`
          : `${from.pref}にいると、子ども1人に月5,000円（年6万円）が届きます。${to.name}に移ると、これがなくなります。`,
        detail: `${c.label}: 0〜${c.maxAge}歳の子1人あたり年${c.perChildYearly.toLocaleString('ja-JP')}円。所得制限なし。`,
        sources: c.sources,
      })
    }
  }

  // --- 中学校の給食費 ---
  {
    let total = 0, touched = false, unknown = false
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y).filter((k) => k.age >= 12 && k.age <= 14)
      if (!kids.length) continue
      touched = true
      const a = from.lunch.juniorHighFree, b = to.lunch.juniorHighFree
      if (a === null || b === null) { unknown = true; continue }
      total += kids.length * JUNIOR_HIGH_LUNCH_MONTHLY * 11 * ((b ? 1 : 0) - (a ? 1 : 0))
    }
    if (touched) {
      items.push({
        key: 'lunch', label: '中学校の給食費', icon: 'lunch', perYear: unknown ? null : total / years, total: unknown ? null : total, oneTime: false,
        confidence: '推定', who: '中学生の子',
        plain: unknown
          ? `${to.lunch.juniorHighFree === null ? to.name : from.name}の中学校の給食費が無料かどうかは、まだ確かめられていません。`
          : total === 0 ? '中学校の給食費の差はありません。' : `中学校の給食費（月 約5,400円）が${total > 0 ? `${to.name}では無料` : `${from.name}では無料`}です。1人で年 約5.9万円。`,
        detail: `全国平均の月額${JUNIOR_HIGH_LUNCH_MONTHLY.toLocaleString('ja-JP')}円×11か月で計算（令和5年度）。${to.lunch.note ?? ''}`,
        sources: sumSources(from.lunch.sources, to.lunch.sources),
      })
    }
  }

  // --- 子ども医療費（高校生年代） ---
  {
    let total = 0, touched = false, unknown = false
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y).filter((k) => k.age >= 15)
      if (!kids.length) continue
      touched = true
      const a = from.medical.coversTo, b = to.medical.coversTo
      if (a === null || b === null) { unknown = true; continue }
      total += kids.length * MEDICAL_HIGHSCHOOL_YEARLY * ((b >= 18 ? 1 : 0) - (a >= 18 ? 1 : 0))
    }
    if (touched) {
      items.push({
        key: 'medical', label: '高校生の医療費', icon: 'medical', perYear: unknown ? null : total / years, total: unknown ? null : total, oneTime: false,
        confidence: '推定', who: '高校生年代の子',
        plain: unknown ? '高校生の医療費の助成は確認中です。' : total === 0 ? 'どちらの街も、高校生まで通院費の助成があります。' : `高校生の通院費の助成が${total > 0 ? to.name : from.name}だけにあります（1人で年 約3.6万円の目安）。`,
        detail: `${from.name}: ${from.medical.note}　${to.name}: ${to.medical.note}`,
        sources: sumSources(from.medical.sources, to.medical.sources),
      })
    }
  }

  // --- 移住支援金（一度きり。23区から地方へ移る家族） ---
  if (to.iju && from.region === 'tokyo23' && (input.work === 'remote' || input.work === 'self' || input.work === 'commute')) {
    const kids = firstYearKids.length
    const amount = to.iju.family + to.iju.perChild * kids
    items.push({
      key: 'iju', label: '移住支援金（一度きり）', icon: 'iju', perYear: null, total: amount, oneTime: true,
      confidence: to.iju.confidence, who: '家族みんな',
      plain: `23区から${to.name}へ移って条件を満たすと、一度だけ 約${yenMan(amount, 0)}。5年以内に転出すると返す決まりがあります。`,
      detail: to.iju.note,
      sources: to.iju.sources,
    })
  }

  const known = items.filter((i) => !i.oneTime && i.total !== null)
  const unknownItems = items.filter((i) => !i.oneTime && i.total === null)
  const total = known.reduce((a, i) => a + (i.total ?? 0), 0)
  const perYear = total / years
  const oneTime = items.filter((i) => i.oneTime).reduce((a, i) => a + (i.total ?? 0), 0)
  const mood: Mood = perYear >= 300000 ? 2 : perYear >= 100000 ? 1 : perYear > -100000 ? 0 : perYear > -300000 ? -1 : -2
  const biggest = [...known].filter((i) => Math.abs(i.total ?? 0) >= 1000).sort((a, b) => Math.abs(b.total ?? 0) - Math.abs(a.total ?? 0))[0]
  const headline = Math.abs(perYear) < 10000
    ? `${to.name}と${from.name}は、ほぼ同じ`
    : perYear > 0 ? `${to.name}なら、年 約${yenMan(perYear)} 得` : `${from.name}のままが、年 約${yenMan(-perYear)} お得`
  const subline = biggest
    ? `いちばん効いているのは「${biggest.label}」（${biggest.who}）`
    : unknownItems.length ? `確認中の項目があります（${unknownItems.map((u) => u.label).join('・')}）` : 'この家族では、大きな差になる制度がありません'
  return { from, to, years, perYear, total, oneTime, items, unknown: unknownItems, mood, headline, subline }
}

// 働き方に合わせて候補を選び、毎年の差が大きい順に並べる
export function rank(input: FamilyInput): Comparison[] {
  const from = cityById(input.fromCityId)
  const wide = input.work === 'remote' || input.work === 'self'
  return CITIES.filter((c) => c.id !== from.id && (wide || c.metro === from.metro))
    .map((c) => compare(input, from, c))
    .sort((a, b) => (b.perYear + (wide ? b.oneTime / Math.max(a.years, 1) : 0)) - (a.perYear + (wide ? a.oneTime / Math.max(a.years, 1) : 0)))
}

// 噛み砕き: 年額を「月」「1日」に言い換える
export function everyday(yearly: number) {
  const m = Math.abs(yearly) / 12, d = Math.abs(yearly) / 365
  return {
    month: `月 約${m >= 10000 ? yenMan(m) : `${Math.round(m / 100) * 100}円`}`,
    day: `1日 約${Math.round(d / 10) * 10}円`,
  }
}

export const MOOD_TEXT: Record<Mood, string> = {
  2: 'やったー！ 家計がぐっと楽になりそう',
  1: 'うれしい。ちょっと楽になりそう',
  0: 'ほとんど変わらない',
  [-1]: '貯金箱がちょっとしょんぼり。でも今の街が手厚いということ',
  [-2]: '貯金箱がしょんぼり。今の街、実はかなり手厚い！',
}
