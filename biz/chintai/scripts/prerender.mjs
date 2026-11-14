// ビルドの最後に、ページごとの静的HTMLを dist/ に書き出す。
// dist/index.html（vite build の出力）をひな形にして、<head> の中身と本文を差し込む。
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const { routes, site, render } = await import(pathToFileURL(resolve(root, 'dist-ssr/entry-server.js')).href)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const template = await readFile(resolve(dist, 'index.html'), 'utf8')
if (!template.includes('<!--app-head-->') || !template.includes('<div id="root"><!--app-html--></div>')) {
  throw new Error('index.html に <!--app-head--> と <div id="root"><!--app-html--></div> が必要です')
}

for (const route of routes) {
  const html = await render(route)
  const url = site.baseUrl ? site.baseUrl + (route.path === '/' ? '/' : route.path) : ''
  const head = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    url && `<link rel="canonical" href="${esc(url)}" />`,
    url && `<meta property="og:url" content="${esc(url)}" />`,
    url && `<meta property="og:image" content="${esc(site.baseUrl + '/og.png')}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].filter(Boolean).join('\n    ')
  // data-ssr に書き出したページのパスを入れておく。ブラウザ側は、これがURLと合うときだけ静的HTMLを引き継ぐ。
  const page = template
    .replace('<!--app-head-->', head)
    .replace('<div id="root"><!--app-html--></div>', `<div id="root"${route.ssr ? ` data-ssr="${esc(route.path)}"` : ''}>${html}</div>`)
  const file = route.path === '/' ? resolve(dist, 'index.html') : resolve(dist, route.path.slice(1), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, page)
  console.log(`  ${route.path}  →  ${file.replace(root + '/', '')}  (${route.ssr ? 'HTMLあり' : '枠だけ'})`)
}

if (site.baseUrl) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = routes.map((r) => `  <url><loc>${site.baseUrl}${r.path === '/' ? '/' : r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
}
await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true })
