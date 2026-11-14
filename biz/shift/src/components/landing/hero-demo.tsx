// LP の一番上の「動く見本」。サンプルの店で、本物の自動作成（src/core の startSolve）を、このページの中で動かす。
//
// - 絵や動画ではない。「組んでみる」を押すと、道具の画面と同じ計算が Web Worker で走り、同じシフト表の部品（ShiftGrid）に結果が入る。
// - 静的HTMLに書き出すときは、決まった年月（DEMO_YEAR / DEMO_MONTH）の、まだ空の表を描く（window に触らない。計算もしない）。
//   ブラウザで開いたあと、端末の「来月」に入れかえる（道具の画面と同じ月になるように）。
// - 枠の作りは、21st.dev の「Hero with Product Mockup」（vaib215）の「アプリの窓の後ろに、色の板をずらして重ねる」見せ方を借りた。
//   かたむき・グラデーション・ぼかした影・絵文字のアイコンと、にせのスマホ画面はやめて、中身を本物の部品に入れかえた。
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, RefreshCw, Sparkles } from 'lucide-react'
import {
  buildCalendar,
  formatMonth,
  localToday,
  makeSample,
  nextMonthOf,
  nextSeed,
  SAMPLES,
  startSolve,
  WEEKDAY_LABELS,
  type CheckReport,
  type SampleId,
  type Schedule,
  type ShiftPlan,
  type SolveHandle,
} from '@/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented'
import { ShiftBlock } from '@/components/shift-block'
import { ShiftGrid } from '@/components/shift-grid'
import { DEMO_MONTH, DEMO_YEAR } from './demo-data'

type Solved = { schedule: Schedule; report: CheckReport; ms: number }

/** この見本で守る条件を、短い札にする（どれも、サンプルのデータから作る） */
function ruleChips(plan: ShiftPlan): string[] {
  const shiftName = (id: string) => plan.shiftTypes.find((s) => s.id === id)?.name ?? ''
  const tagName = (id: string) => plan.tags.find((t) => t.id === id)?.name ?? ''
  const chips: string[] = []
  const offWishes = Object.values(plan.wishes).reduce((n, row) => n + Object.values(row).filter((w) => w.kind === 'off').length, 0)
  if (offWishes > 0) chips.push(`休み希望 ${offWishes}件`)
  if (plan.closed.weekdays.length > 0) chips.push(`${plan.closed.weekdays.map((w) => WEEKDAY_LABELS[w]).join('・')}曜は定休日`)
  if (plan.holidayMode === 'closed') chips.push('祝日は休み')
  if (plan.rules.maxConsecutive !== null) chips.push(`連勤は${plan.rules.maxConsecutive}日まで`)
  for (const p of plan.rules.forbiddenPairs) chips.push(`${shiftName(p.first)}の次の日に${shiftName(p.next)}を入れない`)
  for (const r of plan.needs.roleMins) chips.push(`${shiftName(r.shiftId)}に「${tagName(r.tagId)}」が${r.count}人以上`)
  if (plan.rules.weeklyDayOff) chips.push('毎週1日は休み')
  return chips
}

export function HeroDemo() {
  const [month, setMonth] = useState({ year: DEMO_YEAR, month: DEMO_MONTH })
  const [sampleId, setSampleId] = useState<SampleId>('salon')
  const [solved, setSolved] = useState<Solved | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const handle = useRef<SolveHandle | null>(null)
  const token = useRef(0)

  // 開いたあとで、端末の「来月」に入れかえる（端末の時刻は、描くときには見ない）
  useEffect(() => {
    const next = nextMonthOf(localToday())
    if (next.year !== DEMO_YEAR || next.month !== DEMO_MONTH) setMonth(next)
  }, [])
  // ページを離れるときは、計算をやめる
  useEffect(() => () => handle.current?.cancel(), [])

  const base = useMemo(() => makeSample(sampleId, month.year, month.month), [sampleId, month])
  const plan = useMemo(() => (solved ? { ...base, schedule: solved.schedule } : base), [base, solved])
  const chips = useMemo(() => ruleChips(base), [base])
  const stats = useMemo(() => {
    const calendar = buildCalendar(base)
    // 勤務の種類ごとの、1か月ぶんの必要な回数（これが「はめるブロック」の数になる）
    const byShift = base.shiftTypes.map((s) => ({ shift: s, count: calendar.reduce((n, d) => n + (d.needs[s.id] ?? 0), 0) })).filter((x) => x.count > 0)
    return { days: calendar.length, need: byShift.reduce((n, x) => n + x.count, 0), byShift }
  }, [base])

  const stop = () => {
    handle.current?.cancel()
    token.current++
    setBusy(false)
    setFailed(false)
  }

  const choose = (id: SampleId) => {
    if (id === sampleId) return
    stop()
    setSolved(null)
    setSampleId(id)
  }

  const reset = () => {
    stop()
    setSolved(null)
  }

  const run = () => {
    handle.current?.cancel()
    const mine = ++token.current
    const started = performance.now()
    setBusy(true)
    setFailed(false)
    handle.current = startSolve(base, {
      // 「別の案を作る」は、種を変えるだけ（道具の画面と同じ）
      seed: nextSeed(solved?.schedule.seed ?? null),
      withSuggestions: false,
      onResult: (result) => {
        if (mine !== token.current) return
        setBusy(false)
        setSolved({ schedule: result.schedule, report: result.check, ms: performance.now() - started })
        setAnimKey((k) => k + 1)
      },
      onError: () => {
        if (mine !== token.current) return
        setBusy(false)
        setFailed(true)
      },
    })
  }

  const sampleLabel = SAMPLES.find((s) => s.id === sampleId)?.label ?? ''
  const seconds = solved ? Math.max(0.1, Math.round(solved.ms / 100) / 10).toFixed(1) : ''
  const hasTrouble = solved ? solved.report.summaryItems.some((x) => x.tone === 'bad') : false

  return (
    <div id="demo" className="lp-anchor relative mb-3 mr-1.5 md:mb-5 md:mr-4">
      {/* 後ろにずらして重ねた、色の板（ブロックを重ねた見た目） */}
      {/* 先に書いたものが下になる（卵色 → 空色 → 窓） */}
      <div aria-hidden className="absolute inset-0 hidden translate-x-4 translate-y-4 rounded-xl border-2 border-ink bg-shift-egg md:block" />
      <div aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border-2 border-ink bg-shift-sky md:translate-x-2 md:translate-y-2" />

      <section aria-label="動く見本" className="relative overflow-hidden rounded-xl border-2 border-ink bg-card">
        {/* 窓の頭 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink bg-well px-3 py-2 md:px-4">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm font-bold">
            <span className="flex items-center gap-2">
              <span aria-hidden className="flex gap-1">
                <span className="blk" data-size="sm" data-color="egg" />
                <span className="blk" data-size="sm" data-color="tomato" />
                <span className="blk" data-size="sm" data-color="sky" />
              </span>
              動く見本
            </span>
            <span className="font-medium text-ink-soft">
              {plan.storeName}　<span className="font-num">{formatMonth(plan.year, plan.month)}</span>
            </span>
          </p>
          <div className="flex items-center gap-2 md:ml-auto">
            <span className="hidden text-[13px] font-bold text-ink-soft sm:inline">見本の店</span>
            <SegmentedControl label="見本の店を選ぶ" value={sampleId} onValueChange={choose} options={SAMPLES.map((s) => ({ value: s.id, label: s.label }))} />
          </div>
        </div>

        <div className="px-3 pb-4 pt-4 md:px-4 md:pb-5">
          {/* 操作と、結果 */}
          <div className="flex flex-col gap-x-6 gap-y-3 md:flex-row md:items-start">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button size="lg" onClick={run} disabled={busy} className="min-w-[12.5rem] text-[17px]">
                {solved ? <RefreshCw aria-hidden className={cn(busy && 'animate-spin')} /> : <Sparkles aria-hidden />}
                {busy ? '組んでいます…' : solved ? '別の案を作る' : '組んでみる'}
              </Button>
              {solved && !busy ? (
                <Button variant="ghost" onClick={reset}>
                  空に戻す
                </Button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 md:min-h-[6.75rem]" aria-live="polite">
              {failed ? (
                <p className="flex items-start gap-2 text-sm font-bold text-danger">
                  <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={2.5} />
                  計算の途中で止まりました。もう一度、押してください。
                </p>
              ) : solved ? (
                <>
                  <ul className="grid gap-1">
                    {solved.report.summaryItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14.5px] font-bold leading-relaxed">
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
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                    この端末で、<span className="font-num font-bold text-ink">{seconds}秒</span>で組みました。
                    {hasTrouble ? (
                      <>
                        足りないところは、足りないまま出します。
                        <a href="#reasons" className="font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-shift-tomato">
                          理由の出し方を見る
                        </a>
                      </>
                    ) : null}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold leading-relaxed md:text-base">ボタンを押すと、下の表が埋まります。</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                    {sampleLabel}のサンプルです。スタッフ<span className="font-num font-bold text-ink">{base.staff.length}</span>人・<span className="font-num font-bold text-ink">{stats.days}</span>日ぶん、のべ<span className="font-num font-bold text-ink">{stats.need}</span>回の勤務を、表の下の条件を守ってはめていきます。
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 表（道具の画面と同じ部品。ここでは読むだけ） */}
          <div className="mt-4 flex items-stretch gap-4">
            <div className={cn('lp-mini lp-flat min-w-0 transition-opacity', busy && 'opacity-60')} aria-busy={busy}>
              <ShiftGrid plan={plan} report={solved?.report} showSummary={solved !== null} animateKey={animKey} label={`${plan.storeName}、${formatMonth(plan.year, plan.month)}のシフト表（見本）`} />
            </div>
            {/* まだ組んでいないあいだ、表の右のあいた所に「これからはめるブロック」を積んでおく（広い画面だけ）。組むと、ここは集計の列になる */}
            {solved === null ? (
              // 高さは、となりの表に合わせる（中身は、枠の中に重ねて置く。山が表より高くなっても、表の下にすき間を作らない）
              <div className="relative hidden min-w-0 flex-1 rounded-lg border-2 border-dashed border-ink/35 xl:block">
                <div className="absolute inset-0 overflow-hidden p-2">
                  <p className="text-[12.5px] font-bold leading-[18px]">
                    これから、はめるブロック
                    <span className="sr-only">（{stats.byShift.map((x) => `${x.shift.name}${x.count}回`).join('、')}）</span>
                  </p>
                  <div aria-hidden className="mt-1.5 flex flex-wrap content-start gap-[2px]">
                    {stats.byShift.flatMap((x) => Array.from({ length: x.count }, (_, i) => <ShiftBlock key={`${x.shift.id}-${i}`} shift={x.shift} size="sm" />))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 記号の説明 */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] leading-snug text-ink-soft">
            {plan.shiftTypes.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <ShiftBlock shift={s} size="sm" />
                <span className="font-bold text-ink">{s.name}</span>
                <span className="font-num">
                  {s.start}〜{s.end}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="font-bold text-ink">希</span>休み希望の日
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-ink/40 bg-[repeating-linear-gradient(135deg,var(--well)_0_3px,#e3d9bb_3px_6px)]" />
              店を開けない日
            </li>
          </ul>
          <div className="mt-3 flex flex-col gap-x-3 gap-y-1.5 border-t border-line pt-3 md:flex-row md:items-start">
            <p className="shrink-0 pt-0.5 text-[12.5px] font-bold text-ink">この見本で守る条件</p>
            <ul className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li key={c} className="rounded-md border border-ink/35 bg-paper px-2 py-0.5 text-[12.5px] font-bold leading-snug text-ink-soft">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">絵や動画ではなく、道具と同じ計算を、いまこのページの中で動かしています。店と名前は、作りものです。表は横に動かせます。</p>
        </div>
      </section>
    </div>
  )
}
