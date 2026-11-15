import { describe, expect, it } from 'vitest'
import { brokerageCaps, checkBrokerage, checkProration, prorationDays } from './calc'
import { consultDesks } from './consult'
import { inspectEstimate } from './inspect'
import { items, otherItem } from './items'
import { buildMessage } from './message'
import { listSources, RULES_VERIFIED_ON, verifiedLabel, VERIFY_METHOD_NOTE } from './sources'
import type { Estimate, EstimateLine } from './types'

// 点検役（④）が、電卓で計算した答えと、道具の答えを突き合わせるためのテスト。
// ほかのテストは「道具の中の数字どうしが合っているか」を多く見ているので、
// ここでは、道具の外で（手で）出した数字を、そのまま書いて比べる。

function estimateOf(lines: [itemId: string, amount: number | null, label?: string][], patch: Partial<Estimate> = {}): Estimate {
  return {
    rent: 65_500,
    commonFee: 3_500,
    moveInDate: '2028-02-10',
    statedTotal: null,
    lines: lines.map(([itemId, amount, label], i): EstimateLine => ({ id: `h${i + 1}`, itemId, label: label ?? '', amount })),
    ...patch,
  }
}

describe('手で計算した答えと合う: 仲介手数料の上限', () => {
  it.each([
    // 家賃, 0.55倍（円未満切り捨て）, 1.1倍（円未満切り捨て）
    [65_500, 36_025, 72_050], // 65,500 × 0.55 = 36,025 ／ × 1.1 = 72,050
    [77_777, 42_777, 85_554], // 42,777.35 ／ 85,554.7
    [100_000, 55_000, 110_000],
    [123_456, 67_900, 135_801], // 67,900.8 ／ 135,801.6
    [1, 0, 1], // 0.55 ／ 1.1
  ])('家賃 %i 円 → 0.5か月分＋税 %i 円、1か月分＋税 %i 円', (rent, half, full) => {
    expect(brokerageCaps(rent)).toEqual({ halfCap: half, fullCap: full })
  })

  it('家賃 123,456 円: 67,901 円は端数の違い、67,902 円は超えている', () => {
    // 上限は 67,900.8 円。67,901 円との差は 0.2 円（1円未満）、67,902 円との差は 1.2 円。
    expect(checkBrokerage({ rent: 123_456, commonFee: null, amount: 67_901 })).toMatchObject({ status: 'within-half', roundingOnly: true })
    expect(checkBrokerage({ rent: 123_456, commonFee: null, amount: 67_902 })).toMatchObject({ status: 'within-full', roundingOnly: false, overHalf: 2 })
  })

  it('家賃 65,500 円・管理費 3,500 円で、37,950 円（＝69,000 × 0.55）なら、管理費込みの計算と同じ額だと気づく', () => {
    const c = checkBrokerage({ rent: 65_500, commonFee: 3_500, amount: 37_950 })
    expect(c).toMatchObject({ status: 'within-full', rentPlusFeeMatch: 'half', overHalf: 1_925 }) // 37,950 − 36,025
  })

  it('家賃 65,500 円で 75,900 円（＝69,000 × 1.1）なら、1か月分＋税（72,050 円）を 3,850 円超えている', () => {
    const c = checkBrokerage({ rent: 65_500, commonFee: 3_500, amount: 75_900 })
    expect(c).toMatchObject({ status: 'over-full', rentPlusFeeMatch: 'full', overFull: 3_850 })
  })
})

describe('手で計算した答えと合う: 日割り家賃', () => {
  it('2028年2月10日入居（うるう年）: 29日の月の、10日〜29日の20日分', () => {
    expect(prorationDays('2028-02-10')).toEqual({ daysInMonth: 29, days: 20 })
    const c = checkProration({ rent: 65_500, commonFee: 3_500, moveInDate: '2028-02-10', amount: 47_586 })
    // 家賃だけ: 65,500 × 20 ÷ 29 = 45,172.4… → 45,172 ／ 管理費込み: 69,000 × 20 ÷ 29 = 47,586.2… → 47,586
    expect(c.estimateRentOnly).toBe(45_172)
    expect(c.estimateWithFee).toBe(47_586)
    // 幅: いちばん少ないのは 65,500 × 20 ÷ 31 = 42,258.06… → 42,258、いちばん多いのは 69,000 × 20 ÷ 29 = 47,586.2… → 47,587
    expect(c.low).toBe(42_258)
    expect(c.high).toBe(47_587)
    // 1日分は、69,000 ÷ 29 = 2,379.3… → 2,380
    expect(c.tolerance).toBe(2_380)
    expect(c.status).toBe('ok')
  })

  it('同じ条件で、1か月分まるごと（69,000 円）が書かれていたら「多い」、月の後半だけの額（20,000 円）なら「少ない」', () => {
    const base = { rent: 65_500, commonFee: 3_500, moveInDate: '2028-02-10' }
    // 多いほうの境目: 47,587 ＋ 2,380 = 49,967 までは知らせない。
    expect(checkProration({ ...base, amount: 49_967 }).status).toBe('ok')
    expect(checkProration({ ...base, amount: 49_968 }).status).toBe('high')
    expect(checkProration({ ...base, amount: 69_000 }).status).toBe('high')
    // 少ないほうの境目: 42,258 − 2,380 = 39,878 までは知らせない。
    expect(checkProration({ ...base, amount: 39_878 }).status).toBe('ok')
    expect(checkProration({ ...base, amount: 39_877 }).status).toBe('low')
    expect(checkProration({ ...base, amount: 20_000 }).status).toBe('low')
  })

  it('12月31日入居: 1日分', () => {
    expect(prorationDays('2027-12-31')).toEqual({ daysInMonth: 31, days: 1 })
    // 65,500 ÷ 31 = 2,112.9… → 2,113
    expect(checkProration({ rent: 65_500, commonFee: null, moveInDate: '2027-12-31', amount: 2_113 })).toMatchObject({ estimateRentOnly: 2_113, status: 'ok' })
  })
})

describe('手で計算した答えと合う: 見積書の全体', () => {
  const estimate = estimateOf([
    ['shikikin', 65_500],
    ['reikin', 131_000], // 家賃の2か月分
    ['maeyachin', 69_000], // 家賃＋管理費の1か月分
    ['hiwari', 47_586],
    ['chukai', 72_050], // 1か月分＋税ちょうど
    ['kasaihoken', 18_000],
    ['kagi', 16_500],
    ['shodoku', 19_800],
    ['gaichu', 11_000],
    ['shokaki', null], // 金額が未入力
    ['cleaning', 38_500],
    ['koshin', 65_500], // 合計に入れない
    ['freerent', 65_500], // 合計から引く
    ['nebiki', 10_000], // 合計から引く
    ['other', 3_300, 'なぞの費用'],
  ])
  const r = inspectEstimate(estimate)

  it('合計: 足す項目を足して、引く項目を引く。更新料と未入力は入れない', () => {
    // 足す: 65,500＋131,000＋69,000＋47,586＋72,050＋18,000＋16,500＋19,800＋11,000＋38,500＋3,300 = 492,236
    // 引く: 65,500＋10,000 = 75,500 → 416,736
    expect(r.total).toBe(416_736)
    expect(r.excludedTotal).toBe(65_500)
    expect(r.missingAmountCount).toBe(1)
  })

  it('区分ごとの小計を足すと、合計になる', () => {
    expect(r.byCategory.reduce((sum, c) => sum + c.subtotal, 0)).toBe(r.total)
    expect(r.byCategory.reduce((sum, c) => sum + c.count, 0)).toBe(estimate.lines.length)
    const sub = Object.fromEntries(r.byCategory.map((c) => [c.category, c.subtotal]))
    expect(sub.usual).toBe(313_086) // 65,500＋131,000＋69,000＋47,586
    expect(sub.capped).toBe(72_050)
    expect(sub.optional).toBe(30_800) // 19,800＋11,000（消火器は未入力）
    expect(sub.choosable).toBe(18_000)
    expect(sub['who-pays']).toBe(16_500)
    expect(sub.overlap).toBe(38_500)
    expect(sub.contract).toBe(-75_500) // 更新料は入れず、フリーレントと値引きを引く
    expect(sub.other).toBe(3_300)
  })

  it('「もし全部外せた場合の差」: 鍵 16,500＋消毒 19,800＋害虫駆除 11,000 = 47,300（未入力の消火器、火災保険、クリーニング、一覧にない項目は入れない）', () => {
    expect(r.askTotal).toBe(47_300)
    expect(r.askCount).toBe(3)
  })

  it('礼金は「家賃の2か月分」とだけ言い、仲介手数料は「1か月分で承諾していたか」を確かめる項目になる', () => {
    const reikin = r.findings[1]
    expect(reikin.level).toBe('ok')
    expect(reikin.reasons.join('')).toContain('家賃（65,500円）の2か月分')
    const chukai = r.findings[4]
    expect(chukai.level).toBe('check')
    expect(chukai.headline).toContain('承諾していたか')
    expect(chukai.reasons.join('')).toContain('0.5か月分＋消費税は 36,025円、1か月分＋消費税は 72,050円')
    expect(chukai.reasons.join('')).toContain('36,025円 多く') // 72,050 − 36,025
  })

  it('文面の金額は、見積書の金額と同じ。引く項目にマイナスを付けて相手に送らない', () => {
    const m = buildMessage({ inspection: r, lineIds: null, senderName: '', propertyName: '' }, 'mail')
    expect(m.body).toContain('72,050円')
    expect(m.body).toContain('なぞの費用：3,300円')
    expect(m.body).not.toMatch(/undefined|NaN|null/)
  })
})

describe('文面と聞き方（期待させすぎない）', () => {
  it('どの項目の聞き方にも、金額の相談（値下げの交渉）をすすめる言葉がない', () => {
    for (const item of [...items, otherItem]) {
      const text = [item.howToAsk, item.ask.mail, item.ask.line].join('\n')
      expect(text, item.name).not.toMatch(/ご相談|安く|下げ|まけ|減額|値引きして/)
    }
  })

  it('「ふつうはかかる」の項目は、外すことをたずねない（駐車場・駐輪場の「使わない場合」を除く）', () => {
    for (const item of items.filter((i) => i.category === 'usual' && i.id !== 'chushajo')) {
      expect([item.ask.mail, item.ask.line].join(''), item.name).not.toMatch(/外す|外して/)
    }
  })
})

describe('出典の確かめ方を、正直に持っている', () => {
  it('検索で確かめた出典が1つでもあるあいだは、そのことわり書きがある', () => {
    const bySearch = listSources().filter((s) => s.verifiedBy === 'official-site-search')
    if (bySearch.length > 0) {
      expect(VERIFY_METHOD_NOTE).not.toBeNull()
      expect(VERIFY_METHOD_NOTE).toContain('検索')
      expect(VERIFY_METHOD_NOTE).toContain('まだ済んでいません')
      expect(VERIFY_METHOD_NOTE).toContain('原文')
    } else {
      expect(VERIFY_METHOD_NOTE).toBeNull()
    }
  })

  it('出典ごとの表示は、確かめ方を言う（「確認」だけにしない）', () => {
    for (const s of listSources()) {
      expect(verifiedLabel(s)).toMatch(s.verifiedBy === 'official-page' ? /原文で確認$/ : /検索で確認$/)
    }
  })

  // 「確かめた日 ≦ ルールの最終確認日」は、求めない。運営者が README の手順どおりに、出典を1件ずつ原文で確かめて
  // 日付を書いていくと、最後に RULES_VERIFIED_ON を直すまでのあいだ、出典の日付のほうが新しくなるため。
  // 求めるのは、逆向き（どの出典も確かめていない日を、最終確認日にしない）。くわしい検査は items.test.ts にある。
  it('確かめた日は YYYY-MM-DD の形。ルールの最終確認日は、いちばん新しい「確かめた日」より先になっていない', () => {
    const dates = listSources().map((s) => s.verifiedOn)
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(RULES_VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(RULES_VERIFIED_ON <= [...dates].sort()[dates.length - 1]).toBe(true)
  })

  it('相談先の電話番号は、公式のページで確かめた番号のまま（188 と 0570-078374）', () => {
    expect(consultDesks.find((d) => d.id === 'hotline188')?.phone).toBe('188')
    expect(consultDesks.find((d) => d.id === 'houterasu')?.phone).toBe('0570-078374')
  })
})
