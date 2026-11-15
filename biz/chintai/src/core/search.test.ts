import { describe, expect, it } from 'vitest'
import { items } from './items'
import { guessItemId, labelForMatch, normalizeForSearch, searchItems } from './search'

const top = (query: string) => searchItems(query)[0]?.item.id ?? null

describe('normalizeForSearch', () => {
  it('全角と半角、大文字と小文字、カタカナとひらがなの違いをなくす', () => {
    expect(normalizeForSearch('ＣＡＴＶ')).toBe('catv')
    expect(normalizeForSearch('ｶｷﾞ交換')).toBe('かぎ交換')
    expect(normalizeForSearch('カギ')).toBe(normalizeForSearch('かぎ'))
    expect(normalizeForSearch('２４ｈ')).toBe('24h')
  })
  it('空白と記号を取る。長音（ー）は残す', () => {
    expect(normalizeForSearch(' 管理費・共益費 ')).toBe('管理費共益費')
    expect(normalizeForSearch('鍵交換代（税込）')).toBe('鍵交換代税込')
    expect(normalizeForSearch('サポート')).toBe('さぽーと')
    expect(normalizeForSearch('Wi-Fi')).toBe('wifi')
  })
})

describe('searchItems', () => {
  it('仕様書の例: 「抗菌」と打つと「室内の消毒・抗菌」が出る', () => {
    const [first] = searchItems('抗菌')
    expect(first.item.name).toBe('室内の消毒・抗菌')
  })
  it('何も打っていないときは、空の配列', () => {
    expect(searchItems('')).toEqual([])
    expect(searchItems('   ')).toEqual([])
    expect(searchItems('・・')).toEqual([])
  })
  it('合うものがなければ、空の配列', () => {
    expect(searchItems('ねこ')).toEqual([])
    expect(searchItems('xyz')).toEqual([])
  })
  it('見積書でのさまざまな書かれ方から探せる', () => {
    const cases: [string, string][] = [
      ['室内抗菌施工費', 'shodoku'],
      ['室内除菌・消臭', 'shodoku'],
      ['消毒料', 'shodoku'],
      ['24h', 'support24'],
      ['２４時間サポート', 'support24'],
      ['安心入居サポート', 'support24'],
      ['カギ交換', 'kagi'],
      ['ｶｷﾞ', 'kagi'],
      ['鍵交換代(税込)', 'kagi'],
      ['シリンダー交換', 'kagi'],
      ['仲介手数料（税込）', 'chukai'],
      ['媒介報酬', 'chukai'],
      ['初回保証委託料', 'hoshoryo'],
      ['家財保険', 'kasaihoken'],
      ['少額短期保険料', 'kasaihoken'],
      ['ハウスクリーニング代', 'cleaning'],
      ['退去時清掃費', 'cleaning'],
      ['消火剤', 'shokaki'],
      ['契約事務手数料', 'shorui'],
      ['害虫駆除費', 'gaichu'],
      ['日割賃料', 'hiwari'],
      ['共益費', 'kanrihi'],
      ['自治会費', 'chonaikai'],
      ['CATV', 'internet'],
      ['更新料', 'koshin'],
      ['短期解約違約金', 'tanki'],
      ['フリーレント', 'freerent'],
      ['敷引', 'shikibiki'],
      ['礼金', 'reikin'],
      ['敷金', 'shikikin'],
    ]
    for (const [query, id] of cases) expect(top(query), query).toBe(id)
  })
  it('「日割」「当月」の入った言葉は、前家賃ではなく、日割り家賃がいちばん上に出る', () => {
    // 「家賃」「賃料」は、ほかの項目の言葉の一部にもなる言葉なので、それだけでは決め手にしない。
    for (const query of ['家賃（日割）', '賃料（日割）', '家賃（日割り）', '日割分賃料', '日割分家賃', '日割り分家賃', '家賃日割分', '3月分賃料（日割）', '当月分賃料', '当月賃料', '当月分家賃（日割）']) {
      expect(top(query), query).toBe('hiwari')
    }
    // 管理費・共益費の日割りも、日割りとして点検する（日割りの目安と比べられる）。
    for (const query of ['管理費（日割）', '共益費（日割）', '日割管理費', '日割共益費', '日割管理費等']) expect(top(query), query).toBe('hiwari')
    // 「日割」「当月」のない言葉は、これまでどおり。
    for (const query of ['4月分賃料', '4月分家賃', '翌月賃料', '前賃料', '賃料等', '家賃', '賃料']) expect(top(query), query).toBe('maeyachin')
    for (const query of ['管理費等', '共益費', '管理費']) expect(top(query), query).toBe('kanrihi')
    expect(top('家賃保証')).toBe('hoshoryo')
  })
  it('見積書にありそうな言い方で、候補が1つも出ないことがない', () => {
    const cases: [string, string][] = [
      ['消毒代', 'shodoku'],
      ['入居時消毒', 'shodoku'],
      ['鍵代', 'kagi'],
      ['カギ代', 'kagi'],
      ['鍵設定費', 'kagi'],
      ['緊急駆け付け', 'support24'],
      ['24時間駆けつけ', 'support24'],
      ['安心入居サービス', 'support24'],
    ]
    for (const [query, id] of cases) expect(top(query), query).toBe(id)
  })
  it('ひらがなの読みでも探せる', () => {
    expect(top('しょうかき')).toBe('shokaki')
    expect(top('あんしん')).toBe('support24')
    expect(top('かぎ')).toBe('kagi')
    expect(top('ちゅうかい')).toBe('chukai')
    expect(top('くりーにんぐ')).toBe('cleaning')
  })
  it('どの項目も、自分の名前と、別の呼び方のすべてで、いちばん上に出る', () => {
    for (const item of items) {
      for (const word of [item.name, ...item.aliases]) expect(top(word), `${item.id}:「${word}」`).toBe(item.id)
    }
  })
  it('合う順に並び、件数の上限を守る', () => {
    const found = searchItems('保証', 3)
    expect(found.length).toBeLessThanOrEqual(3)
    expect(found[0].item.id).toBe('hoshoryo')
    for (let i = 1; i < found.length; i++) expect(found[i - 1].score).toBeGreaterThanOrEqual(found[i].score)
    expect(searchItems('費').length).toBeLessThanOrEqual(8)
    expect(searchItems('費', 2)).toHaveLength(2)
  })
  it('どの言葉で当たったかを返す', () => {
    expect(searchItems('抗菌施工')[0].matched).toBe('抗菌施工')
    expect(searchItems('あんしんサポ')[0].matched).toBe('あんしんサポート')
    // 読みがな（画面に出さない言葉）で当たったときは、項目の名前を返す。
    expect(searchItems('しょうかき')[0].matched).toBe('簡易消火器')
  })
  it('英字2文字の言葉は、たまたま含まれていても当たりにしない', () => {
    // 「FR」（フリーレントの略）は、そのまま打てば当たるが、ほかの言葉の中に含まれていても当たらない。
    expect(top('FR')).toBe('freerent')
    expect(top('transfer')).toBeNull()
  })
})

describe('guessItemId', () => {
  it('合う項目の ID を返す', () => {
    expect(guessItemId('室内抗菌施工費')).toBe('shodoku')
    expect(guessItemId('鍵交換費用')).toBe('kagi')
  })
  it('合うものがなければ、「その他」', () => {
    expect(guessItemId('入居者プレミアムパック')).toBe('other')
    expect(guessItemId('')).toBe('other')
  })
})

describe('labelForMatch', () => {
  const label = (query: string) => labelForMatch(query, searchItems(query)[0])
  it('見積書に書かれていた言葉（項目の言葉より長い）は、行の名前として残す', () => {
    expect(label('室内抗菌施工費')).toBe('室内抗菌施工費')
    expect(label('24時間安心サポート（2年）')).toBe('24時間安心サポート（2年）')
    expect(label('  鍵交換費用（税込） ')).toBe('鍵交換費用（税込）')
  })
  it('別の呼び方とぴったり同じ言葉も、残す', () => {
    expect(searchItems('消毒料')[0].score).toBeGreaterThanOrEqual(100)
    expect(label('消毒料')).toBe('消毒料')
  })
  it('探すための短い言葉（項目の言葉の一部）は、残さない', () => {
    expect(label('抗菌')).toBe('')
    expect(label('サポ')).toBe('')
  })
  it('項目の名前そのものと、読みがなは、残さない', () => {
    expect(label('敷金')).toBe('')
    expect(label('室内の消毒・抗菌')).toBe('')
    expect(label('しききん')).toBe('')
    expect(label('しょうかき')).toBe('')
  })
  it('長すぎる言葉は、行の名前の上限で切る。空なら空', () => {
    const long = '抗菌'.repeat(50)
    expect(label(long).length).toBeLessThanOrEqual(60)
    expect(labelForMatch('   ', searchItems('抗菌')[0])).toBe('')
  })
})
