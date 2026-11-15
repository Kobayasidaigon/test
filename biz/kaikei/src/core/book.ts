// 帳簿を作る・変える関数。
// どれも元の帳簿は書きかえず、新しい帳簿を返す（React の state にそのまま入れられる）。
// 変えるたびに revision が1つ増える。うまくいかないときは、画面にそのまま出せる理由の文を返す。
import {
  accountUseCount,
  categoryUseCount,
  defaultReceiptNo,
  endOfDayBalance,
  findYear,
  isYearLocked,
  negativeBalanceDays,
  previousYear,
} from './calc'
import { addDays, fiscalYearLabel, formatWareki, isValidDate, isWithin, oneYearLater } from './dates'
import { formatYen, isPositiveYen, isYen } from './money'
import { DEFAULT_AUDIT_TEXT, categoryTemplate, defaultAuditorCount, defaultCustody, defaultRoleNames } from './templates'
import {
  LIMITS,
  fail,
  type Account,
  type Audit,
  type Book,
  type Category,
  type DateString,
  type DiffStyle,
  type Fail,
  type FiscalYear,
  type Handover,
  type IdMaker,
  type Notice,
  type Officers,
  type OrgKind,
  type Result,
  type RoleNames,
  type Side,
  type Transaction,
  type TransactionKind,
  type Yen,
} from './types'
import { Invalid, isSafeId, readAudit, readHandover, readOfficers, readRoleNames } from './validate'

// ---- id ----

/** でたらめな id（英小文字と数字で10文字）。 */
export function randomId(): string {
  const bytes = new Uint8Array(10)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  let s = ''
  for (const b of bytes) s += (b % 36).toString(36)
  return s
}

/** いまある id と重ならない id を作る。 */
function freshId(makeId: IdMaker, used: Iterable<string>): string {
  const taken = new Set(used)
  for (let i = 0; i < 100; i++) {
    const id = makeId()
    if (isSafeId(id) && !taken.has(id)) return id
  }
  throw new Error('id を作れませんでした')
}

// ---- 文字の整え方 ----

/** 1行の入力（名前、摘要など）。前後の空白を取り、改行は空白にする。 */
function oneLine(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim() : ''
}

function tooLong(text: string, max: number, what: string, field?: string): Fail | null {
  return text.length > max ? fail('too-long', `${what}が長すぎます。${max}文字までにしてください。`, field) : null
}

function nameOf(value: unknown, what: string, field: string): Result<string> {
  const text = oneLine(value)
  if (text === '') return fail('required', `${what}を入れてください。`, field)
  return tooLong(text, LIMITS.nameLength, what, field) ?? { ok: true, value: text }
}

// ---- 帳簿を作る ----

export type NewBookInput = {
  orgName: string
  orgKind: OrgKind
  /** 会計年度の始まりの日 */
  startDate: DateString
  /** 終わりの日。なければ、始まりの1年あとの前の日 */
  endDate?: DateString
  /** 年度の呼び名。なければ始まりの日から作る（「令和8年度」） */
  label?: string
  /** 現金の年度はじめの残高 */
  cashOpening?: Yen
  /** 預金口座。なければ「普通預金」を1つ作る。0〜3つ */
  bankAccounts?: { name: string; openingBalance?: Yen }[]
}

function emptyHandover(makeId: IdMaker): Handover {
  return { date: '', successor: '', custody: defaultCustody(makeId), unpaid: [], unreceived: [], equipment: [], memo: '' }
}

/** 新しい帳簿を作る。団体の種類に合った科目のひな形が入る。 */
export function createBook(input: NewBookInput, makeId: IdMaker = randomId): Result<Book> {
  const orgName = nameOf(input.orgName, '団体の名前', 'orgName')
  if (!orgName.ok) return orgName
  if (!isValidDate(input.startDate)) return fail('invalid-date', '会計年度の始まりの日が正しくありません。', 'startDate')
  const endDate = input.endDate ?? addDays(oneYearLater(input.startDate), -1)
  if (!isValidDate(endDate)) return fail('invalid-date', '会計年度の終わりの日が正しくありません。', 'endDate')
  if (endDate < input.startDate) return fail('invalid-period', '終わりの日が、始まりの日より前になっています。', 'endDate')
  const label = input.label === undefined ? { ok: true as const, value: fiscalYearLabel(input.startDate) } : nameOf(input.label, '年度の呼び名', 'label')
  if (!label.ok) return label

  const cashOpening = input.cashOpening ?? 0
  if (!isYen(cashOpening)) return fail('invalid-amount', '現金の残高は、0円以上の整数で入れてください。', 'cashOpening')
  const banks = input.bankAccounts ?? [{ name: '普通預金', openingBalance: 0 }]
  if (banks.length > LIMITS.maxBankAccounts) return fail('limit', `預金口座は${LIMITS.maxBankAccounts}つまでです。`, 'bankAccounts')

  // id は帳簿の中でそれぞれ1つだけになるように、使ったものを覚えておく
  const used = new Set<string>()
  const next = () => {
    const id = freshId(makeId, used)
    used.add(id)
    return id
  }

  const accounts: Account[] = [{ id: next(), kind: 'cash', name: '現金', openingBalance: cashOpening }]
  for (const b of banks) {
    const name = nameOf(b.name, '口座の名前', 'bankAccounts')
    if (!name.ok) return name
    if (accounts.some((a) => a.name === name.value)) return fail('duplicate-name', `「${name.value}」という置き場所が2つあります。別の名前にしてください。`, 'bankAccounts')
    const opening = b.openingBalance ?? 0
    if (!isYen(opening)) return fail('invalid-amount', '口座の残高は、0円以上の整数で入れてください。', 'bankAccounts')
    accounts.push({ id: next(), kind: 'bank', name: name.value, openingBalance: opening })
  }

  const categories: Category[] = categoryTemplate(input.orgKind).map((c) => ({ id: next(), side: c.side, name: c.name, budget: 0, note: '' }))
  const year: FiscalYear = {
    id: next(),
    label: label.value,
    startDate: input.startDate,
    endDate,
    officers: { president: '', treasurer: '', auditors: Array.from({ length: defaultAuditorCount(input.orgKind) }, () => '') },
    accounts,
    categories,
    transactions: [],
    carryoverBudget: null,
    reconciliations: {},
    reportDate: '',
    audit: { text: DEFAULT_AUDIT_TEXT, date: '' },
    nextBudget: {},
    handover: emptyHandover(next),
  }
  return {
    ok: true,
    value: {
      orgName: orgName.value,
      orgKind: input.orgKind,
      roleNames: defaultRoleNames(input.orgKind),
      diffStyle: 'actual-minus-budget',
      licenseKey: '',
      years: [year],
      revision: 0,
    },
  }
}

// ---- 変えるときの共通の入口 ----

function bump(book: Book, patch: Partial<Book>): Book {
  return { ...book, ...patch, revision: book.revision + 1 }
}

/**
 * 年度を1つ書きかえる。
 *
 * 読むだけの年度（繰り越したあとの前の年度）では、数字に関わるもの（取引、科目、予算、置き場所、期間）は断る。
 * ただし「資料に書くこと」（作成日、役員の名前、決算書の説明の文、監査報告書の文と日付、引き継ぎ書、残高の照合の記録）は、
 * 呼ぶ側が allowLocked を付けて、読むだけの年度でも変えられるようにしてある。
 * 総会の前（監査 → 総会 → 引き継ぎ）に、新しい年度の取引を入れるために先に繰り越した人が、
 * 前の年度の資料の日付や名前を入れられなくなって、行きづまるため（点検で見つかった）。
 * 決算の数字（取引と残高）は、どちらの場合も変わらない。
 */
function editYear(book: Book, yearId: string, edit: (year: FiscalYear) => FiscalYear | Fail, options: { allowLocked?: boolean } = {}): Result<Book> {
  const year = findYear(book, yearId)
  if (!year) return fail('year-not-found', 'この年度が見つかりません。')
  if (!options.allowLocked && isYearLocked(book, yearId)) return lockedFail(year)
  const next = edit(year)
  if ('ok' in next) return next
  return { ok: true, value: bump(book, { years: book.years.map((y) => (y.id === yearId ? next : y)) }) }
}

function lockedFail(year: FiscalYear): Fail {
  return fail(
    'year-locked',
    `「${year.label}」は、次の年度へ繰り越したので、取引・科目・予算・残高は読むだけになっています。直したいことがあるときは、いまの年度の取引として入れてください。`,
  )
}

// ---- 団体 ----

export type OrgPatch = { orgName?: string; orgKind?: OrgKind; roleNames?: Partial<RoleNames>; diffStyle?: DiffStyle }

/** 団体の名前、種類、役の呼び名、決算書の「差」の向きを変える。 */
export function updateOrg(book: Book, patch: OrgPatch): Result<Book> {
  const next: Partial<Book> = {}
  if (patch.orgName !== undefined) {
    const name = nameOf(patch.orgName, '団体の名前', 'orgName')
    if (!name.ok) return name
    next.orgName = name.value
  }
  if (patch.orgKind !== undefined) next.orgKind = patch.orgKind
  if (patch.diffStyle !== undefined) next.diffStyle = patch.diffStyle
  if (patch.roleNames !== undefined) {
    const merged = { ...book.roleNames }
    for (const key of ['president', 'treasurer', 'auditor'] as const) {
      const v = patch.roleNames[key]
      if (v === undefined) continue
      const name = nameOf(v, '役の呼び名', `roleNames.${key}`)
      if (!name.ok) return name
      merged[key] = name.value
    }
    try {
      next.roleNames = readRoleNames(merged, 'roleNames')
    } catch (e) {
      return invalidToFail(e)
    }
  }
  return { ok: true, value: bump(book, next) }
}

/**
 * ライセンスキーを帳簿に入れる（空文字で外す）。
 * キーは団体のものなので、ひきつぎファイルと一緒に次の担当へ渡る。キーが正しいかどうかは、
 * ここでは見ない（src/lib/license.ts の verifyLicense が確かめる）。
 */
export function setLicenseKey(book: Book, licenseKey: string): Result<Book> {
  const key = licenseKey.replace(/\s+/g, '')
  if (key.length > LIMITS.textLength) return fail('too-long', 'キーが長すぎます。')
  if (key === book.licenseKey) return { ok: true, value: book }
  return { ok: true, value: bump(book, { licenseKey: key }) }
}

function invalidToFail(e: unknown): Fail {
  // 場所（handover.custody[0].place など）は画面に出しても伝わらないので、文には理由だけを入れて、field に場所を入れる
  if (e instanceof Invalid) return fail('invalid-input', `入力に正しくないところがあります（${e.reason}）。`, e.path)
  throw e
}

// ---- 年度 ----

export type YearPatch = {
  label?: string
  startDate?: DateString
  endDate?: DateString
  reportDate?: DateString | ''
  carryoverBudget?: Yen | null
}

/**
 * 年度の呼び名、期間、資料の作成日、前年度繰越金の予算額を変える。
 * 読むだけの年度で変えられるのは、資料の作成日だけ（呼び名・期間・予算額は、決算の数字と見出しに関わるので断る）。
 */
export function updateYear(book: Book, yearId: string, patch: YearPatch): Result<Book> {
  const onlyReportDate = patch.label === undefined && patch.startDate === undefined && patch.endDate === undefined && patch.carryoverBudget === undefined
  return editYear(book, yearId, (year) => {
    const next = { ...year }
    if (patch.label !== undefined) {
      const label = nameOf(patch.label, '年度の呼び名', 'label')
      if (!label.ok) return label
      next.label = label.value
    }
    if (patch.startDate !== undefined && patch.startDate !== year.startDate) {
      if (!isValidDate(patch.startDate)) return fail('invalid-date', '始まりの日が正しくありません。', 'startDate')
      // 2年目からの始まりの日は、前の年度の終わりの次の日に決まっている
      if (previousYear(book, yearId)) return fail('start-locked', '始まりの日は、前の年度の終わりの次の日に決まっているので、変えられません。', 'startDate')
      next.startDate = patch.startDate
    }
    if (patch.endDate !== undefined) {
      if (!isValidDate(patch.endDate)) return fail('invalid-date', '終わりの日が正しくありません。', 'endDate')
      next.endDate = patch.endDate
    }
    if (next.endDate < next.startDate) return fail('invalid-period', '終わりの日が、始まりの日より前になっています。', 'endDate')
    if (patch.reportDate !== undefined) {
      if (patch.reportDate !== '' && !isValidDate(patch.reportDate)) return fail('invalid-date', '作成日が正しくありません。', 'reportDate')
      next.reportDate = patch.reportDate
    }
    if (patch.carryoverBudget !== undefined) {
      if (patch.carryoverBudget !== null && !isYen(patch.carryoverBudget)) return fail('invalid-amount', '予算額は、0円以上の整数で入れてください。', 'carryoverBudget')
      next.carryoverBudget = patch.carryoverBudget
    }
    return next
  }, { allowLocked: onlyReportDate })
}

/** 役員の名前を変える（空でもよい）。auditors は 1〜3人。資料の署名欄なので、読むだけの年度でも変えられる。 */
export function updateOfficers(book: Book, yearId: string, patch: Partial<Officers>): Result<Book> {
  return editYear(book, yearId, (year) => {
    const merged = {
      president: oneLine(patch.president ?? year.officers.president),
      treasurer: oneLine(patch.treasurer ?? year.officers.treasurer),
      auditors: (patch.auditors ?? year.officers.auditors).map(oneLine),
    }
    if (merged.auditors.length < 1 || merged.auditors.length > LIMITS.maxAuditors) {
      return fail('limit', `監査をする人の欄は、1〜${LIMITS.maxAuditors}人ぶんにしてください。`, 'auditors')
    }
    try {
      return { ...year, officers: readOfficers(merged, 'officers') }
    } catch (e) {
      return invalidToFail(e)
    }
  }, { allowLocked: true })
}

// ---- お金の置き場所 ----

/** 預金口座を足す。2年目からは、年度はじめの残高は 0円（前の年度になかった口座なので）。 */
export function addBankAccount(
  book: Book,
  yearId: string,
  input: { name: string; openingBalance?: Yen },
  makeId: IdMaker = randomId,
): Result<Book> {
  return editYear(book, yearId, (year) => {
    if (year.accounts.filter((a) => a.kind === 'bank').length >= LIMITS.maxBankAccounts) {
      return fail('limit', `預金口座は${LIMITS.maxBankAccounts}つまでです。`)
    }
    const name = nameOf(input.name, '口座の名前', 'name')
    if (!name.ok) return name
    if (year.accounts.some((a) => a.name === name.value)) return fail('duplicate-name', `「${name.value}」という置き場所が、すでにあります。別の名前にしてください。`, 'name')
    const opening = input.openingBalance ?? 0
    if (!isYen(opening)) return fail('invalid-amount', '残高は、0円以上の整数で入れてください。', 'openingBalance')
    if (opening !== 0 && previousYear(book, yearId)) {
      return fail('opening-locked', '年度はじめの残高は、前の年度から繰り越した金額に決まっています。新しい口座は 0円 から始めて、お金を移した日に「移動」として入れてください。', 'openingBalance')
    }
    const id = freshId(makeId, year.accounts.map((a) => a.id))
    return { ...year, accounts: [...year.accounts, { id, kind: 'bank', name: name.value, openingBalance: opening }] }
  })
}

/** 置き場所の名前と、年度はじめの残高を変える。年度はじめの残高を変えられるのは、最初の年度だけ。 */
export function updateAccount(book: Book, yearId: string, accountId: string, patch: { name?: string; openingBalance?: Yen }): Result<Book> {
  return editYear(book, yearId, (year) => {
    const account = year.accounts.find((a) => a.id === accountId)
    if (!account) return fail('not-found', 'この置き場所が見つかりません。')
    const next = { ...account }
    if (patch.name !== undefined) {
      const name = nameOf(patch.name, '置き場所の名前', 'name')
      if (!name.ok) return name
      if (year.accounts.some((a) => a.id !== accountId && a.name === name.value)) {
        return fail('duplicate-name', `「${name.value}」という置き場所が、すでにあります。別の名前にしてください。`, 'name')
      }
      next.name = name.value
    }
    if (patch.openingBalance !== undefined && patch.openingBalance !== account.openingBalance) {
      if (!isYen(patch.openingBalance)) return fail('invalid-amount', '残高は、0円以上の整数で入れてください。', 'openingBalance')
      if (previousYear(book, yearId)) {
        return fail('opening-locked', '年度はじめの残高は、前の年度から繰り越した金額に決まっているので、変えられません。', 'openingBalance')
      }
      next.openingBalance = patch.openingBalance
    }
    return { ...year, accounts: year.accounts.map((a) => (a.id === accountId ? next : a)) }
  })
}

/** 預金口座を消す。取引で使われている口座、残高のある口座、現金は消せない。 */
export function removeAccount(book: Book, yearId: string, accountId: string): Result<Book> {
  return editYear(book, yearId, (year) => {
    const account = year.accounts.find((a) => a.id === accountId)
    if (!account) return fail('not-found', 'この置き場所が見つかりません。')
    if (account.kind === 'cash') return fail('cash-required', '現金は消せません。使わないときは、残高を 0円 のままにしてください。')
    const used = accountUseCount(year, accountId)
    if (used > 0) return fail('in-use', `「${account.name}」は ${used}件 の取引で使われているので、消せません。`)
    if (account.openingBalance !== 0) return fail('has-balance', `「${account.name}」には年度はじめの残高があるので、消せません。`)
    const reconciliations = { ...year.reconciliations }
    delete reconciliations[accountId]
    return { ...year, accounts: year.accounts.filter((a) => a.id !== accountId), reconciliations }
  })
}

// ---- 科目 ----

function checkCategoryFields(
  year: FiscalYear,
  side: Side,
  selfId: string | null,
  fields: { name?: string; budget?: Yen; note?: string },
): { name?: string; budget?: Yen; note?: string } | Fail {
  const out: { name?: string; budget?: Yen; note?: string } = {}
  if (fields.name !== undefined) {
    const name = nameOf(fields.name, '科目の名前', 'name')
    if (!name.ok) return name
    if (year.categories.some((c) => c.id !== selfId && c.side === side && c.name === name.value)) {
      return fail('duplicate-name', `「${name.value}」という科目が、すでにあります。別の名前にしてください。`, 'name')
    }
    out.name = name.value
  }
  if (fields.budget !== undefined) {
    if (!isYen(fields.budget)) return fail('invalid-amount', '予算額は、0円以上の整数で入れてください。', 'budget')
    out.budget = fields.budget
  }
  if (fields.note !== undefined) {
    const note = oneLine(fields.note)
    const long = tooLong(note, LIMITS.noteLength, '説明', 'note')
    if (long) return long
    out.note = note
  }
  return out
}

/** 科目を足す。その部（収入・支出）のいちばん下に入る。 */
export function addCategory(
  book: Book,
  yearId: string,
  input: { side: Side; name: string; budget?: Yen; note?: string },
  makeId: IdMaker = randomId,
): Result<Book> {
  return editYear(book, yearId, (year) => {
    if (year.categories.filter((c) => c.side === input.side).length >= LIMITS.maxCategoriesPerSide) {
      return fail('limit', `科目は、収入・支出それぞれ${LIMITS.maxCategoriesPerSide}件までです。`)
    }
    const fields = checkCategoryFields(year, input.side, null, { name: input.name, budget: input.budget ?? 0, note: input.note ?? '' })
    if ('ok' in fields) return fields
    const id = freshId(makeId, year.categories.map((c) => c.id))
    const category: Category = { id, side: input.side, name: fields.name!, budget: fields.budget!, note: fields.note! }
    return { ...year, categories: [...year.categories, category] }
  })
}

/** 科目の名前、予算額、決算書の説明を変える。 */
export function updateCategory(book: Book, yearId: string, categoryId: string, patch: { name?: string; budget?: Yen; note?: string }): Result<Book> {
  // 決算書の「説明」の文（note）だけを変えるときは、読むだけの年度でも変えられる。
  // 説明は、総会の前に決算書を仕上げるときに書くもの（「会費: 新しく3世帯が入ったため」など）で、数字は動かさない。
  // 先に繰り越した人が、説明を書けなくなるのを防ぐ（作成日や役員の名前と同じ「資料に書くこと」の扱い）。
  const onlyNote = patch.note !== undefined && patch.name === undefined && patch.budget === undefined
  return editYear(
    book,
    yearId,
    (year) => {
      const category = year.categories.find((c) => c.id === categoryId)
      if (!category) return fail('not-found', 'この科目が見つかりません。')
      const fields = checkCategoryFields(year, category.side, categoryId, patch)
      if ('ok' in fields) return fields
      return { ...year, categories: year.categories.map((c) => (c.id === categoryId ? { ...c, ...fields } : c)) }
    },
    { allowLocked: onlyNote },
  )
}

/** 科目を、同じ部（収入・支出）の中で1つ上か下へ動かす。端にあるときは何も変えない。 */
export function moveCategory(book: Book, yearId: string, categoryId: string, direction: 'up' | 'down'): Result<Book> {
  const year = findYear(book, yearId)
  const category = year?.categories.find((c) => c.id === categoryId)
  if (year && category && !isYearLocked(book, yearId)) {
    const same = year.categories.filter((c) => c.side === category.side)
    const i = same.findIndex((c) => c.id === categoryId)
    // 端のときは revision を増やさない（何も変わっていないのに「変更があります」と出さないため）
    if ((direction === 'up' && i === 0) || (direction === 'down' && i === same.length - 1)) return { ok: true, value: book }
  }
  return editYear(book, yearId, (y) => {
    const target = y.categories.find((c) => c.id === categoryId)
    if (!target) return fail('not-found', 'この科目が見つかりません。')
    const same = y.categories.filter((c) => c.side === target.side)
    const i = same.findIndex((c) => c.id === categoryId)
    const other = same[direction === 'up' ? i - 1 : i + 1]
    return {
      ...y,
      categories: y.categories.map((c) => (c.id === categoryId ? other : c.id === other.id ? target : c)),
    }
  })
}

/** 科目を消す。取引で使われている科目は消せない。 */
export function removeCategory(book: Book, yearId: string, categoryId: string): Result<Book> {
  return editYear(book, yearId, (year) => {
    const category = year.categories.find((c) => c.id === categoryId)
    if (!category) return fail('not-found', 'この科目が見つかりません。')
    const used = categoryUseCount(year, categoryId)
    if (used > 0) {
      return fail('in-use', `「${category.name}」は ${used}件 の取引で使われているので、消せません。先に、その取引の科目を変えるか、取引を消してください。`)
    }
    const nextBudget = { ...year.nextBudget }
    delete nextBudget[categoryId]
    return { ...year, categories: year.categories.filter((c) => c.id !== categoryId), nextBudget }
  })
}

// ---- 取引 ----

export type TransactionInput = {
  date: DateString
  kind: TransactionKind
  /** 科目。移動のときはいらない */
  categoryId?: string | null
  description?: string
  amount: Yen
  /** 置き場所。移動のときは、出した元 */
  accountId: string
  /** 移動の入れ先 */
  toAccountId?: string | null
  /** 領収書の番号。渡さなければ、支出には次の番号を振る */
  receiptNo?: string
}

type TransactionFields = Omit<Transaction, 'id'>

/** 取引の入力を確かめる。まちがいは、入力欄ごとにすべて集める（1つ直すたびに次が出る、とならないように）。 */
function validateTransaction(year: FiscalYear, input: TransactionInput, receiptDefault: string): { fields: TransactionFields | null; errors: Notice[] } {
  const errors: Notice[] = []
  const kinds: TransactionKind[] = ['income', 'expense', 'transfer']
  if (!kinds.includes(input.kind)) errors.push({ code: 'invalid-kind', message: '収入・支出・移動のどれかを選んでください。', field: 'kind' })

  if (typeof input.date !== 'string' || input.date === '') errors.push({ code: 'required', message: '日付を入れてください。', field: 'date' })
  else if (!isValidDate(input.date)) errors.push({ code: 'invalid-date', message: '日付が正しくありません。', field: 'date' })

  if (!isPositiveYen(input.amount)) {
    const message =
      typeof input.amount === 'number' && input.amount > LIMITS.maxAmount
        ? `金額が大きすぎます。${formatYen(LIMITS.maxAmount)}円までにしてください。`
        : '金額は、1円以上の整数で入れてください。'
    errors.push({ code: 'invalid-amount', message, field: 'amount' })
  }

  const account = year.accounts.find((a) => a.id === input.accountId)
  if (!account) errors.push({ code: 'required', message: 'お金の置き場所を選んでください。', field: 'accountId' })

  let categoryId: string | null = null
  let toAccountId: string | null = null
  if (input.kind === 'transfer') {
    // 移動は、収入にも支出にも入れない。科目は付けない
    const to = year.accounts.find((a) => a.id === input.toAccountId)
    if (!to) errors.push({ code: 'required', message: 'お金の移し先を選んでください。', field: 'toAccountId' })
    else if (to.id === input.accountId) errors.push({ code: 'same-account', message: '移す元と移す先が同じです。別の置き場所を選んでください。', field: 'toAccountId' })
    else toAccountId = to.id
  } else if (kinds.includes(input.kind)) {
    const category = year.categories.find((c) => c.id === input.categoryId)
    if (!category) errors.push({ code: 'required', message: '科目を選んでください。', field: 'categoryId' })
    else if (category.side !== input.kind) {
      errors.push({
        code: 'side-mismatch',
        message: `「${category.name}」は${category.side === 'income' ? '収入' : '支出'}の科目です。${input.kind === 'income' ? '収入' : '支出'}の科目を選んでください。`,
        field: 'categoryId',
      })
    } else categoryId = category.id
  }

  const description = oneLine(input.description)
  if (description.length > LIMITS.descriptionLength) {
    errors.push({ code: 'too-long', message: `内容が長すぎます。${LIMITS.descriptionLength}文字までにしてください。`, field: 'description' })
  }
  const receiptNo = input.receiptNo === undefined ? receiptDefault : oneLine(input.receiptNo)
  if (receiptNo.length > LIMITS.receiptNoLength) {
    errors.push({ code: 'too-long', message: `領収書の番号が長すぎます。${LIMITS.receiptNoLength}文字までにしてください。`, field: 'receiptNo' })
  }

  if (errors.length > 0) return { fields: null, errors }
  return {
    fields: { date: input.date, kind: input.kind, categoryId, description, amount: input.amount, accountId: input.accountId, toAccountId, receiptNo },
    errors,
  }
}

export type TransactionCheck = {
  /** 直さないと入れられないこと */
  errors: Notice[]
  /** 入れることはできるが、確かめてほしいこと */
  warnings: Notice[]
}

/**
 * 取引を入れる前に確かめる。画面は、errors があれば入れさせず、warnings は知らせたうえで入れられるようにする。
 * 直すときは ignoreTransactionId に、直している取引の id を渡す（自分自身と比べないため）。
 */
export function checkTransaction(
  book: Book,
  yearId: string,
  input: TransactionInput,
  options: { today?: DateString; ignoreTransactionId?: string } = {},
): TransactionCheck {
  const year = findYear(book, yearId)
  if (!year) return { errors: [{ code: 'year-not-found', message: 'この年度が見つかりません。' }], warnings: [] }
  if (isYearLocked(book, yearId)) {
    return { errors: [{ code: 'year-locked', message: lockedFail(year).message }], warnings: [] }
  }
  const others = year.transactions.filter((t) => t.id !== options.ignoreTransactionId)
  const base: FiscalYear = { ...year, transactions: others }
  const { fields, errors } = validateTransaction(base, input, defaultReceiptNo(base, input.kind))
  if (!fields) return { errors, warnings: [] }

  const warnings: Notice[] = []
  if (!isWithin(fields.date, year.startDate, year.endDate)) {
    warnings.push({
      code: 'outside-year',
      // 年度の終わりより先の日付は、「次の年度の取引」のことが多い。次の年度の取引は、繰り越してから入れる、と案内する
      message:
        `日付が、会計年度（${formatWareki(year.startDate)}〜${formatWareki(year.endDate)}）の外です。日付か、年度をまちがえていないか確かめてください。` +
        (fields.date > year.endDate ? '次の年度の取引は、「引き継ぎ」の画面で次の年度へ繰り越してから、入れます。' : ''),
      field: 'date',
    })
  }
  if (options.today && fields.date > options.today) {
    warnings.push({ code: 'future-date', message: '日付が、今日より先です。', field: 'date' })
  }

  // この取引を入れる（直す）ことで、残高がマイナスになる日が新しくできるか、マイナスが大きくなるか。
  // 入れる前からマイナスだった日は、ここでは言わない（年度ぜんたいの知らせ listYearIssues に出る）
  // 「入れる前」の残高は、同じ日付の取引がなくても、その日の終わりの残高でくらべる。
  // 日付が一致する日だけをくらべると、すでにマイナスの置き場所に収入を入れたとき（残高は増えるのに）、
  // 「この取引を入れるとマイナスになります」と、まちがって知らせてしまうため
  const balanceBefore = endOfDayBalance(year)
  const after = negativeBalanceDays({ ...base, transactions: [...others, { ...fields, id: '\u0000check' }] })
  const worse = after.filter((d) => balanceBefore(d.accountId, d.date) > d.balance)
  for (const accountId of new Set(worse.map((d) => d.accountId))) {
    const day = worse.find((d) => d.accountId === accountId)!
    warnings.push({
      code: 'negative-balance',
      message: `この取引を入れると、「${day.accountName}」の残高が ${formatWareki(day.date)}にマイナス（${formatYen(day.balance)}円）になります。金額、日付、置き場所を確かめてください。`,
      field: 'amount',
      accountId,
    })
  }

  if (fields.receiptNo !== '') {
    const same = others.filter((t) => t.receiptNo === fields.receiptNo)
    if (same.length > 0) {
      warnings.push({
        code: 'duplicate-receipt',
        message: `領収書の番号「${fields.receiptNo}」は、ほかの取引でも使われています。`,
        field: 'receiptNo',
        transactionIds: same.map((t) => t.id),
      })
    }
  }

  const twin = others.filter(
    (t) =>
      t.date === fields.date &&
      t.kind === fields.kind &&
      t.amount === fields.amount &&
      t.categoryId === fields.categoryId &&
      t.accountId === fields.accountId &&
      t.toAccountId === fields.toAccountId &&
      t.description === fields.description,
  )
  if (twin.length > 0) {
    warnings.push({
      code: 'possible-duplicate',
      message: '日付・科目・内容・金額が同じ取引が、すでにあります。二重に入れていないか確かめてください。',
      transactionIds: twin.map((t) => t.id),
    })
  }
  return { errors, warnings }
}

/** 取引を入れる。年度の外の日付などは断らない（checkTransaction で先に知らせる）。 */
export function addTransaction(book: Book, yearId: string, input: TransactionInput, makeId: IdMaker = randomId): Result<Book> {
  return editYear(book, yearId, (year) => {
    if (year.transactions.length >= LIMITS.maxTransactionsPerYear) {
      return fail('limit', `1つの年度に入れられる取引は ${LIMITS.maxTransactionsPerYear}件 までです。`)
    }
    const { fields, errors } = validateTransaction(year, input, defaultReceiptNo(year, input.kind))
    if (!fields) return fail(errors[0].code, errors[0].message, errors[0].field)
    const id = freshId(makeId, year.transactions.map((t) => t.id))
    return { ...year, transactions: [...year.transactions, { id, ...fields }] }
  })
}

/** 取引を直す。渡した項目だけが変わる。種類を「移動」に変えたときは、科目が外れる。 */
export function updateTransaction(book: Book, yearId: string, transactionId: string, patch: Partial<TransactionInput>): Result<Book> {
  return editYear(book, yearId, (year) => {
    const current = year.transactions.find((t) => t.id === transactionId)
    if (!current) return fail('not-found', 'この取引が見つかりません。')
    const merged: TransactionInput = {
      date: patch.date ?? current.date,
      kind: patch.kind ?? current.kind,
      categoryId: patch.categoryId !== undefined ? patch.categoryId : current.categoryId,
      description: patch.description ?? current.description,
      amount: patch.amount ?? current.amount,
      accountId: patch.accountId ?? current.accountId,
      toAccountId: patch.toAccountId !== undefined ? patch.toAccountId : current.toAccountId,
      receiptNo: patch.receiptNo ?? current.receiptNo,
    }
    const { fields, errors } = validateTransaction(year, merged, current.receiptNo)
    if (!fields) return fail(errors[0].code, errors[0].message, errors[0].field)
    return { ...year, transactions: year.transactions.map((t) => (t.id === transactionId ? { id: t.id, ...fields } : t)) }
  })
}

/** 取引を消す。 */
export function removeTransaction(book: Book, yearId: string, transactionId: string): Result<Book> {
  return editYear(book, yearId, (year) => {
    if (!year.transactions.some((t) => t.id === transactionId)) return fail('not-found', 'この取引が見つかりません。')
    return { ...year, transactions: year.transactions.filter((t) => t.id !== transactionId) }
  })
}

// ---- 残高の照合 ----

/**
 * 実際の残高（通帳の残高、手元の現金）を記録する。null を渡すと記録を消す。
 * 帳簿の数字は変えない「確かめた記録」なので、読むだけの年度でも入れられる（年度末の照合は、繰り越したあとの監査ですることがある）。
 */
export function setReconciliation(
  book: Book,
  yearId: string,
  accountId: string,
  record: { date: DateString; actual: Yen } | null,
): Result<Book> {
  return editYear(book, yearId, (year) => {
    if (!year.accounts.some((a) => a.id === accountId)) return fail('not-found', 'この置き場所が見つかりません。')
    const reconciliations = { ...year.reconciliations }
    if (record === null) {
      delete reconciliations[accountId]
    } else {
      if (!isValidDate(record.date)) return fail('invalid-date', '確かめた日が正しくありません。', 'date')
      if (!isYen(record.actual)) return fail('invalid-amount', '残高は、0円以上の整数で入れてください。', 'actual')
      reconciliations[accountId] = { date: record.date, actual: record.actual }
    }
    return { ...year, reconciliations }
  }, { allowLocked: true })
}

// ---- 資料 ----

/** 会計監査報告書の本文と、監査の日を変える。読むだけの年度でも変えられる（監査は、年度が終わったあとにするため）。 */
export function updateAudit(book: Book, yearId: string, patch: Partial<Audit>): Result<Book> {
  return editYear(book, yearId, (year) => {
    try {
      return { ...year, audit: readAudit({ ...year.audit, ...patch }, 'audit') }
    } catch (e) {
      return invalidToFail(e)
    }
  }, { allowLocked: true })
}

/**
 * 次年度の予算案を入れる。null を渡すと、入力を消す（今年度の予算をそのまま使う）。
 *
 * 繰り越したあとでも、「いまの年度の、すぐ前の年度」の予算案は変えられる。
 * 総会に出す予算書（案）は前の年度の資料なので、先に繰り越した人が、案の金額を直せなくなるのを防ぐため。
 * そのときは、いまの年度の同じ科目の予算額にも、同じ金額を入れる（繰り越しのときと同じ決まり:
 * 予算案があればそれ、なければ前の年度の予算）。紙の予算案と、新しい年度の予算が、食いちがったままにならないようにするため。
 * いまの年度で消した科目には、入れない。2つ以上前の年度の予算案は、変えられない（次の年度も、もう読むだけなので）。
 */
export function setNextBudget(book: Book, yearId: string, categoryId: string, amount: Yen | null): Result<Book> {
  const target = findYear(book, yearId)
  if (!target) return fail('year-not-found', 'この年度が見つかりません。')
  const locked = isYearLocked(book, yearId)
  const latest = book.years[book.years.length - 1]
  if (locked && previousYear(book, latest.id)?.id !== yearId) return lockedFail(target)
  if (!target.categories.some((c) => c.id === categoryId)) return fail('not-found', 'この科目が見つかりません。')
  if (amount !== null && !isYen(amount)) return fail('invalid-amount', '予算額は、0円以上の整数で入れてください。', 'amount')

  const nextBudget = { ...target.nextBudget }
  if (amount === null) delete nextBudget[categoryId]
  else nextBudget[categoryId] = amount
  const carried = amount ?? target.categories.find((c) => c.id === categoryId)!.budget
  return {
    ok: true,
    value: bump(book, {
      years: book.years.map((y) => {
        if (y.id === yearId) return { ...y, nextBudget }
        if (locked && y.id === latest.id) return { ...y, categories: y.categories.map((c) => (c.id === categoryId ? { ...c, budget: carried } : c)) }
        return y
      }),
    }),
  }
}

/**
 * 引き継ぎ書の中身を変える。一覧（保管場所、未払い、未収、備品）は、まるごと入れかえる。
 * 一覧の行に付ける id は randomId() で作る。
 * 読むだけの年度でも変えられる（引き継ぎは、年度が終わって、繰り越したあとにすることがあるため）。
 */
export function updateHandover(book: Book, yearId: string, patch: Partial<Handover>): Result<Book> {
  return editYear(book, yearId, (year) => {
    try {
      return { ...year, handover: readHandover({ ...year.handover, ...patch }, 'handover') }
    } catch (e) {
      return invalidToFail(e)
    }
  }, { allowLocked: true })
}
