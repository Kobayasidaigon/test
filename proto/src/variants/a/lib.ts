// 案A「カプセルトイ」 — 見た目のための小さな道具。計算は @/shared の rank / compare / compareMany をそのまま使う。
// ここでは数字は変えない。くわしくない街（県の制度だけ／準備中）や被災した街で、言い切りすぎないための言い方だけを決める。
import { useCallback, useEffect, useState } from 'react'
import { ALL_CITIES, CITIES, DATA_LEVEL_TEXT, PREFS, everyday, moodText, periodYears, sortTier, yenMan } from '@/shared'
import type { Breakdown, Child, City, Comparison, DataLevel, FamilyInput, Pride } from '@/shared/types'

export type MotifKey =
  | 'job' | 'kettle' | 'senbei' | 'factory' | 'rocket' | 'takoyaki' | 'corn' | 'volcano' | 'drop' | 'house' | 'pear' | 'knife'
  // 20市を足したときに描いた絵
  | 'bonsai' | 'imo' | 'daruma' | 'boat' | 'tea' | 'lotus' | 'kabu' | 'anchor' | 'shirasu' | 'melon' | 'mountain' | 'soba' | 'baseball' | 'beef'
  // 同じ地域で絵がかぶらないように、あとから描き足した絵（船橋・松戸・西宮・尼崎）
  | 'clam' | 'ferry' | 'sake' | 'bean'

/* ───────── 街ごとの見た目（全国1,741） ───────── */

// カプセルの色と、はんこのインク（紙の上で読める濃さ）。くわしい街は手で決め、ほかは地方公共団体コードから決める
const SWATCHES: { capsule: string; ink: string }[] = [
  { capsule: '#ffc928', ink: '#c8322a' }, // 卵黄 × 朱
  { capsule: '#ff8a3d', ink: '#a0461b' }, // だいだい × 赤茶
  { capsule: '#4cc3e8', ink: '#1d5fae' }, // 水色 × 藍
  { capsule: '#3cc8a4', ink: '#1f7a5a' }, // ミント × 緑
  { capsule: '#ff9fb8', ink: '#b8264f' }, // もも × 紅
  { capsule: '#8fd14f', ink: '#3f7a12' }, // 若草 × 深緑
  { capsule: '#e3a857', ink: '#8a4b2a' }, // せんべい × 茶
  { capsule: '#3d7be0', ink: '#24489a' }, // 青 × 紺
  { capsule: '#b9c3cc', ink: '#3b4a57' }, // 銀 × 墨
  { capsule: '#ff5a36', ink: '#a8321f' }, // 朱 × 赤
  { capsule: '#c7e05a', ink: '#5b7a12' }, // 梨 × 草
  { capsule: '#2f4b8f', ink: '#22346b' }, // 紺 × 濃紺
]
const HAND: Record<string, { capsule: string; ink: string; pride?: number }> = {
  adachi: { capsule: '#ffc928', ink: '#c8322a' },
  kita: { capsule: '#ff8a3d', ink: '#a0461b' },
  ota: { capsule: '#4cc3e8', ink: '#1d5fae' },
  edogawa: { capsule: '#3cc8a4', ink: '#1f7a5a' },
  kawaguchi: { capsule: '#9aa6b2', ink: '#3b4a57' },
  soka: { capsule: '#e3a857', ink: '#8a4b2a' },
  ichikawa: { capsule: '#c7e05a', ink: '#5b7a12' },
  kawasaki: { capsule: '#3d7be0', ink: '#24489a' },
  sagamihara: { capsule: '#2f4b8f', ink: '#22346b' },
  osaka: { capsule: '#ff7aa2', ink: '#b8264f', pride: 1 },
  sakai: { capsule: '#b9c3cc', ink: '#2f3a48' },
  sapporo: { capsule: '#8fd14f', ink: '#3f7a12' },
  kagoshima: { capsule: '#ff5a36', ink: '#a8321f' },
  // 20市（id は地方公共団体コード）。同じ地域の中でかぶらないように決めた。
  // 首都圏の市は、23区の4色（足立・北・大田・江戸川）と草加の色を使わない（同じ額の棚や、入力例の今の街と並ぶため）。
  // 関西の市は、北区の色（入力例のリモートの家族の今の街）を使わず、はんこのインクの色相を離した
  '111007': { capsule: '#8fd14f', ink: '#3f7a12' }, // さいたま市（盆栽）
  '112011': { capsule: '#b4505a', ink: '#7a2a33' }, // 川越市（さつまいも）
  '112224': { capsule: '#ff5a36', ink: '#a8321f' }, // 越谷市（だるま）
  '112241': { capsule: '#3d7be0', ink: '#24489a' }, // 戸田市（ボート）
  '112089': { capsule: '#2f4b8f', ink: '#22346b' }, // 所沢市（狭山茶）
  '121002': { capsule: '#ff9fb8', ink: '#b8264f' }, // 千葉市（大賀ハス）
  '122041': { capsule: '#3d7be0', ink: '#24489a', pride: 1 }, // 船橋市（ホンビノス貝。梨は市川市と同じ絵になるので2つめの名物）
  '122076': { capsule: '#ff5a36', ink: '#a8321f', pride: 1 }, // 松戸市（矢切の渡し。二十世紀梨も梨の絵になるので2つめの名物）
  '122173': { capsule: '#b9c3cc', ink: '#3b4a57' }, // 柏市（カブ）
  '122203': { capsule: '#2f4b8f', ink: '#22346b' }, // 流山市
  '141003': { capsule: '#b4505a', ink: '#7a2a33' }, // 横浜市（港）
  '142051': { capsule: '#ff9fb8', ink: '#b8264f' }, // 藤沢市（しらす）
  '132098': { capsule: '#8fd14f', ink: '#3f7a12' }, // 町田市（メロン）
  '132012': { capsule: '#ff9fb8', ink: '#b8264f' }, // 八王子市（高尾山）
  '132080': { capsule: '#b4505a', ink: '#7a2a33' }, // 調布市（そば）
  '272035': { capsule: '#ff5a36', ink: '#a8321f' }, // 豊中市（野球）
  '272051': { capsule: '#3cc8a4', ink: '#1f7a5a' }, // 吹田市
  '282022': { capsule: '#8fd14f', ink: '#3f7a12' }, // 尼崎市（富松一寸豆）
  '282049': { capsule: '#e3a857', ink: '#8a4b2a' }, // 西宮市（宮水と酒だる）
  '281000': { capsule: '#3d7be0', ink: '#24489a' }, // 神戸市（牛肉）
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const PRIDE_MOTIF: Record<string, MotifKey> = {
  求人の多さ: 'job',
  鋳物のまち: 'kettle',
  草加せんべい: 'senbei',
  工場夜景: 'factory',
  宇宙のまち: 'rocket',
  下水道代が安い: 'drop',
  粉もん: 'takoyaki',
  '農業産出額 全国1位': 'corn',
  桜島: 'volcano',
  '第3子は保育料0円': 'house',
  梨: 'pear',
  刃物: 'knife',
  // 20市の名物。ロゴ・マスコット・商品の包み・著作物（太陽の塔など）・有名キャラクターに似た形は描かない
  '盆栽（大宮盆栽村）': 'bonsai',
  'さつまいも（川越いも）': 'imo',
  越谷だるま: 'daruma',
  '戸田ボートコース（戸田漕艇場）': 'boat',
  狭山茶: 'tea',
  大賀ハス: 'lotus',
  二十世紀梨の発祥地: 'pear',
  カブ: 'kabu',
  横浜港: 'anchor',
  'しらす（湘南しらす）': 'shirasu',
  まちだシルクメロン: 'melon',
  高尾山: 'mountain',
  深大寺そば: 'soba',
  高校野球発祥の地: 'baseball',
  阪神甲子園球場: 'baseball',
  阪神工業地帯のものづくり: 'factory',
  神戸ビーフ: 'beef',
  // 同じ地域で絵がかぶらないように描き足した（梨×3・野球×2・工場夜景を、ほかの名物の絵に）
  'ホンビノス貝（三番瀬）': 'clam',
  矢切の渡し: 'ferry',
  宮水と灘の日本酒: 'sake',
  富松一寸豆: 'bean',
}
// 絵のある名物だけ絵を返す。絵がない名物（白みりん・万博記念公園など）は null（街の字のキーホルダー・はんこにする）
export const prideMotif = (p: Pride): MotifKey | null => PRIDE_MOTIF[p.label] ?? null

// 県全体で同じ名物（東京都の「求人の多さ」、埼玉県の「第3子は保育料0円」など）は、その街だけのものではない。
// 名前と説明の両方が同じものを数える（市川市の「梨」と船橋市の「梨」は、説明が違うので、それぞれの街の名物）
let sharedCache: Set<string> | null = null
const prideKey = (p: Pride) => `${p.label}\u0000${p.fact}`
export function isSharedPride(p: Pride) {
  if (!sharedCache) {
    const n = new Map<string, number>()
    for (const c of ALL_CITIES) for (const q of c.pride) n.set(prideKey(q), (n.get(prideKey(q)) ?? 0) + 1)
    sharedCache = new Set([...n].filter(([, v]) => v > 1).map(([k]) => k))
  }
  return sharedCache.has(prideKey(p))
}

export type Frame = 'circle' | 'square' | 'octagon'
export interface Look {
  capsule: string
  ink: string
  motif: MotifKey | null // はんこの真ん中の絵。その街だけの名物に絵がないとき（名物がないときも）は null（街の名前の字を置く）
  pride: Pride | null // はんこの絵にした名物
  glyph: string // はんこの真ん中に置く字（例: 足立）
  frame: Frame // 市は丸、区は角丸の四角、町と村は八角形
  under: string // はんこの下に入れる短い言葉
}

// はんこの下に入れる字が長い名物は、短い呼び名にする（はんこのふちの字とぶつからないように）
const UNDER_SHORT: Record<string, string> = {
  '農業産出額 全国1位': '農業産出額1位',
  '戸田ボートコース（戸田漕艇場）': 'ボートコース',
  二十世紀梨の発祥地: '二十世紀梨',
  まちだシルクメロン: 'シルクメロン',
  高校野球発祥の地: '高校野球',
  万博記念公園と太陽の塔: '万博公園',
  阪神工業地帯のものづくり: 'ものづくり',
  阪神甲子園球場: '甲子園',
  '新選組ゆかりの地（近藤勇陣屋跡）': '新選組',
  宮水と灘の日本酒: '灘の酒',
}

const SUFFIX = /(市|区|町|村)$/
export const stemOf = (name: string) => name.replace(SUFFIX, '') || name
const kanaStem = (c: City) => (c.kana ?? '').replace(/(し|く|まち|ちょう|むら|そん)$/, '')

const lookCache = new Map<string, Look>()
export function lookOf(city: City): Look {
  const hit = lookCache.get(city.id)
  if (hit) return hit
  const hand = HAND[city.id]
  // 被災した街は、落ち着いた水色と藍のインクにする
  const sw = hand ?? (city.care?.level === 'hit' ? { capsule: '#9fdcef', ink: '#1d5fae' } : SWATCHES[hash(city.code ?? city.id) % SWATCHES.length])
  const own = city.pride.filter((p) => !isSharedPride(p))
  // 絵のある名物を先に。どれにも絵がなければ、はじめの名物（絵は街の字にする）
  const pick = hand?.pride !== undefined ? city.pride[hand.pride] : own.find((p) => prideMotif(p)) ?? own[0]
  const pride = pick && !isSharedPride(pick) ? pick : null
  const stem = stemOf(city.name)
  const chars = [...stem]
  const glyph = chars.length <= 4 ? stem : chars[0]
  const frame: Frame = city.name.endsWith('区') ? 'square' : city.name.endsWith('市') ? 'circle' : 'octagon'
  const look: Look = {
    capsule: sw.capsule,
    ink: sw.ink,
    motif: pride ? prideMotif(pride) : null,
    pride,
    glyph,
    frame,
    // はんこの下の字は短く（「盆栽（大宮盆栽村）」→「盆栽」。長い名前は UNDER_SHORT）
    under: pride ? UNDER_SHORT[pride.label] ?? pride.label.replace(/（[^）]*）/g, '') : kanaStem(city) || city.pref,
  }
  lookCache.set(city.id, look)
  return look
}

// 名物の説明が、街ではなく都道府県のこと（例: 北海道は農業産出額が全国1位）なら、見出しは「北海道の自慢」にする
// （「兵庫県産の但馬牛のうち…」のように県の名前で始まるだけの説明は、街の名物のまま）
export const prideIsPref = (p: Pride, city: City) => isSharedPride(p) || p.fact.startsWith(`${city.pref}は`)

/* ───────── データの細かさ ───────── */

export const prefKind = (pref: string) => (pref.endsWith('都') ? '都' : pref.endsWith('道') ? '道' : pref.endsWith('府') ? '府' : '県')
// 街の種類の字（市・区・町・村）
export const townKind = (name: string) => (name.endsWith('区') ? '区' : name.endsWith('町') ? '町' : name.endsWith('村') ? '村' : '市')
// 札に書く短い言葉
export function levelTag(city: City) {
  if (city.level === 'detailed') return 'くわしい'
  if (city.level === 'pref') return `${prefKind(city.pref)}の制度`
  return '準備中'
}
// 説明の言葉
export function levelText(city: City) {
  if (city.level !== 'pref') return DATA_LEVEL_TEXT[city.level]
  // 東京都の区以外の市町村：保育料の無償化は都の補助で市町村が行うので、「都の制度」には入れていない（確かめた市だけ入れた）
  if (city.pref === '東京都' && city.region !== 'tokyo23') {
    return city.nursery.firstChildFree
      ? '都の制度（018サポート）と、市の保育料の無償化だけ分かる街（ほかの市独自の制度は、まだ調べていません）'
      : '都の制度（018サポート）だけ分かる街（保育料の無償化など、市町村が行う制度は、まだ調べていません）'
  }
  return `${prefKind(city.pref)}の制度だけ分かる街（市区町村の上乗せは、まだ調べていません）`
}
export const LEVEL_ORDER: DataLevel[] = ['detailed', 'pref', 'basic']
export const LEVEL_LEGEND: Record<DataLevel, { tag: string; text: string }> = {
  detailed: { tag: 'くわしい', text: '市区町村の制度まで調べた街。色がしっかりついたカプセル' },
  pref: { tag: '県の制度', text: '都道府県の制度だけ分かる街。しま模様のカプセル' },
  basic: { tag: '準備中', text: '国の統計（医療費助成・家賃）だけ分かる街。すけたカプセル。保育料などは準備中' },
}
export const LEVEL_COUNT: Record<DataLevel, number> = {
  detailed: ALL_CITIES.filter((c) => c.level === 'detailed').length,
  pref: ALL_CITIES.filter((c) => c.level === 'pref').length,
  basic: ALL_CITIES.filter((c) => c.level === 'basic').length,
}
// 画面に書く数（ハードコードしない）。例: 1,741
export const ALL_COUNT = ALL_CITIES.length.toLocaleString('ja-JP')

/* ───────── 地方 → 県 → 街 ───────── */

export const REGIONS: { name: string; prefs: string[] }[] = [
  { name: '北海道・東北', prefs: PREFS.slice(0, 7) },
  { name: '関東', prefs: PREFS.slice(7, 14) },
  { name: '中部', prefs: PREFS.slice(14, 23) },
  { name: '近畿', prefs: PREFS.slice(23, 30) },
  { name: '中国', prefs: PREFS.slice(30, 35) },
  { name: '四国', prefs: PREFS.slice(35, 39) },
  { name: '九州・沖縄', prefs: PREFS.slice(39) },
]
export const FEATURED = CITIES

/* ───────── くわしい街を、地域ごとにまとめる ─────────
   東京23区／東京の市／埼玉／千葉／神奈川／大阪・兵庫／北海道・九州 のように、実際の一覧から名前を作る（街を足しても崩れない） */
export interface TownGroup {
  key: string
  name: string
  cities: City[]
}
const GROUP_ORDER = ['tokyo23', 'tokyo', '埼玉県', '千葉県', '神奈川県', 'kansai', 'other']
const groupKeyOf = (c: City) => (c.region === 'tokyo23' ? 'tokyo23' : c.pref === '東京都' ? 'tokyo' : c.metro === 'shutoken' ? c.pref : c.metro === 'kansai' ? 'kansai' : 'other')
const prefShort = (p: string) => p.replace(/(都|府|県)$/, '')
const areaShort = (p: string) => (p === '北海道' ? '北海道' : (REGIONS.find((r) => r.prefs.includes(p))?.name ?? p).split('・')[0])
const uniq = (list: string[]) => [...new Set(list)]
function groupName(key: string, cities: City[]) {
  if (key === 'tokyo23') return '東京23区'
  if (key === 'tokyo') return cities.every((c) => c.name.endsWith('市')) ? '東京の市' : '東京の市町村'
  if (key === 'kansai') return uniq(cities.map((c) => prefShort(c.pref))).join('・')
  if (key === 'other') return uniq(cities.map((c) => areaShort(c.pref))).join('・')
  return prefShort(key)
}
export const FEATURED_GROUPS: TownGroup[] = (() => {
  const by = new Map<string, City[]>()
  for (const c of FEATURED) by.set(groupKeyOf(c), [...(by.get(groupKeyOf(c)) ?? []), c])
  const ord = (k: string) => (GROUP_ORDER.includes(k) ? GROUP_ORDER.indexOf(k) : GROUP_ORDER.length)
  const keys = [...by.keys()].sort((a, b) => ord(a) - ord(b))
  // 地域の中は、地方公共団体コードの順（北から・県庁所在地から）
  return keys.map((k) => {
    const cities = [...by.get(k)!].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
    return { key: k, name: groupName(k, cities), cities }
  })
})()
export const groupOf = (c: City) => FEATURED_GROUPS.find((g) => g.cities.some((x) => x.code === c.code))

/* ───────── 家族の言い方 ───────── */

export const childLabel = (c: Child) => (c.age < 0 ? 'これから' : `${c.age}歳`)
export const familySummary = (f: FamilyInput) =>
  `大人${f.adults}人・子ども${f.children.length}人` + (f.children.length ? `（${f.children.map(childLabel).join('・')}）` : '')
export const yearsActual = (f: FamilyInput) => periodYears(f)
export const yearsLabel = (f: FamilyInput) => (f.years === 18 ? `下の子が18歳まで（${yearsActual(f)}年）` : `${f.years}年`)
// 上の金額にそえる言い方（例: 5年でならすと）
export const avgLead = (years: number) => (years <= 1 ? '1年で' : `${years}年でならすと`)

/* ───────── 金額の向き ───────── */

// 1万円未満は「ほぼ同じ」
export type Tone = 'plus' | 'stay' | 'even'
export const toneOf = (perYear: number): Tone => (Math.abs(perYear) < 10000 ? 'even' : perYear > 0 ? 'plus' : 'stay')
export const TONE_INK: Record<Tone, string> = { plus: 'var(--plus)', stay: 'var(--stay)', even: 'var(--ink-soft)' }
export const TONE_BG: Record<Tone, string> = { plus: 'var(--plus-bg)', stay: 'var(--stay-bg)', even: 'var(--paper-2)' }
// 「万円」の数字だけ（yenMan と同じ丸め）
export const manNumber = (yen: number) => {
  const v = Math.abs(yen) / 10000
  return v >= 100 ? Math.round(v) : Math.round(v * 10) / 10
}
export const isHit = (c: Comparison) => c.care?.level === 'hit'
// 今の街が被災した街か
export const fromHit = (c: Comparison) => c.from.care?.level === 'hit'

/* ───────── どこまで言い切れるか ─────────
   共有の計算は、当てはまる項目が0件だと status を 'ok' にする。
   くわしくない街（県の制度だけ／準備中）では、市の給付や保育料をまだ調べていないので、
   差が1万円未満でも「ほぼ同じ」とは言わない（画面側で判定する）。 */

// くわしくない街がからむ比べで、わかる差が1万円未満のときの、その街（候補を先に見る）
export function thinCity(c: Comparison): City | null {
  if (isHit(c) || c.status === 'unknown' || toneOf(c.perYear) !== 'even') return null
  if (c.to.level !== 'detailed') return c.to
  if (c.from.level !== 'detailed') return c.from
  return null
}
// full = 両方くわしく全部わかる / known = わかる分だけの額（確認中あり、または くわしくない街） / thin / unknown / care
export type Scope = 'full' | 'known' | 'thin' | 'unknown' | 'care'
export function scopeOf(c: Comparison): Scope {
  if (isHit(c)) return 'care'
  if (c.status === 'unknown') return 'unknown'
  if (thinCity(c)) return 'thin'
  if (c.status === 'partial' || c.to.level !== 'detailed' || c.from.level !== 'detailed') return 'known'
  return 'full'
}
// 準備中（まだ中身を比べられない）として扱うか
export const isPending = (c: Comparison) => c.status === 'unknown' || !!thinCity(c)

// まだ調べていないことの言い方（県の制度の街は「独自の給付など」、準備中の街は「保育料や市の給付」）
function notYet(cities: City[]) {
  const names = (list: City[]) => list.map((c) => c.name).join('と')
  const basic = cities.filter((c) => c.level === 'basic')
  const pref = cities.filter((c) => c.level === 'pref')
  const kinds = [...new Set(basic.map((c) => townKind(c.name)))]
  const parts: string[] = []
  if (basic.length) parts.push(`${names(basic)}の保育料や${kinds.length === 1 ? kinds[0] : '市町村'}の給付`)
  if (pref.length) parts.push(`${names(pref)}独自の給付など`)
  return parts.join('、')
}

// 見出し（共有の headline を、言い切りすぎない形に置きかえる）
export function headlineOf(c: Comparison): string {
  if (isHit(c)) return `${c.to.name}の子育ての制度`
  const thin = thinCity(c)
  if (thin) {
    const who = thin === c.to ? thin.name : `${thin.name}（今の街）`
    return thin.level === 'pref' ? `${who}独自の制度は、まだ調べていません` : `${who}の制度は、まだ準備中`
  }
  if (c.status === 'partial' && toneOf(c.perYear) === 'even') return `${c.to.name}は、わかる分では差が小さい`
  return c.headline
}
export function sublineOf(c: Comparison): string {
  // 被災した街では「いちばん効いているのは…」（金額の大きさの順）も言わない
  if (isHit(c)) return '制度の中身を、下に書いています'
  if (thinCity(c)) return 'わかっている制度では、差は見つかりませんでした'
  return c.subline
}
// まだ調べていないものを1文で（くわしくない街がからむとき。なければ空）
export function missingText(c: Comparison): string {
  const cities = [c.to, c.from].filter((x) => x.level !== 'detailed')
  if (!cities.length) return ''
  return `${notYet(cities)}は、まだ${cities.every((x) => x.level === 'pref') ? '調べていません' : '準備中です'}。`
}
// わかる差が見つからなかったときの1文（金額の箱・くらべ棚で使う）
export function thinText(c: Comparison): string {
  const cities = [c.to, c.from].filter((x) => x.level !== 'detailed')
  const pref = cities.find((x) => x.level === 'pref')
  const known = pref ? `国・${prefKind(pref.pref)}` : '国'
  return `わかっている${known}の制度では、差は見つかりませんでした。${missingText(c)}`
}
// 家族の吹き出し（moodText をもとに、くわしくない街・被災した街・わかる分だけの比べを言いかえる）
export function moodLine(c: Comparison): string {
  if (isHit(c)) return '地震で被害を受けた街なので、得・損は出していません'
  const thin = thinCity(c)
  if (thin) return thin === c.to ? 'まだ分からないことが多い街。公式サイトで確かめよう' : '今の街のことが、まだ分かっていません。公式サイトで確かめよう'
  if (c.status === 'partial' && c.mood === 0) return 'わかる分では、あまり変わらない。確認中の項目しだい'
  return moodText(c)
}
// 読み上げ用の一文（確認中の項目も言う）
export function spoken(c: Comparison): string {
  if (isHit(c)) return `${c.to.name}のカプセル。${c.care?.note ?? ''}`
  if (c.status === 'unknown') return `${c.headline}。まだ比べられません`
  if (thinCity(c)) return `${headlineOf(c)}。${thinText(c)}`
  const miss = c.unknown.length ? `。確認中の${c.unknown.map((u) => u.label).join('・')}は入っていません` : ''
  const part = c.status === 'partial' ? 'わかっている項目だけで、' : ''
  return `${part}${headlineOf(c)}。${perYearChip(c)}の金額です${miss}`
}

// 上の金額にそえる札（期間が1年なら「1年ぶん」）
export const perYearChip = (c: Comparison) => (c.years <= 1 ? '1年ぶん' : c.perYearLabel)

// 月・1日の言いかえ（共有の everyday を使い、4けた以上には区切りを入れる）
export function everydayText(yearly: number) {
  const e = everyday(yearly)
  const comma = (s: string) => s.replace(/\d{4,}/g, (n) => Number(n).toLocaleString('ja-JP'))
  return { month: comma(e.month), day: comma(e.day) }
}

// 項目ごとの金額の言い方（期間が2年以上のときは、カードの上に「◯年でならすと」を小さく添える）
export function itemAmount(i: Breakdown, c: Comparison): { tone: Tone | 'unknown' | 'once' | 'care'; text: string } {
  if (i.oneTime) return { tone: 'once', text: `一度だけ 約${yenMan(i.total ?? 0, 0)}` }
  if (i.perYear === null) return { tone: 'unknown', text: '確認中' }
  if (Math.abs(i.perYear) < 1000) return { tone: 'even', text: '差はなし' }
  // 被災した街では、得・損の向きの言葉を使わず、どちらの制度の中身かだけを書く
  if (isHit(c)) return { tone: 'care', text: `${(i.perYear > 0 ? c.to : c.from).name}の制度のほうが手厚い` }
  return i.perYear > 0
    ? { tone: 'plus', text: `${c.to.name}だと 年 約${yenMan(i.perYear)} 得` }
    : { tone: 'stay', text: `${c.from.name}のままが 年 約${yenMan(-i.perYear)} お得` }
}

// 棚のカプセルにそえる短い一言（確認中・準備中・配慮も見る）。part は「わかる分で」の小さな前置き
export function shelfLine(c: Comparison): { l1: string; l2: string; tone: Tone | 'unknown' | 'care'; part?: boolean } {
  if (isHit(c)) return { l1: '地震の配慮で', l2: '得・損は出さない', tone: 'care' }
  if (c.status === 'unknown') return { l1: 'まだ', l2: '確認中', tone: 'unknown' }
  const thin = thinCity(c)
  if (thin) return { l1: 'まだ', l2: thin.level === 'pref' ? '調べ中' : '準備中', tone: 'unknown' }
  const t = toneOf(c.perYear)
  const part = c.status === 'partial'
  if (t === 'even') return { l1: part ? 'わかる分は' : 'ほぼ同じ', l2: part ? '差が小さい' : '', tone: t }
  if (t === 'plus') return { l1: 'この街だと', l2: `年${yenMan(c.perYear)}得`, tone: t, part }
  return { l1: 'いまの街が', l2: `年${yenMan(-c.perYear)}お得`, tone: t, part }
}

// 上から同じ額の街がいくつ続くか（確認中・準備中・配慮の街は数えない。全部わかる街と、確認中のある街も分ける）
export function tiesAtTop(ranked: Comparison[]) {
  if (!ranked.length) return 0
  const top = ranked[0]
  if (isPending(top) || isHit(top)) return 0
  let n = 0
  for (const r of ranked) {
    if (isPending(r) || r.status !== top.status || Math.abs(r.perYear - top.perYear) >= 1000) break
    n++
  }
  return n
}

// 同じ額の街の並べ方：共有の並び（段 → 毎年の差が大きい順。sortTier）はそのまま。1,000円未満の差しかない街のなかだけ、
// 全部わかる街 → 一度きりのお金がある街 → くわしい街 → 県の制度 → 準備中、そのなかは今の街から近い順にする
const LEVEL_RANK: Record<DataLevel, number> = { detailed: 0, pref: 1, basic: 2 }
export function settleTies(list: Comparison[]): Comparison[] {
  const out = [...list]
  let i = 0
  while (i < out.length) {
    let j = i + 1
    while (j < out.length && sortTier(out[j]) === sortTier(out[i]) && Math.abs(out[j].perYear - out[i].perYear) < 1000) j++
    if (j - i > 1) {
      const seg = out
        .slice(i, j)
        .sort(
          (a, b) =>
            (a.status === 'ok' ? 0 : 1) - (b.status === 'ok' ? 0 : 1) ||
            b.oneTime - a.oneTime ||
            LEVEL_RANK[a.to.level] - LEVEL_RANK[b.to.level] ||
            (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
        )
      out.splice(i, j - i, ...seg)
    }
    i = j
  }
  return out
}

/* ───────── 移住支援金（一度きり）の言い方 ─────────
   23区から東京圏の外へ移る家族（パート・時短は対象外として計算）だけに関係する。判定はここ1か所で行う。
   item    … 額が分かる（共有の計算が「一度きり」の項目を出している）
   none    … 調べて、対象外と分かった（city.ijuCheck）
   part    … 一部の地域だけ対象（city.ijuCheck。額は合計にも一度きりにも入れない）
   pending … まだ調べていない。くわしい街でも「ない」とは言わず「準備中」 */
export type IjuState = 'item' | 'none' | 'part' | 'pending'
export function ijuState(c: Comparison, input: FamilyInput): IjuState | null {
  if (c.items.some((i) => i.key === 'iju')) return 'item'
  if (c.from.region !== 'tokyo23' || c.to.metro === 'shutoken' || input.work === 'part') return null
  if (c.to.ijuCheck) return c.to.ijuCheck.result
  return 'pending'
}
// 表に出す短い言葉（item は額を出すので、ここでは扱わない）
// 表の行の見出しが「移住支援金（一度きり）」なので、マスには短い言葉だけを書く
export const IJU_SHORT: Record<'none' | 'part' | 'pending', string> = { none: '対象外', part: '一部の地域だけ', pending: '準備中' }

/* ───────── 次の一歩（結果に合わせて、最大3つ） ───────── */

export interface NextStep {
  text: string
  href?: string
  link?: string
}
export function nextSteps(c: Comparison, others = 0, input?: FamilyInput): NextStep[] {
  const s: NextStep[] = []
  const tone = toneOf(c.perYear)
  const thin = thinCity(c)
  if (isHit(c) && c.care) s.push({ text: `${c.to.name}の最新の状況を、公式の発表で確かめる`, href: c.care.sources[0]?.url, link: c.care.sources[0]?.label })
  // 今の街が被災した街なら、まず公式の発表。窓口への問い合わせは勧めない
  if (fromHit(c) && c.from.care) s.push({ text: `${c.from.name}の最新の状況を、公式の発表で確かめる`, href: c.from.care.sources[0]?.url, link: c.from.care.sources[0]?.label })
  if (c.unknown.length) {
    // どちらの街の数字が分からないかは、説明の書き出しで分かる（例: 「草加市の、この年収帯の…」）
    const cities = [...new Set(c.unknown.map((u) => (u.plain.startsWith(c.from.name) ? c.from : c.to)))]
    const ask = cities.filter((x) => x.care?.level !== 'hit')
    const labels = c.unknown.map((u) => u.label).join('・')
    if (ask.length) s.push({ text: `確認中の「${labels}」を、${ask.map((x) => x.name).join('と')}の窓口で聞いてみる` })
    else s.push({ text: `確認中の「${labels}」は、${cities.map((x) => x.name).join('と')}の公式サイトの案内で確かめる`, href: cities[0]?.url, link: `${cities[0]?.name}の公式サイト` })
  }
  for (const x of [c.to, c.from]) {
    if (x.level === 'basic' && x.url && x.care?.level !== 'hit' && (x === c.to || thin === x)) s.push({ text: `${x.name}の子育ての制度を、公式サイトで見る`, href: x.url, link: `${x.name}の公式サイト` })
  }
  if (thin && thin.level === 'pref' && thin.url) s.push({ text: `${thin.name}独自の子育ての制度を、公式サイトで見る`, href: thin.url, link: `${thin.name}の公式サイト` })
  const iju = input ? ijuState(c, input) : null
  if (iju === 'pending') s.push({ text: `移住支援金の対象になるかを、${c.to.name}のページで確かめる（まだ調べていません）`, href: c.to.url, link: `${c.to.name}の公式サイト` })
  if (iju === 'part') s.push({ text: `移住支援金は一部の地域だけ。住みたい場所が対象かを、${c.to.name}の窓口で確かめる`, href: c.to.ijuCheck?.sources[0]?.url, link: c.to.ijuCheck?.sources[0]?.label })
  if (c.status === 'ok' && !thin && tone === 'even') s.push({ text: '子育ての制度の差はほとんどないので、家賃・通勤・住みごこちで比べてみる' })
  if (c.oneTime > 0) s.push({ text: '移住支援金の条件（対象になる人・申し込みの時期）を、市のページで確かめる' })
  if (tone === 'stay' && c.status !== 'unknown' && !isHit(c)) s.push({ text: `${c.from.name}の子育ての制度を、もれなく使えているか見直す` })
  if (c.items.some((i) => i.key === 'nursery' && i.perYear !== null && Math.abs(i.perYear) >= 1000)) s.push({ text: `${c.to.name}の保育園の空きぐあいを調べる` })
  if (others > 0 && s.length < 3) s.push({ text: '棚にある、ほかのカプセルも開けてみる' })
  if (tone !== 'even' && !isHit(c)) s.push({ text: '家賃や通勤時間も、あわせて比べてみる' })
  // 同じ文はひとつに
  const seen = new Set<string>()
  return s.filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true))).slice(0, 3)
}

/* ───────── そのほか ───────── */

// 決まった乱数（絵のゆらぎ用。結果には使わない）
export function seeded(seed: string) {
  let h = hash(seed)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const kmText = (km?: number) => (km === undefined ? '' : km < 10 ? `${Math.round(km * 10) / 10}km` : `${Math.round(km).toLocaleString('ja-JP')}km`)

// 背の低い画面（iPhone SE など）か。下の帯に部品が隠れないよう、窓を細くしたり、札を小さくしたりする
export function useShortScreen(limit = 740) {
  return useViewportBelow(limit, 'h')
}
// 幅のせまい画面（360px など）か
export function useNarrowScreen(limit = 370) {
  return useViewportBelow(limit, 'w')
}
function useViewportBelow(limit: number, axis: 'w' | 'h') {
  const read = () => (typeof window === 'undefined' ? false : (axis === 'h' ? window.innerHeight : window.innerWidth) < limit)
  const [below, setBelow] = useState(read)
  useEffect(() => {
    const f = () => setBelow(read())
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, axis])
  return below
}

// 都道府県の読みがな（「ほっかいどう」「とうきょう」のように県の名前で探したときに、県の一覧を開けるように）
const PREF_KANA: Record<string, string> = {
  北海道: 'ほっかいどう', 青森県: 'あおもり', 岩手県: 'いわて', 宮城県: 'みやぎ', 秋田県: 'あきた', 山形県: 'やまがた', 福島県: 'ふくしま',
  茨城県: 'いばらき', 栃木県: 'とちぎ', 群馬県: 'ぐんま', 埼玉県: 'さいたま', 千葉県: 'ちば', 東京都: 'とうきょう', 神奈川県: 'かながわ',
  新潟県: 'にいがた', 富山県: 'とやま', 石川県: 'いしかわ', 福井県: 'ふくい', 山梨県: 'やまなし', 長野県: 'ながの', 岐阜県: 'ぎふ',
  静岡県: 'しずおか', 愛知県: 'あいち', 三重県: 'みえ', 滋賀県: 'しが', 京都府: 'きょうと', 大阪府: 'おおさか', 兵庫県: 'ひょうご',
  奈良県: 'なら', 和歌山県: 'わかやま', 鳥取県: 'とっとり', 島根県: 'しまね', 岡山県: 'おかやま', 広島県: 'ひろしま', 山口県: 'やまぐち',
  徳島県: 'とくしま', 香川県: 'かがわ', 愛媛県: 'えひめ', 高知県: 'こうち', 福岡県: 'ふくおか', 佐賀県: 'さが', 長崎県: 'ながさき',
  熊本県: 'くまもと', 大分県: 'おおいた', 宮崎県: 'みやざき', 鹿児島県: 'かごしま', 沖縄県: 'おきなわ',
}
const toHira = (s: string) => s.normalize('NFKC').replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)).replace(/\s+/g, '')
// 書いた文字が都道府県の名前・読みに当たるなら、その都道府県（2文字以上から）
export function prefsFor(query: string): string[] {
  const q = toHira(query)
  if ([...q].length < 2) return []
  return PREFS.filter((p) => {
    const bare = p.replace(/(都|道|府|県)$/, '')
    const kana = PREF_KANA[p] ?? ''
    return p.startsWith(q) || bare.startsWith(q) || q.startsWith(bare) || kana.startsWith(q) || (q.length >= 3 && q.startsWith(kana))
  }).slice(0, 3)
}

// スタンプ帳：開けた街の id だけを、この端末に残す（家族の入力は残さない）
const BOOK_KEY = 'sumumachi-gacha-a:stamps'
export function useStampBook() {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const v = localStorage.getItem(BOOK_KEY)
      const parsed = v ? JSON.parse(v) : []
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return []
    }
  })
  const save = (next: string[]) => {
    try {
      if (next.length) localStorage.setItem(BOOK_KEY, JSON.stringify(next))
      else localStorage.removeItem(BOOK_KEY)
    } catch {
      /* 保存できなくても画面は動く */
    }
  }
  const add = useCallback((...more: string[]) => {
    setIds((prev) => {
      const next = [...prev]
      for (const id of more) if (!next.includes(id)) next.push(id)
      if (next.length === prev.length) return prev
      save(next)
      return next
    })
  }, [])
  const clear = useCallback(() => {
    setIds([])
    save([])
  }, [])
  return { ids, add, clear }
}
