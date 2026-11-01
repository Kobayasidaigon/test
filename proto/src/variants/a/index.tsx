// 案A「カプセルトイ」 — ガチャガチャの筐体そのものが画面。
// 家族のフィギュアを台にならべ、コインで年収を入れ、札とつまみで答えて、ハンドルを回す。
// 遊び方は2つ。おまかせ（台をえらんで回すと、計算でいちばん上の街のカプセルが出る）と、
// えらんでくらべる（行きたい街の名前をカプセルに書いて入れ、回すと順に出てきて「くらべ棚」に並ぶ）。
// 中身は @/shared の rank() / compareMany() の計算どおり（くじではない）。
// 21st から借りた部品は CREDITS.md と各ファイルの先頭に書いた。
import './theme.css'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_CITIES, CITIES, SAMPLE_INPUT, SAMPLE_INPUT_REMOTE, cityById, compareMany, rank } from '@/shared'
import type { City, Comparison, DataLevel, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, Coin, Figure, MiniMachine } from './art'
import { CompareResult } from './compare'
import { GachaShow } from './gacha'
import { GachaHandle } from './handle'
import { ALL_COUNT, FEATURED_GROUPS, LEVEL_COUNT, LEVEL_ORDER, LEVEL_TAG, isHit, isPending, lookOf, settleTies, spoken, tiesAtTop, useShortScreen, useStampBook, type TownGroup } from './lib'
import { Dome, MachineFront, Marquee, Outlet, type FrontCap, type Mix } from './machine'
import { Result, type SampleMark } from './result'
import { STEP_INFO, StepBody, Summary, stepsFor, type Mode, type StepKey } from './steps'
import { LevelLegend, PICK_MIN, TownPicker } from './towns'

type Screen = 'start' | 'input' | 'show' | 'result'
type Pool = 'featured' | 'nearby' | 'all'
const ANSWER_KEYS: StepKey[] = ['family', 'income', 'work', 'city', 'years']
const DEFAULT_PICKS = ['adachi', 'ichikawa', 'kawasaki', 'ota', '132012'] // 足立区・市川市・川崎市・大田区・八王子市

const clone = (f: FamilyInput): FamilyInput => ({ ...f, children: f.children.map((c) => ({ ...c })) })

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const step = q.get('step')
    // ?step=compare&picks=adachi,132012 … くらべる街を指定（撮影・確認用）。指定がなければ入力例の5つ
    const picks = (q.get('picks') ?? '').split(',').map((x) => x.trim()).filter((x) => x && cityById(x))
    return { step, remote: q.get('sample') === 'remote', picks: picks.length >= 2 ? picks.slice(0, 5) : DEFAULT_PICKS }
  } catch {
    return { step: null, remote: false, picks: DEFAULT_PICKS }
  }
}

const wideWork = (f: FamilyInput) => f.work === 'remote' || f.work === 'self'
const mixOf = (list: Comparison[]): Mix => {
  const m: Mix = { detailed: 0, pref: 0, basic: 0 }
  for (const c of list) m[c.to.level] = (m[c.to.level] ?? 0) + 1
  return m
}
const frontOf = (ids: string[]): FrontCap[] =>
  ids.map((id) => {
    const c = cityById(id)
    return { id: c.id, color: lookOf(c).capsule, level: c.level, name: c.name.replace(/(市|区|町|村)$/, '') }
  })

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

// くわしく調べた街の名前を「・」でつなぐ。名前の途中や「・」の前では折り返さない（「・」だけの行や「鹿児島／市」を出さない）
function CityNames({ cities }: { cities: City[] }) {
  return (
    <>
      {cities.map((c, i) => (
        <Fragment key={c.id}>
          <span className="whitespace-nowrap">
            {c.name}
            {i < cities.length - 1 ? '・' : ''}
          </span>
          {i < cities.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  )
}

// 地域の札（カプセル3つと地域の名前。count で街の数も）
function GroupTag({ g, count = false }: { g: TownGroup; count?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--paper-2)] py-px pl-0.5 pr-1.5 text-[12px] font-black leading-tight">
      <span className="flex -space-x-1.5" aria-hidden>
        {g.cities.slice(0, 3).map((c) => (
          <Capsule key={c.id} color={lookOf(c).capsule} size={14} />
        ))}
      </span>
      {g.name}
      {count && <span className="va-pop ml-0.5 text-[12.5px] text-[var(--red-text)]">{g.cities.length}</span>}
    </span>
  )
}

// スマホ：くわしく調べた街を、地域ごとに。札と名前を1つのグリッドにして、名前の書き出しをそろえる
function CityLineup() {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1.5">
      {FEATURED_GROUPS.map((g) => (
        <div key={g.key} className="contents">
          <dt>
            <GroupTag g={g} />
          </dt>
          <dd className="text-[12.5px] font-bold leading-relaxed">
            <CityNames cities={g.cities} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

// 広い画面の壁のポスター：地域の札と街の数だけを並べ、名前は開いて見る（ポスターが画面より長くならないように）
function CityLineupPoster() {
  return (
    <>
      <ul className="flex flex-wrap gap-1.5" aria-label="地域ごとの、くわしく調べた街の数">
        {FEATURED_GROUPS.map((g) => (
          <li key={g.key}>
            <GroupTag g={g} count />
          </li>
        ))}
      </ul>
      <details className="mt-1.5">
        <summary className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 text-[12.5px] font-black underline decoration-2 underline-offset-4">
          <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
          街の名前を見る
        </summary>
        <dl className="mt-1 space-y-1.5">
          {FEATURED_GROUPS.map((g) => (
            <div key={g.key}>
              <dt>
                <GroupTag g={g} />
              </dt>
              <dd className="mt-0.5 text-[12.5px] font-bold leading-relaxed">
                <CityNames cities={g.cities} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  )
}

function TownsInside({ poster = false }: { poster?: boolean }) {
  return (
    <div>
      <p className="text-[13.5px] font-bold leading-relaxed">
        全国<span className="va-pop mx-0.5 text-[17px]">{ALL_COUNT}</span>の市区町村が入っています。カプセルの見た目は、どこまで調べたかのちがいです。
      </p>
      {poster ? (
        <>
          {/* 1024〜1279px の細いポスターでは、見た目の札だけにして縦に長くしない */}
          <LevelLegend className="mt-2 xl:hidden" compact />
          <LevelLegend className="mt-2 hidden xl:block" />
        </>
      ) : (
        <LevelLegend className="mt-2" />
      )}
      <p className="mt-2 text-[12.5px] font-bold text-[var(--ink-soft)]">
        {/* 数と札の名前のあいだで折り返さない */}
        {LEVEL_ORDER.map((lv, i) => (
          <Fragment key={lv}>
            <span className="whitespace-nowrap">
              {LEVEL_TAG[lv]}
              {LEVEL_COUNT[lv].toLocaleString('ja-JP')}
            </span>
            {i < LEVEL_ORDER.length - 1 ? '・' : ''}
          </Fragment>
        ))}
      </p>
      <p className="mt-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">
        どの街も、国の全国調査（子ども医療費・待機児童・家賃）は分かります。保育料の月額の表があるのは、くわしい街の一部だけです。
      </p>
      <p className="mt-2 text-[12.5px] font-black">くわしく調べた{CITIES.length}の街</p>
      <div className="mt-1">{poster ? <CityLineupPoster /> : <CityLineup />}</div>
    </div>
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
        行きたい街が決まっているなら、「街をえらんでくらべる」。名前を書いたカプセルを入れて回すと、くらべ棚に並びます。
      </li>
    </ol>
  )
}

/* ───────── スタート ───────── */

function Start({ onStart }: { onStart: (m: Mode) => void }) {
  const [jiggle, setJiggle] = useState(0)
  return (
    <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1240px] grid-cols-1 px-2.5 lg:grid-cols-[minmax(0,1fr)_460px_minmax(0,1fr)] lg:gap-12 lg:px-8">
      {/* 壁のポスターは上にそろえ、スクロールしても上が切れないように止める */}
      <aside className="hidden lg:block">
        <div className="sticky top-10 mt-28 flex justify-end">
          <Poster title="あそびかた" tilt={-2} className="w-full max-w-[330px]">
            <HowTo />
          </Poster>
        </div>
      </aside>
      <div className="flex min-h-[100dvh] w-full flex-col pt-4 sm:pt-8">
        <div className="va-body va-on-red relative flex flex-1 flex-col rounded-t-[36px] border-[3px] border-b-0 border-[var(--ink)] px-3.5 pb-8 pt-6">
          <div className="flex justify-center">
            <Marquee />
          </div>
          <button type="button" aria-label="カプセルをゆらす" onClick={() => setJiggle((j) => j + 1)} className="mt-5 block w-full rounded-[30px]">
            <Dome height={176} jiggle={jiggle} mix={{ detailed: 2, pref: 3, basic: 5 }} />
          </button>
          <div className="va-paper mt-4 px-4 pb-4 pt-4">
            <p className="va-pop text-[21px] leading-snug">
              家族のことを入れて、
              <br />
              ハンドルを回すと…
            </p>
            <p className="mt-2 text-[15px] font-bold leading-relaxed">
              引っ越し先の候補の街が、カプセルで出てきます。中身は、子育ての制度で年にいくら違うかの説明書と、街のはんこ。
            </p>
            <button type="button" onClick={() => onStart('gacha')} className="va-push mt-4 w-full px-4 py-3 text-left">
              <span className="block text-center text-[21px] font-black leading-tight">おまかせで回す</span>
              <span className="mt-0.5 block text-center text-[12.5px] font-bold leading-snug">答えから、得になりそうな街が出てきます</span>
            </button>
            <button type="button" onClick={() => onStart('pick')} className="va-push mt-3 w-full px-4 py-3 text-left" style={{ background: 'var(--paper)' }}>
              <span className="block text-center text-[19px] font-black leading-tight">街をえらんでくらべる</span>
              <span className="mt-0.5 block text-center text-[12.5px] font-bold leading-snug">行きたい街を2〜5個えらんで、ならべます</span>
            </button>
            <ul className="mt-3.5 space-y-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">
              <li>・入力はこの端末の中だけで使います。どこにも送りません。</li>
              <li>・出てくる街は計算で決まります。くじではありません。お金もかかりません。</li>
              <li>・開けた街の名前だけ、スタンプ帳としてこの端末に残ります（家族のことは残しません）。</li>
            </ul>
          </div>
          <div className="mt-6">
            <MachineFront />
          </div>
          <div className="mt-6 rounded-[16px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-3 lg:hidden">
            <p className="mb-1.5 text-[13px] font-black">入っている街</p>
            <TownsInside />
          </div>
        </div>
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-10 mt-20 flex justify-start">
          <Poster title="入っている街" tilt={2} className="w-full max-w-[340px]">
            <TownsInside poster />
            <p className="mt-3 rounded-[12px] bg-[var(--paper-2)] px-3 py-2 text-[12.5px] font-bold leading-relaxed">数字は2026年11月1日時点の調べと、推定をふくみます。たしかめた度合いは、結果に小さな札で出ます。</p>
          </Poster>
        </div>
      </aside>
    </div>
  )
}

/* ───────── 入力の画面の部品 ───────── */

function Lamps({ steps, step, onJump }: { steps: StepKey[]; step: StepKey; onJump: (k: StepKey) => void }) {
  const cur = steps.indexOf(step)
  return (
    <ol className="flex items-start justify-between gap-0.5" aria-label="すすみぐあい">
      {steps.map((s, i) => {
        const done = i < cur
        const now = i === cur
        return (
          <li key={s} className="flex min-w-0 flex-1 flex-col items-center">
            <button
              type="button"
              onClick={() => onJump(s)}
              aria-current={now ? 'step' : undefined}
              aria-label={`${i + 1}. ${STEP_INFO[s].short}${done ? '（こたえた）' : ''}`}
              className={cn(
                "relative grid h-[22px] w-[22px] place-items-center rounded-full border-[3px] border-[var(--ink)] after:absolute after:-inset-[11px] after:content-['']",
                now ? 'bg-white' : done ? 'bg-[var(--yolk)]' : 'bg-[var(--red-deep)]',
              )}
            >
              {now && <span className="h-2 w-2 rounded-full bg-[var(--red)]" />}
            </button>
            <span className={cn('mt-1 whitespace-nowrap text-[12px] leading-none text-white', now ? 'font-black underline decoration-2 underline-offset-2' : 'font-bold')}>{STEP_INFO[s].short}</span>
          </li>
        )
      })}
    </ol>
  )
}

const POOL_INFO: Record<Pool, { name: string; where: string; body: string }> = {
  featured: { name: 'くわしい街', where: '市区町村の制度まで調べた街', body: 'var(--red)' },
  nearby: { name: '近くの街', where: '今の街から30km以内', body: 'var(--mint)' },
  all: { name: '全国', where: '全国の市区町村', body: 'var(--sky)' },
}
interface PoolStat {
  count: number
  pending: number // 確認中・準備中（まだ中身を比べられない）の数
  full: number // 確認中の項目がなく、全部わかる街の数
  caps: { color: string; level: DataLevel }[]
  mix: Mix
}
const n = (v: number) => v.toLocaleString('ja-JP')
const allPendingPool = (s?: PoolStat) => !!s && s.count > 0 && s.pending === s.count

// 台の説明：何が出てくるかを正直に（まだ比べられない街しか入っていない台は、回す前に言う）
function poolNote(p: Pool, s: PoolStat) {
  if (allPendingPool(s)) return `この台の街（${n(s.count)}個）は、この家族に関係する制度がまだ確認中。回すと、はんこと、医療費・待機児童・家賃の目安が出ます。`
  if (p === 'featured') return `${POOL_INFO[p].where}（${n(s.count)}個）から。毎年の差がいちばん大きい街が出てきます。`
  // わかる差がある街には、018サポートの差だけが分かる街もふくむので、「保育料などが分かる」とは言わない。
  // まだ比べられない街は、わかる差がなければ後ろに並ぶが、わかる差が0円近くの街（制度が一部わかる区など）はその額の所に並ぶので、「後ろ」とは言い切らない
  const known = s.count - s.pending
  return `${POOL_INFO[p].where}の${n(s.count)}個。わかる差がある街は${n(known)}個${known ? `（確認中の項目がない街は${n(s.full)}個）` : ''}。${s.pending ? `まだ比べられない${n(s.pending)}個は、0円とはせず「確認中」として並べます。` : ''}${p === 'all' ? '棚には上の30個を出します。' : ''}`
}

function PoolPicker({ pools, value, onChange, stats, compact }: { pools: Pool[]; value: Pool; onChange: (p: Pool) => void; stats: Record<Pool, PoolStat>; compact?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-black">どの台を回す？</p>
      <div role="group" aria-label="どの台を回すか" className={cn('grid gap-2', pools.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {pools.map((p) => {
          const s = stats[p]
          const on = p === value
          const empty = s.count === 0
          const onlyPending = allPendingPool(s)
          const count = empty ? '入っていません' : `${n(s.count)}個`
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              disabled={empty}
              onClick={() => onChange(p)}
              aria-label={`${POOL_INFO[p].name}の台（${count}${onlyPending ? '。まだ比べられない街だけ' : ''}。${POOL_INFO[p].where}）`}
              className={cn(
                'rounded-[14px] border-[3px] transition-colors disabled:opacity-45',
                compact ? 'flex items-center gap-1 px-1 py-1 text-left' : 'flex flex-col items-center px-1 pb-1.5 pt-2 text-center',
                on ? 'border-[var(--ink)] bg-[var(--yolk)] shadow-[2px_3px_0_var(--ink)] [--ink-soft:var(--ink)]' : 'border-[var(--ink)]/30 bg-white/60',
              )}
            >
              <MiniMachine body={POOL_INFO[p].body} caps={s.caps} size={compact ? 24 : 44} className="shrink-0" />
              <span className={cn('min-w-0', compact ? 'block' : 'contents')}>
                <span className={cn('block text-[13px] font-black leading-tight', !compact && 'mt-1')}>{POOL_INFO[p].name}</span>
                <span className="block text-[12px] font-bold leading-tight text-[var(--ink-soft)]">{count}</span>
                {onlyPending && <span className="mt-0.5 inline-block rounded-full border-2 border-dashed border-[var(--ink)] px-1 text-[12px] font-black leading-tight">確認中だけ</span>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">{poolNote(value, stats[value])}</p>
    </div>
  )
}

/* ───────── 本体 ───────── */

export default function VariantA() {
  const boot = useMemo(readUrl, [])
  const reduce = useReducedMotion()
  const bootSample = boot.remote ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT
  const [mode, setMode] = useState<Mode>(boot.step === 'compare' || boot.step === 'pick' ? 'pick' : 'gacha')
  const [screen, setScreen] = useState<Screen>(boot.step === 'result' || boot.step === 'compare' ? 'result' : boot.step === 'pick' || boot.step === 'turn' ? 'input' : 'start')
  const [step, setStep] = useState<StepKey>(boot.step === 'pick' ? 'pick' : boot.step === 'turn' ? 'turn' : 'family')
  const [input, setInput] = useState<FamilyInput>(() => clone(bootSample))
  const [touched, setTouched] = useState<Set<StepKey>>(() => new Set())
  const [pool, setPool] = useState<Pool>('featured')
  const [picks, setPicksState] = useState<string[]>(() => (boot.step === 'compare' || boot.step === 'pick' ? [...boot.picks] : []))
  // 同じ額の街は、くわしい街から・今の街に近い順に並べ直す（共有の並び＝毎年の差が大きい順は変えない）
  const [ranked, setRanked] = useState<Comparison[]>(() => (boot.step === 'result' ? settleTies(rank(bootSample)) : []))
  const [list, setList] = useState<Comparison[]>(() => (boot.step === 'compare' ? compareMany(bootSample, boot.picks) : []))
  const [sel, setSel] = useState(0)
  const [jiggle, setJiggle] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [turnKey, setTurnKey] = useState(0)
  const [live, setLive] = useState('')
  const [bootSampleResult, setBootSampleResult] = useState(boot.step === 'result' || boot.step === 'compare')
  const book = useStampBook()
  const handleRef = useRef<HTMLDivElement>(null)
  const short = useShortScreen(740)
  const veryShort = useShortScreen(700)
  const steps = stepsFor(mode)
  const idx = Math.max(0, steps.indexOf(step))

  // 入った時点で開いているカプセルは、スタンプ帳に入れる
  useEffect(() => {
    if (boot.step === 'result' && ranked[0]) book.add(ranked[0].to.id)
    if (boot.step === 'compare' && list[0]) book.add(list[0].to.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 今の街を変えたら、行きたい街のカプセルから今の街をはずす
  useEffect(() => {
    const code = cityById(input.fromCityId).code
    setPicksState((p) => (p.some((id) => cityById(id).code === code) ? p.filter((id) => cityById(id).code !== code) : p))
  }, [input.fromCityId])

  // 働き方が通勤・パートになったら、全国の台は使えない
  useEffect(() => {
    if (pool === 'all' && !wideWork(input)) setPool('featured')
  }, [input, pool])

  // 台ごとの中身（回す画面でだけ計算する）
  const pools: Pool[] = wideWork(input) ? ['featured', 'nearby', 'all'] : ['featured', 'nearby']
  const poolData = useMemo(() => {
    if (screen !== 'input' || step !== 'turn' || mode !== 'gacha') return null
    const out = {} as Record<Pool, PoolStat>
    for (const p of pools) {
      const all = settleTies(rank(input, { pool: p, limit: 2000 }))
      out[p] = {
        count: all.length,
        pending: all.filter(isPending).length,
        full: all.filter((c) => c.status === 'ok' && !isPending(c)).length,
        caps: all.slice(0, 5).map((c) => ({ color: lookOf(c.to).capsule, level: c.to.level })),
        mix: mixOf(all),
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, screen, step, mode, pools.length])
  // えらんだ台が空なら、中身のある台へ
  useEffect(() => {
    if (!poolData) return
    if (poolData[pool]?.count) return
    const next = pools.find((p) => poolData[p]?.count)
    if (next) setPool(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolData])

  const sampleKeys = new Set(ANSWER_KEYS.filter((k) => !touched.has(k)))
  const sampleMark: SampleMark = bootSampleResult ? 'all' : sampleKeys.size === ANSWER_KEYS.length ? 'all' : sampleKeys.size ? 'some' : null

  const markTouched = (k: StepKey) =>
    setTouched((t) => {
      if (t.has(k) || !ANSWER_KEYS.includes(k)) return t
      const n = new Set(t)
      n.add(k)
      return n
    })
  const set = (fn: (p: FamilyInput) => FamilyInput) => {
    setInput(fn)
    markTouched(step)
    setJiggle((j) => j + 1)
  }
  const setPicks = (fn: (p: string[]) => string[]) => {
    setPicksState(fn)
    setJiggle((j) => j + 1)
  }
  const go = (k: StepKey) => {
    setStep(k)
    window.scrollTo({ top: 0 })
  }
  const next = () => {
    markTouched(step)
    go(steps[idx + 1])
  }

  // フォーカス：問いが変わったら問いの見出しへ、回す画面ではハンドルへ、結果では見出しへ
  // （URL で直接開いたときの最初の表示では動かさない）
  const firstFocus = useRef(true)
  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false
      return
    }
    const t = window.setTimeout(() => {
      if (screen === 'input') {
        if (step === 'turn' && handleRef.current) {
          // ハンドルが下の帯に隠れる背の低い画面では、見える所まで送る（帯の高さは scroll-padding-bottom で空ける）
          handleRef.current.focus({ preventScroll: true })
          handleRef.current.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
        } else document.getElementById('va-q')?.focus({ preventScroll: true })
      }
      if (screen === 'result') document.getElementById('va-headline')?.focus({ preventScroll: true })
    }, 60)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, step])

  const announce = (c: Comparison | undefined, many?: Comparison[]) => {
    if (many) {
      setLive(`${many.length}個の街を、くらべ棚にならべました。${many.map((x) => `${x.to.name}：${isHit(x) ? '地震で被害を受けた街なので、得・損は出していません' : spoken(x).replace(/。$/, '')}`).join('。')}。`)
      return
    }
    if (!c) return
    setLive(spoken(c))
  }

  const onTurned = () => {
    if (mode === 'pick') {
      const l = compareMany(input, picks)
      if (!l.length) return
      setList(l)
      setSel(0)
      setBootSampleResult(false)
      book.add(l[0].to.id)
      announce(undefined, l)
    } else {
      // 同じ額の街を並べ直してから、棚に出す30個を切り出す（全国・近くの台）
      const full = settleTies(rank(input, { pool, limit: 2000 }))
      const r = pool === 'featured' ? full : full.slice(0, 30)
      if (!r.length) return
      setRanked(r)
      setSel(0)
      setBootSampleResult(false)
      book.add(r[0].to.id)
      announce(r[0])
    }
    if (reduce) {
      setScreen('result')
      window.scrollTo({ top: 0 })
      return
    }
    setShaking(true)
    window.setTimeout(() => {
      setShaking(false)
      setScreen('show')
    }, 380)
  }

  const resultInput = bootSampleResult ? bootSample : input
  const fromCity = cityById(input.fromCityId)
  const turnBlocked = mode === 'gacha' ? !!poolData && !poolData[pool]?.count : picks.length < PICK_MIN
  // 背の低い画面では窓を細くして、ハンドルやつまみが下の帯に隠れにくくする
  const domeHeight = step === 'family' || short ? 56 : step === 'turn' ? 104 : 92
  const domeMix: Mix = step === 'turn' && mode === 'gacha' && poolData ? poolData[pool]?.mix ?? { detailed: 1 } : mode === 'pick' ? { detailed: 2, pref: 3, basic: 5 } : { detailed: 1 }
  const front = mode === 'pick' && (step === 'pick' || step === 'turn') && picks.length ? frontOf(picks) : undefined

  const restart = () => {
    setScreen('start')
    setTurnKey((k) => k + 1)
    setStep('family')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="va">
      <p className="va-sr" aria-live="polite" aria-atomic="true">
        {live}
      </p>
      {screen === 'start' && (
        <Start
          onStart={(m) => {
            setMode(m)
            setScreen('input')
            setBootSampleResult(false)
            go('family')
          }}
        />
      )}

      {screen === 'input' && (
        <div className="va-input mx-auto grid w-full max-w-[1240px] grid-cols-1 px-2.5 lg:grid-cols-[minmax(0,1fr)_460px_minmax(0,1fr)] lg:gap-12 lg:px-8">
          <aside className="hidden lg:block">
            <div className="sticky top-10 mt-24 flex justify-end">
              <Poster title="いまの答え" tilt={-1.5} className="w-full max-w-[330px]">
                {sampleKeys.size > 0 && <p className="mb-2 text-[13px] font-black text-[var(--red-text)]">点線の札は、まだ入力例のままです</p>}
                <Summary input={input} onJump={go} sample={sampleKeys} />
                {mode === 'pick' && (
                  <div className="mt-3">
                    <p className="text-[12.5px] font-black">行きたい街（{picks.length}）</p>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {picks.map((id) => {
                        const c = cityById(id)
                        return (
                          <li key={id} className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-0.5 pl-0.5 pr-2 text-[12.5px] font-black">
                            <Capsule color={lookOf(c).capsule} level={c.level} size={18} />
                            {c.name}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">札を押すと、その問いにもどれます。入れた答えは、この端末の中だけで使います。</p>
              </Poster>
            </div>
          </aside>
          <div className="flex min-h-[100dvh] w-full flex-col pt-2.5 sm:pt-6">
            <div className="va-body va-on-red relative flex flex-1 flex-col rounded-t-[30px] border-[3px] border-b-0 border-[var(--ink)] px-3 pt-3">
              <div className="flex items-center justify-between gap-2">
                <Marquee size="small" />
                <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[12px] font-black">{mode === 'pick' ? 'えらんでくらべる' : 'おまかせ'}</span>
              </div>
              <div className="mt-3">
                <Lamps steps={steps} step={step} onJump={go} />
              </div>
              {/* iPhone SE ほどの高さでは、家族の問いの窓を省いて、台とつまみを上に寄せる */}
              {!(veryShort && step === 'family') && (
                <div className="mt-3">
                  <Dome height={domeHeight} jiggle={jiggle} shaking={shaking} mix={domeMix} front={front} />
                </div>
              )}

              <section aria-labelledby="va-q" className="va-paper relative mt-3 px-3.5 pb-5 pt-3.5 text-[var(--ink)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="va-pop rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--yolk)] px-2 py-0.5 text-[13px] leading-none">{step !== 'turn' ? `Q${idx + 1}` : 'GO'}</span>
                  <span className="text-[12px] font-black text-[var(--ink-soft)]">{step !== 'turn' ? `${idx + 1} / ${steps.length - 1}` : 'さいご'}</span>
                  {ANSWER_KEYS.includes(step) && sampleKeys.has(step) && (
                    <span className="ml-auto rotate-[3deg] rounded-[8px] border-2 border-dashed border-[var(--red-text)] px-1.5 py-0.5 text-[12px] font-black text-[var(--red-text)]">いまは入力例</span>
                  )}
                </div>
                <h1 id="va-q" tabIndex={-1} className="va-pop mt-2 text-[25px] leading-tight outline-none">
                  {STEP_INFO[step].q}
                </h1>
                <p className="mt-1.5 text-[13.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
                  {step === 'turn'
                    ? mode === 'pick'
                      ? 'ハンドルを回すと、入れた順にカプセルが出てきて、くらべ棚に並びます。'
                      : 'どの台を回すか決めて、ハンドルをぐるっと1周。押すだけでも回ります。'
                    : mode === 'pick' && step === 'work'
                      ? '移住支援金の条件に使います。'
                      : STEP_INFO[step].hint}
                  {ANSWER_KEYS.includes(step) && sampleKeys.has(step) && <>さわると、あなたの答えになります。</>}
                </p>
                <div className="mt-4">
                  {/* 退場アニメは付けない（札の layoutId と mode="wait" の組み合わせで、次の問いが出なくなることがあったため） */}
                  <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    {step === 'pick' ? (
                      <TownPicker picks={picks} setPicks={setPicks} fromId={input.fromCityId} />
                    ) : step !== 'turn' ? (
                      <StepBody step={step} input={input} set={set} onCoin={() => setJiggle((j) => j + 1)} mode={mode} />
                    ) : (
                      <div className="space-y-3.5">
                        {mode === 'gacha' && poolData && <PoolPicker pools={pools} value={pool} onChange={setPool} stats={poolData} compact={short} />}
                        {mode === 'gacha' && turnBlocked && (
                          <div className="rounded-[14px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3 py-3">
                            <p className="text-[14px] font-bold leading-relaxed">{fromCity.name}から通える範囲の台に、候補の街が入っていません。働き方をリモートや自営にするか、街をえらんでくらべてください。</p>
                            <button type="button" onClick={() => go('work')} className="va-push mt-3 px-4 py-2 text-[14px] font-black">
                              働き方をえらびなおす
                            </button>
                          </div>
                        )}
                        {mode === 'pick' && (
                          <div>
                            <p className="mb-1.5 text-[13px] font-black">入れたカプセル（この順に出てきます）</p>
                            <ol className="flex flex-wrap gap-1.5">
                              {picks.map((id, i) => {
                                const c = cityById(id)
                                return (
                                  <li key={id} className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-0.5 pl-1 pr-2.5 text-[13px] font-black">
                                    <span className="va-pop text-[12px] text-[var(--ink-soft)]">{i + 1}</span>
                                    <Capsule color={lookOf(c).capsule} level={c.level} size={20} />
                                    {c.name}
                                  </li>
                                )
                              })}
                            </ol>
                            <button type="button" onClick={() => go('pick')} className="mt-2 min-h-[36px] text-[13px] font-black underline decoration-2 underline-offset-4">
                              入れる街を変える
                            </button>
                          </div>
                        )}
                        {sampleKeys.size > 0 && (
                          <p className="rounded-[10px] border-2 border-dashed border-[var(--red-text)] px-2.5 py-1.5 text-[12.5px] font-black text-[var(--red-text)]">
                            まだ入力例のまま：{ANSWER_KEYS.filter((k) => sampleKeys.has(k)).map((k) => STEP_INFO[k].short).join('・')}（下の札でなおせます）
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>
              </section>

              {step === 'turn' && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="grid w-full max-w-[360px] grid-cols-[1fr_auto] items-center gap-2 px-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="grid h-[52px] w-[64px] place-items-center rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--metal)]">
                        <span className="h-[30px] w-[11px] rounded-full bg-[var(--ink)]" />
                      </span>
                      <span className="text-[12px] font-black text-white">コイン口（0円）</span>
                      <p className="mt-1 text-center text-[12px] font-black leading-snug text-white">ドラッグでぐるっと1周。押すだけでも回ります。</p>
                    </div>
                    <GachaHandle
                      key={turnKey}
                      size={152}
                      knobRef={handleRef}
                      disabled={turnBlocked}
                      onTurned={onTurned}
                      onNotch={() => setJiggle((j) => j + 1)}
                      label={mode === 'pick' ? 'ハンドルを回して、入れたカプセルを出す（押すだけでも回ります）' : 'ハンドルを回して、カプセルを出す（押すだけでも回ります）'}
                    />
                  </div>
                  <Outlet width={200} height={74} className="mt-4" />
                  <p className="mt-2 text-center text-[12px] font-bold text-white">出てくる街は、入れた答えから計算で決まります。くじではありません。</p>
                  <div className="va-paper mt-4 w-full px-3 pb-3 pt-2.5">
                    <p className="mb-1.5 text-[12.5px] font-black text-[var(--ink-soft)]">この答えで回します。札を押すと、なおせます。</p>
                    <Summary input={input} onJump={go} sample={sampleKeys} />
                  </div>
                </div>
              )}

              <nav aria-label="すすむ・もどる" className="va-body sticky bottom-0 z-20 -mx-3 mt-auto flex items-center justify-between gap-3 border-t-[3px] border-[var(--ink)] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={() => (idx === 0 ? setScreen('start') : go(steps[idx - 1]))}
                  className="va-ghost inline-flex min-h-[44px] items-center gap-1 px-4 py-2.5 text-[15px] font-black text-white"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden />
                  もどる
                </button>
                {step === 'turn' ? (
                  <span className="text-[13px] font-black text-white">{turnBlocked ? '答えをなおしてね' : 'ハンドルを回してね'}</span>
                ) : step === 'pick' ? (
                  <button type="button" disabled={picks.length < PICK_MIN} onClick={next} className="va-push inline-flex min-h-[44px] items-center gap-1.5 px-5 py-2.5 text-[16px] font-black">
                    {picks.length < PICK_MIN ? `あと${PICK_MIN - picks.length}個えらぶ` : '筐体に入れる'}
                    <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden />
                  </button>
                ) : (
                  <button type="button" onClick={next} className="va-push inline-flex min-h-[44px] items-center gap-1.5 px-6 py-2.5 text-[17px] font-black">
                    {steps[idx + 1] === 'turn' ? 'ハンドルへ' : 'つぎへ'}
                    <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden />
                  </button>
                )}
              </nav>
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-10 mt-40 flex justify-start">
              <Poster title={step === 'pick' || step === 'city' ? 'カプセルの見た目' : 'カプセルの中身'} tilt={1.5} className="w-full max-w-[330px]">
                {step === 'pick' || step === 'city' ? (
                  <>
                    <LevelLegend />
                    <p className="mt-3 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">見た目は、どこまで調べたかのちがいです。得か損かとは関係ありません。全国{ALL_CITIES.length.toLocaleString('ja-JP')}の市区町村が入っています。</p>
                  </>
                ) : (
                  <ul className="space-y-2 text-[14px] font-bold leading-snug">
                    {[
                      ['ご当地はんこ', '出てきた街のはんこ。スタンプ帳にたまります'],
                      ['年にいくら違うか', '子育ての制度の差を、月・1日にも言いかえます'],
                      ['項目ごとの説明書', '保育料・給付・給食・医療費を分けて'],
                      ['家賃の目安', '暮らしのお金として、別の札で'],
                      ['待機児童の目安', '保育園の空きぐあいの手がかり。お金の差とは別'],
                      ['一度きりのお金', '移住支援金などは、別の枠で'],
                      ['おまけ', 'その街の名物のキーホルダー'],
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
                )}
              </Poster>
            </div>
          </aside>
        </div>
      )}

      {screen === 'show' && (mode === 'pick' ? list.length > 0 : ranked.length > 0) && (
        <GachaShow
          list={mode === 'pick' ? list : [ranked[0]]}
          many={mode === 'pick'}
          note={mode === 'gacha' && tiesAtTop(ranked) > 1 ? `同じ額の街が${tiesAtTop(ranked)}個。まずは${ranked[0].to.name}から` : undefined}
          onDone={() => {
            setScreen('result')
            window.scrollTo({ top: 0 })
          }}
        />
      )}

      {screen === 'result' && mode === 'gacha' && ranked[sel] && (
        <Result
          input={resultInput}
          ranked={ranked}
          sel={sel}
          onSelect={(i) => {
            setSel(i)
            book.add(ranked[i].to.id)
            announce(ranked[i])
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
            window.setTimeout(() => document.getElementById('va-headline')?.focus({ preventScroll: true }), 40)
          }}
          onRetry={() => {
            setScreen('input')
            setTurnKey((k) => k + 1)
            go('turn')
          }}
          onGoPick={() => {
            // 準備中の街しか出なかったとき：同じ答えのまま、えらんでくらべるへ
            setMode('pick')
            setScreen('input')
            setTurnKey((k) => k + 1)
            go('pick')
          }}
          onRestart={restart}
          sample={sampleMark}
          book={book.ids}
          onClearBook={book.clear}
        />
      )}

      {screen === 'result' && mode === 'pick' && list[sel] && (
        <CompareResult
          input={resultInput}
          list={list}
          sel={sel}
          onSelect={(i) => {
            setSel(i)
            book.add(list[i].to.id)
            announce(list[i])
            const el = document.getElementById('va-headline')
            if (el) {
              el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
              window.setTimeout(() => el.focus({ preventScroll: true }), 40)
            }
          }}
          onRepick={() => {
            setScreen('input')
            setTurnKey((k) => k + 1)
            go('pick')
          }}
          onRetry={() => {
            setScreen('input')
            setTurnKey((k) => k + 1)
            go('turn')
          }}
          onRestart={restart}
          sample={sampleMark}
          book={book.ids}
          onClearBook={book.clear}
        />
      )}
    </div>
  )
}
