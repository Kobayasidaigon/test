import { describe, expect, it, vi } from 'vitest'
import { carryToNextMonth } from './carry'
import { makeSample, SAMPLES } from './samples'
import { emptySchedule, setCell } from './schedule'
import { solve } from './solver'
import { APP_ID, buildExportFile, clearPlan, FORMAT_VERSION, loadPlan, parsePlanText, savePlan, serializePlan, STORAGE_KEY, validatePlan, type StorageLike } from './storage'
import { randomPlan, tinyPlan, workOn } from './testkit'
import type { ShiftPlan } from './types'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

const NOW = new Date('2026-11-14T03:00:00.000Z')

/** 正しい plan を写して、1か所だけ壊す */
function broken(change: (p: any) => void, base: ShiftPlan = solvedSample()): unknown {
  const copy = JSON.parse(JSON.stringify(base))
  change(copy)
  return copy
}
function solvedSample(): ShiftPlan {
  const plan = makeSample('salon', 2026, 12)
  return { ...plan, schedule: setCell(solve(plan, { seed: 1, effort: 0.05 }).schedule, 'st1', 3, null) }
}
/** 壊した plan が、理由つきで断られることを確かめる */
function expectRejected(value: unknown, part: string): void {
  const r = validatePlan(value)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.reason).toContain(part)
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
}

describe('保存して、読み直す', () => {
  it('保存領域のキーは、版つき', () => {
    expect(STORAGE_KEY).toBe('shift:data:v1')
  })

  it('サンプルを保存して読み直すと、まったく同じ plan になる', () => {
    for (const s of SAMPLES) {
      const plan = makeSample(s.id, 2026, 12)
      const solved = { ...plan, schedule: solve(plan, { seed: 1, effort: 0.05 }).schedule }
      const r = parsePlanText(serializePlan(solved, NOW))
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.plan).toEqual(solved)
        expect(r.savedAt).toBe('2026-11-14T03:00:00.000Z')
      }
    }
  })

  it('でたらめに作った plan（表・固定・引き継ぎつき）でも、同じ plan に戻る', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = randomPlan({ seed, staff: 1 + (seed % 9), month: 1 + (seed % 12), year: 2027 })
      let schedule = solve(plan, { seed, effort: 0.02 }).schedule
      schedule = setCell(schedule, plan.staff[0].id, 2, null)
      const withCarry = carryToNextMonth({ ...plan, schedule })
      for (const p of [{ ...plan, schedule }, withCarry]) {
        const r = parsePlanText(serializePlan(p, NOW))
        if (!r.ok) throw new Error(`seed ${seed}: ${r.reason}`)
        expect(r.plan).toEqual(p)
      }
    }
  })

  it('空の plan（スタッフなし、勤務の種類なし）も保存できる', () => {
    const plan = tinyPlan({ staff: [], shiftTypes: [], tags: [], needs: { weekly: {}, overrides: {}, roleMins: [] } })
    const r = parsePlanText(serializePlan(plan, NOW))
    expect(r.ok && r.plan).toEqual(plan)
  })

  it('知らない項目は捨てる', () => {
    const r = validatePlan(broken((p) => {
      p.extra = 'x'
      p.staff[0].memo = 'y'
    }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect('extra' in r.plan).toBe(false)
      expect('memo' in r.plan.staff[0]).toBe(false)
    }
  })

  it('重なった曜日や日は、1つにまとめて並べ直す', () => {
    const r = validatePlan(broken((p) => {
      p.closed.weekdays = [2, 0, 2]
      p.closed.days = [9, 3, 9]
      p.schedule.locked.st1 = [5, 3, 5]
    }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.plan.closed).toEqual({ weekdays: [0, 2], days: [3, 9] })
      expect(r.plan.schedule.locked.st1).toEqual([3, 5])
    }
  })
})

describe('ファイルを読み込むときの検査: この道具のファイルでなければ、理由を言って断る', () => {
  const reason = (text: string) => {
    const r = parsePlanText(text)
    return r.ok ? '(読めてしまった)' : r.reason
  }

  it('JSON でない', () => {
    expect(reason('これは文章です')).toContain('ファイルを読めませんでした')
    expect(reason('')).toContain('ファイルを読めませんでした')
    expect(reason('{"app":')).toContain('ファイルを読めませんでした')
  })
  it('JSON だが、この道具のものではない', () => {
    expect(reason('{}')).toContain('たたき台シフトのファイルではない')
    expect(reason('[]')).toContain('たたき台シフトのファイルではない')
    expect(reason('null')).toContain('たたき台シフトのファイルではない')
    expect(reason('42')).toContain('たたき台シフトのファイルではない')
    expect(reason(JSON.stringify({ app: 'other-tool', format: 1, plan: {} }))).toContain('たたき台シフトのファイルではない')
  })
  it('版がない、版がおかしい', () => {
    expect(reason(JSON.stringify({ app: APP_ID, plan: {} }))).toContain('版がわかりません')
    expect(reason(JSON.stringify({ app: APP_ID, format: '1', plan: {} }))).toContain('版がわかりません')
    expect(reason(JSON.stringify({ app: APP_ID, format: 0, plan: {} }))).toContain('版がわかりません')
    expect(reason(JSON.stringify({ app: APP_ID, format: 1.5, plan: {} }))).toContain('版がわかりません')
  })
  it('この道具より新しい版で作られたファイル', () => {
    expect(reason(JSON.stringify({ app: APP_ID, format: FORMAT_VERSION + 1, plan: {} }))).toContain('新しい版の道具で作られています')
  })
  it('中身がない、中身の形が違う', () => {
    expect(reason(JSON.stringify({ app: APP_ID, format: 1 }))).toContain('読めないところがあります')
    expect(reason(JSON.stringify({ app: APP_ID, format: 1, plan: [] }))).toContain('読めないところがあります')
    expect(reason(JSON.stringify({ app: APP_ID, format: 1, plan: { year: 2026 } }))).toContain('読めないところがあります')
  })
  it('保存した時刻がなくても、中身が正しければ読める', () => {
    const r = parsePlanText(JSON.stringify({ app: APP_ID, format: 1, plan: tinyPlan() }))
    expect(r).toMatchObject({ ok: true, savedAt: null })
  })
})

describe('中身の検査: 1か所でも合わなければ、どこが合わないかを言って断る', () => {
  it('正しい plan は通る', () => {
    expect(validatePlan(solvedSample()).ok).toBe(true)
    expect(validatePlan(tinyPlan()).ok).toBe(true)
  })

  it('年月', () => {
    expectRejected(broken((p) => (p.year = 2021)), '年は')
    expectRejected(broken((p) => (p.year = 2100)), '年は')
    expectRejected(broken((p) => (p.year = '2026')), '年は')
    expectRejected(broken((p) => (p.month = 0)), '月は')
    expectRejected(broken((p) => (p.month = 13)), '月は')
    expectRejected(broken((p) => (p.month = 6.5)), '月は')
    expectRejected(broken((p) => delete p.month), '月は')
  })

  it('定休日', () => {
    expectRejected(broken((p) => (p.closed.weekdays = [7])), '定休日の曜日')
    expectRejected(broken((p) => (p.closed.weekdays = 'tue')), '定休日の曜日')
    expectRejected(broken((p) => (p.closed.days = [0])), '個別の定休日')
    expectRejected(broken((p) => (p.closed.days = [32])), '個別の定休日')
    expectRejected(broken((p) => delete p.closed), '定休日')
    expectRejected(broken((p) => (p.holidayMode = 'open')), '祝日のあつかい')
  })

  it('その月にない日（11月の31日）は断る', () => {
    const nov = tinyPlan({ month: 11 })
    expectRejected(broken((p) => (p.closed.days = [31]), nov), '個別の定休日')
    expectRejected(broken((p) => (p.wishes = { st1: { '31': { kind: 'off' } } }), nov), 'この月にない日（31）')
    expectRejected(broken((p) => (p.schedule.work = { st1: { '31': 'sh1' } }), nov), 'この月にない日（31）')
    expectRejected(broken((p) => (p.needs.overrides = { '31': { sh1: 2 } }), nov), 'この月にない日（31）')
    expectRejected(broken((p) => (p.schedule.locked = { st1: [31] }), nov), '固定したマス')
    // 30日は通る
    expect(validatePlan(broken((p) => (p.closed.days = [30]), nov)).ok).toBe(true)
  })

  it('日のキーが数字でない', () => {
    expectRejected(broken((p) => (p.wishes = { st1: { 'x': { kind: 'off' } } })), 'この月にない日')
    expectRejected(broken((p) => (p.wishes = { st1: { '1.5': { kind: 'off' } } })), 'この月にない日')
    expectRejected(broken((p) => (p.wishes = { st1: { '-1': { kind: 'off' } } })), 'この月にない日')
  })

  it('勤務の種類', () => {
    expectRejected(broken((p) => (p.shiftTypes[0].start = '25:00')), '時刻')
    expectRejected(broken((p) => (p.shiftTypes[0].end = '9時')), '時刻')
    expectRejected(broken((p) => (p.shiftTypes[0].color = 'rainbow')), '色')
    expectRejected(broken((p) => (p.shiftTypes[0].symbol = 'あいう')), '記号が長すぎます')
    expectRejected(broken((p) => (p.shiftTypes[0].name = 'あ'.repeat(41))), '名前が長すぎます')
    expectRejected(broken((p) => (p.shiftTypes[0].breakMinutes = -1)), '休憩')
    expectRejected(broken((p) => (p.shiftTypes[1].id = p.shiftTypes[0].id)), '同じ id')
    expectRejected(broken((p) => (p.shiftTypes[0].id = '__proto__')), 'id が正しくありません')
    expectRejected(broken((p) => (p.shiftTypes[0].id = 'a b')), 'id が正しくありません')
    expectRejected(broken((p) => (p.shiftTypes = new Array(9).fill(p.shiftTypes[0]))), '多すぎます')
  })

  it('絵文字1文字の記号は、1文字として数える', () => {
    expect(validatePlan(broken((p) => (p.shiftTypes[0].symbol = '🌙🌙'))).ok).toBe(true)
  })

  it('スタッフ', () => {
    expectRejected(broken((p) => (p.staff[0].name = 5)), '名前が文字ではありません')
    expectRejected(broken((p) => (p.staff[0].tagIds = ['nothing'])), 'ない役割の札')
    expectRejected(broken((p) => (p.staff[0].fixedOffWeekdays = [9])), '固定の休み')
    expectRejected(broken((p) => (p.staff[0].cannotWork = { nothing: [1] })), 'ない勤務の種類')
    expectRejected(broken((p) => (p.staff[0].cannotWork = { sh1: [8] })), '入れない勤務')
    expectRejected(broken((p) => (p.staff[0].minDays = -1)), '下限')
    expectRejected(broken((p) => (p.staff[0].maxDays = 32)), '上限')
    expectRejected(broken((p) => (p.staff[0].maxDays = '20')), '上限')
    expectRejected(broken((p) => (p.staff[1].id = p.staff[0].id)), '同じ id')
    expectRejected(broken((p) => delete p.staff), 'スタッフ')
    expectRejected(broken((p) => (p.staff = new Array(101).fill(0).map((_, i) => ({ ...p.staff[0], id: `x${i}` })))), '多すぎます')
  })

  it('必要な人数', () => {
    expectRejected(broken((p) => (p.needs.weekly.sh1 = [1, 1, 1])), '7つ')
    expectRejected(broken((p) => (p.needs.weekly.sh1[0] = -1)), '必要な人数')
    expectRejected(broken((p) => (p.needs.weekly.sh1[0] = 1.5)), '必要な人数')
    expectRejected(broken((p) => (p.needs.weekly.sh1[0] = 61)), '必要な人数')
    expectRejected(broken((p) => (p.needs.weekly.nothing = [1, 1, 1, 1, 1, 1, 1])), 'ない勤務の種類')
    expectRejected(broken((p) => (p.needs.overrides = { '1': { nothing: 1 } })), 'ない勤務の種類')
    expectRejected(broken((p) => (p.needs.roleMins[0].tagId = 'nothing')), 'ない役割の札')
    expectRejected(broken((p) => (p.needs.roleMins[0].shiftId = 'nothing')), 'ない勤務の種類')
    expectRejected(broken((p) => (p.needs.roleMins[0].count = 0)), '人数')
  })

  it('希望', () => {
    expectRejected(broken((p) => (p.wishes = { nobody: { '1': { kind: 'off' } } })), 'いないスタッフ')
    expectRejected(broken((p) => (p.wishes = { st1: { '1': { kind: 'maybe' } } })), '希望の形')
    expectRejected(broken((p) => (p.wishes = { st1: { '1': { kind: 'shift', shiftId: 'nothing' } } })), 'ない勤務の種類')
    expectRejected(broken((p) => (p.wishes = { st1: { '1': 'off' } })), '希望の形')
    expectRejected(broken((p) => (p.wishes = [])), '希望の形')
  })

  it('条件', () => {
    expectRejected(broken((p) => (p.rules.maxConsecutive = 0)), '連続勤務の上限')
    expectRejected(broken((p) => (p.rules.maxConsecutive = 32)), '連続勤務の上限')
    expectRejected(broken((p) => (p.rules.forbiddenPairs[0].next = 'nothing')), 'ない勤務の種類')
    expectRejected(broken((p) => (p.rules.weeklyDayOff = 'yes')), '毎週1日の休み')
    expectRejected(broken((p) => (p.rules.weekStart = 7)), '週の始まり')
    expectRejected(broken((p) => (p.rules.balanceShiftIds = ['nothing'])), 'ない勤務の種類')
    expectRejected(broken((p) => delete p.rules), '条件')
    // 上限なし（null）と、上限1日・31日は通る
    for (const v of [null, 1, 31]) expect(validatePlan(broken((p) => (p.rules.maxConsecutive = v))).ok).toBe(true)
  })

  it('シフト表', () => {
    expectRejected(broken((p) => (p.schedule.work = { nobody: { '1': 'sh1' } })), 'いないスタッフ')
    expectRejected(broken((p) => (p.schedule.work = { st1: { '1': 'nothing' } })), 'ない勤務の種類')
    expectRejected(broken((p) => (p.schedule.locked = { nobody: [1] })), 'いないスタッフ')
    expectRejected(broken((p) => (p.schedule.locked = { st1: [0] })), '固定したマス')
    expectRejected(broken((p) => (p.schedule.seed = 1.5)), '乱数の種')
    expectRejected(broken((p) => delete p.schedule), 'シフト表')
  })

  it('前の月の勤務', () => {
    const jan = carryToNextMonth({ ...tinyPlan(), schedule: workOn(emptySchedule(), 'st1', 'sh1', [31]) })
    expect(validatePlan(jan).ok).toBe(true)
    expectRejected(broken((p) => (p.carry.month = 11), jan), '1つ前の月')
    expectRejected(broken((p) => (p.carry.year = 2027), jan), '1つ前の月')
    expectRejected(broken((p) => (p.carry.tail.nobody = [null]), jan), 'いないスタッフ')
    expectRejected(broken((p) => (p.carry.tail.st1 = new Array(32).fill(null)), jan), '多すぎます')
    expectRejected(broken((p) => (p.carry.tail.st1 = [1]), jan), '前の月の勤務')
    // 前の月にあって今はない勤務の種類が入っていても、通す
    expect(validatePlan(broken((p) => (p.carry.tail.st1 = ['old-shift', null]), jan)).ok).toBe(true)
    // carry がないファイル（null でも、項目ごとなくても）は「引き継ぎなし」
    expect(validatePlan(broken((p) => delete p.carry, jan))).toMatchObject({ ok: true, plan: { carry: null } })
  })

  it('形そのものが違う', () => {
    for (const v of [null, undefined, 1, 'x', [], true]) expectRejected(v, 'データの形')
  })
})

describe('ブラウザの保存領域', () => {
  it('何も保存されていなければ empty', () => {
    expect(loadPlan(memoryStorage())).toEqual({ status: 'empty' })
  })
  it('保存したものを、読み直せる', () => {
    const storage = memoryStorage()
    const plan = solvedSample()
    expect(savePlan(storage, plan, NOW)).toBe(true)
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY])
    expect(loadPlan(storage)).toEqual({ status: 'ok', plan, savedAt: '2026-11-14T03:00:00.000Z' })
  })
  it('壊れたデータが入っていても落ちず、理由と、もとの文字を返す（利用者が取り出せるように）', () => {
    for (const raw of ['{こわれた', '{}', 'null', JSON.stringify({ app: APP_ID, format: 1, plan: { year: 1 } })]) {
      const r = loadPlan(memoryStorage({ [STORAGE_KEY]: raw }))
      expect(r.status).toBe('broken')
      if (r.status === 'broken') {
        expect(r.raw).toBe(raw)
        expect(r.reason).not.toBe('')
      }
    }
  })
  it('保存領域から読めなかったときの理由は、「ファイルを選んでください」とは言わない（ファイルを選ぶ場面ではないため）', () => {
    const reasonOf = (raw: string) => {
      const r = loadPlan(memoryStorage({ [STORAGE_KEY]: raw }))
      return r.status === 'broken' ? r.reason : '(読めてしまった)'
    }
    const cases: Array<[string, string]> = [
      ['{こわれた', '保存されていた内容が壊れていて'],
      ['{}', '保存されていた内容が、たたき台シフトのものではありません'],
      [JSON.stringify({ app: APP_ID, plan: {} }), '保存されていた内容の版が'],
      [JSON.stringify({ app: APP_ID, format: FORMAT_VERSION + 1, plan: {} }), '新しい版の道具で作られています'],
      [JSON.stringify({ app: APP_ID, format: 1, plan: { year: 1 } }), '保存されていた内容に、読めないところがあります: 年は'],
    ]
    for (const [raw, part] of cases) {
      expect(reasonOf(raw)).toContain(part)
      expect(reasonOf(raw)).not.toContain('ファイル')
    }
    // 同じ中身でも、ファイルとして読んだときは、ファイルの話として言う
    const asFile = parsePlanText('{}')
    expect(asFile.ok ? '' : asFile.reason).toContain('ファイルではないようです')
  })
  it('保存領域そのものが使えなくても落ちない', () => {
    const dead: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(loadPlan(dead)).toEqual({ status: 'unavailable' })
    expect(savePlan(dead, tinyPlan(), NOW)).toBe(false)
    expect(() => clearPlan(dead)).not.toThrow()
  })
  it('消すと、empty に戻る', () => {
    const storage = memoryStorage()
    savePlan(storage, tinyPlan(), NOW)
    clearPlan(storage)
    expect(loadPlan(storage)).toEqual({ status: 'empty' })
  })
})

describe('ファイルへの書き出し', () => {
  it('書き出したファイルを、そのまま読み込める', () => {
    const plan = solvedSample()
    const file = buildExportFile(plan, NOW)
    expect(file.mime).toBe('application/json')
    expect(file.filename).toBe('たたき台シフト_2026年12月_サンプル美容室.json')
    const r = parsePlanText(file.text)
    expect(r.ok && r.plan).toEqual(plan)
  })
  it('店の名前が空でも、ファイルの名前に使えない文字が入っていても、名前を作れる', () => {
    expect(buildExportFile(tinyPlan({ storeName: '' }), NOW).filename).toBe('たたき台シフト_2026年12月.json')
    expect(buildExportFile(tinyPlan({ storeName: 'a/b:c' }), NOW).filename).toBe('たたき台シフト_2026年12月_a_b_c.json')
  })
  it('ファイルの中に、道具の名前・版・保存した時刻が入っている', () => {
    const data = JSON.parse(buildExportFile(tinyPlan(), NOW).text)
    expect(data).toMatchObject({ app: 'tatakidai-shift', format: 1, savedAt: '2026-11-14T03:00:00.000Z' })
  })
})
