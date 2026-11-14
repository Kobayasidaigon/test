import { getItem } from './items'
import type { AppData, Estimate, EstimateLine, Yen } from './types'

// 見積書のデータを、作る・書き換えるための関数。
// どれも、もとのデータを書き換えずに、新しいデータを返す（React の state にそのまま入れられる）。

/** 何も入っていない見積書。 */
export function createEmptyEstimate(): Estimate {
  return { rent: null, commonFee: null, moveInDate: null, statedTotal: null, lines: [] }
}

/** 何も入っていない、道具の内容のすべて。 */
export function createEmptyData(): AppData {
  return { estimate: createEmptyEstimate(), message: { senderName: '', propertyName: '', lineIds: null } }
}

/**
 * 次の行の ID を作る（'l1'、'l2'、…）。
 * 乱数や時刻を使わないのは、同じ操作から同じデータができるようにするため（テストと、静的HTMLの書き出しのため）。
 */
export function nextLineId(lines: EstimateLine[]): string {
  let max = 0
  for (const line of lines) {
    const m = /^l(\d+)$/.exec(line.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  let n = max + 1
  // 形の違う ID（読み込んだファイルに入っていたもの など）と、万一ぶつからないようにする。
  while (lines.some((line) => line.id === `l${n}`)) n += 1
  return `l${n}`
}

/** 行を足す。itemId は項目の ID（一覧にない項目は 'other'）。 */
export function addLine(estimate: Estimate, itemId: string, init: { label?: string; amount?: Yen | null } = {}): Estimate {
  const item = getItem(itemId)
  const line: EstimateLine = {
    id: nextLineId(estimate.lines),
    itemId: item.id,
    label: init.label ?? '',
    amount: init.amount ?? null,
  }
  return { ...estimate, lines: [...estimate.lines, line] }
}

/** 行を書き換える。 */
export function updateLine(estimate: Estimate, lineId: string, patch: Partial<Omit<EstimateLine, 'id'>>): Estimate {
  return {
    ...estimate,
    lines: estimate.lines.map((line) => (line.id === lineId ? { ...line, ...patch, itemId: getItem(patch.itemId ?? line.itemId).id } : line)),
  }
}

/** 行を消す。 */
export function removeLine(estimate: Estimate, lineId: string): Estimate {
  return { ...estimate, lines: estimate.lines.filter((line) => line.id !== lineId) }
}

/** 行を、1つ上（-1）か、1つ下（+1）に動かす。端では何もしない。 */
export function moveLine(estimate: Estimate, lineId: string, direction: -1 | 1): Estimate {
  const from = estimate.lines.findIndex((line) => line.id === lineId)
  const to = from + direction
  if (from < 0 || to < 0 || to >= estimate.lines.length) return estimate
  const lines = [...estimate.lines]
  ;[lines[from], lines[to]] = [lines[to], lines[from]]
  return { ...estimate, lines }
}

/**
 * 文面に入れる行の指定から、もう見積書にない行の ID を取りのぞく。
 * 行を消したあとに呼ぶと、消した行が文面の指定に残らない。
 */
export function pruneMessageLineIds(data: AppData): AppData {
  if (data.message.lineIds === null) return data
  const ids = new Set(data.estimate.lines.map((line) => line.id))
  const lineIds = data.message.lineIds.filter((id) => ids.has(id))
  return lineIds.length === data.message.lineIds.length ? data : { ...data, message: { ...data.message, lineIds } }
}

/** 行の表示名（見積書の名前があればそれ、なければ項目の名前）。 */
export function lineLabel(line: EstimateLine): string {
  return line.label.trim() || getItem(line.itemId).name
}

/**
 * まだ何も入っていないか（見積書も、文面の名前も）。
 * 「サンプルを入れる」「ファイルを読み込む」の前に、置きかえてよいかを確かめるかどうかを、これで決める。
 */
export function isEmptyData(data: AppData): boolean {
  const { estimate: e, message: m } = data
  return (
    e.lines.length === 0 &&
    e.rent === null &&
    e.commonFee === null &&
    e.moveInDate === null &&
    e.statedTotal === null &&
    m.senderName.trim() === '' &&
    m.propertyName.trim() === ''
  )
}
