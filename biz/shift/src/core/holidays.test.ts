import { describe, expect, it } from 'vitest'
import { weekdayOf } from './dates'
import { EQUINOX_ANNOUNCED_THROUGH, HOLIDAY_SOURCES, holidayNotice, holidaysInMonth, holidaysOfYear, isHolidayYearSupported } from './holidays'
import { OFFICIAL_HOLIDAY_LISTS } from './holidays.official'

describe('公表されている祝日の一覧（2025〜2027年）と、計算が一致する', () => {
  it('一覧は 2025・2026・2027 年の3年ぶんある', () => {
    expect(OFFICIAL_HOLIDAY_LISTS.map((l) => l.year)).toEqual([2025, 2026, 2027])
  })

  for (const list of OFFICIAL_HOLIDAY_LISTS) {
    it(`${list.year}年: 日付も名前も、1日も違わない`, () => {
      // 公表の一覧は、振替休日と国民の休日を、どちらも「休日」と書いている
      const computed = holidaysOfYear(list.year).map((h) => ({ month: h.month, day: h.day, name: h.kind === 'national' ? h.name : '休日' }))
      expect(computed).toEqual(list.days)
    })
    it(`${list.year}年: 出典と、確かめた日がデータに入っている`, () => {
      expect(list.source.url).toMatch(/^https:\/\//)
      expect(list.source.title).not.toBe('')
      // 日付そのものは決め打ちしない（運営者が見直して checkedOn を変えても、テストが落ちないように）。形と、ありうる日かだけを見る
      expect(list.source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(list.source.checkedOn))).toBe(false)
    })
    it(`${list.year}年: 発表済みの年なので、見込みの印は付かない`, () => {
      expect(holidaysOfYear(list.year).every((h) => !h.provisional)).toBe(true)
    })
  }
})

describe('決まりどおりに計算している', () => {
  it('国民の祝日は、毎年16日', () => {
    for (let y = 2022; y <= 2060; y++) expect(holidaysOfYear(y).filter((h) => h.kind === 'national')).toHaveLength(16)
  })

  it('振替休日: 祝日が日曜日のとき、次の「祝日でない日」が休日になる', () => {
    // 2025年2月23日（天皇誕生日）は日曜 → 24日
    expect(weekdayOf(2025, 2, 23)).toBe(0)
    expect(holidaysInMonth(2025, 2).get(24)).toMatchObject({ name: '振替休日', kind: 'substitute' })
    // 2025年5月4日（みどりの日）は日曜。次の日の5日も祝日なので、6日まで送られる
    expect(weekdayOf(2025, 5, 4)).toBe(0)
    expect(holidaysInMonth(2025, 5).get(6)).toMatchObject({ name: '振替休日', kind: 'substitute' })
    // 2026年5月3日（憲法記念日）は日曜。4日・5日が祝日なので、6日
    expect(weekdayOf(2026, 5, 3)).toBe(0)
    expect(holidaysInMonth(2026, 5).get(6)).toMatchObject({ kind: 'substitute' })
  })

  it('振替休日は、祝日が日曜日でない年には作られない', () => {
    // 2027年5月は、3日が月曜。振替休日はない
    expect([...holidaysInMonth(2027, 5).keys()]).toEqual([3, 4, 5])
    // 土曜日の祝日は、振り替えない（2026年2月11日は水曜、2027年は木曜、2028年は金曜、2029年は日曜）
    expect(holidaysInMonth(2029, 2).get(12)).toMatchObject({ kind: 'substitute' })
    expect(weekdayOf(2023, 2, 11)).toBe(6)
    expect(holidaysInMonth(2023, 2).has(12)).toBe(false)
    expect(holidaysInMonth(2023, 2).has(13)).toBe(false)
  })

  it('国民の休日: 前の日と次の日が祝日の日（2026年9月22日）', () => {
    const sep = holidaysInMonth(2026, 9)
    expect(sep.get(21)).toMatchObject({ name: '敬老の日' })
    expect(sep.get(22)).toMatchObject({ name: '国民の休日', kind: 'citizens' })
    expect(sep.get(23)).toMatchObject({ name: '秋分の日' })
    // 2027年は、敬老の日が20日・秋分の日が23日で、あいだが2日あくので、できない
    expect([...holidaysInMonth(2027, 9).keys()]).toEqual([20, 23])
  })

  it('月曜に動く祝日は、必ず月曜日になる', () => {
    for (let y = 2022; y <= 2060; y++) {
      for (const name of ['成人の日', '海の日', '敬老の日', 'スポーツの日']) {
        const h = holidaysOfYear(y).find((x) => x.name === name)!
        expect(weekdayOf(y, h.month, h.day)).toBe(1)
      }
    }
  })

  it('同じ日が2回出ない。日付の順に並ぶ', () => {
    for (let y = 2022; y <= 2099; y++) {
      const keys = holidaysOfYear(y).map((h) => h.month * 100 + h.day)
      expect(new Set(keys).size).toBe(keys.length)
      expect([...keys].sort((a, b) => a - b)).toEqual(keys)
    }
  })

  it('祝日のない月は、空になる（6月と12月）', () => {
    expect(holidaysInMonth(2026, 12).size).toBe(0)
    expect(holidaysInMonth(2027, 6).size).toBe(0)
  })
})

describe('確かめられていない年のあつかい', () => {
  it('春分・秋分の発表がまだの年は、その2日と、そこから決まる休日にだけ「見込み」の印を付ける', () => {
    expect(EQUINOX_ANNOUNCED_THROUGH).toBe(2027)
    const y2028 = holidaysOfYear(2028)
    expect(y2028.filter((h) => h.provisional).map((h) => h.name)).toEqual(['春分の日', '秋分の日'])
    expect(y2028.find((h) => h.name === '元日')!.provisional).toBe(false)
  })
  it('見込みの年は、注意の文を出す。発表済みの年は出さない', () => {
    expect(holidayNotice(2027)).toBeNull()
    expect(holidayNotice(2028)).toContain('見込み')
  })
  it('あつかえない年は、空の一覧と、注意の文を返す（まちがった祝日を出さない）', () => {
    // 2021年は、東京オリンピックで祝日が動いた年。今の決まりでは計算できない
    expect(isHolidayYearSupported(2021)).toBe(false)
    expect(holidaysOfYear(2021)).toEqual([])
    expect(holidaysOfYear(2100)).toEqual([])
    expect(holidayNotice(2100)).toContain('計算できません')
    expect(isHolidayYearSupported(2026.5)).toBe(false)
  })
  it('出典には、文書名・URL・確かめた日が入っている', () => {
    expect(HOLIDAY_SOURCES.length).toBeGreaterThan(0)
    for (const s of HOLIDAY_SOURCES) {
      expect(s.title).not.toBe('')
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(s.checkedOn))).toBe(false)
    }
  })
})
