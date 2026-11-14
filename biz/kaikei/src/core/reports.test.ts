import { describe, expect, it } from 'vitest'
import { setNextBudget, setReconciliation, updateAudit, updateCategory, updateHandover, updateOfficers, updateOrg, updateYear } from './book'
import { carryForward } from './carry'
import {
  buildAuditReport,
  buildBudgetDraft,
  buildHandoverReport,
  buildLedgerReport,
  buildReports,
  buildSettlement,
  diffLabel,
  periodText,
  renderAuditText,
} from './reports'
import { createSampleBook } from './sample'
import { DEFAULT_AUDIT_TEXT } from './templates'
import { bankId, cashId, catId, deposit, expense, income, newBook, ok, year } from './test-helpers'
import type { Book } from './types'

function filled(): Book {
  let book = newBook()
  const y = year(book).id
  book = ok(updateCategory(book, y, catId(book, 'income', '会費'), { budget: 36_000, note: '月500円 × 6世帯' }))
  book = ok(updateCategory(book, y, catId(book, 'expense', '事務費'), { budget: 5_000 }))
  book = ok(updateCategory(book, y, catId(book, 'expense', '予備費'), { budget: 141_000 }))
  book = income(book, '2026-04-10', 30_000)
  book = deposit(book, '2026-04-12', 25_000)
  book = expense(book, '2026-05-01', 1_500)
  return book // 前年度繰越金 110,000、収入 30,000、支出 1,500、次年度繰越金 138,500
}

describe('収支決算書', () => {
  it('収入の部の最初の行は、前年度繰越金', () => {
    const r = buildSettlement(filled(), year(filled()).id)!
    expect(r.income.rows[0]).toEqual({ key: 'carryover', name: '前年度繰越金', budget: 110_000, actual: 110_000, diff: 0, note: '', isCarryover: true })
    expect(r.income.rows[1]).toMatchObject({ name: '会費', budget: 36_000, actual: 30_000, diff: -6_000, note: '月500円 × 6世帯', isCarryover: false })
    expect(r.expense.rows.every((row) => !row.isCarryover)).toBe(true)
  })
  it('収入の合計 − 支出の合計 ＝ 次年度繰越金 ＝ 内訳の合計', () => {
    const r = buildSettlement(filled(), year(filled()).id)!
    expect(r.incomeTotal).toBe(140_000)
    expect(r.incomeThisYear).toBe(30_000)
    expect(r.expenseTotal).toBe(1_500)
    expect(r.carryover).toBe(138_500)
    expect(r.incomeTotal - r.expenseTotal).toBe(r.carryover)
    expect(r.breakdown.map((b) => [b.name, b.amount])).toEqual([
      ['現金', 13_500],
      ['普通預金', 125_000],
    ])
    expect(r.breakdownTotal).toBe(r.carryover)
    expect(r.balanced).toBe(true)
  })
  it('合計の行は、上の行の合計と合う', () => {
    const r = buildSettlement(filled(), year(filled()).id)!
    for (const section of [r.income, r.expense]) {
      expect(section.rows.reduce((t, row) => t + row.budget, 0)).toBe(section.total.budget)
      expect(section.rows.reduce((t, row) => t + row.actual, 0)).toBe(section.total.actual)
      expect(section.rows.reduce((t, row) => t + row.diff, 0)).toBe(section.total.diff)
    }
    expect(r.income.total).toEqual({ budget: 146_000, actual: 140_000, diff: -6_000 })
    expect(r.expense.total).toEqual({ budget: 146_000, actual: 1_500, diff: -144_500 })
  })
  it('題名、期間、作成日、名前が入る', () => {
    let book = filled()
    book = ok(updateOfficers(book, year(book).id, { president: '高橋 正夫', treasurer: '鈴木 和子' }))
    book = ok(updateYear(book, year(book).id, { reportDate: '2027-04-05' }))
    const r = buildSettlement(book, year(book).id)!
    expect(r.title).toBe('令和8年度 収支決算書')
    expect(r.orgName).toBe('テスト町内会')
    expect(r.periodText).toBe('令和8年4月1日から令和9年3月31日まで')
    expect(r.reportDate).toBe('2027-04-05')
    expect(r.treasurer).toEqual({ title: '会計', name: '鈴木 和子' })
    expect(r.president).toEqual({ title: '会長', name: '高橋 正夫' })
  })
  it('「差」の向きを変えると、行も合計も逆になる', () => {
    const book = ok(updateOrg(filled(), { diffStyle: 'budget-minus-actual' }))
    const r = buildSettlement(book, year(book).id)!
    expect(r.diffLabel).toBe('差（予算−決算）')
    expect(r.income.rows[1].diff).toBe(6_000)
    expect(r.income.total.diff).toBe(6_000)
    expect(r.expense.total.diff).toBe(144_500)
    expect(diffLabel('actual-minus-budget')).toBe('差（決算−予算）')
  })
  it('前年度繰越金の予算額を、決算額と別に決められる', () => {
    const book = ok(updateYear(filled(), year(filled()).id, { carryoverBudget: 100_000 }))
    const r = buildSettlement(book, year(book).id)!
    expect(r.income.rows[0]).toMatchObject({ budget: 100_000, actual: 110_000, diff: 10_000 })
    expect(r.income.total.budget).toBe(136_000)
  })
  it('取引が1件もなくても作れる', () => {
    const book = newBook()
    const r = buildSettlement(book, year(book).id)!
    expect(r.incomeTotal).toBe(110_000)
    expect(r.expenseTotal).toBe(0)
    expect(r.carryover).toBe(110_000)
    expect(r.reportDate).toBe('')
    expect(r.treasurer.name).toBe('')
  })
  it('ない年度は null', () => {
    expect(buildSettlement(filled(), 'ない年度')).toBeNull()
    expect(buildReports(filled(), 'ない年度')).toBeNull()
  })
})

describe('出納帳', () => {
  it('置き場所ごとに出る。最後の残高は、決算書の内訳と同じ', () => {
    const book = filled()
    const ledgers = buildLedgerReport(book, year(book).id)!
    const settlement = buildSettlement(book, year(book).id)!
    expect(ledgers.ledgers.map((l) => l.title)).toEqual(['現金出納帳', '預金出納帳（普通預金）'])
    expect(ledgers.ledgers.map((l) => l.closing)).toEqual(settlement.breakdown.map((b) => b.amount))
    expect(ledgers.yearLabel).toBe('令和8年度')
  })
})

describe('会計監査報告書', () => {
  it('本文の {年度} {期間} {団体名} が置きかわる', () => {
    const book = filled()
    const r = buildAuditReport(book, year(book).id)!
    expect(r.title).toBe('会計監査報告書')
    expect(r.body).toBe(
      '令和8年度（令和8年4月1日から令和9年3月31日まで）のテスト町内会の会計について、帳簿、預金通帳、領収書などを照らし合わせて監査した結果、適正に処理されていることを認めます。',
    )
    expect(r.body).not.toContain('{')
  })
  it('言い回しを変えられる。置きかえの印がなくてもよい。同じ印が2回出てもよい', () => {
    let book = filled()
    book = ok(updateAudit(book, year(book).id, { text: '{年度}の帳簿を見ました。{年度}の会計は正しいです。\n以上', date: '2027-04-12' }))
    const r = buildAuditReport(book, year(book).id)!
    expect(r.body).toBe('令和8年度の帳簿を見ました。令和8年度の会計は正しいです。\n以上')
    expect(r.date).toBe('2027-04-12')
    expect(renderAuditText('印のない文', book, year(book))).toBe('印のない文')
  })
  it('署名欄は、監査をする人の数だけ。名前が空でも欄は出る', () => {
    let book = filled()
    expect(buildAuditReport(book, year(book).id)!.auditors).toEqual(['', ''])
    book = ok(updateOfficers(book, year(book).id, { president: '高橋 正夫', auditors: ['田中 清', '', '伊藤 恵子'] }))
    const r = buildAuditReport(book, year(book).id)!
    expect(r.auditors).toEqual(['田中 清', '', '伊藤 恵子'])
    expect(r.auditorTitle).toBe('監事')
    expect(r.addressee).toBe('テスト町内会 会長 高橋 正夫 様')
  })
  it('会長の名前が空なら、宛て名は役の名前まで', () => {
    expect(buildAuditReport(filled(), year(filled()).id)!.addressee).toBe('テスト町内会 会長 様')
  })
  it('金額は、決算書と同じ', () => {
    const book = filled()
    const audit = buildAuditReport(book, year(book).id)!
    const settlement = buildSettlement(book, year(book).id)!
    expect(audit.figures).toEqual({ incomeTotal: settlement.incomeTotal, expenseTotal: settlement.expenseTotal, carryover: settlement.carryover })
  })
  it('監査の日が空でも作れる', () => {
    expect(buildAuditReport(filled(), year(filled()).id)!.date).toBe('')
  })
  it('初期の本文には、3つの印がすべて入っている', () => {
    for (const mark of ['{年度}', '{期間}', '{団体名}']) expect(DEFAULT_AUDIT_TEXT).toContain(mark)
  })
})

describe('次年度の予算案', () => {
  it('科目ごとに、今年度の予算・今年度の決算・次年度の予算案が並ぶ', () => {
    let book = filled()
    book = ok(setNextBudget(book, year(book).id, catId(book, 'income', '会費'), 40_000))
    const r = buildBudgetDraft(book, year(book).id)!
    expect(r.title).toBe('令和9年度 収支予算書（案）')
    expect(r.nextYearLabel).toBe('令和9年度')
    expect(r.nextPeriodText).toBe('令和9年4月1日から令和10年3月31日まで')
    expect(r.income.rows[1]).toEqual({ key: catId(book, 'income', '会費'), name: '会費', currentBudget: 36_000, currentActual: 30_000, nextBudget: 40_000, entered: true, isCarryover: false })
  })
  it('予算案を入れていない科目は、今年度の予算と同じ額になる', () => {
    const book = filled()
    const row = buildBudgetDraft(book, year(book).id)!.expense.rows.find((r) => r.name === '事務費')!
    expect(row).toMatchObject({ currentBudget: 5_000, nextBudget: 5_000, entered: false })
  })
  it('0円 と入れた科目は、0円 のまま（入れていないのとは別）', () => {
    const book = ok(setNextBudget(filled(), year(filled()).id, catId(filled(), 'expense', '事務費'), 0))
    const row = buildBudgetDraft(book, year(book).id)!.expense.rows.find((r) => r.name === '事務費')!
    expect(row).toMatchObject({ nextBudget: 0, entered: true })
  })
  it('次年度の前年度繰越金は、今年度の次年度繰越金', () => {
    const book = filled()
    const r = buildBudgetDraft(book, year(book).id)!
    expect(r.income.rows[0]).toMatchObject({ name: '前年度繰越金', currentActual: 110_000, nextBudget: 138_500, isCarryover: true })
    expect(r.income.rows[0].nextBudget).toBe(buildSettlement(book, year(book).id)!.carryover)
  })
  it('収入と支出の予算の差を出す', () => {
    let book = filled()
    // 収入の予算: 繰越 138,500 + 会費 36,000 = 174,500。支出の予算: 事務費 5,000 + 予備費 141,000 = 146,000
    expect(buildBudgetDraft(book, year(book).id)!.gap).toBe(28_500)
    book = ok(setNextBudget(book, year(book).id, catId(book, 'expense', '予備費'), 169_500))
    const r = buildBudgetDraft(book, year(book).id)!
    expect(r.gap).toBe(0)
    expect(r.income.total.nextBudget).toBe(r.expense.total.nextBudget)
  })
  it('繰り越したあとは、できている次の年度の呼び名と期間を使う', () => {
    let book = filled()
    book = ok(carryForward(book, { label: '第2期', endDate: '2027-12-31' }))
    const r = buildBudgetDraft(book, book.years[0].id)!
    expect(r.title).toBe('第2期 収支予算書（案）')
    expect(r.nextPeriodText).toBe('令和9年4月1日から令和9年12月31日まで')
  })
  it('繰り越したあとの新しい年度の予算は、予算案の「次年度の予算案」の列と同じ', () => {
    let book = filled()
    book = ok(setNextBudget(book, year(book).id, catId(book, 'income', '会費'), 40_000))
    const draft = buildBudgetDraft(book, year(book).id)!
    book = ok(carryForward(book))
    const next = buildSettlement(book, book.years[1].id)!
    expect(next.income.rows.map((r) => [r.name, r.budget])).toEqual(draft.income.rows.map((r) => [r.name, r.nextBudget]))
    expect(next.expense.rows.map((r) => [r.name, r.budget])).toEqual(draft.expense.rows.map((r) => [r.name, r.nextBudget]))
  })
})

describe('引き継ぎ書', () => {
  it('残高は、決算書の内訳と同じ。照合の結果が付く', () => {
    let book = filled()
    book = ok(setReconciliation(book, year(book).id, cashId(book), { date: '2027-03-31', actual: 13_000 }))
    const r = buildHandoverReport(book, year(book).id)!
    expect(r.title).toBe('会計引き継ぎ書')
    expect(r.balances).toEqual([
      { accountId: cashId(book), name: '現金', kind: 'cash', bookBalance: 13_500, check: { date: '2027-03-31', actual: 13_000, diff: -500, status: 'short' } },
      { accountId: bankId(book), name: '普通預金', kind: 'bank', bookBalance: 125_000, check: null },
    ])
    expect(r.balanceTotal).toBe(138_500)
    expect(r.lastTransactionDate).toBe('2026-05-01')
  })
  it('未払い・未収の合計は、金額がわかっている分だけ', () => {
    let book = filled()
    book = ok(
      updateHandover(book, year(book).id, {
        date: '2027-04-18',
        successor: '渡辺 由美',
        unpaid: [{ id: 'u1', description: '電気代', amount: 4_500 }, { id: 'u2', description: 'まだわからない', amount: null }, { id: 'u3', description: '鍵', amount: 1_650 }],
        unreceived: [{ id: 'r1', description: '補助金', amount: null }],
        memo: 'よろしくお願いします',
      }),
    )
    book = ok(updateOfficers(book, year(book).id, { treasurer: '鈴木 和子' }))
    const r = buildHandoverReport(book, year(book).id)!
    expect(r.unpaidTotal).toBe(6_150)
    expect(r.unreceivedTotal).toBe(0)
    expect(r.from).toEqual({ title: '会計', name: '鈴木 和子' })
    expect(r.to).toEqual({ title: '次の会計', name: '渡辺 由美' })
    expect(r.date).toBe('2027-04-18')
    expect(r.memo).toBe('よろしくお願いします')
    expect(r.custody.length).toBeGreaterThan(0)
  })
  it('取引がなくても作れる', () => {
    const book = newBook()
    const r = buildHandoverReport(book, year(book).id)!
    expect(r.lastTransactionDate).toBeNull()
    expect(r.balanceTotal).toBe(110_000)
    expect(r.unpaid).toEqual([])
  })
  it('返した一覧を書きかえても、帳簿は変わらない', () => {
    const book = filled()
    const r = buildHandoverReport(book, year(book).id)!
    r.custody[0].place = '書きかえた'
    expect(year(book).handover.custody[0].place).toBe('')
  })
})

describe('5種類をまとめて作る', () => {
  it('どの資料も、同じ数字を指している', () => {
    const book = filled()
    const r = buildReports(book, year(book).id)!
    expect(r.settlement.carryover).toBe(138_500)
    expect(r.audit.figures.carryover).toBe(138_500)
    expect(r.handover.balanceTotal).toBe(138_500)
    expect(r.budgetDraft.income.rows[0].nextBudget).toBe(138_500)
    expect(r.ledgers.ledgers.reduce((t, l) => t + l.closing, 0)).toBe(138_500)
  })
  it('periodText', () => {
    expect(periodText({ startDate: '2026-01-01', endDate: '2026-12-31' })).toBe('令和8年1月1日から令和8年12月31日まで')
  })
})

describe('サンプルの団体の資料（LP に置く見本）', () => {
  const book = createSampleBook()
  const r = buildReports(book, book.years[0].id)!

  it('令和7年度の収支決算書の数字', () => {
    expect(r.settlement.title).toBe('令和7年度 収支決算書')
    expect(r.settlement.orgName).toBe('あおぞら町内会')
    expect(r.settlement.income.rows.map((row) => [row.name, row.budget, row.actual, row.diff])).toEqual([
      ['前年度繰越金', 604_774, 604_774, 0],
      ['会費', 372_000, 369_000, -3_000],
      ['市の補助金', 40_000, 40_000, 0],
      ['資源回収の報奨金', 24_000, 24_420, 420],
      ['雑収入', 500, 10_659, 10_159],
    ])
    expect(r.settlement.income.total).toEqual({ budget: 1_041_274, actual: 1_048_853, diff: 7_579 })
    expect(r.settlement.expense.rows.map((row) => [row.name, row.budget, row.actual])).toEqual([
      ['事務費', 20_000, 11_264],
      ['会議費', 15_000, 7_100],
      ['行事費', 160_000, 134_090],
      ['防災・防犯費', 50_000, 43_905],
      ['環境美化費', 30_000, 13_376],
      ['防犯灯の電気代', 54_000, 53_760],
      ['慶弔費', 20_000, 10_000],
      ['連合会の負担金', 37_200, 37_200],
      ['雑費', 5_000, 1_240],
      ['予備費', 650_074, 0],
    ])
    expect(r.settlement.expense.total).toEqual({ budget: 1_041_274, actual: 311_935, diff: -729_339 })
    expect(r.settlement.carryover).toBe(736_918)
    expect(r.settlement.breakdown.map((b) => [b.name, b.amount])).toEqual([
      ['現金', 5_185],
      ['普通預金', 481_733],
      ['定期預金（防災の積立）', 250_000],
    ])
    expect(r.settlement.balanced).toBe(true)
    expect(r.settlement.reportDate).toBe('2026-04-05')
    expect(r.settlement.treasurer.name).toBe('鈴木 和子')
  })
  it('予算は、収入と支出が合っている', () => {
    expect(r.settlement.income.total.budget).toBe(r.settlement.expense.total.budget)
    expect(r.budgetDraft.gap).toBe(0)
    expect(r.budgetDraft.title).toBe('令和8年度 収支予算書（案）')
  })
  it('監査報告書と引き継ぎ書', () => {
    expect(r.audit.auditors).toEqual(['田中 清', '伊藤 恵子'])
    expect(r.audit.date).toBe('2026-04-12')
    expect(r.handover.to.name).toBe('渡辺 由美')
    expect(r.handover.balances.every((b) => b.check?.status === 'match')).toBe(true)
    expect(r.handover.unpaidTotal).toBe(1_650)
    expect(r.handover.equipment).toHaveLength(4)
  })
  it('出納帳は3冊。現金出納帳の最後の残高は 5,185円', () => {
    expect(r.ledgers.ledgers.map((l) => l.title)).toEqual(['現金出納帳', '預金出納帳（普通預金）', '預金出納帳 定期預金（防災の積立）'])
    expect(r.ledgers.ledgers[0].closing).toBe(5_185)
  })
})
