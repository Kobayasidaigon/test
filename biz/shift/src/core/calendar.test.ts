import { describe, expect, it } from 'vitest'
import { buildCalendar, holidaysClosed, openDayCount } from './calendar'
import { tinyPlan } from './testkit'

const needsA = { weekly: { sh1: [3, 1, 1, 1, 1, 1, 2], sh2: [2, 1, 1, 1, 1, 1, 2] }, overrides: {}, roleMins: [] }

describe('buildCalendar', () => {
  it('月の日数ぶんの日ができる。曜日も合う', () => {
    const cal = buildCalendar(tinyPlan())
    expect(cal).toHaveLength(31)
    expect(cal[0]).toMatchObject({ day: 1, weekday: 2, holiday: null, closed: null })
    expect(cal[30]).toMatchObject({ day: 31, weekday: 4 })
    // 2月（28日・29日）でも合う
    expect(buildCalendar(tinyPlan({ year: 2027, month: 2 }))).toHaveLength(28)
    expect(buildCalendar(tinyPlan({ year: 2028, month: 2 }))).toHaveLength(29)
  })

  it('曜日ごとの必要人数が、その曜日の日に入る', () => {
    const cal = buildCalendar(tinyPlan({ needs: needsA }))
    expect(cal[0].needs).toEqual({ sh1: 1, sh2: 1 }) // 1日（火）
    expect(cal[4].needs).toEqual({ sh1: 2, sh2: 2 }) // 5日（土）
    expect(cal[5].needs).toEqual({ sh1: 3, sh2: 2 }) // 6日（日）
  })

  it('必要人数を書いていない勤務は、0人になる', () => {
    const cal = buildCalendar(tinyPlan({ needs: { weekly: {}, overrides: {}, roleMins: [] } }))
    expect(cal[0].needs).toEqual({ sh1: 0, sh2: 0 })
  })

  it('定休日の曜日は、開けない日になり、必要人数は0人', () => {
    const cal = buildCalendar(tinyPlan({ needs: needsA, closed: { weekdays: [2], days: [] } }))
    expect(cal[0]).toMatchObject({ closed: 'weekday', needs: { sh1: 0, sh2: 0 } })
    expect(cal[1].closed).toBeNull()
    expect(openDayCount(cal)).toBe(31 - 5) // 2026年12月の火曜は5回
  })

  it('個別の定休日は、その日だけ開けない日になる', () => {
    const cal = buildCalendar(tinyPlan({ closed: { weekdays: [], days: [31] } }))
    expect(cal[30].closed).toBe('date')
    expect(cal[29].closed).toBeNull()
  })

  it('土曜・日曜・祝日に、印が付く', () => {
    const cal = buildCalendar(tinyPlan({ year: 2026, month: 9 }))
    expect(cal[4].isWeekendOrHoliday).toBe(true) // 5日（土）
    expect(cal[5].isWeekendOrHoliday).toBe(true) // 6日（日）
    expect(cal[6].isWeekendOrHoliday).toBe(false) // 7日（月）
    expect(cal[20]).toMatchObject({ holiday: '敬老の日', isWeekendOrHoliday: true }) // 21日（月・祝）
    expect(cal[21]).toMatchObject({ holiday: '国民の休日', isWeekendOrHoliday: true })
  })

  describe('祝日のあつかい（2026年9月21日は月曜の祝日）', () => {
    it('sunday: 日曜と同じ人数になる', () => {
      const cal = buildCalendar(tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'sunday' }))
      expect(cal[20]).toMatchObject({ needs: { sh1: 3, sh2: 2 }, needsFrom: 0, closed: null })
    })
    it('weekday: その曜日（月曜）のまま', () => {
      const cal = buildCalendar(tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'weekday' }))
      expect(cal[20]).toMatchObject({ needs: { sh1: 1, sh2: 1 }, needsFrom: 1, closed: null })
    })
    it('closed: 開けない日になる', () => {
      const cal = buildCalendar(tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'closed' }))
      expect(cal[20]).toMatchObject({ needs: { sh1: 0, sh2: 0 }, closed: 'holiday' })
      expect(cal[21].closed).toBe('holiday') // 国民の休日も休み
      expect(cal[23].closed).toBeNull() // 24日（木）は平日
    })
  })

  describe('日曜が定休日で、祝日が「日曜と同じ」のとき（2026年9月21日は月曜の祝日）', () => {
    const sundayClosed = { weekdays: [0 as const], days: [] }
    it('祝日も休みになる（日曜と同じ ＝ 休み。画面から見えない日曜の人数で、開けてしまわない）', () => {
      const plan = tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'sunday', closed: sundayClosed })
      const cal = buildCalendar(plan)
      expect(cal[20]).toMatchObject({ holiday: '敬老の日', closed: 'holiday', needs: { sh1: 0, sh2: 0 } })
      expect(cal[21].closed).toBe('holiday') // 国民の休日
      expect(cal[22].closed).toBe('holiday') // 秋分の日
      expect(cal[23].closed).toBeNull() // 24日（木）は平日
      expect(cal[5].closed).toBe('weekday') // 6日（日）は、定休日の曜日
      expect(holidaysClosed(plan)).toBe(true)
    })
    it('その日だけの人数を書けば、祝日でも開ける日になる。書いていない勤務は0人', () => {
      const cal = buildCalendar(tinyPlan({ year: 2026, month: 9, needs: { ...needsA, overrides: { '21': { sh1: 2 } } }, holidayMode: 'sunday', closed: sundayClosed }))
      expect(cal[20]).toMatchObject({ closed: null, needs: { sh1: 2, sh2: 0 }, overridden: true })
    })
    it('「その曜日のまま」なら、祝日は月曜の人数で開ける', () => {
      const plan = tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'weekday', closed: sundayClosed })
      expect(buildCalendar(plan)[20]).toMatchObject({ closed: null, needs: { sh1: 1, sh2: 1 } })
      expect(holidaysClosed(plan)).toBe(false)
    })
    it('日曜が定休日でなければ、祝日は日曜の人数で開ける（これまでどおり）', () => {
      const plan = tinyPlan({ year: 2026, month: 9, needs: needsA, holidayMode: 'sunday', closed: { weekdays: [2], days: [] } })
      expect(buildCalendar(plan)[20]).toMatchObject({ closed: null, needs: { sh1: 3, sh2: 2 } })
      expect(holidaysClosed(plan)).toBe(false)
    })
    it('「休みにする」なら、日曜が定休日でもなくても、祝日は休み', () => {
      expect(holidaysClosed(tinyPlan({ holidayMode: 'closed' }))).toBe(true)
    })
  })

  describe('日ごとの上書き', () => {
    it('書いた勤務だけ人数が変わり、書いていない勤務は曜日の人数のまま', () => {
      const cal = buildCalendar(tinyPlan({ needs: { ...needsA, overrides: { '1': { sh1: 4 } } } }))
      expect(cal[0]).toMatchObject({ needs: { sh1: 4, sh2: 1 }, overridden: true })
      expect(cal[1].overridden).toBe(false)
    })
    it('0人に上書きできる', () => {
      const cal = buildCalendar(tinyPlan({ needs: { ...needsA, overrides: { '5': { sh1: 0, sh2: 0 } } } }))
      expect(cal[4]).toMatchObject({ needs: { sh1: 0, sh2: 0 }, closed: null })
    })
    it('定休日の曜日でも、上書きを書くと開ける日になる。書いていない勤務は0人', () => {
      const cal = buildCalendar(tinyPlan({ needs: { ...needsA, overrides: { '1': { sh1: 2 } } }, closed: { weekdays: [2], days: [] } }))
      expect(cal[0]).toMatchObject({ closed: null, needs: { sh1: 2, sh2: 0 }, overridden: true })
      expect(cal[7].closed).toBe('weekday') // 次の火曜（8日）は休みのまま
    })
    it('祝日を休みにする設定でも、上書きを書くと開ける日になる', () => {
      const cal = buildCalendar(tinyPlan({ year: 2026, month: 9, needs: { ...needsA, overrides: { '21': { sh2: 1 } } }, holidayMode: 'closed' }))
      expect(cal[20]).toMatchObject({ closed: null, needs: { sh1: 0, sh2: 1 } })
    })
    it('個別の定休日は、上書きより強い', () => {
      const cal = buildCalendar(tinyPlan({ needs: { ...needsA, overrides: { '1': { sh1: 2 } } }, closed: { weekdays: [], days: [1] } }))
      expect(cal[0]).toMatchObject({ closed: 'date', needs: { sh1: 0, sh2: 0 }, overridden: false })
    })
    it('中身が空の上書きは、ないものとしてあつかう', () => {
      const cal = buildCalendar(tinyPlan({ needs: { ...needsA, overrides: { '1': {} } }, closed: { weekdays: [2], days: [] } }))
      expect(cal[0].closed).toBe('weekday')
    })
  })

  it('勤務の種類が1つもなくても、落ちない', () => {
    const cal = buildCalendar(tinyPlan({ shiftTypes: [], needs: { weekly: {}, overrides: {}, roleMins: [] } }))
    expect(cal).toHaveLength(31)
    expect(cal[0].needs).toEqual({})
  })
})
