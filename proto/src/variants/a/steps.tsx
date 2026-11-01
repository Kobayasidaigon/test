// 案A「カプセルトイ」 — 入力（1画面1問）。筐体のパーツを触るように答える。
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { CITIES, INCOME_BANDS, WORK_STYLES } from '@/shared'
import type { Child, FamilyInput, IncomeBand, Mood, WorkStyle } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Coin, Figure, Piggy, type FigureKind } from './art'
import { Dial } from './dial'
import { Stepper } from './stepper'
import { TagGroup } from './tags'
import { childLabel, familySummary, yearsActual } from './lib'

export type StepKey = 'family' | 'income' | 'work' | 'city' | 'years' | 'turn'
export const STEPS: { key: StepKey; short: string; q: string; hint: string }[] = [
  { key: 'family', short: '家族', q: 'だれと住む？', hint: 'フィギュアを台にならべてね。子どもをタップすると、年齢を回して変えられます。' },
  { key: 'income', short: '年収', q: '世帯の年収は？', hint: 'コイン1枚で1段。家族みんなの年収（税こみ）のところまで入れてね。' },
  { key: 'work', short: '働き方', q: 'どう働いてる？', hint: '働き方で、比べる街のはんいが変わります。' },
  { key: 'city', short: '今の街', q: 'いま住んでいる街は？', hint: 'この街と比べて、年にいくら違うかを出します。' },
  { key: 'years', short: '期間', q: '何年ぶんで比べる？', hint: 'つまみを回すか、まわりの札を押してね。' },
  { key: 'turn', short: '回す', q: 'ハンドルを回そう', hint: 'ぐるっと1周まわすと、カプセルが出てきます。' },
]

type Setter = (fn: (p: FamilyInput) => FamilyInput) => void

const SHIRTS = ['#3cc8a4', '#ffc928', '#4cc3e8', '#ff9fb8', '#ff8a3d', '#8fd14f', '#ffffff']
export const figureKind = (c: Child): FigureKind => (c.age < 0 ? 'unborn' : c.age <= 2 ? 'baby' : 'child')

/* ───────── 家族の台（結果では、貯金箱もいっしょに台に乗る） ───────── */

const BASE_W: Record<FigureKind | 'piggy', number> = { adult: 50, child: 44, baby: 40, unborn: 40, piggy: 78 }

export function FamilyStand({ input, selected, onSelect, exprAdult = 'smile', exprChild = 'smile', bounce = false, piggy, room = 300 }: {
  input: FamilyInput
  selected?: string | null
  onSelect?: (id: string) => void
  exprAdult?: 'joy' | 'smile' | 'calm'
  exprChild?: 'joy' | 'smile' | 'calm'
  bounce?: boolean
  piggy?: Mood
  room?: number
}) {
  const reduce = useReducedMotion()
  const people: { id: string; kind: FigureKind; label: string; shirt: string; hair: number; child?: Child }[] = [
    ...Array.from({ length: input.adults }, (_, i) => ({ id: `adult-${i}`, kind: 'adult' as const, label: '大人', shirt: SHIRTS[i], hair: i === 0 ? 0 : 1 })),
    ...input.children.map((c, i) => ({ id: c.id, kind: figureKind(c), label: childLabel(c), shirt: SHIRTS[(i + 2) % SHIRTS.length], hair: [2, 3, 0, 1, 2][i % 5], child: c })),
  ]
  // 人数が少ないときは大きく、多いときは台にのる大きさまで小さく
  const sum = people.reduce((a, p) => a + BASE_W[p.kind] + 4, 0) + (piggy !== undefined ? BASE_W.piggy + 8 : 0)
  const k = Math.min(1.36, room / Math.max(sum, 1))
  const rowH = Math.round(BASE_W.adult * k * (100 / 60)) + 6
  return (
    <div className="relative">
      <div className="relative z-10 flex items-end justify-center gap-1 px-1" style={{ minHeight: rowH }}>
        <AnimatePresence initial={false}>
          {people.map((p, i) => {
            const isSel = p.child && p.child.id === selected
            const fig = (
              <Figure
                kind={p.kind}
                shirt={p.shirt}
                hair={p.hair}
                width={BASE_W[p.kind] * k}
                expr={p.kind === 'adult' ? exprAdult : exprChild}
                title={p.kind === 'adult' ? '大人' : p.kind === 'unborn' ? 'これから生まれる子' : `${p.label}の子`}
              />
            )
            return (
              <motion.div
                key={p.id}
                layout={!reduce}
                initial={reduce ? false : { y: -60, opacity: 0, rotate: -12 }}
                animate={bounce && !reduce ? { y: [0, -20, 0, -10, 0], opacity: 1, rotate: 0 } : { y: 0, opacity: 1, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { y: 30, opacity: 0, rotate: 20, transition: { duration: 0.25 } }}
                transition={bounce && !reduce ? { duration: 1.1, delay: 0.35 + i * 0.08, ease: 'easeOut' } : { type: 'spring', stiffness: 420, damping: 22 }}
                className="flex flex-col items-center"
              >
                {p.child && onSelect ? (
                  <button
                    type="button"
                    aria-pressed={!!isSel}
                    aria-label={`${p.kind === 'unborn' ? 'これから生まれる子' : `${p.label}の子`}をえらぶ`}
                    onClick={() => onSelect(p.child!.id)}
                    className={cn('relative rounded-[14px] px-0.5 pt-1.5 transition-colors', isSel ? 'bg-[var(--yolk)]/70' : 'hover:bg-white/60')}
                  >
                    {fig}
                    {isSel && <span aria-hidden className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-[var(--red)]" />}
                  </button>
                ) : (
                  <div className="px-0.5 pt-1.5">{fig}</div>
                )}
              </motion.div>
            )
          })}
          {piggy !== undefined && (
            <motion.div
              key="piggy"
              className="relative ml-1.5 flex flex-col items-center"
              initial={reduce ? false : { y: -30, opacity: 0 }}
              animate={piggy < 0 ? { y: 3, opacity: 1, rotate: -7 } : piggy > 0 && !reduce ? { y: [0, -14, 0, -6, 0], opacity: 1, rotate: 0 } : { y: 0, opacity: 1, rotate: 0 }}
              transition={piggy > 0 && !reduce ? { duration: 1.1, delay: 0.5, ease: 'easeOut' } : { type: 'spring', stiffness: 300, damping: 16, delay: 0.3 }}
            >
              {piggy > 0 && !reduce && (
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-0">
                  {[0, 1, 2].map((j) => (
                    <motion.span
                      key={j}
                      className="absolute -ml-[9px]"
                      initial={{ y: 0, opacity: 0 }}
                      animate={{ y: [6, -40], x: [(j - 1) * 3, (j - 1) * 16], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.9, delay: 0.7 + j * 0.2, repeat: 2, repeatDelay: 0.5 }}
                    >
                      <Coin size={18} />
                    </motion.span>
                  ))}
                </div>
              )}
              <Piggy mood={piggy} width={BASE_W.piggy * k} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 台 */}
      <div aria-hidden className="relative -mt-3 h-6 rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--yolk)]">
        <div className="absolute inset-x-[-3px] -bottom-[11px] h-3 rounded-b-[10px] border-[3px] border-t-0 border-[var(--ink)] bg-[var(--yolk-deep)]" />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-1">
        {people.map((p) => (
          <span key={p.id} className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[11px] font-black leading-tight">
            {p.label}
          </span>
        ))}
        {piggy !== undefined && <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--pink)] px-2 py-0.5 text-[11px] font-black leading-tight">貯金箱</span>}
      </div>
    </div>
  )
}

function FamilyStep({ input, set }: { input: FamilyInput; set: Setter }) {
  const reduce = useReducedMotion()
  const [selId, setSelId] = useState<string | null>(input.children[0]?.id ?? null)
  const sel = input.children.find((c) => c.id === selId) ?? input.children[input.children.length - 1] ?? null
  const seq = useRef(0)
  const addChild = () => {
    const id = `k${Date.now().toString(36)}${seq.current++}`
    set((p) => ({ ...p, children: [...p.children, { id, age: 3, nursery: false }] }))
    setSelId(id)
  }
  const removeChild = (id: string) => {
    set((p) => ({ ...p, children: p.children.filter((c) => c.id !== id) }))
    setSelId(null)
  }
  const patchChild = (id: string, patch: Partial<Child>) => set((p) => ({ ...p, children: p.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const ordinal = sel ? input.children.findIndex((c) => c.id === sel.id) + 1 : 0

  return (
    <div className="space-y-4">
      <FamilyStand input={input} selected={sel?.id} onSelect={setSelId} />
      <div className="grid grid-cols-2 gap-2 pt-1">
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
          key={sel.id}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-[16px] border-[3px] border-dashed border-[var(--ink)]/40 bg-white/60 px-2 pb-3 pt-3"
        >
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-2">
            <div className="flex justify-center">
              <Dial
                key={sel.id}
                label="年齢"
                min={-1}
                max={18}
                value={sel.age}
                size={154}
                onValueChange={(v) => patchChild(sel.id, { age: v, nursery: v <= 2 ? (sel.age <= 2 ? sel.nursery : true) : false })}
                formatValue={(v) => (v < 0 ? 'これから' : `${v}歳`)}
                endLabels={['これから', '18歳']}
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[12px] font-black text-[var(--ink-soft)]">{ordinal}人目の子</p>
              <p className="va-pop text-[22px] leading-tight text-[var(--red)]">{sel.age < 0 ? 'これから' : `${sel.age}歳`}</p>
              {sel.age <= 2 ? (
                <div className="mt-1.5">
                  <p className="mb-0.5 text-[12px] font-black leading-snug">{sel.age < 0 ? '生まれたら、保育園に通う予定？' : '保育園に通う？'}</p>
                  <TagGroup
                    ariaLabel="保育園に通うか"
                    compact
                    columns={1}
                    value={sel.nursery ? 'yes' : 'no'}
                    onChange={(v) => patchChild(sel.id, { nursery: v === 'yes' })}
                    options={[
                      { value: 'yes', label: '通う' },
                      { value: 'no', label: '通わない' },
                    ]}
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">保育園に通うかは、0〜2歳の子だけに聞きます。</p>
              )}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-bold leading-snug text-[var(--ink-soft)]">つまみはドラッグで回す。矢印キーでも動きます。</p>
            <button type="button" onClick={() => removeChild(sel.id)} className="shrink-0 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-[12px] font-bold">
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
  const dragged = useRef(false)
  const [drops, setDrops] = useState(0)
  const setIdx = (i: number) => {
    const next = Math.max(0, Math.min(INCOME_BANDS.length - 1, i))
    if (next > idx) {
      setDrops((d) => d + 1)
      onCoin()
    }
    set((p) => ({ ...p, income: INCOME_BANDS[next].id as IncomeBand }))
  }
  const full = idx >= INCOME_BANDS.length - 1
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <div ref={slotRef} className="relative grid h-[92px] w-[92px] place-items-center rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--metal)] shadow-[3px_4px_0_var(--ink)]">
          <span className="absolute top-1.5 text-[10px] font-black text-[var(--ink-soft)]">ここに入れる</span>
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
        <motion.button
          type="button"
          aria-label={full ? 'コインはもう入りません' : 'コインを1枚入れる（年収を1段上げる）'}
          disabled={full}
          drag={!full && !reduce}
          dragSnapToOrigin
          dragElastic={0.6}
          whileDrag={{ scale: 1.12, rotate: -8 }}
          onDragStart={() => {
            dragged.current = true
          }}
          onDragEnd={(_, info) => {
            const r = slotRef.current?.getBoundingClientRect()
            if (r && info.point.x >= r.left - 20 && info.point.x <= r.right + 20 && info.point.y >= r.top - 20 && info.point.y <= r.bottom + 20) setIdx(idx + 1)
            window.setTimeout(() => (dragged.current = false), 0)
          }}
          onClick={() => {
            if (dragged.current) return
            setIdx(idx + 1)
          }}
          className="mt-4 grid touch-none place-items-center rounded-full disabled:opacity-40"
        >
          <Coin size={64} />
        </motion.button>
        <span className="mt-1 text-center text-[11px] font-bold leading-tight text-[var(--ink-soft)]">
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
          className="mt-2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[12px] font-black disabled:opacity-40"
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
                <span className="block text-[11px] font-bold leading-tight text-[var(--ink-soft)]">コイン{i + 1}枚</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 働き方・今の街：札 ───────── */

function WorkStep({ input, set }: { input: FamilyInput; set: Setter }) {
  return (
    <TagGroup<WorkStyle>
      ariaLabel="働き方"
      value={input.work}
      onChange={(v) => set((p) => ({ ...p, work: v }))}
      options={WORK_STYLES.map((w) => ({ value: w.id, label: w.label, hint: w.hint }))}
    />
  )
}

function CityStep({ input, set }: { input: FamilyInput; set: Setter }) {
  return (
    <TagGroup<string>
      ariaLabel="いま住んでいる街"
      columns={3}
      compact
      value={input.fromCityId}
      onChange={(v) => set((p) => ({ ...p, fromCityId: v }))}
      options={CITIES.map((c) => ({ value: c.id, label: c.name, sub: c.pref, aria: `${c.pref}${c.name}` }))}
    />
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
        {input.years === 5 && '5年ぶんの合計も出します。'}
        {input.years === 18 &&
          (noKids ? '子どもがいないので、1年ぶんで計算します。' : `いちばん下の子が18歳になるまで。この家族だと ${yearsActual(input)}年ぶんです。`)}
      </p>
    </div>
  )
}

/* ───────── 回す前の確認 ───────── */

export function Summary({ input, onJump }: { input: FamilyInput; onJump: (k: StepKey) => void }) {
  const city = CITIES.find((c) => c.id === input.fromCityId)
  const rows: { k: StepKey; label: string; value: string }[] = [
    { k: 'family', label: '家族', value: familySummary(input) },
    { k: 'income', label: '年収', value: INCOME_BANDS.find((b) => b.id === input.income)?.label ?? '' },
    { k: 'work', label: '働き方', value: WORK_STYLES.find((w) => w.id === input.work)?.label ?? '' },
    { k: 'city', label: '今の街', value: city ? `${city.pref} ${city.name}` : '' },
    { k: 'years', label: '期間', value: input.years === 18 ? `下の子が18歳まで（${yearsActual(input)}年）` : `${input.years}年` },
  ]
  return (
    <ul className="flex flex-wrap gap-1.5">
      {rows.map((r) => (
        <li key={r.k}>
          <button
            type="button"
            onClick={() => onJump(r.k)}
            aria-label={`${r.label}：${r.value}（なおす）`}
            className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-left text-[12px] font-bold leading-tight"
          >
            <span className="text-[var(--ink-soft)]">{r.label}</span> {r.value}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function StepBody({ step, input, set, onCoin }: { step: StepKey; input: FamilyInput; set: Setter; onCoin: () => void }): ReactNode {
  if (step === 'family') return <FamilyStep input={input} set={set} />
  if (step === 'income') return <IncomeStep input={input} set={set} onCoin={onCoin} />
  if (step === 'work') return <WorkStep input={input} set={set} />
  if (step === 'city') return <CityStep input={input} set={set} />
  if (step === 'years') return <YearsStep input={input} set={set} />
  return null
}
