// 空き家の算段 — 静的サイトの生成。依存なし。
//   node build.mjs            → dist/（本番用。リンクは /tool/ の形）
//   node build.mjs --preview  → dist/（ファイルを直接開いても動くよう、リンクに index.html を付ける）
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { site } from './src/config.mjs'
import { makeHref } from './src/lib.mjs'
import { layout } from './src/layout.mjs'
import { homePage } from './src/pages/home.mjs'
import { toolPage } from './src/pages/tool.mjs'
import { areaIndexPage, prefPage, cityPage } from './src/pages/area.mjs'
import { guideIndexPage, taxGuidePage, kaitoriGuidePage } from './src/pages/guide.mjs'
import { dataPage, hojoCsv, aboutPage, logPage, privacyPage, notFoundPage } from './src/pages/misc.mjs'

const preview = process.argv.includes('--preview')
const ROOT = dirname(new URL(import.meta.url).pathname)
const DIST = join(ROOT, 'dist')
const readJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'))

const params = await readJson('data/params.json')
const prefs = await readJson('data/prefs.json')
const offers = await readJson('data/offers.json')
const log = await readJson('data/log.json')
const cityFiles = (await readdir(join(ROOT, 'data/cities'))).filter((f) => f.endsWith('.json')).sort()
const cities = []
for (const f of cityFiles) {
  const c = await readJson(`data/cities/${f}`)
  if (c.publish === false) continue // 公開条件を満たさない自治体はページを作らない
  cities.push(c)
}
cities.sort((a, b) => (a.pref_slug + a.slug).localeCompare(b.pref_slug + b.slug))

const builtAt = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10)
const href = makeHref(preview)
const pages = []
const add = (path, fn) => pages.push({ path, fn })

add('/', (ctx) => homePage(ctx, { cities, params, prefs }))
add('/tool/', (ctx) => toolPage(ctx, { cities, params, offers }))
add('/area/', (ctx) => areaIndexPage(ctx, { cities, prefs }))
for (const pref of Object.values(prefs)) {
  if (!cities.some((c) => c.pref_slug === pref.slug)) continue
  add(`/area/${pref.slug}/`, (ctx) => prefPage(ctx, { pref, cities }))
}
for (const city of cities) add(`/area/${city.pref_slug}/${city.slug}/`, (ctx) => cityPage(ctx, { city, params, prefs, log }))
add('/guide/', (ctx) => guideIndexPage(ctx))
add('/guide/kaitai-go-zeikin/', (ctx) => taxGuidePage(ctx, { params }))
add('/guide/kaitori-chuui/', (ctx) => kaitoriGuidePage(ctx, { params }))
add('/data/kaitai-hojo/', (ctx) => dataPage(ctx, { cities }))
add('/about/', (ctx) => aboutPage(ctx))
add('/log/', (ctx) => logPage(ctx, { log, cities }))
add('/privacy/', (ctx) => privacyPage(ctx))
add('/404.html', (ctx) => notFoundPage(ctx))

await rm(DIST, { recursive: true, force: true })
await mkdir(DIST, { recursive: true })

const outFile = (path) => path.endsWith('.html') ? join(DIST, path) : join(DIST, path, 'index.html')
for (const { path, fn } of pages) {
  const ctx = {
    path, site, builtAt, href,
    asset: (name) => href(path, `/assets/${name}`).replace(/\/(index\.html)?$/, ''),
  }
  const page = fn(ctx)
  const file = outFile(path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, layout(ctx, page))
}

await cp(join(ROOT, 'src/assets'), join(DIST, 'assets'), { recursive: true })
await mkdir(join(DIST, 'data'), { recursive: true })
await writeFile(join(DIST, 'data/kaitai-hojo.csv'), hojoCsv(cities))

const base = site.baseUrl.replace(/\/$/, '')
const urls = pages.filter((p) => !p.path.endsWith('.html')).map((p) => `  <url><loc>${base}${p.path}</loc><lastmod>${builtAt}</lastmod></url>`)
await writeFile(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`)
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`)

console.log(`${pages.length} pages → dist/ (${preview ? 'preview' : 'production'}), cities: ${cities.map((c) => c.city).join(', ')}`)
