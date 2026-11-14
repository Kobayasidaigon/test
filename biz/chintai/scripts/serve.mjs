// dist/ を手元で確認するための小さなサーバー。公開先（Vercel の cleanUrls）と同じく、/app で dist/app/index.html を返す。
// 使い方: node scripts/serve.mjs [ポート番号]   （先に npm run build）
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, extname, join, normalize } from 'node:path'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.argv[2] ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
}

async function find(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  for (const p of [safe, join(safe, 'index.html'), safe.replace(/\/$/, '') + '.html']) {
    const file = join(dist, p)
    if (!file.startsWith(dist)) continue
    try { if ((await stat(file)).isFile()) return file } catch {}
  }
  return null
}

createServer(async (req, res) => {
  const file = await find(new URL(req.url, 'http://x').pathname)
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('404'); return }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
  res.end(await readFile(file))
}).listen(port, () => console.log(`http://localhost:${port}`))
