import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildMessage, inspectEstimate, sampleEstimate } from '../core'
import { Brand } from './brand'
import { CategoryMark, CategoryTag, FindingMark } from './category-mark'
import { ConsultDesks } from './consult-desks'
import { FindingDetails } from './finding-card'
import { InspectedSheet } from './inspected-sheet'
import { MessagePreview } from './message-preview'
import { DateStamp, PenCircle, PenUnderline } from './pen'
import { Sheet, SheetHeading, SheetTitle } from './sheet'

// LP や解説ページ（ssr: true）からも使う部品が、静的HTMLの書き出し（window のない場所）で描けることを確かめる。
// ここで落ちる部品は、描くときに window・document・localStorage にさわっている。

describe('静的HTMLに書き出せる部品', () => {
  const inspection = inspectEstimate(sampleEstimate())

  it('赤ペンが入った見積書（本物の判定の結果）を、window なしで描ける', () => {
    expect(typeof window).toBe('undefined')
    const html = renderToString(createElement(InspectedSheet, { inspection, draw: true }))
    // 11行と合計が出る。確かめる項目には、丸（SVG）と、余白の言葉が付く。
    expect(html.match(/<li /g)).toHaveLength(11)
    expect(html).toContain('477,042円')
    expect(html).toContain('必須か任意かを、確かめる項目です。')
    expect(html.match(/pen-draw/g)?.length).toBeGreaterThanOrEqual(6)
  })

  it('行の数をしぼって出せる（LP で、上のほうだけ見せるとき）。しぼったときは、合計の行を出さない', () => {
    const html = renderToString(createElement(InspectedSheet, { inspection, limit: 5 }))
    expect(html.match(/<li /g)).toHaveLength(5)
    expect(html).not.toContain('477,042円')
  })

  it('1行のくわしい結果、確認の文面、相談先、紙、印、はんこ', () => {
    const kagi = inspection.findings.find((f) => f.itemId === 'kagi')!
    const details = renderToString(createElement(FindingDetails, { f: kagi }))
    expect(details).toContain('なぜそう言うのか')
    expect(details).toContain('https://www.mlit.go.jp/')

    const mail = buildMessage({ inspection, lineIds: null, senderName: '', propertyName: '' }, 'mail')
    const message = renderToString(createElement(MessagePreview, { message: mail }))
    expect(message).toContain('お見積りについてのご確認')
    expect(message).toContain('ご担当者様')

    expect(renderToString(createElement(ConsultDesks))).toContain('188')

    const sheet = renderToString(
      createElement(Sheet, null, createElement(SheetTitle, { title: '初期費用の見積書' }), createElement(SheetHeading, { n: 1, title: '計算のもと' })),
    )
    expect(sheet).toContain('初期費用の見積書')

    const marks = renderToString(
      createElement(
        'div',
        null,
        createElement(CategoryMark, { id: 'optional' }),
        createElement(CategoryTag, { id: 'usual' }),
        createElement(FindingMark, { f: kagi }),
        createElement(PenCircle, { children: '22,000円' }),
        createElement(PenUnderline, { children: '合計' }),
        createElement(DateStamp, { top: 'みつもり', date: '26.11.14', bottom: '点検', label: '点検した日' }),
        createElement(Brand),
      ),
    )
    expect(marks).toContain('？')
    expect(marks).toContain('ふつうはかかる')
    expect(marks).toContain('みつもり点検')
  })
})
