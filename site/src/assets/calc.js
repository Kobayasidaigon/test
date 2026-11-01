// 空き家の算段 — 計算の中身。ビルド時（Node）とブラウザの判定ツールの両方で使う。
// ここにある式は /tool/ ページの「計算のしかた」にそのまま載せている。式を変えたら説明も直すこと。

export const SQM_PER_TSUBO = 3.30578

export const toTsubo = (sqm) => sqm / SQM_PER_TSUBO

// "1/2" "2分の1" "3分の2" "4/5" "50%" "1/2（上限100万円）" などから割合を取り出す。取れなければ null。
export function parseRate(text) {
  if (text === null || text === undefined) return null
  const s = String(text).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/／/g, '/')
  let m = s.match(/(\d+)\s*\/\s*(\d+)/)
  if (m) return Number(m[1]) / Number(m[2])
  m = s.match(/(\d+)\s*分の\s*(\d+)/)
  if (m) return Number(m[2]) / Number(m[1])
  m = s.match(/(\d+(?:\.\d+)?)\s*[%％]/)
  if (m) return Number(m[1]) / 100
  return null
}

// 解体費の目安（幅）。単価は params.demolition[structure] = { min, max }（円/坪）
export function demolitionCost(params, structure, floorSqm) {
  const u = params.demolition?.[structure]
  if (!u || !floorSqm) return null
  const t = toTsubo(floorSqm)
  return { min: u.min * t, max: u.max * t, tsubo: t }
}

// 補助額の目安。補助率と上限がわかれば min(上限, 解体費×補助率)。
export function subsidyAmount(sub, cost, floorSqm) {
  if (!sub || !sub.exists || !cost) return null
  // 床面積の区分で定額が決まる方式（例：神戸市）。区分が分からない面積なら null。
  if (Array.isArray(sub.fixed_table)) {
    const row = sub.fixed_table.find((r) => floorSqm >= r.min_sqm && (r.max_sqm === null || r.max_sqm === undefined || floorSqm < r.max_sqm))
    if (!row) return { unknown: true, note: sub.fixed_note || '' }
    const calc = (c) => Math.floor(Math.min(row.yen, c) / 1000) * 1000
    return { min: calc(cost.min), max: calc(cost.max), rate: null, cap: row.yen, fixed: true }
  }
  const rate = parseRate(sub.rate)
  const cap = sub.max_yen ?? null
  if (rate === null && cap === null) return null
  const calc = (c) => {
    let v = rate === null ? c : c * rate
    if (cap !== null) v = Math.min(v, cap)
    return Math.floor(v / 1000) * 1000 // 千円未満切り捨て（多くの要綱の扱い。自治体により異なる）
  }
  return { min: calc(cost.min), max: calc(cost.max), rate, cap, rateUnknown: rate === null }
}

// 土地の固定資産税・都市計画税（年額）の目安。
// 家が建っている（住宅用地の特例あり）と、解体して更地（特例なし）の2通り。
// p: params、o: { assessed: 土地の評価額, landSqm, floorSqm, units: 戸数, cityRate: 都市計画税率(小数), cityTax: 都市計画税がかかるか }
export function landTax(p, o) {
  const { assessed, landSqm, floorSqm } = o
  if (!assessed || !landSqm) return null
  const units = o.units || 1
  const perSqm = assessed / landSqm
  const resArea = Math.min(landSqm, (floorSqm || 0) * p.residentialFloorMultiple)
  const small = Math.min(resArea, p.smallResidentialSqm * units)
  const general = Math.max(0, resArea - small)
  const nonRes = Math.max(0, landSqm - resArea)
  const cap = p.vacantLandBurdenCap
  const cityRate = o.cityTax === false ? 0 : (o.cityRate ?? p.cityPlanningTaxMaxRate)

  const withHouseFixedBase = perSqm * (small * p.small.fixed + general * p.general.fixed + nonRes * cap)
  const withHouseCityBase = perSqm * (small * p.small.city + general * p.general.city + nonRes * cap)
  const vacantBase = assessed * cap

  const withHouse = {
    fixed: withHouseFixedBase * p.fixedAssetTaxRate,
    city: withHouseCityBase * cityRate,
  }
  withHouse.total = withHouse.fixed + withHouse.city
  const vacant = {
    fixed: vacantBase * p.fixedAssetTaxRate,
    city: vacantBase * cityRate,
  }
  vacant.total = vacant.fixed + vacant.city
  return { withHouse, vacant, ratio: withHouse.total ? vacant.total / withHouse.total : null, small, general, nonRes }
}

// 4つの選択肢の数字をまとめて出す。
export function compare(p, city, input) {
  const cost = demolitionCost(p, input.structure, input.floorSqm)
  const subRaw = input.eligible ? subsidyAmount(city?.subsidy, cost, input.floorSqm) : null
  const sub = subRaw && !subRaw.unknown ? subRaw : null
  // 補助は「費用が安い側では補助も小さい」ので、実質負担の幅は (安い側 − 安い側の補助, 高い側 − 高い側の補助)
  const net = cost ? { min: cost.min - (sub ? sub.min : 0), max: cost.max - (sub ? sub.max : 0) } : null
  const tax = landTax(p, {
    assessed: input.assessed, landSqm: input.landSqm, floorSqm: input.floorSqm,
    cityRate: city?.city_planning_tax?.rate_percent != null ? city.city_planning_tax.rate_percent / 100 : undefined,
    cityTax: input.cityTax,
  })
  const yearlyKeep = (tax ? tax.withHouse.total : 0) + (input.buildingTax || 0) + (input.upkeep || 0) + (input.tripCost || 0) * (input.trips || 0) + (input.insurance || 0)
  const yearlyVacant = (tax ? tax.vacant.total : 0) + (input.landUpkeep || 0)
  const years = input.years || 10
  return {
    cost, sub, subUnknown: subRaw && subRaw.unknown ? subRaw.note : null, net, tax,
    keep: { yearly: yearlyKeep, total: yearlyKeep * years, years },
    demolish: { yearlyAfter: yearlyVacant, totalMin: net ? net.min + yearlyVacant * years : null, totalMax: net ? net.max + yearlyVacant * years : null },
    sellMonths: input.sellMonths || 12,
    sellHolding: yearlyKeep * (input.sellMonths || 12) / 12,
  }
}

// 次の一歩を1つに絞る。理由も返す（画面に必ず出す）。
export function judge(input, r) {
  const reasons = []
  if (input.rebuild === 'no') {
    reasons.push('再建築ができない土地は、建物を壊すと新しく家を建てられず、買い手が限られます。')
    return { primary: 'kaitori', reasons }
  }
  if (input.shared === 'disagree') {
    reasons.push('共有名義で意見がまとまっていないと、仲介での売却や解体の契約が進めにくくなります。')
    return { primary: 'kaitori', reasons }
  }
  if (input.plan === 'use') {
    reasons.push('住む・貸すなど使う予定があるなら、まず建物の状態を確かめ、直して使う費用と比べます。')
    if (r.keep.yearly) reasons.push(`持ち続ける費用は、入力した条件で年に約${Math.round(r.keep.yearly / 10000)}万円です。`)
    return { primary: 'keep', reasons }
  }
  if (r.net) {
    const lo = Math.max(0, Math.round(r.net.min / 10000)), hi = Math.max(0, Math.round(r.net.max / 10000))
    reasons.push(`解体の実質負担は約${lo}〜${hi}万円です。更地にしたほうが、この金額より高く売れる見込みがあるときだけ、解体してから売るほうが得になります。`)
  }
  reasons.push('まず古家付きのままで査定を取り、更地にした場合の価格もあわせて聞くと、この差が分かります。')
  return { primary: 'sell', reasons }
}
