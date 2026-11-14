// 広告の枠（アフィリエイト）。このサイトの収入は、ここの広告だけ。
//
// 決めごと:
// - url が空の枠は、表示しない（visibleOffers が返さない）。いまは全部空。提携できたら、運営者が url と文を入れる。
// - 表示するときは、必ず「広告」と書く（core/texts.ts の AD_LABEL。根拠は core/consult.ts の adDisclosure）。
// - 見本の文や、うその実績は書かない。title と description も、提携先が決まってから、事実だけを書く。
// - 実行時に外部のタグやスクリプトは読み込まない。広告は、ふつうのリンク（<a rel="sponsored nofollow noopener">）だけ。
// - 点検の結果（core/）は、この広告の枠を見ない。広告があってもなくても、結果は変わらない。

export type OfferPlacement =
  | 'result' // 点検の結果の画面（結果を読み終えたあとの場所）
  | 'item' // 項目ごとの解説ページ
  | 'about' // このサイトについて

export type Offer = {
  id: string
  /** 何の広告か（運営者のための名前。画面には出さない）。 */
  kind: string
  /** 広告の見出し。提携先が決まってから書く。 */
  title: string
  /** 広告の説明。事実だけを書く。 */
  description: string
  /** 広告のリンク先（アフィリエイトのリンク）。空なら、表示しない。 */
  url: string
  /** どこに出すか。 */
  placements: OfferPlacement[]
  /** 関係のある項目（core/items.ts の id）。解説ページでは、関係のある枠だけを出す。空なら、どのページにも出せる。 */
  itemIds: string[]
}

export const offers: Offer[] = [
  { id: 'hikkoshi', kind: '引越しの見積もり', title: '', description: '', url: '', placements: ['result'], itemIds: [] },
  { id: 'net', kind: 'インターネット回線', title: '', description: '', url: '', placements: ['result', 'item'], itemIds: ['internet'] },
  { id: 'hoken', kind: '火災保険', title: '', description: '', url: '', placements: ['result', 'item'], itemIds: ['kasaihoken'] },
]

/** 表示してよい枠か。リンク先が https の URL で、見出しが入っているものだけ。 */
export function isOfferVisible(offer: Offer): boolean {
  return /^https:\/\/[^\s]+$/.test(offer.url.trim()) && offer.title.trim() !== ''
}

/**
 * 表示する広告の枠を返す。url が空の枠は返さない。
 * placement を渡すと、その場所の枠だけ。itemId を渡すと、その項目に関係のある枠（と、項目を決めていない枠）だけ。
 */
export function visibleOffers(placement?: OfferPlacement, itemId?: string, list: Offer[] = offers): Offer[] {
  return list.filter(
    (o) =>
      isOfferVisible(o) &&
      (placement === undefined || o.placements.includes(placement)) &&
      (itemId === undefined || o.itemIds.length === 0 || o.itemIds.includes(itemId)),
  )
}
