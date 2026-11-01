// 住む街ガチャ — 計算。家族の入力と2つの街から、項目ごとの差と噛み砕いた説明を出す。
// 方針:
//   - 確かめられない項目は 0円にせず「未確認」として合計から外す（status と excluded で知らせる）
//   - 一度きりのお金（移住支援金）は毎年の差と混ぜない。並べる順番にも足さない
//   - 被災した街（care.level === 'hit'）は順位に入れず、悲しい表情も出さない
import { ALL_CITIES, CITIES, MEXT_LUNCH_SOURCE, cityById } from './data'
import type { Breakdown, City, Comparison, Confidence, DataLevel, FamilyInput, IncomeBand, Mood, Source } from './types'

const MEDICAL_HIGHSCHOOL_YEARLY = 25000 // 高校生年代1人の通院・入院の窓口負担の平均（横浜市の試算 年約25,000円）
// 中学校給食費の全国平均月額（公立・完全給食。令和7年5月1日現在、文部科学省の学校給食実施状況等調査 令和7年度）
const JUNIOR_HIGH_LUNCH_MONTHLY = 6013
const IJU_SINGLE_MAX = 600000 // 移住支援金の単身の上限（国の制度。市町村でもっと少ないことがある）
const weaker = (c: Confidence): Confidence => (c === '確認済' ? '推定' : '仮置き')

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
//   household … 生計が同じ子をすべて数える決まりのため、国の基準（同時に通う子だけ）と結果が変わったか
//   paid      … お金がかかる子の順番と割合（説明の文に使う）
interface FeeResult { fee: number | null; lines: string[]; household: boolean; paid: { order: number; rate: number }[] }
type Kid = { age: number; nursery: boolean }
type Rule = 'free' | 'half' | 'full' | 'unknown'
const RULE_RANK: Record<Rule, number> = { free: 0, half: 1, full: 2, unknown: 3 }

// 所得の条件つきの0円が、この年収帯に当てはまるか（true 当てはまる / false 当てはまらない / null 分からない）。
// 年収帯の途中に境目があるときは null。所得の条件があるか確かめていない制度（unsure）は、目安の額より上の年収帯も null（「対象外」とは言わない）
const BAND_RANGE: Record<IncomeBand, [number, number]> = { u400: [0, 400], '400_600': [400, 600], '600_800': [600, 800], '800_1000': [800, 1000], o1000: [1000, Infinity] }
export function underCap(cap: number | undefined, band: IncomeBand, unsure = false): boolean | null {
  if (cap === undefined) return true
  const [lo, hi] = BAND_RANGE[band]
  return hi <= cap ? true : lo >= cap && !unsure ? false : null
}
// この年収帯で、0〜2歳の第1子から0円の街か
const firstFreeAt = (c: City, band: IncomeBand) => c.nursery.firstChildFree || (c.nursery.firstFreeUnder !== undefined && underCap(c.nursery.firstFreeUnder, band, c.nursery.firstFreeUnsure) === true)
// 所得の条件があるか確かめていない0円の制度がある街か（説明の文で、そう断るため）
export const incomeUnsure = (n: City['nursery']) => !!(n.firstFreeUnsure || n.secondFreeUnsure || n.thirdFreeUnsure)
// 所得の条件があるか確かめていない制度で、0円とみて計算する年収の目安（万円）
const unsureCapOf = (n: City['nursery']) => Math.min(...[n.firstFreeUnsure ? n.firstFreeUnder : undefined, n.secondFreeUnsure ? n.secondFreeUnder : undefined, n.thirdFreeUnsure ? n.thirdFreeUnder : undefined].filter((x): x is number => x !== undefined))

// 1人の子の扱い。国の基準（同時に通う子で数えて2人目は半額、3人目以降は0円。どの街にも当てはまる）と、街の制度のうち有利なほう。
// useHome が false のときは、きょうだいを同時に通う子だけで数える（数え方で結果が変わったかを見るため）
function ruleFor(n: City['nursery'], band: IncomeBand, age: number, together: number, inHome: number, useHome: boolean): { rule: Rule; order: number } {
  if (n.firstChildFree || (n.freeFromAge !== undefined && age >= n.freeFromAge)) return { rule: 'free', order: 1 }
  const nat: Rule = together >= 3 ? 'free' : together === 2 ? 'half' : 'full'
  const o2 = useHome && n.secondCount === 'household' ? inHome : together
  const o3 = useHome && n.thirdCount === 'household' ? inHome : together
  let local: Rule = 'full'
  if (o3 >= 3) {
    // 3人目以降の0円に所得の条件があるとき：上の年収帯は、国の基準（同時に通う3人目は0円）だけ。あるか分からないときは確認中
    if (n.thirdChild === 'half') local = 'half'
    else {
      const u = underCap(n.thirdFreeUnder, band, n.thirdFreeUnsure)
      local = u === true ? 'free' : u === null ? 'unknown' : 'full'
    }
  }
  // 2人目だけの制度（secondOnly）は、3人目以降の子には使わない（3人目以降は国の基準）
  else if (o2 >= 2 && !(n.secondOnly && o2 > 2)) {
    if (n.secondChild === 'half') local = 'half'
    else {
      const u = underCap(n.secondFreeUnder, band, n.secondFreeUnsure)
      local = u === true ? 'free' : u === null ? 'unknown' : 'full'
    }
  }
  let rule: Rule = nat === 'free' ? 'free' : local === 'unknown' ? 'unknown' : RULE_RANK[local] < RULE_RANK[nat] ? local : nat
  // 第1子の0円に所得の条件があるとき：この年収帯で当てはまれば0円、境目が年収帯の途中なら（ほかで0円でなければ）分からない。
  // 所得の条件があるか確かめていないときは、目安の額より上の年収帯も分からない
  if (n.firstFreeUnder !== undefined && rule !== 'free') {
    const u = underCap(n.firstFreeUnder, band, n.firstFreeUnsure)
    if (u === true) rule = 'free'
    else if (u === null) rule = 'unknown'
  }
  return { rule, order: o3 >= 3 ? o3 : o2 >= 2 ? o2 : 1 }
}

function nurseryFee(city: City, band: IncomeBand, kids: Kid[]): FeeResult {
  const n = city.nursery
  // 国の基準：就学前（0〜5歳）で園に通う子を、年上から第1子・第2子…と数える（3〜5歳は国の無償化で0円）
  const preschool = kids.filter((k) => k.age <= 5 && (k.age >= 3 || k.nursery)).sort((a, b) => b.age - a.age)
  // 生計が同じ子（0〜18歳）を、年上から数える（household の市で使う。上の子が小学生でも数える）
  const home = [...kids].sort((a, b) => b.age - a.age)
  let fee = 0
  let household = false
  const lines: string[] = []
  const paid: FeeResult['paid'] = []
  for (let i = 0; i < preschool.length; i++) {
    const k = preschool[i]
    if (k.age >= 3) continue
    const together = i + 1
    const inHome = home.indexOf(k) + 1
    const { rule, order } = ruleFor(n, band, k.age, together, inHome, true)
    const byHome = rule !== ruleFor(n, band, k.age, together, inHome, false).rule
    if (byHome) household = true
    const tag = order >= 2 ? (byHome ? `上の子から数えて${order}人目` : `${order}人目`) : ''
    if (rule === 'free') { lines.push(`${ageLabel(k.age)}${tag ? `（${tag}）` : ''}: 0円`); continue }
    if (rule === 'unknown') {
      const why = incomeUnsure(n) ? '所得の条件があるか確かめられていないので、この年収帯で0円になるかは確認中' : '所得の条件があり、この年収帯で0円になるかは確認中'
      return { fee: null, lines: [`${ageLabel(k.age)}${tag ? `（${tag}）` : ''}: ${why}`], household, paid }
    }
    const m = n.monthly[band]
    if (!m) return { fee: null, lines: [`${ageLabel(k.age)}${tag ? `（${tag}）` : ''}: この年収帯の月額は確認中`], household, paid }
    const mid = (m[0] + m[1]) / 2
    const rate = rule === 'half' ? 0.5 : 1
    fee += mid * rate * 12
    paid.push({ order, rate })
    lines.push(`${ageLabel(k.age)}${tag ? `（${tag}${rate === 0.5 ? '・半額' : ''}）` : rate === 0.5 ? '（半額）' : ''}: 月 約${Math.round((mid * rate) / 100) * 100}円`)
  }
  return { fee, lines, household, paid }
}

// 保育料の差の理由（1年目）。
//   安いほうの街が0〜2歳の第1子から0円 … 高いほうの街で払う子が第1子か、2人目以降（半額）かで言い分ける
//   安いほうの街だけが、きょうだいを上の子の年齢などを問わずに数える（household）… そう言う
function nurseryReason(cheap: City, dear: City, cheapFee: FeeResult, dearFee: FeeResult, band: IncomeBand): string {
  if (firstFreeAt(cheap, band) && !firstFreeAt(dear, band) && dearFee.paid.length) {
    if (dearFee.paid.some((p) => p.rate === 1)) return `${cheap.name}は0〜2歳の第1子から0円だからです。`
    const orders = [...new Set(dearFee.paid.map((p) => p.order))].sort((a, b) => a - b).map((o) => `${o}人目`).join('・')
    return `${dear.name}では${orders}が半額、${cheap.name}は0円だからです。`
  }
  if (cheapFee.household && !dearFee.household) return `${cheap.name}は、上の子の年齢や、園に通っているかを問わずに、きょうだいを数えるからです。`
  return ''
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
    // きょうだいの数え方（household）で結果が変わった街。その数え方が確認済でなければ、項目の確からしさを下げる
    let homeFrom = false, homeTo = false
    for (let y = 0; y < years; y++) {
      const kids = agesAt(input, y)
      if (!kids.some((k) => k.age <= 2 && k.nursery)) continue
      touched = true
      const a = nurseryFee(from, input.income, kids)
      const b = nurseryFee(to, input.income, kids)
      if (!detailFrom.length) { detailFrom = a.lines; detailTo = b.lines }
      homeFrom ||= a.household
      homeTo ||= b.household
      if (a.fee === null || b.fee === null) { unknown = true; continue }
      total += a.fee - b.fee
    }
    if (touched) {
      const who = whoInRange(input, years, 0, 2, '0〜2歳')
      const fa = nurseryFee(from, input.income, firstYearKids), fb = nurseryFee(to, input.income, firstYearKids)
      const firstYear = fa.fee === null || fb.fee === null ? null : fa.fee - fb.fee
      const unknownCity = fb.fee === null ? to : from
      const countSure = (c: City, used: boolean) => !used || (c.nursery.countConfidence ?? c.nursery.confidence) === '確認済'
      const reason = firstYear === null ? '' : firstYear > 0 ? nurseryReason(to, from, fb, fa, input.income) : nurseryReason(from, to, fa, fb, input.income)
      // 所得の条件があるか確かめていない0円の制度を、この年収帯では0円とみて計算した街（上の年収帯は確認中になる）
      // （いちばん上の年収帯で同じ家族の保育料が分からなくなる街だけ。国の基準などで0円になる子しかいない街は言わない）
      const reliesOnUnsure = (c: City) => incomeUnsure(c.nursery) && nurseryFee(c, 'o1000', firstYearKids).fee === null && nurseryFee(c, input.income, firstYearKids).fee !== null
      const assumed = unknown ? [] : [to, from].filter(reliesOnUnsure)
      const assumeText = assumed.map((c) => `${c.name}の0円に所得の条件があるかは確かめていません（年収${unsureCapOf(c.nursery)}万円未満は0円とみて計算）。`).join('')
      items.push({
        key: 'nursery', label: '0〜2歳の保育料', icon: 'nursery', perYear: unknown ? null : total / years, total: unknown ? null : total, oneTime: false,
        confidence: from.nursery.confidence === '確認済' && to.nursery.confidence === '確認済' && countSure(from, homeFrom) && countSure(to, homeTo) ? '確認済' : '推定',
        who,
        plain: unknown
          ? `${unknownCity.name}の、この年収帯の0〜2歳の保育料はまだ確かめられていません。`
          : firstYear !== null && Math.abs(firstYear) >= 10000
            ? `1年目の保育園代は、${firstYear > 0 ? `${to.name}のほうが` : `${from.name}のほうが`}約${yenMan(Math.abs(firstYear))}安い（月にすると約${yenMan(Math.abs(firstYear) / 12)}）。${reason}3歳からは国の無償化でどちらも0円です。${assumeText}`
            : total !== 0
              ? `保育園代の差は、${years}年で約${yenMan(Math.abs(total))}です。${assumeText}`
              : `保育園代の差は、ほとんどありません。${assumeText}`,
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
      // 給付のない側の街が、独自の手当を出していないとは確かめていない（調べたのは東京都の018サポートだけ）
      const other = to.cash ? from : to
      items.push({
        key: 'cash', label: `${c.label}（現金の給付）`, icon: 'cash', perYear: total / years, total, oneTime: false,
        confidence: c.confidence, who: n ? `子ども${n}人` : '子ども',
        plain: to.cash
          ? `${to.name}（${to.pref}）では、子ども1人に月5,000円（年6万円）が届きます。${n}人なら年${yenMan(n * 60000, 0)}。`
          : `${from.name}（${from.pref}）にいると、子ども1人に月5,000円（年6万円）が届きます。${to.name}に移ると、これがなくなります。`,
        detail: `${c.label}: 0〜${c.maxAge}歳の子1人あたり年${c.perChildYearly.toLocaleString('ja-JP')}円。所得制限なし。${other.cash ? '' : `${other.name}独自の手当は、まだ調べていません。`}`,
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
          : total === 0 ? '中学校の給食費の差はありません。' : `中学校の給食費（月 約${(Math.round(JUNIOR_HIGH_LUNCH_MONTHLY / 100) * 100).toLocaleString('ja-JP')}円）が${total > 0 ? `${to.name}では無料` : `${from.name}では無料`}です。1人で年 約${yenMan(JUNIOR_HIGH_LUNCH_MONTHLY * 11)}。`,
        detail: `全国平均の月額${JUNIOR_HIGH_LUNCH_MONTHLY.toLocaleString('ja-JP')}円×11か月で計算（公立中学校の完全給食、令和7年5月1日現在）。${from.name}: ${from.lunch.note ?? (from.lunch.juniorHighFree === null ? '確認中' : '')}　${to.name}: ${to.lunch.note ?? (to.lunch.juniorHighFree === null ? '確認中' : '')}`,
        sources: sumSources(from.lunch.sources, to.lunch.sources, [MEXT_LUNCH_SOURCE]),
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
  // 世帯の額や子どもの加算が「最大」（市町村の要綱でもっと少ないことがある）なら、額は最大の見込みとして書き、確からしさを1つ下げる
  if (to.iju && from.region === 'tokyo23' && input.work !== 'part') {
    const iju = to.iju
    const kids = firstYearKids.filter((k) => k.age < 18).length
    const single = input.adults === 1 && kids === 0 // 単身。額が書いてない街は国の上限（最大60万円）
    const family = single ? iju.single ?? Math.min(iju.family, IJU_SINGLE_MAX) : iju.family
    // 子どもの加算の額が分からない街は、加算を額に足さない（国の上限を掛けた大きな額を出さない）
    const childPending = kids > 0 && !!iju.perChildUnknown
    const amount = family + (childPending ? 0 : iju.perChild * kids)
    const childUpTo = kids > 0 && !childPending && !!iju.perChildUpTo
    const familyUpTo = single ? iju.single === undefined : !!iju.familyUpTo
    const upTo = familyUpTo || childUpTo
    const head = `${single ? '単身' : '世帯'}${familyUpTo ? 'で最大' : 'で'}${yenMan(family, 0)}`
    items.push({
      key: 'iju', label: '移住支援金（一度きり）', icon: 'iju', perYear: null, total: amount, oneTime: true, upTo,
      ...(childPending ? { pendingPart: '子どもの加算' } : {}),
      confidence: upTo || childPending ? weaker(iju.confidence) : iju.confidence, who: '家族みんな',
      plain: childPending
        ? `23区から${to.name}へ移って条件を満たすと、一度だけ${head}。ほかに18歳未満の子どもの加算がありますが、${to.name}の額はまだ確かめていません（国の上限は1人${yenMan(iju.perChild, 0)}）。5年以内に転出すると返す決まりがあります。毎年の差には入れていません。`
        : `23区から${to.name}へ移って条件を満たすと、一度だけ${upTo ? '最大' : ''}${yenMan(amount, 0)}。${childUpTo ? '子どもの加算は市町村が決めていて、もっと少ないことがあります。' : ''}5年以内に転出すると返す決まりがあります。毎年の差には入れていません。`,
      detail: `${head}${kids && !childPending ? `＋18歳未満の子${kids}人×${childUpTo ? '最大' : ''}${yenMan(iju.perChild, 0)}` : ''}で計算。${childPending ? `子ども${kids}人の加算は額が分からないので、足していません。` : ''}${iju.note}`,
      sources: iju.sources,
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
  // 市区町村が独自に出す手当（018サポートのような都の給付のほか）は、どの街もまだ調べていないので、入っていないと書く
  // 医療費は高校生年代の差だけを数える（小中学生の窓口負担の目安がない）。助成が中学生より手前で終わる街がからむときは、そう書く
  const medShort = [from, to].filter((c) => c.medical.coversTo !== null && c.medical.coversTo < 15)
  const medKids = Array.from({ length: years }, (_, y) => agesAt(input, y)).flat().some((k) => medShort.some((c) => k.age > c.medical.coversTo! && k.age < 15))
  const medExcluded = medShort.length && medKids && from.medical.coversTo !== to.medical.coversTo
    ? `小中学生の医療費の差（${medShort.map((c) => `${c.name}は${c.medical.coversTo === 6 ? '小学校に上がる前' : `${c.medical.coversTo}歳`}まで`).join('、')}）`
    : ''
  const excluded = [
    unknownItems.length ? `確認中の項目（${unknownItems.map((u) => u.label).join('・')}）` : '',
    medExcluded,
    '家賃・通勤費・税金・引越し代・市区町村独自の手当',
    oneTime || items.some((i) => i.oneTime) ? '一度きりのお金' : '',
  ].filter(Boolean).join('、') + 'は、この金額に入っていません。'
  const rf = from.rent?.family ?? null, rt = to.rent?.family ?? null
  const rent = from.rent || to.rent ? {
    from: rf, to: rt, diffMonthly: rf !== null && rt !== null ? rt - rf : null,
    note: '借家に住んでいる世帯が払っている家賃の平均（居住室18〜24畳）。募集家賃とは違う。毎年の差には入れていない',
    source: (to.rent ?? from.rent)!.source,
  } : undefined
  // 待機児童の数（暮らしの目安。お金の差には入れない）
  const wl = to.waitlist ?? from.waitlist
  const waitlist = wl ? { from: from.waitlist?.count ?? null, to: to.waitlist?.count ?? null, asOf: wl.asOf, note: wl.note, source: wl.source } : undefined
  return { from, to, years, perYear, total, oneTime, items, unknown: unknownItems, mood, headline, subline, status, perYearLabel, excluded, care: to.care, distanceKm: distanceKm(from, to), rent, waitlist }
}

// ---------- 候補の選び方 ----------
export interface RankOptions {
  pool?: 'featured' | 'nearby' | 'all'   // featured = くわしい街だけ（既定）、nearby = 今の街の近く、all = 全国
  radiusKm?: number                        // nearby のときの半径（既定 30km）
  limit?: number                           // 返す数（既定: featured は全部、それ以外は 30）
}

// くわしくない街（くわしい街でない今の街・候補の街）がからむ比べで、わかる差が年1万円未満の比べ。
// まだ調べていない制度が多く、「ほぼ同じ」とは言えないので、わかる差が1つもない比べと同じく、いちばん後ろに並べる
export const isThin = (c: Comparison) =>
  c.status !== 'unknown' && Math.abs(c.perYear) < 10000 && (c.to.level !== 'detailed' || c.from.level !== 'detailed') && c.care?.level !== 'hit'
// 並べる段。0 = 全部わかる街と、確認中の項目があってもわかる分で得になる街（年1万円以上）、
// 1 = 確認中の項目があり、わかる分では得にならない街（全部わかる街の後ろ）、
// 2 = わかる差が1つもない街と、くわしくない街でわかる差が年1万円未満の街（いちばん後ろ）
export const sortTier = (c: Comparison) => (c.status === 'unknown' || isThin(c) ? 2 : c.status === 'partial' && c.perYear < 10000 ? 1 : 0)
const LEVEL_RANK: Record<DataLevel, number> = { detailed: 0, pref: 1, basic: 2 }
// 段 → 毎年の差が大きい順 → 同じ額なら、全部わかる街 → 一度きりのお金がある街 → くわしい街 → 今の街に近い順
// （一度きりのお金は、あるかないかだけを見る。額の多くは「最大」や加算が確認中で、大きさをくらべられないため）
const hasOnce = (c: Comparison) => (c.items.some((i) => i.oneTime) ? 0 : 1)
const sortComparisons = (list: Comparison[]) =>
  list.sort((a, b) =>
    sortTier(a) - sortTier(b) ||
    b.perYear - a.perYear ||
    (a.status === 'ok' ? 0 : 1) - (b.status === 'ok' ? 0 : 1) ||
    hasOnce(a) - hasOnce(b) ||
    LEVEL_RANK[a.to.level] - LEVEL_RANK[b.to.level] ||
    (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
  )

// 働き方に合わせて候補を選び、毎年の差が大きい順に並べる（並べ方は sortTier と sortComparisons。
// 確認中の項目があり、わかる分で得にならない街は全部わかる街の後ろ、確認中だけの街はさらに後ろ。被災した街は入れない）
export function rank(input: FamilyInput, opts: RankOptions = {}): Comparison[] {
  const from = cityById(input.fromCityId)
  const wide = input.work === 'remote' || input.work === 'self'
  const pool = opts.pool ?? 'featured'
  const radius = opts.radiusKm ?? (wide ? 9999 : 30)
  let cands: City[]
  if (pool === 'featured') {
    // CITIES は、全国データ（国の医療費・家賃・災害への配慮）を合わせたあとの City（ALL_CITIES と同じもの）
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

// どこまで分かるか（UIでカプセルの色の濃さなどに使う）。待機児童の数はどの街も分かる。子ども医療費は1,740、
// 家賃の目安は集計のある市町村だけ（人口の少ない町村にはない）。保育料の月額の表があるのは、くわしい街の一部だけ。
// 国の調査だけの街の説明は、その街が持っている項目だけを並べる（nationalFacts。UIは basicText を使う）
export const DATA_LEVEL_TEXT = {
  detailed: '市区町村の制度まで調べた街',
  pref: '県や市区町村の子育ての制度が一部わかる街（保育料の月額の表はまだない）',
  basic: '国の全国調査（待機児童・子ども医療費・家賃）の分かる分だけの街。保育料・給食などの制度は準備中',
} as const
// 国の全国調査で、その街について分かっている項目（待機児童・子ども医療費・家賃の目安）
export function nationalFacts(c: City): string[] {
  const out: string[] = []
  if (c.waitlist) out.push('待機児童')
  if (c.medical.coversTo !== null) out.push('子ども医療費')
  if (c.rent?.family != null) out.push('家賃の目安')
  return out
}
// 国の調査だけの街の説明（持っている項目だけを並べる。家賃の統計がない町村は、そう書く）
export function basicText(c: City): string {
  const facts = nationalFacts(c)
  const noRent = c.rent?.family == null ? '家賃の統計はない町村です。' : ''
  const iju = c.iju || (c.ijuCheck && c.ijuCheck.result !== 'unknown') ? '移住支援金のことも分かります。' : ''
  return `国の全国調査で${facts.join('・')}が分かる街。${noRent}保育料・給食などの子育ての制度は準備中。${iju}`.replace(/。$/, '')
}

// その街で分かっている制度（国の基準より先のもの）を短い言葉で。段の説明や、街の札の説明に使う
// 所得の条件があるか確かめていない制度は、額を言わずに「所得の条件は確認中」と添える
export function knownFacts(c: City): string[] {
  const out: string[] = []
  const n = c.nursery
  if (n.firstChildFree) out.push('保育料（0〜2歳は第1子から0円）')
  else {
    const parts: string[] = []
    if (n.firstFreeUnder !== undefined) parts.push(n.firstFreeUnsure ? '0〜2歳は第1子から0円' : `年収約${n.firstFreeUnder}万円未満は第1子から0円`)
    if (n.freeFromAge !== undefined) parts.push(`${n.freeFromAge}歳児クラスは0円`)
    if (n.secondChild === 'free') parts.push(`${n.secondFreeUnder !== undefined && !n.secondFreeUnsure ? `年収約${n.secondFreeUnder}万円未満なら` : ''}${n.secondOnly ? '2人目は0円' : '2人目から0円'}`)
    if (n.thirdChild === 'free' && n.thirdCount === 'household' && n.secondChild !== 'free') parts.push('上の子の年齢を問わず3人目から0円')
    if (parts.length) out.push(`保育料（${parts.join('・')}${incomeUnsure(n) ? '。所得の条件は確認中' : ''}）`)
  }
  if (Object.keys(n.monthly).length) out.push('保育料の月額の表')
  if (c.cash) out.push(c.cash.label)
  if (c.lunch.juniorHighFree !== null) out.push(`中学校の給食費（${c.lunch.juniorHighFree ? '無料' : '無料ではない'}）`)
  if (c.iju) out.push('移住支援金（あり）')
  else if (c.ijuCheck && c.ijuCheck.result !== 'unknown') out.push(`移住支援金（${c.ijuCheck.result === 'none' ? '実施なし' : '一部の地域だけ'}）`)
  return out
}

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
