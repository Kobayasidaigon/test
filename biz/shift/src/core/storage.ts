// 保存の形式と、読み込むときの検査。
//
// 保存する形（ブラウザの保存領域も、書き出すファイルも同じ）:
//   { "app": "tatakidai-shift", "format": 1, "savedAt": "2026-11-14T03:00:00.000Z", "plan": { … } }
//
// 読み込むときは、中身を1つずつ確かめて、確かめた値だけで plan を作り直す。
// 知らない項目は捨てる。合わないところがあれば、どこが合わないかを言って断る（直して読むことはしない。
// 勝手に直すと、利用者の知らないうちに条件が変わった表ができてしまうため）。
import { site } from '@/site.config'
import { daysInMonth, parseTime, prevMonth } from './dates'
import { LIMITS, SHIFT_COLORS, YEAR_MAX, YEAR_MIN } from './types'
import type { Carry, ForbiddenPair, HolidayMode, RoleMin, Rules, Schedule, ShiftColor, ShiftPlan, ShiftType, Staff, Tag, Weekday, Wish } from './types'

/** ファイルが、この道具のものかを見分ける名前 */
export const APP_ID = 'tatakidai-shift'
/** 保存の形式の版。形を変えたら数を上げて、migrate に古い版からの直し方を足す */
export const FORMAT_VERSION = 1
/** ブラウザの保存領域のキー（版つき） */
export const STORAGE_KEY = `${site.slug}:data:v1`

export type SaveFile = { app: typeof APP_ID; format: number; savedAt: string; plan: ShiftPlan }

export type ParseResult = { ok: true; plan: ShiftPlan; savedAt: string | null } | { ok: false; reason: string }

/** 検査で見つけた問題。投げて、いちばん外で受け取る（深い入れ子から抜けるのに使う） */
class Invalid extends Error {}
function fail(message: string): never {
  throw new Invalid(message)
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
// id に使える文字をしぼる。'__proto__' のような名前でオブジェクトの中身を壊されないようにするため
const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/
const BAD_IDS = new Set(['__proto__', 'constructor', 'prototype'])

function obj(v: unknown, where: string): Obj {
  return isObj(v) ? v : fail(`${where}の形が正しくありません。`)
}
function arr(v: unknown, where: string, max: number): unknown[] {
  if (!Array.isArray(v)) return fail(`${where}の形が正しくありません。`)
  if (v.length > max) return fail(`${where}が多すぎます（${max}件まで）。`)
  return v
}
function str(v: unknown, where: string, max: number): string {
  if (typeof v !== 'string') return fail(`${where}が文字ではありません。`)
  if ([...v].length > max) return fail(`${where}が長すぎます（${max}文字まで）。`)
  return v
}
function int(v: unknown, where: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) return fail(`${where}は、${min}〜${max}の整数にしてください。`)
  return v
}
function bool(v: unknown, where: string): boolean {
  return typeof v === 'boolean' ? v : fail(`${where}の形が正しくありません。`)
}
function id(v: unknown, where: string): string {
  if (typeof v !== 'string' || !ID_PATTERN.test(v) || BAD_IDS.has(v)) return fail(`${where}の id が正しくありません。`)
  return v
}
function weekdays(v: unknown, where: string): Weekday[] {
  const list = arr(v, where, 7).map((x) => int(x, where, 0, 6) as Weekday)
  return [...new Set(list)].sort((a, b) => a - b)
}
function uniqueIds(ids: string[], where: string): void {
  if (new Set(ids).size !== ids.length) fail(`${where}に、同じ id が2つあります。`)
}
/** 日（'1'〜'31'）をキーにした入れ物を読む */
function dayKeys(v: unknown, where: string, total: number): Array<[number, unknown]> {
  return Object.entries(obj(v, where)).map(([k, value]) => {
    const day = Number(k)
    if (!/^\d{1,2}$/.test(k) || day < 1 || day > total) fail(`${where}に、この月にない日（${k}）があります。`)
    return [day, value] as [number, unknown]
  })
}

/**
 * plan の中身を確かめる。合っていれば、確かめた値だけで作り直した plan を返す。
 */
export function validatePlan(value: unknown): { ok: true; plan: ShiftPlan } | { ok: false; reason: string } {
  try {
    const p = obj(value, 'データ')
    const year = int(p.year, '年', YEAR_MIN, YEAR_MAX)
    const month = int(p.month, '月', 1, 12)
    const total = daysInMonth(year, month)

    const closedIn = obj(p.closed, '定休日')
    const closedDays = [...new Set(arr(closedIn.days, '個別の定休日', 31).map((d) => int(d, '個別の定休日', 1, total)))].sort((a, b) => a - b)
    const closed = { weekdays: weekdays(closedIn.weekdays, '定休日の曜日'), days: closedDays }

    const holidayMode = p.holidayMode
    if (holidayMode !== 'sunday' && holidayMode !== 'weekday' && holidayMode !== 'closed') fail('祝日のあつかいの形が正しくありません。')

    const shiftTypes: ShiftType[] = arr(p.shiftTypes, '勤務の種類', LIMITS.shiftTypes).map((raw, i) => {
      const s = obj(raw, `勤務の種類（${i + 1}つめ）`)
      const where = `勤務の種類（${i + 1}つめ）`
      const start = str(s.start, `${where}の開始の時刻`, 5)
      const end = str(s.end, `${where}の終了の時刻`, 5)
      if (parseTime(start) === null || parseTime(end) === null) fail(`${where}の時刻は、09:00 のように書いてください。`)
      if (!SHIFT_COLORS.includes(s.color as ShiftColor)) fail(`${where}の色が正しくありません。`)
      return {
        id: id(s.id, where),
        name: str(s.name, `${where}の名前`, LIMITS.nameLength),
        symbol: str(s.symbol, `${where}の記号`, LIMITS.symbolLength),
        start,
        end,
        breakMinutes: int(s.breakMinutes, `${where}の休憩`, 0, 24 * 60),
        color: s.color as ShiftColor,
      }
    })
    uniqueIds(shiftTypes.map((s) => s.id), '勤務の種類')
    const shiftIds = new Set(shiftTypes.map((s) => s.id))
    const shiftRef = (v: unknown, where: string): string => {
      const x = id(v, where)
      return shiftIds.has(x) ? x : fail(`${where}が、ない勤務の種類を指しています。`)
    }

    const tags: Tag[] = arr(p.tags, '役割の札', LIMITS.tags).map((raw, i) => {
      const t = obj(raw, `役割の札（${i + 1}つめ）`)
      return { id: id(t.id, `役割の札（${i + 1}つめ）`), name: str(t.name, `役割の札（${i + 1}つめ）の名前`, LIMITS.nameLength) }
    })
    uniqueIds(tags.map((t) => t.id), '役割の札')
    const tagIds = new Set(tags.map((t) => t.id))

    const staff: Staff[] = arr(p.staff, 'スタッフ', LIMITS.staff).map((raw, i) => {
      const where = `スタッフ（${i + 1}人め）`
      const s = obj(raw, where)
      const cannotWork: Staff['cannotWork'] = {}
      for (const [k, v] of Object.entries(obj(s.cannotWork, `${where}の入れない勤務`))) {
        const list = weekdays(v, `${where}の入れない勤務`)
        if (list.length > 0) cannotWork[shiftRef(k, `${where}の入れない勤務`)] = list
      }
      const days = (v: unknown, w: string) => (v === null ? null : int(v, w, 0, 31))
      const tagList = arr(s.tagIds, `${where}の役割の札`, LIMITS.tags).map((t) => {
        const x = id(t, `${where}の役割の札`)
        return tagIds.has(x) ? x : fail(`${where}が、ない役割の札を指しています。`)
      })
      return {
        id: id(s.id, where),
        name: str(s.name, `${where}の名前`, LIMITS.nameLength),
        tagIds: [...new Set(tagList)],
        fixedOffWeekdays: weekdays(s.fixedOffWeekdays, `${where}の固定の休み`),
        cannotWork,
        minDays: days(s.minDays, `${where}の勤務日数の下限`),
        maxDays: days(s.maxDays, `${where}の勤務日数の上限`),
      }
    })
    uniqueIds(staff.map((s) => s.id), 'スタッフ')
    const staffIds = new Set(staff.map((s) => s.id))
    const staffRef = (v: string, where: string): string => (ID_PATTERN.test(v) && staffIds.has(v) ? v : fail(`${where}が、いないスタッフを指しています。`))

    const needsIn = obj(p.needs, '必要な人数')
    const weekly: Record<string, number[]> = {}
    for (const [k, v] of Object.entries(obj(needsIn.weekly, '曜日ごとの必要人数'))) {
      const row = arr(v, '曜日ごとの必要人数', 7)
      if (row.length !== 7) fail('曜日ごとの必要人数は、日曜から土曜までの7つにしてください。')
      weekly[shiftRef(k, '曜日ごとの必要人数')] = row.map((n) => int(n, '必要な人数', 0, LIMITS.needPerShift))
    }
    const overrides: Record<string, Record<string, number>> = {}
    for (const [day, v] of dayKeys(needsIn.overrides, '日ごとの必要人数', total)) {
      const row: Record<string, number> = {}
      for (const [k, n] of Object.entries(obj(v, '日ごとの必要人数'))) row[shiftRef(k, '日ごとの必要人数')] = int(n, '必要な人数', 0, LIMITS.needPerShift)
      if (Object.keys(row).length > 0) overrides[String(day)] = row
    }
    const roleMins: RoleMin[] = arr(needsIn.roleMins, '役割の最低人数', LIMITS.roleMins).map((raw, i) => {
      const where = `役割の最低人数（${i + 1}つめ）`
      const r = obj(raw, where)
      const tagId = id(r.tagId, where)
      if (!tagIds.has(tagId)) fail(`${where}が、ない役割の札を指しています。`)
      return { id: id(r.id, where), shiftId: shiftRef(r.shiftId, where), tagId, count: int(r.count, `${where}の人数`, 1, LIMITS.needPerShift) }
    })
    uniqueIds(roleMins.map((r) => r.id), '役割の最低人数')

    const wishes: ShiftPlan['wishes'] = {}
    for (const [sid, v] of Object.entries(obj(p.wishes, '希望'))) {
      const row: Record<string, Wish> = {}
      for (const [day, raw] of dayKeys(v, '希望', total)) {
        const w = obj(raw, '希望')
        if (w.kind === 'off') row[String(day)] = { kind: 'off' }
        else if (w.kind === 'shift') row[String(day)] = { kind: 'shift', shiftId: shiftRef(w.shiftId, '希望') }
        else fail('希望の形が正しくありません。')
      }
      if (Object.keys(row).length > 0) wishes[staffRef(sid, '希望')] = row
    }

    const rulesIn = obj(p.rules, '条件')
    const forbiddenPairs: ForbiddenPair[] = arr(rulesIn.forbiddenPairs, '続けて入れない組み合わせ', LIMITS.forbiddenPairs).map((raw, i) => {
      const where = `続けて入れない組み合わせ（${i + 1}つめ）`
      const f = obj(raw, where)
      return { id: id(f.id, where), first: shiftRef(f.first, where), next: shiftRef(f.next, where) }
    })
    uniqueIds(forbiddenPairs.map((f) => f.id), '続けて入れない組み合わせ')
    const rules: Rules = {
      maxConsecutive: rulesIn.maxConsecutive === null ? null : int(rulesIn.maxConsecutive, '連続勤務の上限', 1, 31),
      forbiddenPairs,
      weeklyDayOff: bool(rulesIn.weeklyDayOff, '毎週1日の休み'),
      weekStart: int(rulesIn.weekStart, '週の始まりの曜日', 0, 6) as Weekday,
      balanceWeekend: bool(rulesIn.balanceWeekend, '土日祝の公平さ'),
      balanceShiftIds: [...new Set(arr(rulesIn.balanceShiftIds, '均等にしたい勤務', LIMITS.shiftTypes).map((v) => shiftRef(v, '均等にしたい勤務')))],
    }

    const schedIn = obj(p.schedule, 'シフト表')
    const work: Schedule['work'] = {}
    for (const [sid, v] of Object.entries(obj(schedIn.work, 'シフト表'))) {
      const row: Record<string, string> = {}
      for (const [day, raw] of dayKeys(v, 'シフト表', total)) row[String(day)] = shiftRef(raw, 'シフト表のマス')
      if (Object.keys(row).length > 0) work[staffRef(sid, 'シフト表')] = row
    }
    const locked: Schedule['locked'] = {}
    for (const [sid, v] of Object.entries(obj(schedIn.locked, '固定したマス'))) {
      const days = [...new Set(arr(v, '固定したマス', 31).map((d) => int(d, '固定したマス', 1, total)))].sort((a, b) => a - b)
      if (days.length > 0) locked[staffRef(sid, '固定したマス')] = days
    }
    const seed = schedIn.seed === null ? null : int(schedIn.seed, '乱数の種', 0, 0xffffffff)

    let carry: Carry | null = null
    if (p.carry !== null && p.carry !== undefined) {
      const c = obj(p.carry, '前の月の勤務')
      const prev = prevMonth(year, month)
      const cy = int(c.year, '前の月の年', YEAR_MIN - 1, YEAR_MAX)
      const cm = int(c.month, '前の月', 1, 12)
      if (cy !== prev.year || cm !== prev.month) fail('前の月の勤務が、この月の1つ前の月のものではありません。')
      const tail: Carry['tail'] = {}
      for (const [sid, v] of Object.entries(obj(c.tail, '前の月の勤務'))) {
        // 前の月にあって今はない勤務の種類が入っていてもよい（「勤務していた」ことだけを使う）
        tail[staffRef(sid, '前の月の勤務')] = arr(v, '前の月の勤務', LIMITS.carryTail).map((x) => (x === null ? null : str(x, '前の月の勤務', 40)))
      }
      carry = { year: cy, month: cm, tail }
    }

    const plan: ShiftPlan = {
      storeName: str(p.storeName, '店の名前', LIMITS.nameLength),
      year,
      month,
      closed,
      holidayMode: holidayMode as HolidayMode,
      shiftTypes,
      tags,
      staff,
      needs: { weekly, overrides, roleMins },
      wishes,
      rules,
      schedule: { work, locked, seed },
      carry,
    }
    return { ok: true, plan }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, reason: e.message }
    return { ok: false, reason: 'データの形が正しくありません。' }
  }
}

/** 保存する文字列を作る。now は保存した時刻（テストでは決まった時刻をわたす） */
export function serializePlan(plan: ShiftPlan, now: Date = new Date()): string {
  const file: SaveFile = { app: APP_ID, format: FORMAT_VERSION, savedAt: now.toISOString(), plan }
  return JSON.stringify(file)
}

/** 古い版の plan を、いまの版の形に直す。いまは版が1つだけなので、何もしない */
function migrate(plan: unknown, _format: number): unknown {
  return plan
}

/**
 * 保存した文字列（ファイルの中身、または保存領域の値）を読む。
 * 合わないときは、理由の文を返す（そのまま画面に出せる）。
 */
export function parsePlanText(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'ファイルを読めませんでした。この道具で書き出したファイル（.json）を選んでください。' }
  }
  if (!isObj(data) || data.app !== APP_ID) {
    return { ok: false, reason: `${site.name}のファイルではないようです。この道具で書き出したファイルを選んでください。` }
  }
  if (typeof data.format !== 'number' || !Number.isInteger(data.format) || data.format < 1) {
    return { ok: false, reason: 'ファイルの版がわかりません。この道具で書き出したファイルを選んでください。' }
  }
  if (data.format > FORMAT_VERSION) {
    return { ok: false, reason: 'このファイルは、新しい版の道具で作られています。ページを読み込み直して、最新の道具で開いてください。' }
  }
  const result = validatePlan(migrate(data.plan, data.format))
  if (!result.ok) return { ok: false, reason: `ファイルの中身に、読めないところがあります: ${result.reason}` }
  return { ok: true, plan: result.plan, savedAt: typeof data.savedAt === 'string' ? data.savedAt : null }
}

/** localStorage と同じ形の保存領域（テストでは、にせものをわたす） */
export type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export type LoadResult =
  /** 保存されたものがない（はじめて開いた） */
  | { status: 'empty' }
  | { status: 'ok'; plan: ShiftPlan; savedAt: string | null }
  /** 保存されていたが、読めなかった。raw は保存されていた文字（利用者がファイルとして取り出せるように返す） */
  | { status: 'broken'; reason: string; raw: string }
  /** 保存領域そのものが使えない（プライベートブラウズなど） */
  | { status: 'unavailable' }

/** 保存領域から読む。壊れていても、例外を出さない */
export function loadPlan(storage: StorageLike): LoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'empty' }
  const r = parsePlanText(raw)
  return r.ok ? { status: 'ok', plan: r.plan, savedAt: r.savedAt } : { status: 'broken', reason: r.reason, raw }
}

/** 保存領域に書く。書けたら true（容量いっぱい、保存領域が使えない、などのときは false） */
export function savePlan(storage: StorageLike, plan: ShiftPlan, now: Date = new Date()): boolean {
  try {
    storage.setItem(STORAGE_KEY, serializePlan(plan, now))
    return true
  } catch {
    return false
  }
}

/** 保存領域から消す（「はじめからやり直す」用） */
export function clearPlan(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // 使えない保存領域では、消すものもない
  }
}

/** 書き出すファイル（名前と中身）を作る。画面では browser.ts の downloadText にわたす */
export function buildExportFile(plan: ShiftPlan, now: Date = new Date()): { filename: string; text: string; mime: string } {
  const store = plan.storeName.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '')
  const filename = `${site.name}_${plan.year}年${String(plan.month).padStart(2, '0')}月${store ? `_${store}` : ''}.json`
  // 人が開いて見られるよう、ファイルは字下げして書く
  const file: SaveFile = { app: APP_ID, format: FORMAT_VERSION, savedAt: now.toISOString(), plan }
  return { filename, text: JSON.stringify(file, null, 2), mime: 'application/json' }
}
