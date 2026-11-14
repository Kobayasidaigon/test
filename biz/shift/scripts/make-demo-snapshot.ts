// LP に置く見本（src/components/landing/demo-snapshot.ts）を作り直す。
//
//   npm run snapshot
//
// なぜ要るか: LP は静的HTMLに書き出すので、開いた直後にブラウザが同じ内容をもう一度描く（ハイドレーション）。
// そのたびに自動作成を回すと、遅いスマホではページを開くだけで1〜2秒止まってしまう。
// そこで「サンプルを本物の自動作成で組んだ結果」を、あらかじめファイルにしておく。
// 中身が本物の計算と同じであることは、src/components/landing/demo-snapshot.test.ts が毎回確かめる。
// 自動作成（src/core/solver.ts）やサンプル（src/core/samples.ts）を変えてテストが落ちたら、これを回して作り直す。
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { buildDemoSnapshot } from '../src/components/landing/demo-build'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components/landing/demo-snapshot.ts')
const snap = buildDemoSnapshot()

const text = `// このファイルは scripts/make-demo-snapshot.ts が作る（npm run snapshot）。手で書きかえない。
// LP の見本に使う、サンプルの店を本物の自動作成で組んだ結果。
// 本物の計算と同じであることを、demo-snapshot.test.ts が確かめている。
import type { DemoSnapshot } from './demo-data'

export const DEMO_SNAPSHOT: DemoSnapshot = ${JSON.stringify(snap, null, 2)}
`
writeFileSync(out, text)
console.log(`書き出しました: ${out}`)
