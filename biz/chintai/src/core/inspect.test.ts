import { describe, expect, it } from 'vitest'
import { createEmptyEstimate } from './estimate'
import { inspectEstimate, isOtherLine } from './inspect'
import { items, NO_RULE_TEXT } from './items'
import { sampleEstimate } from './sample'
import type { Estimate, EstimateLine, Finding } from './types'
import { findBannedPhrase, LEGAL_WORDS } from './wording'

/** テスト用の見積書を作る。家賃 78,000、管理費 4,000、3月20日入居。 */
function estimateOf(lines: [itemId: string, amount: number | null, label?: string][], patch: Partial<Estimate> = {}): Estimate {
  return {
    rent: 78_000,
    commonFee: 4_000,
    moveInDate: '2027-03-20',
    statedTotal: null,
    lines: lines.map(([itemId, amount, label], i): EstimateLine => ({ id: `l${i + 1}`, itemId, label: label ?? '', amount })),
    ...patch,
  }
}

/** 1行だけの見積書を点検して、その行の結果を返す。 */
function one(itemId: string, amount: number | null, patch: Partial<Estimate> = {}): Finding {
  return inspectEstimate(estimateOf([[itemId, amount]], patch)).findings[0]
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('サンプルの見積書', () => {
  const r = inspectEstimate(sampleEstimate())

  it('合計と、区分ごとの小計', () => {
    expect(r.total).toBe(477_042)
    expect(r.byCategory).toEqual([
      { category: 'usual', count: 5, subtotal: 310_742 },
      { category: 'capped', count: 1, subtotal: 85_800 },
      { category: 'optional', count: 3, subtotal: 38_500 },
      { category: 'choosable', count: 1, subtotal: 20_000 },
      { category: 'who-pays', count: 1, subtotal: 22_000 },
    ])
    // 小計を足すと、合計になる。
    expect(r.byCategory.reduce((sum, c) => sum + c.subtotal, 0)).toBe(r.total)
  })
  it('「もし全部外せた場合の差」は、必須か任意かを確かめる項目と、鍵の交換費用の合計', () => {
    expect(r.askTotal).toBe(16_500 + 16_500 + 5_500 + 22_000)
    expect(r.askCount).toBe(4)
  })
  it('項目ごとの判定', () => {
    const levels = Object.fromEntries(r.findings.map((f) => [f.itemId, f.level]))
    expect(levels).toEqual({
      shikikin: 'ok',
      reikin: 'ok',
      maeyachin: 'ok',
      hiwari: 'ok',
      chukai: 'check',
      hoshoryo: 'ok',
      kasaihoken: 'check',
      kagi: 'check',
      shodoku: 'check',
      support24: 'check',
      shorui: 'check',
    })
    expect(r.attentionCount).toBe(6)
    expect(r.missingAmountCount).toBe(0)
  })
  it('見積書に書かれた名前を表示し、項目の名前も持っている', () => {
    const f = r.findings.find((x) => x.itemId === 'shodoku')!
    expect(f.label).toBe('室内抗菌施工費')
    expect(f.itemName).toBe('室内の消毒・抗菌')
  })
  it('解説ページがある項目は、その slug を持っている', () => {
    expect(r.findings.find((x) => x.itemId === 'shodoku')!.guideSlug).toBe('shodoku-kokin')
    expect(r.findings.find((x) => x.itemId === 'reikin')!.guideSlug).toBeNull()
  })
  it('見積書に書かれた合計と合っている', () => {
    expect(r.statedTotalDiff).toBe(0)
    expect(r.notes.map((n) => n.kind)).toEqual(['stated-total-match'])
  })
})

describe('空や、足りない見積書でも落ちない', () => {
  it('何も入っていない見積書', () => {
    const r = inspectEstimate(createEmptyEstimate())
    expect(r.findings).toEqual([])
    expect(r.total).toBe(0)
    expect(r.askTotal).toBe(0)
    expect(r.byCategory).toEqual([])
    expect(r.statedTotalDiff).toBeNull()
    expect(r.notes.map((n) => n.kind)).toEqual(['no-lines'])
  })
  it('家賃がないときは、そのことを知らせて、計算の要る判定をしない', () => {
    const r = inspectEstimate(estimateOf([['chukai', 85_800], ['shikikin', 78_000], ['hiwari', 30_000]], { rent: null }))
    expect(r.notes.map((n) => n.kind)).toContain('no-rent')
    const [chukai, shikikin, hiwari] = r.findings
    expect(chukai.level).toBe('note')
    expect(chukai.headline).toContain('家賃を入れると')
    expect(chukai.askDefault).toBe(false)
    expect(shikikin.reasons.join('')).toContain('家賃を入れると')
    expect(hiwari.level).toBe('note')
    expect(r.total).toBe(85_800 + 78_000 + 30_000) // 合計は出る
  })
  it('入居する日がないときは、日割りの目安を出さずに、そのことを知らせる', () => {
    const r = inspectEstimate(estimateOf([['hiwari', 30_000]], { moveInDate: null }))
    expect(r.notes.map((n) => n.kind)).toContain('no-move-in-date')
    expect(r.findings[0].level).toBe('note')
    // 日割りの行がなければ、知らせない。
    expect(inspectEstimate(estimateOf([['shikikin', 78_000]], { moveInDate: null })).notes.map((n) => n.kind)).not.toContain('no-move-in-date')
  })
  it('金額が未入力の行は、合計に入れずに、数を知らせる', () => {
    const r = inspectEstimate(estimateOf([['shikikin', null], ['shodoku', null], ['reikin', 78_000], ['koshin', null]]))
    expect(r.total).toBe(78_000)
    expect(r.missingAmountCount).toBe(2) // 更新料は初期費用ではないので、数えない
    expect(r.notes.find((n) => n.kind === 'missing-amount')?.text).toContain('2つ')
    expect(r.findings[0].level).toBe('note')
    expect(r.findings[1].level).toBe('check') // 確かめる項目は、金額がなくても確かめる項目
    expect(r.findings[1].countsTowardAskTotal).toBe(false)
    expect(r.askTotal).toBe(0)
  })
  it('知らない項目の ID は、「その他」として点検する', () => {
    const r = inspectEstimate(estimateOf([['zzz-unknown', 5_000, 'なぞの費用']]))
    expect(r.findings[0].itemId).toBe('other')
    expect(r.findings[0].category).toBe('other')
    expect(r.findings[0].label).toBe('なぞの費用')
    expect(r.total).toBe(5_000)
  })
  it('もとの見積書を書き換えない', () => {
    const estimate = deepFreeze(sampleEstimate())
    expect(() => inspectEstimate(estimate)).not.toThrow()
  })
  it('同じ見積書からは、同じ結果が出る', () => {
    expect(inspectEstimate(sampleEstimate())).toEqual(inspectEstimate(sampleEstimate()))
  })
})

describe('仲介手数料（上限の決まりがある）', () => {
  it('0.5か月分＋消費税 以内なら、赤ペンは入れない', () => {
    const f = one('chukai', 42_900)
    expect(f.level).toBe('ok')
    expect(f.headline).toContain('0.5か月分＋消費税の範囲')
    expect(f.askDefault).toBe(false)
    expect(f.reasons.join('')).toContain('42,900円')
    expect(f.reasons.join('')).toContain('85,800円')
  })
  it('0.5か月分＋消費税を超えていたら、承諾していたかを確かめる項目にする', () => {
    const f = one('chukai', 85_800)
    expect(f.level).toBe('check')
    expect(f.headline).toContain('承諾していたかを、確かめる')
    expect(f.reasons.join('')).toContain('42,900円 多く')
    expect(f.askDefault).toBe(true)
    expect(f.ask.mail).toContain('0.5か月分（＋消費税）でお願いすることは、できますでしょうか')
    expect(f.calc).toMatchObject({ kind: 'brokerage', status: 'within-full', halfCap: 42_900, fullCap: 85_800, overHalf: 42_900 })
  })
  it('境界: 上限ちょうどと、1円超え', () => {
    expect(one('chukai', 42_900).level).toBe('ok')
    expect(one('chukai', 42_901).level).toBe('check')
    expect(one('chukai', 85_800).level).toBe('check')
    expect(one('chukai', 85_801).level).toBe('alert')
  })
  it('1か月分＋消費税を超えていたら、「可能性があります」と言う（断定しない）', () => {
    const f = one('chukai', 100_000)
    expect(f.level).toBe('alert')
    expect(f.headline).toContain('超えている可能性があります')
    expect(f.reasons.join('')).toContain('14,200円 多く')
    expect(f.reasons.join('')).toContain('入力した家賃が合っているか')
    expect(f.askDefault).toBe(true)
  })
  it('管理費を足した額で計算されているようなら、そのことを添えて、計算のもとを聞く', () => {
    const full = one('chukai', 90_200)
    expect(full.level).toBe('alert')
    expect(full.reasons.join('')).toContain('家賃に管理費・共益費を足した額（82,000円）の1か月分＋消費税（90,200円）')
    const half = one('chukai', 45_100)
    expect(half.level).toBe('check')
    expect(half.headline).toContain('計算のもとを、確かめる')
    expect(half.reasons.join('')).toContain('0.5か月分＋消費税（45,100円）')
    expect(half.ask.mail).toContain('計算のもと')
  })
  it('金額が未入力なら、上限の目安だけを出す', () => {
    const f = one('chukai', null)
    expect(f.level).toBe('note')
    expect(f.reasons.join('')).toContain('42,900円')
  })
  // 見積書が「仲介手数料」と「仲介手数料（消費税）」を分けて書いていると、同じ項目が2行になる。
  // 1行ずつ上限と比べると、合計では超えているのに、どの行にも「おさまっています」と出てしまう。
  it('2行以上あるときは、合わせた額で上限と比べる（1行ずつなら範囲内でも、合計が超えていれば確かめる項目）', () => {
    const r = inspectEstimate(estimateOf([['chukai', 40_000, '仲介手数料'], ['chukai', 4_000, '仲介手数料消費税']]))
    expect(r.findings.map((f) => f.level)).toEqual(['check', 'check'])
    expect(r.attentionCount).toBe(2)
    for (const f of r.findings) {
      expect(f.headline).toContain('2行の合計')
      expect(f.headline).not.toContain('おさまっています')
      expect(f.reasons.join('')).toContain('44,000円')
      expect(f.reasons.join('')).toContain('1,100円 多く') // 44,000 − 42,900
      expect(f.calc).toMatchObject({ kind: 'brokerage', status: 'within-full', amount: 44_000, lineCount: 2, overHalf: 1_100 })
    }
  })
  it('3行に分かれていて、合計が1か月分＋消費税を超えていれば、「可能性があります」と言う', () => {
    const r = inspectEstimate(estimateOf([['chukai', 42_900], ['chukai', 42_900], ['chukai', 42_900]]))
    expect(r.findings.map((f) => f.level)).toEqual(['alert', 'alert', 'alert'])
    expect(r.findings[0].headline).toContain('3行の合計')
    expect(r.findings[0].headline).toContain('超えている可能性があります')
    expect(r.findings[0].reasons.join('')).toContain('128,700円')
    expect(r.findings[0].reasons.join('')).toContain('42,900円 多く') // 128,700 − 85,800
  })
  it('本体と消費税を分けた2行（78,000円＋7,800円）は、合計の85,800円で比べる（差は42,900円）', () => {
    const r = inspectEstimate(estimateOf([['chukai', 78_000], ['chukai', 7_800, '仲介手数料（消費税）']]))
    expect(r.findings.map((f) => f.level)).toEqual(['check', 'check'])
    expect(r.findings[0].reasons.join('')).toContain('42,900円 多く')
    expect(r.findings[0].reasons.join('')).not.toContain('35,100円')
  })
  it('2行の合計が0.5か月分＋消費税の範囲なら、赤ペンは入れない（合計で見たことを言う）', () => {
    const r = inspectEstimate(estimateOf([['chukai', 39_000], ['chukai', 3_900]]))
    expect(r.findings.map((f) => f.level)).toEqual(['ok', 'ok'])
    expect(r.findings[0].headline).toContain('2行の合計')
    expect(r.findings[0].headline).toContain('おさまっています')
    expect(r.findings[0].reasons.join('')).toContain('42,900円')
    expect(r.attentionCount).toBe(0)
  })
  it('2行あるときの確認の文面は、合わせた額でたずねる。同じ質問が2回入らないように、はじめから入れるのは1行目だけ', () => {
    const r = inspectEstimate(estimateOf([['chukai', 40_000], ['chukai', 4_000, '仲介手数料消費税']]))
    expect(r.findings.map((f) => f.askDefault)).toEqual([true, false])
    for (const f of r.findings) {
      expect(f.ask.mail).toContain('2行を合わせると 44,000円')
      expect(f.ask.mail).toMatch(/でしょうか。$/)
      expect(f.ask.line).toContain('2行を合わせると 44,000円')
      expect(f.ask.line).toMatch(/(か。|ください。)$/)
    }
  })
  it('金額が入っている行が1つだけなら、その行だけで比べる（未入力の行は、合計に入れない）', () => {
    const r = inspectEstimate(estimateOf([['chukai', 42_900], ['chukai', null]]))
    expect(r.findings[0].level).toBe('ok')
    expect(r.findings[0].headline).not.toContain('合計')
    expect(r.findings[1].level).toBe('note')
  })
  it('根拠に、出典が付いている', () => {
    const f = one('chukai', 85_800)
    expect(f.basisStatus).toBe('verified')
    expect(f.basis.length).toBeGreaterThanOrEqual(3)
    for (const b of f.basis) {
      expect(b.sources.length).toBeGreaterThan(0)
      for (const s of b.sources) expect(s.url).toMatch(/^https:\/\//)
    }
  })
})

describe('日割り家賃（計算がおかしくないかだけ見る）', () => {
  it('目安と大きく違わなければ、赤ペンは入れない。数え方は会社によって違う、と添える', () => {
    const f = one('hiwari', 31_742)
    expect(f.level).toBe('ok')
    expect(f.reasons.join('')).toContain('12日')
    expect(f.reasons.join('')).toContain('30,194円')
    expect(f.reasons.join('')).toContain('31,742円')
    expect(f.reasons.join('')).toContain('大きくは違いません')
    expect(f.caveat).toContain('会社によって違います')
  })
  it('目安より大きく多ければ、確かめる項目にする', () => {
    const f = one('hiwari', 60_000)
    expect(f.level).toBe('check')
    expect(f.headline).toContain('目安より、多く')
    expect(f.reasons.join('')).toContain('家賃がかかり始める日')
    expect(f.askDefault).toBe(true)
    expect(f.ask.mail).toContain('3月20日')
  })
  it('目安より少ないときは、メモにとどめる（借りる人に不利ではないため）', () => {
    const f = one('hiwari', 10_000)
    expect(f.level).toBe('note')
    expect(f.headline).toContain('目安より、少なく')
    expect(f.askDefault).toBe(false)
  })
  it('管理費だけの日割りの行は、目安どおりとして扱う', () => {
    const f = one('hiwari', 1_548)
    expect(f.level).toBe('ok')
    expect(f.reasons.join('')).toContain('管理費・共益費だけの日割り')
  })
})

describe('ふつうはかかる項目（金額の高い安いは言わない）', () => {
  it('敷金・礼金は、家賃の何か月分にあたるかだけを言う', () => {
    expect(one('shikikin', 156_000).reasons.join('')).toContain('家賃（78,000円）の2か月分にあたります')
    expect(one('reikin', 78_000).reasons.join('')).toContain('1か月分にあたります')
    expect(one('reikin', 100_000).reasons.join('')).toContain('約1.28か月分')
    // どんなに大きくても、赤ペンは入れない（相場で判定しない）。
    expect(one('reikin', 780_000).level).toBe('ok')
    expect(one('shikikin', 780_000).level).toBe('ok')
  })
  it('前家賃は、家賃の1か月分（管理費込みでも）と同じなら ok', () => {
    expect(one('maeyachin', 78_000).level).toBe('ok')
    expect(one('maeyachin', 82_000).level).toBe('ok')
    expect(one('maeyachin', 82_000).reasons.join('')).toContain('家賃＋管理費・共益費の1か月分（82,000円）')
  })
  it('前家賃が1か月分と違えば、何月分かを確かめる項目にする', () => {
    const f = one('maeyachin', 164_000)
    expect(f.level).toBe('check')
    expect(f.headline).toContain('何月分にあたるか')
    expect(f.reasons.join('')).toContain('家賃＋管理費・共益費の2か月分')
    expect(f.askDefault).toBe(true)
    expect(one('maeyachin', 81_999).level).toBe('check') // 境界: 1円ちがい
  })
  it('1か月分と少しだけ違う額を、「1か月分にあたります」と言い切らない（見出しと理由が食い違わない）', () => {
    const f = one('maeyachin', 78_100)
    expect(f.level).toBe('check')
    expect(f.headline).toContain('1か月分とは違う額')
    expect(f.reasons.join('')).not.toContain('家賃の1か月分にあたります')
    expect(f.reasons.join('')).toContain('約1か月分（ちょうど1か月分より 100円 多い額）')
    // 敷金・礼金も、ちょうどでなければ「約」を付けて、差を言う。
    expect(one('shikikin', 78_300).reasons.join('')).toContain('家賃（78,000円）の約1か月分（ちょうど1か月分より 300円 多い額）にあたります')
    expect(one('reikin', 77_700).reasons.join('')).toContain('約1か月分（ちょうど1か月分より 300円 少ない額）')
    expect(one('shikikin', 117_100).reasons.join('')).toContain('約1.5か月分（ちょうど1.5か月分より 100円 多い額）')
    // 管理費（月額 4,000円）に 4,010円。
    expect(one('kanrihi', 4_010).reasons.join('')).toContain('約1か月分（ちょうど1か月分より 10円 多い額）')
    // ちょうどのときは、これまでどおり言い切る。
    expect(one('shikikin', 78_000).reasons.join('')).toContain('家賃（78,000円）の1か月分にあたります')
    expect(one('shikikin', 117_000).reasons.join('')).toContain('の1.5か月分にあたります')
  })
  it('保証料の割合も、ちょうどでなければ「約」を付ける', () => {
    expect(one('hoshoryo', 41_100).reasons.join('')).toContain('の約0.5か月分（約50％）')
    expect(one('hoshoryo', 41_000).reasons.join('')).toContain('の0.5か月分（50％）')
  })
  it('管理費は、月額と同じなら ok、違えばメモ', () => {
    expect(one('kanrihi', 4_000).level).toBe('ok')
    const f = one('kanrihi', 5_548)
    expect(f.level).toBe('note')
    expect(f.reasons.join('')).toContain('約1.39か月分')
    expect(one('kanrihi', 4_000, { commonFee: null }).reasons.join('')).toContain('管理費・共益費（月額）を入れると')
  })
  it('0円の行は、月額と比べずに、0円であることだけを言う', () => {
    for (const id of ['shikikin', 'reikin', 'maeyachin', 'kanrihi', 'hoshoryo']) {
      const f = one(id, 0)
      expect(f.level, id).toBe('ok')
      expect(f.reasons.join(''), id).toContain('0円になっています')
      expect(f.reasons.join(''), id).not.toContain('か月分にあたります')
    }
  })
  it('保証料は、割合を出すだけで、高い安いは言わない', () => {
    const f = one('hoshoryo', 41_000)
    expect(f.level).toBe('ok')
    expect(f.reasons.join('')).toContain('家賃＋管理費・共益費（82,000円）の0.5か月分（50％）')
    expect(one('hoshoryo', 820_000).level).toBe('ok')
    expect(one('hoshoryo', 39_000, { commonFee: 0 }).reasons.join('')).toContain('家賃（78,000円）の0.5か月分（50％）')
  })
})

describe('確かめる項目', () => {
  it('必須か任意かを確かめる項目は、決まりが見つからなかったと言い、差の合計に入る', () => {
    for (const id of ['shodoku', 'gaichu', 'support24', 'shokaki', 'shorui']) {
      const f = one(id, 11_000)
      expect(f.level, id).toBe('check')
      expect(f.category, id).toBe('optional')
      expect(f.headline, id).toBe('必須か任意かを、確かめる項目です。')
      expect(f.reasons[0], id).toBe(NO_RULE_TEXT)
      expect(f.basisStatus, id).toBe('none-found')
      expect(f.basis, id).toEqual([])
      expect(f.countsTowardAskTotal, id).toBe(true)
      expect(f.askDefault, id).toBe(true)
      expect(f.caveat, id).toContain('外せないこともあります')
    }
  })
  it('どんなに大きな金額でも、「高い」とは言わない（相場で判定しない）', () => {
    const cheap = one('shodoku', 1_000)
    const big = one('shodoku', 300_000)
    expect(big.level).toBe(cheap.level)
    expect(big.headline).toBe(cheap.headline)
    expect(big.reasons).toEqual(cheap.reasons)
  })
  it('火災保険は「自分で選べることがある」。差の合計には入れない', () => {
    const f = one('kasaihoken', 20_000)
    expect(f.category).toBe('choosable')
    expect(f.level).toBe('check')
    expect(f.countsTowardAskTotal).toBe(false)
    expect(f.basis.length).toBeGreaterThan(0)
  })
  it('鍵の交換は「だれが負担するか」。ガイドラインは法律ではない、と添える', () => {
    const f = one('kagi', 22_000)
    expect(f.category).toBe('who-pays')
    expect(f.reasons.join('')).toContain('ガイドラインは法律ではなく')
    expect(f.caveat).toContain('法律ではありません')
    expect(f.countsTowardAskTotal).toBe(true)
  })
  it('一覧にない項目は、何のお金かを聞く。差の合計には入れない', () => {
    const r = inspectEstimate(estimateOf([['other', 8_800, '入居安心パック']]))
    const f = r.findings[0]
    expect(f.label).toBe('入居安心パック')
    expect(f.category).toBe('other')
    expect(f.level).toBe('check')
    expect(f.reasons.join('')).toContain('確かめていません')
    expect(f.ask.mail).toContain('何のための費用でしょうか')
    expect(r.askTotal).toBe(0)
    expect(r.total).toBe(8_800)
    expect(isOtherLine({ id: 'x', itemId: 'other', label: '', amount: null })).toBe(true)
    expect(isOtherLine({ id: 'x', itemId: 'shikikin', label: '', amount: null })).toBe(false)
  })
  it('名前が空の行は、項目の名前を表示する', () => {
    expect(one('kagi', 22_000).label).toBe('鍵の交換費用')
    expect(inspectEstimate(estimateOf([['other', 100, '   ']])).findings[0].label).toBe('その他の項目')
  })
})

describe('重なっていないか、確かめる', () => {
  it('クリーニングの前払いと敷金が両方あれば、重なりを確かめるよう言う', () => {
    const both = inspectEstimate(estimateOf([['cleaning', 44_000], ['shikikin', 78_000]])).findings[0]
    expect(both.category).toBe('overlap')
    expect(both.reasons.join('')).toContain('「敷金」も見積書に入っています')
    const alone = inspectEstimate(estimateOf([['cleaning', 44_000]])).findings[0]
    expect(alone.reasons.join('')).not.toContain('「敷金」も')
    expect(alone.level).toBe('check')
  })
  it('敷金が0円の行なら、「敷金からも引かれないか」とは言わない。聞き方も、この金額のほかの請求だけにする', () => {
    const f = inspectEstimate(estimateOf([['shikikin', 0], ['cleaning', 44_000]])).findings[1]
    expect(f.level).toBe('check')
    expect(f.reasons.join('')).not.toContain('「敷金」も見積書に入っています')
    expect(f.reasons.join('')).toContain('敷金は、0円')
    expect(f.ask.mail).not.toContain('敷金')
    expect(f.ask.line).not.toContain('敷金')
    expect(f.howToAsk).not.toContain('敷金')
    expect(f.ask.mail).toContain('この金額のほかに')
    expect(f.ask.mail).toMatch(/でしょうか。$/)
    expect(f.ask.line).toMatch(/か。$/)
    // 敷金の金額が未入力のときは、敷金の行があることは言う（額がわからないだけなので）。
    const unknown = inspectEstimate(estimateOf([['shikikin', null], ['cleaning', 44_000]])).findings[1]
    expect(unknown.reasons.join('')).toContain('「敷金」も見積書に入っています')
    // 害虫駆除が0円なら、消毒の行に「重なり」は言わない。
    const shodoku = inspectEstimate(estimateOf([['shodoku', 16_500], ['gaichu', 0]])).findings[0]
    expect(shodoku.reasons.join('')).not.toContain('「害虫駆除」も見積書に入っています')
  })
  it('0円の行は、確かめる項目にも、差の合計にも、はじめの文面にも入れない', () => {
    const r = inspectEstimate(estimateOf([['kagi', 0], ['shodoku', 0], ['kasaihoken', 0], ['cleaning', 0], ['other', 0, 'サービス料']]))
    for (const f of r.findings) {
      expect(f.level, f.itemId).toBe('ok')
      expect(f.headline, f.itemId).toBe('見積もりの額は、0円になっています。')
      expect(f.askDefault, f.itemId).toBe(false)
      expect(f.countsTowardAskTotal, f.itemId).toBe(false)
    }
    expect(r.attentionCount).toBe(0)
    expect(r.askCount).toBe(0)
    expect(r.askTotal).toBe(0)
    // 1円でも金額があれば、これまでどおり確かめる項目。
    expect(one('kagi', 1).level).toBe('check')
    // 更新料など、初期費用ではない項目は、0円でも、条件を確かめる項目のまま（金額がなくても確かめる項目なので）。
    expect(one('koshin', 0).level).toBe('check')
  })
  it('クリーニングの前払いと、敷引き・償却', () => {
    const f = inspectEstimate(estimateOf([['cleaning', 44_000], ['shikibiki', 78_000]])).findings[0]
    expect(f.reasons.join('')).toContain('敷引き・敷金の償却')
  })
  it('消毒と害虫駆除が両方あれば、内容の重なりを聞くよう言う', () => {
    const r = inspectEstimate(estimateOf([['shodoku', 16_500], ['gaichu', 11_000]]))
    expect(r.findings[0].reasons.join('')).toContain('「害虫駆除」も見積書に入っています')
    expect(r.findings[1].reasons.join('')).toContain('「室内の消毒・抗菌」も見積書に入っています')
  })
  it('同じ項目が2行あっても、自分自身とは重なりを言わない', () => {
    const r = inspectEstimate(estimateOf([['shodoku', 16_500], ['shodoku', 5_500]]))
    expect(r.findings[0].reasons.join('')).not.toContain('も見積書に入っています')
  })
})

describe('合計への入り方', () => {
  it('更新料・短期解約の違約金・敷引きは、合計に入れない', () => {
    const r = inspectEstimate(estimateOf([['shikikin', 78_000], ['koshin', 78_000], ['tanki', 78_000], ['shikibiki', 39_000]]))
    expect(r.total).toBe(78_000)
    expect(r.excludedTotal).toBe(195_000)
    expect(r.findings[1].reasons.join('')).toContain('合計には入れていません')
    expect(r.findings[1].level).toBe('check')
    expect(r.byCategory.find((c) => c.category === 'contract')).toEqual({ category: 'contract', count: 3, subtotal: 0 })
  })
  it('フリーレントと値引きは、合計から引く', () => {
    const r = inspectEstimate(estimateOf([['maeyachin', 82_000], ['freerent', 78_000], ['nebiki', 10_000]]))
    expect(r.total).toBe(82_000 - 78_000 - 10_000)
    expect(r.findings[1].reasons.join('')).toContain('合計から引いています')
    expect(r.byCategory.find((c) => c.category === 'contract')?.subtotal).toBe(-88_000)
  })
  it('フリーレントの金額が空でも、合計は変わらず、未入力にも数えない', () => {
    const r = inspectEstimate(estimateOf([['maeyachin', 82_000], ['freerent', null]]))
    expect(r.total).toBe(82_000)
    expect(r.missingAmountCount).toBe(0)
  })
})

describe('見積書に書かれた合計と比べる', () => {
  it('入力のほうが少ないときは、入れ忘れを確かめるよう言う', () => {
    const r = inspectEstimate(estimateOf([['shikikin', 78_000]], { statedTotal: 100_000 }))
    expect(r.statedTotalDiff).toBe(-22_000)
    const note = r.notes.find((n) => n.kind === 'stated-total-diff')!
    expect(note.text).toContain('22,000円 少なく')
    expect(note.text).toContain('入れ忘れた項目がないか')
  })
  it('入力のほうが多いときは、2回入れていないかを確かめるよう言う', () => {
    const r = inspectEstimate(estimateOf([['shikikin', 78_000]], { statedTotal: 70_000 }))
    expect(r.statedTotalDiff).toBe(8_000)
    expect(r.notes.find((n) => n.kind === 'stated-total-diff')!.text).toContain('8,000円 多く')
  })
  it('書かれた合計を入れていなければ、比べない', () => {
    const r = inspectEstimate(estimateOf([['shikikin', 78_000]]))
    expect(r.statedTotalDiff).toBeNull()
    expect(r.notes).toEqual([])
  })
})

describe('言い方（どんな見積書でも、断定しない）', () => {
  // すべての項目を、いろいろな金額と条件で点検して、出てくる文を全部調べる。
  const amounts = [null, 0, 1, 5_500, 42_900, 42_901, 78_000, 82_000, 85_800, 85_801, 90_200, 164_000, 999_999]
  const conditions: Partial<Estimate>[] = [
    {},
    { rent: null },
    { commonFee: null },
    { commonFee: 0 },
    { moveInDate: null },
    { moveInDate: '2027-03-01' },
    { moveInDate: '2028-02-29' },
    { statedTotal: 1 },
  ]
  const findings: Finding[] = []
  const noteTexts: string[] = []
  for (const condition of conditions) {
    for (const amount of amounts) {
      const r = inspectEstimate(estimateOf([...items.map((i): [string, number | null] => [i.id, amount]), ['other', amount, 'その他の費用']], condition))
      findings.push(...r.findings)
      noteTexts.push(...r.notes.map((n) => n.text))
    }
  }

  it('点検の結果の文に、言ってはいけない言い方がない', () => {
    // 文の数が多いので、見つかったものを集めてから、まとめて確かめる。
    const bad: string[] = []
    for (const f of findings) {
      const texts = [f.headline, ...f.reasons, f.caveat, f.howToAsk, f.ask.mail, f.ask.line, ...f.limits]
      for (const text of texts) if (findBannedPhrase(text)) bad.push(`${f.itemId}: ${text}`)
    }
    for (const text of noteTexts) if (findBannedPhrase(text)) bad.push(text)
    expect(bad).toEqual([])
    expect(findings.length).toBeGreaterThan(2000) // ちゃんと、たくさんの場合を調べている
  })
  it('確認の文面の部品は、いつも たずねる形で、法律や決まりの名前を出さない', () => {
    for (const f of findings) {
      expect(f.ask.mail, f.itemId).toMatch(/(でしょうか。|幸いです。|予定です。)$/)
      expect(f.ask.line, f.itemId).toMatch(/(か。|ください。|予定です。)$/)
      expect(f.ask.mail, f.itemId).not.toMatch(LEGAL_WORDS)
      expect(f.ask.line, f.itemId).not.toMatch(LEGAL_WORDS)
    }
  })
  it('判定のひとことは、「です」「ましょう」「あります」「ます」で終わる文になっている', () => {
    for (const f of findings) expect(f.headline, f.itemId).toMatch(/(です|ましょう|あります|ます)。$/)
  })
  it('確かめる項目には、いつも理由と、確かめることと、聞き方がある', () => {
    for (const f of findings.filter((x) => x.level === 'check' || x.level === 'alert')) {
      expect(f.reasons.length, f.itemId).toBeGreaterThan(0)
      expect(f.checks.length, f.itemId).toBeGreaterThan(0)
      expect(f.howToAsk.length, f.itemId).toBeGreaterThan(0)
      expect(f.caveat.length, f.itemId).toBeGreaterThan(0)
    }
  })
  it('金額に「undefined」「NaN」「null」が出ない', () => {
    for (const f of findings) expect([f.headline, ...f.reasons, f.ask.mail].join(' '), f.itemId).not.toMatch(/undefined|NaN|null|Infinity/)
    for (const text of noteTexts) expect(text).not.toMatch(/undefined|NaN|null|Infinity/)
  })
})
