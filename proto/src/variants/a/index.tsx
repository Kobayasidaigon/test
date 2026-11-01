// 案A「カプセルトイ」 — ガチャガチャの筐体そのものが画面。
// 家族のフィギュアを台にならべ、コインで年収を入れ、札とつまみで答えて、ハンドルを回す。
// 出てくるカプセルの中身は @/shared の rank() の計算どおり（くじではない）。
// 21st から借りた部品は CREDITS.md と各ファイルの先頭に書いた。
import './theme.css'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, SAMPLE_INPUT, SAMPLE_INPUT_REMOTE, rank } from '@/shared'
import type { Comparison, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, Coin, Figure } from './art'
import { GachaShow } from './gacha'
import { GachaHandle } from './handle'
import { CITY_LOOK, useStampBook } from './lib'
import { Dome, MachineFront, Marquee } from './machine'
import { Result } from './result'
import { STEPS, StepBody, Summary, type StepKey } from './steps'

type Screen = 'start' | 'input' | 'gacha' | 'result'

const clone = (f: FamilyInput): FamilyInput => ({ ...f, children: f.children.map((c) => ({ ...c })) })

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    return { result: q.get('step') === 'result', remote: q.get('sample') === 'remote' }
  } catch {
    return { result: false, remote: false }
  }
}

/* ───────── 壁のポスター（広い画面だけ） ───────── */

function Poster({ title, tilt = 0, children, className }: { title: string; tilt?: number; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={title}
      className={cn('relative rounded-[8px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-5 pb-5 pt-6 shadow-[5px_6px_0_var(--ink)]', className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span aria-hidden className="absolute -top-3 left-7 h-6 w-16 -rotate-6 border-2 border-[var(--ink)]/25 bg-[var(--yolk)]/75" />
      <span aria-hidden className="absolute -top-3 right-7 h-6 w-16 rotate-6 border-2 border-[var(--ink)]/25 bg-[var(--yolk)]/75" />
      <h2 className="va-pop text-[22px] leading-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function CityLineup() {
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-1">
      {CITIES.map((c) => (
        <li key={c.id} className="inline-flex items-center gap-1 text-[12.5px] font-black">
          <Capsule color={CITY_LOOK[c.id]?.capsule ?? '#ffc928'} size={16} />
          {c.name}
        </li>
      ))}
    </ul>
  )
}

const HOWTO: { n: string; t: string; art: ReactNode }[] = [
  { n: '1', t: '家族のフィギュアを、台にならべる', art: <Figure kind="adult" shirt="#3cc8a4" width={30} /> },
  { n: '2', t: '世帯の年収のぶん、コインを入れる', art: <Coin size={34} /> },
  { n: '3', t: '働き方・今の街・期間を、札とつまみでえらぶ', art: <span className="block h-7 w-9 rounded-[6px] border-[3px] border-[var(--ink)] bg-[var(--yolk)]" /> },
  { n: '4', t: 'ハンドルを、ぐるっと1周まわす', art: <span className="relative block h-9 w-9 rounded-full border-[3px] border-[var(--ink)] bg-[var(--yolk)]"><span className="absolute left-1/2 top-1/2 h-2.5 w-7 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] rounded-full border-2 border-[var(--ink)] bg-[var(--red)]" /></span> },
]

function HowTo() {
  return (
    <ol className="space-y-3">
      {HOWTO.map((h) => (
        <li key={h.n} className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center">{h.art}</span>
          <span className="text-[15px] font-black leading-snug">
            <span className="va-pop mr-1 text-[var(--red-text)]">{h.n}</span>
            {h.t}
          </span>
        </li>
      ))}
      <li className="rounded-[12px] bg-[var(--paper-2)] px-3 py-2 text-[13.5px] font-bold leading-relaxed">
        カプセルの中に「その家族にとって、年にいくら得か」の説明書と、街のはんこが入っています。
      </li>
    </ol>
  )
}

/* ───────── スタート ───────── */

function Start({ onStart }: { onStart: () => void }) {
  const [jiggle, setJiggle] = useState(0)
  return (
    <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1240px] grid-cols-1 px-2.5 lg:grid-cols-[minmax(0,1fr)_460px_minmax(0,1fr)] lg:gap-12 lg:px-8">
      <aside className="hidden items-center justify-end lg:flex">
        <Poster title="あそびかた" tilt={-2} className="w-full max-w-[330px]">
          <HowTo />
        </Poster>
      </aside>
      <div className="flex min-h-[100dvh] w-full flex-col pt-4 sm:pt-8">
        <div className="va-body va-on-red relative flex flex-1 flex-col rounded-t-[36px] border-[3px] border-b-0 border-[var(--ink)] px-3.5 pb-8 pt-6">
          <div className="flex justify-center">
            <Marquee />
          </div>
          <button type="button" aria-label="カプセルをゆらす" onClick={() => setJiggle((j) => j + 1)} className="mt-5 block w-full rounded-[30px]">
            <Dome height={196} jiggle={jiggle} />
          </button>
          <div className="va-paper mt-4 px-4 pb-4 pt-4">
            <p className="va-pop text-[21px] leading-snug">
              家族のことを入れて、
              <br />
              ハンドルを回すと…
            </p>
            <p className="mt-2 text-[15px] font-bold leading-relaxed">
              引っ越し先の候補の街が、カプセルで出てきます。中身は「その家族にとって、年にいくら得か」の説明書と、街のはんこ。
            </p>
            <button type="button" onClick={onStart} className="va-push mt-4 w-full py-3.5 text-[21px] font-black">
              はじめる
            </button>
            <ul className="mt-3.5 space-y-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">
              <li>・入力はこの端末の中だけで使います。どこにも送りません。</li>
              <li>・出てくる街は計算で決まります。くじではありません。お金もかかりません。</li>
            </ul>
          </div>
          <div className="mt-4 rounded-[16px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5 lg:hidden">
            <p className="mb-1.5 text-[12px] font-black text-[var(--ink-soft)]">試作で入っている街</p>
            <CityLineup />
          </div>
          <div className="mt-6 hidden justify-center lg:flex">
            <MachineFront className="max-w-[340px]" />
          </div>
        </div>
      </div>
      <aside className="hidden items-center justify-start lg:flex">
        <Poster title="試作で入っている街" tilt={2} className="w-full max-w-[330px]">
          <CityLineup />
          <p className="mt-4 rounded-[12px] bg-[var(--paper-2)] px-3 py-2 text-[13px] font-bold leading-relaxed">
            数字は2026年11月1日時点の調べと、推定をふくみます。たしかめた度合いは、結果に小さな札で出ます。
          </p>
        </Poster>
      </aside>
    </div>
  )
}

/* ───────── 入力の画面 ───────── */

function Lamps({ step, onJump }: { step: StepKey; onJump: (k: StepKey) => void }) {
  const cur = STEPS.findIndex((s) => s.key === step)
  return (
    <ol className="flex items-start justify-between gap-1" aria-label="すすみぐあい">
      {STEPS.map((s, i) => {
        const done = i < cur
        const now = i === cur
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center">
            <button
              type="button"
              onClick={() => onJump(s.key)}
              aria-current={now ? 'step' : undefined}
              aria-label={`${i + 1}. ${s.short}${done ? '（こたえた）' : ''}`}
              className={cn(
                'grid h-[22px] w-[22px] place-items-center rounded-full border-[3px] border-[var(--ink)] text-[10px] font-black',
                now ? 'bg-white' : done ? 'bg-[var(--yolk)]' : 'bg-[var(--red-deep)]',
              )}
            >
              {now && <span className="h-2 w-2 rounded-full bg-[var(--red)]" />}
            </button>
            <span className={cn('mt-0.5 text-[10.5px] leading-none text-white', now ? 'font-black underline decoration-2 underline-offset-2' : 'font-bold')}>{s.short}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function VariantA() {
  const boot = useMemo(readUrl, [])
  const reduce = useReducedMotion()
  const [screen, setScreen] = useState<Screen>(boot.result ? 'result' : 'start')
  const [step, setStep] = useState<StepKey>('family')
  const [input, setInput] = useState<FamilyInput>(() => clone(boot.remote ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT))
  const [touched, setTouched] = useState(false)
  const [ranked, setRanked] = useState<Comparison[]>(() => (boot.result ? rank(boot.remote ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT) : []))
  const [sel, setSel] = useState(0)
  const [jiggle, setJiggle] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [turnKey, setTurnKey] = useState(0)
  const book = useStampBook()
  const preview = useMemo(() => rank(input), [input])
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (boot.result && ranked[0]) book.add(ranked[0].to.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  const set = (fn: (p: FamilyInput) => FamilyInput) => {
    setInput(fn)
    setTouched(true)
    setJiggle((j) => j + 1)
  }
  const idx = STEPS.findIndex((s) => s.key === step)
  const go = (k: StepKey) => {
    setStep(k)
    window.scrollTo({ top: 0 })
  }
  const onTurned = () => {
    const r = rank(input)
    if (!r.length) return
    setRanked(r)
    setSel(0)
    book.add(r[0].to.id)
    if (reduce) {
      setScreen('result')
      window.scrollTo({ top: 0 })
      return
    }
    setShaking(true)
    window.setTimeout(() => {
      setShaking(false)
      setScreen('gacha')
    }, 380)
  }
  const fromCity = CITIES.find((c) => c.id === input.fromCityId)
  const isSampleNow = !touched

  return (
    <div className="va" ref={topRef}>
      {screen === 'start' && (
        <Start
          onStart={() => {
            setScreen('input')
            go('family')
          }}
        />
      )}

      {screen === 'input' && (
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 px-2.5 lg:grid-cols-[minmax(0,1fr)_460px_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-10 mt-24 flex justify-end">
            <Poster title="いまの答え" tilt={-1.5} className="w-full max-w-[330px]">
              {isSampleNow && <p className="mb-2 text-[13px] font-black text-[var(--red-text)]">いまは入力例です</p>}
              <Summary input={input} onJump={go} />
              <p className="mt-3 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">札を押すと、その問いにもどれます。入れた答えは、この端末の中だけで使います。</p>
            </Poster>
          </div>
        </aside>
        <div className="flex min-h-[100dvh] w-full flex-col pt-2.5 sm:pt-6">
          <div className="va-body va-on-red relative flex flex-1 flex-col rounded-t-[30px] border-[3px] border-b-0 border-[var(--ink)] px-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Marquee size="small" />
              {isSampleNow && (
                <span className="rotate-[4deg] rounded-[8px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[12px] font-black text-[var(--red-text)]">
                  いまは入力例
                </span>
              )}
            </div>
            <div className="mt-3">
              <Lamps step={step} onJump={go} />
            </div>
            <div className="mt-2.5">
              <Dome height={step === 'turn' ? 124 : 92} jiggle={jiggle} shaking={shaking} />
            </div>

            <section aria-labelledby="va-q" className="va-paper relative mt-3 px-3.5 pb-5 pt-3.5 text-[var(--ink)]">
              <div className="flex items-center gap-2">
                <span className="va-pop rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--yolk)] px-2 py-0.5 text-[13px] leading-none">
                  {idx < 5 ? `Q${idx + 1}` : 'GO'}
                </span>
                <span className="text-[12px] font-black text-[var(--ink-soft)]">{idx < 5 ? `${idx + 1} / 5` : 'さいご'}</span>
              </div>
              <h1 id="va-q" className="va-pop mt-2 text-[25px] leading-tight">
                {STEPS[idx].q}
              </h1>
              <p className="mt-1.5 text-[13.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
                {STEPS[idx].hint}
                {isSampleNow && step === 'family' && (
                  <>
                    {' '}
                    <span className="text-[var(--red-text)]">いまは入力例の家族です。</span>さわると、あなたの家族になります。
                  </>
                )}
              </p>
              <div className="mt-4">
                {/* 退場アニメは付けない（札の layoutId と mode="wait" の組み合わせで、次の問いが出なくなることがあったため） */}
                <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    {step !== 'turn' ? (
                      <StepBody step={step} input={input} set={set} onCoin={() => setJiggle((j) => j + 1)} />
                    ) : (
                      <div>
                        {preview.length ? (
                          <div className="flex flex-col items-center">
                            <GachaHandle key={turnKey} onTurned={onTurned} onNotch={() => setJiggle((j) => j + 1)} />
                            <p className="mt-3 text-center text-[13px] font-black">ドラッグでぐるっと1周。押すだけでも回ります。</p>
                          </div>
                        ) : (
                          <div className="rounded-[14px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3 py-3">
                            <p className="text-[14px] font-bold leading-relaxed">
                              {fromCity?.name}から通える候補の街は、まだ試作のデータに入っていません。リモートや自営なら、全国の街と比べられます。
                            </p>
                            <button type="button" onClick={() => go('work')} className="va-push mt-3 px-4 py-2 text-[14px] font-black">
                              働き方をえらびなおす
                            </button>
                          </div>
                        )}
                        <div className="mt-5 rounded-[14px] bg-[var(--paper-2)] px-2.5 pb-2.5 pt-2">
                          <p className="mb-1.5 text-[12px] font-black text-[var(--ink-soft)]">
                            この答えで回します{isSampleNow && '（いまは入力例のまま）'}。札を押すと、なおせます。
                          </p>
                          <Summary input={input} onJump={go} />
                        </div>
                        <p className="mt-3 text-center text-[12px] font-bold text-[var(--ink-soft)]">出てくる街は、入れた答えから計算で決まります。くじではありません。</p>
                      </div>
                    )}
                </motion.div>
              </div>
            </section>

            <nav aria-label="すすむ・もどる" className="va-body sticky bottom-0 z-20 -mx-3 mt-auto flex items-center justify-between gap-3 border-t-[3px] border-[var(--ink)] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => (idx === 0 ? setScreen('start') : go(STEPS[idx - 1].key))}
                className="va-ghost inline-flex items-center gap-1 px-4 py-2.5 text-[15px] font-black text-white"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden />
                もどる
              </button>
              {step !== 'turn' ? (
                <button type="button" onClick={() => go(STEPS[idx + 1].key)} className="va-push inline-flex items-center gap-1.5 px-6 py-2.5 text-[17px] font-black">
                  {idx === 4 ? 'ハンドルへ' : 'つぎへ'}
                  <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden />
                </button>
              ) : (
                <span className="text-[13px] font-black text-white">ハンドルを回してね</span>
              )}
            </nav>
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-10 mt-40 flex justify-start">
            <Poster title="カプセルの中身" tilt={1.5} className="w-full max-w-[330px]">
              <ul className="space-y-2 text-[14px] font-bold leading-snug">
                {[
                  ['ご当地はんこ', '出てきた街のはんこ。スタンプ帳にたまります'],
                  ['年にいくら違うか', '毎年の差を、月・1日にも言いかえます'],
                  ['項目ごとの説明書', '保育料・給付・給食・医療費を分けて'],
                  ['一度きりのお金', '移住支援金などは、別の枠で'],
                  ['おまけ', 'その街の名物・有名なもの'],
                ].map(([a, b]) => (
                  <li key={a} className="flex gap-2">
                    <Capsule color="var(--yolk)" size={20} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-black">{a}</span>
                      <span className="block text-[12.5px] text-[var(--ink-soft)]">{b}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Poster>
          </div>
        </aside>
        </div>
      )}

      {screen === 'gacha' && ranked[0] && (
        <GachaShow
          c={ranked[0]}
          onDone={() => {
            setScreen('result')
            window.scrollTo({ top: 0 })
          }}
        />
      )}

      {screen === 'result' && ranked[sel] && (
        <Result
          input={boot.result && !touched ? (boot.remote ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT) : input}
          ranked={ranked}
          sel={sel}
          onSelect={(i) => {
            setSel(i)
            book.add(ranked[i].to.id)
            toTop()
          }}
          onRetry={() => {
            setScreen('input')
            setTurnKey((k) => k + 1)
            go('turn')
          }}
          onRestart={() => {
            setScreen('start')
            setTurnKey((k) => k + 1)
            setStep('family')
            window.scrollTo({ top: 0 })
          }}
          isSample={!touched}
          opened={book.ids}
        />
      )}
    </div>
  )
}
