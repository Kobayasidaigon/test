// 通しの確かめ: 1つの団体の1年ぶんを、はじめから終わりまで動かす。
// 期待する数字は、どれも、紙の上で手で計算したもの（このファイルの中では、ロジックの関数を使って期待値を作らない）。
// 個々の関数のテストは、ほかの *.test.ts にある。ここは、点検のときに別の人が書いた「答え合わせ」。
//
// 団体: ひまわり子ども会（令和7年度 2025-04-01〜2026-03-31）。年度はじめ: 現金 12,345円、ゆうちょ 80,000円（合計 92,345円）
//
//   日付        動き            金額     置き場所          現金の残高   ゆうちょの残高
//   （年度はじめ）                                           12,345       80,000
//   4/20  収入  会費           60,000   現金               72,345       80,000
//   4/21  移動  預け入れ       50,000   現金→ゆうちょ      22,345      130,000
//   5/10  支出  保険料          5,400   ゆうちょ           22,345      124,600
//   6/15  収入  補助金         20,000   ゆうちょ           22,345      144,600
//   7/20  移動  引き出し       40,000   ゆうちょ→現金      62,345      104,600
//   7/21  支出  行事費         45,800   現金               16,545      104,600
//   1/15  支出  活動費          3,200   現金               13,345      104,600
//   3/20  支出  記念品費       12,000   ゆうちょ           13,345       92,600
//   3/31  収入  雑収入             15   ゆうちょ           13,345       92,615
//
//   収入 80,015 ／ 支出 66,400 ／ 次年度繰越金 92,345 + 80,015 − 66,400 = 105,960（＝ 13,345 + 92,615）
import { describe, expect, it } from 'vitest'
import {
  addTransaction,
  checkTransaction,
  createBook,
  setNextBudget,
  setReconciliation,
  updateCategory,
  updateOrg,
  type TransactionInput,
} from './book'
import { accountBalances, buildLedger, negativeBalanceDays, reconcileYear, summarizeYear } from './calc'
import { carryForward, checkCarryForward } from './carry'
import { buildBookFile, parseBookFile } from './file'
import { buildBudgetDraft, buildSettlement } from './reports'
import { failCode, ok, seqIds } from './test-helpers'
import type { Book } from './types'

function himawari(): { book: Book; yearId: string; cash: string; bank: string; cat: (name: string) => string } {
  const ids = seqIds('h')
  let book = ok(
    createBook(
      { orgName: 'ひまわり子ども会', orgKind: 'kodomokai', startDate: '2025-04-01', cashOpening: 12_345, bankAccounts: [{ name: 'ゆうちょ', openingBalance: 80_000 }] },
      ids,
    ),
  )
  const year = book.years[0]
  const yearId = year.id
  const cash = year.accounts[0].id
  const bank = year.accounts[1].id
  const cat = (name: string) => {
    const c = year.categories.find((x) => x.name === name)
    if (!c) throw new Error(`科目がありません: ${name}`)
    return c.id
  }
  // 予算。収入（繰越金 92,345 を入れて 172,345）と、支出（86,000 + 予備費 86,345 = 172,345）を合わせてある
  const budgets: [string, number][] = [
    ['会費', 60_000],
    ['補助金・助成金', 20_000],
    ['行事費', 50_000],
    ['活動費', 10_000],
    ['保険料', 6_000],
    ['記念品費', 20_000],
    ['予備費', 86_345],
  ]
  for (const [name, budget] of budgets) book = ok(updateCategory(book, yearId, cat(name), { budget }))
  const entries: TransactionInput[] = [
    { date: '2025-04-20', kind: 'income', categoryId: cat('会費'), description: '年会費 30人', amount: 60_000, accountId: cash },
    { date: '2025-04-21', kind: 'transfer', description: '会費を預け入れ', amount: 50_000, accountId: cash, toAccountId: bank },
    { date: '2025-05-10', kind: 'expense', categoryId: cat('保険料'), description: '安全会の保険料', amount: 5_400, accountId: bank },
    { date: '2025-06-15', kind: 'income', categoryId: cat('補助金・助成金'), description: '市の助成金', amount: 20_000, accountId: bank },
    { date: '2025-07-20', kind: 'transfer', description: 'キャンプの準備金', amount: 40_000, accountId: bank, toAccountId: cash },
    { date: '2025-07-21', kind: 'expense', categoryId: cat('行事費'), description: '夏のキャンプ', amount: 45_800, accountId: cash },
    { date: '2026-01-15', kind: 'expense', categoryId: cat('活動費'), description: '新年のかるた会', amount: 3_200, accountId: cash },
    { date: '2026-03-20', kind: 'expense', categoryId: cat('記念品費'), description: '卒業の記念品', amount: 12_000, accountId: bank },
    { date: '2026-03-31', kind: 'income', categoryId: cat('雑収入'), description: '預金の利息', amount: 15, accountId: bank },
  ]
  for (const input of entries) book = ok(addTransaction(book, yearId, input, ids))
  return { book, yearId, cash, bank, cat }
}

describe('通しの確かめ: ひまわり子ども会の1年（手で計算した答えと合うか）', () => {
  it('収入・支出・繰越金。移動（90,000円）は、収入にも支出にも入らない', () => {
    const { book } = himawari()
    const s = summarizeYear(book.years[0])
    expect(s.openingTotal).toBe(92_345)
    expect(s.incomeTotal).toBe(80_015)
    expect(s.expenseTotal).toBe(66_400)
    expect(s.transferTotal).toBe(90_000)
    expect(s.carryover).toBe(105_960)
    expect(s.accounts.map((a) => [a.name, a.closing])).toEqual([
      ['現金', 13_345],
      ['ゆうちょ', 92_615],
    ])
    expect(s.closingTotal).toBe(105_960)
    expect(s.balanced).toBe(true)
    expect(s.counts).toEqual({ income: 3, expense: 4, transfer: 2 })
    expect(s.budgetGap).toBe(0)
  })

  it('収支決算書の行（予算・決算・差）と合計', () => {
    const { book, yearId } = himawari()
    const r = buildSettlement(book, yearId)!
    expect(r.title).toBe('令和7年度 収支決算書')
    expect(r.periodText).toBe('令和7年4月1日から令和8年3月31日まで')
    expect(r.income.rows.map((x) => [x.name, x.budget, x.actual, x.diff])).toEqual([
      ['前年度繰越金', 92_345, 92_345, 0],
      ['会費', 60_000, 60_000, 0],
      ['補助金・助成金', 20_000, 20_000, 0],
      ['資源回収の収入', 0, 0, 0],
      ['雑収入', 0, 15, 15],
    ])
    expect(r.income.total).toEqual({ budget: 172_345, actual: 172_360, diff: 15 })
    expect(r.expense.rows.map((x) => [x.name, x.budget, x.actual, x.diff])).toEqual([
      ['行事費', 50_000, 45_800, -4_200],
      ['活動費', 10_000, 3_200, -6_800],
      ['保険料', 6_000, 5_400, -600],
      ['記念品費', 20_000, 12_000, -8_000],
      ['連合会の負担金', 0, 0, 0],
      ['事務費', 0, 0, 0],
      ['雑費', 0, 0, 0],
      ['予備費', 86_345, 0, -86_345],
    ])
    expect(r.expense.total).toEqual({ budget: 172_345, actual: 66_400, diff: -105_945 })
    expect(r.incomeTotal).toBe(172_360)
    expect(r.expenseTotal).toBe(66_400)
    expect(r.carryover).toBe(105_960)
    expect(r.breakdown.map((b) => [b.name, b.amount])).toEqual([
      ['現金', 13_345],
      ['ゆうちょ', 92_615],
    ])
    expect(r.breakdownTotal).toBe(105_960)
  })

  it('「差」の向きを「予算−決算」にすると、符号だけが逆になる', () => {
    const { book, yearId } = himawari()
    const flipped = ok(updateOrg(book, { diffStyle: 'budget-minus-actual' }))
    const r = buildSettlement(flipped, yearId)!
    expect(r.income.rows.find((x) => x.name === '雑収入')?.diff).toBe(-15)
    expect(r.expense.rows.find((x) => x.name === '行事費')?.diff).toBe(4_200)
    expect(r.income.total.diff).toBe(-15)
    expect(r.expense.total.diff).toBe(105_945)
    // 金額そのものは変わらない
    expect(r.carryover).toBe(105_960)
  })

  it('現金出納帳: 1行ごとの残高と、入金・出金の合計', () => {
    const { book, cash } = himawari()
    const ledger = buildLedger(book.years[0], cash)!
    expect(ledger.title).toBe('現金出納帳')
    expect(ledger.rows.map((r) => [r.date, r.categoryName, r.inflow, r.outflow, r.balance])).toEqual([
      ['2025-04-01', '', null, null, 12_345],
      ['2025-04-20', '会費', 60_000, null, 72_345],
      ['2025-04-21', '預け入れ（ゆうちょへ）', null, 50_000, 22_345],
      ['2025-07-20', '引き出し（ゆうちょから）', 40_000, null, 62_345],
      ['2025-07-21', '行事費', null, 45_800, 16_545],
      ['2026-01-15', '活動費', null, 3_200, 13_345],
    ])
    expect([ledger.opening, ledger.inflowTotal, ledger.outflowTotal, ledger.closing]).toEqual([12_345, 100_000, 99_000, 13_345])
  })

  it('預金出納帳: 1行ごとの残高と、入金・出金の合計', () => {
    const { book, bank } = himawari()
    const ledger = buildLedger(book.years[0], bank)!
    expect(ledger.title).toBe('預金出納帳（ゆうちょ）')
    expect(ledger.rows.map((r) => [r.date, r.inflow, r.outflow, r.balance])).toEqual([
      ['2025-04-01', null, null, 80_000],
      ['2025-04-21', 50_000, null, 130_000],
      ['2025-05-10', null, 5_400, 124_600],
      ['2025-06-15', 20_000, null, 144_600],
      ['2025-07-20', null, 40_000, 104_600],
      ['2026-03-20', null, 12_000, 92_600],
      ['2026-03-31', 15, null, 92_615],
    ])
    expect([ledger.opening, ledger.inflowTotal, ledger.outflowTotal, ledger.closing]).toEqual([80_000, 70_015, 57_400, 92_615])
  })

  it('領収書の番号は、支出にだけ、入れた順に 1〜4 が付く', () => {
    const { book } = himawari()
    expect(book.years[0].transactions.map((t) => [t.kind, t.receiptNo])).toEqual([
      ['income', ''],
      ['transfer', ''],
      ['expense', '1'],
      ['income', ''],
      ['transfer', ''],
      ['expense', '2'],
      ['expense', '3'],
      ['expense', '4'],
      ['income', ''],
    ])
  })

  it('その日までの残高（引き出しの前の日と、当日）', () => {
    const { book } = himawari()
    const at = (date: string) => accountBalances(book.years[0], date).map((a) => a.closing)
    expect(at('2025-03-31')).toEqual([12_345, 80_000])
    expect(at('2025-07-19')).toEqual([22_345, 144_600])
    expect(at('2025-07-20')).toEqual([62_345, 104_600])
    expect(at('2026-03-30')).toEqual([13_345, 92_600])
    expect(at('2026-03-31')).toEqual([13_345, 92_615])
  })

  it('残高の照合: 合えば「合っています」。合わなければ、いくら違うかを言う', () => {
    const { book, yearId, cash, bank } = himawari()
    let b = ok(setReconciliation(book, yearId, bank, { date: '2026-03-31', actual: 92_615 }))
    b = ok(setReconciliation(b, yearId, cash, { date: '2026-03-31', actual: 13_000 }))
    const rec = reconcileYear(b.years[0])
    const bankRow = rec.rows.find((r) => r.accountId === bank)!
    const cashRow = rec.rows.find((r) => r.accountId === cash)!
    expect([bankRow.status, bankRow.diff, bankRow.message]).toEqual(['match', 0, '通帳の残高と帳簿が合っています。'])
    expect([cashRow.status, cashRow.diff, cashRow.message]).toEqual(['short', -345, '手元の現金のほうが、帳簿より 345円 少ないです。'])
    expect([rec.allMatch, rec.mismatchCount, rec.uncheckedCount]).toEqual([false, 1, 0])
    // 利息が付く前の日（3/30）の通帳の残高は 92,600円。その日で照らし合わせれば、92,600円 で合う
    const earlier = ok(setReconciliation(book, yearId, bank, { date: '2026-03-30', actual: 92_600 }))
    expect(reconcileYear(earlier.years[0]).rows.find((r) => r.accountId === bank)?.status).toBe('match')
    // 同じ 92,600円 を、3/31 の残高として入れると、15円 少ない
    const later = ok(setReconciliation(book, yearId, bank, { date: '2026-03-31', actual: 92_600 }))
    expect(reconcileYear(later.years[0]).rows.find((r) => r.accountId === bank)?.message).toBe('通帳の残高のほうが、帳簿より 15円 少ないです。')
  })

  it('知らせ: 年度の外の日付、残高がマイナスになる取引', () => {
    const { book, yearId, cash, cat } = himawari()
    const base: TransactionInput = { date: '2025-07-19', kind: 'expense', categoryId: cat('行事費'), description: 'テントの手付け', amount: 30_000, accountId: cash }
    const codes = (input: TransactionInput) => checkTransaction(book, yearId, input).warnings.map((w) => w.code)
    // 7/19 の現金は 22,345円。30,000円 を払うと △7,655円
    expect(codes(base)).toContain('negative-balance')
    expect(checkTransaction(book, yearId, base).warnings.find((w) => w.code === 'negative-balance')?.message).toContain('△7,655円')
    // 7/19 に 22,345円 ちょうどを払うと、その日は 0円 で、マイナスではない。
    // ただ、あとの日（7/21 のキャンプ代のあと）が △5,800円 になるので、その日のこととして知らせる
    const exact = checkTransaction(book, yearId, { ...base, amount: 22_345 }).warnings.find((w) => w.code === 'negative-balance')
    expect(exact?.message).toContain('令和7年7月21日')
    expect(exact?.message).toContain('△5,800円')
    // あとの日まで見て、いちばん少なくなるのは年度末の 13,345円。そこまでなら、どの日もマイナスにならない
    expect(codes({ ...base, amount: 13_345 })).not.toContain('negative-balance')
    expect(codes({ ...base, amount: 13_346 })).toContain('negative-balance')
    // 年度の初日と末日は中、その外は知らせる
    expect(codes({ ...base, amount: 1, date: '2025-04-01' })).not.toContain('outside-year')
    expect(codes({ ...base, amount: 1, date: '2026-03-31' })).not.toContain('outside-year')
    expect(codes({ ...base, amount: 1, date: '2025-03-31' })).toContain('outside-year')
    expect(codes({ ...base, amount: 1, date: '2026-04-01' })).toContain('outside-year')
    // 知らせを読んだうえで入れると、その日がマイナスの日として残る（△7,655円）
    const added = ok(addTransaction(book, yearId, base))
    expect(negativeBalanceDays(added.years[0]).filter((d) => d.accountId === cash).map((d) => [d.date, d.balance])).toEqual([
      ['2025-07-19', -7_655],
      ['2025-07-21', -13_455],
      ['2026-01-15', -16_655],
      // 現金が動かない日（ゆうちょだけが動いた日）も、その日の終わりの現金はマイナスのままなので、挙がる
      ['2026-03-20', -16_655],
      ['2026-03-31', -16_655],
    ])
    // 年度末の現金がマイナス（△16,655円）なので、繰り越せない
    expect(checkCarryForward(added).ok).toBe(false)
  })

  it('次年度の予算案: 入れた科目はその額、入れていない科目は今年度の予算。前年度繰越金は、今年度の次年度繰越金', () => {
    const { book, yearId, cat } = himawari()
    const b = ok(setNextBudget(book, yearId, cat('会費'), 66_000))
    const d = buildBudgetDraft(b, yearId)!
    expect(d.title).toBe('令和8年度 収支予算書（案）')
    expect(d.income.rows.map((r) => [r.name, r.currentBudget, r.currentActual, r.nextBudget])).toEqual([
      ['前年度繰越金', 92_345, 92_345, 105_960],
      ['会費', 60_000, 60_000, 66_000],
      ['補助金・助成金', 20_000, 20_000, 20_000],
      ['資源回収の収入', 0, 0, 0],
      ['雑収入', 0, 15, 0],
    ])
    // 収入の予算案 105,960 + 66,000 + 20,000 = 191,960。支出の予算案は今年度のまま 172,345。差は 19,615
    expect(d.income.total.nextBudget).toBe(191_960)
    expect(d.expense.total.nextBudget).toBe(172_345)
    expect(d.gap).toBe(19_615)
  })

  it('繰り越し: 新しい年度は、年度末の残高から始まる。予算案が予算になる。前の年度は読むだけ', () => {
    const { book, yearId, cash, bank, cat } = himawari()
    const withDraft = ok(setNextBudget(book, yearId, cat('会費'), 66_000))
    const carried = ok(carryForward(withDraft, {}, seqIds('n')))
    expect(carried.years).toHaveLength(2)
    const next = carried.years[1]
    expect([next.label, next.startDate, next.endDate]).toEqual(['令和8年度', '2026-04-01', '2027-03-31'])
    expect(next.accounts.map((a) => [a.id, a.name, a.openingBalance])).toEqual([
      [cash, '現金', 13_345],
      [bank, 'ゆうちょ', 92_615],
    ])
    expect(next.transactions).toEqual([])
    expect(next.categories.find((c) => c.id === cat('会費'))?.budget).toBe(66_000)
    expect(next.categories.find((c) => c.id === cat('行事費'))?.budget).toBe(50_000)
    const s = summarizeYear(next)
    expect([s.openingTotal, s.incomeTotal, s.expenseTotal, s.carryover]).toEqual([105_960, 0, 0, 105_960])
    // 前の年度の数字は、繰り越しても変わらない。もう書きかえられない
    expect(summarizeYear(carried.years[0]).carryover).toBe(105_960)
    expect(failCode(addTransaction(carried, yearId, { date: '2026-03-31', kind: 'income', categoryId: cat('雑収入'), amount: 1, accountId: cash }))).toBe('year-locked')
    // 新しい年度の領収書の番号は、また 1 から
    const first = ok(addTransaction(carried, next.id, { date: '2026-04-10', kind: 'expense', categoryId: cat('事務費'), description: 'ノート', amount: 330, accountId: cash }))
    expect(first.years[1].transactions[0].receiptNo).toBe('1')
    expect(summarizeYear(first.years[1]).carryover).toBe(105_630)
  })

  it('ひきつぎファイルに書いて、読みもどすと、同じ帳簿になる（2年ぶん）', () => {
    const { book } = himawari()
    const carried = ok(carryForward(book, {}, seqIds('n')))
    const built = ok(buildBookFile(carried, new Date(2026, 3, 5, 12)))
    expect(built.fileName).toBe('ひきつぎ会計_ひまわり子ども会_令和8年度_2026-04-05.json')
    const parsed = parseBookFile(built.text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.book).toEqual(carried)
      expect(parsed.warnings).toEqual([])
      expect(summarizeYear(parsed.book.years[0]).carryover).toBe(105_960)
    }
  })
})
