import { describe, expect, it } from 'vitest'
import { removeTransaction, setReconciliation, updateCategory, updateTransaction, updateYear } from './book'
import {
  accountBalances,
  bookBalanceAsOf,
  buildLedger,
  buildLedgers,
  calcDiff,
  defaultReceiptNo,
  descriptionSuggestions,
  duplicateReceiptNos,
  endOfDayBalance,
  effectOn,
  filterTransactions,
  listYearIssues,
  negativeBalanceDays,
  nextReceiptNo,
  reconcileYear,
  sortedTransactions,
  summarizeYear,
  transactionViews,
  transactionsOutsideYear,
  transferLabel,
} from './calc'
import { carryForward } from './carry'
import { addDays } from './dates'
import { add, bankId, cashId, catId, deposit, expense, income, newBook, ok, seqIds, withdraw, year } from './test-helpers'
import { LIMITS, type Book } from './types'

/** 毎回同じ並びになる、でたらめな数（テストが日によって結果を変えないように、種を決めておく）。 */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

describe('空の年度', () => {
  it('取引がなくても落ちない。繰越金は、年度はじめの残高のまま', () => {
    const book = newBook()
    const s = summarizeYear(year(book))
    expect(s.openingTotal).toBe(110_000)
    expect(s.incomeTotal).toBe(0)
    expect(s.expenseTotal).toBe(0)
    expect(s.carryover).toBe(110_000)
    expect(s.closingTotal).toBe(110_000)
    expect(s.balanced).toBe(true)
    expect(s.counts).toEqual({ income: 0, expense: 0, transfer: 0 })
    expect(s.income.every((c) => c.actual === 0 && c.count === 0)).toBe(true)
    expect(negativeBalanceDays(year(book))).toEqual([])
    expect(listYearIssues(year(book))).toEqual([])
  })
  it('残高がすべて 0円、科目もない帳簿でも落ちない', () => {
    const book = newBook({ orgKind: 'other', cashOpening: 0, bankAccounts: [] })
    const s = summarizeYear(year(book))
    expect(s.carryover).toBe(0)
    expect(s.accounts).toHaveLength(1)
    expect(buildLedgers(year(book))).toHaveLength(1)
    expect(reconcileYear(year(book)).rows).toHaveLength(1)
  })
})

describe('年度はじめの残高 ＋ 収入 − 支出 ＝ 年度末の残高', () => {
  it('収入と支出を入れると、そのぶんだけ残高が動く', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    book = expense(book, '2026-04-11', 1_234)
    const s = summarizeYear(year(book))
    expect(s.incomeTotal).toBe(30_000)
    expect(s.expenseTotal).toBe(1_234)
    expect(s.carryover).toBe(110_000 + 30_000 - 1_234)
    expect(s.closingTotal).toBe(s.carryover)
    expect(s.balanced).toBe(true)
    const cash = s.accounts.find((a) => a.kind === 'cash')!
    expect(cash.closing).toBe(10_000 + 30_000 - 1_234)
    expect(cash.opening + cash.inflow - cash.outflow).toBe(cash.closing)
  })

  it('科目ごとの決算額の合計が、収入・支出の合計と合う', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    book = add(book, { date: '2026-05-01', kind: 'income', categoryId: catId(book, 'income', '雑収入'), accountId: bankId(book), amount: 12 })
    book = expense(book, '2026-04-11', 1_234)
    book = add(book, { date: '2026-06-01', kind: 'expense', categoryId: catId(book, 'expense', '行事費'), accountId: bankId(book), amount: 20_000 })
    const s = summarizeYear(year(book))
    expect(s.income.reduce((t, c) => t + c.actual, 0)).toBe(s.incomeTotal)
    expect(s.expense.reduce((t, c) => t + c.actual, 0)).toBe(s.expenseTotal)
    expect(s.income.find((c) => c.name === '会費')).toMatchObject({ actual: 30_000, count: 1 })
    expect(s.expense.find((c) => c.name === '行事費')).toMatchObject({ actual: 20_000, count: 1 })
  })

  it('でたらめな取引を何百件入れても、置き場所ごとの残高の合計と次年度繰越金が必ず一致する', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = rng(seed)
      const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)]
      let book: Book = newBook(
        { cashOpening: Math.floor(random() * 50_000), bankAccounts: [{ name: '普通預金', openingBalance: Math.floor(random() * 900_000) }, { name: '定期預金', openingBalance: 300_000 }] },
        seqIds(`r${seed}_`),
      )
      const y = year(book)
      const accounts = y.accounts.map((a) => a.id)
      const incomes = y.categories.filter((c) => c.side === 'income').map((c) => c.id)
      const expenses = y.categories.filter((c) => c.side === 'expense').map((c) => c.id)
      let expectedIncome = 0
      let expectedExpense = 0
      const count = 20 + Math.floor(random() * 60)
      for (let i = 0; i < count; i++) {
        const date = addDays(y.startDate, Math.floor(random() * 365))
        const amount = 1 + Math.floor(random() * 99_999)
        const kind = pick(['income', 'expense', 'expense', 'transfer'] as const)
        if (kind === 'transfer') {
          const from = pick(accounts)
          const to = pick(accounts.filter((a) => a !== from))
          book = add(book, { date, kind, accountId: from, toAccountId: to, amount })
        } else {
          book = add(book, { date, kind, categoryId: pick(kind === 'income' ? incomes : expenses), accountId: pick(accounts), amount })
          if (kind === 'income') expectedIncome += amount
          else expectedExpense += amount
        }
      }
      const s = summarizeYear(year(book))
      expect(s.incomeTotal, `seed ${seed}`).toBe(expectedIncome)
      expect(s.expenseTotal, `seed ${seed}`).toBe(expectedExpense)
      expect(s.carryover, `seed ${seed}`).toBe(s.openingTotal + expectedIncome - expectedExpense)
      expect(s.accounts.reduce((t, a) => t + a.closing, 0), `seed ${seed}`).toBe(s.carryover)
      expect(s.balanced, `seed ${seed}`).toBe(true)
      // 出納帳の最後の残高も、同じ額になる
      const ledgers = buildLedgers(year(book))
      expect(ledgers.reduce((t, l) => t + l.closing, 0), `seed ${seed}`).toBe(s.carryover)
      for (const l of ledgers) {
        expect(l.opening + l.inflowTotal - l.outflowTotal).toBe(l.closing)
        expect(l.rows[l.rows.length - 1].balance).toBe(l.closing)
      }
      // 金額は、どれも整数のまま
      expect(Number.isInteger(s.carryover)).toBe(true)
    }
  })

  it('上限の金額でも、合計が正確に出る', () => {
    let book = newBook({ cashOpening: LIMITS.maxAmount, bankAccounts: [{ name: '普通預金', openingBalance: LIMITS.maxAmount }] })
    for (let i = 0; i < 50; i++) book = income(book, '2026-05-01', LIMITS.maxAmount, `大きな収入 ${i}`)
    const s = summarizeYear(year(book))
    expect(s.incomeTotal).toBe(LIMITS.maxAmount * 50)
    expect(s.carryover).toBe(LIMITS.maxAmount * 52)
    expect(Number.isSafeInteger(s.carryover)).toBe(true)
    expect(s.balanced).toBe(true)
  })
})

describe('置き場所の間の移動', () => {
  it('収入にも支出にも入らない。残高だけが動く', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    const before = summarizeYear(year(book))
    book = deposit(book, '2026-04-12', 25_000)
    const after = summarizeYear(year(book))
    expect(after.incomeTotal).toBe(before.incomeTotal)
    expect(after.expenseTotal).toBe(before.expenseTotal)
    expect(after.carryover).toBe(before.carryover)
    expect(after.transferTotal).toBe(25_000)
    expect(after.counts.transfer).toBe(1)
    expect(after.accounts.find((a) => a.kind === 'cash')!.closing).toBe(10_000 + 30_000 - 25_000)
    expect(after.accounts.find((a) => a.kind === 'bank')!.closing).toBe(100_000 + 25_000)
    // どの科目の決算額も変わらない
    expect(after.income.map((c) => c.actual)).toEqual(before.income.map((c) => c.actual))
    expect(after.expense.map((c) => c.actual)).toEqual(before.expense.map((c) => c.actual))
  })
  it('移動をすべて消しても、収入・支出・繰越金は同じ', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    book = deposit(book, '2026-04-12', 25_000)
    book = withdraw(book, '2026-05-01', 7_000)
    book = expense(book, '2026-05-02', 6_500)
    const withTransfers = summarizeYear(year(book))
    for (const t of year(book).transactions.filter((x) => x.kind === 'transfer')) {
      book = ok(removeTransaction(book, year(book).id, t.id))
    }
    const without = summarizeYear(year(book))
    expect(without.incomeTotal).toBe(withTransfers.incomeTotal)
    expect(without.expenseTotal).toBe(withTransfers.expenseTotal)
    expect(without.carryover).toBe(withTransfers.carryover)
  })
  it('effectOn: 出した元はマイナス、入れた先はプラス、関係のない置き場所は 0', () => {
    let book = newBook({ bankAccounts: [{ name: '普通預金', openingBalance: 0 }, { name: '定期預金', openingBalance: 0 }] })
    book = deposit(book, '2026-04-12', 5_000)
    const tx = year(book).transactions[0]
    expect(effectOn(tx, cashId(book))).toBe(-5_000)
    expect(effectOn(tx, bankId(book))).toBe(5_000)
    expect(effectOn(tx, bankId(book, '定期預金'))).toBe(0)
  })
  it('呼び方: 現金→口座は預け入れ、口座→現金は引き出し、口座→口座は口座の間の移動', () => {
    let book = newBook({ bankAccounts: [{ name: '普通預金', openingBalance: 50_000 }, { name: '定期預金', openingBalance: 0 }] })
    book = deposit(book, '2026-04-12', 5_000)
    book = withdraw(book, '2026-04-13', 3_000)
    book = add(book, { date: '2026-04-14', kind: 'transfer', accountId: bankId(book), toAccountId: bankId(book, '定期預金'), amount: 10_000 })
    const [a, b, c] = year(book).transactions
    expect(transferLabel(year(book), a)).toBe('預け入れ')
    expect(transferLabel(year(book), b)).toBe('引き出し')
    expect(transferLabel(year(book), c)).toBe('口座の間の移動')
  })
})

describe('calcDiff', () => {
  it('向きを選べる', () => {
    expect(calcDiff(10_000, 12_000)).toBe(2_000)
    expect(calcDiff(10_000, 8_000)).toBe(-2_000)
    expect(calcDiff(10_000, 12_000, 'budget-minus-actual')).toBe(-2_000)
    expect(calcDiff(10_000, 8_000, 'budget-minus-actual')).toBe(2_000)
    expect(calcDiff(0, 0)).toBe(0)
  })
  it('summarizeYear の差に反映される', () => {
    let book = newBook()
    book = ok(updateCategory(book, year(book).id, catId(book, 'income', '会費'), { budget: 50_000 }))
    book = income(book, '2026-04-10', 30_000)
    expect(summarizeYear(year(book)).income[0].diff).toBe(-20_000)
    expect(summarizeYear(year(book), 'budget-minus-actual').income[0].diff).toBe(20_000)
  })
})

describe('取引の並びと、その日までの残高', () => {
  it('日付の順。同じ日は入れた順', () => {
    let book = newBook()
    book = expense(book, '2026-05-01', 100, 'A')
    book = expense(book, '2026-04-10', 200, 'B')
    book = expense(book, '2026-05-01', 300, 'C')
    book = expense(book, '2026-04-10', 400, 'D')
    expect(sortedTransactions(year(book)).map((t) => t.description)).toEqual(['B', 'D', 'A', 'C'])
    // 元の並び（入れた順）は変えない
    expect(year(book).transactions.map((t) => t.description)).toEqual(['A', 'B', 'C', 'D'])
  })
  it('asOf の日の取引は入れる。次の日の取引は入れない', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 1_000)
    book = income(book, '2026-04-11', 2_000)
    const cash = cashId(book)
    expect(bookBalanceAsOf(year(book), cash, '2026-04-09')).toBe(10_000)
    expect(bookBalanceAsOf(year(book), cash, '2026-04-10')).toBe(11_000)
    expect(bookBalanceAsOf(year(book), cash, '2026-04-11')).toBe(13_000)
    expect(accountBalances(year(book)).find((a) => a.accountId === cash)!.closing).toBe(13_000)
    expect(bookBalanceAsOf(year(book), 'ない置き場所', '2026-04-11')).toBe(0)
  })
})

describe('出納帳', () => {
  it('最初の行は繰越。1行ごとに残高が出る', () => {
    let book = newBook()
    book = expense(book, '2026-05-01', 1_500, 'ノート')
    book = income(book, '2026-04-10', 30_000, '前期の会費')
    book = deposit(book, '2026-04-12', 25_000)
    const ledger = buildLedger(year(book), cashId(book))!
    expect(ledger.title).toBe('現金出納帳')
    expect(ledger.rows.map((r) => [r.date, r.description, r.inflow, r.outflow, r.balance])).toEqual([
      ['2026-04-01', '前年度より繰越', null, null, 10_000],
      ['2026-04-10', '前期の会費', 30_000, null, 40_000],
      ['2026-04-12', '預け入れ', null, 25_000, 15_000],
      ['2026-05-01', 'ノート', null, 1_500, 13_500],
    ])
    expect(ledger.inflowTotal).toBe(30_000)
    expect(ledger.outflowTotal).toBe(26_500)
    expect(ledger.closing).toBe(13_500)
    expect(ledger.rows[1].categoryName).toBe('会費')
    expect(ledger.rows[3].receiptNo).toBe('1')
  })
  it('移動は、両方の出納帳に出る。相手の名前が入る', () => {
    let book = newBook()
    book = deposit(book, '2026-04-12', 5_000)
    book = withdraw(book, '2026-04-20', 2_000)
    const cash = buildLedger(year(book), cashId(book))!
    const bank = buildLedger(year(book), bankId(book))!
    expect(bank.title).toBe('預金出納帳（普通預金）')
    expect(cash.rows[1]).toMatchObject({ categoryName: '預け入れ（普通預金へ）', outflow: 5_000, inflow: null })
    expect(bank.rows[1]).toMatchObject({ categoryName: '預け入れ（現金から）', inflow: 5_000, outflow: null })
    expect(cash.rows[2]).toMatchObject({ categoryName: '引き出し（普通預金から）', inflow: 2_000 })
    expect(bank.rows[2]).toMatchObject({ categoryName: '引き出し（現金へ）', outflow: 2_000 })
  })
  it('ほかの置き場所の取引は出ない', () => {
    let book = newBook()
    book = expense(book, '2026-05-01', 1_500)
    expect(buildLedger(year(book), bankId(book))!.rows).toHaveLength(1)
    expect(buildLedger(year(book), 'ない置き場所')).toBeNull()
  })
  it('置き場所の数だけ出納帳ができる。現金が先頭', () => {
    const book = newBook({ bankAccounts: [{ name: '普通預金' }, { name: '定期預金' }, { name: 'ゆうちょ' }] })
    expect(buildLedgers(year(book)).map((l) => l.title)).toEqual(['現金出納帳', '預金出納帳（普通預金）', '預金出納帳（定期預金）', '預金出納帳（ゆうちょ）'])
  })
})

describe('残高がマイナスになる日', () => {
  it('マイナスになった日を知らせる', () => {
    let book = newBook({ cashOpening: 1_000 })
    book = expense(book, '2026-04-10', 3_000)
    expect(negativeBalanceDays(year(book))).toEqual([{ accountId: cashId(book), accountName: '現金', date: '2026-04-10', balance: -2_000 }])
    const issues = listYearIssues(year(book))
    expect(issues.map((i) => i.code)).toEqual(['negative-balance'])
    expect(issues[0].message).toContain('現金')
    expect(issues[0].message).toContain('△2,000円')
    expect(issues[0].accountId).toBe(cashId(book))
  })
  it('ちょうど 0円 は、マイナスではない', () => {
    let book = newBook({ cashOpening: 3_000 })
    book = expense(book, '2026-04-10', 3_000)
    expect(negativeBalanceDays(year(book))).toEqual([])
  })
  it('同じ日のうちに引き出して埋まれば、入れた順が逆でも知らせない', () => {
    let book = newBook({ cashOpening: 1_000 })
    book = expense(book, '2026-04-10', 3_000) // 先に支払いを入れた
    book = withdraw(book, '2026-04-10', 5_000) // あとから、同じ日の引き出しを入れた
    expect(negativeBalanceDays(year(book))).toEqual([])
  })
  it('次の日に埋まる場合は、マイナスだった日だけを知らせる', () => {
    let book = newBook({ cashOpening: 1_000 })
    book = expense(book, '2026-04-10', 3_000)
    book = expense(book, '2026-04-11', 500)
    book = withdraw(book, '2026-04-12', 5_000)
    expect(negativeBalanceDays(year(book)).map((d) => [d.date, d.balance])).toEqual([
      ['2026-04-10', -2_000],
      ['2026-04-11', -2_500],
    ])
    // 一覧には、置き場所ごとに1つだけ出す。いちばん少ない日の金額を言う
    const issues = listYearIssues(year(book))
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toContain('△2,500円')
  })
  it('口座のマイナスも見る', () => {
    let book = newBook({ bankAccounts: [{ name: '普通預金', openingBalance: 1_000 }] })
    book = withdraw(book, '2026-04-10', 1_001)
    expect(negativeBalanceDays(year(book))).toEqual([{ accountId: bankId(book), accountName: '普通預金', date: '2026-04-10', balance: -1 }])
  })
})

describe('その日の終わりの残高（endOfDayBalance）', () => {
  it('取引のない日は、その前の取引の日の残高。最初の取引より前は、年度はじめの残高', () => {
    let book = newBook() // 現金 10,000円、普通預金 100,000円
    book = expense(book, '2026-05-10', 3_000)
    book = expense(book, '2026-05-10', 500)
    book = withdraw(book, '2026-06-01', 20_000)
    const at = endOfDayBalance(year(book))
    const cash = cashId(book)
    const bank = bankId(book)
    expect(at(cash, '2026-04-01')).toBe(10_000)
    expect(at(cash, '2026-05-09')).toBe(10_000)
    // 同じ日の取引は、すべて入れたあとの残高
    expect(at(cash, '2026-05-10')).toBe(6_500)
    expect(at(cash, '2026-05-31')).toBe(6_500)
    expect(at(cash, '2026-06-01')).toBe(26_500)
    expect(at(cash, '2027-03-31')).toBe(26_500)
    expect(at(bank, '2026-05-31')).toBe(100_000)
    expect(at(bank, '2026-06-01')).toBe(80_000)
    // ない置き場所は 0
    expect(at('nai', '2026-06-01')).toBe(0)
  })
  it('どの日でも、bookBalanceAsOf と同じ答えになる', () => {
    let book = newBook()
    book = expense(book, '2026-04-03', 1_200)
    book = income(book, '2026-04-20', 48_000)
    book = withdraw(book, '2026-07-05', 30_000)
    book = expense(book, '2026-07-05', 45_000)
    const at = endOfDayBalance(year(book))
    for (const a of year(book).accounts) {
      for (const date of ['2026-03-31', '2026-04-01', '2026-04-03', '2026-04-19', '2026-04-20', '2026-07-04', '2026-07-05', '2026-12-31']) {
        expect(at(a.id, date), `${a.name} ${date}`).toBe(bookBalanceAsOf(year(book), a.id, date))
      }
    }
  })
})

describe('年度の外の日付', () => {
  it('年度の初日と末日は中。前の日と次の日は外', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-04-01', 100, '初日')
    book = expense(book, '2027-03-31', 100, '末日')
    expect(transactionsOutsideYear(year(book))).toEqual([])
    book = expense(book, '2026-03-31', 100, '前の日')
    book = expense(book, '2027-04-01', 100, '次の日')
    expect(transactionsOutsideYear(year(book)).map((t) => t.description)).toEqual(['前の日', '次の日'])
    const issue = listYearIssues(year(book)).find((i) => i.code === 'outside-year')!
    expect(issue.message).toContain('2件')
    expect(issue.message).toContain('令和8年4月1日〜令和9年3月31日')
    expect(issue.transactionIds).toHaveLength(2)
  })
  it('年度の外の取引も、合計には入る（入れたものを勝手に消さない）', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2027-04-01', 100)
    expect(summarizeYear(year(book)).expenseTotal).toBe(100)
  })
  it('今日を渡すと、先の日付の取引を知らせる', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-11-14', 100)
    book = expense(book, '2026-11-15', 100)
    expect(listYearIssues(year(book)).some((i) => i.code === 'future-date')).toBe(false)
    const issue = listYearIssues(year(book), { today: '2026-11-14' }).find((i) => i.code === 'future-date')!
    expect(issue.transactionIds).toHaveLength(1)
  })
})

describe('領収書の番号', () => {
  it('支出には、いちばん大きい番号の次を振る。収入と移動には振らない', () => {
    let book = newBook({ cashOpening: 100_000 })
    expect(nextReceiptNo(year(book))).toBe('1')
    expect(defaultReceiptNo(year(book), 'expense')).toBe('1')
    expect(defaultReceiptNo(year(book), 'income')).toBe('')
    expect(defaultReceiptNo(year(book), 'transfer')).toBe('')
    book = expense(book, '2026-04-10', 100)
    book = income(book, '2026-04-10', 100)
    book = deposit(book, '2026-04-10', 100)
    book = expense(book, '2026-04-11', 100)
    expect(year(book).transactions.map((t) => t.receiptNo)).toEqual(['1', '', '', '2'])
  })
  it('番号を変えたら、その次から続く。数字でない番号は数えない', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = add(book, { date: '2026-04-10', kind: 'expense', categoryId: catId(book, 'expense', '事務費'), accountId: cashId(book), amount: 100, receiptNo: '10' })
    book = add(book, { date: '2026-04-10', kind: 'expense', categoryId: catId(book, 'expense', '事務費'), accountId: cashId(book), amount: 100, receiptNo: 'A-99' })
    book = expense(book, '2026-04-11', 100)
    expect(year(book).transactions.map((t) => t.receiptNo)).toEqual(['10', 'A-99', '11'])
  })
  it('途中の取引を消しても、番号は詰めない（使った番号を、別の領収書に振り直さない）', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-04-10', 100)
    book = expense(book, '2026-04-11', 100)
    book = expense(book, '2026-04-12', 100)
    book = ok(removeTransaction(book, year(book).id, year(book).transactions[1].id))
    book = expense(book, '2026-04-13', 100)
    expect(year(book).transactions.map((t) => t.receiptNo)).toEqual(['1', '3', '4'])
  })
  it('同じ番号が2つあると知らせる。空の番号どうしは、同じとみなさない', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-04-10', 100)
    book = income(book, '2026-04-10', 100)
    book = income(book, '2026-04-11', 100)
    expect(duplicateReceiptNos(year(book))).toEqual([])
    book = ok(updateTransaction(book, year(book).id, year(book).transactions[1].id, { receiptNo: '1' }))
    const dup = duplicateReceiptNos(year(book))
    expect(dup).toHaveLength(1)
    expect(dup[0].receiptNo).toBe('1')
    expect(dup[0].transactionIds).toHaveLength(2)
    expect(listYearIssues(year(book)).map((i) => i.code)).toEqual(['duplicate-receipt'])
  })
})

describe('残高の照合', () => {
  const base = () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000, '前期の会費')
    book = expense(book, '2026-04-20', 1_800, 'お茶代')
    book = deposit(book, '2026-04-25', 20_000)
    return book // 現金 18,200円、普通預金 120,000円
  }
  const rec = (book: Book, accountId: string, date: string, actual: number) =>
    ok(setReconciliation(book, year(book).id, accountId, { date, actual }))

  it('まだ確かめていない置き場所は「まだ」と出す。帳簿の残高は見せる', () => {
    const book = base()
    const r = reconcileYear(year(book))
    expect(r.allMatch).toBe(false)
    expect(r.uncheckedCount).toBe(2)
    expect(r.mismatchCount).toBe(0)
    expect(r.rows.map((x) => [x.name, x.status, x.bookBalance, x.actual, x.diff])).toEqual([
      ['現金', 'unchecked', 18_200, null, null],
      ['普通預金', 'unchecked', 120_000, null, null],
    ])
  })
  it('合っていれば「合っています」', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 18_200)
    book = rec(book, bankId(book), '2026-04-30', 120_000)
    const r = reconcileYear(year(book))
    expect(r.allMatch).toBe(true)
    expect(r.rows.map((x) => x.status)).toEqual(['match', 'match'])
    expect(r.rows[0].message).toBe('手元の現金と帳簿が合っています。')
    expect(r.rows[1].message).toBe('通帳の残高と帳簿が合っています。')
    expect(r.rows.every((x) => x.hints.length === 0)).toBe(true)
  })
  it('合わないと、いくら違うかを言う（少ないとき）', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 17_700)
    const row = reconcileYear(year(book)).rows[0]
    expect(row.status).toBe('short')
    expect(row.diff).toBe(-500)
    expect(row.message).toBe('手元の現金のほうが、帳簿より 500円 少ないです。')
    expect(row.hints[0]).toContain('入れ忘れた支出')
  })
  it('合わないと、いくら違うかを言う（多いとき）', () => {
    let book = base()
    book = rec(book, bankId(book), '2026-04-30', 120_012)
    const r = reconcileYear(year(book))
    const row = r.rows[1]
    expect(row.status).toBe('over')
    expect(row.diff).toBe(12)
    expect(row.message).toBe('通帳の残高のほうが、帳簿より 12円 多いです。')
    expect(row.hints[0]).toContain('入れ忘れた収入')
    expect(r.mismatchCount).toBe(1)
    expect(r.allMatch).toBe(false)
  })
  it('1円の差も見のがさない', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 18_199)
    expect(reconcileYear(year(book)).rows[0]).toMatchObject({ status: 'short', diff: -1 })
  })
  it('確かめた日までの取引だけで比べる（あとの日付の取引を入れても、結果は変わらない）', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-22', 38_200) // 預け入れ（4/25）の前
    expect(reconcileYear(year(book)).rows[0]).toMatchObject({ status: 'match', bookBalance: 38_200 })
    book = expense(book, '2026-05-10', 999)
    expect(reconcileYear(year(book)).rows[0]).toMatchObject({ status: 'match', bookBalance: 38_200 })
    // 確かめた日より前の日付の取引を足すと、合わなくなったことがわかる
    book = expense(book, '2026-04-15', 300)
    expect(reconcileYear(year(book)).rows[0]).toMatchObject({ status: 'over', diff: 300 })
  })
  it('差と同じ金額の取引があれば、手がかりとして出す', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 16_400) // お茶代 1,800円を二重に払ったような差
    const hints = reconcileYear(year(book)).rows[0].hints.join('\n')
    expect(hints).toContain('差と同じ金額（1,800円）の取引があります')
    expect(hints).toContain('4月20日「お茶代」')
  })
  it('収入と支出を逆に入れたような差（ちょうど2倍）なら、手がかりとして出す', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 14_600) // 1,800円の2倍 = 3,600円少ない
    const hints = reconcileYear(year(book)).rows[0].hints.join('\n')
    expect(hints).toContain('差の半分の金額（1,800円）')
    expect(hints).toContain('逆に入れていないか')
  })
  it('差が9で割り切れるなら、桁や数字の入れかわりを疑う', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 18_200 - 16_200) // 1,800 を 18,000 と入れたときの差
    expect(reconcileYear(year(book)).rows[0].hints.join('\n')).toContain('9で割り切れます')
    book = rec(book, cashId(book), '2026-04-30', 18_200 - 500)
    expect(reconcileYear(year(book)).rows[0].hints.join('\n')).not.toContain('9で割り切れます')
  })
  it('2つの置き場所の差がちょうど逆なら、移動の入れ忘れを疑う', () => {
    let book = base()
    book = rec(book, cashId(book), '2026-04-30', 8_200) // 現金が 10,000円 少ない
    book = rec(book, bankId(book), '2026-04-30', 130_000) // 口座が 10,000円 多い
    const r = reconcileYear(year(book))
    expect(r.rows[0].hints[0]).toContain('「普通預金」の差と、ちょうど逆')
    expect(r.rows[1].hints[0]).toContain('「現金」の差と、ちょうど逆')
  })
})

describe('予算の収入と支出の差', () => {
  it('前年度繰越金を入れた収入の予算 − 支出の予算', () => {
    let book = newBook() // 前年度繰越金 110,000円
    book = ok(updateCategory(book, year(book).id, catId(book, 'income', '会費'), { budget: 36_000 }))
    book = ok(updateCategory(book, year(book).id, catId(book, 'expense', '事務費'), { budget: 6_000 }))
    expect(summarizeYear(year(book))).toMatchObject({ carryoverBudget: 110_000, incomeBudgetTotal: 36_000, expenseBudgetTotal: 6_000, budgetGap: 140_000 })
    book = ok(updateCategory(book, year(book).id, catId(book, 'expense', '予備費'), { budget: 140_000 }))
    expect(summarizeYear(year(book)).budgetGap).toBe(0)
    // 前年度繰越金の予算額を別に決めていれば、それで比べる
    book = ok(updateYear(book, year(book).id, { carryoverBudget: 100_000 }))
    expect(summarizeYear(year(book))).toMatchObject({ carryoverBudget: 100_000, budgetGap: -10_000 })
  })
})

describe('取引の一覧', () => {
  const base = () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-05-01', 1_500, 'ノート')
    book = income(book, '2026-04-10', 30_000, '前期の会費 １班')
    book = deposit(book, '2026-04-12', 25_000)
    book = expense(book, '2027-04-02', 12_000, '年度の外')
    return book
  }
  it('日付の順に、科目と置き場所の名前を付けて返す', () => {
    const views = transactionViews(year(base()))
    expect(views.map((v) => [v.transaction.date, v.categoryName, v.accountText, v.outsideYear])).toEqual([
      ['2026-04-10', '会費', '現金', false],
      ['2026-04-12', '預け入れ', '現金 → 普通預金', false],
      ['2026-05-01', '事務費', '現金', false],
      ['2027-04-02', '事務費', '現金', true],
    ])
    expect(views[1]).toMatchObject({ accountName: '現金', toAccountName: '普通預金' })
    expect(views[0].toAccountName).toBe('')
  })
  it('取引がなければ空', () => {
    expect(transactionViews(year(newBook()))).toEqual([])
    expect(filterTransactions([], { text: 'x' })).toEqual([])
  })
  it('文字でさがせる（内容、科目、領収書の番号、金額。全角と半角は区別しない）', () => {
    const book = base()
    const views = transactionViews(year(book))
    const found = (text: string) => filterTransactions(views, { text }).map((v) => v.transaction.description)
    expect(found('ノート')).toEqual(['ノート'])
    expect(found('1班')).toEqual(['前期の会費 １班'])
    expect(found('１班')).toEqual(['前期の会費 １班'])
    expect(found('事務費')).toEqual(['ノート', '年度の外'])
    expect(found('12,000')).toEqual(['年度の外'])
    expect(found('１２０００')).toEqual(['年度の外'])
    expect(found('預け入れ')).toEqual(['預け入れ'])
    expect(found('ないもの')).toEqual([])
    expect(found('')).toHaveLength(4)
  })
  it('種類、科目、置き場所、期間でしぼれる', () => {
    const book = base()
    const views = transactionViews(year(book))
    const dates = (filter: Parameters<typeof filterTransactions>[1]) => filterTransactions(views, filter).map((v) => v.transaction.date)
    expect(dates({ kind: 'transfer' })).toEqual(['2026-04-12'])
    expect(dates({ categoryId: catId(book, 'income', '会費') })).toEqual(['2026-04-10'])
    // 移動は、元の置き場所でも、先の置き場所でも出る
    expect(dates({ accountId: bankId(book) })).toEqual(['2026-04-12'])
    expect(dates({ accountId: cashId(book) })).toHaveLength(4)
    // 期間は、両端の日を含む
    expect(dates({ from: '2026-04-12', to: '2026-05-01' })).toEqual(['2026-04-12', '2026-05-01'])
    expect(dates({ from: '2026-04-13', to: '2026-04-30' })).toEqual([])
    expect(dates({ kind: 'expense', text: 'ノート', accountId: cashId(book) })).toEqual(['2026-05-01'])
  })
  it('内容の手がかり: その科目で前に入れた内容を、新しい順に、重なりなく出す', () => {
    let book = newBook({ cashOpening: 100_000 })
    book = expense(book, '2026-04-10', 100, 'コピー用紙')
    book = expense(book, '2026-06-01', 100, '切手')
    book = expense(book, '2026-05-01', 100, 'コピー用紙')
    book = expense(book, '2026-05-02', 100, '')
    book = income(book, '2026-05-03', 100, '前期の会費')
    const id = catId(book, 'expense', '事務費')
    expect(descriptionSuggestions(book, id)).toEqual(['切手', 'コピー用紙'])
    expect(descriptionSuggestions(book, id, 1)).toEqual(['切手'])
    expect(descriptionSuggestions(book, 'ない科目')).toEqual([])
    // 繰り越したあとの新しい年度でも、前の年度の書き方が出る
    book = ok(carryForward(book))
    expect(descriptionSuggestions(book, id)).toEqual(['切手', 'コピー用紙'])
    book = expense(book, '2027-04-10', 100, 'インク')
    expect(descriptionSuggestions(book, id)).toEqual(['インク', '切手', 'コピー用紙'])
  })
})
