import { addLine } from '@/core/estimate'
import { inspectEstimate } from '@/core/inspect'
import { OTHER_ITEM_ID } from '@/core/items'
import { sampleEstimate } from '@/core/sample'
import type { Estimate, Inspection } from '@/core/types'

// LP で見せる、点検の結果。どちらも、道具と同じ関数（inspectEstimate）に通した、本物の結果。
// 純粋な関数なので、静的HTMLの書き出し（ssr: true）でも、ブラウザでも、同じ結果になる。

/** サンプルの見積書（道具の「サンプルの見積書を入れる」と同じもの）を、点検した結果。 */
export function sampleInspection(): Inspection {
  return inspectEstimate(sampleEstimate())
}

/**
 * 「何がわかるか」の欄で使う、区分の見本。
 * サンプルの見積書には出てこない区分（重なっていないか／契約書で確かめる／一覧にない項目）も見せるために、
 * サンプルに3行を足した見積書を点検する。金額は、動きを見せるための例（相場ではない）。
 * 見積書に書かれた合計は、行を足して合わなくなるので、入れていないことにする。
 */
export function categoryDemoInspection(): Inspection {
  let estimate: Estimate = { ...sampleEstimate(), statedTotal: null }
  estimate = addLine(estimate, 'cleaning', { label: '退去時クリーニング費用（前払い）', amount: 44_000 })
  estimate = addLine(estimate, 'koshin', { label: '更新料（2年ごと）', amount: 78_000 })
  estimate = addLine(estimate, OTHER_ITEM_ID, { label: '入居安心パック', amount: 11_000 })
  return inspectEstimate(estimate)
}
