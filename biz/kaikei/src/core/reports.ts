// 総会の資料（5種類）の中身を作る。
// ここで作るのは「紙に何を書くか」の値だけ。見た目（罫線、余白、印刷）は画面の側で作る。
// 同じ値を、道具の画面と LP の見本の両方で使えるように、ブラウザの機能には触らない。
import {
  buildLedgers,
  calcDiff,
  findYear,
  reconcileYear,
  sortedTransactions,
  summarizeYear,
  type Ledger,
  type ReconcileStatus,
} from './calc'
import { addDays, formatWareki, oneYearLater, suggestNextLabel } from './dates'
import type {
  AccountKind,
  Book,
  CustodyItem,
  DateString,
  DiffStyle,
  EquipmentItem,
  FiscalYear,
  PendingItem,
  Yen,
} from './types'

/** 「令和7年4月1日から令和8年3月31日まで」 */
export function periodText(year: Pick<FiscalYear, 'startDate' | 'endDate'>): string {
  return `${formatWareki(year.startDate)}から${formatWareki(year.endDate)}まで`
}

/** 決算書の「差」の見出し。向きがわかるように書く。 */
export function diffLabel(style: DiffStyle): string {
  return style === 'budget-minus-actual' ? '差（予算−決算）' : '差（決算−予算）'
}

type Person = { title: string; name: string }

// ---- 1. 収支決算書 ----

export type SettlementRow = {
  key: string
  name: string
  budget: Yen
  actual: Yen
  diff: Yen
  /** 説明 */
  note: string
  /** 前年度繰越金の行か */
  isCarryover: boolean
}

export type SettlementSection = {
  rows: SettlementRow[]
  total: { budget: Yen; actual: Yen; diff: Yen }
}

export type SettlementReport = {
  /** 「令和7年度 収支決算書」 */
  title: string
  orgName: string
  yearLabel: string
  periodText: string
  diffLabel: string
  /** 収入の部。最初の行は前年度繰越金 */
  income: SettlementSection
  /** 支出の部 */
  expense: SettlementSection
  /** 収入の合計（前年度繰越金を入れた額） */
  incomeTotal: Yen
  /** 今年度に入った収入だけの合計（前年度繰越金を入れない額） */
  incomeThisYear: Yen
  expenseTotal: Yen
  /** 次年度繰越金 ＝ 収入の合計 − 支出の合計 */
  carryover: Yen
  /** 繰越金の内訳（現金いくら、どの口座にいくら） */
  breakdown: { accountId: string; name: string; kind: AccountKind; amount: Yen }[]
  breakdownTotal: Yen
  /** 内訳の合計と次年度繰越金が同じか。必ず true のはず。false のときは資料を出さずに知らせること */
  balanced: boolean
  /** 作成日。空なら画面の側で今日の日付を出す */
  reportDate: DateString | ''
  treasurer: Person
  president: Person
}

function section(rows: SettlementRow[], style: DiffStyle): SettlementSection {
  const budget = rows.reduce((s, r) => s + r.budget, 0)
  const actual = rows.reduce((s, r) => s + r.actual, 0)
  return { rows, total: { budget, actual, diff: calcDiff(budget, actual, style) } }
}

export function buildSettlement(book: Book, yearId: string): SettlementReport | null {
  const year = findYear(book, yearId)
  if (!year) return null
  const s = summarizeYear(year, book.diffStyle)
  const carryBudget = year.carryoverBudget ?? s.openingTotal
  const row = (c: (typeof s.income)[number]): SettlementRow => ({
    key: c.categoryId,
    name: c.name,
    budget: c.budget,
    actual: c.actual,
    diff: c.diff,
    note: c.note,
    isCarryover: false,
  })
  const income = section(
    [
      {
        key: 'carryover',
        name: '前年度繰越金',
        budget: carryBudget,
        actual: s.openingTotal,
        diff: calcDiff(carryBudget, s.openingTotal, book.diffStyle),
        note: '',
        isCarryover: true,
      },
      ...s.income.map(row),
    ],
    book.diffStyle,
  )
  const expense = section(s.expense.map(row), book.diffStyle)
  // 合計は、行からではなく取引から出した額を使う（summarizeYear の考え方と同じ）
  const incomeTotal = s.openingTotal + s.incomeTotal
  income.total.actual = incomeTotal
  income.total.diff = calcDiff(income.total.budget, incomeTotal, book.diffStyle)
  expense.total.actual = s.expenseTotal
  expense.total.diff = calcDiff(expense.total.budget, s.expenseTotal, book.diffStyle)
  return {
    title: `${year.label} 収支決算書`,
    orgName: book.orgName,
    yearLabel: year.label,
    periodText: periodText(year),
    diffLabel: diffLabel(book.diffStyle),
    income,
    expense,
    incomeTotal,
    incomeThisYear: s.incomeTotal,
    expenseTotal: s.expenseTotal,
    carryover: s.carryover,
    breakdown: s.accounts.map((a) => ({ accountId: a.accountId, name: a.name, kind: a.kind, amount: a.closing })),
    breakdownTotal: s.closingTotal,
    balanced: s.balanced,
    reportDate: year.reportDate,
    treasurer: { title: book.roleNames.treasurer, name: year.officers.treasurer },
    president: { title: book.roleNames.president, name: year.officers.president },
  }
}

// ---- 2. 出納帳 ----

export type LedgerReport = {
  orgName: string
  yearLabel: string
  periodText: string
  /** 置き場所ごと。現金出納帳が先頭 */
  ledgers: Ledger[]
}

export function buildLedgerReport(book: Book, yearId: string): LedgerReport | null {
  const year = findYear(book, yearId)
  if (!year) return null
  return { orgName: book.orgName, yearLabel: year.label, periodText: periodText(year), ledgers: buildLedgers(year) }
}

// ---- 3. 会計監査報告書 ----

export type AuditReport = {
  title: string
  orgName: string
  yearLabel: string
  /** 宛て名（「あおぞら町内会 会長 高橋 正夫 様」）。会長の名前が空なら、名前のところを空けて出す */
  addressee: string
  /** 本文（{年度} などを置きかえたあと） */
  body: string
  /** 監査の日。空なら、紙に手で書けるように空けて出す */
  date: DateString | ''
  auditorTitle: string
  /** 署名欄。名前が空の欄は、手で書いてもらう */
  auditors: string[]
  /** 本文の下に並べる金額 */
  figures: { incomeTotal: Yen; expenseTotal: Yen; carryover: Yen }
}

/** 監査報告書の本文の {年度} {期間} {団体名} を置きかえる。 */
export function renderAuditText(template: string, book: Book, year: FiscalYear): string {
  return template.replaceAll('{年度}', year.label).replaceAll('{期間}', periodText(year)).replaceAll('{団体名}', book.orgName)
}

export function buildAuditReport(book: Book, yearId: string): AuditReport | null {
  const year = findYear(book, yearId)
  if (!year) return null
  const s = summarizeYear(year, book.diffStyle)
  return {
    title: '会計監査報告書',
    orgName: book.orgName,
    yearLabel: year.label,
    addressee: `${book.orgName} ${book.roleNames.president} ${year.officers.president}`.trim() + ' 様',
    body: renderAuditText(year.audit.text, book, year),
    date: year.audit.date,
    auditorTitle: book.roleNames.auditor,
    auditors: [...year.officers.auditors],
    figures: { incomeTotal: s.openingTotal + s.incomeTotal, expenseTotal: s.expenseTotal, carryover: s.carryover },
  }
}

// ---- 4. 次年度の予算案 ----

export type BudgetDraftRow = {
  key: string
  name: string
  /** 今年度の予算 */
  currentBudget: Yen
  /** 今年度の決算 */
  currentActual: Yen
  /** 次年度の予算案。入れていなければ、今年度の予算と同じ額 */
  nextBudget: Yen
  /** 予算案を入力してあるか（入れていない行を、画面でうすく見せるのに使う） */
  entered: boolean
  isCarryover: boolean
}

export type BudgetDraftSection = {
  rows: BudgetDraftRow[]
  total: { currentBudget: Yen; currentActual: Yen; nextBudget: Yen }
}

export type BudgetDraftReport = {
  /** 「令和8年度 収支予算書（案）」 */
  title: string
  orgName: string
  nextYearLabel: string
  nextPeriodText: string
  /** 収入の部。最初の行は前年度繰越金（＝今年度の次年度繰越金） */
  income: BudgetDraftSection
  expense: BudgetDraftSection
  /** 収入の予算の合計 − 支出の予算の合計。0 なら合っている */
  gap: Yen
}

function draftSection(rows: BudgetDraftRow[]): BudgetDraftSection {
  return {
    rows,
    total: {
      currentBudget: rows.reduce((s, r) => s + r.currentBudget, 0),
      currentActual: rows.reduce((s, r) => s + r.currentActual, 0),
      nextBudget: rows.reduce((s, r) => s + r.nextBudget, 0),
    },
  }
}

export function buildBudgetDraft(book: Book, yearId: string): BudgetDraftReport | null {
  const index = book.years.findIndex((y) => y.id === yearId)
  if (index < 0) return null
  const year = book.years[index]
  const s = summarizeYear(year, book.diffStyle)
  // すでに繰り越してあれば、できている次の年度の呼び名と期間を使う
  const following: FiscalYear | undefined = book.years[index + 1]
  const nextStart = following?.startDate ?? addDays(year.endDate, 1)
  const nextEnd = following?.endDate ?? oneYearLater(year.endDate)
  const nextYearLabel = following?.label ?? suggestNextLabel(year.label, nextStart)
  const row = (c: (typeof s.income)[number]): BudgetDraftRow => {
    const entered = Object.prototype.hasOwnProperty.call(year.nextBudget, c.categoryId)
    return {
      key: c.categoryId,
      name: c.name,
      currentBudget: c.budget,
      currentActual: c.actual,
      nextBudget: entered ? year.nextBudget[c.categoryId] : c.budget,
      entered,
      isCarryover: false,
    }
  }
  const income = draftSection([
    {
      key: 'carryover',
      name: '前年度繰越金',
      currentBudget: year.carryoverBudget ?? s.openingTotal,
      currentActual: s.openingTotal,
      // 次の年度の前年度繰越金は、今年度の次年度繰越金そのもの
      nextBudget: s.carryover,
      entered: true,
      isCarryover: true,
    },
    ...s.income.map(row),
  ])
  const expense = draftSection(s.expense.map(row))
  return {
    title: `${nextYearLabel} 収支予算書（案）`,
    orgName: book.orgName,
    nextYearLabel,
    nextPeriodText: periodText({ startDate: nextStart, endDate: nextEnd }),
    income,
    expense,
    gap: income.total.nextBudget - expense.total.nextBudget,
  }
}

// ---- 5. 引き継ぎ書 ----

export type HandoverReport = {
  title: string
  orgName: string
  yearLabel: string
  /** 引き継ぎをした日。空なら、紙に手で書けるように空けて出す */
  date: DateString | ''
  /** 渡す人（今年度の会計） */
  from: Person
  /** 受け取る人（次の担当）。名前が空なら空けて出す */
  to: Person
  /** 残高（現金、口座ごと） */
  balances: {
    accountId: string
    name: string
    kind: AccountKind
    /** 帳簿の上の残高 */
    bookBalance: Yen
    /** 照合の結果。まだなら null */
    check: { date: DateString; actual: Yen; diff: Yen; status: ReconcileStatus } | null
  }[]
  balanceTotal: Yen
  /** いちばん新しい取引の日付（「この日までの取引を入れた残高です」と書くため）。取引がなければ null */
  lastTransactionDate: DateString | null
  custody: CustodyItem[]
  /** まだ払っていないもの */
  unpaid: PendingItem[]
  /** 金額がわかっている分の合計 */
  unpaidTotal: Yen
  /** まだもらっていないもの */
  unreceived: PendingItem[]
  unreceivedTotal: Yen
  equipment: EquipmentItem[]
  memo: string
}

export function buildHandoverReport(book: Book, yearId: string): HandoverReport | null {
  const year = findYear(book, yearId)
  if (!year) return null
  const s = summarizeYear(year, book.diffStyle)
  const rec = reconcileYear(year)
  const sorted = sortedTransactions(year)
  const sumKnown = (items: PendingItem[]) => items.reduce((total, i) => total + (i.amount ?? 0), 0)
  return {
    title: '会計引き継ぎ書',
    orgName: book.orgName,
    yearLabel: year.label,
    date: year.handover.date,
    from: { title: book.roleNames.treasurer, name: year.officers.treasurer },
    to: { title: `次の${book.roleNames.treasurer}`, name: year.handover.successor },
    balances: s.accounts.map((a) => {
      const r = rec.rows.find((x) => x.accountId === a.accountId)
      return {
        accountId: a.accountId,
        name: a.name,
        kind: a.kind,
        bookBalance: a.closing,
        check:
          r && r.date !== null && r.actual !== null && r.diff !== null
            ? { date: r.date, actual: r.actual, diff: r.diff, status: r.status }
            : null,
      }
    }),
    balanceTotal: s.closingTotal,
    lastTransactionDate: sorted.length > 0 ? sorted[sorted.length - 1].date : null,
    custody: year.handover.custody.map((c) => ({ ...c })),
    unpaid: year.handover.unpaid.map((i) => ({ ...i })),
    unpaidTotal: sumKnown(year.handover.unpaid),
    unreceived: year.handover.unreceived.map((i) => ({ ...i })),
    unreceivedTotal: sumKnown(year.handover.unreceived),
    equipment: year.handover.equipment.map((e) => ({ ...e })),
    memo: year.handover.memo,
  }
}

// ---- まとめて作る ----

export type Reports = {
  settlement: SettlementReport
  ledgers: LedgerReport
  audit: AuditReport
  budgetDraft: BudgetDraftReport
  handover: HandoverReport
}

/** 5種類の資料を、まとめて作る。年度が見つからなければ null。 */
export function buildReports(book: Book, yearId: string): Reports | null {
  const settlement = buildSettlement(book, yearId)
  const ledgers = buildLedgerReport(book, yearId)
  const audit = buildAuditReport(book, yearId)
  const budgetDraft = buildBudgetDraft(book, yearId)
  const handover = buildHandoverReport(book, yearId)
  if (!settlement || !ledgers || !audit || !budgetDraft || !handover) return null
  return { settlement, ledgers, audit, budgetDraft, handover }
}
