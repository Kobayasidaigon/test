// 集計と判定。すべて、帳簿（Book）や年度（FiscalYear）を受け取って結果を返すだけの関数。
// 守ること:
//   年度はじめの残高 ＋ 収入 − 支出 ＝ 年度末の残高
//   置き場所ごとの残高の合計 ＝ 決算書の次年度繰越金
//   置き場所の間の移動は、収入にも支出にも入れない
import { formatMonthDay, formatWareki, isWithin } from './dates'
import { formatYen } from './money'
import type {
  Account,
  AccountKind,
  Book,
  Category,
  DateString,
  DiffStyle,
  FiscalYear,
  Notice,
  Side,
  Transaction,
  TransactionKind,
  Yen,
} from './types'

// ---- 年度をさがす ----

export function findYear(book: Book, yearId: string): FiscalYear | undefined {
  return book.years.find((y) => y.id === yearId)
}

/** いちばん新しい年度（いま入力している年度）。 */
export function latestYear(book: Book): FiscalYear {
  return book.years[book.years.length - 1]
}

/** 1つ前の年度。最初の年度なら undefined。 */
export function previousYear(book: Book, yearId: string): FiscalYear | undefined {
  const i = book.years.findIndex((y) => y.id === yearId)
  return i > 0 ? book.years[i - 1] : undefined
}

/**
 * 読むだけの年度か。いちばん新しい年度のほかは、すべて読むだけ。
 * 「閉じた」という印をデータに持たせず、並びから決める。印と並びが食いちがったデータを作れないようにするため。
 */
export function isYearLocked(book: Book, yearId: string): boolean {
  const last = latestYear(book)
  return !last || last.id !== yearId
}

// ---- 取引の並び ----

/** 日付の順に並べる。同じ日は、入れた順（通帳に載っている順に入れれば、その順になる）。 */
export function sortedTransactions(year: FiscalYear): Transaction[] {
  // Array.prototype.sort は安定なので、同じ日付の取引は元の順のまま残る
  return [...year.transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** 取引が、ある置き場所の残高をいくら動かすか（増えるならプラス）。 */
export function effectOn(tx: Transaction, accountId: string): Yen {
  if (tx.kind === 'income') return tx.accountId === accountId ? tx.amount : 0
  if (tx.kind === 'expense') return tx.accountId === accountId ? -tx.amount : 0
  let delta = 0
  if (tx.accountId === accountId) delta -= tx.amount
  if (tx.toAccountId === accountId) delta += tx.amount
  return delta
}

// ---- 置き場所ごとの残高 ----

export type AccountBalance = {
  accountId: string
  name: string
  kind: AccountKind
  /** 年度はじめの残高 */
  opening: Yen
  /** 入ったお金（収入と、移動で入った分） */
  inflow: Yen
  /** 出たお金（支出と、移動で出た分） */
  outflow: Yen
  /** 残高 */
  closing: Yen
}

/** 置き場所ごとの残高。asOf を渡すと、その日までの取引だけで出す（残高の照合に使う）。 */
export function accountBalances(year: FiscalYear, asOf?: DateString): AccountBalance[] {
  return year.accounts.map((account) => {
    let inflow = 0
    let outflow = 0
    for (const tx of year.transactions) {
      if (asOf !== undefined && tx.date > asOf) continue
      const delta = effectOn(tx, account.id)
      if (delta > 0) inflow += delta
      else outflow -= delta
    }
    return {
      accountId: account.id,
      name: account.name,
      kind: account.kind,
      opening: account.openingBalance,
      inflow,
      outflow,
      closing: account.openingBalance + inflow - outflow,
    }
  })
}

/** その日までの取引を入れた、帳簿の上の残高。 */
export function bookBalanceAsOf(year: FiscalYear, accountId: string, date: DateString): Yen {
  return accountBalances(year, date).find((b) => b.accountId === accountId)?.closing ?? 0
}

// ---- 年度の集計 ----

/** 決算書の「差」。向きは団体の決まりに合わせる。 */
export function calcDiff(budget: Yen, actual: Yen, style: DiffStyle = 'actual-minus-budget'): Yen {
  return style === 'budget-minus-actual' ? budget - actual : actual - budget
}

export type CategoryTotal = {
  categoryId: string
  side: Side
  name: string
  budget: Yen
  /** 決算額（その科目の取引の合計） */
  actual: Yen
  diff: Yen
  note: string
  /** 取引の件数 */
  count: number
}

export type YearSummary = {
  /** 前年度繰越金（置き場所の年度はじめの残高の合計） */
  openingTotal: Yen
  /** 収入の合計（前年度繰越金は入れない） */
  incomeTotal: Yen
  /** 支出の合計 */
  expenseTotal: Yen
  /** 次年度繰越金 ＝ 前年度繰越金 ＋ 収入 − 支出 */
  carryover: Yen
  /** 置き場所ごとの残高 */
  accounts: AccountBalance[]
  /** 置き場所ごとの残高の合計。carryover と必ず同じになる */
  closingTotal: Yen
  /** carryover と closingTotal が同じか。データが壊れていなければ必ず true */
  balanced: boolean
  income: CategoryTotal[]
  expense: CategoryTotal[]
  /** 収入の予算の合計（前年度繰越金は入れない） */
  incomeBudgetTotal: Yen
  expenseBudgetTotal: Yen
  /** 移動（預け入れ・引き出し）の合計。収入にも支出にも入っていない */
  transferTotal: Yen
  counts: Record<TransactionKind, number>
}

export function summarizeYear(year: FiscalYear, diffStyle: DiffStyle = 'actual-minus-budget'): YearSummary {
  const actual = new Map<string, { amount: Yen; count: number }>()
  const counts: Record<TransactionKind, number> = { income: 0, expense: 0, transfer: 0 }
  let incomeTotal = 0
  let expenseTotal = 0
  let transferTotal = 0
  for (const tx of year.transactions) {
    counts[tx.kind] += 1
    if (tx.kind === 'transfer') {
      transferTotal += tx.amount
      continue
    }
    // 合計は取引から直に足す。科目の行から足し直さないのは、科目の側に抜けがあっても合計を狂わせないため
    if (tx.kind === 'income') incomeTotal += tx.amount
    else expenseTotal += tx.amount
    const key = tx.categoryId ?? ''
    const cur = actual.get(key) ?? { amount: 0, count: 0 }
    actual.set(key, { amount: cur.amount + tx.amount, count: cur.count + 1 })
  }
  const toTotal = (c: Category): CategoryTotal => {
    const a = actual.get(c.id) ?? { amount: 0, count: 0 }
    return {
      categoryId: c.id,
      side: c.side,
      name: c.name,
      budget: c.budget,
      actual: a.amount,
      diff: calcDiff(c.budget, a.amount, diffStyle),
      note: c.note,
      count: a.count,
    }
  }
  const income = year.categories.filter((c) => c.side === 'income').map(toTotal)
  const expense = year.categories.filter((c) => c.side === 'expense').map(toTotal)
  const accounts = accountBalances(year)
  const openingTotal = accounts.reduce((s, a) => s + a.opening, 0)
  const closingTotal = accounts.reduce((s, a) => s + a.closing, 0)
  const carryover = openingTotal + incomeTotal - expenseTotal
  return {
    openingTotal,
    incomeTotal,
    expenseTotal,
    carryover,
    accounts,
    closingTotal,
    balanced: carryover === closingTotal,
    income,
    expense,
    incomeBudgetTotal: income.reduce((s, c) => s + c.budget, 0),
    expenseBudgetTotal: expense.reduce((s, c) => s + c.budget, 0),
    transferTotal,
    counts,
  }
}

/** 科目が取引で使われている件数（使われている科目は消せない）。 */
export function categoryUseCount(year: FiscalYear, categoryId: string): number {
  return year.transactions.filter((t) => t.categoryId === categoryId).length
}

/** 置き場所が取引で使われている件数。 */
export function accountUseCount(year: FiscalYear, accountId: string): number {
  return year.transactions.filter((t) => t.accountId === accountId || t.toAccountId === accountId).length
}

// ---- 移動の呼び方 ----

/** 移動の呼び方。現金→口座は「預け入れ」、口座→現金は「引き出し」、口座→口座は「口座の間の移動」。 */
export function transferLabel(year: FiscalYear, tx: Transaction): string {
  const from = year.accounts.find((a) => a.id === tx.accountId)
  const to = year.accounts.find((a) => a.id === tx.toAccountId)
  if (from?.kind === 'cash' && to?.kind === 'bank') return '預け入れ'
  if (from?.kind === 'bank' && to?.kind === 'cash') return '引き出し'
  return '口座の間の移動'
}

// ---- 出納帳 ----

export type LedgerRow = {
  /** 行の目印（画面の key に使う） */
  key: string
  /** 取引の id。繰越の行は null */
  transactionId: string | null
  kind: 'opening' | TransactionKind
  date: DateString
  /** 摘要 */
  description: string
  /** 科目の名前。移動は「預け入れ（普通預金へ）」のように書く */
  categoryName: string
  /** 入金。なければ null */
  inflow: Yen | null
  /** 出金。なければ null */
  outflow: Yen | null
  /** この行までの残高 */
  balance: Yen
  receiptNo: string
}

export type Ledger = {
  accountId: string
  accountName: string
  accountKind: AccountKind
  /** 「現金出納帳」「預金出納帳（普通預金）」。口座の名前にかっこがあれば「預金出納帳 定期預金（積立）」 */
  title: string
  opening: Yen
  rows: LedgerRow[]
  inflowTotal: Yen
  outflowTotal: Yen
  closing: Yen
}

/** 出納帳の題名。口座の名前にかっこが入っているときは、かっこを重ねない。 */
function ledgerTitle(account: Account): string {
  if (account.kind === 'cash') return '現金出納帳'
  return /[（(]/.test(account.name) ? `預金出納帳 ${account.name}` : `預金出納帳（${account.name}）`
}

/** 置き場所ごとの出納帳。最初の行は「前年度より繰越」。 */
export function buildLedger(year: FiscalYear, accountId: string): Ledger | null {
  const account = year.accounts.find((a) => a.id === accountId)
  if (!account) return null
  const categoryName = new Map(year.categories.map((c) => [c.id, c.name]))
  const accountName = new Map(year.accounts.map((a) => [a.id, a.name]))
  let balance = account.openingBalance
  let inflowTotal = 0
  let outflowTotal = 0
  const rows: LedgerRow[] = [
    {
      key: 'opening',
      transactionId: null,
      kind: 'opening',
      date: year.startDate,
      description: '前年度より繰越',
      categoryName: '',
      inflow: null,
      outflow: null,
      balance,
      receiptNo: '',
    },
  ]
  for (const tx of sortedTransactions(year)) {
    const delta = effectOn(tx, account.id)
    // 同じ置き場所への移動（データが壊れているとき）は delta が 0 になるが、行は出して気づけるようにする
    if (tx.accountId !== account.id && tx.toAccountId !== account.id) continue
    balance += delta
    if (delta > 0) inflowTotal += delta
    else outflowTotal -= delta
    let name = tx.categoryId ? (categoryName.get(tx.categoryId) ?? '') : ''
    if (tx.kind === 'transfer') {
      const other = tx.accountId === account.id ? tx.toAccountId : tx.accountId
      const otherName = (other && accountName.get(other)) || ''
      name = `${transferLabel(year, tx)}（${otherName}${tx.accountId === account.id ? 'へ' : 'から'}）`
    }
    rows.push({
      key: tx.id,
      transactionId: tx.id,
      kind: tx.kind,
      date: tx.date,
      description: tx.description,
      categoryName: name,
      inflow: delta > 0 ? delta : null,
      outflow: delta < 0 ? -delta : null,
      balance,
      receiptNo: tx.receiptNo,
    })
  }
  return {
    accountId: account.id,
    accountName: account.name,
    accountKind: account.kind,
    title: ledgerTitle(account),
    opening: account.openingBalance,
    rows,
    inflowTotal,
    outflowTotal,
    closing: balance,
  }
}

export function buildLedgers(year: FiscalYear): Ledger[] {
  return year.accounts.map((a) => buildLedger(year, a.id)).filter((l): l is Ledger => l !== null)
}

// ---- 知らせること ----

export type NegativeDay = {
  accountId: string
  accountName: string
  date: DateString
  /** その日の終わりの残高（マイナス） */
  balance: Yen
}

/**
 * 残高がマイナスになる日。
 * 1件ごとではなく「その日の終わり」の残高で見る。同じ日に引き出しと支払いを入れた順が逆でも、
 * まちがいと言わないため。
 */
export function negativeBalanceDays(year: FiscalYear): NegativeDay[] {
  const result: NegativeDay[] = []
  const txs = sortedTransactions(year)
  for (const account of year.accounts) {
    let balance = account.openingBalance
    for (let i = 0; i < txs.length; i++) {
      balance += effectOn(txs[i], account.id)
      const lastOfDay = i === txs.length - 1 || txs[i + 1].date !== txs[i].date
      if (lastOfDay && balance < 0) {
        result.push({ accountId: account.id, accountName: account.name, date: txs[i].date, balance })
      }
    }
  }
  return result
}

/** 年度の外の日付の取引。 */
export function transactionsOutsideYear(year: FiscalYear): Transaction[] {
  return sortedTransactions(year).filter((t) => !isWithin(t.date, year.startDate, year.endDate))
}

/** 2つ以上の取引で使われている領収書の番号。 */
export function duplicateReceiptNos(year: FiscalYear): { receiptNo: string; transactionIds: string[] }[] {
  const byNo = new Map<string, string[]>()
  for (const tx of year.transactions) {
    if (tx.receiptNo === '') continue
    byNo.set(tx.receiptNo, [...(byNo.get(tx.receiptNo) ?? []), tx.id])
  }
  return [...byNo.entries()].filter(([, ids]) => ids.length > 1).map(([receiptNo, transactionIds]) => ({ receiptNo, transactionIds }))
}

/**
 * 次に振る領収書の番号。いま使われている数字の番号のうち、いちばん大きいものの次。
 * 「A-12」のような数字でない番号は数えない（団体が自分で決めた番号を、勝手に続けないため）。
 */
export function nextReceiptNo(year: FiscalYear): string {
  let max = 0
  for (const tx of year.transactions) {
    if (/^\d{1,9}$/.test(tx.receiptNo)) max = Math.max(max, Number(tx.receiptNo))
  }
  return String(max + 1)
}

/**
 * 領収書の番号の初期値。支出には次の番号を振り、収入と移動は空にする。
 * 領収書をもらうのは支出のときなので、収入にも番号を振ると、つづりの番号が飛んで見えるため。
 */
export function defaultReceiptNo(year: FiscalYear, kind: TransactionKind): string {
  return kind === 'expense' ? nextReceiptNo(year) : ''
}

/**
 * その年度について、確かめてほしいことの一覧。
 * 入力はできるが、まちがいのことが多いものを集める（年度の外の日付、マイナスの残高、同じ領収書番号）。
 */
export function listYearIssues(year: FiscalYear, options: { today?: DateString } = {}): Notice[] {
  const notices: Notice[] = []
  const outside = transactionsOutsideYear(year)
  if (outside.length > 0) {
    notices.push({
      code: 'outside-year',
      message: `会計年度（${formatWareki(year.startDate)}〜${formatWareki(year.endDate)}）の外の日付の取引が ${outside.length}件 あります。日付か、年度をまちがえていないか確かめてください。`,
      transactionIds: outside.map((t) => t.id),
    })
  }
  const negatives = negativeBalanceDays(year)
  for (const account of year.accounts) {
    const days = negatives.filter((d) => d.accountId === account.id)
    if (days.length === 0) continue
    const worst = days.reduce((a, b) => (b.balance < a.balance ? b : a))
    notices.push({
      code: 'negative-balance',
      message:
        `「${account.name}」の残高が、${formatWareki(days[0].date)}にマイナスになっています` +
        `（いちばん少ない日で ${formatYen(worst.balance)}円）。金額、日付、置き場所のまちがいや、入れ忘れた収入・引き出しがないか確かめてください。`,
      accountId: account.id,
    })
  }
  for (const dup of duplicateReceiptNos(year)) {
    notices.push({
      code: 'duplicate-receipt',
      message: `領収書の番号「${dup.receiptNo}」が、${dup.transactionIds.length}件の取引で使われています。`,
      transactionIds: dup.transactionIds,
    })
  }
  if (options.today) {
    const future = year.transactions.filter((t) => t.date > options.today!)
    if (future.length > 0) {
      notices.push({
        code: 'future-date',
        message: `今日より先の日付の取引が ${future.length}件 あります。`,
        transactionIds: future.map((t) => t.id),
      })
    }
  }
  return notices
}

// ---- 残高の照合 ----

export type ReconcileStatus = 'unchecked' | 'match' | 'over' | 'short'

export type ReconcileRow = {
  accountId: string
  name: string
  kind: AccountKind
  /** 数えた日。まだなら null */
  date: DateString | null
  /** 帳簿の上の残高。数えた日があればその日まで、なければ入力したすべての取引で出す */
  bookBalance: Yen
  /** 実際の残高（通帳の残高、手元の現金）。まだなら null */
  actual: Yen | null
  /** 実際 − 帳簿。まだなら null */
  diff: Yen | null
  status: ReconcileStatus
  /** そのまま画面に出せる文 */
  message: string
  /** 合わないときの、考えられる原因（「かもしれません」の形で出す） */
  hints: string[]
}

export type ReconcileResult = {
  rows: ReconcileRow[]
  /** すべての置き場所を確かめて、すべて合っているか */
  allMatch: boolean
  uncheckedCount: number
  mismatchCount: number
}

function actualWord(kind: AccountKind): string {
  return kind === 'cash' ? '手元の現金' : '通帳の残高'
}

/** 差の金額から、考えられる原因を出す。当てずっぽうにならないよう、計算で言えることだけにする。 */
function diffHints(year: FiscalYear, account: Account, date: DateString, diff: Yen): string[] {
  const hints: string[] = []
  const abs = Math.abs(diff)
  hints.push(
    diff > 0
      ? '入れ忘れた収入がないか、支出を二重に入れていないか、確かめてください。'
      : '入れ忘れた支出がないか、収入を二重に入れていないか、確かめてください。',
  )
  const upTo = sortedTransactions(year).filter((t) => t.date <= date)
  const describe = (t: Transaction) => `${formatMonthDay(t.date)}「${t.description || '（内容なし）'}」`
  const same = upTo.filter((t) => t.amount === abs)
  if (same.length > 0) {
    hints.push(
      `差と同じ金額（${formatYen(abs)}円）の取引があります: ${same.slice(0, 3).map(describe).join('、')}${same.length > 3 ? ' など' : ''}。` +
        '二重に入れていないか、置き場所が合っているか確かめてください。',
    )
  }
  if (abs % 2 === 0) {
    const half = upTo.filter((t) => t.amount === abs / 2 && (t.accountId === account.id || t.toAccountId === account.id))
    if (half.length > 0) {
      hints.push(
        `差の半分の金額（${formatYen(abs / 2)}円）の取引があります: ${half.slice(0, 3).map(describe).join('、')}${half.length > 3 ? ' など' : ''}。` +
          '収入と支出を逆に入れていないか確かめてください。',
      )
    }
  }
  if (abs % 9 === 0) {
    // 桁のずれ（1,200 と 12,000）や数字の入れかわり（5,400 と 4,500）で生まれる差は、必ず9で割り切れる
    hints.push('差が9で割り切れます。金額の桁をまちがえたか、数字の順番を入れかえて入力したかもしれません。')
  }
  return hints
}

/** 帳簿の残高と、実際の残高（通帳、手元の現金）を照らし合わせる。合わないと、いくら違うかを言う。 */
export function reconcileYear(year: FiscalYear): ReconcileResult {
  const now = accountBalances(year)
  const rows: ReconcileRow[] = year.accounts.map((account) => {
    const rec = year.reconciliations[account.id]
    if (!rec) {
      return {
        accountId: account.id,
        name: account.name,
        kind: account.kind,
        date: null,
        bookBalance: now.find((b) => b.accountId === account.id)?.closing ?? 0,
        actual: null,
        diff: null,
        status: 'unchecked',
        message: 'まだ照らし合わせていません。',
        hints: [],
      }
    }
    const bookBalance = bookBalanceAsOf(year, account.id, rec.date)
    const diff = rec.actual - bookBalance
    const word = actualWord(account.kind)
    const status: ReconcileStatus = diff === 0 ? 'match' : diff > 0 ? 'over' : 'short'
    return {
      accountId: account.id,
      name: account.name,
      kind: account.kind,
      date: rec.date,
      bookBalance,
      actual: rec.actual,
      diff,
      status,
      message:
        diff === 0
          ? `${word}と帳簿が合っています。`
          : `${word}のほうが、帳簿より ${formatYen(Math.abs(diff))}円 ${diff > 0 ? '多い' : '少ない'}です。`,
      hints: diff === 0 ? [] : diffHints(year, account, rec.date, diff),
    }
  })
  // 2つの置き場所の差がちょうど逆なら、移動の入れ忘れか、置き場所のまちがいのことが多い
  for (const a of rows) {
    for (const b of rows) {
      if (a.accountId >= b.accountId || !a.diff || !b.diff || a.diff !== -b.diff) continue
      const hint = (other: ReconcileRow) =>
        `「${other.name}」の差と、ちょうど逆になっています。預け入れ・引き出しの入れ忘れか、置き場所のまちがいかもしれません。`
      a.hints.unshift(hint(b))
      b.hints.unshift(hint(a))
    }
  }
  const uncheckedCount = rows.filter((r) => r.status === 'unchecked').length
  const mismatchCount = rows.filter((r) => r.status === 'over' || r.status === 'short').length
  return { rows, allMatch: uncheckedCount === 0 && mismatchCount === 0, uncheckedCount, mismatchCount }
}
