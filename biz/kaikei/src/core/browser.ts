// ブラウザの機能を使うところ（ファイルのダウンロード、選んだファイルを読む）。
// React には依存しない。ボタンを押したときの処理の中からだけ呼ぶこと
// （静的HTMLに書き出すページを描いている最中に呼ぶと、document がなくて落ちる）。
import { buildBookFile, parseBookFile } from './file'
import { LIMITS, fail, type Book, type Fail, type Result } from './types'
import type { ParsedBook } from './validate'

/** 文字列を、ファイルとしてダウンロードさせる。 */
export function downloadTextFile(fileName: string, text: string, mimeType = 'application/json'): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  // Firefox は、ページの中に置いていないリンクの click() を無視することがあるので、いったん置く
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // すぐに取り消すと、Safari でダウンロードが始まらないことがあるので、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * 帳簿を、ひきつぎファイルとしてダウンロードさせる。
 * うまくいったら、ファイルの名前を返す。画面は、そのあと markSaved() で「保存した」と記録する。
 * （ブラウザは、利用者が保存をやめたかどうかを教えてくれない。ダウンロードを始めたところまでしか確かめられない）
 */
export function saveBookToFile(book: Book, now: Date = new Date()): Result<{ fileName: string }> {
  const built = buildBookFile(book, now)
  if (!built.ok) return built
  try {
    downloadTextFile(built.value.fileName, built.value.text)
  } catch {
    return fail('download', 'ファイルを保存できませんでした。ブラウザの設定でダウンロードが止められていないか、確かめてください。')
  }
  return { ok: true, value: { fileName: built.value.fileName } }
}

/**
 * 利用者が選んだファイルを読んで、帳簿にする。合わないファイルは、理由を言って断る。
 * <input type="file"> の files[0] や、ドラッグして落とされたファイルを、そのまま渡せる。
 */
export async function openBookFile(file: Blob): Promise<ParsedBook | Fail> {
  // 大きなファイル（写真や動画をまちがえて選んだとき）は、読む前に断る
  if (file.size > LIMITS.maxFileBytes) {
    return fail('too-large', 'ファイルが大きすぎます。ひきつぎ会計のファイル（「ひきつぎ会計_」で始まる .json）を選んでください。')
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    return fail('read', 'ファイルを読めませんでした。もう一度、ファイルを選び直してください。')
  }
  return parseBookFile(text)
}
