import { describe, expect, it } from 'vitest'
import {
  addBankAccount,
  setNextBudget,
  setReconciliation,
  updateAudit,
  updateCategory,
  updateHandover,
  updateOfficers,
  updateYear,
} from './book'
import { accountBalances, isYearLocked, latestYear, summarizeYear } from './calc'
import { carryForward, checkCarryForward, undoCarryForward } from './carry'
import { add, bankId, cashId, catId, deepFreeze, deposit, expense, failCode, income, newBook, ok, seqIds, withdraw, year } from './test-helpers'
import { LIMITS, type Book } from './types'
import { checkYearChain } from './validate'

/** 1年ぶんの取引が入った帳簿。現金 13,500円、普通預金 125,000円、合計 138,500円。 */
function filled(): Book {
  let book = newBook()
  book = ok(updateCategory(book, year(book).id, catId(book, 'income', '会費'), { budget: 30_000, note: '月500円 × 5世帯' }))
  book = ok(updateCategory(book, year(book).id, catId(book, 'expense', '事務費'), { budget: 5_000 }))
  book = income(book, '2026-04-10', 30_000)
  book = deposit(book, '2026-04-12', 25_000)
  book = expense(book, '2026-05-01', 1_500)
  return book
}

describe('次の年度への繰り越し', () => {
  it('新しい年度の年度はじめの残高は、前の年度の年度末の残高', () => {
    const before = filled()
    const closing = accountBalances(year(before))
    const book = ok(carryForward(before))
    expect(book.years).toHaveLength(2)
    const next = book.years[1]
    expect(next.accounts.map((a) => [a.id, a.name, a.kind, a.openingBalance])).toEqual(closing.map((c) => [c.accountId, c.name, c.kind, c.closing]))
    expect(next.accounts.map((a) => a.openingBalance)).toEqual([13_500, 125_000])
    // 新しい年度の前年度繰越金 ＝ 前の年度の次年度繰越金
    expect(summarizeYear(next).openingTotal).toBe(summarizeYear(book.years[0]).carryover)
    expect(summarizeYear(next).openingTotal).toBe(138_500)
    expect(checkYearChain(book)).toEqual([])
  })
  it('期間は、前の年度の次の日から1年。呼び名は1つ進む', () => {
    const next = ok(carryForward(filled())).years[1]
    expect([next.startDate, next.endDate, next.label]).toEqual(['2027-04-01', '2028-03-31', '令和9年度'])
  })
  it('2月末で終わる年度は、うるう年でも月末で終わる', () => {
    let book = newBook({ startDate: '2023-03-01', endDate: '2024-02-29' })
    book = ok(carryForward(book))
    expect([book.years[1].startDate, book.years[1].endDate]).toEqual(['2024-03-01', '2025-02-28'])
    book = ok(carryForward(book))
    book = ok(carryForward(book))
    book = ok(carryForward(book))
    expect([book.years[4].startDate, book.years[4].endDate]).toEqual(['2027-03-01', '2028-02-29'])
  })
  it('科目は、同じ id・同じ名前・同じ並びで引き継ぐ。取引は空から始まる', () => {
    const before = filled()
    const next = ok(carryForward(before)).years[1]
    expect(next.categories.map((c) => [c.id, c.side, c.name])).toEqual(year(before).categories.map((c) => [c.id, c.side, c.name]))
    expect(next.transactions).toEqual([])
    expect(summarizeYear(next).incomeTotal).toBe(0)
  })
  it('予算は、予算案を入れた科目はその額、入れていない科目は前の年度の予算', () => {
    let book = filled()
    book = ok(setNextBudget(book, year(book).id, catId(book, 'income', '会費'), 36_000))
    book = ok(setNextBudget(book, year(book).id, catId(book, 'expense', '雑費'), 0)) // 0円 と入れたものは、0円 のまま
    book = ok(updateCategory(book, year(book).id, catId(book, 'expense', '雑費'), { budget: 3_000 }))
    const next = ok(carryForward(book)).years[1]
    const budget = (name: string) => next.categories.find((c) => c.name === name)!.budget
    expect(budget('会費')).toBe(36_000)
    expect(budget('事務費')).toBe(5_000)
    expect(budget('雑費')).toBe(0)
    expect(next.nextBudget).toEqual({})
  })
  it('年度ごとに変わるもの（役員の名前、決算書の説明、照合、資料の日付）は、空から始まる', () => {
    let book = filled()
    const y = year(book).id
    book = ok(updateOfficers(book, y, { president: '高橋', treasurer: '鈴木', auditors: ['田中', '伊藤'] }))
    book = ok(setReconciliation(book, y, cashId(book), { date: '2027-03-31', actual: 13_500 }))
    book = ok(updateYear(book, y, { reportDate: '2027-04-05', carryoverBudget: 100_000 }))
    book = ok(updateAudit(book, y, { text: 'うちの会の言い回し。{年度}', date: '2027-04-12' }))
    const next = ok(carryForward(book)).years[1]
    expect(next.officers).toEqual({ president: '', treasurer: '', auditors: ['', ''] }) // 署名欄の数は同じ
    expect(next.categories.every((c) => c.note === '')).toBe(true)
    expect(next.reconciliations).toEqual({})
    expect(next.reportDate).toBe('')
    expect(next.carryoverBudget).toBeNull()
    // 監査報告書の言い回しは引き継ぐ。日付は空
    expect(next.audit).toEqual({ text: 'うちの会の言い回し。{年度}', date: '' })
  })
  it('引き継ぎ書: 保管場所と備品は引き継ぐ。未払い・未収・メモ・渡した印は、空から始まる', () => {
    let book = filled()
    book = ok(
      updateHandover(book, year(book).id, {
        date: '2027-04-18',
        successor: '次の人',
        custody: year(book).handover.custody.map((c) => ({ ...c, place: '集会所の戸棚', handedOver: true })),
        unpaid: [{ id: 'u1', description: '電気代', amount: 4_500 }],
        unreceived: [{ id: 'r1', description: '補助金', amount: null }],
        equipment: [{ id: 'e1', name: 'テント', quantity: '2張', place: '倉庫' }],
        memo: 'よろしく',
      }),
    )
    const next = ok(carryForward(book)).years[1]
    expect(next.handover.custody.every((c) => c.place === '集会所の戸棚' && c.handedOver === false)).toBe(true)
    expect(next.handover.equipment).toEqual([{ id: 'e1', name: 'テント', quantity: '2張', place: '倉庫' }])
    expect(next.handover).toMatchObject({ date: '', successor: '', unpaid: [], unreceived: [], memo: '' })
  })
  it('前の年度は、そのまま残って、読むだけになる', () => {
    const before = deepFreeze(filled())
    const book = ok(carryForward(before))
    expect(book.years[0]).toEqual(year(before))
    expect(isYearLocked(book, book.years[0].id)).toBe(true)
    expect(isYearLocked(book, book.years[1].id)).toBe(false)
    expect(book.revision).toBe(before.revision + 1)
    // 前の年度の資料の数字は、繰り越す前と同じ
    expect(summarizeYear(book.years[0])).toEqual(summarizeYear(year(before)))
  })
  it('呼び名と終わりの日は、自分で決められる', () => {
    const next = ok(carryForward(filled(), { label: '第2期', endDate: '2027-12-31' })).years[1]
    expect([next.label, next.startDate, next.endDate]).toEqual(['第2期', '2027-04-01', '2027-12-31'])
    expect(failCode(carryForward(filled(), { endDate: '2027-03-31' }))).toBe('invalid-period')
    expect(failCode(carryForward(filled(), { endDate: 'こわれた日付' }))).toBe('invalid-period')
    expect(failCode(carryForward(filled(), { label: '  ' }))).toBe('required')
  })
  it('取引のない年度も繰り越せる。残高がそのまま移る', () => {
    const book = ok(carryForward(newBook()))
    expect(book.years[1].accounts.map((a) => a.openingBalance)).toEqual([10_000, 100_000])
  })
  it('何年続けても、年度のつながりが合う', () => {
    let book = filled()
    const ids = seqIds('y')
    for (let i = 0; i < 5; i++) {
      book = ok(carryForward(book, {}, ids))
      book = income(book, year(book).startDate, 12_000 + i)
      book = expense(book, year(book).startDate, 3_000 + i)
      book = withdraw(book, year(book).endDate, 1_000)
    }
    expect(book.years).toHaveLength(6)
    expect(book.years.map((y) => y.label)).toEqual(['令和8年度', '令和9年度', '令和10年度', '令和11年度', '令和12年度', '令和13年度'])
    expect(checkYearChain(book)).toEqual([])
    for (let i = 1; i < book.years.length; i++) {
      const prev = summarizeYear(book.years[i - 1])
      const next = summarizeYear(book.years[i])
      expect(next.openingTotal).toBe(prev.carryover)
      expect(next.balanced).toBe(true)
    }
    // 途中の年度も、いちばん古い年度も、読むだけ
    expect(book.years.slice(0, -1).every((y) => isYearLocked(book, y.id))).toBe(true)
  })
  it('2年目に足した口座は 0円 から始まり、次の繰り越しで残高が移る', () => {
    let book = ok(carryForward(filled(), {}, seqIds('a')))
    book = ok(addBankAccount(book, year(book).id, { name: '定期預金' }, seqIds('b')))
    book = add(book, { date: '2027-05-01', kind: 'transfer', accountId: bankId(book), toAccountId: bankId(book, '定期預金'), amount: 50_000 })
    expect(checkYearChain(book)).toEqual([])
    book = ok(carryForward(book, {}, seqIds('c')))
    expect(year(book).accounts.map((a) => [a.name, a.openingBalance])).toEqual([
      ['現金', 13_500],
      ['普通預金', 75_000],
      ['定期預金', 50_000],
    ])
    expect(checkYearChain(book)).toEqual([])
  })
})

describe('繰り越す前の確かめ', () => {
  it('どんな年度ができるかを、先に見られる', () => {
    const check = checkCarryForward(filled())
    expect(check.ok).toBe(true)
    expect(check.blockers).toEqual([])
    expect(check.preview).toMatchObject({ label: '令和9年度', startDate: '2027-04-01', endDate: '2028-03-31', openingTotal: 138_500 })
    expect(check.preview.accounts.map((a) => [a.name, a.opening])).toEqual([
      ['現金', 13_500],
      ['普通預金', 125_000],
    ])
  })
  it('年度末の残高がマイナスの置き場所があると、繰り越せない', () => {
    let book = newBook({ cashOpening: 1_000 })
    book = expense(book, '2026-04-10', 3_000)
    const check = checkCarryForward(book)
    expect(check.ok).toBe(false)
    expect(check.blockers.map((b) => b.code)).toEqual(['negative-closing'])
    expect(check.blockers[0].message).toContain('△2,000円')
    expect(failCode(carryForward(book))).toBe('negative-closing')
    // 直せば、繰り越せる
    book = withdraw(book, '2026-04-10', 5_000)
    expect(checkCarryForward(book).ok).toBe(true)
    expect(carryForward(book).ok).toBe(true)
  })
  it('年度の途中でマイナスの日があっただけなら、知らせるが、繰り越せる', () => {
    let book = newBook({ cashOpening: 1_000 })
    book = expense(book, '2026-04-10', 3_000)
    book = withdraw(book, '2026-04-20', 5_000)
    const check = checkCarryForward(book)
    expect(check.ok).toBe(true)
    expect(check.warnings.map((w) => w.code)).toContain('negative-balance')
  })
  it('照合がまだ・合っていない・年度の外の日付・年度が終わっていない、を知らせる', () => {
    let book = filled()
    expect(checkCarryForward(book).warnings.map((w) => w.code)).toEqual(['reconcile-unchecked'])
    book = ok(setReconciliation(book, year(book).id, cashId(book), { date: '2027-03-31', actual: 13_000 }))
    book = ok(setReconciliation(book, year(book).id, bankId(book), { date: '2027-03-31', actual: 125_000 }))
    expect(checkCarryForward(book).warnings.map((w) => w.code)).toEqual(['reconcile-mismatch'])
    book = ok(setReconciliation(book, year(book).id, cashId(book), { date: '2027-03-31', actual: 13_500 }))
    expect(checkCarryForward(book).warnings).toEqual([])
    expect(checkCarryForward(book, { today: '2027-03-31' }).warnings.map((w) => w.code)).toEqual(['year-not-ended'])
    expect(checkCarryForward(book, { today: '2027-04-01' }).warnings).toEqual([])
    book = expense(book, '2027-04-02', 100)
    expect(checkCarryForward(book).warnings.map((w) => w.code)).toContain('outside-year')
  })
  it('年度の数の上限', () => {
    const book = filled()
    const many: Book = { ...book, years: Array.from({ length: LIMITS.maxYears }, (_, i) => ({ ...year(book), id: `y${i}` })) }
    expect(failCode(carryForward(many))).toBe('limit')
  })
})

describe('繰り越しの取り消し', () => {
  it('新しい年度に取引がなければ、取り消せる。前の年度が、また書きかえられるようになる', () => {
    const before = filled()
    const carried = ok(carryForward(before))
    const undone = ok(undoCarryForward(carried))
    expect(undone.years).toEqual(before.years)
    expect(isYearLocked(undone, latestYear(undone).id)).toBe(false)
    expect(undone.revision).toBe(carried.revision + 1)
    expect(income(undone, '2027-03-30', 100).years[0].transactions).toHaveLength(4)
  })
  it('新しい年度に取引が入っていると、取り消せない', () => {
    let book = ok(carryForward(filled()))
    book = income(book, '2027-04-10', 100)
    const r = undoCarryForward(book)
    expect(failCode(r)).toBe('has-transactions')
    expect(!r.ok && r.message).toContain('1件')
  })
  it('年度が1つしかなければ、取り消すものがない', () => {
    expect(failCode(undoCarryForward(filled()))).toBe('nothing-to-undo')
  })
})

describe('年度のつながりの確かめ', () => {
  it('年度はじめの残高が、前の年度の年度末の残高と違うと知らせる', () => {
    const book = ok(carryForward(filled()))
    const broken: Book = {
      ...book,
      years: [book.years[0], { ...book.years[1], accounts: book.years[1].accounts.map((a, i) => (i === 0 ? { ...a, openingBalance: a.openingBalance + 1 } : a)) }],
    }
    const warnings = checkYearChain(broken)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('現金')
    expect(warnings[0]).toContain('令和9年度')
  })
  it('前の年度にあった口座が、次の年度にないときも知らせる', () => {
    const book = ok(carryForward(filled()))
    const broken: Book = { ...book, years: [book.years[0], { ...book.years[1], accounts: book.years[1].accounts.slice(0, 1) }] }
    expect(checkYearChain(broken).join('')).toContain('普通預金')
  })
  it('前の年度になかった口座に、年度はじめの残高があるときも知らせる', () => {
    const book = ok(carryForward(filled()))
    const extra = { id: 'extra', kind: 'bank' as const, name: 'どこかの口座', openingBalance: 500 }
    const broken: Book = { ...book, years: [book.years[0], { ...book.years[1], accounts: [...book.years[1].accounts, extra] }] }
    expect(checkYearChain(broken).join('')).toContain('どこかの口座')
  })
  it('年度の日付がつながっていないと知らせる', () => {
    const book = ok(carryForward(filled()))
    const broken: Book = { ...book, years: [book.years[0], { ...book.years[1], startDate: '2027-04-02' }] }
    expect(checkYearChain(broken).join('')).toContain('つながっていません')
  })
})
