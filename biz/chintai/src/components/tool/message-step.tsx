import { useId, useState } from 'react'
import { PencilLineIcon } from 'lucide-react'
import { LIMITS, MESSAGE_NOTE, buildMessage, defaultAskLineIds, formatYen, getCategory, type AppData, type Inspection, type MessageStyle } from '@/core'
import { CategoryMark } from '@/components/category-mark'
import { MessagePreview } from '@/components/message-preview'
import { Sheet, SheetHeading, SheetNote, SheetTitle } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CopyButton } from '@/components/ui/copy-button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { scrollToId } from '@/lib/scroll'
import { cn } from '@/lib/utils'

// 手順3「確認の文面」。
// 左で、文面に入れる項目と、名前・物件名（入れた人だけ差し込む）を決める。右に、できた文面が出る。
// 文面は、たずねる形（core/message.ts が作る）。法律や決まりの名前は、文面には出ない。

export type MessageStepProps = {
  data: AppData
  setData: (next: AppData | ((prev: AppData) => AppData)) => void
  inspection: Inspection
  onGoInput: () => void
  onGoResult: () => void
}

const STYLES: { value: MessageStyle; label: string }[] = [
  { value: 'mail', label: 'メール用（ていねい）' },
  { value: 'line', label: 'LINE用（短い）' },
]

export function MessageStep({ data, setData, inspection, onGoInput, onGoResult }: MessageStepProps) {
  const [style, setStyle] = useState<MessageStyle>('mail')
  const nameId = useId()
  const propertyId = useId()
  const { message } = data
  const ids = inspection.findings.map((f) => f.lineId)

  if (inspection.findings.length === 0) {
    return (
      <Sheet aria-labelledby="message-title" className="mx-auto max-w-3xl">
        <SheetTitle title="確認の文面" eyebrow="不動産会社に送る文面" />
        <h2 id="message-title" className="sr-only">
          確認の文面
        </h2>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>見積書の項目が、まだ入っていません</EmptyTitle>
            <EmptyDescription>項目を入れると、確かめる項目について、不動産会社に送る文面を作れます。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onGoInput}>見積書を入れる</Button>
          </EmptyContent>
        </Empty>
      </Sheet>
    )
  }

  const defaults = defaultAskLineIds(inspection)
  const selected = new Set(message.lineIds ?? defaults)
  const setLineIds = (lineIds: string[] | null) => setData((prev) => ({ ...prev, message: { ...prev.message, lineIds } }))
  const toggle = (lineId: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(lineId)
    else next.delete(lineId)
    setLineIds(ids.filter((id) => next.has(id)))
  }

  const built = buildMessage({ inspection, ...message }, style)
  const isDefault = message.lineIds === null || (message.lineIds.length === defaults.length && defaults.every((id) => selected.has(id)))

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] print:block">
      {/* 文面を先に置く（スマホで、開いてすぐ文面が見えるように）。広い画面では、左に設定、右に文面を並べる。 */}
      <Sheet aria-labelledby="message-title" className="lg:sticky lg:top-[4.75rem] lg:col-start-2 lg:row-start-1">
        <SheetTitle title="確認の文面" eyebrow="不動産会社に送る文面" className="mb-4" />
        <h2 id="message-title" className="sr-only">
          確認の文面
        </h2>

        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl label="文面の種類" options={STYLES} value={style} onValueChange={(v) => setStyle(v as MessageStyle)} className="w-full sm:w-auto sm:min-w-[22rem]" />
        </div>

        {built.body === '' ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>文面に入れる項目を、選んでください</EmptyTitle>
              <EmptyDescription>
                {defaults.length === 0
                  ? '赤ペンを入れる項目は、見つかりませんでした。聞いておきたい項目があれば、「文面に入れる項目」でチェックを入れてください。'
                  : '「文面に入れる項目」で、チェックを入れた項目について、文面を作ります。'}
              </EmptyDescription>
            </EmptyHeader>
            {defaults.length > 0 && (
              <EmptyContent>
                <Button variant="outline" onClick={() => setLineIds(null)}>
                  確かめる項目だけに戻す
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            <MessagePreview
              message={built}
              subjectAction={built.subject !== null ? <CopyButton value={built.subject} label="件名をコピーする" copiedLabel="コピーしました" variant="ghost" size="sm" className="no-print -my-1" /> : undefined}
            />
            <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CopyButton value={built.body} label="本文をコピーする" copiedLabel="本文をコピーしました" size="lg" className="w-full sm:w-auto" />
              <p className="text-xs leading-5 text-ink-soft">
                {built.lineIds.length}項目・{built.body.length}字
              </p>
            </div>
            <SheetNote className="mt-5">{MESSAGE_NOTE}</SheetNote>
          </>
        )}

        <div className="no-print mt-6 flex flex-wrap gap-2 border-t border-rule pt-4">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => scrollToId('pick')}>
            入れる項目と、名前を変える
          </Button>
          <Button variant="ghost" size="sm" onClick={onGoResult}>
            点検の結果に戻る
          </Button>
          <Button variant="ghost" size="sm" onClick={onGoInput}>
            <PencilLineIcon aria-hidden className="size-4" />
            見積書を直す
          </Button>
        </div>
      </Sheet>
      <Sheet id="pick" tabIndex={-1} aria-labelledby="pick-title" className="no-print scroll-mt-20 outline-none lg:col-start-1 lg:row-start-1">
        <SheetHeading
          as="h2"
          n={1}
          title={<span id="pick-title">文面に入れる項目</span>}
          right={<span className="text-xs text-ink-soft">{selected.size}つ 選んでいます</span>}
          note="はじめは、赤ペンの丸が付いた項目（確かめる項目）が入っています。"
        />
        <ul>
          {inspection.findings.map((f, i) => {
            const on = selected.has(f.lineId)
            const attention = f.level === 'check' || f.level === 'alert'
            return (
              <li key={f.lineId} className="border-b border-rule">
                <label className={cn('flex min-h-12 cursor-pointer items-center gap-3 py-2', !on && 'text-ink-soft')}>
                  <Checkbox checked={on} onCheckedChange={(v) => toggle(f.lineId, v === true)} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[15px] leading-snug', on && 'text-ink')}>{f.label}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs leading-5 text-ink-soft">
                      <CategoryMark id={f.category} variant={i} className="text-[11px]" />
                      {getCategory(f.category).label}
                      {!attention && f.level === 'ok' && <span>（気になる点は、見つかっていません）</span>}
                    </span>
                  </span>
                  <span className="num shrink-0 text-sm">{f.amount === null ? <span className="text-xs text-ink-soft">未入力</span> : formatYen(f.amount)}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={isDefault} onClick={() => setLineIds(null)}>
            確かめる項目だけに戻す
          </Button>
          <Button variant="ghost" size="sm" disabled={selected.size === 0} onClick={() => setLineIds([])}>
            全部はずす
          </Button>
        </div>

        <SheetHeading as="h2" n={2} title="名前と物件名" className="mt-9" note="入れた人だけ、文面に差し込みます。空のままでも、文面はできます。不動産会社の名前は、入れません（宛名は「ご担当者様」です）。" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={nameId} className="mb-1 flex items-baseline gap-1.5 text-[13px] font-bold leading-5">
              あなたの名前
              <span className="rounded-[2px] border border-ink-soft/50 px-1 text-[11px] font-normal leading-4 text-ink-soft">任意</span>
            </label>
            <Input
              id={nameId}
              value={message.senderName}
              maxLength={LIMITS.maxSenderName}
              autoComplete="name"
              placeholder="例: 山田 花子"
              onChange={(e) => setData((prev) => ({ ...prev, message: { ...prev.message, senderName: e.target.value } }))}
            />
          </div>
          <div>
            <label htmlFor={propertyId} className="mb-1 flex items-baseline gap-1.5 text-[13px] font-bold leading-5">
              物件の名前
              <span className="rounded-[2px] border border-ink-soft/50 px-1 text-[11px] font-normal leading-4 text-ink-soft">任意</span>
            </label>
            <Input
              id={propertyId}
              value={message.propertyName}
              maxLength={LIMITS.maxPropertyName}
              autoComplete="off"
              placeholder="例: ○○ハイツ 203号室"
              onChange={(e) => setData((prev) => ({ ...prev, message: { ...prev.message, propertyName: e.target.value } }))}
            />
          </div>
        </div>
      </Sheet>

    </div>
  )
}
