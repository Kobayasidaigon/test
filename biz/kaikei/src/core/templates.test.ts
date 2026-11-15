import { describe, expect, it } from 'vitest'
import { site } from '../site.config'
import { DATA_NOTE, DISCLAIMER, FORMAT_NOTE, GLOSSARY, OUT_OF_SCOPE, SHARE_NOTE, explain } from './notices'
import { isValidDate } from './dates'
import { formatYen } from './money'
import { FACTS, findFact } from './sources'
import { DEFAULT_CUSTODY_LABELS, ORG_KINDS, categoryTemplate, defaultAuditorCount, defaultCustody, defaultRoleNames } from './templates'
import { LIMITS } from './types'

describe('科目のひな形', () => {
  it('町内会・子ども会・PTA・サークルと「そのほか」がある', () => {
    expect(ORG_KINDS.map((k) => k.kind)).toEqual(['chonaikai', 'kodomokai', 'pta', 'circle', 'other'])
    expect(ORG_KINDS.every((k) => k.label !== '' && k.description !== '')).toBe(true)
  })
  it('どの種類にも、収入と支出の科目がある。同じ部に同じ名前がない', () => {
    for (const { kind } of ORG_KINDS) {
      const t = categoryTemplate(kind)
      for (const side of ['income', 'expense'] as const) {
        const names = t.filter((c) => c.side === side).map((c) => c.name)
        expect(names.length, `${kind} ${side}`).toBeGreaterThan(0)
        expect(names.length).toBeLessThanOrEqual(LIMITS.maxCategoriesPerSide)
        expect(new Set(names).size, `${kind} ${side}`).toBe(names.length)
        expect(names.every((n) => n.trim() === n && n.length > 0 && n.length <= LIMITS.nameLength)).toBe(true)
      }
    }
  })
  it('前年度繰越金は、科目に入れない（置き場所の残高から自動で出すので、二重になる）', () => {
    for (const { kind } of ORG_KINDS) {
      expect(categoryTemplate(kind).some((c) => c.name.includes('繰越'))).toBe(false)
    }
  })
  it('返した配列を書きかえても、ひな形は変わらない', () => {
    const t = categoryTemplate('chonaikai')
    t[0].name = '書きかえた'
    t.pop()
    expect(categoryTemplate('chonaikai')[0].name).toBe('会費')
    expect(categoryTemplate('chonaikai').length).toBe(t.length + 1)
  })
  it('役の呼び名と、監査の署名欄の数', () => {
    expect(defaultRoleNames('chonaikai')).toEqual({ president: '会長', treasurer: '会計', auditor: '監事' })
    expect(defaultRoleNames('circle').president).toBe('代表')
    for (const { kind } of ORG_KINDS) {
      expect(defaultAuditorCount(kind)).toBeGreaterThanOrEqual(1)
      expect(defaultAuditorCount(kind)).toBeLessThanOrEqual(LIMITS.maxAuditors)
    }
  })
  it('引き継ぎ書の保管場所の項目', () => {
    let n = 0
    const items = defaultCustody(() => `c${++n}`)
    expect(items.map((i) => i.label)).toEqual([...DEFAULT_CUSTODY_LABELS])
    expect(items.every((i) => i.place === '' && i.handedOver === false)).toBe(true)
    expect(items.some((i) => i.label.includes('通帳'))).toBe(true)
    expect(items.some((i) => i.label.includes('はんこ'))).toBe(true)
  })
})

describe('出典の一覧', () => {
  it('どの事実にも、文書名・役所・URL・確かめた日・確かめ方が付いている', () => {
    expect(FACTS.length).toBeGreaterThan(0)
    for (const f of FACTS) {
      expect(f.claim.length, f.id).toBeGreaterThan(10)
      expect(f.source.title.length, f.id).toBeGreaterThan(3)
      expect(f.source.publisher.length, f.id).toBeGreaterThan(1)
      // 公式の情報だけを出典にする（国の役所のサイト）
      expect(new URL(f.source.url).protocol, f.id).toBe('https:')
      expect(new URL(f.source.url).hostname.endsWith('.go.jp'), f.id).toBe(true)
      // 確かめた日は、実在する日付で書いてあること（日付そのものは、確かめ直すたびに変わるので、決め打ちにしない）
      expect(isValidDate(f.checkedOn), f.id).toBe(true)
      expect(f.checkedOn >= '2026-11-14', f.id).toBe(true)
      expect(['page', 'search-excerpt']).toContain(f.how)
    }
  })
  it('「対象外」の理由に付けた出典は、すべて一覧にある', () => {
    for (const s of OUT_OF_SCOPE) {
      for (const id of s.factIds) expect(findFact(id), `${s.id} → ${id}`).toBeDefined()
    }
  })
  it('id が重ならない。id で引ける', () => {
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length)
    expect(findFact('reiwa-start')?.claim).toContain('2019年')
    expect(findFact('ないもの')).toBeUndefined()
  })
})

describe('決まった文（対象外、ことわり書き、言葉の説明）', () => {
  it('対象外のことが4つ。税の申告、法人と認可地縁団体、収益事業、複式簿記', () => {
    expect(OUT_OF_SCOPE.map((n) => n.id)).toEqual(['tax', 'corporation', 'revenue-business', 'double-entry'])
    expect(OUT_OF_SCOPE.every((n) => n.text.length > 0 && n.detail.length > 0)).toBe(true)
  })
  it('出典の id は、どれも出典の一覧にある', () => {
    for (const note of OUT_OF_SCOPE) {
      for (const id of note.factIds) expect(findFact(id), `${note.id} → ${id}`).toBeDefined()
    }
  })
  it('出典の付いた「対象外」の文は、原文にない言い方を使わない（2026-11-15 に原文と照らして外した言い方）', () => {
    // 地方自治法は、認可地縁団体について「権利を有し、義務を負う」と書いていて、「法人格」という言葉は使っていない。
    // 収益事業の出典に書いてあるのは、法人税がかかること（通達の文は「法人税が課される」）で、申告のことではない
    for (const note of OUT_OF_SCOPE.filter((n) => n.factIds.length > 0)) {
      const text = `${note.text}\n${note.detail}`
      expect(text, note.id).not.toContain('法人格')
      expect(text, note.id).not.toContain('申告がいる')
    }
  })
  it('言ってはいけない言葉を使っていない（監査対応、不正を防ぐ、正しい様式）', () => {
    const all = [FORMAT_NOTE, DISCLAIMER, DATA_NOTE, SHARE_NOTE, ...OUT_OF_SCOPE.flatMap((n) => [n.text, n.detail]), ...GLOSSARY.map((g) => g.meaning)].join('\n')
    for (const word of ['監査対応', '不正を防', '不正防止', '正しい様式', '保証します']) expect(all).not.toContain(word)
    expect(FORMAT_NOTE).toContain('団体の規約と、前の年の資料の形に合わせてください')
    expect(DISCLAIMER).toContain('保証するものではありません')
  })
  it('言葉の説明を引ける', () => {
    expect(explain('摘要')).toContain('何のお金か')
    expect(explain('科目').length).toBeGreaterThan(0)
    expect(explain('ない言葉')).toBe('')
    expect(new Set(GLOSSARY.map((g) => g.term)).size).toBe(GLOSSARY.length)
  })
})

// 料金の設定のテストは、「金額がいくらか」を決め打ちで確かめない。
// 運営者が README のとおりに金額や日数を変えたり、公開前の空の項目（決済ページ、公開鍵、運営者の情報）を
// 埋めたりしても、npm test が落ちないようにするため（落ちると、README の公開のコマンドがビルドまで進まない）。
// ここで確かめるのは、「数字の設定」と「文の中の数字」が、食いちがっていないこと。
describe('料金の設定（src/site.config.ts）', () => {
  const { pro, free, summary } = site.pricing
  it('金額と日数は、ありうる値（1円以上の整数、1日以上の整数）。無料は 0円', () => {
    expect(Number.isInteger(pro.price) && pro.price > 0).toBe(true)
    expect(Number.isInteger(pro.licenseDays) && pro.licenseDays > 0).toBe(true)
    expect(Number.isInteger(pro.deliveryDays) && pro.deliveryDays > 0).toBe(true)
    expect(free.price).toBe(0)
    expect(free.priceText).toBe('0円')
  })
  it('文の中の金額が、数字の設定と合っている', () => {
    expect(pro.priceText).toBe(`${formatYen(pro.price)}円`)
    expect(summary).toContain(`${pro.unit} ${pro.priceText}`)
    expect(site.sales.price).toContain(pro.priceText)
    // 税込かどうかが、設定と、特定商取引法の表記の文とで、同じ
    expect(site.sales.price.includes('税込')).toBe(pro.taxIncluded)
  })
  it('文の中の日数（キーが届くまで、キーが使える期間）が、数字の設定と合っている', () => {
    expect(site.sales.delivery).toContain(`${pro.deliveryDays}日以内`)
    expect(site.sales.delivery).toContain(`${pro.licenseDays}日`)
  })
  it('返品・キャンセルの文に、送る前のキャンセルと、キーが届かない・使えないときのことが書いてある', () => {
    expect(site.sales.refund.length).toBeGreaterThan(0)
    expect(site.sales.cancel).toContain('キャンセル')
    expect(site.sales.cancel).toContain('届かない')
    expect(site.sales.cancel).toContain('使えない')
  })
  it('slug は、保存したデータとライセンスキーに使うので、変えない', () => {
    expect(site.slug).toBe('kaikei')
  })
})
