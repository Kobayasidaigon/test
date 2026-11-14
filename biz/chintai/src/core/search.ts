import { items, OTHER_ITEM_ID } from './items'
import type { ItemDef } from './types'

// 見積書の言葉から、項目を探す。
// 見積書での書かれ方はさまざまなので（「抗菌施工費」「室内除菌」「24hサポート」…）、
// 項目の名前・別の呼び方・読みがなのどれかに当たれば、候補に出す。

/**
 * 探すために、文字をそろえる。
 * 全角と半角（NFKC）、大文字と小文字、カタカナとひらがなの違いをなくし、空白や記号を取る。
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) // カタカナ → ひらがな
    .replace(/[\s・･、。,.．，:：;；/／\\()（）［］「」『』【】\-‐−–—~〜]/g, '')
}

type Term = { text: string; shown: string; from: 'name' | 'alias' | 'keyword' }

const index: { item: ItemDef; terms: Term[] }[] = items.map((item) => ({
  item,
  terms: [
    { text: normalizeForSearch(item.name), shown: item.name, from: 'name' as const },
    ...item.aliases.map((a) => ({ text: normalizeForSearch(a), shown: a, from: 'alias' as const })),
    ...item.keywords.map((k) => ({ text: normalizeForSearch(k), shown: item.name, from: 'keyword' as const })),
  ].filter((t) => t.text.length > 0),
}))

/** 探す言葉が、項目の言葉にどれくらい合うか（0 は合わない）。 */
function scoreTerm(q: string, t: Term): number {
  const bonus = t.from === 'name' ? 5 : 0
  if (t.text === q) return 100 + bonus
  if (t.text.startsWith(q)) return 80 + bonus
  if (t.text.includes(q)) return 60 + bonus
  // 見積書の言葉のほうが長い場合（「室内抗菌施工費」の中に「抗菌」がある）。
  // 短すぎる言葉（英字2文字 など）は、たまたま含まれることがあるので、当たりにしない。
  const ascii = /^[\x20-\x7e]+$/.test(t.text)
  const minLength = ascii ? 3 : 2
  if (t.text.length >= minLength && q.includes(t.text)) return 40 + Math.min(t.text.length, 15)
  return 0
}

export type ItemMatch = {
  item: ItemDef
  /** 合い方の点数（大きいほど合っている）。 */
  score: number
  /** どの言葉で当たったか（「抗菌施工」など。候補の横に出せる）。 */
  matched: string
}

/**
 * 見積書の言葉から、項目の候補を探す。合う順に返す。
 * 何も打っていないときは、空の配列を返す（そのときは、画面で項目の一覧を区分ごとに出せばよい）。
 */
export function searchItems(query: string, limit = 8): ItemMatch[] {
  const q = normalizeForSearch(query)
  if (q === '') return []
  const found: (ItemMatch & { order: number })[] = []
  index.forEach(({ item, terms }, order) => {
    let best = 0
    let matched = item.name
    for (const t of terms) {
      const s = scoreTerm(q, t)
      if (s > best) {
        best = s
        matched = t.shown
      }
    }
    if (best > 0) found.push({ item, score: best, matched, order })
  })
  // 点数が同じなら、項目の一覧の順（よく出る順に並べてある）。
  found.sort((a, b) => b.score - a.score || a.order - b.order)
  return found.slice(0, limit).map(({ item, score, matched }) => ({ item, score, matched }))
}

/**
 * 見積書に書かれた名前から、いちばん合う項目の ID を返す。合うものがなければ 'other'。
 * 「この名前で足す」ときに、どの項目として点検するかを決めるのに使う。
 */
export function guessItemId(label: string): string {
  const [best] = searchItems(label, 1)
  return best ? best.item.id : OTHER_ITEM_ID
}
