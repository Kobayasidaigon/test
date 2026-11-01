// 住む街ガチャ — 計算。家族の入力と2つの街から、項目ごとの差と噛み砕いた説明を出す。
// 方針:
//   - 確かめられない項目は 0円にせず「未確認」として合計から外す（status と excluded で知らせる）
//   - 一度きりのお金（移住支援金）は毎年の差と混ぜない。並べる順番にも足さない
//   - 被災した街（care.level === 'hit'）は順位に入れず、悲しい表情も出さない
import { ALL_CITIES, CITIES, cityById } from './data'
import type { Breakdown, City, Comparison, FamilyInput, IncomeBand, Mood, Source } from './types'

const MEDICAL_HIGHSCHOOL_YEARLY = 25000 // 高校生年代1人の通院・入院の窓口負担の平均（横浜市の試算 年約25,000円）
const JUNIOR_HIGH_LUNCH_MONTHLY = 5367 // 中学校給食費の全国平均月額（令和5年度、文部科学省の調査）

export const yenMan = (yen: number, digits = 1) => {
  const v = Math.abs(yen) / 10000
  const s = v >= 100 ? Math.round(v).toLocaleString('ja-JP') : (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ja-JP')
  return `${s}万円`
}

const ageLabel = (age: number) => (age < 0 ? 'これから生まれる子' : `${age}歳の子`)

// ある年（y年後）の子どもたちの年齢
const agesAt = (input: FamilyInput, y: number) =>
  input.children.map((c) => ({ ...c, age: c.age + y })).filter((c) => c.age >= 0 && c.age <= 18)

// 期間の中で、ある年齢の範囲に入る子の説明（例: 7歳の子（5年後に中学生））
function whoInRange(input: FamilyInput, years: number, lo: number, hi: number, stage: string) {
  const parts: string[] = []
  for (const c of input.children) {
    for (let y = 0; y < years; y++) {
      const a = c.age + y
      if (a >= lo && a <= hi) { parts.push(y === 0 ? `${ageLabel(c.age)}（いま${stage}）` : `${ageLabel(c.age)}（${y}年後に${stage}）`); break }
    }
  }
  return parts.join('・') || `${stage}の子`
}

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

export function distanceKm(a: City, b: City): number | undefined {
  if (a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) return undefined
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const periodYears = (input: FamilyInput) =>
  input.years === 18 ? Math.max(1, 18 - Math.min(...input.children.map((c) => Math.max(c.age, 0)), 18)) : input.years

export function compare(input: FamilyInput, from: City, to: City): Comparison {
  const years = periodYears(input)
  const items: Breakdown[] = []
  const firstYearKids = agesAt(input, 0)

  // --- 0〜2歳の保育料 ---
  {
    let total = 0, unknown = false, touched = false
    let detailFrom: string[] = [], detailTo: string[] = []
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y)
      if (!kids.some((k) => k.age <= 2 && k.nursery)) continue
      touched = true
      const a = nurseryFee(from, input.income, kids)
      const b = nurseryFee(to, input.income, kids)
      if (!detailFrom.length) { detailFrom = a.lines; detailTo = b.lines }
      if (a.fee === null || b.fee === null) { unknown = true; continue }
      total += a.fee - b.fee
    }
    if (touched) {
      const who = whoInRange(input, years, 0, 2, '0〜2歳')
      const firstYear = (() => {
        const a = nurseryFee(from, input.income, firstYearKids), b = nurseryFee(to, input.income, firstYearKids)
        return a.fee === null || b.fee === null ? null : a.fee - b.fee
      })()
      const unknownCity = nurseryFee(to, input.income, firstYearKids).fee === null ? to : from
      items.push({
        key: 'nursery', label: '0〜2歳の保育料', icon: 'nursery', perYear: unknown ? null : total / years, total: unknown ? null : total, oneTime: false,
        confidence: from.nursery.confidence === '確認済' && to.nursery.confidence === '確認済' ? '確認済' : '推定',
        who,
        plain: unknown
          ? `${unknownCity.name}の、この年収帯の0〜2歳の保育料はまだ確かめられていません。`
          : firstYear !== null && Math.abs(firstYear) >= 10000
            ? `1年目の保育園代は、${firstYear > 0 ? `${to.name}のほうが` : `${from.name}のほうが`}約${yenMan(Math.abs(firstYear))}安い（月にすると約${yenMan(Math.abs(firstYear) / 12)}）。${from.nursery.firstChildFree && !to.nursery.firstChildFree ? `${from.name}は0〜2歳の第1子から0円だからです。` : ''}${to.nursery.firstChildFree && !from.nursery.firstChildFree ? `${to.name}は0〜2歳の第1子から0円だからです。` : ''}3歳からは国の無償化でどちらも0円です。`
            : total !== 0
              ? `保育園代の差は、${years}年で約${yenMan(Math.abs(total))}です。`
              : '保育園代の差は、ほとんどありません。',
        detail: `${from.name}: ${detailFrom.join(' / ') || '対象なし'}　${to.name}: ${detailTo.join(' / ') || '対象なし'}。3〜5歳は国の無償化で0円。${to.nursery.note ?? ''}（${to.nursery.fiscalYear}）`,
        sources: sumSources(from.nursery.sources, to.nursery.sources),
      })
    }
  }

  // --- 毎月の現金給付（018サポートなど） ---
  {
    let total = 0
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y)
      const v = (c: City) => (c.cash ? kids.filter((k) => k.age <= c.cash!.maxAge).length * c.cash.perChildYearly : 0)
      total += v(to) - v(from)
    }
    if ((from.cash || to.cash) && total !== 0) {
      const c = (to.cash ?? from.cash)!
      const n = firstYearKids.length
      items.push({
        key: 'cash', label: `${c.label}（現金の給付）`, icon: 'cash', perYear: total / years, total, oneTime: false,
        confidence: c.confidence, who: n ? `子ども${n}人` : '子ども',
        plain: to.cash
          ? `${to.name}（${to.pref}）では、子ども1人に月5,000円（年6万円）が届きます。${n}人なら年${yenMan(n * 60000, 0)}。`
          : `${from.name}（${from.pref}）にいると、子ども1人に月5,000円（年6万円）が届きます。${to.name}に移ると、これがなくなります。`,
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
        confidence: '推定', who: whoInRange(input, years, 12, 14, '中学生'),
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
        confidence: '推定', who: whoInRange(input, years, 15, 18, '高校生年代'),
        plain: unknown ? '高校生の医療費の助成は、まだ確かめられていません。' : total === 0 ? 'どちらの街も、高校生まで通院費の助成があります。' : `高校生の通院費の助成が${total > 0 ? to.name : from.name}だけにあります（1人で年 約2.5万円の目安）。`,
        detail: `${from.name}: ${from.medical.note}　${to.name}: ${to.medical.note}。目安は横浜市の試算（高校生年代の窓口負担 年約25,000円）。`,
        sources: sumSources(from.medical.sources, to.medical.sources),
      })
    }
  }

  // --- 移住支援金（一度きり。23区から地方へ移る家族） ---
  if (to.iju && from.region === 'tokyo23' && input.work !== 'part') {
    const kids = firstYearKids.filter((k) => k.age < 18).length
    const amount = to.iju.family + to.iju.perChild * kids
    items.push({
      key: 'iju', label: '移住支援金（一度きり）', icon: 'iju', perYear: null, total: amount, oneTime: true,
      confidence: to.iju.confidence, who: '家族みんな',
      plain: `23区から${to.name}へ移って条件を満たすと、一度だけ 約${yenMan(amount, 0)}。5年以内に転出すると返す決まりがあります。毎年の差には入れていません。`,
      detail: to.iju.note,
      sources: to.iju.sources,
    })
  }

  const known = items.filter((i) => !i.oneTime && i.total !== null)
  const unknownItems = items.filter((i) => !i.oneTime && i.total === null)
  const total = known.reduce((a, i) => a + (i.total ?? 0), 0)
  const perYear = total / years
  const oneTime = items.filter((i) => i.oneTime).reduce((a, i) => a + (i.total ?? 0), 0)
  const knownNonZero = known.filter((i) => Math.abs(i.total ?? 0) >= 1000)
  const status: Comparison['status'] = unknownItems.length === 0 ? 'ok' : knownNonZero.length ? 'partial' : 'unknown'
  let mood: Mood = perYear >= 300000 ? 2 : perYear >= 30000 ? 1 : perYear > -30000 ? 0 : perYear > -300000 ? -1 : -2
  if (status === 'unknown') mood = 0
  if (to.care?.level === 'hit' && mood < 0) mood = 0
  const biggest = [...knownNonZero].sort((a, b) => Math.abs(b.total ?? 0) - Math.abs(a.total ?? 0))[0]
  const perYearLabel = years === 1 ? '1年で' : `1年あたり（${years}年の平均）`
  const headline = status === 'unknown'
    ? `${to.name}は、この家族に関係する制度を確認中`
    : Math.abs(perYear) < 10000
      ? `${to.name}と${from.name}は、ほぼ同じ`
      : perYear > 0 ? `${to.name}なら、年 約${yenMan(perYear)} 得` : `${from.name}のままが、年 約${yenMan(-perYear)} お得`
  const subline = status === 'unknown'
    ? `確認中: ${unknownItems.map((u) => u.label).join('・')}`
    : biggest ? `いちばん効いているのは「${biggest.label}」（${biggest.who}）` : 'この家族では、大きな差になる制度がありません'
  const excluded = [
    unknownItems.length ? `確認中の項目（${unknownItems.map((u) => u.label).join('・')}）` : '',
    '家賃・通勤費・税金・引越し代',
    oneTime ? '一度きりのお金' : '',
  ].filter(Boolean).join('、') + 'は、この金額に入っていません。'
  const rf = from.rent?.family ?? null, rt = to.rent?.family ?? null
  const rent = from.rent || to.rent ? {
    from: rf, to: rt, diffMonthly: rf !== null && rt !== null ? rt - rf : null,
    note: '借家に住んでいる世帯が払っている家賃の平均（居住室18〜24畳）。募集家賃とは違う。毎年の差には入れていない',
    source: (to.rent ?? from.rent)!.source,
  } : undefined
  return { from, to, years, perYear, total, oneTime, items, unknown: unknownItems, mood, headline, subline, status, perYearLabel, excluded, care: to.care, distanceKm: distanceKm(from, to), rent }
}

// ---------- 候補の選び方 ----------
export interface RankOptions {
  pool?: 'featured' | 'nearby' | 'all'   // featured = くわしい街だけ（既定）、nearby = 今の街の近く、all = 全国
  radiusKm?: number                        // nearby のときの半径（既定 30km）
  limit?: number                           // 返す数（既定: featured は全部、それ以外は 30）
}

const sortComparisons = (list: Comparison[]) =>
  list.sort((a, b) => {
    const rankOf = (c: Comparison) => (c.status === 'unknown' ? 1 : 0)
    return rankOf(a) - rankOf(b) || b.perYear - a.perYear || b.oneTime - a.oneTime
  })

// 働き方に合わせて候補を選び、毎年の差が大きい順に並べる（確認中だけの街は後ろ、被災した街は入れない）
export function rank(input: FamilyInput, opts: RankOptions = {}): Comparison[] {
  const from = cityById(input.fromCityId)
  const wide = input.work === 'remote' || input.work === 'self'
  const pool = opts.pool ?? 'featured'
  const radius = opts.radiusKm ?? (wide ? 9999 : 30)
  let cands: City[]
  if (pool === 'featured') {
    cands = CITIES.filter((c) => wide || (from.metro !== 'other' && c.metro === from.metro) || (distanceKm(from, c) ?? 9999) <= radius)
  } else if (pool === 'nearby') {
    cands = ALL_CITIES.filter((c) => (distanceKm(from, c) ?? 9999) <= (opts.radiusKm ?? 30))
  } else {
    cands = wide ? ALL_CITIES : ALL_CITIES.filter((c) => (distanceKm(from, c) ?? 9999) <= radius)
  }
  cands = cands.filter((c) => c.id !== from.id && c.code !== from.code && c.care?.level !== 'hit')
  const out = sortComparisons(cands.map((c) => compare(input, from, c)))
  const limit = opts.limit ?? (pool === 'featured' ? out.length : 30)
  return out.slice(0, limit)
}

// 選んだ街を、選んだ順のまま比べる（被災した街も入れられるが、care が付く）
export function compareMany(input: FamilyInput, ids: string[]): Comparison[] {
  const from = cityById(input.fromCityId)
  return ids.map((id) => cityById(id)).filter(Boolean).filter((c) => c.code !== from.code).map((c) => compare(input, from, c))
}

// ---------- 全国から街を探す ----------
const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
const norm = (s: string) => toHira(s.normalize('NFKC')).replace(/\s+/g, '').toLowerCase()

export function searchCities(query: string, limit = 20): City[] {
  const q = norm(query)
  if (!q) return []
  const scored: [number, City][] = []
  for (const c of ALL_CITIES) {
    const name = norm(c.name), kana = norm(c.kana ?? ''), full = norm(c.pref + c.name)
    const kanaBare = kana.replace(/(し|く|まち|ちょう|むら|そん)$/, '')
    let score = -1
    if (name === q || kana === q || kanaBare === q) score = 0
    else if (name.startsWith(q) || kana.startsWith(q)) score = 1
    else if (full.startsWith(q)) score = 2
    else if (name.includes(q) || kana.includes(q) || full.includes(q)) score = 3
    if (score >= 0) scored.push([score + (c.level === 'detailed' ? -0.5 : 0), c])
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, c]) => c)
}

export const citiesInPref = (pref: string) => ALL_CITIES.filter((c) => c.pref === pref)

export function nearbyCities(fromId: string, km = 20, limit = 12): City[] {
  const from = cityById(fromId)
  return ALL_CITIES.map((c) => [distanceKm(from, c) ?? 9999, c] as const)
    .filter(([d, c]) => d <= km && c.code !== from.code)
    .sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, c]) => c)
}

// どこまで分かるか（UIでカプセルの色の濃さなどに使う）
export const DATA_LEVEL_TEXT = {
  detailed: '市の制度まで調べた街',
  pref: '都道府県の制度だけ分かる街',
  basic: '国の統計（医療費助成・家賃）だけ分かる街。保育料などは準備中',
} as const

// 噛み砕き: 年額を「月」「1日」に言い換える
export function everyday(yearly: number) {
  const m = Math.abs(yearly) / 12, d = Math.abs(yearly) / 365
  return {
    month: `月 約${m >= 10000 ? yenMan(m) : `${Math.round(m / 100) * 100}円`}`,
    day: `1日 約${Math.round(d / 10) * 10}円`,
  }
}

// 表情の一言。確認中だけの比較や、被災した街への配慮も含めて、ここで決める（UIはこれを出す）
export function moodText(c: Comparison): string {
  if (c.care?.level === 'hit') return 'この街は、いまは順位や損得の演出を出していません'
  if (c.status === 'unknown') return 'まだ確認中。窓口で聞くとはっきりします'
  return MOOD_TEXT[c.mood]
}

export const MOOD_TEXT: Record<Mood, string> = {
  2: 'やったー！ 家計がぐっと楽になりそう',
  1: 'うれしい。ちょっと楽になりそう',
  0: 'ほとんど変わらない',
  [-1]: '貯金箱がちょっとしょんぼり。でも今の街が手厚いということ',
  [-2]: '貯金箱がしょんぼり。今の街、実はかなり手厚い！',
}
