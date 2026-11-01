// 開発用の簡易サーバー（依存なし）。 node serve.mjs → http://localhost:4321
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const ROOT = new URL('./dist/', import.meta.url).pathname
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.json': 'application/json' }
const port = Number(process.env.PORT || 4321)

createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
    let file = join(ROOT, p)
    const s = await stat(file).catch(() => null)
    if (s && s.isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    const nf = await readFile(join(ROOT, '404.html')).catch(() => 'not found')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(nf)
  }
}).listen(port, () => console.log(`http://localhost:${port}`))
