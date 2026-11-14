import { useState } from 'react'
import { buildMessage, type MessageStyle } from '@/core/message'
import { MESSAGE_NOTE } from '@/core/texts'
import type { Inspection } from '@/core/types'
import { MessagePreview } from '@/components/message-preview'
import { PenCheck } from '@/components/pen'
import { SegmentedControl } from '@/components/ui/segmented-control'

// 確認の文面の見本。道具の手順3と同じ関数（core の buildMessage）に、サンプルの見積書の点検の結果を渡して作る。
// 見本の文を手で書いていないので、道具の文面が変われば、ここも同じように変わる。

/** 見本に入れる項目（サンプルの見積書の中の、確かめる項目から3つ）。全部入れると長いので、3つにしている。 */
const SAMPLE_ITEMS = ['chukai', 'kagi', 'shodoku']

export function MessageSample({ inspection }: { inspection: Inspection }) {
  const [style, setStyle] = useState<MessageStyle>('mail')
  const picked = inspection.findings.filter((f) => SAMPLE_ITEMS.includes(f.itemId))
  const message = buildMessage({ inspection, lineIds: picked.map((f) => f.lineId), senderName: '', propertyName: '' }, style)

  return (
    <div className="grid items-start gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <ul className="space-y-3 text-[15px] leading-[1.85]">
          {[
            '「教えていただけますでしょうか」「外すことはできますか」という、たずねる形で書きます。',
            '法律や決まりの名前は、文面に出しません。根拠は、あなたが点検の結果で読むためのものです。',
            '名前と物件名は、入れた人だけ、文面に差し込みます。',
            'メール用のていねいな文と、LINE 用の短い文を、切り替えられます。コピーのボタンが付いています。',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <PenCheck className="mt-[0.3em] text-pencil" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-l-4 border-marker bg-marker-soft/70 px-3 py-2 text-[13px] leading-6">{MESSAGE_NOTE}</p>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-[13px] leading-6 text-ink-soft">
            サンプルの見積書から、{picked.length}つの項目を選んだときの文面です。
          </p>
          <SegmentedControl
            label="文面の種類"
            value={style}
            onValueChange={(v) => setStyle(v === 'line' ? 'line' : 'mail')}
            options={[
              { value: 'mail', label: 'メール用' },
              { value: 'line', label: 'LINE用' },
            ]}
          />
        </div>
        <div className="shadow-paper">
          <MessagePreview message={message} />
        </div>
      </div>
    </div>
  )
}
