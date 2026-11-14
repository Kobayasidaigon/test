import { describe, expect, it } from 'vitest'
import { csvFileName, csvText, toCsv } from './csv'
import { emptySchedule } from './schedule'
import { tinyPlan, workOn } from './testkit'

describe('csvText', () => {
  it('ふつうの文字は、そのまま', () => {
    expect(csvText('青木')).toBe('青木')
  })
  it('カンマ・引用符・改行をふくむ文字は、引用符で囲む', () => {
    expect(csvText('青木, 花子')).toBe('"青木, 花子"')
    expect(csvText('通称"あお"')).toBe('"通称""あお"""')
    expect(csvText('1行め\n2行め')).toBe('"1行め\n2行め"')
  })
  it('= + - @ で始まる文字は、頭に \' を付けて、Excel の計算式として動かないようにする', () => {
    expect(csvText('=1+1')).toBe("'=1+1")
    expect(csvText('+81')).toBe("'+81")
    expect(csvText('-')).toBe("'-")
    expect(csvText('@name')).toBe("'@name")
    expect(csvText('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`)
  })
})

describe('toCsv', () => {
  const plan = tinyPlan({ closed: { weekdays: [], days: [3] } })
  let schedule = workOn(emptySchedule(), 'st1', 'sh1', [1, 5])
  schedule = workOn(schedule, 'st1', 'sh2', [2])
  const csv = toCsv(plan, schedule)
  const lines = csv.replace(/^﻿/, '').split('\r\n')

  it('先頭に BOM が付き、改行は CRLF（Excel でそのまま開くため）', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.replace(/\r\n/g, '').includes('\n')).toBe(false)
  })
  it('1行めに店の名前と年月', () => {
    expect(lines[0]).toBe('小さな店,2026年12月')
  })
  it('見出しの行に、日と曜日、集計の列がある', () => {
    const head = lines[2].split(',')
    expect(head[0]).toBe('名前')
    expect(head[1]).toBe('1(火)')
    expect(head[31]).toBe('31(木)')
    expect(head.slice(32)).toEqual(['勤務日数', '休みの日数', '土日祝の回数', '早番の回数', '遅番の回数', '勤務時間（時間）'])
  })
  it('スタッフの行: 記号、休み、定休、集計', () => {
    const row = lines[3].split(',')
    expect(row[0]).toBe('青木')
    expect(row.slice(1, 6)).toEqual(['早', '遅', '定休', '休', '早'])
    expect(row.slice(32)).toEqual(['3', '28', '1', '2', '1', '21'])
  })
  it('どの行も、見出しと同じ列の数（スタッフの行）', () => {
    const width = lines[2].split(',').length
    for (const i of [3, 4, 5]) expect(lines[i].split(',')).toHaveLength(width)
  })
  it('下に、勤務ごとの必要な人数と入っている人数、記号の説明が付く', () => {
    expect(lines.find((l) => l.startsWith('早番（必要な人数）'))!.split(',').slice(1, 4)).toEqual(['1', '1', '0'])
    expect(lines.find((l) => l.startsWith('早番（入っている人数）'))!.split(',').slice(1, 4)).toEqual(['1', '0', '0'])
    expect(lines).toContain('早,早番,09:00〜17:00')
  })
  it('祝日には「祝」が付く', () => {
    const sep = toCsv(tinyPlan({ year: 2026, month: 9 }))
    expect(sep).toContain('21(月・祝)')
  })
  it('名前に計算式のような文字が入っていても、文字として出す', () => {
    const p = tinyPlan()
    p.staff[0].name = '=cmd|x'
    p.storeName = '+店'
    const out = toCsv(p)
    expect(out).toContain("\r\n'=cmd|x,")
    expect(out.startsWith("﻿'+店,")).toBe(true)
  })
  it('スタッフがいなくても、落ちない', () => {
    expect(toCsv(tinyPlan({ staff: [] }))).toContain('名前,1(火)')
  })
})

describe('csvFileName', () => {
  it('年月と店の名前が入る。ファイルの名前に使えない文字は _ にする', () => {
    expect(csvFileName(tinyPlan())).toBe('シフト表_2026年12月_小さな店.csv')
    expect(csvFileName(tinyPlan({ storeName: 'A/B 店:本店', month: 3, year: 2027 }))).toBe('シフト表_2027年03月_A_B_店_本店.csv')
    expect(csvFileName(tinyPlan({ storeName: '' }))).toBe('シフト表_2026年12月.csv')
  })
})
