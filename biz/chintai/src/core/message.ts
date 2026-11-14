import { formatYen } from './format'
import type { Finding, Inspection } from './types'

// 不動産会社に送る、確認の文面を作る。
//
// 決めごと:
// - たずねる形にする（「教えていただけますでしょうか」「外すことはできますか」）。
// - 法律や決まりの名前を、文面に出さない（振りかざさない）。根拠は、点検の結果の画面で、本人が読むためのもの。
// - 名前と物件名は、入れた人だけ差し込む。入っていなければ、その部分のない自然な文にする。
// - 不動産会社の名前は扱わない（宛名は「ご担当者様」）。

export type MessageStyle = 'mail' | 'line'

export type MessageInput = {
  inspection: Inspection
  /** 文面に入れる行のID。null なら、確かめる項目（askDefault）を全部入れる。 */
  lineIds: string[] | null
  /** 送る人の名前（空でもよい）。 */
  senderName: string
  /** 物件の名前（空でもよい）。 */
  propertyName: string
}

export type BuiltMessage = {
  style: MessageStyle
  /** 件名（メール用だけ。LINE 用は null）。 */
  subject: string | null
  /** 本文。入れる項目が1つもなければ、空の文字。 */
  body: string
  /** 文面に入った行のID（見積書の行の順）。 */
  lineIds: string[]
}

/** 名前や物件名に入った改行や余分な空白を取り、長すぎるものを切る。 */
function clean(text: string, max: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** はじめから文面に入れておく行（確かめる項目）のID。 */
export function defaultAskLineIds(inspection: Inspection): string[] {
  return inspection.findings.filter((f) => f.askDefault).map((f) => f.lineId)
}

/** 文面に入れる行を、見積書の行の順に並べて返す。 */
export function selectedFindings(inspection: Inspection, lineIds: string[] | null): Finding[] {
  if (lineIds === null) return inspection.findings.filter((f) => f.askDefault)
  const wanted = new Set(lineIds)
  return inspection.findings.filter((f) => wanted.has(f.lineId))
}

/**
 * 項目の見出し（「室内の消毒・抗菌：16,500円」）。
 * 金額をかっこに入れないのは、見積書の名前がかっこで終わることが多いため（「火災保険料（2年）（20,000円）」になるのを避ける）。
 */
function heading(f: Finding): string {
  return f.amount === null ? f.label : `${f.label}：${formatYen(f.amount)}`
}

/** 確認の文面を作る。 */
export function buildMessage(input: MessageInput, style: MessageStyle): BuiltMessage {
  const targets = selectedFindings(input.inspection, input.lineIds)
  const lineIds = targets.map((f) => f.lineId)
  if (targets.length === 0) return { style, subject: null, body: '', lineIds }

  const name = clean(input.senderName, 40)
  const property = clean(input.propertyName, 60)
  const count = `${targets.length}点`

  if (style === 'mail') {
    const intro =
      property && name
        ? `「${property}」のお見積りをいただきました、${name}と申します。`
        : property
          ? `「${property}」のお見積りをいただいた者です。`
          : name
            ? `お見積りをいただきました、${name}と申します。`
            : 'お見積りをいただいた者です。'
    const blocks = targets.map((f, i) => `${i + 1}. ${heading(f)}\n${f.ask.mail}`)
    const body = [
      'ご担当者様',
      '',
      'お世話になっております。',
      intro,
      'このたびは、お見積りをありがとうございました。',
      '',
      `内容を拝見し、${count}、教えていただきたいことがあります。`,
      'お手数をおかけしますが、ご確認をお願いできますでしょうか。',
      '',
      blocks.join('\n\n'),
      '',
      'お忙しいところ恐れ入りますが、どうぞよろしくお願いいたします。',
      ...(name ? ['', name] : []),
    ].join('\n')
    return {
      style,
      subject: property ? `お見積りについてのご確認（${property}）` : 'お見積りについてのご確認',
      body,
      lineIds,
    }
  }

  // LINE 用。短く、区切りは「・」。
  const first = name ? `お見積りありがとうございます。${name}です。` : 'お見積りありがとうございます。'
  const second = property ? `「${property}」の件で、${count}、教えてください。` : `${count}、教えてください。`
  const blocks = targets.map((f) => `・${heading(f)}\n${f.ask.line}`)
  const body = [first, second, '', blocks.join('\n\n'), '', 'お手数ですが、よろしくお願いします。'].join('\n')
  return { style, subject: null, body, lineIds }
}
