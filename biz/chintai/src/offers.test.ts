import { describe, expect, it } from 'vitest'
import { isPresetItemId, listGuideItems } from './core/items'
import { findBannedPhrase } from './core/wording'
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

/** 広告の見出しと説明に、書かない言い方（根拠を確かめられない、いちばん・最安などの言い方）。 */
const UNPROVEN = /No\.?\s*[1１]|ナンバーワン|ナンバー1|最安|日本一|業界一|業界最|満足度|人気\s*[1１]位|絶対|必ず/i

/** すべての枠に、リンクと見出しを入れた形（提携できたあとの形）。 */
const allFilled: Offer[] = offers.map((o) => ({ ...o, url: `https://example.com/${o.id}`, title: `${o.kind}の案内`, description: '説明' }))

describe('広告の枠', () => {
  // 「いまは全部空であること」は、確かめない。運営者が README の「広告を入れる」のとおりに、url・title・description を
  // 入れると、それだけでテストが落ちてしまうため。確かめるのは、形と決まりだけ。
  it('url が空の枠は、表示しない', () => {
    for (const offer of offers) {
      if (offer.url.trim() === '') expect(isOfferVisible(offer), offer.id).toBe(false)
    }
    const empty = offers.map((o) => ({ ...o, url: '' }))
    expect(visibleOffers(undefined, undefined, empty)).toEqual([])
    expect(visibleOffers('result', undefined, empty)).toEqual([])
    expect(visibleOffers('item', 'kasaihoken', empty)).toEqual([])
  })
  it('url を入れた枠は、https のリンクと見出しがあって、表示できる（入れたのに出ない枠がない）', () => {
    for (const offer of offers.filter((o) => o.url.trim() !== '')) {
      expect(offer.url.trim(), `${offer.id}: url は https:// で始まるリンクにしてください`).toMatch(/^https:\/\/[^\s]+$/)
      expect(offer.title.trim(), `${offer.id}: title（広告の見出し）を入れてください。空だと、表示されません`).not.toBe('')
      expect(isOfferVisible(offer), offer.id).toBe(true)
    }
  })
  it('広告の見出しと説明に、根拠を確かめられない言い方（No.1、最安 など）と、この道具が言わないと決めた言い方がない', () => {
    for (const offer of offers) {
      const text = `${offer.title}\n${offer.description}`
      expect(text, `${offer.id}: 事実だけを書いてください（「No.1」「最安」などは、書かない）`).not.toMatch(UNPROVEN)
      expect(findBannedPhrase(text), `${offer.id}: 言わないと決めている言い方が入っています`).toBeNull()
    }
    // この検査が、ちゃんと見つけること。
    expect('満足度 No.1 の引越し見積もり').toMatch(UNPROVEN)
    expect('業界最安の回線').toMatch(UNPROVEN)
    expect('引越しの見積もりを、まとめて頼めるサービス').not.toMatch(UNPROVEN)
  })
  it('すべての枠にリンクを入れると、点検の結果の画面と、どの解説ページにも、広告の枠が出る', () => {
    expect(visibleOffers('result', undefined, allFilled).length).toBeGreaterThanOrEqual(1)
    // 検索から来た人が最初に開くのは、解説ページ。広告の出ない解説ページがあると、収入の道がほとんどなくなる。
    for (const item of listGuideItems()) {
      expect(visibleOffers('item', item.id, allFilled).length, `/items/${item.guide.slug}`).toBeGreaterThanOrEqual(1)
    }
    // 火災保険の枠は、火災保険料の解説ページに出る。
    expect(visibleOffers('item', 'kasaihoken', allFilled).map((o) => o.id)).toContain('hoken')
  })
  it('解説ページに出す枠（item）で、項目を決めてある枠は、その項目に解説ページがある（どこにも出ない設定がない）', () => {
    const guideIds = new Set(listGuideItems().map((i) => i.id))
    for (const offer of offers.filter((o) => o.placements.includes('item'))) {
      for (const id of offer.itemIds) expect(guideIds.has(id), `${offer.id} → ${id} には、解説ページがありません`).toBe(true)
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
