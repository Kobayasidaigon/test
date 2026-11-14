import { describe, expect, it } from 'vitest'
import { isPresetItemId } from './core/items'
import { isOfferVisible, offers, visibleOffers, type Offer } from './offers'
import { site } from './site.config'

const filled: Offer = {
  id: 'test',
  kind: 'テスト',
  title: '見出し',
  description: '説明',
  url: 'https://example.com/a?b=1',
  placements: ['result'],
  itemIds: [],
}

describe('広告の枠', () => {
  it('いまは、url が全部空なので、1つも表示しない', () => {
    for (const offer of offers) expect(offer.url, offer.id).toBe('')
    expect(visibleOffers()).toEqual([])
    expect(visibleOffers('result')).toEqual([])
    expect(visibleOffers('item', 'kasaihoken')).toEqual([])
  })
  it('見本の文が入っていない（提携先が決まるまで、見出しと説明は空）', () => {
    for (const offer of offers) {
      expect(offer.title, offer.id).toBe('')
      expect(offer.description, offer.id).toBe('')
    }
  })
  it('枠の ID は重ならない。関係のある項目は、実在する', () => {
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length)
    for (const offer of offers) for (const id of offer.itemIds) expect(isPresetItemId(id), `${offer.id} → ${id}`).toBe(true)
  })
  it('url が空、https でない、見出しが空の枠は、表示しない', () => {
    expect(isOfferVisible(filled)).toBe(true)
    expect(isOfferVisible({ ...filled, url: '' })).toBe(false)
    expect(isOfferVisible({ ...filled, url: '   ' })).toBe(false)
    expect(isOfferVisible({ ...filled, url: 'http://example.com/' })).toBe(false)
    expect(isOfferVisible({ ...filled, url: 'javascript:alert(1)' })).toBe(false)
    expect(isOfferVisible({ ...filled, url: 'https://example.com/a b' })).toBe(false)
    expect(isOfferVisible({ ...filled, title: ' ' })).toBe(false)
  })
  it('場所と項目で、出す枠をしぼる', () => {
    const list: Offer[] = [
      filled,
      { ...filled, id: 'hoken', placements: ['result', 'item'], itemIds: ['kasaihoken'] },
      { ...filled, id: 'empty', url: '' },
    ]
    expect(visibleOffers(undefined, undefined, list).map((o) => o.id)).toEqual(['test', 'hoken'])
    expect(visibleOffers('item', undefined, list).map((o) => o.id)).toEqual(['hoken'])
    expect(visibleOffers('result', 'kasaihoken', list).map((o) => o.id)).toEqual(['test', 'hoken'])
    expect(visibleOffers('result', 'kagi', list).map((o) => o.id)).toEqual(['test'])
    expect(visibleOffers('about', undefined, list)).toEqual([])
  })
})

describe('サイトの設定（料金と売り方）', () => {
  it('道具は無料で、登録がいらず、入力を送らず、収入は広告', () => {
    expect(site.slug).toBe('chintai')
    expect(site.pricing.toolPriceYen).toBe(0)
    expect(site.pricing.signupRequired).toBe(false)
    expect(site.pricing.sendsInputToServer).toBe(false)
    expect(site.pricing.revenue).toBe('ads')
    expect(site.pricing.priceLabel).toBe('無料')
    expect(site.pricing.revenueNote).toContain('「広告」と表示します')
  })
  it('有料版・ライセンスキー・決済の設定を持たない', () => {
    for (const key of ['checkoutUrl', 'licensePublicKey', 'sales']) expect(key in site, key).toBe(false)
  })
})
