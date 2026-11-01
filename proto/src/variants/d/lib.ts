// 案D「家計レシート」 — 画面で使う小さな計算と言葉。数字の計算そのものは @/shared の calc.ts にまかせる。
import { INCOME_BANDS, WORK_STYLES, everyday, yenMan } from '@/shared'
import type { Comparison, FamilyInput, Mood } from '@/shared/types'

export const clone = (f: FamilyInput): FamilyInput => ({ ...f, children: f.children.map((c) => ({ ...c })) })

export const sameInput = (a: FamilyInput, b: FamilyInput) => JSON.stringify(a) === JSON.stringify(b)

/** 差額を「+21.5万円」「−6万円」「±0円」で。万円の丸めは shared の yenMan に合わせる。 */
export function signedMan(v: number) {
  if (Math.abs(v) < 500) return '±0円'
  return `${v > 0 ? '+' : '−'}${yenMan(Math.abs(v))}`
}

/** 年額を「月 約1.8万円」に。差がないときは「差なし」。 */
export function perMonth(v: number) {
  if (Math.abs(v) < 500) return '差なし'
  return everyday(v).month
}

export const ageText = (age: number) => (age < 0 ? 'これから生まれる' : `${age}歳`)
export const ageCard = (age: number) => (age < 0 ? 'もうすぐ' : `${age}歳`)

export const incomeLabel = (id: FamilyInput['income']) => INCOME_BANDS.find((b) => b.id === id)?.label ?? ''
export const workLabel = (id: FamilyInput['work']) => WORK_STYLES.find((w) => w.id === id)?.label ?? ''

export function familyShort(f: FamilyInput) {
  return `大人${f.adults}・子ども${f.children.length}`
}

export function kidsShort(f: FamilyInput) {
  if (!f.children.length) return '子どもなし'
  return f.children.map((c) => `${ageText(c.age)}${c.age <= 2 && c.nursery ? '（保育園）' : ''}`).join('・')
}

/** 比べる期間（年）。calc.ts の compare と同じ決め方。 */
export function periodYears(f: FamilyInput) {
  if (f.years !== 18) return f.years
  return Math.max(1, 18 - Math.min(...f.children.map((c) => Math.max(c.age, 0)), 18))
}

export const periodLabel = (f: FamilyInput) => (f.years === 18 ? `下の子が18歳まで（${periodYears(f)}年）` : `${f.years}年`)

/** FNV-1a。レシート番号とバーコードを、入力からいつも同じ形で作る（21st「Receipt Pricing」の考え方）。 */
function hash(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function receiptNo(f: FamilyInput, cityId: string) {
  return String((hash(JSON.stringify(f) + cityId) % 9000) + 1000)
}

export function bars(seed: string, count: number) {
  let h = hash(seed)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0
    out.push((h % 3) + 1)
  }
  return out
}

/** レシートのすみに赤ペンで書く一言。マイナスは前向きに言い換える。 */
export const MOOD_NOTE: Record<Mood, string> = {
  2: 'ぐっと楽に！',
  1: 'ちょっと楽に',
  0: 'ほぼ同じ',
  [-1]: '今の街、手厚い',
  [-2]: '今の街、かなり手厚い！',
}

/** 卓上POPに2行で書くため、ラベルを読みやすい所で折る。 */
export function splitPop(label: string): [string, string] {
  if (label.length <= 5) return [label, '']
  const marks = ['は', 'が', 'の']
  let best = Math.ceil(label.length / 2)
  let bestGap = 99
  for (let i = 2; i < label.length - 1; i++) {
    if (marks.includes(label[i - 1])) {
      const gap = Math.abs(i - label.length / 2)
      if (gap < bestGap) {
        bestGap = gap
        best = i
      }
    }
  }
  return [label.slice(0, best), label.slice(best)]
}

export interface Step {
  id: string
  title: string
  body: string
}

/** 結果の最後に出す「次の一歩」。計算の結果から、具体的にやることを選ぶ。 */
export function nextSteps(c: Comparison, f: FamilyInput): Step[] {
  const out: Step[] = []
  if (c.unknown.length) {
    out.push({
      id: 'ask',
      title: `${c.to.name}の窓口で「${c.unknown.map((u) => u.label).join('・')}」を聞く`,
      body: '確認中の項目が分かると、合計の行が変わります。電話でも聞けます。',
    })
  }
  const baby = f.children.find((k) => k.age <= 2 && k.nursery)
  if (baby) {
    out.push({
      id: 'nursery',
      title: `${c.to.name}の保育園の空きを聞いておく`,
      body: `${baby.age < 0 ? '生まれたあと' : `${baby.age}歳クラス`}に空きがあるかで、引っ越しの時期が変わります。`,
    })
  }
  if (c.oneTime > 0) {
    out.push({
      id: 'iju',
      title: '移住支援金の条件を読む',
      body: '働き方の条件や、5年以内に転出すると返す決まりがあります。予算に達すると受付が終わります。',
    })
  }
  if (c.perYear <= -10000 && c.from.cash) {
    out.push({
      id: 'stay',
      title: `${c.from.name}の「${c.from.cash.label}」を受け取れているか確かめる`,
      body: '今の街の手厚さを、取りこぼさずに使うのも立派な一歩です。',
    })
  }
  out.push({
    id: 'source',
    title: 'レシートの行をタップして、出典を読む',
    body: '計算の中身と、どこで確かめた数字かが見られます。',
  })
  return out.slice(0, 4)
}

/** 見出しを「、」のあとで区切る（数字と単位が行をまたがないように）。 */
export const phrases = (text: string) => text.split(/(?<=、)/)

export const YEN_HINT = '＋は引っ越すと浮くお金、−は今の街のほうが安く済むお金'
