// data/localgovjp-utf8.csv → src/shared/municipalities.ts（1,741市区町村。政令市の区は除く）
import { readFileSync, writeFileSync } from 'node:fs'
const csv = readFileSync(new URL('../data/localgovjp-utf8.csv', import.meta.url), 'utf8').replace(/^﻿/, '')
const [head, ...lines] = csv.trim().split(/\r?\n/)
const cols = head.split(',')
const parse = (line) => {
  const out = []; let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') { q = !q; continue }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return Object.fromEntries(cols.map((c, i) => [c, out[i] ?? '']))
}
const rows = lines.map(parse).filter((r) => !r.city.includes(' '))
const prefs = [...new Set(rows.map((r) => r.pref))]
const tuples = rows.map((r) => [r.lgcode, r.pref, r.city, r.citykana, Number(Number(r.lat).toFixed(4)), Number(Number(r.lng).toFixed(4)), r.url, r.phrase.replace(/\s+/g, ' ').trim()])
const ts = `// 自動生成（scripts/gen-municipalities.mjs）。手で編集しない。
// 全国1,741市区町村の一覧。出典: Code for FUKUI「localgovjp」（CC0）https://github.com/code4fukui/localgovjp
export interface Muni { code: string; pref: string; name: string; kana: string; lat: number; lng: number; url: string; phrase: string }
export const PREFS: string[] = ${JSON.stringify(prefs)}
const RAW: [string, string, string, string, number, number, string, string][] = ${JSON.stringify(tuples)}
export const MUNICIPALITIES: Muni[] = RAW.map(([code, pref, name, kana, lat, lng, url, phrase]) => ({ code, pref, name, kana, lat, lng, url, phrase }))
`
writeFileSync(new URL('../src/shared/municipalities.ts', import.meta.url), ts)
console.log(`${rows.length} municipalities, ${prefs.length} prefectures, ${(ts.length / 1024).toFixed(0)} KB`)
