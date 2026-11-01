// 案D「家計レシート」 — 結果。見出し → 名物の食卓 → 家計のレシート → ほかの街 → 次の一歩（PRの仮の枠）→ もう1回 → 免責。
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { DATA_AS_OF, DISCLAIMER, MOOD_TEXT, yenMan } from '@/shared'
import type { Comparison, FamilyInput, Mood } from '@/shared/types'
import { cn } from '@/lib/utils'
import { PiggyFace } from './art'
import { Conf, Receipt } from './receipt'
import { TableScene } from './scene'
import { nextSteps, phrases, signedMan } from './lib'

const PIGGY_SAYS: Record<Mood, string> = {
  2: '貯金箱は大よろこび',
  1: '貯金箱はにっこり',
  0: '貯金箱はいつもどおり',
  [-1]: '貯金箱はちょっとしょんぼり',
  [-2]: '貯金箱はしょんぼり',
}
const CAPTION: Record<Mood, string> = {
  2: '家族はばんざい。貯金箱（家計）も大よろこび。',
  1: '家族はにこにこ。貯金箱（家計）もにっこり。',
  0: 'いつもの晩ごはん。貯金箱（家計）もいつもどおり。',
  [-1]: '家族はいつもの笑顔。しょんぼりは貯金箱（家計）だけ。',
  [-2]: '家族はいつもの笑顔。しょんぼりは貯金箱（家計）だけ。',
}
const FAMILY_SAYS: Record<Mood, string> = {
  2: '家族はばんざい',
  1: '家族はにこにこ',
  0: '家族はいつもの晩ごはん',
  [-1]: '家族はいつもどおりの笑顔',
  [-2]: '家族はいつもどおりの笑顔',
}

function Headline({ c, focus }: { c: Comparison; focus: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section aria-labelledby="vd-headline" className="px-1">
      <p className="text-[13px] font-bold tracking-[0.08em] text-[var(--ink-2)]">
        {c.from.name} → {c.to.name}・{c.years}年で比べると
      </p>
      <h1 id="vd-headline" ref={ref} tabIndex={-1} className="vd-hand vd-phrases mt-1 outline-none text-[clamp(26px,7.2vw,36px)] leading-[1.3] text-[var(--ink)]">
        {phrases(c.headline).map((t, i) => (
          <span key={i} className="vd-phrase" style={{ background: 'linear-gradient(transparent 60%, rgba(255,217,140,.95) 60%, rgba(255,217,140,.95) 92%, transparent 92%)' }}>
            {t}
          </span>
        ))}
      </h1>
      <p className="mt-2 flex items-center gap-2 text-[15px] font-bold leading-snug">
        <PiggyFace mood={c.mood} size={34} />
        <span>{MOOD_TEXT[c.mood]}</span>
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{c.subline}</p>
    </section>
  )
}

function PrideList({ c }: { c: Comparison }) {
  return (
    <section aria-labelledby="vd-pride" className="mt-4">
      <h2 id="vd-pride" className="px-1 text-[13px] font-bold tracking-[0.12em] text-[var(--ink-2)]">
        {c.to.name}の名物を、食卓にならべました
      </h2>
      <ul className={cn('mt-2 grid gap-2.5', c.to.pride.length > 1 && 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2')}>
        {c.to.pride.map((p) => (
          <li key={p.label} className="relative overflow-hidden rounded-[6px] bg-[var(--paper)] px-3.5 pb-3 pt-4 shadow-[0_1px_0_var(--paper-edge),0_6px_14px_-10px_rgba(70,45,20,.45)]">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[var(--red)]" />
            <p className="flex flex-wrap items-center gap-2">
              <span className="vd-hand text-[19px] leading-tight">{p.label}</span>
              <Conf c={p.confidence} />
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed">{p.fact}</p>
            {p.source && (
              <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12px] text-[var(--ink-2)] underline underline-offset-2">
                出典: {p.source.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Others({ ranked, current, onPick }: { ranked: Comparison[]; current: Comparison; onPick: (id: string) => void }) {
  return (
    <section aria-labelledby="vd-others" className="mt-10">
      <h2 id="vd-others" className="vd-hand text-[24px]">
        ほかの街のレシート
      </h2>
      <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">毎年の差が大きい順。タップすると、その街のレシートを出し直します。</p>
      <ul className="mt-3 space-y-2">
        {ranked.map((r, i) => {
          const on = r.to.id === current.to.id
          return (
            <li key={r.to.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPick(r.to.id)}
                className={cn(
                  'grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-[6px] border-[1.5px] px-3 py-2.5 text-left transition-colors',
                  on ? 'border-[var(--red)] bg-[var(--paper)]' : 'border-dashed border-[rgba(42,39,48,.35)] bg-[rgba(255,253,247,.6)] hover:bg-[var(--paper)]',
                )}
              >
                <span className="text-[12px] font-bold tabular-nums text-[var(--ink-2)]">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold leading-tight">
                    {r.to.name}
                    <span className="ml-1.5 text-[12px] font-normal text-[var(--ink-2)]">{r.to.pref}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--ink-2)]">
                    {r.headline}
                    {r.oneTime > 0 && `／一度きり +${yenMan(r.oneTime, 0)}`}
                    {r.unknown.length > 0 && `／確認中 ${r.unknown.length}件`}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn('text-[15px] font-bold tabular-nums', r.perYear >= 500 ? 'text-[var(--plus)]' : '')}>
                    {Math.abs(r.perYear) < 500 ? '±0' : signedMan(r.perYear).replace('万円', '万')}
                    <span className="text-[11px] font-normal">/年</span>
                  </span>
                  <PiggyFace mood={r.mood} size={30} />
                </span>
                {on && <span className="vd-stamp col-span-3 mt-1.5 justify-self-start !text-[11px]">表示中</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NextSteps({ c, input }: { c: Comparison; input: FamilyInput }) {
  const steps = nextSteps(c, input)
  const [done, setDone] = useState<Record<string, boolean>>({})
  return (
    <section aria-labelledby="vd-next" className="mt-10">
      <div className="relative rounded-[4px] bg-[var(--paper)] px-4 pb-4 pt-5 shadow-[0_1px_0_var(--paper-edge),0_10px_18px_-12px_rgba(70,45,20,.5)]">
        <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[-2deg] bg-[rgba(241,194,50,.55)]" />
        <h2 id="vd-next" className="vd-hand text-[26px] leading-tight">
          次の一歩
        </h2>
        <p className="text-[12.5px] text-[var(--ink-2)]">レシートの裏のメモ。できたらチェック（この端末の中だけ）。</p>
        <ul className="mt-2 space-y-1">
          {steps.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer gap-3 rounded-md px-1 py-2 hover:bg-[rgba(200,138,76,.07)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 flex-none accent-[var(--red)]"
                  checked={!!done[s.id]}
                  onChange={(e) => setDone((d) => ({ ...d, [s.id]: e.target.checked }))}
                />
                <span>
                  <span className={cn('block text-[15px] font-bold leading-snug', done[s.id] && 'line-through decoration-[var(--red)] decoration-2')}>{s.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--ink-2)]">{s.body}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <aside aria-label="広告（PR）の枠" className="vd-pr mt-4 px-4 py-3.5">
        <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em]">
          <span className="rounded-[3px] bg-[var(--pr-ink)] px-1.5 py-0.5 text-[11px] tracking-[0.1em] text-[var(--pr)]">PR</span>
          提携後に表示
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {['引っ越しの見積もり', '住まい探し'].map((t) => (
            <div key={t} className="rounded-[8px] border border-[rgba(68,80,90,.3)] bg-[rgba(255,255,255,.55)] px-3 py-2.5">
              <p className="text-[14px] font-bold">{t}</p>
              <p className="text-[12px] leading-snug">ここに提携先の案内が入ります（試作のため、いまは空き枠です）。</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  )
}

export function Result({
  focusHeadline,
  ranked,
  current,
  input,
  isSample,
  printOnMount,
  onPick,
  onRetry,
  onRestart,
}: {
  focusHeadline: boolean
  ranked: Comparison[]
  current: Comparison
  input: FamilyInput
  isSample: boolean
  printOnMount: boolean
  onPick: (id: string) => void
  onRetry: () => void
  onRestart: () => void
}) {
  const reduce = useReducedMotion()
  const [live, setLive] = useState('')
  const c = current

  useEffect(() => {
    const t = window.setTimeout(() => setLive(`結果: ${c.headline}。${MOOD_TEXT[c.mood]}`), 350)
    return () => window.clearTimeout(t)
  }, [c.headline, c.mood])

  useEffect(() => {
    if (reduce || c.mood < 2) return
    const t = window.setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 75,
        startVelocity: 32,
        origin: { y: 0.32 },
        colors: ['#c8392e', '#f1c232', '#fffdf7', '#c88a4c', '#1d6a4e'],
        shapes: ['square'],
        scalar: 0.85,
        disableForReducedMotion: true,
      })
    }, 700)
    return () => window.clearTimeout(t)
  }, [c.to.id, c.mood, reduce])

  const sceneLabel = `食卓に家族がそろい、${c.to.name}の名物（${c.to.pride.map((p) => p.label).join('、')}）がならんでいます。${FAMILY_SAYS[c.mood]}。${PIGGY_SAYS[c.mood]}。`

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] lg:gap-12 lg:px-8 lg:pt-8">
      <p className="vd-sr" aria-live="polite">
        {live}
      </p>
      <div className="vd-stick">
        <Headline c={c} focus={focusHeadline} />
        <div className="mt-3">
          <TableScene input={input} mode="result" mood={c.mood} city={c.to} label={sceneLabel} />
          <p className="mt-1 text-center text-[12.5px] leading-snug text-[var(--ink-2)]" aria-hidden="true">
            {CAPTION[c.mood]}
          </p>
        </div>
        <PrideList c={c} />
      </div>

      <div className="mt-8 lg:mt-0">
        <h2 className="vd-sr">家計のレシート</h2>
        <Receipt c={c} input={input} isSample={isSample} printOnMount={printOnMount} />
        <Others ranked={ranked} current={c} onPick={onPick} />
        <NextSteps c={c} input={input} />
        <div className="mt-8 flex flex-col items-stretch gap-2">
          <button type="button" className="vd-btn" onClick={onRetry}>
            <RotateCcw size={18} aria-hidden="true" />
            条件を変えてもう1回
          </button>
          <button type="button" className="vd-link self-center" onClick={onRestart}>
            はじめの画面にもどる
          </button>
        </div>
        <footer className="mt-8 border-t border-dashed border-[rgba(42,39,48,.3)] pt-4 text-[12px] leading-relaxed text-[var(--ink-2)]">
          <p>{DISCLAIMER}</p>
          <p className="mt-1">データは{DATA_AS_OF}時点。入力した内容は、この端末の中だけで計算に使い、どこにも送っていません。結果はくじではなく、計算で決まります。</p>
        </footer>
      </div>
    </div>
  )
}

/** 候補が1つもないとき（通勤圏のデータがまだない街など）。 */
export function NoCandidate({ input, onRemote, onRetry }: { input: FamilyInput; onRemote: () => void; onRetry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[520px] px-4 pb-16 pt-8">
      <div className="vd-paper-wrap">
        <div className="vd-paper px-6 pb-10 pt-10 text-center">
          <p className="text-[20px] font-bold">
            <span className="vd-wide">住む街ガチャ</span>
          </p>
          <div className="vd-rule my-4" />
          <h1 className="vd-hand text-[26px] leading-snug" aria-live="polite">
            通える範囲の候補が、まだデータにありません
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed">
            試作のデータは9つの街だけです。{input.work === 'commute' || input.work === 'part' ? '働き方を「リモートで働く」にすると、全国の街と比べられます。' : ''}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" className="vd-btn" onClick={onRemote}>
              リモートにして、もう1回
            </button>
            <button type="button" className="vd-link self-center" onClick={onRetry}>
              条件を見なおす
            </button>
          </div>
          <p className="mt-6 text-[12px] text-[var(--ink-2)]">{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  )
}
