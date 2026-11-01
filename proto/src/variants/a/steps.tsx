// 案A「カプセルトイ」 — 入力（1画面1問）。筐体のパーツを触るように答える。
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { INCOME_BANDS, WORK_STYLES, cityById } from '@/shared'
import type { Child, FamilyInput, IncomeBand, WorkStyle } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Coin } from './art'
import { Dial } from './dial'
import { FamilyStand } from './family'
import { familySummary, useNarrowScreen, yearsActual } from './lib'
import { Stepper } from './stepper'
import { TagGroup } from './tags'
import { NowCityPicker } from './towns'

export type Mode = 'gacha' | 'pick'
export type StepKey = 'family' | 'income' | 'work' | 'city' | 'years' | 'pick' | 'turn'
export const STEP_INFO: Record<StepKey, { short: string; q: string; hint: string }> = {
  family: { short: '家族', q: 'だれと住む？', hint: 'フィギュアを台にならべてね。子どもを押すと、年齢を回せます。' },
  income: { short: '年収', q: '世帯の年収は？', hint: 'コイン1枚で1段。家族みんなの年収（税こみ）のところまで入れてね。' },
  work: { short: '働き方', q: 'どう働いてる？', hint: '働き方で、おまかせで出てくる街のはんいが変わります。' },
  city: { short: '今の街', q: 'いま住んでいる街は？', hint: 'この街とくらべて、年にいくら違うかを出します。全国1,741の市区町村から選べます。' },
  years: { short: '期間', q: '何年ぶんでくらべる？', hint: 'つまみを回すか、まわりの札を押してね。' },
  pick: { short: '行きたい街', q: '行きたい街は？', hint: '2〜5個えらんでね。名前を書いたカプセルを、筐体に入れます。' },
  turn: { short: '回す', q: 'ハンドルを回そう', hint: '' },
}
export const stepsFor = (mode: Mode): StepKey[] => (mode === 'pick' ? ['family', 'income', 'work', 'city', 'years', 'pick', 'turn'] : ['family', 'income', 'work', 'city', 'years', 'turn'])

type Setter = (fn: (p: FamilyInput) => FamilyInput) => void

/* ───────── 家族 ───────── */

function FamilyStep({ input, set }: { input: FamilyInput; set: Setter }) {
  const reduce = useReducedMotion()
  const narrow = useNarrowScreen(370)
  const dialSize = narrow ? 104 : 116
  const [selId, setSelId] = useState<string | null>(input.children[0]?.id ?? null)
  const [autoNote, setAutoNote] = useState(false)
  const sel = input.children.find((c) => c.id === selId) ?? input.children[input.children.length - 1] ?? null
  const seq = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  // 年齢つまみか保育園の札が、最初の画面で下の帯に隠れるなら、えらんでいる子の答えをフィギュアのすぐ下にも出す
  const [short, setShort] = useState(false)
  useLayoutEffect(() => {
    const check = () => {
      const el = panelRef.current
      if (!el) return
      const navTop = document.querySelector('nav[aria-label="すすむ・もどる"]')?.getBoundingClientRect().top ?? window.innerHeight - 92
      const bottoms = [el.querySelector('[role=slider]'), el.querySelector('[role=radiogroup]')].map((x) => x?.getBoundingClientRect().bottom ?? 0)
      setShort((s) => s || Math.max(...bottoms) > navTop)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [sel?.id])
  // 年齢つまみと保育園の札の枠を、下の帯に隠れない所まで送る（帯の高さは scroll-padding-bottom で空けてある）
  const showPanel = () => window.setTimeout(() => panelRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 40)
  const selectChild = (id: string) => {
    setSelId(id)
    showPanel()
  }
  const addChild = () => {
    const id = `k${Date.now().toString(36)}${seq.current++}`
    set((p) => ({ ...p, children: [...p.children, { id, age: 3, nursery: false }] }))
    setSelId(id)
    setAutoNote(false)
    showPanel()
  }
  const removeChild = (id: string) => {
    set((p) => ({ ...p, children: p.children.filter((c) => c.id !== id) }))
    setSelId(null)
  }
  const patchChild = (id: string, patch: Partial<Child>) => set((p) => ({ ...p, children: p.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const ordinal = sel ? input.children.findIndex((c) => c.id === sel.id) + 1 : 0
  const ageText = (c: Child) => (c.age < 0 ? 'これから生まれる' : `${c.age}歳`)

  return (
    <div className="space-y-3">
      <FamilyStand input={input} selected={sel?.id} onSelect={selectChild} room={300} />
      {/* 背の低い画面では、つまみの枠が最初の画面の外に出るので、えらんでいる子の答えをフィギュアのすぐ下に出す */}
      {short && sel && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={showPanel}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--paper)] px-3 text-[13px] font-black shadow-[0_3px_0_var(--ink)]"
          >
            {ordinal}人目：{ageText(sel)}
            {sel.age <= 2 && `・保育園に${sel.nursery ? '通う' : '通わない'}`}
            <ChevronDown className="h-4 w-4" strokeWidth={3} aria-hidden />
            <span className="va-sr">（年齢と保育園の答えへ移る）</span>
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Stepper stacked label="大人" value={input.adults} min={1} max={2} onChange={(v) => set((p) => ({ ...p, adults: (v <= 1 ? 1 : 2) as 1 | 2 }))} />
        <Stepper
          stacked
          label="子ども"
          value={input.children.length}
          min={0}
          max={5}
          onChange={(v) => (v > input.children.length ? addChild() : input.children.length && removeChild(input.children[input.children.length - 1].id))}
        />
      </div>
      {sel ? (
        <motion.div
          ref={panelRef}
          key={sel.id}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="scroll-mb-3 rounded-[16px] border-[3px] border-dashed border-[var(--ink)]/40 bg-white/60 px-1.5 pb-2.5 pt-2.5"
        >
          <div className="grid items-start gap-2" style={{ gridTemplateColumns: `${dialSize}px minmax(0,1fr)` }}>
            <div className="flex justify-center">
              <Dial
                key={sel.id}
                label="年齢"
                ariaLabel={`${ordinal}人目の子の年齢`}
                min={-1}
                max={18}
                value={sel.age}
                size={dialSize}
                onValueChange={(v) => {
                  const auto = v <= 2 && sel.age > 2
                  patchChild(sel.id, { age: v, nursery: v <= 2 ? (sel.age <= 2 ? sel.nursery : true) : false })
                  if (auto) setAutoNote(true)
                  if (v > 2) setAutoNote(false)
                }}
                formatValue={(v) => (v < 0 ? 'これから' : `${v}歳`)}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[var(--ink-soft)]">{ordinal}人目の子</p>
              <p className="va-pop text-[21px] leading-tight text-[var(--red-text)]">{sel.age < 0 ? 'これから生まれる' : `${sel.age}歳`}</p>
              {sel.age <= 2 ? (
                <div className="mt-1">
                  <p className="mb-0.5 text-[12.5px] font-black leading-snug">{sel.age < 0 ? '生まれたら、保育園に通う予定？' : '保育園に通う？'}</p>
                  <TagGroup
                    ariaLabel={`${ordinal}人目の子は保育園に通うか`}
                    compact
                    columns={2}
                    minCol={70}
                    value={sel.nursery ? 'yes' : 'no'}
                    onChange={(v) => {
                      patchChild(sel.id, { nursery: v === 'yes' })
                      setAutoNote(false)
                    }}
                    options={[
                      { value: 'yes', label: '通う' },
                      { value: 'no', label: '通わない' },
                    ]}
                  />
                  {autoNote && <p className="mt-1.5 text-[12px] font-black leading-snug text-[var(--red-text)]">0〜2歳なので「通う」にしました。変えられます。</p>}
                </div>
              ) : (
                <p className="mt-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">保育園に通うかは、0〜2歳の子だけに聞きます。</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold leading-snug text-[var(--ink-soft)]">つまみはドラッグで回す。矢印キーでも動きます。</p>
            <button type="button" onClick={() => removeChild(sel.id)} className="min-h-[36px] shrink-0 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-[12px] font-bold">
              台からおろす
            </button>
          </div>
        </motion.div>
      ) : (
        <p className="text-center text-[13px] font-bold text-[var(--ink-soft)]">子どもがいない家族でも、そのまま進めます。</p>
      )}
    </div>
  )
}

/* ───────── 年収：コインを入れる ───────── */

function IncomeStep({ input, set, onCoin }: { input: FamilyInput; set: Setter; onCoin: () => void }) {
  const reduce = useReducedMotion()
  const idx = Math.max(0, INCOME_BANDS.findIndex((b) => b.id === input.income))
  const slotRef = useRef<HTMLDivElement>(null)
  const coinRef = useRef<HTMLButtonElement>(null)
  const dragged = useRef(false)
  const busy = useRef(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scaleX = useMotionValue(1)
  const opacity = useMotionValue(1)
  const [drops, setDrops] = useState(0)
  const setIdx = (i: number, fromDrag = false) => {
    const next = Math.max(0, Math.min(INCOME_BANDS.length - 1, i))
    if (next > idx) {
      if (!fromDrag) setDrops((d) => d + 1)
      onCoin()
    }
    set((p) => ({ ...p, income: INCOME_BANDS[next].id as IncomeBand }))
  }
  const full = idx >= INCOME_BANDS.length - 1
  // 投入口の上で放したコインは、そのまま口へ吸い込まれる。元の場所には少し遅れて新しいコインが出る
  const swallow = async () => {
    const r = slotRef.current?.getBoundingClientRect()
    const c = coinRef.current?.getBoundingClientRect()
    if (!r || !c) return
    busy.current = true
    const dx = r.left + r.width / 2 - (c.left + c.width / 2)
    const dy = r.top + r.height / 2 - (c.top + c.height / 2)
    await Promise.all([
      animate(x, x.get() + dx, { duration: 0.18, ease: 'easeIn' }),
      animate(y, y.get() + dy, { duration: 0.18, ease: 'easeIn' }),
    ])
    await Promise.all([animate(scaleX, 0.12, { duration: 0.14 }), animate(opacity, 0, { duration: 0.14 })])
    setIdx(idx + 1, true)
    x.jump(0)
    y.jump(0)
    scaleX.jump(1)
    await new Promise((res) => window.setTimeout(res, 140))
    await animate(opacity, 1, { duration: 0.18 })
    busy.current = false
  }
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <div ref={slotRef} className="relative grid h-[92px] w-[92px] place-items-center rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--metal)] shadow-[3px_4px_0_var(--ink)]">
          <span className="absolute top-1.5 text-[12px] font-black text-[var(--ink-soft)]">ここに入れる</span>
          <span className="h-[46px] w-[13px] rounded-full bg-[var(--ink)]" />
          <AnimatePresence>
            {drops > 0 && !reduce && (
              <motion.span
                key={drops}
                className="pointer-events-none absolute"
                initial={{ y: 70, scaleX: 1, opacity: 1 }}
                animate={{ y: [70, 0, 0], scaleX: [1, 1, 0.15], opacity: [1, 1, 0] }}
                transition={{ duration: 0.45, times: [0, 0.6, 1] }}
              >
                <Coin size={40} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-1.5 text-center text-[12px] font-bold leading-snug text-[var(--ink-soft)]">
          コインは
          <br />
          年収の目もり。
          <br />
          お金はかかりません
        </p>
        <motion.button
          ref={coinRef}
          type="button"
          aria-label={full ? 'コインはもう入りません' : 'コインを1枚入れる（年収を1段上げる）'}
          disabled={full}
          drag={!full && !reduce}
          dragElastic={0.6}
          dragMomentum={false}
          style={{ x, y, scaleX, opacity }}
          whileDrag={{ scale: 1.12, rotate: -8 }}
          onDragStart={() => {
            dragged.current = true
          }}
          onDragEnd={(_, info) => {
            const r = slotRef.current?.getBoundingClientRect()
            const inSlot = r && info.point.x >= r.left - 20 && info.point.x <= r.right + 20 && info.point.y >= r.top - 20 && info.point.y <= r.bottom + 20
            if (inSlot && !busy.current) void swallow()
            else {
              animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
              animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 })
            }
            window.setTimeout(() => (dragged.current = false), 0)
          }}
          onClick={() => {
            if (dragged.current || busy.current) return
            setIdx(idx + 1)
          }}
          className="mt-2.5 grid touch-none place-items-center rounded-full"
        >
          <Coin size={64} className={full ? 'opacity-40' : undefined} />
        </motion.button>
        <span className="mt-1 text-center text-[12px] font-bold leading-tight text-[var(--ink-soft)]">
          {full ? 'いちばん上です' : (
            <>
              押すか、
              <br />
              上へドラッグ
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => setIdx(idx - 1)}
          disabled={idx === 0}
          className="mt-2 min-h-[36px] rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[12px] font-black disabled:opacity-40"
        >
          1枚もどす
        </button>
      </div>
      <div role="radiogroup" aria-label="世帯年収" className="flex flex-col-reverse gap-1.5">
        {INCOME_BANDS.map((b, i) => {
          const on = i === idx
          const lit = i <= idx
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  setIdx(idx + 1)
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setIdx(idx - 1)
                }
              }}
              onClick={() => setIdx(i)}
              className={cn(
                'flex items-center gap-2 rounded-[12px] border-[3px] px-2 py-1.5 text-left transition-colors',
                on ? 'border-[var(--ink)] bg-[var(--yolk)] shadow-[2px_3px_0_var(--ink)]' : 'border-transparent bg-white/50',
              )}
            >
              <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                {lit ? (
                  <motion.span initial={reduce ? false : { scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                    <Coin size={26} />
                  </motion.span>
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-dashed border-[var(--ink-soft)]" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-black leading-tight">{b.label}</span>
                <span className="block text-[12px] font-bold leading-tight text-[var(--ink-soft)]">コイン{i + 1}枚</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 働き方：札 ───────── */

function WorkStep({ input, set, mode }: { input: FamilyInput; set: Setter; mode: Mode }) {
  return (
    <div>
      <TagGroup<WorkStyle>
        ariaLabel="働き方"
        value={input.work}
        onChange={(v) => set((p) => ({ ...p, work: v }))}
        options={WORK_STYLES.map((w) => ({ value: w.id, label: w.label, hint: mode === 'pick' ? undefined : w.hint }))}
      />
      {mode === 'pick' && (
        <p className="mt-3 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
          えらんでくらべるでは、街は自分でえらびます。働き方は、移住支援金の条件（パート・時短は対象外として計算）に使います。
        </p>
      )}
    </div>
  )
}

/* ───────── 期間：つまみ ───────── */

const YEARS: (1 | 5 | 18)[] = [1, 5, 18]
const YEAR_TEXT = ['1年', '5年', '18歳まで']

function YearsStep({ input, set }: { input: FamilyInput; set: Setter }) {
  const v = Math.max(0, YEARS.indexOf(input.years))
  const noKids = input.children.length === 0
  return (
    <div className="flex flex-col items-center">
      <div className="px-[64px] pb-2 pt-10">
        <Dial
          label="比べる期間"
          min={0}
          max={2}
          value={v}
          size={196}
          sweep={180}
          startAngle={-90}
          onValueChange={(i) => set((p) => ({ ...p, years: YEARS[i] }))}
          formatValue={(i) => YEAR_TEXT[i]}
          notches={[
            { value: 0, label: '1年' },
            { value: 1, label: '5年' },
            { value: 2, label: '18歳まで' },
          ]}
        />
      </div>
      <p className="mt-1 max-w-[30em] text-center text-[14px] font-bold leading-relaxed">
        {input.years === 1 && '1年ぶんの差だけを見ます。'}
        {input.years === 5 && '5年ぶんで計算して、1年あたりにならした額も出します。'}
        {input.years === 18 &&
          (noKids ? '子どもがいないので、1年ぶんで計算します。' : `いちばん下の子が18歳になるまで。この家族だと ${yearsActual(input)}年ぶんです。`)}
      </p>
    </div>
  )
}

/* ───────── 答えの札（押すと、その問いにもどれる） ───────── */

export function Summary({ input, onJump, sample, keys }: { input: FamilyInput; onJump: (k: StepKey) => void; sample?: Set<StepKey>; keys?: StepKey[] }) {
  const city = cityById(input.fromCityId)
  const rows: { k: StepKey; label: string; value: string }[] = [
    { k: 'family', label: '家族', value: familySummary(input) },
    { k: 'income', label: '年収', value: INCOME_BANDS.find((b) => b.id === input.income)?.label ?? '' },
    { k: 'work', label: '働き方', value: WORK_STYLES.find((w) => w.id === input.work)?.label ?? '' },
    { k: 'city', label: '今の街', value: city ? `${city.pref} ${city.name}` : '' },
    { k: 'years', label: '期間', value: input.years === 18 ? `下の子が18歳まで（${yearsActual(input)}年）` : `${input.years}年` },
  ]
  return (
    <ul className="flex flex-wrap gap-1.5">
      {rows
        .filter((r) => !keys || keys.includes(r.k))
        .map((r) => {
          const isSample = sample?.has(r.k)
          return (
            <li key={r.k}>
              <button
                type="button"
                onClick={() => onJump(r.k)}
                aria-label={`${r.label}：${r.value}${isSample ? '（入力例のまま）' : ''}。押すとなおせます`}
                className={cn(
                  'min-h-[36px] rounded-full border-2 bg-[var(--paper)] px-2.5 py-1 text-left text-[12.5px] font-bold leading-tight',
                  isSample ? 'border-dashed border-[var(--red-text)]' : 'border-[var(--ink)]',
                )}
              >
                <span className="text-[var(--ink-soft)]">{r.label}</span> {r.value}
                {isSample && <span className="ml-1 rounded-[4px] bg-[var(--red-text)] px-1 text-[12px] font-black text-white">入力例</span>}
              </button>
            </li>
          )
        })}
    </ul>
  )
}

export function StepBody({ step, input, set, onCoin, mode }: { step: StepKey; input: FamilyInput; set: Setter; onCoin: () => void; mode: Mode }): ReactNode {
  if (step === 'family') return <FamilyStep input={input} set={set} />
  if (step === 'income') return <IncomeStep input={input} set={set} onCoin={onCoin} />
  if (step === 'work') return <WorkStep input={input} set={set} mode={mode} />
  if (step === 'city') return <NowCityPicker value={input.fromCityId} onChange={(id) => set((p) => ({ ...p, fromCityId: id }))} />
  if (step === 'years') return <YearsStep input={input} set={set} />
  return null
}
