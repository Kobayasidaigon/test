// 読み込んだデータの検査。ファイルからでも、ブラウザの保存領域からでも、必ずここを通す。
// 形が合わないもの・計算を狂わせるものは、場所と理由を言って断る。
// 通ったデータは、知っている項目だけを写した新しい値にして返す（知らない項目や、あやしいキーを持ち込まないため）。
import { accountBalances } from './calc'
import { addDays, isValidDate } from './dates'
import {
  FILE_FORMAT,
  FILE_VERSION,
  LIMITS,
  fail,
  type Account,
  type Audit,
  type Book,
  type Category,
  type CustodyItem,
  type DateString,
  type EquipmentItem,
  type Fail,
  type FiscalYear,
  type Handover,
  type Officers,
  type PendingItem,
  type Reconciliation,
  type RoleNames,
  type Transaction,
  type Yen,
} from './types'

/** 検査で見つけた問題。path は「years[0].transactions[12].amount」のような場所。 */
export class Invalid extends Error {
  constructor(
    public path: string,
    public reason: string,
  ) {
    super(`${path}: ${reason}`)
  }
}

type Raw = Record<string, unknown>

function obj(value: unknown, path: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Invalid(path, '項目のまとまりではありません')
  return value as Raw
}

function arr(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new Invalid(path, '一覧ではありません')
  if (value.length > max) throw new Invalid(path, `数が多すぎます（${max}件まで）`)
  return value
}

function str(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string') throw new Invalid(path, '文字ではありません')
  if (value.length > max) throw new Invalid(path, `文字が長すぎます（${max}文字まで）`)
  return value
}

function nonEmpty(value: unknown, path: string, max: number): string {
  const s = str(value, path, max)
  if (s.trim() === '') throw new Invalid(path, '空です')
  return s
}

/** id として使える文字か。 */
export function isSafeId(value: unknown): value is string {
  // id は表（Record）のキーにも使う。'constructor' や '__proto__' のような、
  // どのオブジェクトにも元からある名前を通すと、表を引いたときに別のものが返ってしまうので断る
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && value.length <= LIMITS.idLength && !(value in {})
}

function id(value: unknown, path: string): string {
  if (!isSafeId(value)) throw new Invalid(path, 'id が正しくありません')
  return value
}

function yen(value: unknown, path: string, min = 0): Yen {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Invalid(path, '金額が整数ではありません')
  if (value < min) throw new Invalid(path, min === 1 ? '金額が1円より小さいです' : '金額がマイナスです')
  if (value > LIMITS.maxAmount) throw new Invalid(path, '金額が大きすぎます')
  return value
}

function date(value: unknown, path: string): DateString {
  if (!isValidDate(value)) throw new Invalid(path, '日付が正しくありません')
  return value
}

function dateOrEmpty(value: unknown, path: string): DateString | '' {
  return value === '' ? '' : date(value, path)
}

function oneOf<T extends string>(value: unknown, path: string, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Invalid(path, '知らない値です')
  return value as T
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Invalid(path, 'はい・いいえの値ではありません')
  return value
}

function uniqueIds(items: { id: string }[], path: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) throw new Invalid(path, `同じ id（${item.id}）が2つあります`)
    seen.add(item.id)
  }
}

// ---- 部品ごとの読み取り ----

export function readOfficers(value: unknown, path: string): Officers {
  const o = obj(value, path)
  const auditors = arr(o.auditors, `${path}.auditors`, LIMITS.maxAuditors).map((a, i) => str(a, `${path}.auditors[${i}]`, LIMITS.nameLength))
  if (auditors.length < 1) throw new Invalid(`${path}.auditors`, '監査をする人の欄が1つもありません')
  return {
    president: str(o.president, `${path}.president`, LIMITS.nameLength),
    treasurer: str(o.treasurer, `${path}.treasurer`, LIMITS.nameLength),
    auditors,
  }
}

export function readRoleNames(value: unknown, path: string): RoleNames {
  const o = obj(value, path)
  return {
    president: nonEmpty(o.president, `${path}.president`, LIMITS.nameLength),
    treasurer: nonEmpty(o.treasurer, `${path}.treasurer`, LIMITS.nameLength),
    auditor: nonEmpty(o.auditor, `${path}.auditor`, LIMITS.nameLength),
  }
}

export function readAudit(value: unknown, path: string): Audit {
  const o = obj(value, path)
  return { text: str(o.text, `${path}.text`, LIMITS.textLength), date: dateOrEmpty(o.date, `${path}.date`) }
}

function readPending(value: unknown, path: string): PendingItem {
  const o = obj(value, path)
  return {
    id: id(o.id, `${path}.id`),
    description: str(o.description, `${path}.description`, LIMITS.noteLength),
    amount: o.amount === null ? null : yen(o.amount, `${path}.amount`),
  }
}

export function readHandover(value: unknown, path: string): Handover {
  const o = obj(value, path)
  const custody: CustodyItem[] = arr(o.custody, `${path}.custody`, LIMITS.maxListItems).map((v, i) => {
    const p = `${path}.custody[${i}]`
    const c = obj(v, p)
    return {
      id: id(c.id, `${p}.id`),
      label: str(c.label, `${p}.label`, LIMITS.nameLength),
      place: str(c.place, `${p}.place`, LIMITS.noteLength),
      handedOver: bool(c.handedOver, `${p}.handedOver`),
    }
  })
  const unpaid = arr(o.unpaid, `${path}.unpaid`, LIMITS.maxListItems).map((v, i) => readPending(v, `${path}.unpaid[${i}]`))
  const unreceived = arr(o.unreceived, `${path}.unreceived`, LIMITS.maxListItems).map((v, i) => readPending(v, `${path}.unreceived[${i}]`))
  const equipment: EquipmentItem[] = arr(o.equipment, `${path}.equipment`, LIMITS.maxListItems).map((v, i) => {
    const p = `${path}.equipment[${i}]`
    const e = obj(v, p)
    return {
      id: id(e.id, `${p}.id`),
      name: str(e.name, `${p}.name`, LIMITS.nameLength),
      quantity: str(e.quantity, `${p}.quantity`, LIMITS.receiptNoLength),
      place: str(e.place, `${p}.place`, LIMITS.noteLength),
    }
  })
  uniqueIds(custody, `${path}.custody`)
  uniqueIds(unpaid, `${path}.unpaid`)
  uniqueIds(unreceived, `${path}.unreceived`)
  uniqueIds(equipment, `${path}.equipment`)
  return {
    date: dateOrEmpty(o.date, `${path}.date`),
    successor: str(o.successor, `${path}.successor`, LIMITS.nameLength),
    custody,
    unpaid,
    unreceived,
    equipment,
    memo: str(o.memo, `${path}.memo`, LIMITS.textLength),
  }
}

function readAccount(value: unknown, path: string): Account {
  const o = obj(value, path)
  return {
    id: id(o.id, `${path}.id`),
    kind: oneOf(o.kind, `${path}.kind`, ['cash', 'bank'] as const),
    name: nonEmpty(o.name, `${path}.name`, LIMITS.nameLength),
    openingBalance: yen(o.openingBalance, `${path}.openingBalance`),
  }
}

function readCategory(value: unknown, path: string): Category {
  const o = obj(value, path)
  return {
    id: id(o.id, `${path}.id`),
    side: oneOf(o.side, `${path}.side`, ['income', 'expense'] as const),
    name: nonEmpty(o.name, `${path}.name`, LIMITS.nameLength),
    budget: yen(o.budget, `${path}.budget`),
    note: str(o.note, `${path}.note`, LIMITS.noteLength),
  }
}

function readTransaction(value: unknown, path: string, accounts: Account[], categories: Category[]): Transaction {
  const o = obj(value, path)
  const kind = oneOf(o.kind, `${path}.kind`, ['income', 'expense', 'transfer'] as const)
  const accountId = id(o.accountId, `${path}.accountId`)
  if (!accounts.some((a) => a.id === accountId)) throw new Invalid(`${path}.accountId`, 'この置き場所がありません')
  let categoryId: string | null = null
  let toAccountId: string | null = null
  if (kind === 'transfer') {
    // 移動は、収入にも支出にも入れない。科目が付いていたら、集計が狂うので断る
    if (o.categoryId !== null) throw new Invalid(`${path}.categoryId`, '移動に科目が付いています')
    toAccountId = id(o.toAccountId, `${path}.toAccountId`)
    if (!accounts.some((a) => a.id === toAccountId)) throw new Invalid(`${path}.toAccountId`, 'この置き場所がありません')
    if (toAccountId === accountId) throw new Invalid(`${path}.toAccountId`, '移動の元と先が同じです')
  } else {
    categoryId = id(o.categoryId, `${path}.categoryId`)
    const category = categories.find((c) => c.id === categoryId)
    if (!category) throw new Invalid(`${path}.categoryId`, 'この科目がありません')
    if (category.side !== kind) throw new Invalid(`${path}.categoryId`, '収入と支出の向きが、科目と合っていません')
    if (o.toAccountId !== null) throw new Invalid(`${path}.toAccountId`, '移動ではないのに、入れ先があります')
  }
  return {
    id: id(o.id, `${path}.id`),
    date: date(o.date, `${path}.date`),
    kind,
    categoryId,
    description: str(o.description, `${path}.description`, LIMITS.descriptionLength),
    amount: yen(o.amount, `${path}.amount`, 1),
    accountId,
    toAccountId,
    receiptNo: str(o.receiptNo, `${path}.receiptNo`, LIMITS.receiptNoLength),
  }
}

function readYear(value: unknown, path: string): FiscalYear {
  const o = obj(value, path)
  const startDate = date(o.startDate, `${path}.startDate`)
  const endDate = date(o.endDate, `${path}.endDate`)
  if (endDate < startDate) throw new Invalid(`${path}.endDate`, '終わりの日が、始まりの日より前です')

  const accounts = arr(o.accounts, `${path}.accounts`, LIMITS.maxBankAccounts + 1).map((v, i) => readAccount(v, `${path}.accounts[${i}]`))
  uniqueIds(accounts, `${path}.accounts`)
  if (accounts.filter((a) => a.kind === 'cash').length !== 1) throw new Invalid(`${path}.accounts`, '現金が1つではありません')
  // 現金を先頭にそろえる（画面も資料も「現金が先、口座があと」の並びで出すため）。口座どうしの順は変えない
  accounts.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'cash' ? -1 : 1))

  const categories = arr(o.categories, `${path}.categories`, LIMITS.maxCategoriesPerSide * 2).map((v, i) => readCategory(v, `${path}.categories[${i}]`))
  uniqueIds(categories, `${path}.categories`)
  for (const side of ['income', 'expense'] as const) {
    if (categories.filter((c) => c.side === side).length > LIMITS.maxCategoriesPerSide) {
      throw new Invalid(`${path}.categories`, `科目が多すぎます（${LIMITS.maxCategoriesPerSide}件まで）`)
    }
  }

  const transactions = arr(o.transactions, `${path}.transactions`, LIMITS.maxTransactionsPerYear).map((v, i) =>
    readTransaction(v, `${path}.transactions[${i}]`, accounts, categories),
  )
  uniqueIds(transactions, `${path}.transactions`)

  // 置き場所や科目の id をキーにした表は、いまある id の分だけを写す（消した置き場所の記録が残っていても落とさない）
  const recRaw = obj(o.reconciliations, `${path}.reconciliations`)
  const reconciliations: Record<string, Reconciliation> = {}
  for (const a of accounts) {
    if (!Object.prototype.hasOwnProperty.call(recRaw, a.id)) continue
    const p = `${path}.reconciliations.${a.id}`
    const r = obj(recRaw[a.id], p)
    reconciliations[a.id] = { date: date(r.date, `${p}.date`), actual: yen(r.actual, `${p}.actual`) }
  }
  const nbRaw = obj(o.nextBudget, `${path}.nextBudget`)
  const nextBudget: Record<string, Yen> = {}
  for (const c of categories) {
    if (!Object.prototype.hasOwnProperty.call(nbRaw, c.id)) continue
    nextBudget[c.id] = yen(nbRaw[c.id], `${path}.nextBudget.${c.id}`)
  }

  return {
    id: id(o.id, `${path}.id`),
    label: nonEmpty(o.label, `${path}.label`, LIMITS.nameLength),
    startDate,
    endDate,
    officers: readOfficers(o.officers, `${path}.officers`),
    accounts,
    categories,
    transactions,
    carryoverBudget: o.carryoverBudget === null ? null : yen(o.carryoverBudget, `${path}.carryoverBudget`),
    reconciliations,
    reportDate: dateOrEmpty(o.reportDate, `${path}.reportDate`),
    audit: readAudit(o.audit, `${path}.audit`),
    nextBudget,
    handover: readHandover(o.handover, `${path}.handover`),
  }
}

/** 帳簿を読み取る。合わないところがあれば Invalid を投げる。 */
export function readBook(value: unknown, path = 'book'): Book {
  const o = obj(value, path)
  const years = arr(o.years, `${path}.years`, LIMITS.maxYears).map((v, i) => readYear(v, `${path}.years[${i}]`))
  if (years.length === 0) throw new Invalid(`${path}.years`, '年度が1つもありません')
  uniqueIds(years, `${path}.years`)
  for (let i = 1; i < years.length; i++) {
    if (years[i].startDate <= years[i - 1].endDate) {
      throw new Invalid(`${path}.years[${i}].startDate`, '前の年度と期間が重なっているか、年度の並びが古い順ではありません')
    }
  }
  if (typeof o.revision !== 'number' || !Number.isSafeInteger(o.revision) || o.revision < 0) {
    throw new Invalid(`${path}.revision`, '変更の回数が正しくありません')
  }
  return {
    orgName: nonEmpty(o.orgName, `${path}.orgName`, LIMITS.nameLength),
    orgKind: oneOf(o.orgKind, `${path}.orgKind`, ['chonaikai', 'kodomokai', 'pta', 'circle', 'other'] as const),
    roleNames: readRoleNames(o.roleNames, `${path}.roleNames`),
    diffStyle: oneOf(o.diffStyle, `${path}.diffStyle`, ['actual-minus-budget', 'budget-minus-actual'] as const),
    licenseKey: str(o.licenseKey, `${path}.licenseKey`, LIMITS.textLength),
    years,
    revision: o.revision,
  }
}

/**
 * 年度のつながりを確かめる（新しい年度の年度はじめの残高 ＝ 前の年度の年度末の残高）。
 * 合わなくてもデータは読めるので、断らずに「知らせること」として返す。
 * 断ってしまうと、利用者は自分のデータを開く手立てがなくなるため。
 */
export function checkYearChain(book: Book): string[] {
  const warnings: string[] = []
  for (let i = 1; i < book.years.length; i++) {
    const prev = book.years[i - 1]
    const next = book.years[i]
    if (next.startDate !== addDays(prev.endDate, 1)) {
      warnings.push(`「${prev.label}」の終わりの日と、「${next.label}」の始まりの日が、つながっていません。`)
    }
    const closing = accountBalances(prev)
    const mismatched: string[] = []
    for (const c of closing) {
      const opening = next.accounts.find((a) => a.id === c.accountId)?.openingBalance ?? 0
      if (opening !== c.closing) mismatched.push(c.name)
    }
    for (const a of next.accounts) {
      if (!closing.some((c) => c.accountId === a.id) && a.openingBalance !== 0) mismatched.push(a.name)
    }
    if (mismatched.length > 0) {
      warnings.push(
        `「${next.label}」の年度はじめの残高が、「${prev.label}」の年度末の残高と合っていません（${[...new Set(mismatched)].join('、')}）。`,
      )
    }
  }
  return warnings
}

// ---- 版の移行 ----

/**
 * 古い版のデータを、1つ新しい版の形に直す関数の表。キーは「直す前の版」。
 * いまは版1だけなので空。版を上げたら、ここに足す（例: 1: (raw) => ({ ...raw, 新しい項目: 初期値 })）。
 */
const MIGRATIONS: Record<number, (book: Raw) => Raw> = {}

export type ParsedBook = { ok: true; book: Book; warnings: string[]; savedAt: string | null }

/** ファイルの中身（JSON を読んだあとの値）を検査して、帳簿にする。 */
export function parseBookValue(value: unknown, expectedFormat: string = FILE_FORMAT): ParsedBook | Fail {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('wrong-format', 'ひきつぎ会計のファイルではないようです。「ひきつぎ会計_」で始まる名前のファイルを選んでください。')
  }
  const file = value as Raw
  if (file.format !== expectedFormat) {
    return fail('wrong-format', 'ひきつぎ会計のファイルではないようです。「ひきつぎ会計_」で始まる名前のファイルを選んでください。')
  }
  const version = file.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('bad-version', 'ファイルの版の番号が読み取れませんでした。ファイルが壊れているかもしれません。')
  }
  if (version > FILE_VERSION) {
    return fail(
      'newer-version',
      'このファイルは、新しい版のひきつぎ会計で保存されています。このページを開き直して（再読み込みして）から、もう一度ファイルを選んでください。',
    )
  }
  try {
    let raw = obj(file.book, 'book')
    for (let v = version; v < FILE_VERSION; v++) {
      const migrate = MIGRATIONS[v]
      if (!migrate) return fail('bad-version', `版${v}のファイルの読み方がわかりません。`)
      raw = migrate(raw)
    }
    const book = readBook(raw)
    return { ok: true, book, warnings: checkYearChain(book), savedAt: typeof file.savedAt === 'string' ? file.savedAt : null }
  } catch (e) {
    if (e instanceof Invalid) {
      return fail('invalid', `ファイルの中身に、読み取れないところがありました（${e.path}: ${e.reason}）。保存し直す前の、別のひきつぎファイルがあれば、そちらを開いてください。`)
    }
    throw e
  }
}
