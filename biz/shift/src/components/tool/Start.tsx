// 最初に開いたときの画面。「サンプルで試す」（3種類）と「自分の店で始める」、前に保存したファイルの読み込み口。
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { blankPlan, downloadText, formatMonth, localToday, makeSample, nextMonthOf, SAMPLES, SHIFT_PRESETS, YEAR_MAX, YEAR_MIN, type SampleId, type ShiftPlan } from '@/core'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { ShiftBlock } from '@/components/shift-block'
import { ImportZone } from './FileDialog'
import type { LoadIssue } from './use-plan-store'

export function Start({
  issue,
  onDismissIssue,
  onSample,
  onStart,
  onImport,
  onRestore,
}: {
  issue: LoadIssue | null
  onDismissIssue: () => void
  onSample: (id: SampleId) => void
  onStart: (plan: ShiftPlan) => void
  onImport: (plan: ShiftPlan) => void
  /** 「はじめからやり直す」で消した内容に戻す。戻せる内容があるあいだだけ渡される */
  onRestore?: () => void
}) {
  const next = useMemo(() => nextMonthOf(localToday()), [])
  const [year, setYear] = useState(next.year)
  const [month, setMonth] = useState(next.month)
  const [preset, setPreset] = useState(SHIFT_PRESETS[0].id)
  const [storeName, setStoreName] = useState('')

  const years: number[] = []
  for (let y = Math.max(YEAR_MIN, next.year - 1); y <= Math.min(YEAR_MAX, next.year + 2); y++) years.push(y)
  // サンプルの勤務のブロックを、見本として出す（本物のサンプルのデータから取る）
  const sampleShifts = useMemo(() => Object.fromEntries(SAMPLES.map((s) => [s.id, makeSample(s.id, next.year, next.month).shiftTypes])), [next])

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 md:mb-8">
        <h1 className="text-[1.6rem] md:text-[2.1rem]">
          <span className="inline-block">来月のシフトの、</span>
          <span className="inline-block">たたき台を作ります</span>
        </h1>
        <p className="mt-2 max-w-[38em] text-[15px] leading-[1.85] text-ink-soft">登録はいりません。入れた内容は、このブラウザの中だけに保存されます。スタッフの名前や希望休が、外に送られることはありません。</p>
      </header>

      {onRestore ? (
        // 消した直後のお知らせ（「元に戻す」）は数秒で消える。そのあとでも戻せるように、ここにも出し続ける
        <Notice variant="info" className="mb-5">
          <NoticeTitle>さっきまで入れていた内容は、まだ戻せます</NoticeTitle>
          <NoticeBody>
            <p>このページを閉じたり、読み込み直したりすると、戻せなくなります。</p>
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={onRestore}>
                さっきの内容に戻す
              </Button>
            </div>
          </NoticeBody>
        </Notice>
      ) : null}
      {issue?.kind === 'broken' ? (
        <Notice variant="danger" className="mb-5">
          <NoticeTitle>前に保存した内容を、読めませんでした</NoticeTitle>
          <NoticeBody>
            <p>{issue.reason}</p>
            <p className="mt-1">保存されていた内容は、まだ残っています。ファイルに取り出しておくか、消して新しく始めるかを選んでください。新しく始めると、上書きされます。</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadText(`${site.name}_読めなかったデータ.json`, issue.raw, 'application/json')}>
                読めなかった内容をファイルに取り出す
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismissIssue}>
                消して、この知らせを閉じる
              </Button>
            </div>
          </NoticeBody>
        </Notice>
      ) : null}
      {issue?.kind === 'unavailable' ? (
        <Notice variant="warn" className="mb-5">
          <NoticeTitle>このブラウザでは、内容を保存しておけません</NoticeTitle>
          <NoticeBody>プライベートブラウズなどで、保存の場所が使えなくなっています。使うことはできますが、ページを閉じると内容が消えます。画面の上の「ファイルに保存する」で、こまめに保存してください。</NoticeBody>
        </Notice>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <section aria-labelledby="start-sample" className="rounded-xl border-2 border-ink bg-card p-3.5 shadow-hard md:p-6">
          <h2 id="start-sample" className="text-xl">
            サンプルで試す
          </h2>
          <p className="mt-1 text-sm leading-[1.8] text-ink-soft">作りものの店のデータで、{formatMonth(next.year, next.month)}の表を1回組んでみせます。あとから中身を自由に変えられます。</p>
          <ul className="mt-4 grid gap-2.5">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSample(s.id)}
                  className="group flex w-full items-center gap-3 rounded-lg border-2 border-ink bg-paper px-3 py-3 text-left shadow-hard-sm transition-[transform,box-shadow,background-color] duration-100 hover:bg-[#fff3c4] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-[1.05rem] font-extrabold">{s.label}のサンプルを入れる</span>
                      <span className="flex gap-1" aria-hidden>
                        {sampleShifts[s.id].map((t) => (
                          <ShiftBlock key={t.id} shift={t} size="sm" />
                        ))}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">{s.note}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="start-own" className="rounded-xl border-2 border-ink bg-card p-3.5 md:p-6">
          <h2 id="start-own" className="text-xl">
            自分の店で始める
          </h2>
          <p className="mt-1 text-sm leading-[1.8] text-ink-soft">月と、勤務の種類のひな形を選びます。どれも、あとから変えられます。</p>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              onStart({ ...blankPlan(year, month, preset), storeName: storeName.trim() })
            }}
          >
            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">シフトを組む月</legend>
              <div className="flex flex-wrap gap-2">
                <Select aria-label="年" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-[7.5rem]">
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}年
                    </option>
                  ))}
                </Select>
                <Select aria-label="月" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-[6rem]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </Select>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">勤務の種類のひな形</legend>
              <div className="grid gap-2">
                {SHIFT_PRESETS.map((p) => {
                  const checked = preset === p.id
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                        checked ? 'border-ink bg-well' : 'border-ink/30 bg-card hover:border-ink',
                      )}
                    >
                      <input type="radio" name="preset" value={p.id} checked={checked} onChange={() => setPreset(p.id)} className="size-5 shrink-0 accent-[var(--ink)] outline-none" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold">
                          {p.label}
                          <span className="flex gap-1" aria-hidden>
                            {p.shiftTypes.map((t) => (
                              <ShiftBlock key={t.id} shift={t} size="sm" />
                            ))}
                          </span>
                        </span>
                        <span className="block text-[13px] leading-relaxed text-ink-soft">{p.note}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <Field label="店の名前（空でもかまいません）" htmlFor="start-store">
              <Input id="start-store" value={storeName} maxLength={40} autoComplete="off" placeholder="例: さくら美容室" onChange={(e) => setStoreName(e.target.value)} />
            </Field>

            <div>
              <Button type="submit" size="lg">
                この内容で始める
              </Button>
            </div>
          </form>
        </section>
      </div>

      <section aria-labelledby="start-file" className="mt-5">
        <h2 id="start-file" className="mb-2 text-base">
          前に保存したファイルから続ける
        </h2>
        <ImportZone onLoaded={(plan) => onImport(plan)} />
      </section>
    </div>
  )
}
