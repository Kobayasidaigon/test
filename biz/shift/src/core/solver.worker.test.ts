import { describe, expect, it, vi } from 'vitest'
import { makeSample } from './samples'
import { solve } from './solver'
import { handleRequest, type WorkerMessage } from './solver.worker'
import { tinyPlan } from './testkit'

// 自動作成を何度も回すテストがあるので、遅い機械でも時間切れにならないよう、長めに待つ
vi.setConfig({ testTimeout: 60_000 })

describe('Worker の中で動く側（handleRequest）', () => {
  it('途中経過 → 表 → 提案、の順に送る。表は、直接組んだときと同じ', () => {
    const plan = makeSample('restaurant', 2026, 12)
    const messages: WorkerMessage[] = []
    handleRequest({ plan, seed: 1, effort: 0.2, withSuggestions: true }, (m) => messages.push(m))
    const types = messages.map((m) => m.type)
    expect(types[0]).toBe('progress')
    expect(types.indexOf('result')).toBeGreaterThan(0)
    expect(types.indexOf('suggestions')).toBeGreaterThan(types.indexOf('result'))
    expect(types[types.length - 1]).toBe('suggestions')
    expect(types.filter((t) => t === 'result')).toHaveLength(1)
    const result = messages.find((m) => m.type === 'result')
    expect(result?.type === 'result' && result.result.schedule).toEqual(solve(plan, { seed: 1, effort: 0.2 }).schedule)
    const sug = messages[messages.length - 1]
    expect(sug.type === 'suggestions' && sug.suggestions !== null && sug.suggestions.suggestions.length).toBeGreaterThan(0)
  })

  it('足りないところがなければ、提案は null', () => {
    const messages: WorkerMessage[] = []
    handleRequest({ plan: tinyPlan(), seed: 1, effort: 0.05, withSuggestions: true }, (m) => messages.push(m))
    expect(messages[messages.length - 1]).toEqual({ type: 'suggestions', suggestions: null })
  })

  it('提案を頼まなければ、足りないところがあっても計算しない', () => {
    const messages: WorkerMessage[] = []
    handleRequest({ plan: makeSample('restaurant', 2026, 12), seed: 1, effort: 0.05, withSuggestions: false }, (m) => messages.push(m))
    expect(messages[messages.length - 1]).toEqual({ type: 'suggestions', suggestions: null })
    expect(messages.some((m) => m.type === 'suggestProgress')).toBe(false)
  })

  it('送る中身は、どれも JSON にできる（Worker の境界を、そのままこえられる）', () => {
    const messages: WorkerMessage[] = []
    handleRequest({ plan: makeSample('restaurant', 2026, 12), seed: 1, effort: 0.1, withSuggestions: true }, (m) => messages.push(m))
    for (const m of messages) expect(JSON.parse(JSON.stringify(m))).toEqual(m)
  })

  it('計算の途中で例外が出ても、error として送る（Worker が黙って止まらない）', () => {
    const messages: WorkerMessage[] = []
    handleRequest({ plan: null as never, seed: 1, withSuggestions: false }, (m) => messages.push(m))
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe('error')
  })
})
