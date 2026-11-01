// 案D「家計レシート」
// 食卓に家族を座らせ、年齢の札を立て、伝票に丸をつけて「お会計」。レジのプリンターからレシートが
// ジジジと1行ずつ出てきて、結果は「家計のレシート」と「名物の食卓」で見せる。
// 得するほど食卓に名物とごちそうが並び、家族がよろこぶ。損なときは料理を減らさず、貯金箱だけがしょんぼりする。
// 数字はすべて @/shared の rank() の計算どおり（くじではない）。21st から借りた部品は CREDITS.md と各ファイルの先頭に書いた。
import './theme.css'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_INPUT, SAMPLE_INPUT_REMOTE, rank } from '@/shared'
import type { FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { GachaShow } from './printer'
import { NoCandidate, Result } from './result'
import { TableScene } from './scene'
import { OrderStrip, STEP_META, StepAges, StepCity, StepFamily, StepIncome, StepPeriod, StepWork, addKid, stepsFor } from './steps'
import { clone, sameInput } from './lib'

type Screen = 'start' | 'input' | 'gacha' | 'result'

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    return { result: q.get('step') === 'result', remote: q.get('sample') === 'remote' }
  } catch {
    return { result: false, remote: false }
  }
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg pr-2 text-[15px] font-bold tracking-[0.06em]" aria-label="住む街ガチャ（はじめの画面へ）">
      <svg viewBox="0 0 22 26" width={20} height={24} aria-hidden="true">
        <path d="M2 1 H20 V22 l-2 2 -2 -2 -2 2 -2 -2 -2 2 -2 -2 -2 2 -2 -2 -2 2Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M6 7 H16 M6 11 H13 M6 15 H16" stroke="var(--ink)" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      住む街ガチャ
    </button>
  )
}

function Dots({ n, at }: { n: number; at: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cn('h-[5px] rounded-full transition-all', i < at ? 'w-4 bg-[var(--ink)]' : i === at ? 'w-7 bg-[var(--red)]' : 'w-4 bg-[rgba(42,39,48,.18)]')} />
      ))}
    </span>
  )
}

function Start({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-14 pt-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center lg:gap-14 lg:px-8 lg:pt-10">
      <TableScene input={SAMPLE_INPUT} mode="start" />
      <div className="relative z-10 mx-auto -mt-7 max-w-[440px] lg:mt-0">
        <div className="vd-paper-wrap">
          <div className="vd-paper px-6 pb-9 pt-9">
            <h1 className="text-center text-[25px] font-bold leading-tight tracking-[0.05em]">
              <span className="vd-wide">住む街ガチャ</span>
            </h1>
            <p className="mt-1.5 text-center text-[13px] font-bold tracking-[0.42em]">家計レシート</p>
            <div className="vd-rule my-4" aria-hidden="true" />
            <p className="text-[16px] font-bold leading-relaxed">家族の条件を入れると、引っ越し先の街ごとに「1年でいくら得か・損か」をレシートにして出します。</p>
            <ul className="mt-3 space-y-1.5 text-[13.5px] leading-snug">
              <li className="flex gap-2">
                <span aria-hidden="true">・</span>質問は6つ。1分ほどで終わります
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">・</span>得するほど、食卓に名物がならびます
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">・</span>くじではありません。結果は計算で決まります
              </li>
            </ul>
            <div className="vd-rule my-5" aria-hidden="true" />
            <button type="button" className="vd-btn w-full" onClick={onStart}>
              はじめる
              <ArrowRight size={19} aria-hidden="true" />
            </button>
            <div className="mt-2 text-center">
              <button type="button" className="vd-link" onClick={onSample}>
                入力例のレシートを先に見る
              </button>
            </div>
            <p className="mt-3 text-center text-[12px] leading-snug text-[var(--ink-2)]">入力はこの端末の中だけで使います。送信しません。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VariantD() {
  const url = useMemo(readUrl, [])
  const reduce = useReducedMotion()
  const sample = url.remote ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT
  const [screen, setScreen] = useState<Screen>(url.result ? 'result' : 'start')
  const [input, setInput] = useState<FamilyInput>(() => clone(sample))
  const [step, setStep] = useState(0)
  const [activeChild, setActiveChild] = useState<string | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [printOnMount, setPrintOnMount] = useState(url.result)
  const qRef = useRef<HTMLHeadingElement>(null)
  const stepMoved = useRef(false)

  const steps = stepsFor(input)
  const at = Math.min(step, steps.length - 1)
  const key = steps[at]
  const ranked = useMemo(() => rank(input), [input])
  const current = ranked.find((r) => r.to.id === pick) ?? ranked[0]
  const isSample = sameInput(input, SAMPLE_INPUT) || sameInput(input, SAMPLE_INPUT_REMOTE)

  const scrollTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  const go = (s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const spin = (f: FamilyInput = input) => {
    setPick(null)
    setPrintOnMount(false)
    if (reduce || !rank(f).length) go('result')
    else go('gacha')
  }
  const next = () => {
    if (at < steps.length - 1) {
      stepMoved.current = true
      setStep(at + 1)
      scrollTop()
    } else spin()
  }
  const back = () => {
    if (at > 0) {
      stepMoved.current = true
      setStep(at - 1)
      scrollTop()
    } else go('start')
  }

  useEffect(() => {
    if (key === 'ages' && !input.children.some((c) => c.id === activeChild)) setActiveChild(input.children[0]?.id ?? null)
  }, [key, input.children, activeChild])

  // 質問が変わったら、見出しにフォーカスを移す（読み上げで今の質問が分かるように）
  useEffect(() => {
    if (screen === 'input' && stepMoved.current) {
      stepMoved.current = false
      qRef.current?.focus({ preventScroll: true })
    }
  }, [at, screen])

  const body = (() => {
    switch (key) {
      case 'family':
        return <StepFamily input={input} set={setInput} />
      case 'ages':
        return <StepAges input={input} set={setInput} active={activeChild} setActive={setActiveChild} />
      case 'income':
        return <StepIncome input={input} set={setInput} />
      case 'work':
        return <StepWork input={input} set={setInput} />
      case 'city':
        return <StepCity input={input} set={setInput} />
      default:
        return <StepPeriod input={input} set={setInput} />
    }
  })()

  const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22 } }

  return (
    <MotionConfig reducedMotion="user">
      <div className="vd">
        {screen !== 'gacha' && (
          <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-4 pt-2 lg:px-8 lg:pt-4">
            <Logo onClick={() => go('start')} />
            {screen === 'input' && (
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--ink-2)]">
                <span>
                  質問 {at + 1}/{steps.length}
                </span>
                <Dots n={steps.length} at={at} />
              </p>
            )}
            {screen === 'result' && (
              <button
                type="button"
                className="vd-btn vd-btn--paper !min-h-[44px] !rounded-[10px] !px-3.5 !text-[14px]"
                onClick={() => {
                  setStep(0)
                  go('input')
                }}
              >
                条件を変える
              </button>
            )}
          </header>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {screen === 'start' && (
            <motion.main key="start" {...fade}>
              <Start
                onStart={() => {
                  setStep(0)
                  go('input')
                }}
                onSample={() => {
                  const f = clone(SAMPLE_INPUT)
                  setInput(f)
                  spin(f)
                }}
              />
            </motion.main>
          )}

          {screen === 'input' && (
            <motion.main key="input" {...fade} className="mx-auto w-full max-w-[1120px] px-4 pb-6 pt-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-14 lg:px-8 lg:pt-6">
              <div className="lg:sticky lg:top-6 lg:self-start">
                <TableScene
                  input={input}
                  mode={key === 'family' ? 'family' : key === 'ages' ? 'ages' : 'plain'}
                  activeChild={activeChild}
                  onAddAdult={() => setInput({ ...input, adults: 2 })}
                  onAddKid={() => setInput(addKid(input))}
                  onPickChild={setActiveChild}
                />
                <div className="mt-2 min-h-[32px]">
                  <OrderStrip
                    input={input}
                    steps={steps}
                    current={at}
                    go={(i) => {
                      stepMoved.current = true
                      setStep(i)
                    }}
                  />
                </div>
              </div>

              <section aria-labelledby="vd-q" className="mt-3 lg:mt-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={key} {...fade}>
                    <p className="text-[12.5px] font-bold tracking-[0.14em] text-[var(--red-ink)]">
                      質問 {at + 1}／{STEP_META[key].short}
                    </p>
                    <h2 id="vd-q" ref={qRef} tabIndex={-1} className="vd-hand mt-0.5 text-[clamp(25px,7vw,31px)] leading-tight outline-none">
                      {STEP_META[key].title}
                    </h2>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{STEP_META[key].hint}</p>
                    {isSample && (
                      <p className="mt-2.5 flex items-center gap-2 text-[13px] leading-snug">
                        <span className="vd-stamp !text-[12px]">入力例</span>
                        <span>いまは入力例が入っています。あなたの家族に変えてください。</span>
                      </p>
                    )}
                    <div className="mt-3">{body}</div>
                  </motion.div>
                </AnimatePresence>

                <nav
                  aria-label="質問の移動"
                  className="sticky bottom-0 z-20 -mx-4 mt-5 flex items-center gap-3 border-t border-dashed border-[rgba(42,39,48,.25)] bg-[var(--wall)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0"
                >
                  <button type="button" className="vd-btn vd-btn--paper !px-4" onClick={back}>
                    <ArrowLeft size={18} aria-hidden="true" />
                    もどる
                  </button>
                  <button type="button" className={cn('vd-btn flex-1', at === steps.length - 1 ? '' : 'vd-btn--ink')} onClick={next}>
                    {at === steps.length - 1 ? 'ガチャ！ レシートを出す' : 'つぎへ'}
                    {at < steps.length - 1 && <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                </nav>
              </section>
            </motion.main>
          )}

          {screen === 'result' && (
            <motion.main key="result" {...fade}>
              {current ? (
                <Result
                  ranked={ranked}
                  current={current}
                  input={input}
                  isSample={isSample}
                  printOnMount={printOnMount}
                  onPick={(id) => {
                    setPick(id)
                    scrollTop()
                  }}
                  onRetry={() => {
                    setStep(0)
                    go('input')
                  }}
                  onRestart={() => go('start')}
                />
              ) : (
                <NoCandidate
                  input={input}
                  onRemote={() => {
                    const f = { ...input, work: 'remote' as const }
                    setInput(f)
                    spin(f)
                  }}
                  onRetry={() => {
                    setStep(0)
                    go('input')
                  }}
                />
              )}
            </motion.main>
          )}
        </AnimatePresence>

        <AnimatePresence>{screen === 'gacha' && current && <GachaShow key="gacha" c={current} input={input} onDone={() => go('result')} />}</AnimatePresence>
      </div>
    </MotionConfig>
  )
}
