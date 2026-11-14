import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react'
import {
  addLine,
  formatYen,
  getCategory,
  getItem,
  isEmptyData,
  isValidDate,
  labelForMatch,
  lineLabel,
  LIMITS,
  moveLine,
  OTHER_ITEM_ID,
  pruneMessageLineIds,
  removeLine,
  updateLine,
  type AppData,
  type Estimate,
  type EstimateLine,
  type Finding,
  type Inspection,
} from '@/core'
import { FindingMark } from '@/components/category-mark'
import { PenCircle } from '@/components/pen'
import { Sheet, SheetHeading, SheetTitle } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { AmountField } from './amount-field'
import { ItemChips, ItemSearch } from './item-picker'

// 手順1「見積書を入れる」。
// 白い紙（見積書の写し）に、計算のもと（家賃など）と、見積書の項目を写していく。
// 入れたそばから、行の下に、区分の印（赤ペン）が入る。

export type InputStepProps = {
  data: AppData
  setData: (next: AppData | ((prev: AppData) => AppData)) => void
  inspection: Inspection
  onGoResult: () => void
  onSample: () => void
  onClear: () => void
}

/** どこにフォーカスを移すか（行を足した・消した・動かしたあと）。 */
type FocusTarget = { lineId: string; role: 'amount' | 'name' | 'up' | 'down' } | { search: true } | null

/** 空の見積書に置く、手描きの絵（何も書かれていない見積書と、赤ペン）。 */
function BlankSheetArt() {
  return (
    <svg viewBox="0 0 96 72" className="h-[72px] w-24 text-ink-soft" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6.5 C 30 5.5 52 6 62 6.5 L 62.5 65 C 48 66 30 65.5 17.5 65 Z" strokeWidth="1.5" className="fill-paper" />
      <path d="M25 17 H 55 M25 26 H 55 M25 35 H 55 M25 44 H 55 M25 53 H 44" strokeWidth="1.2" strokeDasharray="1 4.5" />
      <path d="M70 52 L 86 16 L 91 18.5 L 75 54.5 L 68.5 59 Z" strokeWidth="1.5" className="fill-paper text-pen" />
      <path d="M70 52 L 75 54.5" strokeWidth="1.5" className="text-pen" />
    </svg>
  )
}

export function InputStep({ data, setData, inspection, onGoResult, onSample, onClear }: InputStepProps) {
  const { estimate } = data
  const root = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [focus, setFocus] = useState<FocusTarget>(null)
  const [kindLineId, setKindLineId] = useState<string | null>(null)
  const ids = { rent: useId(), fee: useId(), date: useId(), stated: useId(), add: useId() }

  const setEstimate = (fn: (e: Estimate) => Estimate) => setData((prev) => ({ ...prev, estimate: fn(prev.estimate) }))

  // 行を足した・消した・動かしたあとに、次に打つところへフォーカスを移す（描き終わってから）。
  useEffect(() => {
    if (!focus) return
    if ('search' in focus) searchRef.current?.focus()
    else root.current?.querySelector<HTMLElement>(`[data-line="${focus.lineId}"] [data-role="${focus.role}"]`)?.focus()
    setFocus(null)
  }, [focus])

  const full = estimate.lines.length >= LIMITS.maxLines

  const add = (itemId: string, label: string) => {
    if (full) return
    // 名前が決まっていないときは、項目の名前を入れておく（空の欄より、入っている名前を見積書のとおりに直すほうが、早い）。
    const next = addLine(estimate, itemId, { label: label || (itemId === OTHER_ITEM_ID ? '' : getItem(itemId).name) })
    const line = next.lines[next.lines.length - 1]
    setEstimate(() => next)
    setFocus({ lineId: line.id, role: 'amount' })
  }

  const remove = (line: EstimateLine, index: number) => {
    const before = data
    setData((prev) => pruneMessageLineIds({ ...prev, estimate: removeLine(prev.estimate, line.id) }))
    const neighbor = estimate.lines[index + 1] ?? estimate.lines[index - 1]
    setFocus(neighbor ? { lineId: neighbor.id, role: 'amount' } : { search: true })
    toast.message(`「${lineLabel(line)}」の行を消しました。`, { label: '元に戻す', onAction: () => setData(before) })
  }

  const move = (line: EstimateLine, direction: -1 | 1) => {
    setEstimate((e) => moveLine(e, line.id, direction))
    setFocus({ lineId: line.id, role: direction === -1 ? 'up' : 'down' })
  }

  const usedItemIds = new Set(estimate.lines.map((l) => l.itemId))
  const findingById = new Map(inspection.findings.map((f) => [f.lineId, f]))
  const kindLine = estimate.lines.find((l) => l.id === kindLineId) ?? null
  const empty = isEmptyData(data)

  return (
    <div ref={root} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-5">
        <Sheet aria-labelledby="input-title">
          <SheetTitle
            title="初期費用の見積書"
            eyebrow="点検用の写し"
            right="不動産会社の名前は、入れません"
            className="mb-5"
          />
          <h2 id="input-title" className="sr-only">
            見積書を入れる
          </h2>

          {empty && (
            <div className="no-print mb-7 flex flex-col gap-3 border-l-4 border-marker bg-marker-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7">
                不動産会社からもらった見積書を見ながら、項目と金額を、この紙に写してください。
                <br className="hidden sm:block" />
                まず動きを見たいときは、サンプルで試せます。
              </p>
              <Button variant="outline" className="shrink-0" onClick={onSample}>
                サンプルの見積書を入れる
              </Button>
            </div>
          )}

          <section aria-labelledby="basis-title">
            <SheetHeading n={1} title={<span id="basis-title">計算のもと</span>} note="見積書や、物件の資料に書かれている数字を入れます。仲介手数料の上限の目安や、日割り家賃の目安の計算に使います。" />
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field id={ids.rent} label="家賃（月額）" hint="管理費・共益費を、含めない額">
                <AmountField id={ids.rent} value={estimate.rent} placeholder="例: 78,000" onChange={(rent) => setEstimate((e) => ({ ...e, rent }))} />
              </Field>
              <Field id={ids.fee} label="管理費・共益費（月額）" hint="ないときは、0">
                <AmountField id={ids.fee} value={estimate.commonFee} placeholder="例: 4,000" onChange={(commonFee) => setEstimate((e) => ({ ...e, commonFee }))} />
              </Field>
              <Field id={ids.date} label="入居する日" hint="日割り家賃の目安に使います">
                <DateField id={ids.date} value={estimate.moveInDate} onChange={(moveInDate) => setEstimate((e) => ({ ...e, moveInDate }))} />
              </Field>
              <Field id={ids.stated} label="見積書に書かれた合計" optional hint="入れると、下の合計と比べます">
                <AmountField id={ids.stated} value={estimate.statedTotal} placeholder="例: 477,042" onChange={(statedTotal) => setEstimate((e) => ({ ...e, statedTotal }))} />
              </Field>
            </div>
          </section>

          <section aria-labelledby="lines-title" className="mt-9">
            <SheetHeading
              n={2}
              title={<span id="lines-title">見積書の項目</span>}
              right={estimate.lines.length > 0 ? <span className="text-xs text-ink-soft">{estimate.lines.length}行</span> : undefined}
              note="見積書に書かれている項目を、1行ずつ足して、金額（税込）を入れます。名前は、見積書に書かれているとおりに直せます。"
            />

            {estimate.lines.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <BlankSheetArt />
                  </EmptyMedia>
                  <EmptyTitle>項目が、まだ入っていません</EmptyTitle>
                  <EmptyDescription>下の「項目を足す」から、見積書の項目を足してください。サンプルの見積書で、先に動きを見ることもできます。</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={onSample}>
                    サンプルの見積書を入れる
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div aria-hidden className="hidden grid-cols-[2rem_minmax(0,1fr)_9.5rem_8.25rem] gap-x-3 border-b border-rule-strong pb-1 text-xs text-ink-soft sm:grid">
                  <span className="text-center">No.</span>
                  <span>見積書に書かれている名前</span>
                  <span>金額（税込）</span>
                  <span className="sr-only">操作</span>
                </div>
                <ol>
                  {estimate.lines.map((line, i) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      index={i}
                      count={estimate.lines.length}
                      finding={findingById.get(line.id)}
                      onChange={(patch) => setEstimate((e) => updateLine(e, line.id, patch))}
                      onMove={(d) => move(line, d)}
                      onRemove={() => remove(line, i)}
                      onChangeKind={() => setKindLineId(line.id)}
                      onEnter={() => {
                        const next = estimate.lines[i + 1]
                        setFocus(next ? { lineId: next.id, role: 'amount' } : { search: true })
                      }}
                    />
                  ))}
                </ol>
                <div className="flex items-baseline justify-between gap-4 border-b-[1.5px] border-ink/70 px-1 py-3 sm:pl-11">
                  <span className="text-sm font-bold">入力した項目の合計</span>
                  <span className="num text-xl font-bold">{formatYen(inspection.total)}</span>
                </div>
              </>
            )}

            <div className="no-print mt-5 border border-dashed border-ink/35 bg-muted/60 p-3 sm:p-4">
              <p id={ids.add} className="text-sm font-bold">
                項目を足す
              </p>
              <p className="mb-2 mt-0.5 text-[13px] leading-6 text-ink-soft">見積書に書かれている言葉を打つと、候補が出ます（例:「抗菌」「サポート」「かぎ」）。</p>
              {full ? (
                <p role="status" className="text-sm leading-7">
                  項目は、{LIMITS.maxLines}行まで入れられます。足すときは、要らない行を消してください。
                </p>
              ) : (
                <>
                  <ItemSearch
                    labelledBy={ids.add}
                    placeholder="見積書の言葉から探す"
                    inputRef={searchRef}
                    onPick={(match, query) => add(match.item.id, labelForMatch(query, match))}
                    onPickOther={(label) => add(OTHER_ITEM_ID, label)}
                  />
                  <p className="mb-2 mt-4 text-[13px] leading-6 text-ink-soft">または、一覧から選ぶ（押すと、1行足されます）</p>
                  <ItemChips usedItemIds={usedItemIds} onPick={(itemId) => add(itemId, '')} />
                </>
              )}
            </div>
          </section>

          {estimate.lines.length > 0 && (
            <div className="no-print mt-7 flex justify-end">
              <Button size="lg" onClick={onGoResult} className="w-full sm:w-auto">
                点検の結果を見る
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          )}
        </Sheet>

        {!empty && (
          <div className="no-print flex flex-wrap justify-end gap-2 px-1">
            <Button variant="ghost" size="sm" onClick={onSample}>
              サンプルの見積書に置きかえる
            </Button>
            <Button variant="destructive" size="sm" onClick={onClear}>
              全部消してやり直す
            </Button>
          </div>
        )}
      </div>

      <aside aria-label="いまの点検のようす" className="hidden lg:sticky lg:top-[4.75rem] lg:block">
        <LiveSummary inspection={inspection} onGoResult={onGoResult} />
      </aside>

      {/* 種類を変える画面 */}
      <Dialog open={kindLine !== null} onOpenChange={(o) => !o && setKindLineId(null)}>
        <DialogContent
          className="sm:max-w-2xl"
          // はじめのフォーカスは、探す欄ではなく、画面そのものに置く（スマホで、開いたとたんにキーボードが出て、一覧が隠れるのを防ぐ）。
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>どの項目として点検するかを、選ぶ</DialogTitle>
            <DialogDescription>
              {kindLine && (
                <>
                  「{lineLabel(kindLine)}」を、いまは「{getItem(kindLine.itemId).name}」として点検しています。合う項目を選んでください。見積書に書かれている名前は、変わりません。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {kindLine && (
            <KindChooser
              line={kindLine}
              onChoose={(itemId) => {
                const item = getItem(itemId)
                // 「その他」にするときは、名前が空だと何の行かわからなくなるので、いまの項目の名前を残す。
                const label = itemId === OTHER_ITEM_ID && kindLine.label.trim() === '' ? getItem(kindLine.itemId).name : kindLine.label
                setEstimate((e) => updateLine(e, kindLine.id, { itemId, label }))
                setKindLineId(null)
                toast.message(`「${lineLabel({ ...kindLine, label })}」を、「${item.name}」として点検します。`)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ id, label, hint, optional, children }: { id: string; label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 flex items-baseline gap-1.5 text-[13px] font-bold leading-5">
        {label}
        {optional && <span className="rounded-[2px] border border-ink-soft/50 px-1 text-[11px] font-normal leading-4 text-ink-soft">任意</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs leading-5 text-ink-soft">{hint}</p>}
    </div>
  )
}

/**
 * 日付の入力欄。
 * この道具が扱えるのは 2000年〜2100年の日付（core の isValidDate）。それより外の日付を打ったときは、
 * 打った日付を消さずに残して、直し方を出す（何も言わずに欄が空に戻ると、何が起きたのかわからないため）。
 */
function DateField({ id, value, onChange }: { id: string; value: string | null; onChange: (value: string | null) => void }) {
  const [text, setText] = useState(value ?? '')
  const errorId = useId()
  // 外から値が変わったとき（サンプル、読み込み、元に戻す）だけ、表示を合わせる。
  useEffect(() => {
    setText((current) => ((current !== '' && isValidDate(current) ? current : null) === value ? current : (value ?? '')))
  }, [value])
  const invalid = text !== '' && !isValidDate(text)
  return (
    <>
      <Input
        id={id}
        type="date"
        min="2000-01-01"
        max="2100-12-31"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => {
          const v = e.target.value
          setText(v)
          onChange(v !== '' && isValidDate(v) ? v : null)
        }}
        className="num"
      />
      {invalid && (
        <p id={errorId} role="alert" className="mt-1 text-xs leading-5 text-pen">
          2000年から2100年までの日付を、入れてください。
        </p>
      )}
    </>
  )
}

/** 行の下に入る、赤ペンの短い書き込み（印と言葉）。くわしい結果は、手順2で出す。 */
function LiveMark({ finding, index }: { finding: Finding; index: number }) {
  const category = getCategory(finding.category)
  const attention = finding.level === 'check' || finding.level === 'alert'
  // 「ふつうはかかる」の行でも、計算が目安と違うときは、確かめる項目になる。そのときは、何が違うのかを言う。
  const text = attention && category.attention === 'calm' ? finding.headline : category.label
  return (
    <span className={cn('inline-flex items-center gap-1.5', attention ? 'font-pen text-[15px] text-pen' : 'text-[13px] text-ink-soft')}>
      <FindingMark f={finding} variant={index} className="text-[12px]" />
      <span>{text}</span>
    </span>
  )
}

function LineRow({
  line,
  index,
  count,
  finding,
  onChange,
  onMove,
  onRemove,
  onChangeKind,
  onEnter,
}: {
  line: EstimateLine
  index: number
  count: number
  finding: Finding | undefined
  onChange: (patch: Partial<Omit<EstimateLine, 'id'>>) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onChangeKind: () => void
  onEnter: () => void
}) {
  const item = getItem(line.itemId)
  const n = index + 1
  const name = lineLabel(line)
  const isOther = item.id === OTHER_ITEM_ID
  const first = index === 0
  const last = index === count - 1
  const iconButton =
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-transparent sm:size-10'

  return (
    <li
      data-line={line.id}
      className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 border-b border-rule py-3 sm:grid-cols-[2rem_minmax(0,1fr)_9.5rem_8.25rem] sm:gap-x-3"
    >
      <span aria-hidden className="num row-span-3 pt-2.5 text-center text-[13px] text-ink-soft sm:row-span-2">
        {n}
      </span>

      <div className="col-span-2 min-w-0 sm:col-span-1">
        <Input
          data-role="name"
          aria-label={`${n}行目の名前（見積書に書かれている名前）`}
          value={line.label}
          maxLength={LIMITS.maxLabel}
          placeholder={isOther ? '見積書に書かれている名前' : item.name}
          onChange={(e) => onChange({ label: e.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="min-w-0">
        <AmountField
          data-role="amount"
          aria-label={`${n}行目（${name}）の金額`}
          value={line.amount}
          placeholder="金額"
          onChange={(amount) => onChange({ amount })}
          onEnter={onEnter}
        />
      </div>

      <div className="no-print flex items-start justify-end">
        <button type="button" data-role="up" className={iconButton} aria-disabled={first || undefined} aria-label={`${n}行目（${name}）を、1つ上に動かす`} onClick={() => !first && onMove(-1)}>
          <ArrowUpIcon aria-hidden className="size-[18px]" />
        </button>
        <button type="button" data-role="down" className={iconButton} aria-disabled={last || undefined} aria-label={`${n}行目（${name}）を、1つ下に動かす`} onClick={() => !last && onMove(1)}>
          <ArrowDownIcon aria-hidden className="size-[18px]" />
        </button>
        <button type="button" className={cn(iconButton, 'hover:text-pen')} aria-label={`${n}行目（${name}）を消す`} onClick={onRemove}>
          <Trash2Icon aria-hidden className="size-[18px]" />
        </button>
      </div>

      <div className="col-span-2 col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:col-span-3">
        {finding && <LiveMark finding={finding} index={index} />}
        <span className="text-xs leading-5 text-ink-soft">
          {isOther ? '一覧にない項目' : line.label.trim() !== '' && line.label.trim() !== item.name ? `「${item.name}」として点検` : null}
        </span>
        <button
          type="button"
          onClick={onChangeKind}
          className="no-print -my-2 inline-flex min-h-11 cursor-pointer items-center rounded-sm px-1 text-xs text-ink-soft underline decoration-ink-soft/50 underline-offset-[3px] hover:text-ink hover:decoration-ink sm:min-h-8"
        >
          種類を変える<span className="sr-only">（{n}行目、{name}）</span>
        </button>
        {item.amountHint && <span className="basis-full text-xs leading-5 text-ink-soft">{item.amountHint}</span>}
      </div>
    </li>
  )
}

/** 種類を選ぶ画面の中身。探すか、一覧から選ぶ。 */
function KindChooser({ line, onChoose }: { line: EstimateLine; onChoose: (itemId: string) => void }) {
  const labelId = useId()
  return (
    <div className="space-y-4">
      <div>
        <p id={labelId} className="mb-1 text-[13px] font-bold">
          言葉で探す
        </p>
        <ItemSearch labelledBy={labelId} placeholder="例: 抗菌、サポート、かぎ" onPick={(match) => onChoose(match.item.id)} />
      </div>
      <ItemChips mode="choose" currentItemId={line.itemId} onPick={onChoose} />
      <div className="border-t border-rule pt-3">
        <Button variant={line.itemId === OTHER_ITEM_ID ? 'default' : 'outline'} size="sm" aria-pressed={line.itemId === OTHER_ITEM_ID} onClick={() => onChoose(OTHER_ITEM_ID)}>
          どれにも合わない（一覧にない項目として点検する）
        </Button>
      </div>
    </div>
  )
}

/** 画面の右に置く、いまの点検のようす。入れたそばから、合計と、確かめる項目の数が変わる。 */
export function LiveSummary({ inspection, onGoResult }: { inspection: Inspection; onGoResult: () => void }) {
  const count = inspection.findings.length
  return (
    <div className="sheet px-5 py-5">
      <h2 className="border-b-[1.5px] border-ink/70 pb-1.5 text-sm font-bold">いまの点検のようす</h2>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs text-ink-soft">入力した項目の合計</dt>
          <dd className="num text-2xl font-bold leading-tight">{formatYen(inspection.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">確かめる項目</dt>
          <dd className="flex items-baseline gap-2">
            {inspection.attentionCount > 0 ? (
              <PenCircle className="mx-[0.6em] my-[0.3em] text-pen" variant={1}>
                <span className="font-pen text-2xl leading-none">{inspection.attentionCount}つ</span>
              </PenCircle>
            ) : (
              <span className="text-lg font-bold">{count === 0 ? '—' : '0'}</span>
            )}
            <span className="text-xs text-ink-soft">{count > 0 ? `${count}行のうち` : '項目を足すと、出ます'}</span>
          </dd>
        </div>
      </dl>
      {inspection.notes.length > 0 && count > 0 && (
        <ul className="mt-4 space-y-2 border-t border-rule pt-3 text-[13px] leading-6 text-ink-soft">
          {inspection.notes.map((n) => (
            <li key={n.kind}>{n.text}</li>
          ))}
        </ul>
      )}
      <Button size="lg" className="mt-5 w-full" disabled={count === 0} onClick={onGoResult}>
        点検の結果を見る
        <ArrowRightIcon aria-hidden className="size-4" />
      </Button>
    </div>
  )
}
