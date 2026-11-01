// 案C「街カード」— 入力: 家族カードを1枚ずつ組み立てる（1画面1問）
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Clock3, Laptop, Plus, Shuffle, Store, TrainFront, X } from 'lucide-react'
import type { FamilyInput, IncomeBand, WorkStyle } from '@/shared'
import { CITIES, INCOME_BANDS, WORK_STYLES, cityById } from '@/shared'
import { cn } from '@/lib/utils'
import { CityArt, CoinStack, Person } from './art'
import { AgeFlip } from './flipcounter'
import { ageText, incomeLabel, meta, newChildId, periodYears, workLabel, yearsShort } from './lib'
import { Btn } from './ui'

export const STEPS = [
  { key: 'adults', q: 'いっしょに引っ越す大人は？', help: 'ひとり親の家族も、そのまま計算できます。' },
  { key: 'kids', q: '子どもは？', help: '年齢の札をめくって合わせます。生まれる予定の子は「これから」に。' },
  { key: 'income', q: '世帯年収は？', help: '共働きなら2人の合計。税金を引く前の額で、だいたいでかまいません。保育料の計算に使います。' },
  { key: 'work', q: '働き方は？', help: 'くらべる街の範囲が変わります。' },
  { key: 'from', q: 'いま住んでいる街は？', help: '試作なので、10の街から選びます。' },
  { key: 'years', q: '何年分でくらべる？', help: '長くくらべると、子どもが育つのに合わせて1年ずつ計算します。' },
] as const

// ---------- 札を選ぶ（ラジオ） ----------
type Opt<T> = { v: T; disabled?: boolean; aria?: string }
function CardRadio<T extends string | number>({ label, value, options, onChange, className, optionClass, render }: {
  label: string; value: T; options: Opt<T>[]; onChange: (v: T) => void; className?: string; optionClass?: string
  render: (v: T, on: boolean) => ReactNode
}) {
  const reduce = useReducedMotion()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selIdx = options.findIndex((o) => o.v === value && !o.disabled)
  const focusIdx = selIdx >= 0 ? selIdx : options.findIndex((o) => !o.disabled)
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = options.length
    let j = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
      do { j = (j + d + n) % n } while (options[j].disabled && j !== i)
    } else if (e.key === 'Home') j = options.findIndex((o) => !o.disabled)
    else if (e.key === 'End') j = n - 1 - [...options].reverse().findIndex((o) => !o.disabled)
    else return
    e.preventDefault()
    onChange(options[j].v)
    refs.current[j]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((o, i) => {
        const on = i === selIdx
        return (
          <motion.button
            key={String(o.v)}
            ref={(el) => { refs.current[i] = el }}
            type="button" role="radio" aria-checked={on} aria-label={o.aria} disabled={o.disabled}
            tabIndex={i === focusIdx ? 0 : -1}
            onClick={() => onChange(o.v)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn('vc-opt', on && 'is-on', optionClass)}
            animate={reduce ? undefined : { y: on ? -5 : 0, rotate: on ? -0.6 : 0 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            {render(o.v, on)}
            <AnimatePresence>
              {on && (
                <motion.span className="vc-opt-stamp" aria-hidden
                  initial={reduce ? false : { scale: 1.9, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: -10 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                  <Check strokeWidth={3.2} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}

// ---------- 家族カード（いま組み立てているもの） ----------
function FamilyCard({ input, pristine, step, onJump }: { input: FamilyInput; pristine: boolean; step: number; onJump: (i: number) => void }) {
  const reduce = useReducedMotion()
  const from = cityById(input.fromCityId)
  const slots = [
    { i: 2, k: '世帯年収', v: incomeLabel(input.income) },
    { i: 3, k: '働き方', v: workLabel(input.work) },
    { i: 4, k: 'いまの街', v: from.name },
    { i: 5, k: 'くらべる期間', v: yearsShort(input) },
  ]
  return (
    <section className="vc-fam" aria-label="家族カード（入力した内容）">
      <div className="vc-fam-band" aria-hidden><span>家族カード</span></div>
      <div className="vc-fam-body">
        <div className="vc-fam-top">
          <span className={cn('vc-fam-tag', pristine ? 'is-sample' : 'is-mine')}>{pristine ? '入力例' : 'あなたの家族'}</span>
          <span className="vc-fam-count">大人{input.adults}人・子ども{input.children.length}人</span>
        </div>
        <button type="button" className={cn('vc-fam-people', step <= 1 && 'is-active')} onClick={() => onJump(step === 0 ? 0 : 1)}
          aria-label={`家族の人数と年齢を変える（いま: 大人${input.adults}人、子ども${input.children.length}人）`}>
          <AnimatePresence initial={false} mode="popLayout">
            {Array.from({ length: input.adults }, (_, i) => (
              <motion.span key={`a${i}`} className="vc-fam-person" layout={!reduce}
                initial={reduce ? false : { y: 24, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 16, opacity: 0 }}>
                <Person kind="adult" seed={i} face="smile" className="vc-fam-fig" />
                <span className="vc-fam-plabel">大人</span>
              </motion.span>
            ))}
            {input.children.map((c, i) => (
              <motion.span key={c.id} className="vc-fam-person is-kid" layout={!reduce}
                initial={reduce ? false : { y: 24, opacity: 0, rotate: 8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 16, opacity: 0 }}>
                <Person kind={c.age < 0 ? 'baby' : 'child'} seed={i + 2} face="smile" className="vc-fam-fig" />
                <span className="vc-fam-plabel">{ageText(c.age)}{c.age <= 2 && c.nursery ? '・園' : ''}</span>
              </motion.span>
            ))}
          </AnimatePresence>
        </button>
        <div className="vc-fam-slots">
          {slots.map((s) => (
            <button key={s.k} type="button" className={cn('vc-fam-slot', step === s.i && 'is-active')} onClick={() => onJump(s.i)}
              aria-label={`${s.k}を変える（いま: ${s.v}）`}>
              <span className="vc-fam-slot-k">{s.k}</span>
              <span className="vc-fam-slot-vwrap">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={s.v} className="vc-fam-slot-v"
                    initial={reduce ? false : { rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.28 }}>
                    {s.v}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- 各問 ----------
const WORK_ICON: Record<WorkStyle, ReactNode> = {
  commute: <TrainFront aria-hidden strokeWidth={2.2} />,
  remote: <Laptop aria-hidden strokeWidth={2.2} />,
  self: <Store aria-hidden strokeWidth={2.2} />,
  part: <Clock3 aria-hidden strokeWidth={2.2} />,
}

function YesNo({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <CardRadio label={label} value={value ? 'yes' : 'no'} onChange={(v) => onChange(v === 'yes')}
      options={[{ v: 'yes' }, { v: 'no' }]} className="vc-yn" optionClass="vc-yn-opt"
      render={(v) => <span>{v === 'yes' ? '通う' : '通わない'}</span>} />
  )
}

function Kids({ input, update }: { input: FamilyInput; update: (p: Partial<FamilyInput>) => void }) {
  const reduce = useReducedMotion()
  const setKid = (id: string, p: Partial<FamilyInput['children'][number]>) =>
    update({ children: input.children.map((c) => (c.id === id ? { ...c, ...p } : c)) })
  const remove = (id: string) => {
    const children = input.children.filter((c) => c.id !== id)
    update({ children, ...(children.length === 0 && input.years === 18 ? { years: 5 as const } : {}) })
  }
  const add = () => update({ children: [...input.children, { id: newChildId(), age: 0, nursery: true }] })
  return (
    <div>
      <div className="vc-kids">
        <AnimatePresence initial={false} mode="popLayout">
          {input.children.map((c, i) => (
            <motion.div key={c.id} layout={!reduce} className="vc-kid"
              initial={reduce ? false : { opacity: 0, y: 40, rotate: -7 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -30, rotate: 6, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
              <div className="vc-kid-head">
                <span>{i + 1}人目</span>
                <button type="button" className="vc-kid-x" aria-label={`${i + 1}人目の子を外す`} onClick={() => remove(c.id)}><X aria-hidden strokeWidth={2.6} /></button>
              </div>
              <Person kind={c.age < 0 ? 'baby' : 'child'} seed={i + 2} face="smile" className="vc-kid-fig" />
              <AgeFlip value={c.age} onChange={(v) => setKid(c.id, { age: v })} label={`${i + 1}人目の子の年齢`} />
              {c.age <= 2 ? (
                <div className="vc-kid-nursery">
                  <span className="vc-kid-nlabel">{c.age < 0 ? '生まれたら保育園に' : '保育園に'}</span>
                  <YesNo value={c.nursery} onChange={(v) => setKid(c.id, { nursery: v })} label={`${i + 1}人目の子は保育園に通うか`} />
                </div>
              ) : (
                <p className="vc-kid-note">{c.age <= 5 ? '3〜5歳の保育料は、国の無償化で0円' : c.age <= 11 ? '小学生' : c.age <= 14 ? '中学生（給食費の差を見ます）' : '高校生年代（医療費の差を見ます）'}</p>
              )}
            </motion.div>
          ))}
          {input.children.length < 5 && (
            <motion.button key="add" layout={!reduce} type="button" className="vc-kid-add" onClick={add}>
              <span className="vc-kid-add-plus"><Plus aria-hidden strokeWidth={2.6} /></span>
              <span>子どもを足す</span>
              <small>あと{5 - input.children.length}人まで</small>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {input.children.length === 0 && <p className="vc-note">子どもがいない家族も計算できます。差が出る項目は少なめです。</p>}
    </div>
  )
}

// ---------- 入力の流れ全体 ----------
export function InputFlow({ input, update, pristine, step, setStep, onDraw, onHome, candidates }: {
  input: FamilyInput
  update: (p: Partial<FamilyInput>) => void
  pristine: boolean
  step: number
  setStep: (s: number) => void
  onDraw: () => void
  onHome: () => void
  candidates: number
}) {
  const reduce = useReducedMotion()
  const dir = useRef(1)
  const prev = useRef(step)
  if (prev.current !== step) { dir.current = step > prev.current ? 1 : -1; prev.current = step }
  const head = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    head.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [step, reduce])

  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const go = (i: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, i)))
  const youngest = input.children.length ? periodYears({ ...input, years: 18 }) : 0

  let body: ReactNode = null
  if (s.key === 'adults') {
    body = (
      <CardRadio label="大人の人数" value={input.adults} onChange={(v) => update({ adults: v as 1 | 2 })}
        options={[{ v: 1 }, { v: 2 }]} className="vc-grid2"
        render={(v) => (
          <span className="vc-opt-adults">
            <span className="vc-opt-figs">{Array.from({ length: v }, (_, i) => <Person key={i} kind="adult" seed={i} face="smile" className="vc-opt-fig" />)}</span>
            <b>大人{v}人</b>
          </span>
        )} />
    )
  } else if (s.key === 'kids') {
    body = <Kids input={input} update={update} />
  } else if (s.key === 'income') {
    body = (
      <CardRadio label="世帯年収" value={input.income} onChange={(v) => update({ income: v as IncomeBand })}
        options={INCOME_BANDS.map((b) => ({ v: b.id }))} className="vc-list"
        render={(v) => {
          const i = INCOME_BANDS.findIndex((b) => b.id === v)
          return (
            <span className="vc-opt-row">
              <CoinStack n={i + 1} className="vc-opt-coins" />
              <b>{INCOME_BANDS[i].label}</b>
            </span>
          )
        }} />
    )
  } else if (s.key === 'work') {
    body = (
      <CardRadio label="働き方" value={input.work} onChange={(v) => update({ work: v as WorkStyle })}
        options={WORK_STYLES.map((w) => ({ v: w.id }))} className="vc-grid2"
        render={(v) => {
          const w = WORK_STYLES.find((x) => x.id === v)!
          return (
            <span className="vc-opt-work">
              <span className="vc-opt-icon">{WORK_ICON[w.id]}</span>
              <b>{w.label}</b>
              <small>{w.hint}</small>
            </span>
          )
        }} />
    )
  } else if (s.key === 'from') {
    body = (
      <CardRadio label="いま住んでいる街" value={input.fromCityId} onChange={(v) => update({ fromCityId: v })}
        options={CITIES.map((c) => ({ v: c.id, aria: `${c.pref}${c.name}` }))} className="vc-cities" optionClass="vc-opt-city"
        render={(v) => {
          const c = cityById(v)
          return (
            <span className="vc-pick" style={{ ['--ink' as string]: meta(c.id).ink }}>
              <span className="vc-pick-art"><CityArt id={c.id} /></span>
              <span className="vc-pick-txt"><small>{c.pref}</small><b>{c.name}</b></span>
            </span>
          )
        }} />
    )
  } else {
    body = (
      <CardRadio label="くらべる期間" value={input.years} onChange={(v) => update({ years: v as 1 | 5 | 18 })}
        options={[{ v: 1 }, { v: 5 }, { v: 18, disabled: input.children.length === 0, aria: input.children.length ? `下の子が18歳まで（${youngest}年）` : '下の子が18歳まで（子どもがいないので選べません）' }]}
        className="vc-list"
        render={(v) => (
          <span className="vc-opt-row is-years">
            <span className="vc-opt-big">{v === 18 ? '18歳まで' : `${v}年`}</span>
            <small>{v === 1 ? 'まずは来年1年分' : v === 5 ? '保育園から小学校に上がるくらいまで' : input.children.length ? `下の子が18歳になるまで（${youngest}年）` : '子どもがいないので選べません'}</small>
          </span>
        )} />
    )
  }

  return (
    <div className="vc-input">
      <header className="vc-bar">
        <button type="button" className="vc-logo" onClick={onHome} aria-label="住む街ガチャ（はじめの画面へ）">住む街ガチャ</button>
        <span className="vc-bar-step" aria-hidden>{step + 1} / {STEPS.length}</span>
      </header>

      <div className="vc-input-grid">
        <div className="vc-input-side">
          <FamilyCard input={input} pristine={pristine} step={step} onJump={go} />
          {pristine && step === 0 && <p className="vc-hint">はじめは<b>入力例</b>（大人2人・1歳の子・足立区）が入っています。あなたの家族に合わせて変えてください。入力はこの端末の中だけで使います。</p>}
        </div>

        <div className="vc-input-main">
          <ol className="vc-pips" aria-label={`${STEPS.length}問中 ${step + 1}問目`}>
            {STEPS.map((x, i) => (
              <li key={x.key} className={cn('vc-pip', i < step && 'is-done', i === step && 'is-now')} aria-current={i === step ? 'step' : undefined}>
                <span className="sr-only">{i + 1}問目{i < step ? '（済み）' : ''}</span>
              </li>
            ))}
          </ol>
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            <motion.section key={s.key} className="vc-q" aria-labelledby={`vc-q-${s.key}`}
              custom={dir.current}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir.current * 48, rotate: dir.current * 1.5 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir.current * -48, rotate: dir.current * -1.5 }}
              transition={{ duration: reduce ? 0.01 : 0.28, ease: [0.3, 0.7, 0.2, 1] }}>
              <p className="vc-q-no" aria-hidden>Q{step + 1}</p>
              <h2 id={`vc-q-${s.key}`} ref={head} tabIndex={-1} className="vc-q-title">{s.q}</h2>
              <p className="vc-q-help">{s.help}</p>
              {body}
              {(s.key === 'from' || s.key === 'years' || s.key === 'work') && candidates === 0 && (
                <p className="vc-note is-warn">この働き方だと、{cityById(input.fromCityId).name}から通える街が、試作のデータにまだありません。働き方を「リモートで働く」か「自営・フリーランス」にすると、全国の街とくらべられます。</p>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>

      <nav className="vc-nav" aria-label="入力の移動">
        <div className="vc-nav-in">
          <Btn tone="paper" onClick={() => (step === 0 ? onHome() : go(step - 1))} icon={<ArrowLeft aria-hidden strokeWidth={2.4} />}>
            もどる
          </Btn>
          {last ? (
            <Btn tone="shu" size="lg" onClick={onDraw} disabled={candidates === 0} icon={<Shuffle aria-hidden strokeWidth={2.4} />} className="vc-nav-main">
              カードを引く
            </Btn>
          ) : (
            <Btn tone="ink" size="lg" onClick={() => go(step + 1)} className="vc-nav-main" icon={<ArrowRight aria-hidden strokeWidth={2.4} />}>
              つぎへ
            </Btn>
          )}
        </div>
      </nav>
    </div>
  )
}
