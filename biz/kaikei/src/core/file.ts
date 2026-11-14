// ひきつぎファイル（JSON の1ファイル）の書き出しと読み込み。
// ブラウザの中のデータは消えることがあるので、主役はこのファイル。
// ここは文字列を作る・読むだけで、ブラウザの機能（ダウンロードなど）には触らない（それは browser.ts）。
import { latestYear } from './calc'
import { dateFromLocal } from './dates'
import { FILE_FORMAT, FILE_VERSION, LIMITS, fail, type Book, type BookFile, type Fail, type Result } from './types'
import { parseBookValue, type ParsedBook } from './validate'

/** ファイルの名前に使えない文字を取りのぞく（Windows で保存できない記号、改行など）。 */
function safeFileNamePart(text: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = text.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '').replace(/^\.+/, '')
  return cleaned.slice(0, 30) || '名前なし'
}

/** ひきつぎファイルの名前。「ひきつぎ会計_あおぞら町内会_令和8年度_2026-11-14.json」 */
export function suggestFileName(book: Book, now: Date): string {
  const year = latestYear(book)
  return `ひきつぎ会計_${safeFileNamePart(book.orgName)}_${safeFileNamePart(year.label)}_${dateFromLocal(now)}.json`
}

/** 帳簿を、ファイルに書く文字列にする。人が開いても読めるように、字下げを付ける。 */
export function serializeBook(book: Book, now: Date): string {
  const file: BookFile = { format: FILE_FORMAT, version: FILE_VERSION, savedAt: now.toISOString(), book }
  return JSON.stringify(file, null, 2) + '\n'
}

export type BuiltFile = { fileName: string; text: string }

/**
 * 保存するファイルの名前と中身を作る。
 * 作った中身を、その場でもう一度読み込んで確かめる。「保存はできたのに、あとで開けない」ファイルを
 * 渡してしまうのが、いちばん困るため。
 */
export function buildBookFile(book: Book, now: Date): Result<BuiltFile> {
  let text: string
  try {
    text = serializeBook(book, now)
  } catch {
    return fail('serialize', '保存するファイルを作れませんでした。ページを開き直して、もう一度お試しください。')
  }
  const check = parseBookFile(text)
  if (!check.ok) {
    return fail('self-check', `保存する内容に問題が見つかったので、ファイルを作りませんでした。（${check.message}）`)
  }
  return { ok: true, value: { fileName: suggestFileName(book, now), text } }
}

/**
 * ファイルの中身（文字列）を読んで、帳簿にする。合わないファイルは、理由を言って断る。
 * warnings は、読めたけれど確かめてほしいこと（年度のつながりが合わない、など）。
 */
export function parseBookFile(text: string): ParsedBook | Fail {
  if (typeof text !== 'string' || text.trim() === '') {
    return fail('empty', 'ファイルの中身が空です。別のひきつぎファイルを選んでください。')
  }
  if (text.length > LIMITS.maxFileBytes) {
    return fail('too-large', 'ファイルが大きすぎます。ひきつぎ会計のファイルかどうか、確かめてください。')
  }
  let value: unknown
  try {
    // 先頭の BOM（メモ帳で保存し直すと付くことがある）は取りのぞく
    value = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return fail('not-json', 'ひきつぎ会計のファイルとして読めませんでした。「ひきつぎ会計_」で始まる名前の、.json のファイルを選んでください。')
  }
  return parseBookValue(value)
}
