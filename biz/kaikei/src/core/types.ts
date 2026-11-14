// ひきつぎ会計のデータの形。
// 1つの団体の、すべての年度が入った「帳簿（Book）」を、そのまま1つのファイル（ひきつぎファイル）にする。
// 画面（React）にも保存先（localStorage、ファイル）にも依存しない、ただの値として扱う。

/** ひきつぎファイルの目印。ほかのサービスのファイルと取りちがえないために入れる。 */
export const FILE_FORMAT = 'hikitsugi-kaikei'
/** 保存の形式の版。形を変えたら上げて、validate.ts の移行の表に古い版からの直し方を足す。 */
export const FILE_VERSION = 1

/** 金額。1円単位の整数だけを扱う（小数は入力のところで断る）。 */
export type Yen = number
/** 日付。'2026-04-01' の形の文字列。文字列のまま大小を比べられる。 */
export type DateString = string

export type OrgKind = 'chonaikai' | 'kodomokai' | 'pta' | 'circle' | 'other'
export type Side = 'income' | 'expense'
/** 収入／支出／置き場所の間の移動（預け入れ・引き出し） */
export type TransactionKind = 'income' | 'expense' | 'transfer'
export type AccountKind = 'cash' | 'bank'
/** 決算書の「差」の向き。団体によって逆なので選べるようにしてある。 */
export type DiffStyle = 'actual-minus-budget' | 'budget-minus-actual'

/** お金の置き場所（現金、預金口座）。 */
export type Account = {
  id: string
  kind: AccountKind
  name: string
  /** 年度はじめの残高 */
  openingBalance: Yen
}

/** 科目。並び順は、配列の中の順番で持つ。 */
export type Category = {
  id: string
  side: Side
  name: string
  /** 予算額 */
  budget: Yen
  /** 決算書の「説明」の欄に出す文 */
  note: string
}

/** 取引。 */
export type Transaction = {
  id: string
  date: DateString
  kind: TransactionKind
  /** 科目。移動のときは null */
  categoryId: string | null
  /** 摘要（内容） */
  description: string
  /** 金額。必ず 1 以上の整数 */
  amount: Yen
  /** 置き場所。収入なら入った先、支出なら出した元、移動なら出した元 */
  accountId: string
  /** 移動の入れ先。収入と支出では null */
  toAccountId: string | null
  /** 領収書の番号。空でもよい */
  receiptNo: string
}

/** 役員の名前（署名欄に使う。空でもよい）。年度ごとに持つ。 */
export type Officers = {
  president: string
  treasurer: string
  /** 監査をする人。1〜3人。署名欄の数にもなる */
  auditors: string[]
}

/** 役の呼び名（「会長」「代表」など）。団体によって違うので変えられる。 */
export type RoleNames = {
  president: string
  treasurer: string
  auditor: string
}

/** 残高の照合の記録。「この日に数えたら、実際はいくらだったか」。 */
export type Reconciliation = {
  date: DateString
  actual: Yen
}

/** 会計監査報告書。 */
export type Audit = {
  /** 本文。{年度} {期間} {団体名} は、資料を作るときに置きかわる */
  text: string
  /** 監査の日。まだなら空 */
  date: DateString | ''
}

/** 引き継ぎ書: 通帳・はんこ・帳簿などの保管場所と、渡したかどうか。 */
export type CustodyItem = {
  id: string
  label: string
  place: string
  handedOver: boolean
}

/** 引き継ぎ書: まだ払っていないもの・まだもらっていないもの。 */
export type PendingItem = {
  id: string
  description: string
  /** 金額がまだ決まっていなければ null */
  amount: Yen | null
}

/** 引き継ぎ書: 備品。 */
export type EquipmentItem = {
  id: string
  name: string
  /** 数（「2張」「1台」のように書けるよう、文字にしてある） */
  quantity: string
  place: string
}

export type Handover = {
  /** 引き継ぎをした日。まだなら空 */
  date: DateString | ''
  /** 次の担当の名前 */
  successor: string
  custody: CustodyItem[]
  unpaid: PendingItem[]
  unreceived: PendingItem[]
  equipment: EquipmentItem[]
  /** 次の担当へのメモ */
  memo: string
}

/** 1つの会計年度。 */
export type FiscalYear = {
  id: string
  /** 呼び名（「令和8年度」など） */
  label: string
  startDate: DateString
  endDate: DateString
  officers: Officers
  /** 現金が1つ、預金口座が0〜3つ。現金が先頭 */
  accounts: Account[]
  categories: Category[]
  /** 入れた順に並ぶ。日付の順に見るときは calc.ts の sortedTransactions を使う */
  transactions: Transaction[]
  /** 決算書の「前年度繰越金」の予算額。null なら決算額と同じにする */
  carryoverBudget: Yen | null
  /** 置き場所の id → 照合の記録 */
  reconciliations: Record<string, Reconciliation>
  /** 資料の作成日。空なら画面の側で今日の日付を出す */
  reportDate: DateString | ''
  audit: Audit
  /** 科目の id → 次年度の予算案。入れていない科目は、今年度の予算をそのまま使う */
  nextBudget: Record<string, Yen>
  handover: Handover
}

/** 帳簿。1つの団体の、すべての年度。 */
export type Book = {
  orgName: string
  orgKind: OrgKind
  roleNames: RoleNames
  diffStyle: DiffStyle
  /** 有料版のライセンスキー。団体のものなので、ファイルと一緒に次の担当へ渡る。なければ空 */
  licenseKey: string
  /** 古い順。最後の1つだけが書きかえられる（それより前は読むだけ） */
  years: FiscalYear[]
  /** 変更の回数。変えるたびに1つ増える。「最後に保存してから◯件の変更」に使う */
  revision: number
}

/** ひきつぎファイルの形。 */
export type BookFile = {
  format: typeof FILE_FORMAT
  version: number
  /** 保存した日時（ISO 8601） */
  savedAt: string
  book: Book
}

/** 大きさの上限。壊れたファイルや、まちがって選んだ大きなファイルで画面が固まらないようにする。 */
export const LIMITS = {
  /** 1つの金額の上限。合計しても整数として正確に扱える範囲に収まる */
  maxAmount: 999_999_999,
  maxYears: 60,
  maxTransactionsPerYear: 5000,
  maxCategoriesPerSide: 40,
  maxBankAccounts: 3,
  maxAuditors: 3,
  maxListItems: 100,
  nameLength: 60,
  descriptionLength: 100,
  noteLength: 200,
  receiptNoLength: 20,
  textLength: 4000,
  idLength: 40,
  /**
   * ひきつぎファイルの大きさの上限（バイト）。写真や動画をまちがえて選んだときに、画面が固まらないようにする。
   * 年300件の団体なら1年ぶんで数十KBなので、何十年ぶん入れても届かない大きさにしてある
   */
  maxFileBytes: 30_000_000,
} as const

/** うまくいかなかったときの返し方。message は、そのまま画面に出せる文にする。 */
export type Fail = {
  ok: false
  /** 何が起きたかの短い名前。テストと、画面での出し分けに使う */
  code: string
  message: string
  /** どの入力欄のことか（わかるときだけ） */
  field?: string
}
export type Result<T> = { ok: true; value: T } | Fail

export function fail(code: string, message: string, field?: string): Fail {
  return field === undefined ? { ok: false, code, message } : { ok: false, code, message, field }
}

/** 知らせること（入れることはできるが、確かめてほしいこと）。 */
export type Notice = {
  code: string
  message: string
  field?: string
  /** 関係する取引 */
  transactionIds?: string[]
  /** 関係する置き場所 */
  accountId?: string
}

/** id を作る関数。テストとサンプルでは、毎回同じ id になるものを渡す。 */
export type IdMaker = () => string
