// 「使い方の3ステップ」。絵のかわりに、道具の画面と同じ部品（ShiftGrid、ShiftBlock）を、美容室のサンプルのデータで置く。
// ①の箱だけは、道具の入力欄そのものではなく、同じサンプルのデータを短くまとめた表（ブロックは同じ部品）。
//
// 21st.dev の「How It Works Steps」（ln-dev7）をもとにしている。
// 借りたところ: 番号の印を横に3つ並べ、印どうしを1本の線でつなぐ組み立てと、下にまとめのボタンを1つ置く形。
// 変えたところ: 丸い印を、勤務のブロックと同じ四角（卵色、ずらした影）にした。文だけだった各ステップの下に、
//   本物の画面の部品を置いた。見本の英語の文と数字は消した。せまい画面では、縦に並べる。
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { checkPlan, formatMonth, makeSample, WEEKDAY_LABELS, type ShiftPlan, type Weekday } from '@/core'
import { Link } from '@/router'
import { Button } from '@/components/ui/button'
import { OffBlock, ShiftBlock } from '@/components/shift-block'
import { ShiftGrid } from '@/components/shift-grid'
import { DEMO_MONTH, DEMO_YEAR } from './demo-data'
import { DEMO_SNAPSHOT } from './demo-snapshot'
import { LpHeading, LpSection, Ph } from './section'

/** 画面で曜日を並べる順（月曜はじまり。道具の画面と同じ） */
const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
/** 見本の表で見せる日（希望休が散らばっている1週間あまり） */
const DAYS = { from: 11, to: 18 }

function Cut({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="mt-5 rounded-xl border-2 border-ink bg-card shadow-hard md:mt-0 xl:mt-0">
      <figcaption className="border-b-2 border-ink bg-well px-3 py-1.5 text-[12.5px] font-bold text-ink-soft">{title}</figcaption>
      <div className="p-3">{children}</div>
    </figure>
  )
}

/** ①: 勤務の種類と、曜日ごとの必要な人数と、条件（サンプルのデータを、そのまま読む） */
function StoreCut({ plan }: { plan: ShiftPlan }) {
  const shiftName = (id: string) => plan.shiftTypes.find((s) => s.id === id)?.name ?? ''
  const tagName = (id: string) => plan.tags.find((t) => t.id === id)?.name ?? ''
  return (
    <Cut title="サンプルの店：スタッフと、必要な人数">
      {/* スタッフ: 名前、役割の札、月の勤務日数、決まった休み */}
      <ul className="mb-3 grid gap-px border-b border-line pb-3 text-[12.5px]">
        {plan.staff.map((st) => {
          const notes: string[] = []
          if (st.minDays !== null || st.maxDays !== null) notes.push(`月${st.minDays ?? ''}〜${st.maxDays ?? ''}日`)
          if (st.fixedOffWeekdays.length > 0) notes.push(`${WEEK_ORDER.filter((w) => st.fixedOffWeekdays.includes(w)).map((w) => WEEKDAY_LABELS[w]).join('')}は休み`)
          for (const s of plan.shiftTypes) if ((st.cannotWork[s.id]?.length ?? 0) === 7) notes.push(`${s.name}なし`)
          return (
            <li key={st.id} className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="w-9 shrink-0 text-[13px] font-bold">{st.name}</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                {st.tagIds.map((id) => (
                  <span key={id} className="rounded-[4px] bg-ink px-1.5 py-px text-[11px] font-bold leading-[1.5] text-paper">
                    {tagName(id)}
                  </span>
                ))}
              </span>
              <span className="shrink-0 text-ink-soft">{notes.join('・')}</span>
            </li>
          )
        })}
      </ul>
      <table className="w-full border-collapse text-center text-[13px]">
        <thead>
          <tr className="text-ink-soft">
            <th scope="col" className="w-[5.5rem] pb-1.5 text-left text-xs font-bold">
              勤務
            </th>
            {WEEK_ORDER.map((w) => (
              <th key={w} scope="col" className={w === 0 ? 'pb-1.5 text-xs font-bold text-danger' : w === 6 ? 'pb-1.5 text-xs font-bold text-[#1d4fb8]' : 'pb-1.5 text-xs font-bold'}>
                {WEEKDAY_LABELS[w]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.shiftTypes.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <th scope="row" className="py-1.5 text-left font-bold">
                <span className="flex items-center gap-1.5">
                  <ShiftBlock shift={s} size="sm" />
                  {s.name}
                </span>
              </th>
              {WEEK_ORDER.map((w) => {
                const closed = plan.closed.weekdays.includes(w)
                return (
                  <td key={w} className={closed ? 'bg-[repeating-linear-gradient(135deg,var(--well)_0_4px,#ece3c8_4px_8px)] text-[11px] font-bold text-ink-soft' : 'font-num text-[15px] font-bold'}>
                    {closed ? '休' : plan.needs.weekly[s.id]?.[w] ?? 0}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
        {plan.rules.maxConsecutive !== null ? <li className="rounded-md border border-ink/35 bg-paper px-2 py-0.5 text-[12.5px] font-bold text-ink-soft">連勤は{plan.rules.maxConsecutive}日まで</li> : null}
        {plan.rules.forbiddenPairs.map((p) => (
          <li key={p.id} className="rounded-md border border-ink/35 bg-paper px-2 py-0.5 text-[12.5px] font-bold text-ink-soft">
            {shiftName(p.first)}の次の日に{shiftName(p.next)}を入れない
          </li>
        ))}
      </ul>
    </Cut>
  )
}

export function How() {
  // 見本は、決まった年月の美容室のサンプル。③の表は、本物の自動作成で組んだ結果（demo-snapshot.ts）
  const plan = makeSample('salon', DEMO_YEAR, DEMO_MONTH)
  const solved = { ...plan, schedule: DEMO_SNAPSHOT.salon }
  const report = checkPlan(solved)
  const month = formatMonth(plan.year, plan.month)

  const steps = [
    {
      title: '店のことを入れる',
      body: '勤務の種類、スタッフ、曜日ごとに必要な人数、守りたい条件。入れるのは、最初の1回だけです。',
      cut: <StoreCut plan={plan} />,
    },
    {
      title: '希望休を写す',
      body: '紙や LINE で集めた休みの希望を、マスを押して入れます。Excel にまとめてあるなら、表ごと貼り付けられます。',
      cut: (
        <Cut title="道具と同じ表：希望休">
          <p aria-hidden className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-bold text-ink-soft">
            <span className="flex items-center gap-1.5">
              <OffBlock size="sm" />
              休み希望
            </span>
            {plan.shiftTypes.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <ShiftBlock shift={s} size="sm" />
                {s.name}に入りたい
              </span>
            ))}
          </p>
          <div className="lp-mini lp-flat">
            <ShiftGrid plan={plan} mode="wishes" days={DAYS} showSummary={false} showFooter={false} label={`${month}の希望休（見本。${DAYS.from}日から${DAYS.to}日まで）`} />
          </div>
        </Cut>
      ),
    },
    {
      title: 'ボタンを押して、直して、印刷する',
      body: '条件を守った表が、数秒でできます。気になるマスは、押して直せます。直したマスは固定されて、組み直しても残ります。',
      cut: (
        <Cut title="道具と同じ表：できたシフト表">
          <ul className="mb-2 grid gap-0.5">
            {report.summaryItems.slice(0, 2).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-relaxed">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} />
                {item.text}
              </li>
            ))}
          </ul>
          <div className="lp-mini lp-flat">
            <ShiftGrid plan={solved} report={report} days={DAYS} showSummary={false} label={`${month}のシフト表（見本。${DAYS.from}日から${DAYS.to}日まで）`} />
          </div>
        </Cut>
      ),
    },
  ]

  return (
    <LpSection id="how">
      <LpHeading
        id="how"
        kicker="使い方"
        color="egg"
        title={
          <>
            <Ph>入れて、押して、</Ph>
            <Ph>貼る。3ステップです。</Ph>
          </>
        }
        lead={`下の箱の中身は、絵ではありません。美容室のサンプル（${month}）のデータを、道具と同じ部品で出しています。表は、${DAYS.from}日〜${DAYS.to}日のぶんです。`}
      />

      <ol className="relative mt-10 grid gap-x-8 gap-y-12 md:mt-14 xl:grid-cols-3">
        {/* 番号の印をつなぐ線（3つ横に並ぶ幅のときだけ） */}
        <span aria-hidden className="absolute left-6 right-[33%] top-6 hidden border-t-2 border-dashed border-ink/40 xl:block" />
        {steps.map((s, i) => (
          <li key={s.title} className="relative grid min-w-0 gap-x-8 md:grid-cols-2 md:items-start xl:block">
            <div className="xl:min-h-[13.25rem]">
              <span aria-hidden className="relative z-10 grid size-12 place-items-center rounded-lg border-2 border-ink bg-shift-egg font-num text-xl font-bold shadow-hard-sm">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[1.3rem] md:text-[1.45rem]">
                <span className="sr-only">ステップ{i + 1}：</span>
                {s.title}
              </h3>
              <p className="lp-prose mt-2 text-[15px] text-ink-soft">{s.body}</p>
            </div>
            <div className="min-w-0">{s.cut}</div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-start gap-x-6 gap-y-3 border-t-2 border-ink/15 pt-6 md:mt-14 md:flex-row md:items-center">
        <Button asChild size="lg">
          <Link to="/app">
            サンプルで動かしてみる
            <ArrowRight aria-hidden strokeWidth={3} />
          </Link>
        </Button>
        <p className="lp-prose text-[14.5px] text-ink-soft">2か月めからは、スタッフと条件はそのまま残っています。月を変えて、希望休を入れ直すだけです。</p>
      </div>
    </LpSection>
  )
}
