import { describe, expect, it } from 'vitest'
import { addTransaction, checkTransaction, createBook, updateOrg } from './book'
import { duplicateReceiptNos, isYearLocked, listYearIssues, reconcileYear, summarizeYear } from './calc'
import { checkCarryForward } from './carry'
import { isWithin } from './dates'
import { parseBookFile, serializeBook } from './file'
import { buildReports } from './reports'
import { SAMPLE_NOTE, createSampleBook, isSampleBook } from './sample'
import { checkYearChain } from './validate'

describe('サンプルのデータ', () => {
  const book = createSampleBook()
  const [y1, y2] = book.years

  it('年度が2つ。前の年度は読むだけ、新しい年度は入力の途中', () => {
    expect(book.orgName).toBe('あおぞら町内会')
    expect(book.years.map((y) => [y.label, y.startDate, y.endDate])).toEqual([
      ['令和7年度', '2025-04-01', '2026-03-31'],
      ['令和8年度', '2026-04-01', '2027-03-31'],
    ])
    expect(isYearLocked(book, y1.id)).toBe(true)
    expect(isYearLocked(book, y2.id)).toBe(false)
    expect(y1.transactions.length).toBeGreaterThan(40)
    expect(y2.transactions.length).toBeGreaterThan(20)
    expect(book.revision).toBe(0)
    expect(book.licenseKey).toBe('')
    expect(SAMPLE_NOTE).toContain('見本')
  })
  it('読み込みの検査を通る（書き出して読み込んでも同じ）', () => {
    const r = parseBookFile(serializeBook(book, new Date(2026, 10, 14)))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.book).toEqual(book)
      expect(r.warnings).toEqual([])
    }
  })
  it('どちらの年度も、残高の合計と繰越金が合っている', () => {
    for (const y of book.years) {
      const s = summarizeYear(y)
      expect(s.balanced).toBe(true)
      expect(s.openingTotal + s.incomeTotal - s.expenseTotal).toBe(s.closingTotal)
      expect(s.accounts.every((a) => a.closing >= 0)).toBe(true)
    }
    expect(summarizeYear(y1)).toMatchObject({ openingTotal: 604_774, incomeTotal: 444_079, expenseTotal: 311_935, carryover: 736_918 })
    expect(summarizeYear(y2)).toMatchObject({ openingTotal: 736_918, incomeTotal: 417_862, expenseTotal: 244_858, carryover: 909_922 })
  })
  it('新しい年度の年度はじめの残高 ＝ 前の年度の年度末の残高', () => {
    expect(checkYearChain(book)).toEqual([])
    expect(summarizeYear(y2).openingTotal).toBe(summarizeYear(y1).carryover)
    expect(y2.accounts.map((a) => a.openingBalance)).toEqual(summarizeYear(y1).accounts.map((a) => a.closing))
  })
  it('新しい年度の予算は、前の年度の予算案から来ている', () => {
    const budget = (name: string) => y2.categories.find((c) => c.name === name)!.budget
    expect(budget('会費')).toBe(366_000)
    expect(budget('行事費')).toBe(150_000)
    expect(budget('市の補助金')).toBe(40_000) // 予算案を入れていない科目は、前の年度と同じ
    const s = summarizeYear(y2)
    expect(s.openingTotal + s.incomeBudgetTotal).toBe(s.expenseBudgetTotal)
  })
  it('見本に、まちがいの見本を入れない（年度の外の日付、マイナスの残高、同じ領収書番号がない）', () => {
    for (const y of book.years) {
      expect(listYearIssues(y, { today: '2026-11-14' })).toEqual([])
      expect(duplicateReceiptNos(y)).toEqual([])
      expect(y.transactions.every((t) => isWithin(t.date, y.startDate, y.endDate))).toBe(true)
    }
  })
  it('前の年度は、すべての置き場所の照合が合っている。新しい年度は、現金だけがまだ', () => {
    expect(reconcileYear(y1).allMatch).toBe(true)
    const r = reconcileYear(y2)
    expect(r.rows.map((x) => [x.name, x.status])).toEqual([
      ['現金', 'unchecked'],
      ['普通預金', 'match'],
      ['定期預金（防災の積立）', 'match'],
    ])
    expect(r.rows[0].bookBalance).toBe(8_467)
  })
  it('支出の領収書番号は、1 から順に付いている（口座の引き落としは空）', () => {
    const numbers = y1.transactions.filter((t) => t.receiptNo !== '').map((t) => Number(t.receiptNo))
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1))
    expect(y1.transactions.filter((t) => t.kind !== 'expense').every((t) => t.receiptNo === '')).toBe(true)
    expect(y1.transactions.some((t) => t.kind === 'expense' && t.receiptNo === '')).toBe(true)
  })
  it('資料が5種類とも作れる', () => {
    for (const y of book.years) {
      const r = buildReports(book, y.id)!
      expect(r.settlement.balanced).toBe(true)
      expect(r.ledgers.ledgers).toHaveLength(3)
      expect(r.audit.body).not.toContain('{')
      expect(r.handover.balanceTotal).toBe(r.settlement.carryover)
    }
  })
  it('繰り越しの確かめを通る（現金の照合がまだ、と知らせるだけ）', () => {
    const check = checkCarryForward(book)
    expect(check.ok).toBe(true)
    expect(check.warnings.map((w) => w.code)).toEqual(['reconcile-unchecked'])
    expect(check.preview.label).toBe('令和9年度')
  })
  it('何度呼んでも同じもの。書きかえようとするとエラーになる', () => {
    expect(createSampleBook()).toBe(book)
    expect(Object.isFrozen(book)).toBe(true)
    expect(Object.isFrozen(y2.transactions)).toBe(true)
    expect(() => {
      ;(y2.transactions as unknown[]).push({})
    }).toThrow()
  })
  it('サンプルから続けて入力できる（元のサンプルは変わらない）', () => {
    const cash = y2.accounts[0].id
    const category = y2.categories.find((c) => c.name === '事務費')!.id
    const input = { date: '2026-11-14', kind: 'expense' as const, categoryId: category, accountId: cash, amount: 1_200, description: 'ボールペン' }
    expect(checkTransaction(book, y2.id, input, { today: '2026-11-14' })).toEqual({ errors: [], warnings: [] })
    const r = addTransaction(book, y2.id, input)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.years[1].transactions).toHaveLength(y2.transactions.length + 1)
      expect(r.value.revision).toBe(1)
      expect(summarizeYear(r.value.years[1]).carryover).toBe(909_922 - 1_200)
    }
    expect(createSampleBook().years[1].transactions).toHaveLength(y2.transactions.length)
  })
  it('id は、いつ作っても同じ（静的HTMLとブラウザで、見本が食いちがわない）', () => {
    expect(y1.id).toBe('s017')
    expect(y1.accounts.map((a) => a.id)).toEqual(['s001', 's002', 's027'])
    expect(y1.transactions[0].id).toBe('s028')
    // 保管場所は、項目の数だけ入っている（ひな形の項目を増やしたら、サンプルの保管場所も足すこと）
    expect(y1.handover.custody.every((c) => c.place !== '' && c.handedOver)).toBe(true)
  })

  it('isSampleBook: サンプルと、サンプルに取引を足したものは見本。名前を変えたもの・新しく作ったものは見本ではない', () => {
    const sample = createSampleBook()
    expect(isSampleBook(sample)).toBe(true)

    const y = sample.years[1]
    const added = addTransaction(sample, y.id, {
      date: '2026-11-14',
      kind: 'expense',
      categoryId: y.categories.find((c) => c.side === 'expense')!.id,
      accountId: y.accounts[0].id,
      amount: 100,
    })
    expect(added.ok && isSampleBook(added.value)).toBe(true)

    // ファイルに書き出して読み込んでも、見本だとわかる
    const parsed = parseBookFile(serializeBook(sample, new Date('2026-11-14T00:00:00Z')))
    expect(parsed.ok && isSampleBook(parsed.book)).toBe(true)

    const renamed = updateOrg(sample, { orgName: 'みどり町内会' })
    expect(renamed.ok && isSampleBook(renamed.value)).toBe(false)

    // 同じ名前の団体を新しく作っても、id が違うので見本にはならない
    const fresh = createBook({ orgName: sample.orgName, orgKind: 'chonaikai', startDate: '2026-04-01' })
    expect(fresh.ok && isSampleBook(fresh.value)).toBe(false)
  })
})
