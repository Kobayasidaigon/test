// ブラウザの機能を使う小さな関数（ファイルを保存させる、選んだファイルを読む）。
// ここだけは document や Blob に触る。画面のイベント（ボタンを押したとき）の中から呼ぶこと。
// 静的HTMLに書き出すページでは、描くときに呼ばない。

/** 文字を、ファイルとして保存させる（ブラウザの「ダウンロード」になる） */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // すぐに消すと、保存が始まる前に URL が無効になるブラウザがあるので、少し待ってから消す
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** 読み込むファイルの大きさの上限。まちがえて大きなファイルを選んだときに、画面が固まらないようにする */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024

/** 選んだファイルを文字として読む。大きすぎるファイルは、理由を言って断る */
export async function readFileText(file: File): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, reason: 'ファイルが大きすぎます。この道具で書き出したファイル（.json）を選んでください。' }
  }
  try {
    return { ok: true, text: await file.text() }
  } catch {
    return { ok: false, reason: 'ファイルを読めませんでした。もう一度、選び直してください。' }
  }
}
