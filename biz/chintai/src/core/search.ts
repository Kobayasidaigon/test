import { items, OTHER_ITEM_ID } from './items'
import { LIMITS } from './storage'
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

/**
 * 探した言葉から項目を選んで足すときに、行の名前（見積書に書かれていた名前）として残す文字を決める。
 *
 * - 打った言葉が、項目の言葉より長い（「室内抗菌施工費」の中に「抗菌」がある）とき、
 *   または、見積書での別の呼び方とぴったり同じで3文字以上（「消毒料」）のとき → 見積書に書かれていた言葉とみなして、そのまま残す。
 *   確認の文面に、不動産会社が見てわかる名前（見積書のとおりの名前）を出すため。
 * - 打った言葉が、項目の言葉の一部（「抗菌」）や、読みがな（「しょうどく」）のとき
 *   → 探すための言葉とみなして、残さない（空の文字を返す。行の名前は、項目の名前になる）。
 */
export function labelForMatch(query: string, match: ItemMatch): string {
  const text = query.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxLabel)
  if (text === '') return ''
  if (normalizeForSearch(text) === normalizeForSearch(match.item.name)) return ''
  // ぴったり同じ（100点以上）で、別の呼び方に当たったとき。読みがなに当たったときは、matched が項目の名前になっている。
  // 2文字の言葉（「抗菌」「除菌」）は、探すために打った言葉であることが多いので、残さない。
  if (match.score >= 100) return match.matched !== match.item.name && normalizeForSearch(text).length >= 3 ? text : ''
  // 60点未満は、「打った言葉の中に、項目の言葉が入っている」当たり方。
  return match.score < 60 ? text : ''
}
