import { useMemo } from 'react'
import { ArrowRightIcon, PencilLineIcon, PrinterIcon } from 'lucide-react'
import {
  ASK_TOTAL_LABEL,
  ASK_TOTAL_NOTE,
  DISCLAIMER,
  RULES_VERIFIED_ON,
  SAMPLE_NOTE,
  VERIFY_METHOD_NOTE,
  defaultAskLineIds,
  formatDateJa,
  formatYen,
  getCategory,
  isSampleEstimate,
  type AppData,
  type Inspection,
} from '@/core'
import { visibleOffers } from '@/offers'
import { site } from '@/site.config'
import { CategoryMark } from '@/components/category-mark'
import { ConsultDesks } from '@/components/consult-desks'
import { FindingCard } from '@/components/finding-card'
import { InspectedSheet } from '@/components/inspected-sheet'
import { OfferSlot } from '@/components/offer-slot'
import { DateStamp, PenCircle } from '@/components/pen'
import { Sheet, SheetHeading, SheetNote, SheetTitle } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAccordion } from '@/components/ui/disclosure'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// 手順2「点検の結果」。
// 1枚目の紙: 赤ペンが入った見積書（一覧）と、合計・区分ごとの小計・「もし全部外せた場合の差」。
// 2枚目の紙: 項目ごとの、くわしい結果（なぜそう言うのか、確かめること、聞き方、根拠）。
// 3枚目の紙: 相談先と、この道具の立て付け。
// 印刷（A4）では、この3枚を続けて出す。折りたたみは、全部開いて出る。

export type ResultStepProps = {
  data: AppData
  setData: (next: AppData | ((prev: AppData) => AppData)) => void
  inspection: Inspection
  onGoInput: () => void
  onGoMessage: () => void
  onSample: () => void
}

function todayString(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 日付のはんこに入れる形（'2026-11-15' → '26.11.15'）。 */
function stampDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${y.slice(2)}.${Number(m)}.${Number(d)}`
}

export function ResultStep({ data, setData, inspection, onGoInput, onGoMessage, onSample }: ResultStepProps) {
  const { estimate } = data
  const ids = useMemo(() => inspection.findings.map((f) => f.lineId), [inspection.findings])
  const accordion = useAccordion({ ids })
  const offers = visibleOffers('result')

  if (inspection.findings.length === 0) {
    return (
      <Sheet aria-labelledby="result-title" className="mx-auto max-w-3xl">
        <SheetTitle title="点検の結果" eyebrow={site.name} />
        <h2 id="result-title" className="sr-only">
          点検の結果
        </h2>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>見積書の項目が、まだ入っていません</EmptyTitle>
            <EmptyDescription>項目と金額を入れると、ここに、赤ペンの入った見積書と、項目ごとの点検の結果が出ます。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={onGoInput}>見積書を入れる</Button>
              <Button variant="outline" onClick={onSample}>
                サンプルの見積書を入れる
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </Sheet>
    )
  }

  // 確認の文面に入れる行。まだ選んでいなければ、確かめる項目の全部。
  const askIds = new Set(data.message.lineIds ?? defaultAskLineIds(inspection))
  const toggleAsk = (lineId: string, on: boolean) =>
    setData((prev) => {
      const current = new Set(prev.message.lineIds ?? defaultAskLineIds(inspection))
      if (on) current.add(lineId)
      else current.delete(lineId)
      // 見積書の行の順にそろえて持つ。
      return { ...prev, message: { ...prev.message, lineIds: ids.filter((id) => current.has(id)) } }
    })

  const isSample = isSampleEstimate(estimate)
  const count = inspection.findings.length
  const today = todayString()
  const totalText = formatYen(inspection.total)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] print:block">
      <div className="min-w-0 space-y-6 print:space-y-0">
        {/* ---------------- 1枚目: 赤ペンが入った見積書 ---------------- */}
        <Sheet aria-labelledby="result-title">
          <SheetTitle
            title="初期費用の見積書"
            eyebrow={
              <>
                <span className="print-only">{site.name}　</span>点検の結果
              </>
            }
            right={
              <DateStamp
                top="みつもり"
                bottom="点検"
                date={stampDate(today)}
                label={`点検した日: ${formatDateJa(today)}`}
                className="-mb-1 size-[3.75rem] sm:-mb-9 sm:size-[4.75rem]"
              />
            }
          />
          <h2 id="result-title" className="sr-only">
            点検の結果
          </h2>

          {isSample && <SheetNote className="mb-5">{SAMPLE_NOTE}</SheetNote>}

          {/* まず、答えを出す（確かめる項目の数、合計、もし全部外せた場合の差）。そのあとに、赤ペンの入った見積書を見せる。 */}
          {/* せまい画面では、左のマスは中身の幅、右のマス（合計）は残り全部。けたの多い合計が、マスからはみ出さないようにする。 */}
          <div className="print-keep mb-5 grid grid-cols-[auto_minmax(0,1fr)] border border-rule-strong/70 sm:grid-cols-[auto_auto_minmax(0,1fr)] print:grid-cols-[auto_auto_minmax(0,1fr)]">
            <div className="px-4 py-3">
              <p className="text-[13px] font-bold">確かめる項目</p>
              <p className="mt-1.5 flex items-baseline gap-2">
                {inspection.attentionCount > 0 ? (
                  <PenCircle draw className="mx-[0.7em] my-[0.3em] text-pen" variant={2}>
                    <span className="font-pen text-[1.75rem] leading-none">{inspection.attentionCount}つ</span>
                  </PenCircle>
                ) : (
                  <span className="num text-2xl font-bold leading-tight">0</span>
                )}
                <span className="text-xs text-ink-soft">{count}行のうち</span>
              </p>
            </div>
            <div className="border-l border-rule-strong/70 px-4 py-3">
              <p className="text-[13px] font-bold">入力した項目の合計</p>
              <p className={cn('num mt-1.5 font-bold', totalText.length > 11 ? 'text-lg leading-[2.1]' : 'text-2xl leading-[1.6]')}>{totalText}</p>
            </div>
            <div className="col-span-2 border-t border-rule-strong/70 px-4 py-3 sm:col-span-1 sm:border-l sm:border-t-0 print:col-span-1 print:border-l print:border-t-0">
              <p className="text-[13px] font-bold">{ASK_TOTAL_LABEL}</p>
              {inspection.askCount > 0 ? (
                <>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className="num text-2xl font-bold leading-[1.6]">{formatYen(inspection.askTotal)}</span>
                    <span className="text-xs text-ink-soft">{inspection.askCount}項目の合計</span>
                  </p>
                  <p className="mt-1 text-xs leading-[1.7] text-ink-soft">{ASK_TOTAL_NOTE}</p>
                </>
              ) : (
                <p className="mt-1.5 text-[13px] leading-6 text-ink-soft">「必須か任意か、確かめる」「だれが負担するか、確かめる」に入る項目は、ありませんでした。</p>
              )}
            </div>
          </div>

          <p className="mb-2 text-[13px] leading-6 text-ink-soft">
            {inspection.attentionCount > 0
              ? '赤ペンの丸が付いた行が、確かめる項目です。外せると決まったわけではありません。不動産会社に聞いてみる項目です。'
              : '赤ペンを入れる項目は、見つかりませんでした。契約書の内容は、ご自身でも確かめてください。'}
          </p>

          <InspectedSheet inspection={inspection} draw linkToDetails onSelect={(id) => accordion.openOne(id)} />

          <p className="mt-3 text-[13px] leading-6 text-ink-soft">
            点検した日: {formatDateJa(today)}　／　ルールの最終確認日: {formatDateJa(RULES_VERIFIED_ON)}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-[13px] leading-6 text-ink-soft">
            <span className="font-bold">計算のもと</span>
            <dl className="contents">
              <Basis label="家賃（月額）" value={estimate.rent === null ? '未入力' : formatYen(estimate.rent)} />
              <Basis label="管理費・共益費（月額）" value={estimate.commonFee === null ? '未入力' : formatYen(estimate.commonFee)} />
              <Basis label="入居する日" value={estimate.moveInDate === null ? '未入力' : formatDateJa(estimate.moveInDate)} />
            </dl>
          </div>

          {inspection.notes.length > 0 && (
            <ul className="mt-2 space-y-1 text-[13px] leading-6 text-ink-soft">
              {inspection.notes.map((n) => (
                <li key={n.kind} className="flex gap-2">
                  <span aria-hidden>※</span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="print-keep mt-7">
            <SheetHeading title="区分ごとの小計" as="h3" note="印と言葉で、区分を見分けられます。金額の高い安いは、判定していません。" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">印</span>
                  </TableHead>
                  <TableHead>区分</TableHead>
                  <TableHead className="hidden sm:table-cell print:table-cell">見ていること</TableHead>
                  <TableHead className="whitespace-nowrap text-right">行の数</TableHead>
                  <TableHead className="whitespace-nowrap text-right">小計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspection.byCategory.map((row, i) => {
                  const c = getCategory(row.category)
                  return (
                    <TableRow key={row.category}>
                      <TableCell className="py-2">
                        <CategoryMark id={row.category} variant={i} className="text-[13px]" />
                      </TableCell>
                      <TableCell className="sm:font-bold">{c.label}</TableCell>
                      <TableCell className="hidden text-[13px] leading-6 text-ink-soft sm:table-cell print:table-cell">{c.short}</TableCell>
                      <TableCell className="num text-right">{row.count}</TableCell>
                      <TableCell className="num text-right">{formatYen(row.subtotal)}</TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="border-b-[1.5px] border-ink/70">
                  <TableCell />
                  <TableCell className="font-bold">合計</TableCell>
                  <TableCell className="hidden sm:table-cell print:table-cell" />
                  <TableCell className="num text-right font-bold">{count}</TableCell>
                  <TableCell className="num text-right font-bold">{formatYen(inspection.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {inspection.excludedTotal > 0 && (
              <p className="mt-2 text-[13px] leading-6 text-ink-soft">
                ※ 初期費用ではない項目（更新料 など）の {formatYen(inspection.excludedTotal)} は、合計に入れていません。
              </p>
            )}
          </div>
        </Sheet>

        {/* ---------------- 2枚目: 項目ごとの、くわしい結果 ---------------- */}
        <Sheet aria-labelledby="details-title" className="print:pt-6">
          <SheetHeading
            as="h2"
            title={<span id="details-title">項目ごとの点検</span>}
            right={
              <Button variant="ghost" size="sm" className="no-print -my-1" onClick={() => (accordion.allOpen ? accordion.closeAll() : accordion.openAll())}>
                {accordion.allOpen ? '全部閉じる' : '全部開く'}
              </Button>
            }
            note={
              <>
                <span className="no-print">行ごとに、なぜそう言うのか、確かめること、聞き方、根拠を出します。チェックを入れた項目は、手順3の確認の文面に入ります。</span>
                <span className="print-only">確かめる項目（と、画面で開いてあった項目）について、なぜそう言うのか、確かめること、聞き方、根拠を出しています。</span>
              </>
            }
            className="mb-0"
          />
          <ol>
            {inspection.findings.map((f, i) => (
              <FindingCard
                key={f.lineId}
                f={f}
                n={i + 1}
                header={accordion.headerProps(f.lineId)}
                panel={accordion.panelProps(f.lineId)}
                footer={
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox checked={askIds.has(f.lineId)} onCheckedChange={(v) => toggleAsk(f.lineId, v === true)} />
                    <span>確認の文面に入れる</span>
                    <span className="sr-only">（{f.label}）</span>
                  </label>
                }
              />
            ))}
          </ol>
        </Sheet>

        {/* ---------------- 3枚目: 相談先と、立て付け ---------------- */}
        <Sheet aria-labelledby="consult-title" className="print:pt-6">
          <div className="print-keep">
            <SheetHeading as="h2" title={<span id="consult-title">困ったときの相談先</span>} />
            <ConsultDesks />
          </div>
          <div className="print-keep mt-7 border-t border-rule pt-4">
            <h3 className="text-[13px] font-bold">この道具について</h3>
            <p className="mt-1 text-[13px] leading-6 text-ink-soft">{DISCLAIMER}</p>
            <p className="mt-1 text-[13px] leading-6 text-ink-soft">
              ルール（項目のデータと出典）の最終確認日: {formatDateJa(RULES_VERIFIED_ON)}
              {site.baseUrl && <span className="print-only">　{site.name}（{site.baseUrl}）</span>}
            </p>
            {VERIFY_METHOD_NOTE && <p className="mt-1 text-[13px] leading-6 text-ink-soft">{VERIFY_METHOD_NOTE}</p>}
          </div>
        </Sheet>

        {offers.length > 0 && <OfferSlot offers={offers} className="no-print" />}

        <div className="no-print flex flex-col gap-2 sm:flex-row sm:justify-between lg:hidden">
          <Button variant="outline" onClick={onGoInput}>
            <PencilLineIcon aria-hidden className="size-4" />
            見積書を直す
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon aria-hidden className="size-4" />
              印刷する（A4）
            </Button>
            <Button onClick={onGoMessage}>
              確認の文面を作る
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <aside aria-label="次にすること" className="no-print hidden lg:sticky lg:top-[4.75rem] lg:block">
        <div className="sheet px-5 py-5">
          <h2 className="border-b-[1.5px] border-ink/70 pb-1.5 text-sm font-bold">次にすること</h2>
          <ol className="mt-4 space-y-4">
            <li>
              <p className="mb-1.5 text-[13px] leading-6 text-ink-soft">確かめる項目について、不動産会社に送る文面を作れます。</p>
              <Button className="w-full" onClick={onGoMessage}>
                確認の文面を作る
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </li>
            <li>
              <p className="mb-1.5 text-[13px] leading-6 text-ink-soft">相談に行くときに、紙で持っていけます。確かめる項目の理由と根拠が入ります。ほかの項目も入れたいときは、「全部開く」を押してから印刷してください。</p>
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                <PrinterIcon aria-hidden className="size-4" />
                印刷する（A4）
              </Button>
            </li>
            <li>
              <Button variant="ghost" className="w-full" onClick={onGoInput}>
                <PencilLineIcon aria-hidden className="size-4" />
                見積書を直す
              </Button>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  )
}

function Basis({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
  )
}
