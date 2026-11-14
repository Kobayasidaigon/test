import { describe, expect, it } from 'vitest'
import { categories, categoryOrder, getCategory } from './categories'
import { adDisclosure, consultDesks } from './consult'
import {
  findGuideItem,
  getItem,
  isPresetItemId,
  items,
  listGuideItems,
  listItemsByCategory,
  listItemSources,
  NO_RULE_TEXT,
  otherItem,
  OTHER_ITEM_ID,
  resolveBasis,
} from './items'
import { normalizeForSearch } from './search'
import { getSource, listSources, RULES_VERIFIED_ON, sources, type SourceId } from './sources'
import { ASK_TOTAL_NOTE, DISCLAIMER, MESSAGE_NOTE, NOT_DOING } from './texts'
import type { BasisNote, CategoryId, ItemDef } from './types'
import { BANNED_PHRASES, findBannedPhrase, LEGAL_WORDS } from './wording'

// 項目のデータ（ルール）が、「絶対に守ること」に合っているかを確かめる。
// この道具は、まちがえると人に損をさせるので、データのまちがいをテストで止める。

const all: ItemDef[] = [...items, otherItem]

/** 項目が持つ、画面に出る文のすべて。 */
function textsOf(item: ItemDef): string[] {
  return [
    item.name,
    item.summary,
    item.why,
    ...item.checks,
    ...item.basis.map((b) => b.text),
    ...item.related.map((b) => b.text),
    ...item.limits,
    item.caveat,
    item.howToAsk,
    item.ask.mail,
    item.ask.line,
    item.amountHint ?? '',
    ...(item.overlapsWith ?? []).map((o) => o.text),
    ...(item.guide
      ? [item.guide.title, item.guide.description, item.guide.lead, ...item.guide.what, ...item.guide.points.flatMap((p) => [p.title, p.body])]
      : []),
  ]
}

const BANNED = BANNED_PHRASES

describe('区分', () => {
  it('仕様書の7つの区分と、一覧にない項目のための区分がある', () => {
    const ids: CategoryId[] = ['usual', 'capped', 'optional', 'choosable', 'who-pays', 'overlap', 'contract', 'other']
    expect(categories.map((c) => c.id).sort()).toEqual([...ids].sort())
    expect(categoryOrder).toHaveLength(8)
  })
  it('色だけで見分けなくて済むように、どの区分にも、重ならない言葉と印がある', () => {
    for (const c of categories) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.mark).toHaveLength(1)
      expect(c.description.length).toBeGreaterThan(20)
    }
    expect(new Set(categories.map((c) => c.label)).size).toBe(categories.length)
    expect(new Set(categories.map((c) => c.mark)).size).toBe(categories.length)
  })
  it('仕様書の7つの区分は、どれも使われている', () => {
    const used = new Set(items.map((i) => i.category))
    for (const id of ['usual', 'capped', 'optional', 'choosable', 'who-pays', 'overlap', 'contract'] as const) expect(used.has(id)).toBe(true)
    expect(items.some((i) => i.category === 'other')).toBe(false)
    expect(otherItem.category).toBe('other')
  })
  it('getCategory', () => {
    expect(getCategory('capped').label).toBe('上限の決まりがある')
    for (const item of all) expect(getCategory(item.category).id).toBe(item.category)
  })
  it('区分の説明にも、言ってはいけない言い方がない', () => {
    for (const c of categories) for (const re of BANNED) expect(`${c.label}${c.short}${c.description}`).not.toMatch(re)
  })
})

describe('項目の一覧', () => {
  it('25個ほどある。ID と名前は重ならない', () => {
    expect(items.length).toBeGreaterThanOrEqual(24)
    expect(items.length).toBeLessThanOrEqual(30)
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length)
    expect(new Set(all.map((i) => i.name)).size).toBe(all.length)
    for (const item of all) expect(item.id).toMatch(/^[a-z][a-z0-9]*$/)
  })
  it('仕様書に書かれた項目が、すべてある', () => {
    const names = items.map((i) => i.name)
    for (const word of [
      '敷金',
      '礼金',
      '前家賃',
      '日割り家賃',
      '管理費・共益費',
      '仲介手数料',
      '保証会社の初回保証料',
      '火災保険料',
      '鍵の交換費用',
      '室内の消毒・抗菌',
      '害虫駆除',
      '24時間サポート',
      '簡易消火器',
      '書類作成費・事務手数料',
      '退去時クリーニング費用の前払い',
      '町内会費',
      '口座振替の手数料',
      '駐車場・駐輪場の初月分',
      '更新料',
      '短期解約の違約金',
      'フリーレント',
    ]) {
      expect(names.some((n) => n.includes(word)), word).toBe(true)
    }
  })
  it('仕様書の区分どおりに入っている', () => {
    const cat = (id: string) => getItem(id).category
    for (const id of ['shikikin', 'reikin', 'maeyachin', 'hiwari', 'kanrihi', 'hoshoryo']) expect(cat(id)).toBe('usual')
    expect(cat('chukai')).toBe('capped')
    for (const id of ['shodoku', 'gaichu', 'support24', 'shokaki']) expect(cat(id)).toBe('optional')
    expect(cat('kasaihoken')).toBe('choosable')
    expect(cat('kagi')).toBe('who-pays')
    expect(cat('cleaning')).toBe('overlap')
    for (const id of ['koshin', 'tanki', 'freerent']) expect(cat(id)).toBe('contract')
  })
  it('どの項目にも、説明、確かめること、添えること、聞き方、文面の部品がある', () => {
    for (const item of all) {
      expect(item.summary.length, item.id).toBeGreaterThan(5)
      expect(item.why.length, item.id).toBeGreaterThan(5)
      expect(item.checks.length, item.id).toBeGreaterThanOrEqual(2)
      expect(item.caveat.length, item.id).toBeGreaterThan(5)
      expect(item.howToAsk.length, item.id).toBeGreaterThan(5)
      expect(item.ask.mail.length, item.id).toBeGreaterThan(10)
      expect(item.ask.line.length, item.id).toBeGreaterThan(5)
    }
  })
  it('初期費用でない項目は合計に入れず、引かれている金額は合計から引く', () => {
    for (const id of ['koshin', 'tanki', 'shikibiki']) expect(getItem(id).totalRole).toBe('exclude')
    for (const id of ['freerent', 'nebiki']) expect(getItem(id).totalRole).toBe('subtract')
    for (const item of items) {
      if (item.totalRole !== 'add') expect(item.amountHint, item.id).toBeTruthy() // 入れ方の説明がある
    }
  })
  it('getItem は、知らない ID を「その他」として扱う（落ちない）', () => {
    expect(getItem('shikikin').name).toBe('敷金')
    expect(getItem('zzz')).toBe(otherItem)
    expect(getItem('')).toBe(otherItem)
    expect(getItem('__proto__')).toBe(otherItem)
    expect(getItem(OTHER_ITEM_ID)).toBe(otherItem)
    expect(isPresetItemId('shikikin')).toBe(true)
    expect(isPresetItemId('other')).toBe(false)
    expect(isPresetItemId('zzz')).toBe(false)
  })
  it('別の呼び方が、2つの項目で重なっていない（探したときに、どちらか決まらなくなる）', () => {
    const seen = new Map<string, string>()
    for (const item of items) {
      for (const word of [item.name, ...item.aliases]) {
        const key = normalizeForSearch(word)
        expect(seen.get(key), `「${word}」が ${seen.get(key)} と ${item.id} にある`).toBeUndefined()
        seen.set(key, item.id)
      }
    }
  })
  it('区分ごとにまとめた一覧は、すべての項目を1回ずつ含み、区分の決まった順に並ぶ', () => {
    const groups = listItemsByCategory()
    expect(groups.flatMap((g) => g.items.map((i) => i.id)).sort()).toEqual(items.map((i) => i.id).sort())
    expect(groups.map((g) => g.category.id)).toEqual(['usual', 'capped', 'optional', 'choosable', 'who-pays', 'overlap', 'contract'])
    for (const g of groups) for (const i of g.items) expect(i.category).toBe(g.category.id)
  })
  it('重なりを確かめる相手の項目は、実在する', () => {
    for (const item of items) for (const o of item.overlapsWith ?? []) expect(isPresetItemId(o.itemId), `${item.id} → ${o.itemId}`).toBe(true)
  })
})

describe('根拠と出典', () => {
  const notesOf = (item: ItemDef): BasisNote[] => [...item.basis, ...item.related]

  it('確かめた事実がある項目は basis があり、決まりが見つからなかった項目は basis が空', () => {
    for (const item of all) {
      if (item.basisStatus === 'verified') expect(item.basis.length, item.id).toBeGreaterThan(0)
      else expect(item.basis, item.id).toEqual([])
    }
  })
  it('事実を書いた文には、必ず出典がある。出典は、一覧にあるものだけ', () => {
    for (const item of all) {
      for (const note of notesOf(item)) {
        expect(note.sourceIds.length, `${item.id}: ${note.text}`).toBeGreaterThan(0)
        for (const id of note.sourceIds) expect(sources[id as SourceId], `${item.id}: ${id}`).toBeDefined()
      }
    }
    expect(adDisclosure.sourceIds.length).toBeGreaterThan(0)
    for (const d of consultDesks) expect(getSource(d.sourceId)).toBeDefined()
  })
  it('resolveBasis と listItemSources は、出典の中身を返す', () => {
    const kagi = getItem('kagi')
    const resolved = resolveBasis(kagi.basis)
    expect(resolved).toHaveLength(kagi.basis.length)
    expect(resolved[0].sources[0].title).toContain('原状回復をめぐるトラブルとガイドライン')
    const list = listItemSources(kagi)
    expect(list.map((x) => x.id)).toEqual(['genjo-guideline', 'tokyo-guideline', 'mlit-ryuiten']) // 重なりなし
    expect(listItemSources(getItem('maeyachin'))).toEqual([])
  })
  it('「必須か任意か、確かめる」の項目は、決まりが見つからなかったという中立の扱いになっている', () => {
    const optional = items.filter((i) => i.category === 'optional')
    expect(optional.length).toBeGreaterThanOrEqual(4)
    for (const item of optional) {
      expect(item.basisStatus, item.id).toBe('none-found')
      expect(item.why, item.id).toBe(NO_RULE_TEXT)
      expect(item.askRemovable, item.id).toBe(true)
    }
    expect(NO_RULE_TEXT).toContain('見つかりませんでした')
    expect(NO_RULE_TEXT).toContain('聞いてみましょう')
  })
  it('仲介手数料の根拠に、上限の数字（1.1倍、0.55倍）と、承諾の例外が書かれている', () => {
    const text = getItem('chukai').basis.map((b) => b.text).join('')
    expect(text).toContain('1.1倍')
    expect(text).toContain('0.55倍')
    expect(text).toContain('承諾')
    // 管理費を含めるかどうかは確かめられなかったので、正直に書いてある。
    expect(getItem('chukai').limits.join('')).toContain('確かめられませんでした')
  })
  it('鍵の交換費用には、ガイドラインの原文と、法律ではないことが書かれている', () => {
    const text = getItem('kagi').basis.map((b) => b.text).join('')
    expect(text).toContain('入居者の入れ替わりによる物件管理上の問題であり、賃貸人の負担とすることが妥当と考えられる')
    expect(text).toContain('法的な拘束力を持つものではありません')
    expect(getItem('kagi').caveat).toContain('法律ではありません')
  })
  it('出典は、公式のサイトの https の URL で、確かめた日が入っている', () => {
    const official = /(\.go\.jp|\.lg\.jp|^www\.houterasu\.or\.jp)$/
    for (const s of listSources()) {
      const url = new URL(s.url)
      expect(url.protocol, s.id).toBe('https:')
      expect(url.hostname, s.id).toMatch(official)
      expect(s.title.length, s.id).toBeGreaterThan(3)
      expect(s.publisher.length, s.id).toBeGreaterThan(1)
      expect(s.verifiedOn, s.id).toBe('2026-11-14')
      expect(s.verifiedBy, s.id).toBe('official-site-search')
    }
    expect(RULES_VERIFIED_ON).toBe('2026-11-14')
  })
  it('出典の ID は、キーと同じ。URL は重ならない', () => {
    for (const [key, s] of Object.entries(sources)) expect(s.id).toBe(key)
    const urls = listSources().map((s) => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
  it('使われていない出典がない（一覧に出すのは、実際に根拠にしている資料だけ）', () => {
    const used = new Set<string>()
    for (const item of all) for (const note of notesOf(item)) note.sourceIds.forEach((id) => used.add(id))
    adDisclosure.sourceIds.forEach((id) => used.add(id))
    consultDesks.forEach((d) => used.add(d.sourceId))
    for (const s of listSources()) expect(used.has(s.id), s.id).toBe(true)
  })
})

describe('言い方（断定しない、相場で判定しない）', () => {
  it('項目の文に、言ってはいけない言い方がない', () => {
    for (const item of all) {
      for (const text of textsOf(item)) for (const re of BANNED) expect(text, `${item.id}: ${re}`).not.toMatch(re)
    }
  })
  it('共通の文にも、言ってはいけない言い方がない', () => {
    const texts = [DISCLAIMER, ASK_TOTAL_NOTE, MESSAGE_NOTE, ...NOT_DOING.map((n) => n.body)]
    for (const text of texts) for (const re of BANNED) expect(text).not.toMatch(re)
  })
  it('「この道具がしないこと」の見出しは、仕様書の4つで、どれも「〜ません」で終わる', () => {
    // 見出しは「必ず下がる、とは言いません」のように、言わないことを言う文なので、上の検査からは外している。
    expect(NOT_DOING).toHaveLength(4)
    for (const n of NOT_DOING) expect(n.title).toMatch(/ません$/)
    const titles = NOT_DOING.map((n) => n.title).join(' ')
    for (const word of ['相場', '必ず下がる', '法律相談', '交渉の代行']) expect(titles).toContain(word)
  })
  it('findBannedPhrase は、言ってはいけない言い方を見つける。質問の形は通す', () => {
    expect(findBannedPhrase('この費用は外せます。')).toBe('外せます')
    expect(findBannedPhrase('任意でしたら、外せますか。')).toBeNull()
    expect(findBannedPhrase('これは、ぼったくりです')).toBe('ぼったくり')
    expect(findBannedPhrase('払わなくてよいお金です')).toBe('払わなくてよい')
    expect(findBannedPhrase('必須かどうかを、聞いてみましょう。')).toBeNull()
  })
  it('「もし全部外せた場合の差」には、外せるとは限らないことが添えてある', () => {
    expect(ASK_TOTAL_NOTE).toContain('外せるとは限りません')
    expect(ASK_TOTAL_NOTE).toContain('自分で決めましょう')
    expect(DISCLAIMER).toContain('法律の助言ではありません')
    expect(DISCLAIMER).toContain('保証するものでもありません')
  })
  it('確認の文面の部品は、たずねる形で終わり、法律や決まりの名前を出さない', () => {
    const legal = LEGAL_WORDS
    for (const item of all) {
      expect(item.ask.mail, item.id).toMatch(/(でしょうか。|幸いです。)$/)
      expect(item.ask.line, item.id).toMatch(/(か。|ください。)$/)
      expect(item.ask.mail, item.id).not.toMatch(legal)
      expect(item.ask.line, item.id).not.toMatch(legal)
      // 「聞き方」は、「〜と聞いてみましょう」の形。
      expect(item.howToAsk, item.id).toMatch(/聞いてみ(ましょう|る方法があります)。$/)
    }
  })
  it('確かめる項目には、外せないこともある、という趣旨が添えてある', () => {
    for (const item of items.filter((i) => i.category === 'optional')) expect(item.caveat, item.id).toContain('外せないこともあります')
    expect(otherItem.caveat).toContain('外せないこともあります')
  })
})

describe('解説ページのデータ', () => {
  const guides = listGuideItems()

  it('8〜12ページある', () => {
    expect(guides.length).toBeGreaterThanOrEqual(8)
    expect(guides.length).toBeLessThanOrEqual(12)
  })
  it('仕様書に例として書かれた10の項目に、ページがある', () => {
    for (const id of ['shodoku', 'support24', 'chukai', 'kagi', 'kasaihoken', 'shokaki', 'gaichu', 'hoshoryo', 'cleaning', 'shorui']) {
      expect(getItem(id).guide, id).toBeDefined()
    }
  })
  it('slug は英小文字とハイフンで、重ならない', () => {
    const slugs = guides.map((g) => g.guide.slug)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('findGuideItem', () => {
    expect(findGuideItem('chukai-tesuryo')?.id).toBe('chukai')
    expect(findGuideItem('kagi-kokan')?.id).toBe('kagi')
    expect(findGuideItem('nai')).toBeNull()
  })
  it('ページごとに中身が違う（見出し、説明、冒頭、本文の使い回しがない）', () => {
    const uniq = (values: string[]) => expect(new Set(values).size).toBe(values.length)
    uniq(guides.map((g) => g.guide.title))
    uniq(guides.map((g) => g.guide.description))
    uniq(guides.map((g) => g.guide.lead))
    uniq(guides.flatMap((g) => g.guide.what))
    // 「確かめること」の本文は、同じ聞き方を使う項目（必須か任意か）で似るが、まったく同じ文は使わない。
    uniq(guides.flatMap((g) => g.guide.points.map((p) => p.body)))
  })
  it('どのページにも、何のお金か、確かめること（3つ以上）がある', () => {
    for (const g of guides) {
      expect(g.guide.what.length, g.id).toBeGreaterThanOrEqual(1)
      expect(g.guide.points.length, g.id).toBeGreaterThanOrEqual(3)
      expect(g.guide.description.length, g.id).toBeGreaterThan(40)
      expect(g.guide.description.length, g.id).toBeLessThan(140)
      expect(g.guide.title, g.id).toContain(g.name.split('・')[0].slice(0, 2))
    }
  })
  it('決まりが見つからなかった項目のページは、冒頭でそう言っている（根拠のない話で水増ししない）', () => {
    for (const g of guides.filter((x) => x.basisStatus === 'none-found')) {
      expect(g.guide.lead, g.id).toContain('見つかりませんでした')
    }
  })
})
