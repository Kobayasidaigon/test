// テンプレートで使う小さな道具。依存なし。

export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// テンプレートリテラル用。配列は連結、null/undefined/false は空文字。
export const html = (strings, ...values) => strings.reduce((out, s, i) => {
  const v = values[i - 1]
  const str = Array.isArray(v) ? v.join('') : (v === null || v === undefined || v === false ? '' : String(v))
  return out + str + s
})

export const yen = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${Math.round(n).toLocaleString('ja-JP')}円`
export const man = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${(Math.round(n / 1000) / 10).toLocaleString('ja-JP')}万円`
export const pct = (n, digits = 1) => (n === null || n === undefined) ? '—' : `${Number(n).toFixed(digits)}%`

// 2026-11-01 → 2026年11月1日
export const jdate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

// ページ間リンク。常に相対パスで出す（ルート直下でも、サブパスでも、プレビューでも動く）。
// from, to はサイト内パス（例: '/area/nagano/'）。preview=true なら index.html を付ける。
export const makeHref = (preview) => (from, to) => {
  if (/^(https?:|mailto:|#)/.test(to)) return to
  const [toPath, hash = ''] = to.split('#')
  const fromDir = from.endsWith('/') ? from : from.replace(/[^/]*$/, '')
  const a = fromDir.split('/').filter(Boolean)
  const b = toPath.split('/').filter(Boolean)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  let rel = '../'.repeat(a.length - i) + b.slice(i).join('/')
  const isDir = toPath.endsWith('/')
  if (isDir && rel && !rel.endsWith('/')) rel += '/'
  if (preview && isDir) rel += 'index.html'
  if (!rel) rel = preview ? 'index.html' : './'
  return rel + (hash ? `#${hash}` : '')
}

export const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }
