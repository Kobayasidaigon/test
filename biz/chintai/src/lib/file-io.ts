// ファイルへの書き出しと読み込みの、ブラウザにさわる部分。
// 中身を作る・確かめるのは core/storage.ts（buildExportFile、parseSavedText）。ここは、その前後だけを受け持つ。
// document にさわるので、ボタンを押したとき（イベントの中）だけ呼ぶこと。描くときには呼ばない。

/** 文字をファイルとして保存する（ブラウザの「ダウンロード」に入る）。 */
export function downloadTextFile(file: { filename: string; text: string; mime: string }): void {
  const blob = new Blob([file.text], { type: `${file.mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // すぐに消すと、保存が始まらないブラウザがあるので、少し待ってから消す。
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 選ばれたファイルの中身を、文字として読む。読めなかったときは、理由つきで失敗する。 */
export async function readTextFile(file: File): Promise<string> {
  try {
    return await file.text()
  } catch {
    throw new Error('ファイルを開けませんでした。もう一度、ファイルを選び直してください。')
  }
}
