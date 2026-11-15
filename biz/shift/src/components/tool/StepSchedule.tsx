// ④ シフト表。自動作成、点検の結果、組めない理由と提案、手直し、印刷、CSV、翌月への引き継ぎ。
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, Download, Info, Lock, Printer, CalendarPlus, RefreshCw, Sparkles, Users } from 'lucide-react'
import {
  buildCalendar,
  buildExportFile,
  carryNote,
  carryToNextMonth,
  cellOptions,
  countLocked,
  csvFileName,
  downloadText,
  emptySchedule,
  explainShortages,
  formatDay,
  formatMonth,
  isLocked,
  isScheduleEmpty,
  nextMonth,
  precheck,
  setCell,
  shiftAt,
  toCsv,
  unlockAll,
  unlockCell,
  type CheckReport,
  type SlotExplanation,
  type SolveProgress,
  type Suggestion,
  type SuggestionResult,
} from '@/core'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useIsMobile } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { toast } from '@/components/ui/toast'
import { ShiftBlock } from '@/components/shift-block'
import { ShiftGrid } from '@/components/shift-grid'
import { StepHeading, useTool } from './tool-context'

export type SuggestState = {
  /** idle = なし、working = 組み直して確かめている途中、done = できた */
  status: 'idle' | 'working' | 'done'
  result: SuggestionResult | null
  progress: { done: number; total: number } | null
}

export type StepScheduleProps = {
  report: CheckReport
  /** 自動作成の途中なら、その進み具合 */
  solving: SolveProgress | null
  suggest: SuggestState
  /** この数が変わると、ブロックがはまる動きが流れる */
  animKey: number
  /** 表を作ったあとで、人数・条件・希望を変えたか */
  stale: boolean
  onSolve: () => void
  onAdopt: (s: Suggestion) => void
}

const PHASE_TEXT: Record<SolveProgress['phase'], string> = {
  greedy: '埋めにくい日から、順に置いています',
  improve: '入れ替えて、良くしています',
  finish: '仕上げています',
  retry: '足りないところが残ったので、条件を変えずに、別の案も作っています',
}

export function StepSchedule({ report, solving, suggest, animKey, stale, onSolve, onAdopt }: StepScheduleProps) {
  const { plan, update, replace, notifyUndo, gate, isPro, openLicense, goStep } = useTool()
  // マスの選択肢は、開くたびにこの画面ぜんたいを描き直さなくてすむよう、開いているマスを CellEditor の中に持たせる
  const editor = useRef<CellEditorHandle>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [carryOpen, setCarryOpen] = useState(false)

  const pre = useMemo(() => precheck(plan), [plan])
  const empty = isScheduleEmpty(plan.schedule)
  const locked = countLocked(plan.schedule)
  const calendar = useMemo(() => buildCalendar(plan), [plan])
  const holidays = calendar.filter((d) => d.holiday)
  const canSolve = gate.canSolve && pre.blockers.length === 0 && !solving
  const note = carryNote(plan)
  const next = nextMonth(plan.year, plan.month)

  const solveLabel = empty ? 'シフトを組む' : locked > 0 ? '残りを組み直す' : '別の案を作る'

  /** 表の中のマスを、見つけやすいように光らせて、そこまでスクロールする */
  const showCell = (staffId: string, day: number) => {
    const key = `${staffId}:${day}`
    const el = document.querySelector<HTMLElement>(`[data-cell="${key}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    el.focus({ preventScroll: true })
    setFlash(key)
    window.setTimeout(() => setFlash((f) => (f === key ? null : f)), 1700)
  }

  const exportCsv = () => {
    if (!gate.canCsv) return openLicense()
    downloadText(csvFileName(plan), toCsv(plan), 'text/csv')
    toast.success('CSV のファイルを書き出しました。Excel で開けます。')
  }

  const saveFile = () => {
    const file = buildExportFile(plan)
    downloadText(file.filename, file.text, file.mime)
    toast.success(`ファイルに保存しました（${file.filename}）。`)
  }

  if (plan.staff.length === 0 || plan.shiftTypes.length === 0) {
    return (
      <div>
        <StepHeading no={4} title="シフト表" lead="ボタンを押すと、たたき台を作ります。" />
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Users />
            </EmptyMedia>
            <EmptyTitle>{plan.staff.length === 0 ? '先に、スタッフを入れてください' : '先に、勤務の種類を入れてください'}</EmptyTitle>
            <EmptyDescription>表は、スタッフと勤務の種類が入ってから作れます。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => goStep(0)}>①店とスタッフへ</Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      <StepHeading
        no={4}
        title="シフト表"
        lead={empty ? 'ボタンを押すと、希望休と必要な人数から、たたき台を作ります。できた表は、マスを押して直せます。' : 'マスを押すと、勤務を変えられます。手で変えたマスは固定になり、組み直しても残ります。'}
      />

      {note ? (
        <Notice variant="info" className="mb-4">
          <NoticeBody>{note}</NoticeBody>
        </Notice>
      ) : null}

      {!gate.canSolve && gate.message ? (
        <Notice variant="warn" className="mb-4">
          <NoticeBody>
            {gate.message}
            <Button variant="link" className="ml-1 text-[13.5px]" onClick={openLicense}>
              {site.plans.pro.name}版について見る
            </Button>
          </NoticeBody>
        </Notice>
      ) : null}
      {gate.untested && gate.message ? (
        <Notice variant="info" className="mb-4">
          <NoticeBody>{gate.message}</NoticeBody>
        </Notice>
      ) : null}

      {pre.blockers.length > 0 ? (
        <Notice variant="danger" className="mb-4">
          <NoticeTitle>このままでは、組めません</NoticeTitle>
          <NoticeBody>
            <ul className="list-disc pl-4">
              {pre.blockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </NoticeBody>
        </Notice>
      ) : null}
      {pre.warnings.length > 0 ? (
        <Notice variant="warn" className="mb-4">
          <NoticeTitle>組む前に、知っておいてください</NoticeTitle>
          <NoticeBody>
            <ul className="list-disc pl-4">
              {pre.warnings.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </NoticeBody>
        </Notice>
      ) : null}

      {/* 操作 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <Button size="lg" onClick={onSolve} disabled={!canSolve} className="min-w-[11rem]">
          {empty ? <Sparkles aria-hidden /> : <RefreshCw aria-hidden />}
          {solveLabel}
        </Button>
        {locked > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-well px-2.5 py-1 text-[13px] font-bold">
              <Lock aria-hidden className="size-3.5" strokeWidth={2.75} />
              固定したマス <span className="font-num">{locked}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                update((p) => ({ ...p, schedule: unlockAll(p.schedule) }))
                notifyUndo(`固定を${locked}マス、すべて外しました。入っている勤務は、そのままです。`)
              }}
            >
              固定をすべて外す
            </Button>
          </div>
        ) : null}
        {!empty ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              update((p) => ({ ...p, schedule: emptySchedule() }))
              notifyUndo('表を空にしました。')
            }}
          >
            表を空にする
          </Button>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            印刷する
          </Button>
          <Button variant="outline" onClick={exportCsv} aria-describedby={gate.canCsv ? undefined : 'pro-only-note'}>
            <Download aria-hidden />
            CSV で書き出す
            {!gate.canCsv ? <ProBadge /> : null}
          </Button>
          <Button variant="outline" onClick={() => (gate.canCarryOver ? setCarryOpen(true) : openLicense())} aria-describedby={gate.canCarryOver ? undefined : 'pro-only-note'}>
            <CalendarPlus aria-hidden />
            翌月へ引き継ぐ
            {!gate.canCarryOver ? <ProBadge /> : null}
          </Button>
        </div>
      </div>
      {!isPro ? (
        <p id="pro-only-note" className="-mt-2 mb-4 text-right text-[12.5px] text-ink-soft">
          「{site.plans.pro.name}」の印が付いた操作は、{site.plans.pro.name}版（{site.plans.pro.price}）で使えます。
        </p>
      ) : null}

      {/* 進み具合。読み上げにも伝える */}
      <div aria-live="polite" className="min-h-0">
        {solving ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border-2 border-ink bg-card px-4 py-3">
            <span className="text-sm font-bold">
              {PHASE_TEXT[solving.phase]}
              {solving.retry ? (
                <span className="font-num font-medium text-ink-soft">
                  （{solving.retry.index}／{solving.retry.total}）
                </span>
              ) : null}
            </span>
            <span aria-hidden className="flex gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                // 別の案を作っているあいだ（retry）は、その全体の進み具合を、はじめから数え直して見せる
                const t = solving.phase === 'retry' ? solving.ratio : solving.phase === 'greedy' ? solving.ratio * 0.25 : solving.phase === 'improve' ? 0.25 + solving.ratio * 0.65 : 0.9 + solving.ratio * 0.1
                const colors = ['egg', 'sky', 'tomato', 'teal']
                return <span key={i} className="blk" data-size="sm" data-color={i < Math.round(t * 12) ? colors[i % colors.length] : undefined} />
              })}
            </span>
          </div>
        ) : null}
      </div>

      {stale && !empty && !solving ? (
        <Notice variant="info" className="mb-4">
          <NoticeBody>表を作ったあとで、人数・条件・希望のどれかを変えています。「{solveLabel}」を押すと、変えた内容で組み直します。下の点検は、いまの条件で調べ直してあります。</NoticeBody>
        </Notice>
      ) : null}

      {!empty ? <ReportPanel report={report} onShowCell={showCell} /> : null}
      {!empty ? <SuggestPanel suggest={suggest} onAdopt={onAdopt} /> : null}

      <div aria-busy={!!solving} className={cn(solving && 'pointer-events-none opacity-60')}>
        <ShiftGrid
          plan={plan}
          report={empty ? undefined : report}
          animateKey={animKey}
          flashCell={flash}
          label={`${formatMonth(plan.year, plan.month)}のシフト表`}
          onCellPress={(staffId, day, el) => editor.current?.open(staffId, day, el)}
        />
      </div>

      {/* 記号の説明 */}
      <div className="mt-4 rounded-lg border-2 border-ink/25 bg-card/70 px-4 py-3">
        <h2 className="sr-only">記号の説明</h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] leading-snug">
          {plan.shiftTypes.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <ShiftBlock shift={s} size="sm" />
              <span className="font-bold">{s.name || '（名前なし）'}</span>
              <span className="font-num text-ink-soft">
                {s.start}〜{s.end}
              </span>
            </li>
          ))}
        </ul>
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-2.5 text-[12.5px] leading-snug text-ink-soft">
          <li className="flex items-center gap-1.5">
            <span className="font-bold text-ink">希</span>休み希望で休みの日
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block border-[5px] border-transparent border-l-ink border-t-ink" />
            手で固定したマス
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="grid size-4 place-items-center rounded-[3px] bg-danger font-num text-[10px] font-bold text-white">
              !
            </span>
            条件に合わないマス
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-ink/40 bg-[repeating-linear-gradient(135deg,var(--well)_0_3px,#e3d9bb_3px_6px)]" />
            店を開けない日
          </li>
          <li>{empty ? '下の行の数字は、その日に必要な人数' : '下の行の数字は、その日に入っている人数（赤い「−1」は1人足りない、「+1」は1人多い、赤い「役」は役割の最低人数が足りない）'}</li>
          {holidays.length > 0 ? <li>この月の祝日: {holidays.map((d) => `${d.day}日（${d.holiday}）`).join('、')}</li> : null}
        </ul>
        <p className="mt-2 border-t border-line pt-2 text-[12.5px] leading-snug text-ink-soft">印刷は、A4 の横向き1枚です（人数が多いときは、同じくらいの人数ずつ2枚以上に分けて、どの紙にも店の名前と年月、記号の説明を入れます）。たて向きで出るときは、印刷の画面で、用紙の向きを「横」にしてください。</p>
      </div>

      {/* マスを押したときの選択肢。広い画面では吹き出し、せまい画面では下からのシート */}
      <CellEditor ref={editor} />

      {/* 翌月へ引き継ぐ前の確かめ */}
      <Dialog open={carryOpen} onOpenChange={setCarryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formatMonth(next.year, next.month)}へ引き継ぎますか</DialogTitle>
            <DialogDescription>スタッフと条件を、そのまま次の月へ持っていきます。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="list-disc space-y-1 pb-3 pl-5 text-sm leading-relaxed">
              <li>持っていくもの: 店の名前、定休日の曜日、勤務の種類、スタッフ、曜日ごとの必要な人数、条件</li>
              <li>{empty ? '表がまだ空なので、前の月の勤務は持っていきません。' : `${formatMonth(plan.year, plan.month)}の終わりの勤務も持っていき、月をまたぐ連勤を数えます。`}</li>
              <li>持っていかないもの: 希望休、この月だけの休みの日と人数</li>
            </ul>
            <Notice variant="warn" className="mb-4">
              <NoticeTitle>{formatMonth(plan.year, plan.month)}の表は、この画面から消えます</NoticeTitle>
              <NoticeBody>この道具が覚えておけるのは、1か月ぶんだけです。残しておきたいときは、先にファイルに保存するか、印刷してください。</NoticeBody>
            </Notice>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCarryOpen(false)}>
              やめる
            </Button>
            <Button variant="outline" onClick={saveFile}>
              <Download aria-hidden />
              先にファイルに保存する
            </Button>
            <Button
              onClick={() => {
                replace(carryToNextMonth(plan))
                setCarryOpen(false)
                notifyUndo(`${formatMonth(next.year, next.month)}へ引き継ぎました。希望休を入れてから、組んでください。`, 'success')
                goStep(2)
              }}
            >
              {formatMonth(next.year, next.month)}へ進む
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProBadge() {
  return <span className="rounded-[4px] border border-ink bg-shift-egg px-1 py-0.5 text-[10px] font-extrabold leading-none">{site.plans.pro.name}</span>
}

/** 点検の結果。0件のときも「0件」と言う */
function ReportPanel({ report, onShowCell }: { report: CheckReport; onShowCell: (staffId: string, day: number) => void }) {
  const { plan } = useTool()
  const explanations = useMemo(() => explainShortages(plan, plan.schedule, report), [plan, report])
  const [showAll, setShowAll] = useState(false)
  const allGood = report.summaryItems.every((x) => x.tone === 'ok')
  const firstStaff = plan.staff[0]?.id
  /**
   * 「この日を見る」で移るマス。足りない勤務のマスに移す（ほかの勤務のマスに移すと、どこの話かわからない）。
   * まだ入れられる人 → 役割の不足なら、その勤務に入っている札のない人 → その勤務に入っている人 → 1人め、の順
   */
  const cellFor = (e: SlotExplanation): string => {
    const free = e.reasons.find((r) => r.reason === 'free')?.staffIds[0]
    if (free) return free
    const on = plan.staff.filter((st) => shiftAt(plan.schedule, st.id, e.day) === e.shiftId)
    const pick = (e.tagId ? on.find((st) => !st.tagIds.includes(e.tagId!)) : undefined) ?? on[0]
    return pick?.id ?? firstStaff ?? ''
  }
  const shownExplanations = showAll ? explanations : explanations.slice(0, 6)
  const softNotes = [...report.minDaysShort.map((x) => x.message), ...report.wishesUnmet.map((x) => x.message), ...report.weeksWithoutOff.map((x) => x.message)]

  return (
    <section aria-labelledby="report-title" className={cn('mb-4 rounded-xl border-2 bg-card', allGood ? 'border-ok' : 'border-ink')}>
      <div className="px-4 py-3 md:px-5">
        <h2 id="report-title" className="text-base">
          点検の結果
        </h2>
        <ul className="mt-2 grid gap-1.5">
          {report.summaryItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-bold leading-relaxed">
              {item.tone === 'ok' ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-[18px] shrink-0 text-ok" strokeWidth={2.5} />
              ) : item.tone === 'bad' ? (
                <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0 text-danger" strokeWidth={2.5} />
              ) : (
                <Info aria-hidden className="mt-0.5 size-[18px] shrink-0 text-ink-soft" strokeWidth={2.5} />
              )}
              <span className={cn(item.tone === 'bad' && 'text-danger', item.tone === 'note' && 'font-medium')}>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {report.violations.length > 0 ? (
        <details open className="border-t-2 border-ink/15 px-4 py-3 md:px-5">
          <summary className="min-h-8 text-sm font-bold">条件に合わないところ（{report.violations.length}件）</summary>
          <ul className="mt-2 grid gap-1.5">
            {report.violations.map((v, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-danger-soft px-3 py-1.5 text-[13.5px] leading-relaxed">
                <span className="min-w-0 flex-1 basis-60">{v.message}</span>
                {v.days.length > 0 ? (
                  <Button variant="link" className="shrink-0 text-[13px]" onClick={() => onShowCell(v.staffId, v.days[v.days.length - 1])}>
                    このマスを見る
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">手で入れた勤務は、条件に合っていなくても、そのまま残します。直すときは、マスを押して変えてください。</p>
        </details>
      ) : null}

      {explanations.length > 0 ? (
        <details open className="border-t-2 border-ink/15 px-4 py-3 md:px-5">
          <summary className="min-h-8 text-sm font-bold">足りないところと、その理由（{explanations.length}か所）</summary>
          <ul className="mt-2 grid gap-1.5">
            {shownExplanations.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-[#fff4cf] px-3 py-1.5 text-[13.5px] leading-relaxed">
                <span className="min-w-0 flex-1 basis-60">{e.text}</span>
                {firstStaff ? (
                  <Button variant="link" className="shrink-0 text-[13px]" onClick={() => onShowCell(cellFor(e), e.day)}>
                    この日を見る
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {explanations.length > 6 ? (
            <Button variant="link" className="mt-2 text-[13px]" onClick={() => setShowAll((v) => !v)}>
              {showAll ? '最初の6か所だけにする' : `残りの${explanations.length - 6}か所も見る`}
            </Button>
          ) : null}
        </details>
      ) : null}

      {softNotes.length > 0 ? (
        <details className="border-t-2 border-ink/15 px-4 py-3 md:px-5">
          <summary className="min-h-8 text-sm font-bold">なるべく満たしたかったこと（{softNotes.length}件）</summary>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-[13.5px] leading-relaxed">
            {softNotes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

/** 条件をゆるめる提案。実際に組み直して確かめたものだけが届く */
function SuggestPanel({ suggest, onAdopt }: { suggest: SuggestState; onAdopt: (s: Suggestion) => void }) {
  if (suggest.status === 'idle') return null
  if (suggest.status === 'working') {
    return (
      <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border-2 border-dashed border-ink/50 bg-card px-4 py-3 text-sm font-bold">
        <RefreshCw aria-hidden className="size-4 animate-spin" />
        どの条件をゆるめると埋まるか、実際に組み直して確かめています
        {suggest.progress ? (
          <span className="font-num font-medium text-ink-soft">
            （{suggest.progress.done}／{suggest.progress.total}）
          </span>
        ) : null}
      </div>
    )
  }
  const r = suggest.result
  if (!r) return null
  return (
    <section aria-labelledby="suggest-title" className="mb-4 rounded-xl border-2 border-ink bg-[#fff4cf] px-4 py-3 md:px-5">
      <h2 id="suggest-title" className="flex items-center gap-2 text-base">
        <AlertTriangle aria-hidden className="size-[18px]" strokeWidth={2.5} />
        足りないところを埋める案
      </h2>
      <p className="mt-1 text-[13.5px] leading-relaxed">{r.text}</p>
      {r.suggestions.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {r.suggestions.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border-2 border-ink bg-card px-3 py-2">
              <span className="min-w-0 flex-1 basis-64 text-sm font-bold leading-relaxed">{s.text}</span>
              {/* とてもせまい画面（幅320pxなど）では、ボタンの文を折り返す（折り返さないと、枠からはみ出して横スクロールが出る） */}
              <Button variant="outline" size="sm" className="max-w-full whitespace-normal text-left leading-snug" onClick={() => onAdopt(s)}>
                {s.relaxation.kind === 'reseed' ? 'この案にする' : 'この条件にして、組み直した表にする'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {r.suggestions.length > 0 && r.noEffect.length > 0 ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">試したが、足りないところが減らなかったもの: {r.noEffect.join('、')}</p> : null}
    </section>
  )
}

type CellEditorHandle = { open: (staffId: string, day: number, el: HTMLElement) => void }

const CellEditor = forwardRef<CellEditorHandle>(function CellEditor(_props, ref) {
  const { plan } = useTool()
  const [editing, setEditing] = useState<{ staffId: string; day: number; el: HTMLElement } | null>(null)
  useImperativeHandle(ref, () => ({ open: (staffId, day, el) => setEditing({ staffId, day, el }) }), [])
  const onClose = () => setEditing(null)
  const isMobile = useIsMobile('(max-width: 767px)')
  const body = editing ? <CellEditorBody staffId={editing.staffId} day={editing.day} onClose={onClose} /> : null
  const staffName = editing ? plan.staff.find((s) => s.id === editing.staffId)?.name || '（名前なし）' : ''
  const label = editing ? `${staffName}さん ${formatDay(plan.year, plan.month, editing.day)}の勤務を変える` : undefined
  // 閉じたあとでフォーカスを戻す先。閉じるときには editing がもう空になっているので、別に覚えておく
  const lastEl = useRef<HTMLElement | null>(null)
  if (editing) lastEl.current = editing.el
  const backToCell = (e: Event) => {
    e.preventDefault()
    lastEl.current?.focus({ preventScroll: true })
  }

  if (isMobile) {
    return (
      <Dialog open={editing !== null} onOpenChange={(v) => !v && onClose()}>
        <DialogContent onCloseAutoFocus={backToCell}>
          {body}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Popover open={editing !== null} onOpenChange={(v) => !v && onClose()}>
      {editing ? <PopoverAnchor virtualRef={{ current: editing.el }} /> : null}
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[19rem] p-0"
        aria-label={label}
        onCloseAutoFocus={backToCell}
      >
        {body}
      </PopoverContent>
    </Popover>
  )
})

function CellEditorBody({ staffId, day, onClose }: { staffId: string; day: number; onClose: () => void }) {
  const { plan, update } = useTool()
  const isMobile = useIsMobile('(max-width: 767px)')
  const staff = plan.staff.find((s) => s.id === staffId)
  const options = useMemo(() => cellOptions(plan, plan.schedule, staffId, day), [plan, staffId, day])
  if (!staff) return null
  const who = `${staff.name || '（名前なし）'}さん`
  const dayText = formatDay(plan.year, plan.month, day)
  const locked = isLocked(plan.schedule, staffId, day)
  const wish = plan.wishes[staffId]?.[String(day)] ?? null
  // 休み希望は、勤務の選択肢の下に注意として出るので、ここでは「入りたい」の希望だけを知らせる
  const wishText = wish?.kind === 'shift' ? `「${plan.shiftTypes.find((s) => s.id === wish.shiftId)?.name ?? ''}に入りたい」の希望が出ています。` : null

  const choose = (shiftId: string | null) => {
    update((p) => ({ ...p, schedule: setCell(p.schedule, staffId, day, shiftId) }))
    onClose()
  }

  const heading = (
    <>
      <span className="block text-base font-extrabold leading-snug">{who}</span>
      <span className="block text-sm font-bold text-ink-soft">{dayText}</span>
    </>
  )

  const list = (
    <ul className="grid gap-1.5">
      {options.map((o) => {
        const s = o.shiftId ? plan.shiftTypes.find((x) => x.id === o.shiftId) : null
        return (
          <li key={o.shiftId ?? 'off'}>
            <button
              type="button"
              aria-pressed={o.current}
              onClick={() => choose(o.shiftId)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-lg border-2 px-3 py-1.5 text-left transition-colors',
                o.current ? 'border-ink bg-well' : 'border-ink/25 bg-card hover:border-ink hover:bg-[#fff8dc]',
              )}
            >
              {s ? <ShiftBlock shift={s} /> : <span className="blk" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2 text-sm font-bold">
                  {s ? s.name || '（名前なし）' : '休み'}
                  {s ? (
                    <span className="font-num text-xs font-medium text-ink-soft">
                      {s.start}〜{s.end}
                    </span>
                  ) : null}
                </span>
                {o.notes.map((n, i) => (
                  <span key={i} className="mt-0.5 flex items-start gap-1 text-[12.5px] font-bold leading-snug text-danger">
                    <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2.75} />
                    {n}
                  </span>
                ))}
              </span>
              {o.current ? <span className="shrink-0 rounded-[4px] bg-ink px-1.5 py-0.5 text-[11px] font-bold text-paper">いま</span> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const foot = (
    <>
      {wishText ? <p className="text-[12.5px] font-bold leading-relaxed">{wishText}</p> : null}
      {locked ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold">
            <Lock aria-hidden className="size-3.5" strokeWidth={2.75} />
            このマスは固定してあります
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              update((p) => ({ ...p, schedule: unlockCell(p.schedule, staffId, day) }))
              onClose()
            }}
          >
            固定を外す
          </Button>
        </div>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">選んだマスは固定になり、組み直しても残ります。いまと同じものを押すと、そのまま固定できます。</p>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>このマスに入れる勤務を選びます。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 pb-5">
            {list}
            {foot}
          </div>
        </DialogBody>
      </>
    )
  }
  return (
    <div className="grid gap-2.5 p-3">
      <p>{heading}</p>
      {list}
      {foot}
    </div>
  )
}
