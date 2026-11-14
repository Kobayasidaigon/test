import { describe, expect, it } from 'vitest'
import { consultDesks, adDisclosure } from './consult'
import { addLine, createEmptyData, createEmptyEstimate, isEmptyData, lineLabel, moveLine, nextLineId, pruneMessageLineIds, removeLine, updateLine } from './estimate'
import { inspectEstimate } from './inspect'
import { isPresetItemId } from './items'
import { SAMPLE_NOTE, isSampleEstimate, sampleData, sampleEstimate } from './sample'
import { getSource } from './sources'
import { parseSaved, toSavedFile } from './storage'
import { AD_LABEL } from './texts'
import type { AppData, CategoryId } from './types'

describe('見積書を作る・書き換える', () => {
  it('空の見積書と、空のデータ', () => {
    expect(createEmptyEstimate()).toEqual({ rent: null, commonFee: null, moveInDate: null, statedTotal: null, lines: [] })
    expect(createEmptyData().message).toEqual({ senderName: '', propertyName: '', lineIds: null })
    // 呼ぶたびに、別のデータを返す（片方を書き換えても、もう片方は変わらない）。
    expect(createEmptyEstimate()).not.toBe(createEmptyEstimate())
    expect(createEmptyEstimate().lines).not.toBe(createEmptyEstimate().lines)
  })
  it('行の ID は l1、l2、… と増える。消した行の番号は、最大の番号より小さければ使い回さない', () => {
    expect(nextLineId([])).toBe('l1')
    let e = createEmptyEstimate()
    e = addLine(e, 'shikikin')
    e = addLine(e, 'reikin')
    e = addLine(e, 'kagi')
    expect(e.lines.map((l) => l.id)).toEqual(['l1', 'l2', 'l3'])
    e = removeLine(e, 'l2')
    e = addLine(e, 'shodoku')
    expect(e.lines.map((l) => l.id)).toEqual(['l1', 'l3', 'l4'])
  })
  it('形の違う ID が混ざっていても、重ならない ID を作る', () => {
    const lines = [
      { id: 'abc', itemId: 'shikikin', label: '', amount: null },
      { id: 'l7', itemId: 'reikin', label: '', amount: null },
    ]
    expect(nextLineId(lines)).toBe('l8')
  })
  it('行を足す。名前と金額は、あとからでも入れられる', () => {
    const e = addLine(createEmptyEstimate(), 'shodoku', { label: '室内抗菌施工費', amount: 16_500 })
    expect(e.lines).toEqual([{ id: 'l1', itemId: 'shodoku', label: '室内抗菌施工費', amount: 16_500 }])
    expect(addLine(createEmptyEstimate(), 'kagi').lines[0]).toEqual({ id: 'l1', itemId: 'kagi', label: '', amount: null })
  })
  it('知らない項目の ID で足すと、「その他」になる', () => {
    expect(addLine(createEmptyEstimate(), 'zzz', { label: 'なぞの費用' }).lines[0].itemId).toBe('other')
  })
  it('行を書き換える・消す・動かす', () => {
    let e = sampleEstimate()
    e = updateLine(e, 'l9', { amount: 11_000, label: '抗菌' })
    expect(e.lines.find((l) => l.id === 'l9')).toEqual({ id: 'l9', itemId: 'shodoku', label: '抗菌', amount: 11_000 })
    e = updateLine(e, 'l9', { itemId: 'gaichu' })
    expect(e.lines.find((l) => l.id === 'l9')?.itemId).toBe('gaichu')
    e = updateLine(e, 'l9', { itemId: 'zzz' })
    expect(e.lines.find((l) => l.id === 'l9')?.itemId).toBe('other')
    expect(updateLine(e, 'nai', { amount: 1 }).lines).toEqual(e.lines)

    e = removeLine(e, 'l9')
    expect(e.lines.some((l) => l.id === 'l9')).toBe(false)
    expect(removeLine(e, 'nai').lines).toEqual(e.lines)

    const order = (x: typeof e) => x.lines.map((l) => l.id).slice(0, 3)
    expect(order(moveLine(e, 'l2', -1))).toEqual(['l2', 'l1', 'l3'])
    expect(order(moveLine(e, 'l2', 1))).toEqual(['l1', 'l3', 'l2'])
    expect(moveLine(e, 'l1', -1)).toBe(e) // 端では何もしない
    expect(moveLine(e, e.lines[e.lines.length - 1].id, 1)).toBe(e)
    expect(moveLine(e, 'nai', 1)).toBe(e)
  })
  it('もとのデータを書き換えない', () => {
    const before = sampleEstimate()
    const frozen = Object.freeze({ ...before, lines: Object.freeze(before.lines.map((l) => Object.freeze({ ...l }))) }) as typeof before
    expect(() => {
      addLine(frozen, 'kagi')
      updateLine(frozen, 'l1', { amount: 1 })
      removeLine(frozen, 'l1')
      moveLine(frozen, 'l1', 1)
    }).not.toThrow()
    expect(frozen).toEqual(sampleEstimate())
  })
  it('行を消したあと、文面の指定に、消した行が残らないようにできる', () => {
    const data: AppData = { estimate: removeLine(sampleEstimate(), 'l9'), message: { senderName: '', propertyName: '', lineIds: ['l8', 'l9'] } }
    expect(pruneMessageLineIds(data).message.lineIds).toEqual(['l8'])
    const untouched: AppData = { estimate: sampleEstimate(), message: { senderName: '', propertyName: '', lineIds: ['l8', 'l9'] } }
    expect(pruneMessageLineIds(untouched)).toBe(untouched)
    const auto: AppData = { estimate: sampleEstimate(), message: { senderName: '', propertyName: '', lineIds: null } }
    expect(pruneMessageLineIds(auto)).toBe(auto)
  })
  it('行の表示名', () => {
    expect(lineLabel({ id: 'a', itemId: 'kagi', label: '', amount: null })).toBe('鍵の交換費用')
    expect(lineLabel({ id: 'a', itemId: 'kagi', label: ' 鍵交換代 ', amount: null })).toBe('鍵交換代')
  })
})

describe('サンプルの見積書', () => {
  it('呼ぶたびに、新しいデータを返す', () => {
    const a = sampleEstimate()
    a.lines[0].amount = 1
    a.lines.pop()
    expect(sampleEstimate().lines[0].amount).toBe(78_000)
    expect(sampleEstimate().lines).toHaveLength(11)
  })
  it('保存の形式として正しい（そのまま保存・読み込みできる）', () => {
    const result = parseSaved(JSON.parse(JSON.stringify(toSavedFile(sampleData(), new Date(0)))))
    expect(result.ok && result.data).toEqual(sampleData())
    expect(result.ok && result.warnings).toEqual([])
  })
  it('一覧にある項目だけでできていて、行の ID は重ならない', () => {
    const e = sampleEstimate()
    for (const line of e.lines) expect(isPresetItemId(line.itemId), line.itemId).toBe(true)
    expect(new Set(e.lines.map((l) => l.id)).size).toBe(e.lines.length)
  })
  it('見積書に書かれた合計は、行の金額の合計と同じ', () => {
    const e = sampleEstimate()
    expect(e.lines.reduce((sum, l) => sum + (l.amount ?? 0), 0)).toBe(e.statedTotal)
  })
  it('金額は、家賃から計算した額と合っている（サンプルの中で、計算がおかしくない）', () => {
    const e = sampleEstimate()
    const amount = (id: string) => e.lines.find((l) => l.itemId === id)!.amount
    expect(amount('maeyachin')).toBe(78_000 + 4_000)
    expect(amount('hiwari')).toBe(Math.round(((78_000 + 4_000) * 12) / 31))
    expect(amount('chukai')).toBe(78_000 * 1.1)
    expect(amount('hoshoryo')).toBe((78_000 + 4_000) / 2)
  })
  it('入れただけで、区分がひととおり見える（ふつうはかかる、上限、必須か任意か、選べる、だれが負担）', () => {
    const r = inspectEstimate(sampleEstimate())
    const seen = new Set<CategoryId>(r.findings.map((f) => f.category))
    for (const id of ['usual', 'capped', 'optional', 'choosable', 'who-pays'] as const) expect(seen.has(id), id).toBe(true)
    // 赤ペンが入る行と、入らない行の両方がある。
    expect(r.findings.some((f) => f.level === 'ok')).toBe(true)
    expect(r.findings.some((f) => f.level === 'check')).toBe(true)
  })
  it('サンプルであること、相場ではないことを伝える文がある', () => {
    expect(SAMPLE_NOTE).toContain('サンプル')
    expect(SAMPLE_NOTE).toContain('相場を示すものではありません')
  })
})

describe('相談先と、広告の表示', () => {
  it('消費者ホットライン 188 がある', () => {
    const hotline = consultDesks.find((d) => d.id === 'hotline188')!
    expect(hotline.name).toBe('消費者ホットライン')
    expect(hotline.phone).toBe('188')
    expect(getSource(hotline.sourceId).publisher).toBe('消費者庁')
  })
  it('どの相談先にも、説明と、公式のページの出典がある', () => {
    expect(consultDesks.length).toBeGreaterThanOrEqual(2)
    expect(new Set(consultDesks.map((d) => d.id)).size).toBe(consultDesks.length)
    for (const d of consultDesks) {
      expect(d.what.length, d.id).toBeGreaterThan(10)
      expect(getSource(d.sourceId).url, d.id).toMatch(/^https:\/\//)
      if (d.phone !== null) expect(d.phone, d.id).toMatch(/^[0-9-]+$/)
    }
  })
  it('法テラスは、法律相談そのものではない、と書いてある', () => {
    expect(consultDesks.find((d) => d.id === 'houterasu')!.what).toContain('法律相談ではありません')
  })
  it('広告の表示についての事実には、消費者庁の出典がある。広告の枠に付ける言葉は「広告」', () => {
    expect(adDisclosure.text).toContain('令和5年（2023年）10月1日')
    expect(adDisclosure.text).toContain('景品表示法')
    expect(getSource(adDisclosure.sourceIds[0]).publisher).toBe('消費者庁')
    expect(AD_LABEL).toBe('広告')
  })
})

describe('空かどうか、サンプルのままかどうか', () => {
  it('何も入っていないデータだけが、空', () => {
    expect(isEmptyData(createEmptyData())).toBe(true)
    expect(isEmptyData(sampleData())).toBe(false)
    const d = createEmptyData()
    expect(isEmptyData({ ...d, estimate: { ...d.estimate, rent: 0 } })).toBe(false) // 0円も「入れた」うち
    expect(isEmptyData({ ...d, estimate: { ...d.estimate, moveInDate: '2027-03-20' } })).toBe(false)
    expect(isEmptyData({ ...d, estimate: { ...d.estimate, statedTotal: 1 } })).toBe(false)
    expect(isEmptyData({ ...d, estimate: addLine(d.estimate, 'shikikin') })).toBe(false)
    expect(isEmptyData({ ...d, message: { ...d.message, senderName: '山田' } })).toBe(false)
    expect(isEmptyData({ ...d, message: { ...d.message, senderName: '  ', lineIds: [] } })).toBe(true)
  })
  it('サンプルは、1か所でも書き換えたら、サンプルではなくなる', () => {
    expect(isSampleEstimate(sampleEstimate())).toBe(true)
    expect(isSampleEstimate(createEmptyEstimate())).toBe(false)
    expect(isSampleEstimate(updateLine(sampleEstimate(), 'l9', { amount: 16_501 }))).toBe(false)
    expect(isSampleEstimate(updateLine(sampleEstimate(), 'l9', { label: '抗菌' }))).toBe(false)
    expect(isSampleEstimate(removeLine(sampleEstimate(), 'l11'))).toBe(false)
    expect(isSampleEstimate(moveLine(sampleEstimate(), 'l1', 1))).toBe(false)
    expect(isSampleEstimate({ ...sampleEstimate(), rent: 78_001 })).toBe(false)
    expect(isSampleEstimate({ ...sampleEstimate(), moveInDate: null })).toBe(false)
    // 行の ID が違うだけ（読み込み直して付け直された、など）なら、サンプルのまま。
    const renamed = sampleEstimate()
    renamed.lines = renamed.lines.map((l, i) => ({ ...l, id: `x${i}` }))
    expect(isSampleEstimate(renamed)).toBe(true)
  })
})
