import { describe, expect, it } from 'vitest'
import {
  addBankAccount,
  addCategory,
  addTransaction,
  checkTransaction,
  createBook,
  moveCategory,
  randomId,
  removeAccount,
  removeCategory,
  removeTransaction,
  setLicenseKey,
  setNextBudget,
  setReconciliation,
  updateAccount,
  updateAudit,
  updateCategory,
  updateHandover,
  updateOfficers,
  updateOrg,
  updateTransaction,
  updateYear,
  type TransactionInput,
} from './book'
import { isYearLocked, summarizeYear } from './calc'
import { carryForward } from './carry'
import { ORG_KINDS } from './templates'
import { add, bankId, cashId, catId, deepFreeze, deposit, expense, failCode, income, newBook, ok, seqIds, withdraw, year } from './test-helpers'
import { LIMITS, type Book } from './types'
import { checkYearChain, isSafeId } from './validate'

describe('createBook', () => {
  it('団体の種類に合った科目のひな形が入る。予算は 0円 から', () => {
    const book = newBook()
    const y = year(book)
    expect(book.orgName).toBe('テスト町内会')
    expect(book.revision).toBe(0)
    expect(book.licenseKey).toBe('')
    expect(book.years).toHaveLength(1)
    expect(y.categories.filter((c) => c.side === 'income').map((c) => c.name)).toEqual(['会費', '市区町村の補助金', '資源回収の報奨金', '雑収入'])
    expect(y.categories.some((c) => c.side === 'expense' && c.name === '予備費')).toBe(true)
    expect(y.categories.every((c) => c.budget === 0 && c.note === '')).toBe(true)
    expect(y.transactions).toEqual([])
  })
  it('会計年度は、始まりの日から1年。呼び名は和暦', () => {
    const y = year(newBook())
    expect(y.startDate).toBe('2026-04-01')
    expect(y.endDate).toBe('2027-03-31')
    expect(y.label).toBe('令和8年度')
  })
  it('終わりの日と呼び名は、自分で決められる', () => {
    const y = year(newBook({ startDate: '2026-01-01', endDate: '2026-12-31', label: '2026年度' }))
    expect([y.startDate, y.endDate, y.label]).toEqual(['2026-01-01', '2026-12-31', '2026年度'])
  })
  it('現金が先頭。預金口座は 0〜3つ', () => {
    expect(year(newBook()).accounts.map((a) => [a.kind, a.name, a.openingBalance])).toEqual([
      ['cash', '現金', 10_000],
      ['bank', '普通預金', 100_000],
    ])
    expect(year(newBook({ bankAccounts: [] })).accounts).toHaveLength(1)
    expect(year(newBook({ bankAccounts: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })).accounts).toHaveLength(4)
    const input = { orgName: 'x', orgKind: 'circle' as const, startDate: '2026-04-01' }
    expect(failCode(createBook({ ...input, bankAccounts: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] }))).toBe('limit')
    // 何も渡さなければ、普通預金が1つできる
    expect(ok(createBook(input)).years[0].accounts.map((a) => a.name)).toEqual(['現金', '普通預金'])
  })
  it('どの種類でも作れる。役の呼び名と、監査の署名欄の数が入る', () => {
    for (const { kind } of ORG_KINDS) {
      const book = ok(createBook({ orgName: 'テスト', orgKind: kind, startDate: '2026-04-01' }))
      expect(book.roleNames.treasurer).toBe('会計')
      expect(year(book).officers.auditors.length).toBeGreaterThanOrEqual(1)
      expect(year(book).categories.some((c) => c.side === 'income')).toBe(true)
      expect(year(book).categories.some((c) => c.side === 'expense')).toBe(true)
    }
    expect(ok(createBook({ orgName: 'テスト', orgKind: 'circle', startDate: '2026-04-01' })).roleNames.president).toBe('代表')
  })
  it('正しくない入力は、理由を言って断る', () => {
    const base = { orgName: 'テスト', orgKind: 'chonaikai' as const, startDate: '2026-04-01' }
    expect(failCode(createBook({ ...base, orgName: '   ' }))).toBe('required')
    expect(failCode(createBook({ ...base, orgName: 'あ'.repeat(LIMITS.nameLength + 1) }))).toBe('too-long')
    expect(failCode(createBook({ ...base, startDate: '2026-02-30' }))).toBe('invalid-date')
    expect(failCode(createBook({ ...base, endDate: '2026-03-31' }))).toBe('invalid-period')
    expect(failCode(createBook({ ...base, cashOpening: -1 }))).toBe('invalid-amount')
    expect(failCode(createBook({ ...base, cashOpening: 100.5 }))).toBe('invalid-amount')
    expect(failCode(createBook({ ...base, bankAccounts: [{ name: '普通預金', openingBalance: 0.1 }] }))).toBe('invalid-amount')
    expect(failCode(createBook({ ...base, bankAccounts: [{ name: '' }] }))).toBe('required')
    expect(failCode(createBook({ ...base, bankAccounts: [{ name: '現金' }] }))).toBe('duplicate-name')
    expect(failCode(createBook({ ...base, bankAccounts: [{ name: 'A' }, { name: 'A' }] }))).toBe('duplicate-name')
  })
  it('年度が1日だけでも作れる', () => {
    expect(year(newBook({ startDate: '2026-04-01', endDate: '2026-04-01' })).endDate).toBe('2026-04-01')
  })
  it('id は、どれも重ならない', () => {
    const y = year(newBook())
    const ids = [y.id, ...y.accounts.map((a) => a.id), ...y.categories.map((c) => c.id), ...y.handover.custody.map((c) => c.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('randomId は、id に使える文字だけでできている', () => {
    const ids = Array.from({ length: 200 }, randomId)
    expect(ids.every((id) => isSafeId(id) && id.length === 10)).toBe(true)
    expect(new Set(ids).size).toBe(200)
  })
  it('id を作る関数が同じ id ばかり返しても、重ならないものを選ぶ', () => {
    let n = 0
    const sticky = () => `x${Math.floor(n++ / 3)}` // 3回ずつ同じ id を返す
    const y = year(ok(createBook({ orgName: 'テスト', orgKind: 'other', startDate: '2026-04-01' }, sticky)))
    const ids = [y.id, ...y.accounts.map((a) => a.id), ...y.categories.map((c) => c.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('元の帳簿を書きかえない', () => {
  it('どの操作も、凍らせた帳簿に対して動く。うまくいくたびに revision が1つ増える', () => {
    let book = deepFreeze(newBook())
    const step = (next: Book) => {
      expect(next.revision).toBe(book.revision + 1)
      book = deepFreeze(next)
    }
    const y = () => year(book).id
    step(ok(updateOrg(book, { orgName: '新しい名前', diffStyle: 'budget-minus-actual', roleNames: { auditor: '会計監査' } })))
    step(ok(updateYear(book, y(), { label: '2026年度', reportDate: '2027-04-10', carryoverBudget: 100_000 })))
    step(ok(updateOfficers(book, y(), { president: '山田', auditors: ['佐藤'] })))
    step(ok(addBankAccount(book, y(), { name: '定期預金', openingBalance: 50_000 })))
    step(ok(updateAccount(book, y(), bankId(book, '定期預金'), { name: '積立', openingBalance: 60_000 })))
    step(ok(addCategory(book, y(), { side: 'expense', name: '修繕費', budget: 5_000 })))
    step(ok(updateCategory(book, y(), catId(book, 'expense', '修繕費'), { budget: 6_000, note: '集会所の修理' })))
    step(ok(moveCategory(book, y(), catId(book, 'expense', '修繕費'), 'up')))
    step(income(book, '2026-04-10', 30_000))
    step(expense(book, '2026-04-11', 500))
    step(deposit(book, '2026-04-12', 20_000))
    step(ok(updateTransaction(book, y(), year(book).transactions[1].id, { amount: 600 })))
    step(ok(removeTransaction(book, y(), year(book).transactions[1].id)))
    step(ok(setReconciliation(book, y(), cashId(book), { date: '2026-04-30', actual: 20_000 })))
    step(ok(updateAudit(book, y(), { date: '2027-04-12' })))
    step(ok(setNextBudget(book, y(), catId(book, 'income', '会費'), 40_000)))
    step(ok(updateHandover(book, y(), { memo: 'よろしくお願いします', successor: '次の人' })))
    step(ok(setLicenseKey(book, 'abc.def')))
    step(ok(removeCategory(book, y(), catId(book, 'expense', '修繕費'))))
    step(ok(carryForward(book)))
    expect(book.years).toHaveLength(2)
  })
  it('断られたときは、何も変わらない', () => {
    const book = deepFreeze(newBook())
    const r = addTransaction(book, year(book).id, { date: '2026-04-10', kind: 'expense', categoryId: null, accountId: cashId(book), amount: 0 })
    expect(r.ok).toBe(false)
    expect(book.revision).toBe(0)
    expect(year(book).transactions).toEqual([])
  })
})

describe('取引を入れる', () => {
  const input = (book: Book, patch: Partial<TransactionInput> = {}): TransactionInput => ({
    date: '2026-04-10',
    kind: 'expense',
    categoryId: catId(book, 'expense', '事務費'),
    accountId: cashId(book),
    amount: 1_000,
    description: 'ノート',
    ...patch,
  })
  const tryAdd = (book: Book, patch: Partial<TransactionInput>) => addTransaction(book, year(book).id, input(book, patch))

  it('収入・支出・移動を入れられる', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    book = expense(book, '2026-04-11', 500)
    book = deposit(book, '2026-04-12', 20_000)
    const [a, b, c] = year(book).transactions
    expect(a).toMatchObject({ kind: 'income', toAccountId: null, amount: 30_000 })
    expect(b).toMatchObject({ kind: 'expense', toAccountId: null, amount: 500 })
    expect(c).toMatchObject({ kind: 'transfer', categoryId: null, accountId: cashId(book), toAccountId: bankId(book) })
  })
  it('金額は、1円以上の整数だけ', () => {
    const book = newBook()
    expect(tryAdd(book, { amount: 1 }).ok).toBe(true)
    expect(tryAdd(book, { amount: LIMITS.maxAmount }).ok).toBe(true)
    for (const amount of [0, -1, -1000, 0.5, 1.5, 100.01, Number.NaN, Number.POSITIVE_INFINITY, LIMITS.maxAmount + 1]) {
      expect(failCode(tryAdd(book, { amount })), String(amount)).toBe('invalid-amount')
    }
    // 画面から文字のまま渡されても、数として扱わずに断る
    expect(failCode(tryAdd(book, { amount: '1000' as unknown as number }))).toBe('invalid-amount')
    expect(failCode(tryAdd(book, { amount: null as unknown as number }))).toBe('invalid-amount')
  })
  it('日付は、実在する日だけ', () => {
    const book = newBook()
    expect(failCode(tryAdd(book, { date: '' }))).toBe('required')
    expect(failCode(tryAdd(book, { date: '2026-02-30' }))).toBe('invalid-date')
    expect(failCode(tryAdd(book, { date: '2026/4/10' }))).toBe('invalid-date')
  })
  it('年度の外の日付でも、入れることはできる（知らせるのは checkTransaction）', () => {
    const book = newBook()
    expect(tryAdd(book, { date: '2027-04-01' }).ok).toBe(true)
  })
  it('科目がいる。収入に支出の科目（その逆も）は選べない', () => {
    const book = newBook()
    expect(failCode(tryAdd(book, { categoryId: null }))).toBe('required')
    expect(failCode(tryAdd(book, { categoryId: 'ない科目' }))).toBe('required')
    expect(failCode(tryAdd(book, { categoryId: catId(book, 'income', '会費') }))).toBe('side-mismatch')
    expect(failCode(tryAdd(book, { kind: 'income' }))).toBe('side-mismatch')
  })
  it('置き場所がいる', () => {
    const book = newBook()
    expect(failCode(tryAdd(book, { accountId: 'ない置き場所' }))).toBe('required')
  })
  it('移動は、元と先がいる。同じ置き場所へは移せない。科目は付かない', () => {
    const book = newBook()
    expect(failCode(tryAdd(book, { kind: 'transfer', toAccountId: null }))).toBe('required')
    expect(failCode(tryAdd(book, { kind: 'transfer', toAccountId: 'ない置き場所' }))).toBe('required')
    expect(failCode(tryAdd(book, { kind: 'transfer', toAccountId: cashId(book) }))).toBe('same-account')
    // 科目を渡しても、移動には付けない
    const moved = ok(tryAdd(book, { kind: 'transfer', toAccountId: bankId(book) }))
    expect(year(moved).transactions[0].categoryId).toBeNull()
    expect(summarizeYear(year(moved)).expenseTotal).toBe(0)
  })
  it('収入・支出に、移動の入れ先は付かない', () => {
    const book = ok(tryAdd(newBook(), { toAccountId: 'なんでも' }))
    expect(year(book).transactions[0].toAccountId).toBeNull()
  })
  it('内容は空でもよい。前後の空白は取り、改行は空白にする。長すぎるものは断る', () => {
    const book = newBook()
    expect(year(ok(tryAdd(book, { description: undefined }))).transactions[0].description).toBe('')
    expect(year(ok(tryAdd(book, { description: '  お茶\n代  ' }))).transactions[0].description).toBe('お茶 代')
    expect(tryAdd(book, { description: 'あ'.repeat(LIMITS.descriptionLength) }).ok).toBe(true)
    expect(failCode(tryAdd(book, { description: 'あ'.repeat(LIMITS.descriptionLength + 1) }))).toBe('too-long')
    expect(failCode(tryAdd(book, { receiptNo: '1'.repeat(LIMITS.receiptNoLength + 1) }))).toBe('too-long')
  })
  it('領収書の番号は、渡せばそのまま（空も）。渡さなければ自動', () => {
    let book = newBook()
    book = ok(tryAdd(book, { receiptNo: '' }))
    book = ok(tryAdd(book, { receiptNo: ' 7 ' }))
    book = ok(tryAdd(book, {}))
    expect(year(book).transactions.map((t) => t.receiptNo)).toEqual(['', '7', '8'])
  })
  it('知らない種類は断る', () => {
    const book = newBook()
    expect(failCode(tryAdd(book, { kind: 'refund' as unknown as 'expense' }))).toBe('invalid-kind')
  })
  it('ない年度には入れられない', () => {
    const book = newBook()
    expect(failCode(addTransaction(book, 'ない年度', input(book)))).toBe('year-not-found')
  })
  it('1つの年度の上限をこえては入れられない', () => {
    const book = newBook()
    const one = year(ok(tryAdd(book, {}))).transactions[0]
    const full: Book = {
      ...book,
      years: [{ ...year(book), transactions: Array.from({ length: LIMITS.maxTransactionsPerYear }, (_, i) => ({ ...one, id: `x${i}` })) }],
    }
    expect(failCode(tryAdd(full, {}))).toBe('limit')
  })
})

describe('取引を直す・消す', () => {
  it('渡した項目だけが変わる', () => {
    let book = expense(newBook(), '2026-04-10', 500, 'ノート')
    const id = year(book).transactions[0].id
    book = ok(updateTransaction(book, year(book).id, id, { amount: 800 }))
    expect(year(book).transactions[0]).toMatchObject({ id, amount: 800, description: 'ノート', date: '2026-04-10', receiptNo: '1' })
    book = ok(updateTransaction(book, year(book).id, id, { description: '', receiptNo: '' }))
    expect(year(book).transactions[0]).toMatchObject({ amount: 800, description: '', receiptNo: '' })
  })
  it('種類を移動に変えると科目が外れ、支出に戻すには科目がいる', () => {
    let book = expense(newBook(), '2026-04-10', 500)
    const id = year(book).transactions[0].id
    expect(failCode(updateTransaction(book, year(book).id, id, { kind: 'transfer' }))).toBe('required') // 入れ先がない
    book = ok(updateTransaction(book, year(book).id, id, { kind: 'transfer', toAccountId: bankId(book) }))
    expect(year(book).transactions[0]).toMatchObject({ kind: 'transfer', categoryId: null, toAccountId: bankId(book) })
    expect(summarizeYear(year(book)).expenseTotal).toBe(0)
    expect(failCode(updateTransaction(book, year(book).id, id, { kind: 'expense' }))).toBe('required') // 科目がない
    book = ok(updateTransaction(book, year(book).id, id, { kind: 'expense', categoryId: catId(book, 'expense', '雑費') }))
    expect(year(book).transactions[0]).toMatchObject({ kind: 'expense', toAccountId: null })
    expect(summarizeYear(year(book)).expenseTotal).toBe(500)
  })
  it('直すときも、入れるときと同じ確かめをする', () => {
    const book = expense(newBook(), '2026-04-10', 500)
    const id = year(book).transactions[0].id
    expect(failCode(updateTransaction(book, year(book).id, id, { amount: 0 }))).toBe('invalid-amount')
    expect(failCode(updateTransaction(book, year(book).id, id, { date: '2026-13-01' }))).toBe('invalid-date')
    expect(failCode(updateTransaction(book, year(book).id, id, { kind: 'income' }))).toBe('side-mismatch')
    expect(failCode(updateTransaction(book, year(book).id, 'ない取引', { amount: 1 }))).toBe('not-found')
  })
  it('消せる。ない取引は断る', () => {
    let book = expense(newBook(), '2026-04-10', 500)
    const id = year(book).transactions[0].id
    book = ok(removeTransaction(book, year(book).id, id))
    expect(year(book).transactions).toEqual([])
    expect(failCode(removeTransaction(book, year(book).id, id))).toBe('not-found')
  })
})

describe('checkTransaction（入れる前の確かめ）', () => {
  const base = (book: Book, patch: Partial<TransactionInput> = {}): TransactionInput => ({
    date: '2026-04-10',
    kind: 'expense',
    categoryId: catId(book, 'expense', '事務費'),
    accountId: cashId(book),
    amount: 1_000,
    description: 'ノート',
    ...patch,
  })
  const codes = (book: Book, patch: Partial<TransactionInput>, options = {}) => {
    const r = checkTransaction(book, year(book).id, base(book, patch), options)
    return { errors: r.errors.map((e) => e.code), warnings: r.warnings.map((w) => w.code) }
  }

  it('問題がなければ、どちらも空', () => {
    expect(codes(newBook(), {})).toEqual({ errors: [], warnings: [] })
  })
  it('まちがいは、入力欄ごとにすべて返す', () => {
    const book = newBook()
    const r = checkTransaction(book, year(book).id, { date: '', kind: 'expense', categoryId: null, accountId: '', amount: 0 })
    expect(r.errors.map((e) => e.field).sort()).toEqual(['accountId', 'amount', 'categoryId', 'date'])
    expect(r.errors.every((e) => e.message.length > 0)).toBe(true)
    expect(r.warnings).toEqual([])
  })
  it('年度の外の日付を知らせる（初日・末日は中、その前後は外）', () => {
    const book = newBook()
    expect(codes(book, { date: '2026-04-01' }).warnings).toEqual([])
    expect(codes(book, { date: '2027-03-31' }).warnings).toEqual([])
    expect(codes(book, { date: '2026-03-31' }).warnings).toEqual(['outside-year'])
    expect(codes(book, { date: '2027-04-01' }).warnings).toEqual(['outside-year'])
    const r = checkTransaction(book, year(book).id, base(book, { date: '2025-04-10' }))
    expect(r.errors).toEqual([])
    expect(r.warnings[0].message).toContain('令和8年4月1日〜令和9年3月31日')
    expect(r.warnings[0].field).toBe('date')
    // 年度の終わりより先の日付には、「次の年度の取引は、繰り越してから入れる」と案内する（前の日付には、出さない）
    const later = checkTransaction(book, year(book).id, base(book, { date: '2027-04-05' })).warnings[0].message
    expect(later).toContain('繰り越してから')
    expect(r.warnings[0].message).not.toContain('繰り越してから')
  })
  it('今日を渡すと、先の日付を知らせる', () => {
    const book = newBook()
    expect(codes(book, { date: '2026-11-15' }, { today: '2026-11-14' }).warnings).toEqual(['future-date'])
    expect(codes(book, { date: '2026-11-14' }, { today: '2026-11-14' }).warnings).toEqual([])
  })
  it('残高がマイナスになるなら知らせる。ちょうど 0円 なら知らせない', () => {
    const book = newBook() // 現金 10,000円
    expect(codes(book, { amount: 10_000 }).warnings).toEqual([])
    expect(codes(book, { amount: 10_001 }).warnings).toEqual(['negative-balance'])
    const r = checkTransaction(book, year(book).id, base(book, { amount: 12_000 }))
    expect(r.warnings[0].message).toContain('「現金」')
    expect(r.warnings[0].message).toContain('△2,000円')
  })
  it('あとの日付の取引がマイナスになる場合も知らせる', () => {
    let book = newBook()
    book = expense(book, '2026-06-01', 9_000) // 6/1 に残り 1,000円
    // 5/1 に 2,000円 使うと、5/1 は足りるが、6/1 にマイナスになる
    const r = checkTransaction(book, year(book).id, base(book, { date: '2026-05-01', amount: 2_000 }))
    expect(r.warnings.map((w) => w.code)).toEqual(['negative-balance'])
    expect(r.warnings[0].message).toContain('令和8年6月1日')
  })
  it('同じ日に入金があって足りるなら、知らせない', () => {
    let book = newBook()
    book = withdraw(book, '2026-05-01', 50_000)
    expect(codes(book, { date: '2026-05-01', amount: 40_000 }).warnings).toEqual([])
  })
  it('移動で、出した元がマイナスになるなら知らせる。収入では知らせない', () => {
    const book = newBook()
    expect(codes(book, { kind: 'transfer', toAccountId: bankId(book), amount: 10_001 }).warnings).toEqual(['negative-balance'])
    expect(codes(book, { kind: 'income', categoryId: catId(book, 'income', '会費'), amount: 999_999 }).warnings).toEqual([])
  })
  it('すでにマイナスの置き場所に収入を入れるときは、知らせない。支出を足すときは、知らせる', () => {
    const book = expense(newBook(), '2026-04-10', 15_000) // 現金が △5,000円
    expect(codes(book, { kind: 'income', categoryId: catId(book, 'income', '会費'), amount: 1_000, date: '2026-04-10' }).warnings).toEqual([])
    expect(codes(book, { amount: 1, date: '2026-04-10', description: '別のもの' }).warnings).toEqual(['negative-balance'])
    // 関係のない口座の取引では、知らせない
    expect(codes(book, { accountId: bankId(book), amount: 1_000 }).warnings).toEqual([])
  })
  it('すでにマイナスの置き場所があっても、残高を減らさない取引なら、別の日付で入れても知らせない', () => {
    const book = expense(newBook(), '2026-04-10', 15_000) // 現金が △5,000円
    const inc = { kind: 'income' as const, categoryId: catId(book, 'income', '会費'), amount: 1_000 }
    // 取引のない日（4/20）に収入を入れる。現金は △4,000円 に増えるだけなので、知らせない
    expect(codes(book, { ...inc, date: '2026-04-20' }).warnings).toEqual([])
    // 関係のない口座の取引を、取引のない日に入れても、現金のことは知らせない
    expect(codes(book, { accountId: bankId(book), amount: 1_000, date: '2026-04-20' }).warnings).toEqual([])
    // 別の日付でも、現金の支出を足すと、さらに減るので知らせる
    expect(codes(book, { amount: 1, date: '2026-04-20', description: '別のもの' }).warnings).toEqual(['negative-balance'])
    // マイナスの日より前の日付の収入で、マイナスが埋まるなら、知らせない
    expect(codes(book, { ...inc, amount: 5_000, date: '2026-04-05' }).warnings).toEqual([])
    // 埋まりきらなくても、減らしてはいないので、知らせない
    expect(codes(book, { ...inc, amount: 4_999, date: '2026-04-05' }).warnings).toEqual([])
  })
  it('収入を小さく直したせいで、あとの日にマイナスになる場合も知らせる', () => {
    let book = income(newBook({ cashOpening: 0 }), '2026-04-10', 30_000)
    book = expense(book, '2026-05-01', 20_000)
    const id = year(book).transactions[0].id
    const fix = { kind: 'income' as const, categoryId: catId(book, 'income', '会費'), date: '2026-04-10', description: '会費' }
    expect(codes(book, { ...fix, amount: 20_000 }, { ignoreTransactionId: id }).warnings).toEqual([])
    const r = checkTransaction(book, year(book).id, base(book, { ...fix, amount: 3_000 }), { ignoreTransactionId: id })
    expect(r.warnings.map((w) => w.code)).toEqual(['negative-balance'])
    expect(r.warnings[0].message).toContain('令和8年5月1日')
    expect(r.warnings[0].message).toContain('△17,000円')
  })
  it('同じ領収書の番号を知らせる', () => {
    const book = expense(newBook(), '2026-04-10', 500)
    expect(codes(book, { receiptNo: '1', description: '別のもの' }).warnings).toEqual(['duplicate-receipt'])
    expect(codes(book, { receiptNo: '2', description: '別のもの' }).warnings).toEqual([])
  })
  it('日付・科目・内容・金額が同じ取引があれば、二重入力かもしれないと知らせる', () => {
    const book = expense(newBook(), '2026-04-10', 500, 'ノート')
    expect(codes(book, { amount: 500, receiptNo: '' }).warnings).toEqual(['possible-duplicate'])
    // 内容が違えば、別の取引（同じ日に、同じ額の会費を班ごとに受け取ることはよくある）
    expect(codes(book, { amount: 500, description: 'えんぴつ', receiptNo: '' }).warnings).toEqual([])
    expect(codes(book, { amount: 501, receiptNo: '' }).warnings).toEqual([])
  })
  it('直しているときは、自分自身と比べない', () => {
    const book = expense(newBook(), '2026-04-10', 9_000, 'ノート')
    const id = year(book).transactions[0].id
    const same = { amount: 9_000, receiptNo: '1' }
    expect(codes(book, same).warnings.sort()).toEqual(['duplicate-receipt', 'negative-balance', 'possible-duplicate'])
    expect(codes(book, same, { ignoreTransactionId: id }).warnings).toEqual([])
  })
  it('ない年度、読むだけの年度', () => {
    const book = newBook()
    expect(checkTransaction(book, 'ない年度', base(book)).errors.map((e) => e.code)).toEqual(['year-not-found'])
    const carried = ok(carryForward(book))
    expect(checkTransaction(carried, carried.years[0].id, base(book)).errors.map((e) => e.code)).toEqual(['year-locked'])
  })
})

describe('科目', () => {
  it('足すと、その部のいちばん下に入る', () => {
    let book = newBook()
    book = ok(addCategory(book, year(book).id, { side: 'income', name: '寄付金', budget: 3_000 }))
    const incomes = year(book).categories.filter((c) => c.side === 'income')
    expect(incomes[incomes.length - 1]).toMatchObject({ name: '寄付金', budget: 3_000, note: '' })
  })
  it('同じ部に同じ名前は作れない。別の部なら作れる', () => {
    const book = newBook()
    expect(failCode(addCategory(book, year(book).id, { side: 'income', name: '会費' }))).toBe('duplicate-name')
    expect(failCode(addCategory(book, year(book).id, { side: 'income', name: ' 会費 ' }))).toBe('duplicate-name')
    expect(addCategory(book, year(book).id, { side: 'expense', name: '会費' }).ok).toBe(true)
    expect(failCode(addCategory(book, year(book).id, { side: 'income', name: '' }))).toBe('required')
    expect(failCode(addCategory(book, year(book).id, { side: 'income', name: '寄付金', budget: -1 }))).toBe('invalid-amount')
    expect(failCode(addCategory(book, year(book).id, { side: 'income', name: '寄付金', budget: 0.5 }))).toBe('invalid-amount')
  })
  it('数の上限がある', () => {
    let book = newBook({ orgKind: 'other' })
    const have = year(book).categories.filter((c) => c.side === 'expense').length
    for (let i = have; i < LIMITS.maxCategoriesPerSide; i++) book = ok(addCategory(book, year(book).id, { side: 'expense', name: `科目${i}` }))
    expect(failCode(addCategory(book, year(book).id, { side: 'expense', name: 'もう1つ' }))).toBe('limit')
    expect(addCategory(book, year(book).id, { side: 'income', name: 'もう1つ' }).ok).toBe(true)
  })
  it('名前・予算・説明を変えられる', () => {
    let book = newBook()
    const id = catId(book, 'income', '会費')
    book = ok(updateCategory(book, year(book).id, id, { name: '自治会費', budget: 372_000, note: '月500円 × 62世帯' }))
    expect(year(book).categories.find((c) => c.id === id)).toMatchObject({ name: '自治会費', budget: 372_000, note: '月500円 × 62世帯' })
    // 自分と同じ名前のままなら通る。ほかの科目と同じ名前には変えられない
    expect(updateCategory(book, year(book).id, id, { name: '自治会費' }).ok).toBe(true)
    expect(failCode(updateCategory(book, year(book).id, id, { name: '雑収入' }))).toBe('duplicate-name')
    expect(failCode(updateCategory(book, year(book).id, id, { budget: LIMITS.maxAmount + 1 }))).toBe('invalid-amount')
    expect(failCode(updateCategory(book, year(book).id, id, { note: 'あ'.repeat(LIMITS.noteLength + 1) }))).toBe('too-long')
    expect(failCode(updateCategory(book, year(book).id, 'ない科目', { budget: 1 }))).toBe('not-found')
  })
  it('名前を変えても、入れてある取引はそのまま付いてくる', () => {
    let book = income(newBook(), '2026-04-10', 30_000)
    book = ok(updateCategory(book, year(book).id, catId(book, 'income', '会費'), { name: '自治会費' }))
    expect(summarizeYear(year(book)).income.find((c) => c.name === '自治会費')!.actual).toBe(30_000)
  })
  it('同じ部の中で、上下に動かせる。収入と支出がまざって並んでいても、同じ部どうしで入れかわる', () => {
    let book = newBook({ orgKind: 'other' }) // 会費、雑収入、事務費、雑費
    book = ok(addCategory(book, year(book).id, { side: 'income', name: '寄付金' })) // 会費、雑収入、事務費、雑費、寄付金
    const names = (side: 'income' | 'expense') => year(book).categories.filter((c) => c.side === side).map((c) => c.name)
    book = ok(moveCategory(book, year(book).id, catId(book, 'income', '寄付金'), 'up'))
    expect(names('income')).toEqual(['会費', '寄付金', '雑収入'])
    expect(names('expense')).toEqual(['事務費', '雑費'])
    book = ok(moveCategory(book, year(book).id, catId(book, 'income', '会費'), 'down'))
    expect(names('income')).toEqual(['寄付金', '会費', '雑収入'])
  })
  it('端にある科目を端のほうへ動かしても、何も変わらない（変更の数も増えない）', () => {
    const book = newBook({ orgKind: 'other' })
    expect(ok(moveCategory(book, year(book).id, catId(book, 'income', '会費'), 'up'))).toBe(book)
    expect(ok(moveCategory(book, year(book).id, catId(book, 'expense', '雑費'), 'down'))).toBe(book)
    expect(failCode(moveCategory(book, year(book).id, 'ない科目', 'up'))).toBe('not-found')
  })
  it('使われていない科目は消せる。予算案の入力も一緒に消える', () => {
    let book = newBook()
    const id = catId(book, 'expense', '慶弔費')
    book = ok(setNextBudget(book, year(book).id, id, 20_000))
    book = ok(removeCategory(book, year(book).id, id))
    expect(year(book).categories.some((c) => c.id === id)).toBe(false)
    expect(year(book).nextBudget).toEqual({})
  })
  it('使われている科目は消せない。取引を消せば、消せる', () => {
    let book = expense(newBook(), '2026-04-10', 500)
    const id = catId(book, 'expense', '事務費')
    const r = removeCategory(book, year(book).id, id)
    expect(failCode(r)).toBe('in-use')
    expect(!r.ok && r.message).toContain('1件')
    book = ok(removeTransaction(book, year(book).id, year(book).transactions[0].id))
    expect(removeCategory(book, year(book).id, id).ok).toBe(true)
    expect(failCode(removeCategory(book, year(book).id, 'ない科目'))).toBe('not-found')
  })
})

describe('お金の置き場所', () => {
  it('預金口座は3つまで。同じ名前は作れない', () => {
    let book = newBook()
    book = ok(addBankAccount(book, year(book).id, { name: '定期預金', openingBalance: 200_000 }))
    book = ok(addBankAccount(book, year(book).id, { name: 'ゆうちょ' }))
    expect(year(book).accounts.map((a) => a.name)).toEqual(['現金', '普通預金', '定期預金', 'ゆうちょ'])
    expect(failCode(addBankAccount(book, year(book).id, { name: '4つめ' }))).toBe('limit')
    expect(failCode(addBankAccount(newBook(), year(newBook()).id, { name: '普通預金' }))).toBe('duplicate-name')
    expect(failCode(addBankAccount(newBook(), year(newBook()).id, { name: '現金' }))).toBe('duplicate-name')
    expect(failCode(addBankAccount(newBook(), year(newBook()).id, { name: ' ' }))).toBe('required')
    expect(failCode(addBankAccount(newBook(), year(newBook()).id, { name: '定期', openingBalance: -5 }))).toBe('invalid-amount')
  })
  it('年度はじめの残高を変えると、前年度繰越金が変わる', () => {
    let book = newBook()
    book = ok(updateAccount(book, year(book).id, cashId(book), { openingBalance: 12_345 }))
    expect(summarizeYear(year(book)).openingTotal).toBe(112_345)
    expect(failCode(updateAccount(book, year(book).id, cashId(book), { openingBalance: 1.5 }))).toBe('invalid-amount')
    expect(failCode(updateAccount(book, year(book).id, cashId(book), { openingBalance: -1 }))).toBe('invalid-amount')
    expect(failCode(updateAccount(book, year(book).id, 'ない置き場所', { name: 'x' }))).toBe('not-found')
  })
  it('名前を変えられる。ほかの置き場所と同じ名前にはできない', () => {
    let book = newBook()
    book = ok(updateAccount(book, year(book).id, bankId(book), { name: '○○信用金庫 普通' }))
    expect(year(book).accounts[1].name).toBe('○○信用金庫 普通')
    expect(failCode(updateAccount(book, year(book).id, year(book).accounts[1].id, { name: '現金' }))).toBe('duplicate-name')
    expect(failCode(updateAccount(book, year(book).id, year(book).accounts[1].id, { name: '' }))).toBe('required')
  })
  it('現金、使われている口座、残高のある口座は消せない', () => {
    let book = newBook()
    expect(failCode(removeAccount(book, year(book).id, cashId(book)))).toBe('cash-required')
    expect(failCode(removeAccount(book, year(book).id, bankId(book)))).toBe('has-balance')
    book = ok(updateAccount(book, year(book).id, bankId(book), { openingBalance: 0 }))
    const withTx = deposit(book, '2026-04-12', 1_000)
    expect(failCode(removeAccount(withTx, year(withTx).id, bankId(withTx)))).toBe('in-use')
    // 照合の記録が残っていても、口座と一緒に消える
    book = ok(setReconciliation(book, year(book).id, bankId(book), { date: '2026-04-30', actual: 0 }))
    book = ok(removeAccount(book, year(book).id, bankId(book)))
    expect(year(book).accounts.map((a) => a.name)).toEqual(['現金'])
    expect(year(book).reconciliations).toEqual({})
    expect(failCode(removeAccount(book, year(book).id, 'ない置き場所'))).toBe('not-found')
  })
})

describe('年度、役員、資料の入力', () => {
  it('期間を変えられる。終わりが始まりより前にはできない', () => {
    let book = newBook()
    book = ok(updateYear(book, year(book).id, { startDate: '2026-01-01', endDate: '2026-12-31' }))
    expect([year(book).startDate, year(book).endDate]).toEqual(['2026-01-01', '2026-12-31'])
    expect(failCode(updateYear(book, year(book).id, { endDate: '2025-12-31' }))).toBe('invalid-period')
    expect(failCode(updateYear(book, year(book).id, { startDate: '2027-01-01' }))).toBe('invalid-period')
    expect(failCode(updateYear(book, year(book).id, { startDate: 'きょう' }))).toBe('invalid-date')
    expect(failCode(updateYear(book, year(book).id, { label: '' }))).toBe('required')
    expect(failCode(updateYear(book, year(book).id, { reportDate: '2026-02-30' }))).toBe('invalid-date')
    expect(failCode(updateYear(book, year(book).id, { carryoverBudget: -1 }))).toBe('invalid-amount')
    expect(year(ok(updateYear(book, year(book).id, { reportDate: '', carryoverBudget: null }))).reportDate).toBe('')
  })
  it('役員の名前は空でもよい。監査をする人の欄は 1〜3人ぶん', () => {
    let book = newBook()
    book = ok(updateOfficers(book, year(book).id, { president: ' 高橋 正夫 ', treasurer: '', auditors: ['田中', '', '伊藤'] }))
    expect(year(book).officers).toEqual({ president: '高橋 正夫', treasurer: '', auditors: ['田中', '', '伊藤'] })
    expect(failCode(updateOfficers(book, year(book).id, { auditors: [] }))).toBe('limit')
    expect(failCode(updateOfficers(book, year(book).id, { auditors: ['a', 'b', 'c', 'd'] }))).toBe('limit')
    const long = updateOfficers(book, year(book).id, { president: 'あ'.repeat(LIMITS.nameLength + 1) })
    expect(failCode(long)).toBe('invalid-input')
    // 画面に出す文には理由を、field には場所を入れる
    expect(!long.ok && [long.message, long.field]).toEqual(['入力に正しくないところがあります（文字が長すぎます（60文字まで））。', 'officers.president'])
  })
  it('照合の記録を入れる・消す', () => {
    let book = newBook()
    book = ok(setReconciliation(book, year(book).id, cashId(book), { date: '2026-04-30', actual: 10_000 }))
    expect(year(book).reconciliations[cashId(book)]).toEqual({ date: '2026-04-30', actual: 10_000 })
    expect(failCode(setReconciliation(book, year(book).id, cashId(book), { date: '2026-04-31', actual: 0 }))).toBe('invalid-date')
    expect(failCode(setReconciliation(book, year(book).id, cashId(book), { date: '2026-04-30', actual: -1 }))).toBe('invalid-amount')
    expect(failCode(setReconciliation(book, year(book).id, cashId(book), { date: '2026-04-30', actual: 0.5 }))).toBe('invalid-amount')
    expect(failCode(setReconciliation(book, year(book).id, 'ない置き場所', { date: '2026-04-30', actual: 0 }))).toBe('not-found')
    book = ok(setReconciliation(book, year(book).id, cashId(book), null))
    expect(year(book).reconciliations).toEqual({})
  })
  it('監査報告書の本文と日付', () => {
    let book = newBook()
    book = ok(updateAudit(book, year(book).id, { text: '1行目\n2行目', date: '2027-04-12' }))
    expect(year(book).audit).toEqual({ text: '1行目\n2行目', date: '2027-04-12' })
    expect(failCode(updateAudit(book, year(book).id, { date: '2027-04-31' }))).toBe('invalid-input')
    expect(failCode(updateAudit(book, year(book).id, { text: 'あ'.repeat(LIMITS.textLength + 1) }))).toBe('invalid-input')
    expect(year(ok(updateAudit(book, year(book).id, { date: '' }))).audit.date).toBe('')
  })
  it('次年度の予算案を入れる・消す。0円 も入れられる', () => {
    let book = newBook()
    const id = catId(book, 'income', '会費')
    book = ok(setNextBudget(book, year(book).id, id, 0))
    expect(year(book).nextBudget).toEqual({ [id]: 0 })
    book = ok(setNextBudget(book, year(book).id, id, null))
    expect(year(book).nextBudget).toEqual({})
    expect(failCode(setNextBudget(book, year(book).id, id, -1))).toBe('invalid-amount')
    expect(failCode(setNextBudget(book, year(book).id, id, 1.5))).toBe('invalid-amount')
    expect(failCode(setNextBudget(book, year(book).id, 'ない科目', 1))).toBe('not-found')
  })
  it('引き継ぎ書の中身。一覧は、まるごと入れかえる', () => {
    let book = newBook()
    const custody = year(book).handover.custody
    expect(custody.length).toBeGreaterThan(0)
    book = ok(
      updateHandover(book, year(book).id, {
        date: '2027-04-18',
        successor: '次の人',
        custody: custody.map((c, i) => ({ ...c, place: '集会所', handedOver: i === 0 })),
        unpaid: [{ id: 'u1', description: '電気代（3月分）', amount: 4_500 }, { id: 'u2', description: '金額はまだ', amount: null }],
        unreceived: [],
        equipment: [{ id: 'e1', name: 'テント', quantity: '2張', place: '倉庫' }],
        memo: '1行目\n2行目',
      }),
    )
    const h = year(book).handover
    expect(h.custody[0]).toMatchObject({ place: '集会所', handedOver: true })
    expect(h.unpaid).toHaveLength(2)
    expect(h.memo).toBe('1行目\n2行目')
    // 渡していない項目は、そのまま残る
    expect(year(ok(updateHandover(book, year(book).id, { memo: '' }))).handover.unpaid).toHaveLength(2)
  })
  it('引き継ぎ書の正しくない入力は断る', () => {
    const book = newBook()
    const y = year(book).id
    expect(failCode(updateHandover(book, y, { date: '2027-02-30' }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { unpaid: [{ id: 'u1', description: 'x', amount: -1 }] }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { unpaid: [{ id: 'u1', description: 'x', amount: 1.5 }] }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { unpaid: [{ id: 'u1', description: 'x', amount: 1 }, { id: 'u1', description: 'y', amount: 2 }] }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { equipment: [{ id: '', name: 'x', quantity: '1', place: '' }] }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { memo: 'あ'.repeat(LIMITS.textLength + 1) }))).toBe('invalid-input')
    expect(failCode(updateHandover(book, y, { custody: 'こわれた値' as unknown as [] }))).toBe('invalid-input')
  })
})

describe('団体とライセンスキー', () => {
  it('団体の名前、役の呼び名、差の向きを変えられる', () => {
    let book = newBook()
    book = ok(updateOrg(book, { orgName: ' みどり子ども会 ', orgKind: 'kodomokai', roleNames: { president: '会長', auditor: '監査' }, diffStyle: 'budget-minus-actual' }))
    expect(book).toMatchObject({ orgName: 'みどり子ども会', orgKind: 'kodomokai', diffStyle: 'budget-minus-actual' })
    expect(book.roleNames).toEqual({ president: '会長', treasurer: '会計', auditor: '監査' })
    expect(failCode(updateOrg(book, { orgName: '' }))).toBe('required')
    expect(failCode(updateOrg(book, { roleNames: { treasurer: ' ' } }))).toBe('required')
  })
  it('ライセンスキーを帳簿に入れられる。空白と改行は取る。同じキーなら何も変えない', () => {
    let book = newBook()
    book = ok(setLicenseKey(book, '  abc.\ndef  '))
    expect(book.licenseKey).toBe('abc.def')
    expect(book.revision).toBe(1)
    expect(ok(setLicenseKey(book, 'abc.def'))).toBe(book)
    book = ok(setLicenseKey(book, ''))
    expect(book.licenseKey).toBe('')
    expect(failCode(setLicenseKey(book, 'x'.repeat(LIMITS.textLength + 1)))).toBe('too-long')
  })
  it('読むだけの年度でも、ライセンスキーと団体の名前は変えられる（帳簿ぜんたいのものなので）', () => {
    const book = ok(carryForward(newBook()))
    expect(setLicenseKey(book, 'abc.def').ok).toBe(true)
    expect(updateOrg(book, { orgName: '新しい名前' }).ok).toBe(true)
  })
})

describe('読むだけの年度（繰り越したあとの、前の年度）', () => {
  it('数字に関わる操作（取引、科目、置き場所、年度の呼び名と期間、繰越金の予算額）は、どれも断る。理由の文に、年度の呼び名が入る', () => {
    let book = newBook()
    book = income(book, '2026-04-10', 30_000)
    const old = year(book)
    const tx = old.transactions[0].id
    const cash = cashId(book)
    const cat = catId(book, 'income', '会費')
    book = ok(carryForward(book))
    expect(isYearLocked(book, old.id)).toBe(true)
    expect(isYearLocked(book, book.years[1].id)).toBe(false)
    const attempts = [
      addTransaction(book, old.id, { date: '2026-05-01', kind: 'income', categoryId: cat, accountId: cash, amount: 1 }),
      updateTransaction(book, old.id, tx, { amount: 1 }),
      removeTransaction(book, old.id, tx),
      addCategory(book, old.id, { side: 'income', name: '寄付金' }),
      updateCategory(book, old.id, cat, { budget: 1 }),
      updateCategory(book, old.id, cat, { note: 'x' }),
      moveCategory(book, old.id, cat, 'down'),
      removeCategory(book, old.id, cat),
      addBankAccount(book, old.id, { name: '定期' }),
      updateAccount(book, old.id, cash, { name: '手元の現金' }),
      removeAccount(book, old.id, cash),
      updateYear(book, old.id, { label: 'x' }),
      updateYear(book, old.id, { endDate: '2027-03-30' }),
      updateYear(book, old.id, { carryoverBudget: 1 }),
      // 作成日と一緒に渡しても、数字に関わるものが入っていれば断る
      updateYear(book, old.id, { reportDate: '2027-04-10', label: 'x' }),
    ]
    for (const r of attempts) {
      expect(failCode(r)).toBe('year-locked')
      expect(!r.ok && r.message).toContain('令和8年度')
    }
    // 前の年度は、1文字も変わっていない
    expect(book.years[0]).toEqual(old)
  })
  it('資料に書くこと（作成日、役員の名前、監査報告書、引き継ぎ書、照合の記録）は、繰り越したあとでも入れられる。決算の数字は変わらない', () => {
    // 総会の前に、新しい年度の取引を入れるために先に繰り越した人が、前の年度の資料を仕上げられるように
    let book = income(newBook(), '2026-04-10', 30_000)
    const old = year(book)
    const cash = cashId(book)
    const before = summarizeYear(old)
    book = ok(carryForward(book))
    book = income(book, '2027-04-05', 500) // 新しい年度に取引が入っている（繰り越しは、もう取り消せない）
    book = ok(updateYear(book, old.id, { reportDate: '2027-04-10' }))
    book = ok(updateOfficers(book, old.id, { president: '山田', treasurer: '佐藤', auditors: ['鈴木', '高橋'] }))
    book = ok(updateAudit(book, old.id, { date: '2027-04-12', text: '{年度}の会計を監査しました。' }))
    book = ok(updateHandover(book, old.id, { date: '2027-04-19', successor: '田中', memo: '会費は5月に集めます。' }))
    book = ok(setReconciliation(book, old.id, cash, { date: '2027-03-31', actual: 40_000 }))
    const after = book.years[0]
    expect(after.reportDate).toBe('2027-04-10')
    expect(after.officers).toEqual({ president: '山田', treasurer: '佐藤', auditors: ['鈴木', '高橋'] })
    expect(after.audit).toEqual({ date: '2027-04-12', text: '{年度}の会計を監査しました。' })
    expect(after.handover).toMatchObject({ date: '2027-04-19', successor: '田中', memo: '会費は5月に集めます。' })
    expect(after.reconciliations[cash]).toEqual({ date: '2027-03-31', actual: 40_000 })
    // 数字に関わるところは、繰り越す前のまま
    expect(after.transactions).toEqual(old.transactions)
    expect(after.categories).toEqual(old.categories)
    expect(after.accounts).toEqual(old.accounts)
    expect(summarizeYear(after)).toEqual(before)
    // 新しい年度の年度はじめの残高も、動いていない
    expect(checkYearChain(book)).toEqual([])
    // 記録は消すこともできる
    expect(ok(setReconciliation(book, old.id, cash, null)).years[0].reconciliations).toEqual({})
    // まちがった値は、読むだけの年度でも、同じ理由で断る
    expect(failCode(updateYear(book, old.id, { reportDate: '2027-02-30' }))).toBe('invalid-date')
    expect(failCode(updateOfficers(book, old.id, { auditors: [] }))).toBe('limit')
  })
  it('すぐ前の年度の予算案は、繰り越したあとでも変えられる。いまの年度の予算額にも、同じ金額が入る', () => {
    let book = newBook()
    const dues = catId(book, 'income', '会費')
    const office = catId(book, 'expense', '事務費')
    const old = year(book)
    book = ok(updateCategory(book, old.id, dues, { budget: 30_000 }))
    book = ok(updateCategory(book, old.id, office, { budget: 5_000 }))
    book = ok(carryForward(book))
    const now = () => year(book)
    const budgetOf = (id: string) => now().categories.find((c) => c.id === id)!.budget
    // 予算案を入れずに繰り越したので、新しい年度の予算は、前の年度と同じ
    expect([budgetOf(dues), budgetOf(office)]).toEqual([30_000, 5_000])
    // あとから予算案を入れる → 紙の予算案と、新しい年度の予算が、同じ金額になる
    book = ok(setNextBudget(book, old.id, dues, 36_000))
    expect(book.years[0].nextBudget).toEqual({ [dues]: 36_000 })
    expect([budgetOf(dues), budgetOf(office)]).toEqual([36_000, 5_000])
    // 前の年度の予算そのもの（決算書に出る数字）は、変わらない
    expect(book.years[0].categories.find((c) => c.id === dues)!.budget).toBe(30_000)
    // 0円 も入れられる（空と 0 は違う）
    book = ok(setNextBudget(book, old.id, office, 0))
    expect(budgetOf(office)).toBe(0)
    // 入力を消すと、前の年度の予算に戻る（繰り越しのときと同じ決まり）
    book = ok(setNextBudget(book, old.id, dues, null))
    expect(book.years[0].nextBudget).toEqual({ [office]: 0 })
    expect(budgetOf(dues)).toBe(30_000)
    // いまの年度で消した科目には、入れない（紙の予算案だけが変わる）
    book = ok(removeCategory(book, now().id, office))
    book = ok(setNextBudget(book, old.id, office, 7_000))
    expect(book.years[0].nextBudget[office]).toBe(7_000)
    expect(now().categories.some((c) => c.id === office)).toBe(false)
    // まちがった金額と、ない科目は断る
    expect(failCode(setNextBudget(book, old.id, dues, 1.5))).toBe('invalid-amount')
    expect(failCode(setNextBudget(book, old.id, 'nai', 1))).toBe('not-found')
    // いまの年度の予算案は、いままでどおり（ほかの年度には、さわらない）
    const kept = book.years[0]
    book = ok(setNextBudget(book, now().id, dues, 40_000))
    expect(now().nextBudget).toEqual({ [dues]: 40_000 })
    expect(book.years[0]).toBe(kept)
  })
  it('2つ以上前の年度の予算案は、変えられない（次の年度も、もう読むだけなので）', () => {
    let book = newBook()
    const dues = catId(book, 'income', '会費')
    const first = year(book)
    book = ok(carryForward(book, {}, seqIds('a')))
    book = ok(carryForward(book, {}, seqIds('b')))
    const r = setNextBudget(book, first.id, dues, 1)
    expect(failCode(r)).toBe('year-locked')
    expect(!r.ok && r.message).toContain('令和8年度')
    // すぐ前の年度（令和9年度）なら、変えられる
    expect(setNextBudget(book, book.years[1].id, dues, 1).ok).toBe(true)
    // 資料に書くことは、古い年度でも入れられる
    expect(updateAudit(book, first.id, { date: '2027-04-12' }).ok).toBe(true)
  })
  it('2年目からは、始まりの日と年度はじめの残高を変えられない', () => {
    let book = income(newBook(), '2026-04-10', 30_000)
    book = ok(carryForward(book))
    const y2 = book.years[1]
    expect(failCode(updateYear(book, y2.id, { startDate: '2027-05-01' }))).toBe('start-locked')
    expect(updateYear(book, y2.id, { startDate: y2.startDate, endDate: '2028-03-30' }).ok).toBe(true)
    expect(failCode(updateAccount(book, y2.id, y2.accounts[0].id, { openingBalance: 0 }))).toBe('opening-locked')
    expect(updateAccount(book, y2.id, y2.accounts[0].id, { openingBalance: y2.accounts[0].openingBalance, name: '手元の現金' }).ok).toBe(true)
    expect(failCode(addBankAccount(book, y2.id, { name: '定期', openingBalance: 1 }))).toBe('opening-locked')
    expect(addBankAccount(book, y2.id, { name: '定期' }, seqIds('n')).ok).toBe(true)
  })
})
