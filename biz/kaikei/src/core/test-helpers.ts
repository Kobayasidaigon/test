// テストだけで使う小さな道具。index.ts からは出していない。
import { addTransaction, createBook, type NewBookInput, type TransactionInput } from './book'
import { latestYear } from './calc'
import type { Book, FiscalYear, IdMaker, Result, Side } from './types'

/** うまくいった結果の中身を取り出す。だめならテストを落とす。 */
export function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`うまくいくはずの操作が断られました: [${result.code}] ${result.message}`)
  return result.value
}

/** 断られたことを確かめて、理由の名前を返す。 */
export function failCode(result: Result<unknown>): string {
  if (result.ok) throw new Error('断られるはずの操作が、通ってしまいました')
  if (result.message.trim() === '') throw new Error('断る理由の文が空です')
  return result.code
}

/** 「t1」「t2」…と順に id を振る。 */
export function seqIds(prefix = 't'): IdMaker {
  let n = 0
  return () => `${prefix}${++n}`
}

/** 値を、奥まで凍らせる。関数が受け取った値を書きかえていないことを確かめるのに使う。 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/** テスト用の帳簿。町内会のひな形、令和8年度（2026-04-01〜2027-03-31）、現金 10,000円、普通預金 100,000円。 */
export function newBook(overrides: Partial<NewBookInput> = {}, makeId: IdMaker = seqIds()): Book {
  return ok(
    createBook(
      {
        orgName: 'テスト町内会',
        orgKind: 'chonaikai',
        startDate: '2026-04-01',
        cashOpening: 10_000,
        bankAccounts: [{ name: '普通預金', openingBalance: 100_000 }],
        ...overrides,
      },
      makeId,
    ),
  )
}

export function year(book: Book): FiscalYear {
  return latestYear(book)
}

export function cashId(book: Book): string {
  return year(book).accounts.find((a) => a.kind === 'cash')!.id
}

export function bankId(book: Book, name = '普通預金'): string {
  return year(book).accounts.find((a) => a.name === name)!.id
}

export function catId(book: Book, side: Side, name: string): string {
  const c = year(book).categories.find((x) => x.side === side && x.name === name)
  if (!c) throw new Error(`科目「${name}」がありません`)
  return c.id
}

/** 取引を1件足した帳簿を返す。 */
export function add(book: Book, input: TransactionInput, makeId?: IdMaker): Book {
  return ok(addTransaction(book, year(book).id, input, makeId))
}

/** 現金で受け取った会費。 */
export function income(book: Book, date: string, amount: number, description = '会費'): Book {
  return add(book, { date, kind: 'income', categoryId: catId(book, 'income', '会費'), accountId: cashId(book), amount, description })
}

/** 現金で払った事務費。 */
export function expense(book: Book, date: string, amount: number, description = '文具'): Book {
  return add(book, { date, kind: 'expense', categoryId: catId(book, 'expense', '事務費'), accountId: cashId(book), amount, description })
}

/** 現金から普通預金への預け入れ。 */
export function deposit(book: Book, date: string, amount: number): Book {
  return add(book, { date, kind: 'transfer', accountId: cashId(book), toAccountId: bankId(book), amount, description: '預け入れ' })
}

/** 普通預金から現金への引き出し。 */
export function withdraw(book: Book, date: string, amount: number): Book {
  return add(book, { date, kind: 'transfer', accountId: bankId(book), toAccountId: cashId(book), amount, description: '引き出し' })
}
