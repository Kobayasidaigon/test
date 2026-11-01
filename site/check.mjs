// 公開前のチェック。 node check.mjs （先に node build.mjs を実行しておく）
// 「名前を差し替えただけのページ」にならないための公開条件と、公開前の記入漏れを確かめる。
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { site } from './src/config.mjs'

const ROOT = dirname(new URL(import.meta.url).pathname)
const readJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'))
const problems = [], warnings = []

const log = await readJson('data/log.json')
const params = await readJson('data/params.json')
const offers = await readJson('data/offers.json')
const files = (await readdir(join(ROOT, 'data/cities'))).filter((f) => f.endsWith('.json'))
const cities = []
for (const f of files) {
  const c = await readJson(`data/cities/${f}`)
  if (c.publish === false) continue
  cities.push(c)
  const s = c.subsidy || {}
  const unique = [s.max_yen, s.rate, s.period, s.apply_before_contract, s.office, s.formula_note, s.budget_note, s.changes_from_last_year, s.end_note,
    (s.conditions || []).length ? 1 : null, c.city_planning_tax?.rate_percent, c.vacancy?.rate_percent, c.estimate_window?.exists, c.akiya_bank?.exists]
    .filter((v) => v !== null && v !== undefined).length
  if (s.exists && unique < 5) problems.push(`${c.city}: 固有の項目が${unique}個（5個以上必要）`)
  if (s.exists && !(s.sources || []).length) problems.push(`${c.city}: 補助制度の出典URLがない`)
  if (s.exists && !(c.pitfalls || []).length) warnings.push(`${c.city}: 申請でつまずく点が書かれていない`)
  if (!log.some((e) => e.city_slug === c.slug)) warnings.push(`${c.city}: 担当課への確認記録がない（公開前に電話で確認する）`)
  if (s.fiscal_year && !/令和8|2026/.test(s.fiscal_year)) warnings.push(`${c.city}: 年度が「${s.fiscal_year}」。最新年度の要綱を確かめる`)
}

// 市町村ページどうしの文の重複率（固有名詞と数字を除いた文の一致）
const pageText = async (c) => {
  const html = await readFile(join(ROOT, 'dist/area', c.pref_slug, c.slug, 'index.html'), 'utf8').catch(() => '')
  const main = html.split('<main id="main">')[1]?.split('</main>')[0] || ''
  return main.replace(/<[^>]+>/g, '\n').replace(new RegExp(c.city, 'g'), '◯').replace(/[0-9０-９,.]+/g, '#')
    .split(/[。\n]/).map((x) => x.trim()).filter((x) => x.length > 12)
}
if (cities.length > 1) {
  const texts = await Promise.all(cities.map(pageText))
  for (let i = 0; i < cities.length; i++) {
    const mine = new Set(texts[i])
    if (!mine.size) { warnings.push(`${cities[i].city}: dist にページがない（先に node build.mjs）`); continue }
    let maxShare = 0, other = ''
    for (let k = 0; k < cities.length; k++) {
      if (k === i) continue
      const theirs = new Set(texts[k])
      const shared = [...mine].filter((x) => theirs.has(x)).length / mine.size
      if (shared > maxShare) { maxShare = shared; other = cities[k].city }
    }
    const line = `${cities[i].city}: ほかのページと同じ文の割合 最大${Math.round(maxShare * 100)}%（${other}）`
    if (maxShare >= 0.5) problems.push(line + ' — 5割未満にする'); else console.log('  ' + line)
  }
}

if (!(params.sources || []).length) problems.push('data/params.json: 割合・税率・単価の出典がない')
if (/PROVISIONAL/.test(params.demolition?.note || '')) problems.push('data/params.json: 解体費の単価が仮の値のまま')
for (const [k, o] of Object.entries(offers)) if (!o.url) warnings.push(`data/offers.json: ${k} の広告URLが未設定（提携後に記入。未設定の枠は表示されない）`)
if (!site.operator.name || !site.operator.story) warnings.push('src/config.mjs: 運営者情報が未記入')
if (/example\.com/.test(site.baseUrl)) warnings.push('src/config.mjs: baseUrl が example.com のまま')

console.log(`\n確認した市町村: ${cities.length}`)
if (warnings.length) console.log('\n注意:\n' + warnings.map((w) => '  - ' + w).join('\n'))
if (problems.length) { console.log('\n公開できない理由:\n' + problems.map((w) => '  - ' + w).join('\n')); process.exitCode = 1 }
else console.log('\n公開条件は満たしています（注意の項目は公開前に片づけてください）。')
