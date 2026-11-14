// 「組めないときは、理由を言う」。飲食店のサンプル（わざと人が足りない週がある）を、本物の自動作成で組んだ結果を見せる。
//
// - 点検の結果と、足りない理由の文は、描くたびに本物の関数（checkPlan、explainShortages）で作る。
// - 表そのものと「埋める案」は、あらかじめ本物の計算で作ってファイルにしたもの（demo-snapshot.ts）。
//   LP を開くたびに自動作成を何回も回すと、遅い端末で止まってしまうため。中身が本物と同じことは、テストが確かめている。
// - 見た目は、道具の画面（④シフト表）の「点検の結果」「足りないところを埋める案」と同じ組み立てにした。
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, Info, Undo2 } from 'lucide-react'
import { checkPlan, explainShortages, formatMonth, makeSample } from '@/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { applyDemoFix, DEMO_MONTH, DEMO_YEAR } from './demo-data'
import { DEMO_SNAPSHOT } from './demo-snapshot'
import { LpHeading, LpSection, Ph } from './section'

const POINTS = [
  { title: '足りない日は、足りないまま出す', body: '人が足りない日を、だまって空けたり、無理に詰めこんだりしません。どこが足りないかを、はっきり見せます。' },
  { title: '入れない理由を、人数で数える', body: '「休み希望1人、連勤の上限1人」のように、ほかの人を入れられない理由を、1人ずつ調べて数えます。' },
  { title: '埋める案は、確かめたものだけ', body: '「この条件をゆるめれば埋まる」と言うのは、実際に組み直して、埋まると確かめたときだけです。' },
]

export function Reasons() {
  const [fixed, setFixed] = useState(false)
  const fix = DEMO_SNAPSHOT.fix

  const view = useMemo(() => {
    const base = makeSample('restaurant', DEMO_YEAR, DEMO_MONTH)
    const plan = fixed && fix ? applyDemoFix(base, fix) : { ...base, schedule: DEMO_SNAPSHOT.restaurant }
    const report = checkPlan(plan)
    return { plan, report, explanations: explainShortages(plan, plan.schedule, report) }
  }, [fixed, fix])
  const { plan, report, explanations } = view

  return (
    <LpSection id="reasons" tone="ink">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="min-w-0">
          <LpHeading
            id="reasons"
            onDark
            kicker="組めないとき"
            color="tomato"
            title={
              <>
                <Ph>組めないときは、</Ph>
                <Ph>理由を言います。</Ph>
              </>
            }
            lead="休み希望が重なれば、どうやっても埋まらない日が出ます。そのとき、何日のどの勤務に何人足りないか、なぜ入れる人がいないかを、文で出します。"
          />
          <ul className="mt-8 grid gap-5">
            {POINTS.map((p, i) => (
              <li key={p.title} className="flex gap-3.5">
                <span aria-hidden className="blk !border-paper" data-color={(['egg', 'sky', 'teal'] as const)[i]}>
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[1.1rem]">{p.title}</h3>
                  <p className="lp-prose mt-1 text-[14.5px] text-paper/85">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="lp-prose mt-7 border-t border-paper/25 pt-5 text-[13.5px] text-paper/80">休み希望や固定の休みを「ゆるめましょう」と、道具のほうからすすめることはしません。人の事情だからです。</p>
        </div>

        {/* 道具の画面と同じ組み立ての、点検の結果 */}
        <div className="min-w-0 rounded-xl border-2 border-paper bg-paper p-3 text-ink shadow-[5px_5px_0_0_var(--shift-egg)] md:p-5" aria-live="polite">
          <p className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm font-bold">
            <span>
              {plan.storeName}　<span className="font-num">{formatMonth(plan.year, plan.month)}</span>
            </span>
            <span className="text-[12.5px] font-medium text-ink-soft">飲食店のサンプルを、道具で組んだ結果です</span>
          </p>

          {fixed && fix ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border-2 border-ok bg-ok-soft px-3 py-2">
              <p className="min-w-0 flex-1 basis-60 text-sm font-bold leading-relaxed">「{fix.label}」に変えて、組み直した表に入れかえました。</p>
              <Button variant="outline" size="sm" onClick={() => setFixed(false)}>
                <Undo2 aria-hidden />
                元に戻す
              </Button>
            </div>
          ) : null}

          <section aria-labelledby="demo-report-title" className={cn('rounded-xl border-2 bg-card', report.summaryItems.every((x) => x.tone === 'ok') ? 'border-ok' : 'border-ink')}>
            <div className="px-3.5 py-3 md:px-5">
              <h3 id="demo-report-title" className="text-base">
                点検の結果
              </h3>
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
            {explanations.length > 0 ? (
              <div className="border-t-2 border-ink/15 px-3.5 py-3 md:px-5">
                <h4 className="text-sm font-bold">足りないところと、その理由（{explanations.length}か所）</h4>
                <ul className="mt-2 grid gap-1.5">
                  {explanations.map((e, i) => (
                    <li key={i} className="rounded-md bg-[#fff4cf] px-3 py-1.5 text-[13.5px] leading-relaxed">
                      {e.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {!fixed && fix ? (
            <section aria-labelledby="demo-suggest-title" className="mt-3 rounded-xl border-2 border-ink bg-[#fff4cf] px-3.5 py-3 md:px-5">
              <h3 id="demo-suggest-title" className="flex items-center gap-2 text-base">
                <AlertTriangle aria-hidden className="size-[18px]" strokeWidth={2.5} />
                足りないところを埋める案
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed">{fix.intro}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border-2 border-ink bg-card px-3 py-2">
                <span className="min-w-0 flex-1 basis-64 text-sm font-bold leading-relaxed">{fix.text}</span>
                <Button variant="outline" size="sm" className="max-w-full whitespace-normal text-left leading-snug" onClick={() => setFixed(true)}>
                  この条件にして、組み直した表にする
                </Button>
              </div>
              {fix.noEffect.length > 0 ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">試したが、足りないところが減らなかったもの: {fix.noEffect.join('、')}</p> : null}
            </section>
          ) : null}
        </div>
      </div>
    </LpSection>
  )
}
