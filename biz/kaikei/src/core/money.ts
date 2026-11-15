// 金額の扱い。1円単位の整数だけを使い、小数は入り口で断る。
// 小数を許すと 0.1 + 0.2 のような誤差が合計に入り、通帳と1円合わない帳簿ができてしまうため。
import { LIMITS, type Yen } from './types'

/** 0 以上で上限までの整数か。 */
export function isYen(value: unknown): value is Yen {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= LIMITS.maxAmount
}

/** 1 以上で上限までの整数か（取引の金額）。 */
export function isPositiveYen(value: unknown): value is Yen {
  return isYen(value) && value >= 1
}

/** 整数の足し算で合計を出す。 */
export function sumYen(values: readonly Yen[]): Yen {
  let total = 0
  for (const v of values) total += v
  return total
}

export type FormatYenOptions = {
  /** マイナスの書き方。決算書では △ がふつう。'minus' は「-1,200」 */
  negative?: 'triangle' | 'minus'
  /** 「円」を付けるか */
  unit?: boolean
}

/**
 * 金額を「12,345」の形にする。
 * toLocaleString を使わないのは、書き出した静的HTMLとブラウザで結果が変わらないようにするため。
 */
export function formatYen(value: Yen, options: FormatYenOptions = {}): string {
  const negative = value < 0
  const digits = String(Math.abs(Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = negative ? (options.negative === 'minus' ? '-' : '△') : ''
  return sign + digits + (options.unit ? '円' : '')
}

export type ParseYenResult = { ok: true; value: Yen } | { ok: false; message: string }

/**
 * 入力欄の文字を金額にする。
 * 全角の数字、カンマ、「円」「¥」が入っていても読む（パソコンに慣れていない人は全角のまま打つことが多い）。
 * 小数・マイナス・数字でない文字は、理由を言って断る。0 は通す（0 でよいかは、使う側で決める）。
 */
export function parseYen(text: string): ParseYenResult {
  // NFKC で全角の数字・記号を半角にそろえる。「、」は、カンマのつもりで打たれることがあるので、カンマとして読む
  const normalized = text
    .normalize('NFKC')
    .replace(/[\s円¥\\]/g, '')
    .replace(/、/g, ',')
    .replace(/^\+/, '')
  // カンマは、3桁ごとの区切りの位置にあるときだけ読む。
  // 「12,5」や「1,20」をだまって 125・120 と読むと、桁を打ちそこねた金額が、そのまま帳簿に入ってしまうため
  if (normalized.includes(',') && /^[\d,]+$/.test(normalized) && !/^\d{1,3}(,\d{3})+$/.test(normalized)) {
    return { ok: false, message: 'カンマの位置が正しくありません。「12,000」のように3桁ごとに入れるか、カンマなしで入れてください。' }
  }
  const cleaned = normalized.replace(/,/g, '')
  if (cleaned === '') return { ok: false, message: '金額を入れてください。' }
  if (/^[-−ー―‐△▲]/.test(cleaned)) {
    return { ok: false, message: 'マイナスの金額は入れられません。支出は「支出」として、プラスの金額で入れてください。' }
  }
  if (/^\d+[.]\d*$/.test(cleaned) || /^[.]\d+$/.test(cleaned)) {
    return { ok: false, message: '小数は入れられません。1円単位の整数で入れてください。' }
  }
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, message: '金額は数字だけで入れてください（例: 12000）。' }
  }
  // 桁が多すぎる数は Number にすると正確でなくなるので、先に桁数で断る
  const trimmed = cleaned.replace(/^0+(?=\d)/, '')
  if (trimmed.length > String(LIMITS.maxAmount).length || Number(trimmed) > LIMITS.maxAmount) {
    return { ok: false, message: `金額が大きすぎます。${formatYen(LIMITS.maxAmount)}円までにしてください。` }
  }
  return { ok: true, value: Number(trimmed) }
}
