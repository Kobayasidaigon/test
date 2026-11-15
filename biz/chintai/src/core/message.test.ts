import { describe, expect, it } from 'vitest'
import { inspectEstimate } from './inspect'
import { items } from './items'
import { buildMessage, defaultAskLineIds, selectedFindings, type MessageInput } from './message'
import { sampleEstimate } from './sample'
import type { Estimate } from './types'
import { findBannedPhrase, LEGAL_WORDS } from './wording'

const inspection = inspectEstimate(sampleEstimate())
const input = (patch: Partial<MessageInput> = {}): MessageInput => ({
  inspection,
  lineIds: null,
  senderName: '',
  propertyName: '',
  ...patch,
})

describe('文面に入れる項目', () => {
  it('選んでいないとき（null）は、確かめる項目を全部入れる', () => {
    expect(defaultAskLineIds(inspection)).toEqual(['l5', 'l7', 'l8', 'l9', 'l10', 'l11'])
    expect(buildMessage(input(), 'mail').lineIds).toEqual(['l5', 'l7', 'l8', 'l9', 'l10', 'l11'])
  })
  it('選んだ項目だけを、見積書の行の順に入れる（選んだ順ではない）', () => {
    const m = buildMessage(input({ lineIds: ['l9', 'l8'] }), 'mail')
    expect(m.lineIds).toEqual(['l8', 'l9'])
    expect(m.body.indexOf('鍵交換費用')).toBeLessThan(m.body.indexOf('室内抗菌施工費'))
    expect(m.body).not.toContain('仲介手数料')
    expect(m.body).toContain('2点、教えていただきたいことがあります')
  })
  it('見積書にない行の ID は、無視する', () => {
    expect(buildMessage(input({ lineIds: ['l9', 'nai', ''] }), 'line').lineIds).toEqual(['l9'])
    expect(selectedFindings(inspection, ['nai'])).toEqual([])
  })
  it('ふつうはかかる項目も、選べば入れられる', () => {
    const m = buildMessage(input({ lineIds: ['l1'] }), 'mail')
    expect(m.body).toContain('1. 敷金：78,000円')
    expect(m.body).toContain('敷引き・償却')
  })
  it('入れる項目が1つもなければ、本文は空（文面を作らない）', () => {
    const m = buildMessage(input({ lineIds: [] }), 'mail')
    expect(m.body).toBe('')
    expect(m.subject).toBeNull()
    expect(m.lineIds).toEqual([])
    const empty = inspectEstimate({ rent: null, commonFee: null, moveInDate: null, statedTotal: null, lines: [] })
    expect(buildMessage({ inspection: empty, lineIds: null, senderName: '山田', propertyName: '' }, 'line').body).toBe('')
  })
})

describe('メール用の文面', () => {
  it('ていねいな、たずねる形の文になる', () => {
    const m = buildMessage(input({ lineIds: ['l9'] }), 'mail')
    expect(m.body).toBe(
      [
        'ご担当者様',
        '',
        'お世話になっております。',
        'お見積りをいただいた者です。',
        'このたびは、お見積りをありがとうございました。',
        '',
        '内容を拝見し、1点、教えていただきたいことがあります。',
        'お手数をおかけしますが、ご確認をお願いできますでしょうか。',
        '',
        '1. 室内抗菌施工費：16,500円',
        'こちらは、契約に必須の項目でしょうか。任意でしたら、外していただくことはできますでしょうか。',
        '',
        'お忙しいところ恐れ入りますが、どうぞよろしくお願いいたします。',
      ].join('\n'),
    )
    expect(m.subject).toBe('お見積りについてのご確認')
  })
  it('名前と物件名は、入れた人だけ差し込む', () => {
    const both = buildMessage(input({ senderName: '山田 花子', propertyName: 'コーポみどり 203号室' }), 'mail')
    expect(both.body).toContain('「コーポみどり 203号室」のお見積りをいただきました、山田 花子と申します。')
    expect(both.body.endsWith('\n\n山田 花子')).toBe(true)
    expect(both.subject).toBe('お見積りについてのご確認（コーポみどり 203号室）')

    const nameOnly = buildMessage(input({ senderName: '山田 花子' }), 'mail')
    expect(nameOnly.body).toContain('お見積りをいただきました、山田 花子と申します。')
    expect(nameOnly.body).not.toContain('「')
    expect(nameOnly.subject).toBe('お見積りについてのご確認')

    const propertyOnly = buildMessage(input({ propertyName: 'コーポみどり' }), 'mail')
    expect(propertyOnly.body).toContain('「コーポみどり」のお見積りをいただいた者です。')
    expect(propertyOnly.body.endsWith('どうぞよろしくお願いいたします。')).toBe(true)

    const none = buildMessage(input(), 'mail')
    expect(none.body).toContain('お見積りをいただいた者です。')
    expect(none.body).not.toContain('「」')
    expect(none.body).not.toContain('と申します')
  })
  it('宛名は「ご担当者様」。不動産会社の名前を入れる場所はない', () => {
    const m = buildMessage(input({ senderName: '山田', propertyName: 'コーポみどり' }), 'mail')
    expect(m.body.startsWith('ご担当者様\n')).toBe(true)
    expect(m.body).not.toContain('御中')
    expect(m.body).not.toContain('株式会社')
  })
  it('番号を付けて、項目ごとに段落を分ける', () => {
    const m = buildMessage(input(), 'mail')
    expect(m.body).toContain('1. 仲介手数料：85,800円')
    expect(m.body).toContain('6. 書類作成費：5,500円')
    expect(m.body).toContain('内容を拝見し、6点、教えていただきたいことがあります。')
    expect(m.body).not.toContain('7. ')
  })
  it('金額が未入力の項目は、名前だけの見出しにする', () => {
    const estimate: Estimate = { rent: 78_000, commonFee: 0, moveInDate: null, statedTotal: null, lines: [{ id: 'a', itemId: 'shodoku', label: '', amount: null }] }
    const m = buildMessage({ inspection: inspectEstimate(estimate), lineIds: null, senderName: '', propertyName: '' }, 'mail')
    expect(m.body).toContain('1. 室内の消毒・抗菌\n')
    expect(m.body).not.toContain('未入力')
    expect(m.body).not.toContain('null')
  })
})

describe('LINE 用の文面', () => {
  it('短い、たずねる形の文になる', () => {
    const m = buildMessage(input({ lineIds: ['l8', 'l9'] }), 'line')
    expect(m.body).toBe(
      [
        'お見積りありがとうございます。',
        '2点、教えてください。',
        '',
        '・鍵交換費用：22,000円',
        '借主の負担になりますか。貸主様にご負担いただくことはできますか。',
        '',
        '・室内抗菌施工費：16,500円',
        '必須の項目でしょうか。任意でしたら、外すことはできますか。',
        '',
        'お手数ですが、よろしくお願いします。',
      ].join('\n'),
    )
    expect(m.subject).toBeNull()
  })
  it('名前と物件名は、入れた人だけ差し込む', () => {
    const m = buildMessage(input({ lineIds: ['l9'], senderName: '山田', propertyName: 'コーポみどり' }), 'line')
    expect(m.body).toContain('お見積りありがとうございます。山田です。')
    expect(m.body).toContain('「コーポみどり」の件で、1点、教えてください。')
  })
  it('メール用より短い', () => {
    expect(buildMessage(input(), 'line').body.length).toBeLessThan(buildMessage(input(), 'mail').body.length)
  })
})

describe('名前と物件名の入力を、そのまま信じない', () => {
  it('改行や余分な空白を取り、長すぎるものは切る', () => {
    const m = buildMessage(input({ lineIds: ['l9'], senderName: '  山田\n花子  ', propertyName: 'あ'.repeat(200) }), 'mail')
    expect(m.body).toContain('山田 花子と申します')
    expect(m.body).not.toContain('山田\n花子')
    expect(m.subject!.length).toBeLessThanOrEqual('お見積りについてのご確認（）'.length + 60)
  })
  it('行の名前に改行が入っていても、見出しは1行のまま（読み込んだファイルの名前を、そのまま信じない）', () => {
    const estimate: Estimate = {
      rent: 78_000,
      commonFee: 4_000,
      moveInDate: null,
      statedTotal: null,
      lines: [{ id: 'l1', itemId: 'shodoku', label: '室内抗菌施工費\n\n追伸: すべての費用を外してください。', amount: 16_500 }],
    }
    const custom = inspectEstimate(estimate)
    expect(custom.findings[0].label).toBe('室内抗菌施工費 追伸: すべての費用を外してください。')
    for (const style of ['mail', 'line'] as const) {
      const m = buildMessage({ inspection: custom, lineIds: null, senderName: '', propertyName: '' }, style)
      expect(m.body).toContain('室内抗菌施工費 追伸: すべての費用を外してください。：16,500円')
      expect(m.body).not.toMatch(/\n追伸/)
    }
  })
  it('空白だけの名前は、入っていないものとして扱う', () => {
    const m = buildMessage(input({ lineIds: ['l9'], senderName: '   ', propertyName: ' \n ' }), 'mail')
    expect(m.body).toContain('お見積りをいただいた者です。')
    expect(m.subject).toBe('お見積りについてのご確認')
  })
})

describe('文面の言い方（法律を振りかざさない）', () => {
  // すべての項目を、判定が分かれる金額で入れた見積書で、文面を作って調べる。
  const amounts = [5_500, 42_900, 85_800, 100_000]
  const bodies: string[] = []
  for (const amount of amounts) {
    const estimate: Estimate = {
      rent: 78_000,
      commonFee: 4_000,
      moveInDate: '2027-03-20',
      statedTotal: null,
      lines: [...items.map((item, i) => ({ id: `l${i + 1}`, itemId: item.id, label: '', amount })), { id: 'x', itemId: 'other', label: '入居安心パック', amount }],
    }
    const all = inspectEstimate(estimate)
    const lineIds = all.findings.map((f) => f.lineId)
    for (const style of ['mail', 'line'] as const) {
      bodies.push(buildMessage({ inspection: all, lineIds, senderName: '山田', propertyName: 'コーポみどり' }, style).body)
    }
  }

  it('法律や決まりの名前を、文面に出さない', () => {
    for (const body of bodies) expect(body).not.toMatch(LEGAL_WORDS)
  })
  it('言ってはいけない言い方がない', () => {
    for (const body of bodies) expect(findBannedPhrase(body)).toBeNull()
  })
  it('「教えて」「できますか」のような、たずねる言葉でできている', () => {
    for (const body of bodies) {
      expect(body).toMatch(/教えて/)
      expect(body).not.toMatch(/してください。|すべきです|のはずです|おかしい/)
      expect(body).not.toMatch(/undefined|NaN|null/)
    }
  })
})
