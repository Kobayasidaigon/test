// 案A「カプセルトイ」 — 見た目のための小さな道具。計算は @/shared の rank / compare をそのまま使う。
import { useCallback, useState } from 'react'
import { yenMan } from '@/shared'
import type { Breakdown, Child, City, Comparison, FamilyInput, Pride } from '@/shared/types'

export type MotifKey = 'job' | 'kettle' | 'senbei' | 'factory' | 'rocket' | 'takoyaki' | 'corn' | 'volcano' | 'drop' | 'house'

// 街ごとのカプセルの色・はんこのインク・はんこの絵柄（絵柄は city.pride の中から選ぶ）
export const CITY_LOOK: Record<string, { capsule: string; ink: string; motif: MotifKey; pride: number }> = {
  adachi: { capsule: '#ffc928', ink: '#c8322a', motif: 'job', pride: 0 },
  kita: { capsule: '#ff8a3d', ink: '#c8322a', motif: 'job', pride: 0 },
  ota: { capsule: '#4cc3e8', ink: '#24489a', motif: 'job', pride: 0 },
  kawaguchi: { capsule: '#9aa6b2', ink: '#3b4a57', motif: 'kettle', pride: 0 },
  soka: { capsule: '#e3a857', ink: '#8a4b2a', motif: 'senbei', pride: 0 },
  kawasaki: { capsule: '#3d7be0', ink: '#24489a', motif: 'factory', pride: 0 },
  sagamihara: { capsule: '#2f4b8f', ink: '#24489a', motif: 'rocket', pride: 0 },
  osaka: { capsule: '#ff7aa2', ink: '#c8322a', motif: 'takoyaki', pride: 1 },
  sapporo: { capsule: '#8fd14f', ink: '#1f7a5a', motif: 'corn', pride: 0 },
  kagoshima: { capsule: '#ff5a36', ink: '#a8321f', motif: 'volcano', pride: 0 },
}
export const lookOf = (city: City) => CITY_LOOK[city.id] ?? { capsule: '#ffc928', ink: '#c8322a', motif: 'house' as MotifKey, pride: 0 }
export const stampLabel = (city: City) => city.pride[lookOf(city).pride]?.label ?? city.pride[0]?.label ?? ''

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
}
const KIND_MOTIF: Record<Pride['kind'], MotifKey> = { food: 'senbei', craft: 'kettle', industry: 'factory', nature: 'volcano', job: 'job', life: 'house' }
export const prideMotif = (p: Pride): MotifKey => PRIDE_MOTIF[p.label] ?? KIND_MOTIF[p.kind]

// 家族の言い方
export const childLabel = (c: Child) => (c.age < 0 ? 'これから' : `${c.age}歳`)
export const familySummary = (f: FamilyInput) =>
  `大人${f.adults}人・子ども${f.children.length}人` + (f.children.length ? `（${f.children.map(childLabel).join('・')}）` : '')
export const yearsActual = (f: FamilyInput) =>
  f.years === 18 ? Math.max(1, 18 - Math.min(...f.children.map((c) => Math.max(c.age, 0)), 18)) : f.years
export const yearsLabel = (f: FamilyInput) => (f.years === 18 ? `下の子が18歳まで（${yearsActual(f)}年）` : `${f.years}年`)

// 差の向き。1万円未満は「ほぼ同じ」
export type Tone = 'plus' | 'stay' | 'even'
export const toneOf = (perYear: number): Tone => (Math.abs(perYear) < 10000 ? 'even' : perYear > 0 ? 'plus' : 'stay')
export const TONE_INK: Record<Tone, string> = { plus: 'var(--plus)', stay: 'var(--stay)', even: 'var(--ink-soft)' }
export const TONE_BG: Record<Tone, string> = { plus: 'var(--plus-bg)', stay: 'var(--stay-bg)', even: 'var(--paper-2)' }
// 「万円」の数字だけ（yenMan と同じ丸め）
export const manNumber = (yen: number) => {
  const v = Math.abs(yen) / 10000
  return v >= 100 ? Math.round(v) : Math.round(v * 10) / 10
}

// 項目ごとの金額の言い方
export function itemAmount(i: Breakdown, c: Comparison): { tone: Tone | 'unknown' | 'once'; text: string } {
  if (i.oneTime) return { tone: 'once', text: `一度だけ 約${yenMan(i.total ?? 0, 0)}` }
  if (i.perYear === null) return { tone: 'unknown', text: '確認中' }
  if (Math.abs(i.perYear) < 1000) return { tone: 'even', text: '差はなし' }
  return i.perYear > 0
    ? { tone: 'plus', text: `${c.to.name}だと 年 約${yenMan(i.perYear)} 得` }
    : { tone: 'stay', text: `${c.from.name}のままが 年 約${yenMan(-i.perYear)} お得` }
}

// 棚のカプセルにそえる短い一言
export function shelfLine(c: Comparison): [string, string] {
  const t = toneOf(c.perYear)
  if (t === 'even') return ['ほぼ同じ', '']
  if (t === 'plus') return ['年 約' + yenMan(c.perYear), '得']
  return ['いまの街のままが', `年 約${yenMan(-c.perYear)} お得`]
}

// 次の一歩（結果に合わせて、最大3つ）
export function nextSteps(c: Comparison): string[] {
  const s: string[] = []
  if (c.unknown.length) s.push(`確認中の「${c.unknown.map((u) => u.label).join('・')}」を、${c.to.name}の窓口で聞いてみる`)
  if (c.oneTime > 0) s.push('移住支援金の条件（対象になる人・申し込みの時期）を、市のページで確かめる')
  if (toneOf(c.perYear) === 'stay') s.push(`${c.from.name}の子育ての制度を、もれなく使えているか見直す`)
  if (c.items.some((i) => i.key === 'nursery' && i.perYear !== null && Math.abs(i.perYear) >= 1000)) s.push(`${c.to.name}の保育園の空きぐあいを調べる`)
  s.push('家賃や通勤時間も、あわせて比べてみる')
  return s.slice(0, 3)
}

// 決まった乱数（絵のゆらぎ用。結果には使わない）
export function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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
  const add = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        localStorage.setItem(BOOK_KEY, JSON.stringify(next))
      } catch {
        /* 保存できなくても画面は動く */
      }
      return next
    })
  }, [])
  return { ids, add }
}
