// 住む街ガチャ — 共通の型。4つのデザイン案はすべてこの型と calc.ts を使う。

export type Confidence = '確認済' | '推定' | '仮置き'
export interface Source { label: string; url: string }

export type IncomeBand = 'u400' | '400_600' | '600_800' | '800_1000' | 'o1000'
export const INCOME_BANDS: { id: IncomeBand; label: string; mid: number }[] = [
  { id: 'u400', label: '400万円未満', mid: 350 },
  { id: '400_600', label: '400〜600万円', mid: 500 },
  { id: '600_800', label: '600〜800万円', mid: 700 },
  { id: '800_1000', label: '800〜1,000万円', mid: 900 },
  { id: 'o1000', label: '1,000万円以上', mid: 1100 },
]

export type WorkStyle = 'commute' | 'remote' | 'self' | 'part'
export const WORK_STYLES: { id: WorkStyle; label: string; hint: string }[] = [
  { id: 'commute', label: '通勤する会社員', hint: '今の勤め先に通える範囲で探す' },
  { id: 'remote', label: 'リモートで働く', hint: '全国から探せる' },
  { id: 'self', label: '自営・フリーランス', hint: '全国から探せる' },
  { id: 'part', label: 'パート・時短', hint: '今の街の近くで探す' },
]

export interface Child {
  id: string
  age: number          // 今の年齢。生まれる予定の子は -1
  nursery: boolean     // 0〜2歳で保育園に通う（通う予定）か
}

export interface FamilyInput {
  adults: 1 | 2
  children: Child[]
  income: IncomeBand
  work: WorkStyle
  fromCityId: string
  years: 1 | 5 | 18    // 比べる期間。18 は「下の子が18歳になるまで」
}

export type Region = 'tokyo23' | 'saitama' | 'kanagawa' | 'chiba' | 'osaka' | 'chiho'

export interface Pride {
  label: string        // バッジに出す短い名前（例: 草加せんべい）
  kind: 'food' | 'craft' | 'industry' | 'nature' | 'job' | 'life'
  fact: string         // 噛み砕いた一言
  confidence: Confidence
  source?: Source
}

export interface City {
  id: string
  pref: string
  name: string
  region: Region
  metro: 'shutoken' | 'kansai' | 'other'
  // 0〜2歳の保育料（認可保育所・保育標準時間・第1子の月額）。3〜5歳は国の無償化で0円。
  nursery: {
    firstChildFree: boolean          // 0〜2歳の第1子から無料
    secondChild: 'free' | 'half'     // 同時に通う2人目
    thirdChild: 'free' | 'half'
    monthly: Partial<Record<IncomeBand, [number, number]>>  // 第1子の月額の幅（見つからない所得帯は未確認）
    fiscalYear: string
    confidence: Confidence
    note?: string
    sources: Source[]
  }
  // 毎月の現金給付（東京都の018サポートなど）
  cash?: { label: string; perChildYearly: number; maxAge: number; confidence: Confidence; sources: Source[] }
  // 子ども医療費（通院）の対象：何歳の年度末まで
  medical: { coversTo: number | null; note: string; confidence: Confidence; sources: Source[] }
  // 中学校の給食費が無料か
  lunch: { juniorHighFree: boolean | null; confidence: Confidence; note?: string; sources: Source[] }
  // 移住支援金（23区から移る家族が対象）
  iju?: { family: number; perChild: number; note: string; confidence: Confidence; sources: Source[] }
  pride: Pride[]
}

export type ItemKey = 'nursery' | 'cash' | 'lunch' | 'medical' | 'iju'

export interface Breakdown {
  key: ItemKey
  label: string                 // 例: 0〜2歳の保育料
  icon: string                  // デザイン側で絵を選ぶためのキー
  perYear: number | null        // 1年あたりの差（候補の街 − 今の街。得ならプラス）。未確認なら null
  total: number | null          // 期間の合計
  oneTime: boolean              // 一度きりのお金か
  confidence: Confidence
  who: string                   // 関係する家族（例: 1歳の子）
  plain: string                 // 噛み砕いた説明（1〜2文）
  detail: string                // 計算の中身
  sources: Source[]
}

export type Mood = -2 | -1 | 0 | 1 | 2

export interface Comparison {
  from: City
  to: City
  years: number
  perYear: number               // 毎年の差の平均（一度きりと未確認を除く）
  total: number                 // 期間の合計（一度きりを除く）
  oneTime: number               // 一度きりのお金（移住支援金など）
  items: Breakdown[]
  unknown: Breakdown[]          // 未確認で合計に入れなかった項目
  mood: Mood
  headline: string              // 例: 草加市なら、年 約50万円 得
  subline: string               // 例: 1歳の子の保育料の差がいちばん大きい
}
