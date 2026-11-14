import { describe, expect, it } from 'vitest'
import { countLocked, emptySchedule, isLocked, isScheduleEmpty, keepLockedOnly, setCell, shiftAt, unlockAll, unlockCell } from './schedule'

describe('シフト表の読み書き', () => {
  it('空の表は、どのマスも休みで、固定もない', () => {
    const s = emptySchedule()
    expect(shiftAt(s, 'st1', 1)).toBeNull()
    expect(isLocked(s, 'st1', 1)).toBe(false)
    expect(isScheduleEmpty(s)).toBe(true)
  })

  it('マスを書くと、そのマスが固定になる。もとの表は変わらない', () => {
    const a = emptySchedule()
    const b = setCell(a, 'st1', 3, 'sh1')
    expect(shiftAt(b, 'st1', 3)).toBe('sh1')
    expect(isLocked(b, 'st1', 3)).toBe(true)
    expect(a).toEqual(emptySchedule())
    expect(isScheduleEmpty(b)).toBe(false)
  })

  it('休みにして固定できる（「この日は必ず休み」）', () => {
    const s = setCell(setCell(emptySchedule(), 'st1', 3, 'sh1'), 'st1', 3, null)
    expect(shiftAt(s, 'st1', 3)).toBeNull()
    expect(isLocked(s, 'st1', 3)).toBe(true)
    expect(s.work).toEqual({})
    expect(isScheduleEmpty(s)).toBe(false)
  })

  it('固定しないで書くこともできる', () => {
    const s = setCell(emptySchedule(), 'st1', 3, 'sh1', false)
    expect(shiftAt(s, 'st1', 3)).toBe('sh1')
    expect(isLocked(s, 'st1', 3)).toBe(false)
    expect(s.locked).toEqual({})
  })

  it('同じマスを2回書いても、固定は1つ。日の順に並ぶ', () => {
    let s = setCell(emptySchedule(), 'st1', 9, 'sh1')
    s = setCell(s, 'st1', 2, 'sh2')
    s = setCell(s, 'st1', 9, 'sh2')
    expect(s.locked).toEqual({ st1: [2, 9] })
    expect(countLocked(s)).toBe(2)
  })

  it('固定を外しても、入っている勤務は残る', () => {
    const s = unlockCell(setCell(emptySchedule(), 'st1', 3, 'sh1'), 'st1', 3)
    expect(shiftAt(s, 'st1', 3)).toBe('sh1')
    expect(isLocked(s, 'st1', 3)).toBe(false)
    expect(s.locked).toEqual({})
    // 固定していないマスを外しても、何も起きない
    expect(unlockCell(s, 'st1', 3)).toBe(s)
  })

  it('すべての固定を外す', () => {
    let s = setCell(emptySchedule(), 'st1', 3, 'sh1')
    s = setCell(s, 'st2', 4, null)
    expect(countLocked(unlockAll(s))).toBe(0)
    expect(shiftAt(unlockAll(s), 'st1', 3)).toBe('sh1')
  })

  it('固定したマスだけを残す（休みの固定も残る）', () => {
    let s = setCell(emptySchedule(), 'st1', 3, 'sh1')
    s = setCell(s, 'st1', 4, 'sh2', false)
    s = setCell(s, 'st2', 5, null)
    const kept = keepLockedOnly(s)
    expect(kept.work).toEqual({ st1: { '3': 'sh1' } })
    expect(kept.locked).toEqual({ st1: [3], st2: [5] })
  })
})
