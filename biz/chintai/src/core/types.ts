// みつもり点検の、データの型。画面（React）には依存しない。
//
// 言葉の決めごと:
// - 「項目（ItemDef）」… 道具があらかじめ知っている費用の種類（敷金、仲介手数料 など）。
// - 「行（EstimateLine）」… 利用者が入れた、見積書の1行。どの項目にあたるか（itemId）と金額を持つ。
// - 「点検の結果（Finding）」… 1行についての判定。断定はしない（「確かめる項目です」の形で言う）。

import type { SourceId } from './sources'

/** 金額（円、整数）。 */
export type Yen = number

/** 日付。'2027-03-20' の形の文字列。時刻と時差を持たせないために、Date ではなく文字列で持つ。 */
export type DateString = string

// ---------------------------------------------------------------------------
// 区分
// ---------------------------------------------------------------------------

/**
 * 区分。仕様書の7つに、利用者が自由に足した項目のための 'other' を加えた8つ。
 * 色だけで見分けなくて済むように、区分には必ず言葉（label）と印（mark）がある。
 */
export type CategoryId =
  | 'usual' // ふつうはかかる
  | 'capped' // 上限の決まりがある
  | 'optional' // 必須か任意か、確かめる
  | 'choosable' // 自分で選べることがある
  | 'who-pays' // だれが負担するか、確かめる
  | 'overlap' // 重なっていないか、確かめる
  | 'contract' // 契約書で確かめる
  | 'other' // 一覧にない項目（何のお金か、確かめる）

export type Category = {
  id: CategoryId
  /** 区分の名前。画面にそのまま出す。 */
  label: string
  /** 印（1文字）。赤ペンの丸の中に入れるなど、色が見えなくても区分がわかるようにする。 */
  mark: string
  /** 一覧に出す、短い説明。 */
  short: string
  /** 区分の説明（LP の「何がわかるか」など）。 */
  description: string
  /**
   * 赤ペンを入れる区分か。
   * 'calm' ＝ ふつうはかかる（計算だけ見る）。'check' ＝ 確かめる項目。
   */
  attention: 'calm' | 'check'
}

// ---------------------------------------------------------------------------
// 根拠
// ---------------------------------------------------------------------------

/** 根拠の1つ。事実を書いた文と、その出典。出典のない文は、根拠に入れない。 */
export type BasisNote = {
  text: string
  sourceIds: SourceId[]
}

/**
 * 根拠の状態。
 * - 'verified' … 一次情報で確かめた事実がある（basis に入っている）。
 * - 'none-found' … 探したが、公的な決まりは見つからなかった。「必須かどうかを聞いてみましょう」の扱い。
 * - 'not-needed' … 計算を見るだけの項目で、根拠を出さない（日割り家賃 など）。
 */
export type BasisStatus = 'verified' | 'none-found' | 'not-needed'

// ---------------------------------------------------------------------------
// 項目
// ---------------------------------------------------------------------------

/**
 * 合計への入り方。
 * - 'add' … 初期費用として足す。
 * - 'subtract' … 見積書で引かれている金額（フリーレント、値引き）。合計から引く。
 * - 'exclude' … 初期費用ではない（更新料、短期解約の違約金 など）。合計に入れない。
 */
export type TotalRole = 'add' | 'subtract' | 'exclude'

/** 確認の文面の部品。メール用と LINE 用。 */
export type AskParts = {
  /** メール用（ていねいな文）。項目の見出しの下に置く文。 */
  mail: string
  /** LINE 用（短い文）。 */
  line: string
}

/** 項目ごとの解説ページ（/items/<slug>）の中身。 */
export type ItemGuide = {
  /** URL に使う名前（英小文字とハイフン）。 */
  slug: string
  /** ページの見出し。 */
  title: string
  /** 検索結果に出る説明文。 */
  description: string
  /** 冒頭の文。 */
  lead: string
  /** 「何のお金か」をくわしく書いた段落。 */
  what: string[]
  /** 「確かめること」を、1つずつくわしく書いたもの。 */
  points: { title: string; body: string }[]
}

export type ItemDef = {
  id: string
  /** 項目の名前。 */
  name: string
  /** 見積書での、ほかの書かれ方（画面に出す。検索にも使う）。 */
  aliases: string[]
  /** 検索のためだけの言葉（読みがな など。画面には出さない）。 */
  keywords: string[]
  /** 何のお金か（ひとこと）。 */
  summary: string
  /** なぜこの区分に入れているのか（点検の結果に出す、ひとことの理由）。 */
  why: string
  category: CategoryId
  totalRole: TotalRole
  /** 確かめること。 */
  checks: string[]
  basisStatus: BasisStatus
  /** 根拠（一次情報で確かめた事実だけ）。 */
  basis: BasisNote[]
  /** 参考（決まりではないが、公的な機関が出している案内や相談の例）。 */
  related: BasisNote[]
  /** この道具が確かめられなかったこと（正直に書く）。 */
  limits: string[]
  /** 添えること（契約書の特約や物件の条件で、外せないこともある、など）。 */
  caveat: string
  /** 確かめるときの聞き方（ひとこと）。 */
  howToAsk: string
  /** 確認の文面の部品。 */
  ask: AskParts
  /** 「もし全部外せた場合の差」に入れるか（必須か任意かを確かめる項目など）。 */
  askRemovable: boolean
  /** 金額の欄に添える、入れ方の説明（あるときだけ）。 */
  amountHint?: string
  /** 一緒に見積書にあるとき、重なっていないかを確かめる相手の項目。 */
  overlapsWith?: { itemId: string; text: string }[]
  /** 解説ページがある項目だけ。 */
  guide?: ItemGuide
}

// ---------------------------------------------------------------------------
// 見積書（利用者が入れる内容）
// ---------------------------------------------------------------------------

export type EstimateLine = {
  /** 行のID（見積書の中で重ならない）。 */
  id: string
  /** どの項目にあたるか（ItemDef.id）。一覧にない項目は 'other'。 */
  itemId: string
  /** 見積書に書かれていた名前。空なら、項目の名前を使う。'other' のときは、これが名前になる。 */
  label: string
  /** 金額（円、税込）。まだ入れていなければ null。 */
  amount: Yen | null
}

export type Estimate = {
  /** 家賃（月額、円）。管理費・共益費を含めない。 */
  rent: Yen | null
  /** 管理費・共益費（月額、円）。ないときは 0、まだ入れていなければ null。 */
  commonFee: Yen | null
  /** 入居する日。 */
  moveInDate: DateString | null
  /** 見積書に書かれている合計（入れた人だけ。入力の合計と比べる）。 */
  statedTotal: Yen | null
  lines: EstimateLine[]
}

/** 確認の文面の設定。 */
export type MessageSettings = {
  /** 送る人の名前（入れた人だけ、文面に差し込む）。 */
  senderName: string
  /** 物件の名前（入れた人だけ、文面に差し込む）。 */
  propertyName: string
  /**
   * 文面に入れる行のID。
   * null は「まだ選んでいない」。そのときは、確かめる項目（Finding.askDefault）を全部入れる。
   */
  lineIds: string[] | null
}

/** 道具の画面が持つ内容のすべて。これを保存し、ファイルに書き出す。 */
export type AppData = {
  estimate: Estimate
  message: MessageSettings
}

// ---------------------------------------------------------------------------
// 点検の結果
// ---------------------------------------------------------------------------

/**
 * 判定の強さ。赤ペンの入れ方を決める。
 * - 'ok' … 気になる点は見つからなかった（印なし、またはチェックの印）。
 * - 'note' … メモ（金額や家賃が未入力で、計算できない など）。
 * - 'check' … 確かめる項目（赤ペンの丸）。
 * - 'alert' … 上限の決まりを超えている可能性がある など（赤ペンの二重丸・下線）。
 */
export type FindingLevel = 'ok' | 'note' | 'check' | 'alert'

/** 仲介手数料の計算の内訳。 */
export type BrokerageCalc = {
  kind: 'brokerage'
  /**
   * - 'no-rent' … 家賃が未入力で計算できない。
   * - 'no-amount' … 金額が未入力（上限の目安だけ出す）。
   * - 'within-half' … 家賃の0.5か月分＋消費税 以内。
   * - 'within-full' … 0.5か月分＋消費税を超えているが、1か月分＋消費税 以内。
   * - 'over-full' … 1か月分＋消費税を超えている。
   */
  status: 'no-rent' | 'no-amount' | 'within-half' | 'within-full' | 'over-full'
  rent: Yen | null
  /** 家賃 × 0.55（円未満は切り捨て）。 */
  halfCap: Yen | null
  /** 家賃 × 1.1（円未満は切り捨て）。 */
  fullCap: Yen | null
  /** 見積もりの額 − halfCap（超えていなければ 0）。 */
  overHalf: Yen
  /** 見積もりの額 − fullCap（超えていなければ 0）。 */
  overFull: Yen
  /** 上限との差が1円未満で、端数の処理の違いとみなしたか。 */
  roundingOnly: boolean
  /**
   * 家賃に管理費・共益費を足した額をもとにした計算と、同じ額か。
   * 'half' ＝（家賃＋管理費）× 0.55、'full' ＝（家賃＋管理費）× 1.1 と同じ。上限を超えているときだけ調べる。
   */
  rentPlusFeeMatch: 'half' | 'full' | null
}

/** 日割り家賃の計算の内訳。 */
export type ProrationCalc = {
  kind: 'proration'
  /**
   * - 'no-basis' … 家賃か入居する日が未入力で、目安を出せない。
   * - 'no-amount' … 金額が未入力（目安だけ出す）。
   * - 'ok' … 目安の幅に入っている。
   * - 'high' … 目安より多い。
   * - 'low' … 目安より少ない。
   */
  status: 'no-basis' | 'no-amount' | 'ok' | 'high' | 'low'
  /** その月の日数。 */
  daysInMonth: number | null
  /** 入居する日から月の終わりまでの日数（入居する日を含む）。 */
  days: number | null
  /** 家賃だけを、その月の日数で割った目安。 */
  estimateRentOnly: Yen | null
  /** 家賃＋管理費を、その月の日数で割った目安（管理費が 0 か未入力なら null）。 */
  estimateWithFee: Yen | null
  /** 数え方の違い（月の日数・30日・31日で割る、管理費を含める・含めない）を見込んだ幅の下。 */
  low: Yen | null
  /** 同じく、幅の上。 */
  high: Yen | null
  /** 「大きく違う」とみなす差（家賃の1日分）。 */
  tolerance: Yen | null
  /** 金額が合った計算のもと。'fee' は、管理費だけの日割りとして合った場合。 */
  matched: 'rent' | 'fee' | null
}

/** 月額と比べた結果（敷金、礼金、前家賃、管理費、保証料）。高い安いの判定ではなく、計算の事実だけ。 */
export type MonthsCalc = {
  kind: 'months'
  /** 何と比べたか。 */
  base: 'rent' | 'rent+fee' | 'fee'
  baseAmount: Yen
  /** 金額 ÷ baseAmount（小数第2位まで）。 */
  months: number
}

export type FindingCalc = BrokerageCalc | ProrationCalc | MonthsCalc

/** 根拠を、出典の中身ごと取り出した形（画面でそのまま使える）。 */
export type ResolvedBasis = {
  text: string
  sources: import('./sources').Source[]
}

export type Finding = {
  lineId: string
  itemId: string
  /** 表示する名前（見積書の名前があればそれ、なければ項目の名前）。 */
  label: string
  /** 項目の名前（label と違うときに、「○○として点検」と添えるため）。 */
  itemName: string
  amount: Yen | null
  category: CategoryId
  level: FindingLevel
  /** ひとことの判定。断定しない。 */
  headline: string
  /** なぜそう言うのか（計算の結果、決まりが見つからなかったこと など）。 */
  reasons: string[]
  /** 確かめること。 */
  checks: string[]
  /** 計算の内訳（あるときだけ）。 */
  calc: FindingCalc | null
  basisStatus: BasisStatus
  /** 根拠（出典つき）。 */
  basis: ResolvedBasis[]
  /** 参考（公的な機関の案内や、相談の例）。 */
  related: ResolvedBasis[]
  /** この道具が確かめられなかったこと。 */
  limits: string[]
  /** 添えること。 */
  caveat: string
  /** 確かめるときの聞き方。 */
  howToAsk: string
  /** 確認の文面の部品（この行の状態に合わせたもの）。 */
  ask: AskParts
  /** はじめから確認の文面に入れておくか（確かめる項目なら true）。 */
  askDefault: boolean
  /** 「もし全部外せた場合の差」に入っているか。 */
  countsTowardAskTotal: boolean
  /** 合計への入り方。 */
  totalRole: TotalRole
}

export type CategorySubtotal = {
  category: CategoryId
  /** この区分の行の数。 */
  count: number
  /** 小計（'subtract' の行は引き、'exclude' の行は入れない）。 */
  subtotal: Yen
}

export type InspectionNote = {
  /** 何についての気づきか。 */
  kind: 'no-lines' | 'no-rent' | 'no-move-in-date' | 'missing-amount' | 'stated-total-diff' | 'stated-total-match'
  text: string
}

export type Inspection = {
  /** 行ごとの結果（見積書の行の順）。 */
  findings: Finding[]
  /** 初期費用の合計（'add' を足し、'subtract' を引く。金額が未入力の行と 'exclude' は入れない）。 */
  total: Yen
  /** 区分ごとの小計（決まった順。行のある区分だけ）。 */
  byCategory: CategorySubtotal[]
  /** 合計に入れていない項目（更新料 など）の金額の合計。 */
  excludedTotal: Yen
  /** 「もし全部外せた場合の差」。必須か任意かを確かめる項目などの金額の合計。 */
  askTotal: Yen
  /** その項目の数。 */
  askCount: number
  /** 確かめる項目の数（level が 'check' か 'alert'）。 */
  attentionCount: number
  /** 金額が未入力の行の数。 */
  missingAmountCount: number
  /** 見積書に書かれた合計との差（入力の合計 − 書かれた合計）。書かれた合計が未入力なら null。 */
  statedTotalDiff: Yen | null
  /** 見積書全体についての気づき。 */
  notes: InspectionNote[]
}
