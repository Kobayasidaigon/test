// 案B「ドット絵の旅」— 質問（1画面1問）と、出発前の確認
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CITIES, INCOME_BANDS, WORK_STYLES, cityById, type Child, type FamilyInput, type IncomeBand, type WorkStyle } from '@/shared'
import { cn } from '@/lib/utils'
import { PixelArt, PixelG, item, membersOf, person, whoOfAge } from './pixel'
import { PixelArrow, PixelButton, PixelStepper, Tag } from './parts'
import { Choice, Road, Window } from './common'
import { FIELDS, SAY, SAY_CONFIRM, STOP_LABEL, childrenLine, cityLine, incomeLabel, sameAsSample, workOf, yearsWord, type Field } from './copy'
import { Clouds, Gate, Ground, Party, Scene, Sky, StationSign, TicketMachine, Town, toneOf, layoutParty } from './scene'
import { KID_SHIRTS, PERSON_PAL, type ItemKey } from './sprites'

const WORK_ICON: Record<WorkStyle, ItemKey> = { commute: 'train', remote: 'laptop', self: 'tools', part: 'clock' }

/* ───────── 質問の場面（入力がすぐ絵に出る） ───────── */
function AskScene({ input, field }: { input: FamilyInput; field: Field | 'confirm' }) {
  const city = cityById(input.fromCityId)
  const members = useMemo(() => membersOf(input), [input])
  const H = 80, BASE = 56
  const tone = toneOf(city)
  const confirm = field === 'confirm'
  const coins = field === 'income' ? INCOME_BANDS.findIndex((b) => b.id === input.income) + 1 : 0
  const maxW = confirm ? 66 : 76
  const { xs } = layoutParty(members, 6, maxW)
  const label = `今の街は${city.name}。${members.map((m) => m.label).join('、')}と貯金箱が道に並んでいる`
  return (
    <Scene h={H} label={label} className="vb-scene--ask">
      <Sky base={BASE} tone={tone} />
      <Clouds tone={tone} />
      <Town city={city} base={BASE} />
      <Ground base={BASE} h={H} tone={tone} />
      {confirm ? (
        <>
          <TicketMachine x={80} base={BASE + 5} />
          <Gate x={105} base={BASE + 5} />
        </>
      ) : (
        <StationSign x={84} base={BASE + 3} city={city} />
      )}
      <Party members={members} x0={6} base={H - 3} maxW={maxW} state="stand" pigMood={coins >= 4 ? 'happy' : 'plain'} coins={coins} />
      {field === 'work' && (
        <g className="vb-bob">
          <rect x={xs[0] + 1} y={H - 3 - 19 - 16} width={16} height={13} fill="#2a1e17" />
          <rect x={xs[0] + 2} y={H - 3 - 19 - 15} width={14} height={11} fill="#fffdf6" />
          <rect x={xs[0] + 6} y={H - 3 - 19 - 4} width={3} height={2} fill="#2a1e17" />
          <g transform={`translate(${xs[0] + 3} ${H - 3 - 19 - 14}) scale(0.75)`}>
            <PixelG grid={item(WORK_ICON[input.work])} />
          </g>
        </g>
      )}
    </Scene>
  )
}

/* ───────── それぞれの質問 ───────── */
function AdultsQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>, go?: boolean) => void }) {
  return (
    <div className="vb-grid2" role="group" aria-label="大人の人数">
      {([1, 2] as const).map((n) => (
        <Choice key={n} pressed={input.adults === n} onClick={() => set({ adults: n }, true)} className="vb-choice--tall">
          <span className="vb-choice__art">
            <PixelArt grid={person('adultA', 'stand')} pal={PERSON_PAL.adultA} scale={2} />
            {n === 2 && <PixelArt grid={person('adultB', 'stand')} pal={PERSON_PAL.adultB} scale={2} />}
          </span>
          <span className="vb-choice__big">{n}人</span>
        </Choice>
      ))}
    </div>
  )
}

function ChildRow({ c, i, onChange }: { c: Child; i: number; onChange: (c: Child) => void }) {
  const who = whoOfAge(c.age)
  const pal = who === 'kid' ? { ...PERSON_PAL.kid, x: KID_SHIRTS[i % KID_SHIRTS.length] } : PERSON_PAL[who]
  const small = c.age <= 2
  return (
    <motion.li className="vb-kid vb-box" layout="position" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
      <div className="vb-kid__top">
        <span className="vb-kid__art"><PixelArt grid={person(who, 'stand')} pal={pal} scale={2} /></span>
        <span className="vb-kid__no">{i + 1}人目</span>
        <PixelStepper label={`${i + 1}人目の年齢`} value={c.age} min={-1} max={18} onChange={(age) => onChange({ ...c, age, nursery: age <= 2 ? c.nursery : false })}
          format={(v) => (v < 0 ? 'これから' : `${v}歳`)} minText="「これから生まれる」より下はありません" maxText="18歳までです" />
      </div>
      {small && (
        <div className="vb-kid__nursery" role="group" aria-label={`${i + 1}人目の保育園`}>
          <span>{c.age < 0 ? '生まれたら保育園に' : '保育園に'}</span>
          <div className="vb-seg">
            <button type="button" aria-pressed={c.nursery} onClick={() => onChange({ ...c, nursery: true })}>{c.age < 0 ? '通う予定' : '通う'}</button>
            <button type="button" aria-pressed={!c.nursery} onClick={() => onChange({ ...c, nursery: false })}>通わない</button>
          </div>
        </div>
      )}
    </motion.li>
  )
}

let kidSeq = 100
function ChildrenQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>) => void }) {
  const kids = input.children
  const setCount = (n: number) => {
    if (n > kids.length) {
      const add: Child[] = Array.from({ length: n - kids.length }, () => ({ id: `k${kidSeq++}`, age: 3, nursery: false }))
      set({ children: [...kids, ...add] })
    } else set({ children: kids.slice(0, n) })
  }
  return (
    <div className="vb-kids">
      <div className="vb-row">
        <span className="vb-row__label" id="vb-kidcount">子どもの人数</span>
        <PixelStepper label="子どもの人数" value={kids.length} min={0} max={5} onChange={setCount} format={(v) => `${v}人`} minText="0人より少なくはできません" maxText="この試作では5人までです" />
      </div>
      <ul className="vb-kidlist">
        <AnimatePresence initial={false}>
          {kids.map((c, i) => (
            <ChildRow key={c.id} c={c} i={i} onChange={(nc) => set({ children: kids.map((k) => (k.id === c.id ? nc : k)) })} />
          ))}
        </AnimatePresence>
      </ul>
      {!kids.length && <p className="vb-hint">子どもがいなくても大丈夫。大人だけの家計で比べます。</p>}
    </div>
  )
}

function IncomeQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>, go?: boolean) => void }) {
  return (
    <div className="vb-list" role="group" aria-label="世帯年収">
      {INCOME_BANDS.map((b, i) => (
        <Choice key={b.id} pressed={input.income === b.id} onClick={() => set({ income: b.id as IncomeBand }, true)}>
          <span className="vb-coins" aria-hidden>
            {Array.from({ length: 5 }, (_, k) => (
              <PixelArt key={k} grid={item('coin')} scale={2} className={cn(k > i && 'is-off')} />
            ))}
          </span>
          <span className="vb-choice__text">{b.label}</span>
        </Choice>
      ))}
    </div>
  )
}

function WorkQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>, go?: boolean) => void }) {
  return (
    <div className="vb-list" role="group" aria-label="働き方">
      {WORK_STYLES.map((w) => (
        <Choice key={w.id} pressed={input.work === w.id} onClick={() => set({ work: w.id }, true)}>
          <span className="vb-choice__icon" aria-hidden><PixelArt grid={item(WORK_ICON[w.id])} scale={2} /></span>
          <span className="vb-choice__text">
            {w.label}
            <small>{w.hint}</small>
          </span>
        </Choice>
      ))}
    </div>
  )
}

function CityQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>, go?: boolean) => void }) {
  return (
    <div className="vb-signs" role="group" aria-label="今住んでいる街">
      {CITIES.map((c) => (
        <button key={c.id} type="button" className={cn('vb-sign', `vb-sign--${c.region}`)} aria-pressed={input.fromCityId === c.id} onClick={() => set({ fromCityId: c.id }, true)}>
          <PixelArrow className="vb-cursor" />
          <span className="vb-sign__name">{c.name}</span>
          <span className="vb-sign__pref">{c.pref}</span>
        </button>
      ))}
    </div>
  )
}

function YearsQ({ input, set }: { input: FamilyInput; set: (p: Partial<FamilyInput>, go?: boolean) => void }) {
  const noKids = !input.children.length
  const youngest = noKids ? 0 : Math.min(...input.children.map((c) => Math.max(c.age, 0)))
  const opts: { v: 1 | 5 | 18; big: string; sub: string; disabled?: boolean }[] = [
    { v: 1, big: '1年', sub: 'まず今年の差' },
    { v: 5, big: '5年', sub: '保育園の時期をまとめて' },
    { v: 18, big: '下の子が18歳まで', sub: noKids ? '子どもがいるときに選べます' : `あと${Math.max(1, 18 - youngest)}年ぶん`, disabled: noKids },
  ]
  return (
    <div className="vb-tickets" role="group" aria-label="比べる期間">
      {opts.map((o) => (
        <button key={o.v} type="button" className="vb-ticket" aria-pressed={input.years === o.v} disabled={o.disabled} onClick={() => set({ years: o.v }, true)}>
          <PixelArrow className="vb-cursor" />
          <span className="vb-ticket__big">{o.big}</span>
          <span className="vb-ticket__sub">{o.sub}</span>
        </button>
      ))}
    </div>
  )
}

/* ───────── 質問の画面 ───────── */
export function Ask({ input, setInput, q, setQ, reached, onBack, onFinish, touched, touch, visited }: {
  input: FamilyInput; setInput: (f: FamilyInput) => void; q: number; setQ: (i: number) => void; reached: number
  onBack: () => void; onFinish: () => void; touched: Set<Field>; touch: (f: Field) => void; visited: Set<number>
}) {
  const reduce = useReducedMotion()
  const field = FIELDS[q]
  // どの質問の文字送りが終わったか（質問が変わると自然に「まだ」に戻る）
  const [typedQ, setTypedQ] = useState<number | null>(null)
  const ready = typedQ === q || visited.has(q)
  const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 質問が変わったら（もどる・道のりで移動したときも）、選んだ直後の自動送りは取り消す
  useEffect(() => () => { if (goTimer.current) clearTimeout(goTimer.current) }, [q])

  const next = () => (q + 1 < FIELDS.length ? setQ(q + 1) : onFinish())
  const set = (p: Partial<FamilyInput>, go = false) => {
    const nextInput = { ...input, ...p }
    if (nextInput.years === 18 && !nextInput.children.length) nextInput.years = 5
    setInput(nextInput)
    touch(field)
    if (go) {
      if (goTimer.current) clearTimeout(goTimer.current)
      goTimer.current = setTimeout(next, reduce ? 0 : 260)
    }
  }
  const sample = !touched.has(field) && sameAsSample(input, field)
  let body: ReactNode = null
  if (field === 'adults') body = <AdultsQ input={input} set={set} />
  if (field === 'children') body = <ChildrenQ input={input} set={set} />
  if (field === 'income') body = <IncomeQ input={input} set={set} />
  if (field === 'work') body = <WorkQ input={input} set={set} />
  if (field === 'from') body = <CityQ input={input} set={set} />
  if (field === 'years') body = <YearsQ input={input} set={set} />

  return (
    <main className="vb-screen vb-ask">
      <div className="vb-col">
        <Road at={q} reached={reached} onJump={setQ} />
        <AskScene input={input} field={field} />
        <Window text={SAY[field]} instant={visited.has(q)} onDone={() => setTypedQ(q)} />
        <section className={cn('vb-answer', ready && 'is-ready')} aria-label={`${STOP_LABEL[field]}の答え`}>
          <h1 className="vb-sr">{q + 1}問目: {STOP_LABEL[field]}</h1>
          {sample && <p className="vb-sample"><Tag tone="sample">入力例</Tag>が入っています。変えても、そのままでもOK。</p>}
          {ready && (
            <motion.div key={field} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {body}
            </motion.div>
          )}
        </section>
        <nav className="vb-nav" aria-label="質問の移動">
          <PixelButton tone="plain" size="sm" onClick={() => (q === 0 ? onBack() : setQ(q - 1))}>
            <PixelArrow dir="left" className="vb-btn__arrow" /> もどる
          </PixelButton>
          <PixelButton tone={field === 'children' ? 'go' : 'plain'} size={field === 'children' ? 'md' : 'sm'} onClick={next}>
            {field === 'children' ? 'これでOK' : sample ? 'このまま次へ' : '次へ'} <PixelArrow className="vb-btn__arrow" />
          </PixelButton>
        </nav>
      </div>
    </main>
  )
}

/* ───────── 出発前の確認（旅の支度） ───────── */
export function Confirm({ input, touched, onEdit, onGo }: { input: FamilyInput; touched: Set<Field>; onEdit: (i: number) => void; onGo: () => void }) {
  const [ready, setReady] = useState(false)
  const w = workOf(input)
  const rows: { f: Field; v: ReactNode }[] = [
    { f: 'adults', v: `大人${input.adults}人` },
    { f: 'children', v: input.children.length ? `${input.children.length}人・${childrenLine(input)}` : 'いない' },
    { f: 'income', v: incomeLabel(input) },
    { f: 'work', v: <>{w.label}<small>{w.hint}</small></> },
    { f: 'from', v: cityLine(input.fromCityId) },
    { f: 'years', v: yearsWord(input) },
  ]
  return (
    <main className="vb-screen vb-confirm">
      <div className="vb-col">
        <Road at={FIELDS.length} reached={FIELDS.length} onJump={onEdit} />
        <AskScene input={input} field="confirm" />
        <Window text={SAY_CONFIRM} onDone={() => setReady(true)} />
        <section className="vb-sheet vb-box" aria-labelledby="vb-sheet-h">
          <h1 id="vb-sheet-h" className="vb-sheet__title">旅の支度</h1>
          <dl>
            {rows.map(({ f, v }, i) => (
              <div key={f} className="vb-sheet__row">
                <dt>{STOP_LABEL[f]}</dt>
                <dd>
                  <span className="vb-sheet__v">{v}</span>
                  {!touched.has(f) && sameAsSample(input, f) && <Tag tone="sample">入力例</Tag>}
                </dd>
                <button type="button" className="vb-link" onClick={() => onEdit(i)} aria-label={`${STOP_LABEL[f]}をなおす`}>なおす</button>
              </div>
            ))}
          </dl>
        </section>
        <div className={cn('vb-go', ready && 'is-ready')}>
          <PixelButton size="lg" block onClick={onGo} autoFocus={false}>
            <PixelArrow className="vb-btn__arrow" /> きっぷを買って出発（ガチャを回す）
          </PixelButton>
          <p className="vb-hint">結果は計算で決まります。同じ条件なら、何度回しても同じ街に着きます。</p>
        </div>
      </div>
    </main>
  )
}
