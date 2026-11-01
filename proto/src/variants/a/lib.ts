// 案A「カプセルトイ」 — 見た目のための小さな道具。計算は @/shared の rank / compare / compareMany をそのまま使う。
import { useCallback, useState } from 'react'
import { ALL_CITIES, CITIES, DATA_LEVEL_TEXT, PREFS, periodYears, yenMan } from '@/shared'
import type { Breakdown, Child, City, Comparison, DataLevel, FamilyInput, Pride } from '@/shared/types'

export type MotifKey = 'job' | 'kettle' | 'senbei' | 'factory' | 'rocket' | 'takoyaki' | 'corn' | 'volcano' | 'drop' | 'house' | 'pear' | 'knife'

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
}
const KIND_MOTIF: Record<Pride['kind'], MotifKey> = { food: 'senbei', craft: 'kettle', industry: 'factory', nature: 'volcano', job: 'job', life: 'house' }
export const prideMotif = (p: Pride): MotifKey => PRIDE_MOTIF[p.label] ?? KIND_MOTIF[p.kind]

// 県全体で同じ名物（東京都の「求人の多さ」、埼玉県の「第3子は保育料0円」など）は、その街だけのものではない
let sharedCache: Set<string> | null = null
export function isSharedPride(p: Pride) {
  if (!sharedCache) {
    const n = new Map<string, number>()
    for (const c of ALL_CITIES) for (const q of c.pride) n.set(q.label, (n.get(q.label) ?? 0) + 1)
    sharedCache = new Set([...n].filter(([, v]) => v > 1).map(([k]) => k))
  }
  return sharedCache.has(p.label)
}

export type Frame = 'circle' | 'square' | 'octagon'
export interface Look {
  capsule: string
  ink: string
  motif: MotifKey | null // はんこの真ん中の絵。その街だけの名物がないときは null（街の名前の字を置く）
  pride: Pride | null // はんこの絵にした名物
  glyph: string // はんこの真ん中に置く字（例: 足立）
  frame: Frame // 市は丸、区は角丸の四角、町と村は八角形
  under: string // はんこの下に入れる短い言葉
}

const SUFFIX = /(市|区|町|村)$/
export const stemOf = (name: string) => name.replace(SUFFIX, '') || name
const kanaStem = (c: City) => (c.kana ?? '').replace(/(し|く|まち|ちょう|むら|そん)$/, '')

const lookCache = new Map<string, Look>()
export function lookOf(city: City): Look {
  const hit = lookCache.get(city.id)
  if (hit) return hit
  const hand = HAND[city.id]
  const sw = hand ?? SWATCHES[hash(city.code ?? city.id) % SWATCHES.length]
  const own = city.pride.filter((p) => !isSharedPride(p))
  const pick = hand?.pride !== undefined ? city.pride[hand.pride] : own[0]
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
    under: pride ? pride.label : kanaStem(city) || city.pref,
  }
  lookCache.set(city.id, look)
  return look
}

/* ───────── データの細かさ ───────── */

const prefKind = (pref: string) => (pref.endsWith('都') ? '都' : pref.endsWith('道') ? '道' : pref.endsWith('府') ? '府' : '県')
// 札に書く短い言葉
export function levelTag(city: City) {
  if (city.level === 'detailed') return 'くわしい'
  if (city.level === 'pref') return `${prefKind(city.pref)}の制度`
  return '準備中'
}
// 説明の言葉
export function levelText(city: City) {
  if (city.level === 'pref') return `${prefKind(city.pref)}の制度だけ分かる街（市区町村の上乗せは、まだ調べていません）`
  return DATA_LEVEL_TEXT[city.level]
}
export const LEVEL_ORDER: DataLevel[] = ['detailed', 'pref', 'basic']
export const LEVEL_LEGEND: Record<DataLevel, { tag: string; text: string }> = {
  detailed: { tag: 'くわしい', text: '市区町村の制度まで調べた街。色がしっかりついたカプセル' },
  pref: { tag: '県の制度', text: '都道府県の制度だけ分かる街。しま模様のカプセル' },
  basic: { tag: '準備中', text: '国の制度だけ。すけたカプセルで、くわしいデータは準備中' },
}
export const LEVEL_COUNT: Record<DataLevel, number> = {
  detailed: ALL_CITIES.filter((c) => c.level === 'detailed').length,
  pref: ALL_CITIES.filter((c) => c.level === 'pref').length,
  basic: ALL_CITIES.filter((c) => c.level === 'basic').length,
}

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

// 項目ごとの金額の言い方（期間が2年以上のときは、カードの上に「◯年でならすと」を小さく添える）
export function itemAmount(i: Breakdown, c: Comparison): { tone: Tone | 'unknown' | 'once'; text: string } {
  if (i.oneTime) return { tone: 'once', text: `一度だけ 約${yenMan(i.total ?? 0, 0)}` }
  if (i.perYear === null) return { tone: 'unknown', text: '確認中' }
  if (Math.abs(i.perYear) < 1000) return { tone: 'even', text: '差はなし' }
  return i.perYear > 0
    ? { tone: 'plus', text: `${c.to.name}だと 年 約${yenMan(i.perYear)} 得` }
    : { tone: 'stay', text: `${c.from.name}のままが 年 約${yenMan(-i.perYear)} お得` }
}

// 棚のカプセルにそえる短い一言（確認中・配慮も見る）
export function shelfLine(c: Comparison): { l1: string; l2: string; tone: Tone | 'unknown' | 'care' } {
  if (isHit(c)) return { l1: '損得の演出は', l2: '出していません', tone: 'care' }
  if (c.status === 'unknown') return { l1: 'まだ', l2: '確認中', tone: 'unknown' }
  const t = toneOf(c.perYear)
  if (t === 'even') return { l1: 'ほぼ同じ', l2: c.status === 'partial' ? '（わかる分で）' : '', tone: t }
  if (t === 'plus') return { l1: 'この街だと', l2: `年${yenMan(c.perYear)}得`, tone: t }
  return { l1: 'いまの街が', l2: `年${yenMan(-c.perYear)}お得`, tone: t }
}

// 同じ額の街がいくつ並んでいるか（「いちばん上」を付けるかどうか）
export function tiesAtTop(ranked: Comparison[]) {
  if (!ranked.length) return 0
  const top = ranked[0]
  if (top.status === 'unknown') return ranked.length
  return ranked.filter((r) => r.status !== 'unknown' && Math.abs(r.perYear - top.perYear) < 1000).length
}

/* ───────── 次の一歩（結果に合わせて、最大3つ） ───────── */

export interface NextStep {
  text: string
  href?: string
  link?: string
}
export function nextSteps(c: Comparison, others = 0): NextStep[] {
  const s: NextStep[] = []
  const tone = toneOf(c.perYear)
  if (isHit(c) && c.care) s.push({ text: `${c.to.name}の最新の状況を、公式の発表で確かめる`, href: c.care.sources[0]?.url, link: c.care.sources[0]?.label })
  if (c.unknown.length) {
    // どちらの街の数字が分からないかは、説明の書き出しで分かる（例: 「草加市の、この年収帯の…」）
    const whose = [...new Set(c.unknown.map((u) => (u.plain.startsWith(c.from.name) ? c.from.name : c.to.name)))].join('と')
    s.push({ text: `確認中の「${c.unknown.map((u) => u.label).join('・')}」を、${whose}の窓口で聞いてみる` })
  }
  if (c.to.level === 'basic' && c.to.url) s.push({ text: `${c.to.name}の子育ての制度を、公式サイトで見る`, href: c.to.url, link: `${c.to.name}の公式サイト` })
  if (!c.unknown.length && tone === 'even') s.push({ text: '子育ての制度の差はほとんどないので、家賃・通勤・住みごこちで比べてみる' })
  if (c.oneTime > 0) s.push({ text: '移住支援金の条件（対象になる人・申し込みの時期）を、市のページで確かめる' })
  if (tone === 'stay' && c.status !== 'unknown') s.push({ text: `${c.from.name}の子育ての制度を、もれなく使えているか見直す` })
  if (c.items.some((i) => i.key === 'nursery' && i.perYear !== null && Math.abs(i.perYear) >= 1000)) s.push({ text: `${c.to.name}の保育園の空きぐあいを調べる` })
  if (others > 0 && s.length < 3) s.push({ text: '棚にある、ほかのカプセルも開けてみる' })
  if (tone !== 'even' && !isHit(c)) s.push({ text: '家賃や通勤時間も、あわせて比べてみる' })
  return s.slice(0, 3)
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
