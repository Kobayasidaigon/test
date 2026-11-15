import { site } from '../site.config'
import { createEmptyData } from './estimate'
import { isValidAmount, isValidDate, toOneLine } from './format'
import { getItem, isPresetItemId, OTHER_ITEM_ID } from './items'
import type { AppData, Estimate, EstimateLine, MessageSettings } from './types'

// 保存の形式と、読み込むときの検査。
//
// - ブラウザの保存領域（localStorage）と、書き出すファイル（JSON）は、同じ形（SavedFile）を使う。
// - 形には、どの道具のデータか（app）と、版の番号（version）を持たせる。
// - 読み込むときは、中身を1つずつ確かめる。合わないときは、理由を日本語で返して断る。
//   ブラウザのデータは、ほかの道具のものだったり、途中で切れていたり、手で書き換えられていたりするので、
//   どんな値が来ても落ちないようにする。
// - ここの関数は window や localStorage に直接さわらない。保存領域は引数で受け取る（テストできるように）。

/** いまの保存の形式の版。形を変えたら、番号を上げて、migrate に古い版からの直し方を足す。 */
export const SCHEMA_VERSION = 1

/** どの道具のデータかを表す名前。 */
export const APP_ID = site.slug

/**
 * 保存領域のキー。
 * 末尾の v1 は「キーの名前の版」で、SCHEMA_VERSION とは別。形式の版が上がっても、同じキーに入れたまま、
 * 読み込むときに新しい形に直す（キーを変えると、古いデータを見失うため）。
 */
export const STORAGE_KEY = `${site.slug}:data:v1`

/** 読めなかったデータを、消さずに取っておくキー。 */
export const BROKEN_BACKUP_KEY = `${STORAGE_KEY}:broken`

export const LIMITS = {
  /** 見積書の行の数。 */
  maxLines: 100,
  /** 行の名前の長さ。 */
  maxLabel: 60,
  /** 送る人の名前の長さ。 */
  maxSenderName: 40,
  /** 物件の名前の長さ。 */
  maxPropertyName: 60,
  /** 読み込むファイルの文字数。書き出したファイルは、100行でも数万字におさまる。 */
  maxFileChars: 500_000,
} as const

export type SavedFile = {
  app: string
  version: number
  /** 保存した日時（ISO 8601）。 */
  savedAt: string
  data: AppData
}

export type ParseResult =
  | {
      ok: true
      data: AppData
      /** 読み込めたが、直したところ（知らない項目を「その他」にした、など）。 */
      warnings: string[]
      savedAt: string | null
    }
  | { ok: false; reason: string }

const fail = (reason: string): ParseResult => ({ ok: false, reason })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 名前を、1行にそろえて（改行や続いた空白を、1つの空白に）、長すぎるものを切る。 */
function cut(text: string, max: number): string {
  return toOneLine(text).slice(0, max).trim()
}

/** 保存する形にする。 */
export function toSavedFile(data: AppData, now: Date): SavedFile {
  return { app: APP_ID, version: SCHEMA_VERSION, savedAt: now.toISOString(), data }
}

/**
 * 古い版のデータを、いまの版の形に直す。
 * いまは版が 1 しかないので、何もしない。版を上げるときに、ここに「1 → 2 の直し方」を足す。
 */
function migrate(version: number, data: unknown): unknown {
  void version
  return data
}

/**
 * 読み込んだ値（JSON.parse の結果）を確かめて、道具のデータにする。
 * 合わないときは、理由を返す。
 *
 * from は、どこから来た値か。理由の文の言い方を変える（ファイルの読み込みでは「このファイルは」と言うが、
 * ブラウザの保存領域には、選んだファイルがないので、「保存されていたデータは」と言う）。
 */
export function parseSaved(value: unknown, from: 'file' | 'storage' = 'file'): ParseResult {
  const file = from === 'file'
  if (!isRecord(value)) return fail('みつもり点検のデータではありません（中身が、決まった形になっていません）。')
  if (value.app !== APP_ID) {
    return fail(file ? 'このファイルは、みつもり点検で書き出したファイルではありません。' : '保存されていたデータは、みつもり点検のデータではありません。')
  }
  const version = value.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail(file ? '版の番号が、正しくありません。みつもり点検で書き出したファイルかどうかを、確かめてください。' : '版の番号が、正しくありません。')
  }
  if (version > SCHEMA_VERSION) {
    return fail(
      file
        ? `このファイルは、新しい版のみつもり点検で作られています（版 ${version}）。ページを読み込み直してから、もう一度お試しください。`
        : `保存されていたデータは、新しい版のみつもり点検で作られています（版 ${version}）。ページを読み込み直してください。`,
    )
  }
  const data = migrate(version, value.data)
  if (!isRecord(data)) return fail('データの中身が、見つかりません。')

  const warnings: string[] = []
  const est = parseEstimate(data.estimate, warnings)
  if (typeof est === 'string') return fail(est)
  const message = parseMessage(data.message, est)
  const savedAt = typeof value.savedAt === 'string' && !Number.isNaN(Date.parse(value.savedAt)) ? value.savedAt : null
  return { ok: true, data: { estimate: est, message }, warnings, savedAt }
}

/** 見積書の部分を確かめる。だめなときは、理由の文を返す。 */
function parseEstimate(value: unknown, warnings: string[]): Estimate | string {
  if (!isRecord(value)) return '見積書のデータが、見つかりません。'
  const money = (v: unknown): number | null | undefined => (v === null || v === undefined ? null : isValidAmount(v) ? v : undefined)

  const rent = money(value.rent)
  if (rent === undefined) return '家賃の値が、正しくありません（0 以上の整数で、1億円未満の数だけを読み込めます）。'
  const commonFee = money(value.commonFee)
  if (commonFee === undefined) return '管理費・共益費の値が、正しくありません。'
  const statedTotal = money(value.statedTotal)
  if (statedTotal === undefined) return '見積書の合計の値が、正しくありません。'

  let moveInDate: string | null = null
  if (value.moveInDate !== null && value.moveInDate !== undefined) {
    if (!isValidDate(value.moveInDate)) return '入居する日の値が、正しくありません（2027-03-20 のような形の、暦にある日だけを読み込めます）。'
    moveInDate = value.moveInDate
  }

  if (!Array.isArray(value.lines)) return '見積書の項目の一覧が、見つかりません。'
  if (value.lines.length > LIMITS.maxLines) return `見積書の項目が、多すぎます（${LIMITS.maxLines}行までを読み込めます）。`

  const lines: EstimateLine[] = []
  const used = new Set<string>()
  for (let i = 0; i < value.lines.length; i++) {
    const raw = value.lines[i]
    const where = `項目の${i + 1}行目`
    if (!isRecord(raw)) return `${where}が、決まった形になっていません。`
    if (typeof raw.itemId !== 'string' || raw.itemId === '') return `${where}に、項目の種類がありません。`
    if (raw.label !== undefined && typeof raw.label !== 'string') return `${where}の名前が、文字になっていません。`
    const amount = money(raw.amount)
    if (amount === undefined) return `${where}の金額が、正しくありません（0 以上の整数で、1億円未満の数だけを読み込めます）。`

    let itemId = raw.itemId
    let label = cut(raw.label ?? '', LIMITS.maxLabel)
    if (itemId !== OTHER_ITEM_ID && !isPresetItemId(itemId)) {
      // いまの一覧にない項目（新しい版で足された、または消された項目）。捨てずに「その他」として残す。
      warnings.push(`${where}（${label || '名前のない項目'}）は、いまの一覧にない種類の項目のため、「その他」として読み込みました。`)
      itemId = OTHER_ITEM_ID
    }
    if (itemId === OTHER_ITEM_ID && label === '') label = '名前のない項目'

    // ID がない、または重なっているときは、付け直す（文面の指定とずれるが、落ちるよりよい）。
    let id = typeof raw.id === 'string' && raw.id !== '' && raw.id.length <= 40 && !used.has(raw.id) ? raw.id : ''
    if (id === '') {
      let n = lines.length + 1
      while (used.has(`l${n}`)) n += 1
      id = `l${n}`
    }
    used.add(id)
    lines.push({ id, itemId: getItem(itemId).id, label, amount })
  }
  return { rent, commonFee, moveInDate, statedTotal, lines }
}

/** 文面の設定を確かめる。ここは、おかしな値があっても断らずに、はじめの状態に戻す（見積書のほうが大事なため）。 */
function parseMessage(value: unknown, estimate: Estimate): MessageSettings {
  const empty = createEmptyData().message
  if (!isRecord(value)) return empty
  const ids = new Set(estimate.lines.map((line) => line.id))
  const lineIds = Array.isArray(value.lineIds)
    ? [...new Set(value.lineIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))]
    : null
  return {
    senderName: typeof value.senderName === 'string' ? cut(value.senderName, LIMITS.maxSenderName) : '',
    propertyName: typeof value.propertyName === 'string' ? cut(value.propertyName, LIMITS.maxPropertyName) : '',
    lineIds,
  }
}

/** JSON の文字（ファイルの中身、保存領域の値）を確かめて、道具のデータにする。 */
export function parseSavedText(text: string): ParseResult {
  if (text.length > LIMITS.maxFileChars) return fail('ファイルが大きすぎます。みつもり点検で書き出したファイルを、選んでください。')
  const body = text.replace(/^﻿/, '').trim() // 先頭の BOM（メモ帳で保存したファイルに付く）を取る
  if (body === '') return fail('ファイルの中身が、空です。')
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    // 「JSON」という言葉は、ふつうの人には通じにくいので、出さない。
    return fail('ファイルの中身を、読めませんでした。みつもり点検で書き出したファイル（mitsumori-tenken-….json）を、選んでください。')
  }
  return parseSaved(value)
}

// ---------------------------------------------------------------------------
// ファイルへの書き出し
// ---------------------------------------------------------------------------

export type ExportFile = {
  filename: string
  /** ファイルの中身（JSON）。 */
  text: string
  mime: 'application/json'
}

/** 書き出すファイルを作る。ファイル名には、その端末の日時を入れる（mitsumori-tenken-20261114-0930.json）。 */
export function buildExportFile(data: AppData, now: Date): ExportFile {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`
  return {
    filename: `mitsumori-tenken-${stamp}.json`,
    text: JSON.stringify(toSavedFile(data, now), null, 2) + '\n',
    mime: 'application/json',
  }
}

// ---------------------------------------------------------------------------
// ブラウザの保存領域
// ---------------------------------------------------------------------------

/** localStorage のうち、使う部分だけ。テストでは、同じ形の入れ物を渡す。 */
export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadResult =
  /** 保存されたデータがない（はじめて開いた）。 */
  | { status: 'empty'; data: AppData }
  /** 読み込めた。 */
  | { status: 'ok'; data: AppData; warnings: string[]; savedAt: string | null }
  /** 保存されていたが、読めなかった。data は空。読めなかったデータは BROKEN_BACKUP_KEY に取ってある。 */
  | { status: 'broken'; data: AppData; reason: string }
  /** 保存領域が使えない（プライベートブラウズ、設定で止められている など）。 */
  | { status: 'unavailable'; data: AppData; reason: string }

const UNAVAILABLE = 'このブラウザでは、入力した内容を保存できません。閉じると消えるので、「ファイルに書き出す」で残してください。'

/**
 * 保存領域の値を確かめる。
 * parseSavedText と分けているのは、理由の文のため。ファイルの読み込みでは「ファイルを選んでください」と言うが、
 * 保存領域では、選ぶファイルがない。JSON として読めないときは、保存領域に合った言い方にする。
 */
function parseStored(raw: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return fail('中身が途中で切れているか、書き換えられています。')
  }
  return parseSaved(value, 'storage')
}

/** 保存領域から読み込む。何が起きても落ちずに、使えるデータ（だめなら空）を返す。 */
export function loadData(storage: StorageLike | null | undefined): LoadResult {
  if (!storage) return { status: 'unavailable', data: createEmptyData(), reason: UNAVAILABLE }
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable', data: createEmptyData(), reason: UNAVAILABLE }
  }
  if (raw === null) return { status: 'empty', data: createEmptyData() }
  const parsed = parseStored(raw)
  if (parsed.ok) return { status: 'ok', data: parsed.data, warnings: parsed.warnings, savedAt: parsed.savedAt }
  try {
    // 次に保存すると上書きされるので、読めなかったデータを別のキーに取っておく。
    storage.setItem(BROKEN_BACKUP_KEY, raw)
  } catch {
    // 取っておけなくても、道具は使えるようにする。
  }
  return {
    status: 'broken',
    data: createEmptyData(),
    reason: `保存されていたデータを、読めませんでした。空の状態から始めます。「ファイルに書き出す」で残したファイルがあれば、「ファイルを読み込む」から戻せます。（理由: ${parsed.reason}）`,
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: string }

/** 保存領域に保存する。保存できなかったときは、理由を返す（落ちない）。 */
export function saveData(storage: StorageLike | null | undefined, data: AppData, now: Date): SaveResult {
  if (!storage) return { ok: false, reason: UNAVAILABLE }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(toSavedFile(data, now)))
    return { ok: true }
  } catch {
    return {
      ok: false,
      reason: 'ブラウザに保存できませんでした。保存領域がいっぱいか、保存が止められています。「ファイルに書き出す」で、内容を残してください。',
    }
  }
}

/** 保存領域のデータを消す（「全部消してやり直す」のとき）。 */
export function clearData(storage: StorageLike | null | undefined): void {
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(BROKEN_BACKUP_KEY)
  } catch {
    // 消せなくても、落ちないようにする。
  }
}
