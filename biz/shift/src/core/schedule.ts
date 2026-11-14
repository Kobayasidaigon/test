// シフト表（Schedule）の読み書き。どれも、もとの表を書き換えずに新しい表を返す（React の state にそのまま入れられる）。
import type { Schedule } from './types'

export function emptySchedule(): Schedule {
  return { work: {}, locked: {}, seed: null }
}

/** そのマスに入っている勤務の種類の id。休みなら null */
export function shiftAt(schedule: Schedule, staffId: string, day: number): string | null {
  return schedule.work[staffId]?.[String(day)] ?? null
}

/** 手で固定したマスか */
export function isLocked(schedule: Schedule, staffId: string, day: number): boolean {
  return schedule.locked[staffId]?.includes(day) ?? false
}

/**
 * マスを書き換える。shiftId が null なら休みにする。
 * lock を true にすると、そのマスは「手で固定したマス」になる（画面でマスを押して変えたときは true にする）。
 */
export function setCell(schedule: Schedule, staffId: string, day: number, shiftId: string | null, lock = true): Schedule {
  const row = { ...(schedule.work[staffId] ?? {}) }
  if (shiftId === null) delete row[String(day)]
  else row[String(day)] = shiftId
  const work = { ...schedule.work, [staffId]: row }
  if (Object.keys(row).length === 0) delete work[staffId]

  const locked = { ...schedule.locked }
  const days = new Set(locked[staffId] ?? [])
  if (lock) days.add(day)
  else days.delete(day)
  if (days.size === 0) delete locked[staffId]
  else locked[staffId] = [...days].sort((a, b) => a - b)

  return { ...schedule, work, locked }
}

/** マスの固定を外す（入っている勤務はそのまま） */
export function unlockCell(schedule: Schedule, staffId: string, day: number): Schedule {
  if (!isLocked(schedule, staffId, day)) return schedule
  const locked = { ...schedule.locked }
  const days = (locked[staffId] ?? []).filter((d) => d !== day)
  if (days.length === 0) delete locked[staffId]
  else locked[staffId] = days
  return { ...schedule, locked }
}

/** すべての固定を外す（入っている勤務はそのまま） */
export function unlockAll(schedule: Schedule): Schedule {
  return { ...schedule, locked: {} }
}

/** 固定したマスだけを残して、ほかを空にする（「残りを組み直す」の前の状態） */
export function keepLockedOnly(schedule: Schedule): Schedule {
  const work: Schedule['work'] = {}
  for (const [staffId, days] of Object.entries(schedule.locked)) {
    for (const day of days) {
      const shiftId = schedule.work[staffId]?.[String(day)]
      if (shiftId) (work[staffId] ??= {})[String(day)] = shiftId
    }
  }
  return { work, locked: schedule.locked, seed: schedule.seed }
}

/** 固定したマスの数 */
export function countLocked(schedule: Schedule): number {
  return Object.values(schedule.locked).reduce((n, days) => n + days.length, 0)
}

/** 勤務が1つも入っておらず、固定もないか */
export function isScheduleEmpty(schedule: Schedule): boolean {
  return Object.keys(schedule.work).length === 0 && countLocked(schedule) === 0
}
