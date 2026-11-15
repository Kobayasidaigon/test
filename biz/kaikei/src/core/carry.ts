// 次の年度への繰り越し。
// 新しい年度の年度はじめの残高 ＝ 前の年度の年度末の残高。科目と予算を引き継ぎ、前の年度は読むだけにして残す。
import { latestYear, listYearIssues, reconcileYear, summarizeYear } from './calc'
import { addDays, isValidDate, oneYearLater, suggestNextLabel } from './dates'
import { formatYen } from './money'
import { randomId } from './book'
import { LIMITS, fail, type Book, type DateString, type FiscalYear, type IdMaker, type Notice, type Result, type Yen } from './types'
import { isSafeId } from './validate'

export type CarryPreview = {
  label: string
  startDate: DateString
  endDate: DateString
  /** 新しい年度の年度はじめの残高（＝いまの年度の年度末の残高） */
  accounts: { accountId: string; name: string; opening: Yen }[]
  /** 新しい年度の前年度繰越金 */
  openingTotal: Yen
}

export type CarryCheck = {
  /** 繰り越せるか（blockers がなければ true） */
  ok: boolean
  /** 直さないと繰り越せないこと */
  blockers: Notice[]
  /** 繰り越せるが、先に確かめてほしいこと */
  warnings: Notice[]
  /** 繰り越すと、どんな年度ができるか */
  preview: CarryPreview
}

/** 繰り越す前の確かめ。画面は blockers と warnings を見せて、よければ carryForward を呼ぶ。 */
export function checkCarryForward(book: Book, options: { today?: DateString } = {}): CarryCheck {
  const year = latestYear(book)
  const summary = summarizeYear(year)
  const blockers: Notice[] = []
  const warnings: Notice[] = []

  if (book.years.length >= LIMITS.maxYears) {
    blockers.push({ code: 'limit', message: `1つのファイルに入れられる年度は ${LIMITS.maxYears}年ぶん までです。` })
  }
  // マイナスの残高は、実際にはありえない。そのまま繰り越すと、次の年度がまちがった金額から始まってしまう
  for (const a of summary.accounts) {
    if (a.closing < 0) {
      blockers.push({
        code: 'negative-closing',
        message: `「${a.name}」の残高がマイナス（${formatYen(a.closing)}円）です。入れ忘れた収入や引き出し、金額のまちがいを直してから、繰り越してください。`,
        accountId: a.accountId,
      })
    }
  }
  // 上限をこえた残高は、新しい年度の「年度はじめの残高」として保存できない（読み込みの検査が、上限をこえた金額を断る）。
  // そのまま繰り越すと、ファイルに保存できず、読み込み直すと帳簿を開けなくなるので、ここで止める（点検で見つかった）
  for (const a of summary.accounts) {
    if (a.closing > LIMITS.maxAmount) {
      blockers.push({
        code: 'closing-too-large',
        message: `「${a.name}」の残高が ${formatYen(LIMITS.maxAmount)}円 をこえている（${formatYen(a.closing)}円）ので、繰り越せません。金額のまちがいがないか確かめてください。`,
        accountId: a.accountId,
      })
    }
  }
  if (!summary.balanced) {
    blockers.push({ code: 'unbalanced', message: '置き場所ごとの残高の合計と、次年度繰越金が合っていません。データが壊れているかもしれません。' })
  }

  if (options.today && options.today <= year.endDate) {
    warnings.push({ code: 'year-not-ended', message: `「${year.label}」は、まだ終わっていません。繰り越すと、この年度には取引を足せなくなります。` })
  }
  const rec = reconcileYear(year)
  if (rec.mismatchCount > 0) {
    warnings.push({ code: 'reconcile-mismatch', message: `残高の照合で、合っていない置き場所が ${rec.mismatchCount}つ あります。` })
  }
  if (rec.uncheckedCount > 0) {
    warnings.push({ code: 'reconcile-unchecked', message: `残高の照合が済んでいない置き場所が ${rec.uncheckedCount}つ あります。通帳と手元の現金を確かめてから繰り越すと安心です。` })
  }
  for (const issue of listYearIssues(year)) {
    // マイナスの残高のうち、年度末までに解消していないものは blockers に入れてある
    warnings.push(issue)
  }

  const startDate = addDays(year.endDate, 1)
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    preview: {
      label: suggestNextLabel(year.label, startDate),
      startDate,
      endDate: oneYearLater(year.endDate),
      accounts: summary.accounts.map((a) => ({ accountId: a.accountId, name: a.name, opening: a.closing })),
      openingTotal: summary.closingTotal,
    },
  }
}

/**
 * 次の年度へ繰り越す。新しい年度を作って、帳簿のいちばん後ろに足す。
 *   ・年度はじめの残高は、前の年度の年度末の残高
 *   ・科目と並びは同じ。予算は、予算案を入れていればそれ、なければ前の年度の予算
 *   ・役員の名前、決算書の説明、照合の記録、資料の日付は、空から始める（年度ごとに変わるため）
 *   ・備品と保管場所の一覧、監査報告書の言い回しは引き継ぐ
 * 前の年度は、そのまま残って読むだけになる。
 */
export function carryForward(
  book: Book,
  options: { label?: string; endDate?: DateString } = {},
  makeId: IdMaker = randomId,
): Result<Book> {
  const check = checkCarryForward(book)
  if (!check.ok) return fail(check.blockers[0].code, check.blockers[0].message)
  const prev = latestYear(book)
  const startDate = check.preview.startDate
  const endDate = options.endDate ?? check.preview.endDate
  if (!isValidDate(endDate) || endDate < startDate) return fail('invalid-period', '新しい年度の終わりの日が正しくありません。', 'endDate')
  const label = (options.label ?? check.preview.label).trim()
  if (label === '' || label.length > LIMITS.nameLength) return fail('required', '新しい年度の呼び名を入れてください。', 'label')

  let id = ''
  const taken = new Set(book.years.map((y) => y.id))
  for (let i = 0; i < 100 && (id === '' || taken.has(id) || !isSafeId(id)); i++) id = makeId()
  if (id === '' || taken.has(id) || !isSafeId(id)) return fail('id', '新しい年度を作れませんでした。もう一度お試しください。')

  const next: FiscalYear = {
    id,
    label,
    startDate,
    endDate,
    officers: { president: '', treasurer: '', auditors: prev.officers.auditors.map(() => '') },
    // 置き場所と科目の id は、前の年度と同じにする。年度をまたいで同じものだとわかるようにするため
    accounts: prev.accounts.map((a) => ({
      ...a,
      openingBalance: check.preview.accounts.find((p) => p.accountId === a.id)?.opening ?? 0,
    })),
    categories: prev.categories.map((c) => ({
      ...c,
      budget: Object.prototype.hasOwnProperty.call(prev.nextBudget, c.id) ? prev.nextBudget[c.id] : c.budget,
      note: '',
    })),
    transactions: [],
    carryoverBudget: null,
    reconciliations: {},
    reportDate: '',
    audit: { text: prev.audit.text, date: '' },
    nextBudget: {},
    handover: {
      date: '',
      successor: '',
      custody: prev.handover.custody.map((c) => ({ ...c, handedOver: false })),
      unpaid: [],
      unreceived: [],
      equipment: prev.handover.equipment.map((e) => ({ ...e })),
      memo: '',
    },
  }
  return { ok: true, value: { ...book, years: [...book.years, next], revision: book.revision + 1 } }
}

/**
 * 繰り越しを取り消す。いちばん新しい年度を消して、前の年度をもう一度書きかえられるようにする。
 * 新しい年度に取引が1件でもあると取り消せない（消すと、入力した取引がなくなるため）。
 * 新しい年度で変えた予算や役員の名前は消えるので、画面で確かめてから呼ぶこと。
 */
export function undoCarryForward(book: Book): Result<Book> {
  if (book.years.length < 2) return fail('nothing-to-undo', '取り消せる繰り越しがありません。')
  const last = latestYear(book)
  if (last.transactions.length > 0) {
    return fail(
      'has-transactions',
      `「${last.label}」に取引が ${last.transactions.length}件 入っているので、繰り越しを取り消せません。前の年度の直しは、「${last.label}」の取引として入れてください。`,
    )
  }
  return { ok: true, value: { ...book, years: book.years.slice(0, -1), revision: book.revision + 1 } }
}
