// 案D「家計レシート」 — 入力。食卓に家族を座らせ、年齢の札を立て、あとは伝票に丸をつけていく。
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { CITIES, INCOME_BANDS, WORK_STYLES } from '@/shared'
import type { Child, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { CoinStack, PeriodIcon, WorkIcon } from './art'
import { ChoiceSlip } from './choice'
import { Stepper } from './stepper'
import { ageText, periodYears } from './lib'

export type StepKey = 'family' | 'ages' | 'income' | 'work' | 'city' | 'period'

export const STEP_META: Record<StepKey, { short: string; title: string; hint: string }> = {
  family: { short: '家族', title: '食卓に、だれが座る？', hint: '空いている席をタップしても座れます。これから生まれる子も、ひとりに数えてください。' },
  ages: { short: '年齢', title: '子どもの年齢の札を立てて', hint: '0〜2歳の保育料は、保育園に通うかどうかで大きく変わります。' },
  income: { short: '年収', title: '世帯の年収は？', hint: '税込みで、働いている人の分を足して。だいたいで大丈夫です。' },
  work: { short: '働き方', title: '働き方は？', hint: '通勤するなら近くの街、リモートなら全国の街と比べます。' },
  city: { short: '今の街', title: 'いま住んでいる街は？', hint: '試作なので、選べる街はまだ9つです。' },
  period: { short: '期間', title: '何年ぶんで比べる？', hint: '長くするほど、合計の差は大きくなります。' },
}

export const stepsFor = (f: FamilyInput): StepKey[] => (f.children.length ? ['family', 'ages', 'income', 'work', 'city', 'period'] : ['family', 'income', 'work', 'city', 'period'])

let seq = 0
const newChild = (): Child => ({ id: `k${Date.now().toString(36)}${seq++}`, age: 0, nursery: true })

function Row({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[rgba(42,39,48,.18)] px-3 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold">{title}</p>
        {sub && <p className="text-[12.5px] leading-snug text-[var(--ink-2)]">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function StepFamily({ input, set }: { input: FamilyInput; set: (f: FamilyInput) => void }) {
  const setKids = (n: number) => {
    const kids = input.children.slice(0, n)
    while (kids.length < n) kids.push(newChild())
    set({ ...input, children: kids, years: !kids.length && input.years === 18 ? 5 : input.years })
  }
  return (
    <div className="vd-slip">
      <Row title="大人" sub="1〜2人">
        <Stepper label="大人の人数" width={60} value={input.adults} min={1} max={2} format={(v) => `${v}人`} onChange={(v) => set({ ...input, adults: v as 1 | 2 })} edgeText={(m) => (m ? '大人は1人から' : '大人は2人まで')} />
      </Row>
      <Row title="子ども" sub="0〜5人。生まれる予定の子も">
        <Stepper label="子どもの人数" width={60} value={input.children.length} min={0} max={5} format={(v) => `${v}人`} onChange={setKids} edgeText={(m) => (m ? '子どもは0人から' : '子どもは5人まで')} />
      </Row>
    </div>
  )
}

export const addKid = (f: FamilyInput): FamilyInput => (f.children.length >= 5 ? f : { ...f, children: [...f.children, newChild()] })

function HatToggle({ on, onChange, unborn }: { on: boolean; onChange: (v: boolean) => void; unborn: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] px-3 text-[14px] font-bold transition-colors',
        on ? 'border-[#b8860b] bg-[#fff3c9] text-[var(--ink)]' : 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink-2)]',
      )}
    >
      <svg viewBox="0 0 28 20" width={28} height={20} aria-hidden="true">
        <path d="M4 14 C4 3 24 3 24 14Z" fill={on ? '#f1c232' : 'none'} stroke={on ? '#b8860b' : 'currentColor'} strokeWidth={1.6} />
        <path d="M1.5 14.5 Q14 18.5 26.5 14.5" fill="none" stroke={on ? '#b8860b' : 'currentColor'} strokeWidth={1.8} strokeLinecap="round" />
      </svg>
      {unborn ? (on ? '生まれたら保育園へ' : '生まれても家でみる') : on ? '保育園に通う' : '保育園には通わない'}
    </button>
  )
}

export function StepAges({ input, set, active, setActive }: { input: FamilyInput; set: (f: FamilyInput) => void; active: string | null; setActive: (id: string) => void }) {
  const update = (id: string, patch: Partial<Child>) => set({ ...input, children: input.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  return (
    <ol className="vd-slip">
      {input.children.map((c, i) => (
        <li
          key={c.id}
          className={cn('border-b border-dashed border-[rgba(42,39,48,.18)] px-3 py-3 last:border-b-0', active === c.id && 'bg-[rgba(200,57,46,.05)]')}
          onFocusCapture={() => setActive(c.id)}
          onPointerDown={() => setActive(c.id)}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <p className="flex min-w-0 items-center gap-2 text-[16px] font-bold">
              <svg viewBox="0 0 30 20" width={30} height={20} aria-hidden="true" className="flex-none">
                <path d="M2 19 L4.5 2 H25.5 L28 19Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.4} strokeLinejoin="round" />
                <text x={15} y={14.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink)">
                  {i + 1}
                </text>
              </svg>
              <span className="whitespace-nowrap">{i + 1}人目</span>
            </p>
            <Stepper
              label={`${i + 1}人目の子の年齢`}
              value={c.age}
              min={-1}
              max={18}
              width={92}
              format={(v) => (v < 0 ? 'これから' : `${v}歳`)}
              valueText={(v) => ageText(v)}
              edgeText={(m) => (m ? 'これから生まれる子がいちばん下です' : '18歳までです')}
              onChange={(v) => update(c.id, { age: v })}
            />
          </div>
          {c.age <= 2 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 flex justify-end">
              <HatToggle on={c.nursery} unborn={c.age < 0} onChange={(v) => update(c.id, { nursery: v })} />
            </motion.div>
          )}
        </li>
      ))}
    </ol>
  )
}

export function StepIncome({ input, set }: { input: FamilyInput; set: (f: FamilyInput) => void }) {
  return (
    <ChoiceSlip
      label="世帯の年収"
      value={input.income}
      onChange={(v) => set({ ...input, income: v })}
      options={INCOME_BANDS.map((b, i) => ({ value: b.id, label: b.label, icon: <CoinStack n={i + 1} /> }))}
    />
  )
}

export function StepWork({ input, set }: { input: FamilyInput; set: (f: FamilyInput) => void }) {
  return (
    <ChoiceSlip
      label="働き方"
      value={input.work}
      onChange={(v) => set({ ...input, work: v })}
      options={WORK_STYLES.map((w) => ({ value: w.id, label: w.label, sub: w.hint, icon: <WorkIcon id={w.id} /> }))}
    />
  )
}

export function StepCity({ input, set }: { input: FamilyInput; set: (f: FamilyInput) => void }) {
  return (
    <ChoiceSlip
      label="いま住んでいる街"
      columns={2}
      value={input.fromCityId}
      onChange={(v) => set({ ...input, fromCityId: v })}
      options={CITIES.map((c) => ({ value: c.id, label: c.name, group: c.pref, aria: `${c.pref} ${c.name}` }))}
    />
  )
}

export function StepPeriod({ input, set }: { input: FamilyInput; set: (f: FamilyInput) => void }) {
  const kids = input.children.length > 0
  const until = kids ? Math.max(1, 18 - Math.min(...input.children.map((c) => Math.max(c.age, 0)))) : 0
  return (
    <ChoiceSlip
      label="比べる期間"
      value={input.years}
      onChange={(v) => set({ ...input, years: v })}
      options={[
        { value: 1 as const, label: '1年', sub: 'まずは来年の1年ぶん', icon: <PeriodIcon len={1} /> },
        { value: 5 as const, label: '5年', sub: '引っ越して、暮らしが落ち着くまで', icon: <PeriodIcon len={5} /> },
        {
          value: 18 as const,
          label: '下の子が18歳まで',
          sub: kids ? `あと${until}年。長いレシートになります` : '子どもがいないので選べません',
          icon: <PeriodIcon len={18} />,
          disabled: !kids,
        },
      ]}
    />
  )
}

/** 入力の途中で見える伝票の控え。タップでその質問へ戻れる。 */
export function OrderStrip({ input, steps, current, go }: { input: FamilyInput; steps: StepKey[]; current: number; go: (i: number) => void }) {
  const city = CITIES.find((c) => c.id === input.fromCityId)
  const WORK_SHORT: Record<FamilyInput['work'], string> = { commute: '通勤', remote: 'リモート', self: '自営', part: 'パート' }
  const value: Record<StepKey, string> = {
    family: `大人${input.adults}・子${input.children.length}`,
    ages: input.children.map((c) => (c.age < 0 ? 'もうすぐ' : `${c.age}`)).join('・') + (input.children.some((c) => c.age >= 0) ? '歳' : ''),
    income: (INCOME_BANDS.find((b) => b.id === input.income)?.label ?? '').replace('万円', '万'),
    work: WORK_SHORT[input.work],
    city: city?.name ?? '',
    period: input.years === 18 ? `${periodYears(input)}年` : `${input.years}年`,
  }
  return (
    <nav aria-label="入力した内容（タップで戻れます）" className="flex flex-wrap gap-1">
      {steps.map((k, i) =>
        i < current ? (
          <button
            key={k}
            type="button"
            onClick={() => go(i)}
            aria-label={`${STEP_META[k].short}: ${value[k]}（この質問にもどる）`}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-[4px] border border-dashed border-[rgba(42,39,48,.4)] bg-[var(--paper)] px-1.5 text-[11.5px] leading-tight"
          >
            <span className="text-[var(--ink-2)]">{STEP_META[k].short}</span>
            <span className="font-bold">{value[k]}</span>
          </button>
        ) : null,
      )}
    </nav>
  )
}
