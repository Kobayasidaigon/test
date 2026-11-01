// data/medical-r7.csv と data/rent-r5.csv → src/shared/national.ts
import { readFileSync, writeFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','))
const age = (s) => (s === '就学前' ? 6 : Number((s.match(/(\d+)歳/) || [])[1] ?? NaN))
const medical = {}
for (const [pref, name, t, n, ilT, ilN, cpT, cpN, note] of read('medical-r7.csv')) {
  medical[pref + name] = [age(t), age(n), ilT === '有' ? 1 : 0, cpT === '有' ? 1 : 0, note || '']
}
const rent = {}
for (const [code5, name, all, a18, a24] of read('rent-r5.csv')) {
  const num = (v) => (v && v !== 'None' ? Number(v) : null)
  rent[code5] = [num(all), num(a18), num(a24)]
}
const ts = `// 自動生成（scripts/gen-national.mjs）。手で編集しない。
// 子ども医療費助成: こども家庭庁「こどもに係る医療費の助成についての調査（令和7年度）」別紙3（令和7年4月1日時点）を加工
// 家賃: 総務省統計局「令和5年住宅・土地統計調査」第111-3表（e-Stat）を加工。借家の1か月当たり家賃の平均（家賃0円を含まない）
// [通院の対象年齢（年度末）, 入院の対象年齢, 所得制限あり(1), 通院の一部自己負担あり(1), 注記]
export const MEDICAL_R7: Record<string, [number, number, 0 | 1, 0 | 1, string]> = ${JSON.stringify(medical)}
// [総数, 居住室18.0〜23.9畳, 24.0〜29.9畳]（円/月）。キーは地方公共団体コードの上5けた
export const RENT_R5: Record<string, [number | null, number | null, number | null]> = ${JSON.stringify(rent)}
`
writeFileSync(new URL('../src/shared/national.ts', import.meta.url), ts)
console.log(`medical ${Object.keys(medical).length}, rent ${Object.keys(rent).length}, ${(ts.length / 1024).toFixed(0)} KB`)
