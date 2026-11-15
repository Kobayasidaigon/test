import { describe, expect, it } from 'vitest'
import { addTransaction, buildReports, isYearLocked, reconcileYear, removeTransaction, summarizeYear } from '@/core'
import {
  RECON_ACCOUNT_NAME,
  RECON_DUPLICATE_ID,
  RECON_PASSBOOK,
  TRY_ACCOUNT_NAME,
  TRY_DATE,
  createDemoBook,
  createReconcileDemoBook,
  demoYearId,
} from './demo'

// LP の見本は、サンプルの帳簿（src/core/sample.ts）の中身をあてにしている。
// サンプルを変えたときに、LP の見本と、そのまわりの文（「防犯灯の電気代を、わざと二重に」など）が
// 食いちがったままにならないよう、あてにしていることを、ここで確かめる。

describe('LP の見本の帳簿', () => {
  it('令和7年度だけの帳簿で、書きかえられる。決算書は、残高と合っている', () => {
    const book = createDemoBook()
    expect(book.years).toHaveLength(1)
    expect(book.years[0].label).toBe('令和7年度')
    expect(isYearLocked(book, demoYearId(book))).toBe(false)
    const reports = buildReports(book, demoYearId(book))
    expect(reports?.settlement.balanced).toBe(true)
    expect(reports?.settlement.carryover).toBe(736_918)
    // 5種類とも、中身がある
    expect(reports?.ledgers.ledgers[0].title).toBe('現金出納帳')
    expect(reports?.audit.auditors.length).toBeGreaterThan(0)
    expect(reports?.budgetDraft.expense.rows.length).toBeGreaterThan(0)
    expect(reports?.handover.custody.length).toBeGreaterThan(0)
  })

  it('何回作っても、同じ帳簿になる（静的HTMLと、ブラウザで描いた結果を同じにするため）', () => {
    expect(JSON.stringify(createDemoBook())).toBe(JSON.stringify(createDemoBook()))
    expect(JSON.stringify(createReconcileDemoBook())).toBe(JSON.stringify(createReconcileDemoBook()))
  })

  it('「ためしに1件」: はじめに入っている例（防災・防犯費 8,800円）を入れると、決算書が変わる', () => {
    const book = createDemoBook()
    const year = book.years[0]
    const category = year.categories.find((c) => c.side === 'expense' && c.name === '防災・防犯費')
    const account = year.accounts.find((a) => a.name === TRY_ACCOUNT_NAME)
    expect(category).toBeDefined()
    expect(account).toBeDefined()
    const added = addTransaction(book, year.id, { date: TRY_DATE, kind: 'expense', categoryId: category!.id, accountId: account!.id, amount: 8_800, description: '消火器の入れかえ' })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const after = summarizeYear(added.value.years[0])
    expect(after.carryover).toBe(736_918 - 8_800)
    expect(after.balanced).toBe(true)
    // もとの見本は、変わっていない
    expect(summarizeYear(book.years[0]).carryover).toBe(736_918)
  })
})

describe('LP の照合の見本', () => {
  const row = (book: ReturnType<typeof createReconcileDemoBook>) => reconcileYear(book.years[0]).rows.find((r) => r.name === RECON_ACCOUNT_NAME)!

  it('はじめは、通帳のほうが 13,510円 多い。差と同じ金額の取引が、手がかりに出る', () => {
    const r = row(createReconcileDemoBook())
    expect(r.actual).toBe(RECON_PASSBOOK)
    expect(r.status).toBe('over')
    expect(r.diff).toBe(13_510)
    expect(r.message).toBe('通帳の残高のほうが、帳簿より 13,510円 多いです。')
    expect(r.hints.some((h) => h.includes('差と同じ金額（13,510円）の取引があります') && h.includes('防犯灯の電気代（1〜3月分）'))).toBe(true)
  })

  it('二重に入れた取引を消すと、合う', () => {
    const book = createReconcileDemoBook()
    const fixed = removeTransaction(book, book.years[0].id, RECON_DUPLICATE_ID)
    expect(fixed.ok).toBe(true)
    if (!fixed.ok) return
    const r = row(fixed.value)
    expect(r.status).toBe('match')
    expect(r.message).toBe('通帳の残高と帳簿が合っています。')
  })
})
