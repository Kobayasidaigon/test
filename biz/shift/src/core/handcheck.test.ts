// 仕上げの点検で足したテスト。答えを、先に紙の上で（手で）出してから、計算と比べる。
// ほかのテストは「決まりどおりに動くか」を1つずつ見ている。ここでは、小さな店をまるごと1つ作って、
// 「手で数えた答え」と、自動作成・点検・説明・集計・貼り付けの結果が合うかを見る。
import { describe, expect, it } from 'vitest'
import { checkPlan } from './check'
import { toCsv } from './csv'
import { weekdayOf } from './dates'
import { explainShortages, suggestRelaxations } from './explain'
import { holidaysOfYear } from './holidays'
import { parseWishPaste } from './paste'
import { precheck } from './precheck'
import { solve } from './solver'
import { summarize } from './stats'
import { range, tinyPlan, workOn } from './testkit'
import type { ShiftPlan, Wish } from './types'

const off = (days: number[]): Record<string, Wish> => Object.fromEntries(days.map((d) => [String(d), { kind: 'off' } as Wish]))

/**
 * 2人の店。早番が毎日1人要る（2026年12月、31日）。
 * 青木さんは1〜15日が休み希望、石川さんは16〜31日が休み希望。
 * → 1〜15日は石川さんだけ、16〜31日は青木さんだけが入れる。
 */
function twoPeople(maxConsecutive: number | null): ShiftPlan {
  const base = tinyPlan()
  return {
    ...base,
    staff: base.staff.slice(0, 2),
    wishes: { st1: off(range(1, 15)), st2: off(range(16, 31)) },
    rules: { ...base.rules, maxConsecutive },
  }
}

describe('手で数えた答えと合うか: 2人の店', () => {
  it('連勤の上限がなければ、足りない日は0（石川さんが1〜15日、青木さんが16〜31日）', () => {
    const plan = twoPeople(null)
    const r = solve(plan, { seed: 1 })
    expect(r.check.violations).toEqual([])
    expect(r.check.missingTotal).toBe(0)
    expect(Object.keys(r.schedule.work.st2).map(Number).sort((a, b) => a - b)).toEqual(range(1, 15))
    expect(Object.keys(r.schedule.work.st1).map(Number).sort((a, b) => a - b)).toEqual(range(16, 31))
  })

  it('連勤の上限が5日なら、足りない日は、どう組んでも4日（15日間に休みが2回、16日間に休みが2回要る）', () => {
    // 手の計算: 15日間を1回の休みで分けると、どちらかが7日以上続く（7 + 7 = 14）。だから休みは2回（5・5・3）。
    //           16日間を1回の休みで分けると、どちらかが8日以上続く。だから休みは2回（5・5・4）。合わせて4日。
    const plan = twoPeople(5)
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = solve(plan, { seed })
      expect(r.check.violations).toEqual([])
      expect(r.check.missingTotal).toBe(4)
      expect(r.check.shortages.every((s) => s.need === 1 && s.have === 0)).toBe(true)
      // 入っている日数も、手の計算どおり（石川さん13日、青木さん14日）
      expect(Object.keys(r.schedule.work.st2)).toHaveLength(13)
      expect(Object.keys(r.schedule.work.st1)).toHaveLength(14)
    }
  })

  it('足りない日の説明は、「休み希望1人、連勤の上限1人」になる', () => {
    // 石川さんが 1〜5日 と 7〜11日 に入り、6日が空いている表を手で作る
    const plan = twoPeople(5)
    const schedule = workOn(plan.schedule, 'st2', 'sh1', [...range(1, 5), ...range(7, 11)])
    const e = explainShortages(plan, schedule).find((x) => x.day === 6)!
    // 12月6日は日曜（1日が火曜なので）
    expect(weekdayOf(2026, 12, 6)).toBe(0)
    expect(e.text).toBe('12月6日（日）の早番: 必要1人に対して0人です。入れない理由: 休み希望1人、連勤の上限1人。')
  })

  it('提案: 上限を6日にしても4日のまま、7日にすると3日に減る（手の計算どおりのことだけを言う）', () => {
    // 手の計算: 上限6日 → 15日間は 6・6・1（休み2回）、16日間は 6・6・2（休み2回）で、4日のまま。
    //           上限7日 → 15日間は 7・7（休み1回）、16日間は 7・7・… で休み2回。合わせて3日。
    const plan = twoPeople(5)
    const solved = solve(plan, { seed: 1 })
    const r = suggestRelaxations({ ...plan, schedule: solved.schedule }, { effort: 1 })
    expect(r.suggestions.map((s) => [s.label, s.before, s.after])).toEqual([['連勤の上限を7日にする', 4, 3]])
    expect(r.suggestions[0].text).toBe('連勤の上限を7日にすると、足りない人数が、のべ4人から3人に減ります。')
    expect(r.noEffect).toContain('連勤の上限を6日にする')
    // 提案に付いている表を、点検し直しても、言ったとおり
    const again = checkPlan(r.suggestions[0].plan)
    expect(again.violations).toEqual([])
    expect(again.missingTotal).toBe(3)
  })
})

describe('手で数えた答えと合うか: 勤務時間と回数', () => {
  it('早番6時間 × 11回 + 遅番（休憩60分をのぞいて6時間）× 1回 + 通し（休憩90分をのぞいて10時間30分）× 3回 = 103時間30分', () => {
    const base = tinyPlan()
    const plan: ShiftPlan = {
      ...base,
      shiftTypes: [
        { id: 'sh1', name: '早番', symbol: '早', start: '09:00', end: '15:00', breakMinutes: 0, color: 'egg' },
        { id: 'sh2', name: '遅番', symbol: '遅', start: '15:00', end: '22:00', breakMinutes: 60, color: 'sky' },
        { id: 'sh3', name: '通し', symbol: '通', start: '09:00', end: '21:00', breakMinutes: 90, color: 'tomato' },
      ],
    }
    let s = workOn(plan.schedule, 'st1', 'sh1', range(1, 11))
    s = workOn(s, 'st1', 'sh2', [12])
    s = workOn(s, 'st1', 'sh3', [13, 19, 20]) // 13日と20日は日曜、19日は土曜
    const sum = summarize(plan, s).staff[0]
    expect(sum.workDays).toBe(15)
    expect(sum.offDays).toBe(16)
    expect(sum.byShift).toEqual({ sh1: 11, sh2: 1, sh3: 3 })
    expect(sum.minutes).toBe(11 * 360 + 360 + 3 * 630)
    expect(sum.minutes).toBe(103 * 60 + 30)
    // 1〜11日のうち、土日は 5日（土）・6日（日）。12日（土）、13日（日）、19日（土）、20日（日）で、合わせて6回
    expect(sum.weekendHolidayDays).toBe(6)
    // CSV には、時間が小数で出る
    const line = toCsv({ ...plan, schedule: s }).split('\r\n').find((l) => l.startsWith('青木,'))!
    expect(line.endsWith(',15,16,6,11,1,3,103.5')).toBe(true)
  })
})

describe('手で数えた答えと合うか: 2024年の祝日（法律の決まりから、手で出した日付）', () => {
  // 公表の一覧と照らしたのは 2025〜2027年（holidays.test.ts）。ここは、決まり（祝日法 第2条・第3条）を
  // 2024年の暦に手で当てはめた答えと比べる。日曜に当たる祝日が5つあり、振替休日が5日出る年。
  // （この答えは、内閣府の祝日の CSV の2024年の行とも、日付が1日も違わない。2026-11-15 に原文で確かめた）
  //   2月11日（日）→ 12日、5月5日（日）→ 6日、8月11日（日）→ 12日、秋分の日 9月22日（日）→ 23日、11月3日（日）→ 4日
  it('祝日16日 + 振替休日5日 = 21日', () => {
    const got = holidaysOfYear(2024).map((h) => `${h.month}/${h.day} ${h.name}`)
    expect(got).toEqual([
      '1/1 元日',
      '1/8 成人の日',
      '2/11 建国記念の日',
      '2/12 振替休日',
      '2/23 天皇誕生日',
      '3/20 春分の日',
      '4/29 昭和の日',
      '5/3 憲法記念日',
      '5/4 みどりの日',
      '5/5 こどもの日',
      '5/6 振替休日',
      '7/15 海の日',
      '8/11 山の日',
      '8/12 振替休日',
      '9/16 敬老の日',
      '9/22 秋分の日',
      '9/23 振替休日',
      '10/14 スポーツの日',
      '11/3 文化の日',
      '11/4 振替休日',
      '11/23 勤労感謝の日',
    ])
    // 土曜日の祝日（11月23日）は、振り替えない
    expect(weekdayOf(2024, 11, 23)).toBe(6)
  })
})

describe('同じ名前・空の名前', () => {
  it('貼り付け: 同じ名前のスタッフが2人いたら、片方に勝手に入れず、選んでもらう', () => {
    const plan = tinyPlan()
    plan.staff[1].name = '青木' // st1 と st2 が、どちらも「青木」
    const p = parseWishPaste('名前\t1\t2\t3\n青木\t休\t\t×\n上田\t\t希\t', plan)
    expect(p.rows.map((r) => [r.name, r.staffId])).toEqual([
      ['青木', null],
      ['上田', 'st3'],
    ])
    // 数えるのは、当てはまった上田さんのぶんだけ
    expect(p.offCount).toBe(1)
    expect(p.problems.join('')).toContain('同じ名前のスタッフが2人以上います（青木）')
    expect(p.problems.join('')).not.toContain('当てはまらない行')
  })
  it('貼り付け: 同じ名前がなければ、今までどおり当てはまる（全角・空白のちがいは同じ名前とみなす）', () => {
    const plan = tinyPlan()
    plan.staff[1].name = '青木　花' // 「青木」と「青木 花」は別の名前
    const p = parseWishPaste('名前\t1\t2\t3\n青木\t休\t\t\n青木 花\t\t休\t', plan)
    expect(p.rows.map((r) => r.staffId)).toEqual(['st1', 'st2'])
  })
  it('下見: 同じ名前のスタッフと、名前が空のスタッフを知らせる', () => {
    const plan = tinyPlan()
    expect(precheck(plan).warnings).toEqual([])
    plan.staff[1].name = '青木'
    plan.staff[2].name = '  '
    const w = precheck(plan).warnings.join('\n')
    expect(w).toContain('同じ名前のスタッフがいます（青木）')
    expect(w).toContain('名前が空のスタッフが、1人います')
  })
  it('名前が空の勤務は、点検や説明の文で、記号で言う（文の中が空にならない）', () => {
    const plan = tinyPlan()
    plan.shiftTypes[0].name = ''
    plan.wishes = { st1: off([2]) }
    const schedule = workOn(plan.schedule, 'st1', 'sh1', [2])
    expect(checkPlan(plan, schedule).violations[0].message).toBe('青木さん: 12月2日（水）は休み希望ですが、早が入っています。')
    expect(explainShortages(plan, schedule)[0].text.startsWith('12月1日（火）の早: 必要1人に対して0人です。')).toBe(true)
    expect(toCsv(plan).split('\r\n')[2]).toContain('早の回数')
  })
})
