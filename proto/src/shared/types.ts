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

export type Region = 'tokyo23' | 'tokyo' | 'saitama' | 'kanagawa' | 'chiba' | 'osaka' | 'chiho'

// どこまで調べた街か。
//   detailed = 市区町村の制度まで調べた「くわしい街」（保育料の月額の表があるのは、この中の一部）
//   pref     = 都道府県や市区町村の子育ての制度（保育料の無償化・中学校の給食費・現金の給付）が一部わかる街（月額の表はない）
//   basic    = 国の全国調査（待機児童・子ども医療費・家賃）だけ分かる街。家賃は集計のある市町村だけ。子育ての制度は準備中
//              （移住支援金は23区から移る家族にしか関係しないので、移住支援金だけ分かる街も basic）
export type DataLevel = 'detailed' | 'pref' | 'basic'

// 災害などへの配慮。hit = 被災した市町村（順位と悲しい演出を出さない）、area = 被災した地域を含む県
export interface Care { level: 'hit' | 'area'; note: string; sources: Source[] }

// 保育料の「2人目」「3人目」の数え方。
//   together  … 保育園・幼稚園などに同時に通う就学前の子だけを、年上から数える（国の基準）
//   household … 生計が同じ子を、年齢や園に通っているかを問わず、年上から数える（上の子が小学生でも2人目になる）
export type SiblingCount = 'together' | 'household'

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
  level: DataLevel
  code?: string        // 地方公共団体コード（6けた）
  kana?: string
  lat?: number
  lng?: number
  url?: string         // 公式サイト
  phrase?: string      // 街のキャッチフレーズ（localgovjp より）
  care?: Care
  // 借家の家賃の平均（令和5年住宅・土地統計調査。いま住んでいる世帯が払っている額で、募集家賃より低めに出やすい）
  rent?: { family: number | null; all: number | null; note: string; source: Source }
  // 待機児童の数（こども家庭庁の全国の取りまとめ）。家賃と同じ「暮らしの目安」で、お金の差には入れない
  waitlist?: { count: number; asOf: string; note: string; confidence: Confidence; source: Source }
  // 0〜2歳の保育料（認可保育所・保育標準時間・第1子の月額）。3〜5歳は国の無償化で0円。
  // 国の基準（同時に通う子で数えて2人目は半額、3人目以降は0円）は、どの街にも当てはまるものとして計算で足す
  nursery: {
    firstChildFree: boolean          // 0〜2歳の第1子から無料（所得の条件なし）
    firstFreeUnder?: number          // 第1子の無料に所得の条件があるとき、世帯年収の目安（万円）。この額をまたぐ年収帯は確認中、上の年収帯は対象外
    firstFreeUnsure?: boolean        // 第1子の無料に所得の条件があるか確かめていない。firstFreeUnder は目安で、この額をまたぐ年収帯・上の年収帯は確認中
    secondChild: 'free' | 'half'     // 2人目（数え方は secondCount）
    secondFreeUnder?: number         // 2人目の無料に所得の条件があるとき（firstFreeUnder と同じ読み方）
    secondFreeUnsure?: boolean       // 2人目の無料に所得の条件があるか確かめていない（firstFreeUnsure と同じ読み方）
    secondOnly?: boolean             // 2人目だけが対象の制度（3人目以降は国の基準）
    thirdChild: 'free' | 'half'      // 3人目以降（数え方は thirdCount）
    thirdFreeUnder?: number          // 3人目以降の無料（国の基準より広い数え方の分）に所得の条件があるとき。上の年収帯は国の基準（同時に通う3人目は0円）
    thirdFreeUnsure?: boolean        // 3人目以降の無料に所得の条件があるか確かめていない
    secondCount?: SiblingCount       // 2人目の数え方。書いていなければ together（国の基準）
    thirdCount?: SiblingCount        // 3人目の数え方。書いていなければ together（国の基準）
    countConfidence?: Confidence     // 数え方の確からしさ（書いていなければ confidence と同じ。民間サイトの解説だけなら 推定）
    freeFromAge?: number             // この年齢（歳児クラス）からは第1子も0円（例: 2歳児の保育料が無料の町）
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
  // 中学校の給食費が無料か（null は確認中。前は無料だったが今年度も続いているか分からない街も null にして、note に書く）
  lunch: { juniorHighFree: boolean | null; confidence: Confidence; note?: string; sources: Source[] }
  // 移住支援金（23区から移る家族が対象）。familyUpTo・perChildUpTo は「最大」の額（市町村の要綱でもっと少ないことがある）
  // perChildUnknown は、子どもの加算の額が分からない（perChild は国の上限）。このときは加算を額に足さず「確認中」と出す
  // single は単身の額（分かっている街だけ。ないときは国の上限の最大60万円で計算）
  iju?: { family: number; perChild: number; single?: number; familyUpTo?: boolean; perChildUpTo?: boolean; perChildUnknown?: boolean; note: string; confidence: Confidence; sources: Source[] }
  // 移住支援金を調べた結果（iju がない街だけ）。none = 調べて実施していないと分かった、part = 一部の地域だけ対象（額は合計に入れない）、
  // unknown = 東京圏の条件不利地域（移住先になりうる街）で、実施しているか分からない（画面は「準備中」）。
  // 東京圏の外の街で iju も ijuCheck もないときも「まだ調べていない」（画面は「準備中」と出す。「ない」とは言わない）。
  // 東京圏の条件不利地域でない街（決まりの上で移住先にならない）は、iju も ijuCheck も持たない
  ijuCheck?: { result: 'none' | 'part' | 'unknown'; note: string; confidence: Confidence; sources: Source[] }
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
  upTo?: boolean                // 額が「最大」の見込み（移住支援金の加算が市町村で違うときなど）
  pendingPart?: string          // 額に足していない、確認中の部分（例: 子どもの加算）。画面は「＋子どもの加算（確認中）」と出す
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
  status: 'ok' | 'partial' | 'unknown'  // ok = 全部わかる、partial = 確認中の項目がある、unknown = わかる差が1つもない
  perYearLabel: string          // 例: 1年あたり（5年の平均）
  excluded: string              // 合計に入っていないもの（確認中の項目、家賃、通勤費、税金など）
  care?: Care
  distanceKm?: number           // 今の街からの直線距離
  // 暮らしのお金の目安（家賃）。毎年の差（perYear）には入れない。to − from（プラスなら候補の街のほうが高い）
  rent?: { from: number | null; to: number | null; diffMonthly: number | null; note: string; source: Source }
  // 暮らしの目安（待機児童の数）。お金の差には入れない。null はその街の数が分からない
  waitlist?: { from: number | null; to: number | null; asOf: string; note: string; source: Source }
}
