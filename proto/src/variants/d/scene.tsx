// 案D「家計レシート」 — 食卓の場面。入力では家族を座らせ、結果では名物の料理や小物がならぶ。
// 得するほど料理が増え、家族がよろこぶ。損なときは料理を減らさず、貯金箱だけがしょんぼりする。
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { City, FamilyInput, Mood } from '@/shared/types'
import { Bowl, Chair, Feast, GhostChair, Person, Piggy, PlaceCard, PrideArt, PrideFlag, ReservedCard, kindOfAge, type DishKey, type Face, type SeatKind } from './art'
import { ageCard, ageText } from './lib'

export type SceneMode = 'start' | 'family' | 'ages' | 'plain' | 'result'

const VB_W = 360
const VB_H = 222
const EDGE = 140 // テーブルの奥の辺
const FRONT = 192 // テーブルの手前の辺

interface Seat {
  id: string
  kind: SeatKind | 'ghost-adult' | 'ghost-kid'
  idx: number
  hat: boolean
  age?: number
  empty?: boolean
}

const SLOT: Record<Seat['kind'], number> = { adult: 50, teen: 46, kid: 42, baby: 40, unborn: 40, 'ghost-adult': 46, 'ghost-kid': 46 }

function seatsOf(input: FamilyInput, mode: SceneMode): Seat[] {
  if (mode === 'start') {
    return [
      { id: 's1', kind: 'adult', idx: 0, hat: false, empty: true },
      { id: 's2', kind: 'kid', idx: 0, hat: false, empty: true },
      { id: 's3', kind: 'baby', idx: 1, hat: false, empty: true },
      { id: 's4', kind: 'adult', idx: 1, hat: false, empty: true },
    ]
  }
  const adults: Seat[] = [{ id: 'a1', kind: 'adult', idx: 0, hat: false }]
  if (input.adults === 2) adults.push({ id: 'a2', kind: 'adult', idx: 1, hat: false })
  const kids: Seat[] = input.children.map((c, i) => ({ id: c.id, kind: kindOfAge(c.age), idx: i, hat: c.age <= 2 && c.nursery, age: c.age }))
  // 子どもは大人のあいだ → 左 → 右 → … の順に座る
  const order = [kids[3], kids[1], adults[0], kids[0], adults[1], kids[2], kids[4]].filter(Boolean) as Seat[]
  if (mode === 'family') {
    if (input.adults < 2) order.unshift({ id: 'ga', kind: 'ghost-adult', idx: 9, hat: false })
    if (input.children.length < 5) order.push({ id: 'gk', kind: 'ghost-kid', idx: 9, hat: false })
  }
  return order
}

function place(seats: Seat[]) {
  const widths = seats.map((s) => SLOT[s.kind])
  const total = widths.reduce((a, b) => a + b, 0)
  const scale = Math.min(1, 332 / total)
  let x = VB_W / 2 - (total * scale) / 2
  return widths.map((w) => {
    const cx = x + (w * scale) / 2
    x += w * scale
    return cx
  })
}

function facesFor(mood: Mood | undefined, mode: SceneMode): { adult: Face; kid: Face } {
  if (mode !== 'result' || mood === undefined) return { adult: 'calm', kid: 'smile' }
  if (mood >= 2) return { adult: 'joy', kid: 'joy' }
  if (mood === 1) return { adult: 'smile', kid: 'smile' }
  return { adult: 'calm', kid: 'smile' } // 損なときも、家族と子どもは穏やかなまま
}

interface Dish {
  key: string
  node: JSX.Element
  title: string
}

function dishesFor(city: City | null | undefined, mood: Mood): Dish[] {
  const pride: Dish[] = (city?.pride ?? []).map((p) => ({
    key: `p-${p.label}`,
    node: (
      <g transform="scale(1.2)">
        <PrideFlag />
        {PrideArt({ pride: p })}
      </g>
    ),
    title: `名物: ${p.label}`,
  }))
  const feast = (k: DishKey, title: string): Dish => ({
    key: k,
    node: (
      <g transform="scale(1.1)">
        <Feast k={k} />
      </g>
    ),
    title,
  })
  const left: Dish[] = []
  const right: Dish[] = []
  if (mood >= 1) left.push(feast('karaage', 'からあげ'))
  if (mood >= 2) {
    left.unshift(feast('juice', 'ジュース'))
    right.push(feast('cake', 'ケーキ'))
  }
  return [...left, ...pride, ...right]
}

export function TableScene({
  input,
  mode,
  mood = 0,
  city,
  activeChild,
  onAddAdult,
  onAddKid,
  onPickChild,
  label,
}: {
  input: FamilyInput
  mode: SceneMode
  mood?: Mood
  city?: City | null
  activeChild?: string | null
  onAddAdult?: () => void
  onAddKid?: () => void
  onPickChild?: (id: string) => void
  label?: string
}) {
  const reduce = useReducedMotion()
  const seats = seatsOf(input, mode)
  const xs = place(seats)
  const faces = facesFor(mood, mode)
  const dishes = mode === 'result' ? dishesFor(city, mood) : []
  const dx = (i: number, n: number) => Math.min(290, Math.max(34, 160 + (i - (n - 1) / 2) * 64))
  const spring = { type: 'spring' as const, stiffness: 260, damping: 22 }
  const summary =
    label ??
    (mode === 'start'
      ? '「ご家族さま 予約席」の札が立った食卓。いすが空いて、貯金箱が待っています。'
      : `食卓に大人${input.adults}人${input.children.length ? `と子ども${input.children.length}人（${input.children.map((c) => ageText(c.age)).join('、')}）` : ''}が座っています。`)

  return (
    <div className="vd-scene relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" role="img" aria-label={summary}>
        <defs>
          <radialGradient id="vd-lamp-light" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffe3a6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffe3a6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 壁: 時計・窓・ランプ */}
        <g>
          <circle cx={42} cy={34} r={14} fill="var(--paper)" stroke="var(--wood-3)" strokeWidth={2.4} />
          <path d="M42 34 V25 M42 34 L48 37" stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" />
          <rect x={286} y={10} width={50} height={40} rx={3} fill="#dcecf1" stroke="var(--wood-3)" strokeWidth={2.4} />
          <path d="M311 10 V50 M286 30 H336" stroke="var(--wood-3)" strokeWidth={1.8} />
          <path d="M282 8 q8 22 2 46 L292 54 q4 -24 -2 -46Z" fill="#e9b7a0" opacity={0.9} />
          <path d="M340 8 q-8 22 -2 46 L330 54 q-4 -24 2 -46Z" fill="#e9b7a0" opacity={0.9} />
          <line x1={180} y1={0} x2={180} y2={13} stroke="#5a4636" strokeWidth={1.3} />
          <path d="M165 26 L171.5 13 L188.5 13 L195 26Z" fill="#e7b65a" />
          <ellipse cx={180} cy={26} rx={15} ry={2.4} fill="#c9902f" />
          <circle cx={180} cy={28.4} r={3.6} fill="var(--lamp)" />
        </g>

        {/* 席（いす → 人） */}
        <AnimatePresence initial={false}>
          {seats.map((s, i) => {
            const cx = xs[i]
            const ghost = s.kind === 'ghost-adult' || s.kind === 'ghost-kid'
            const kind = s.kind as SeatKind
            return (
              <motion.g
                key={s.id}
                initial={reduce ? false : { x: cx, y: 22, opacity: 0 }}
                animate={{ x: cx, y: EDGE, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: EDGE + 22, opacity: 0 }}
                transition={spring}
              >
                {ghost ? (
                  <GhostChair label={s.kind === 'ghost-adult' ? '大人' : '子ども'} />
                ) : (
                  <>
                    <Chair kind={kind} />
                    {!s.empty && kind !== 'unborn' && <Person kind={kind} idx={s.idx} face={kind === 'adult' ? faces.adult : faces.kid} hat={s.hat} />}
                  </>
                )}
              </motion.g>
            )
          })}
        </AnimatePresence>

        {/* テーブル */}
        <path d={`M10 ${EDGE} L350 ${EDGE} L360 ${FRONT} L0 ${FRONT}Z`} fill="var(--wood)" />
        <path d={`M10 ${EDGE} L350 ${EDGE}`} stroke="var(--wood-hi)" strokeWidth={2.4} />
        <g fill="none" stroke="var(--wood-2)" strokeWidth={1} opacity={0.35}>
          <path d={`M30 ${EDGE + 14} q60 -4 120 1 t140 -2`} />
          <path d={`M14 ${EDGE + 33} q80 -5 160 1 t170 -1`} />
        </g>
        <ellipse cx={180} cy={EDGE + 22} rx={176} ry={44} fill="url(#vd-lamp-light)" />
        <rect x={0} y={FRONT} width={VB_W} height={10} fill="var(--wood-3)" />
        <rect x={16} y={FRONT + 10} width={11} height={VB_H - FRONT - 10} fill="var(--wood-3)" />
        <rect x={VB_W - 27} y={FRONT + 10} width={11} height={VB_H - FRONT - 10} fill="var(--wood-3)" />

        {/* 茶碗と席札 */}
        {seats.map((s, i) => {
          if (s.kind === 'ghost-adult' || s.kind === 'ghost-kid' || s.empty) return null
          const kind = s.kind as SeatKind
          return (
            <motion.g key={`b-${s.id}`} initial={false} animate={{ x: xs[i], y: EDGE + 9 }} transition={spring}>
              <Bowl kind={kind} />
            </motion.g>
          )
        })}
        {(mode === 'ages' || mode === 'plain') &&
          seats.map((s, i) => {
            if (s.age === undefined) return null
            return (
              <motion.g key={`c-${s.id}`} initial={false} animate={{ x: xs[i], y: EDGE + 38 }} transition={spring}>
                <PlaceCard text={ageCard(s.age)} active={mode === 'ages' && activeChild === s.id} />
              </motion.g>
            )
          })}

        {/* 名物とごちそう */}
        {dishes.map((d, i) => (
          <motion.g
            key={d.key}
            initial={reduce ? false : { x: dx(i, dishes.length), y: FRONT - 26, opacity: 0 }}
            animate={{ x: dx(i, dishes.length), y: FRONT - 1, opacity: 1 }}
            transition={{ ...spring, delay: reduce ? 0 : 0.35 + i * 0.16 }}
          >
            <title>{d.title}</title>
            {d.node}
          </motion.g>
        ))}

        {mode === 'start' && (
          <g transform={`translate(180 ${FRONT - 7})`}>
            <ReservedCard />
          </g>
        )}

        {/* 貯金箱（家族の財布） */}
        <g transform={`translate(326 ${FRONT + 1}) scale(1.12)`}>
          <Piggy mood={mode === 'result' ? mood : 0} />
        </g>
      </svg>

      {/* さわれるところ（SVG の上に重ねたボタン） */}
      {mode === 'family' &&
        seats.map((s, i) => {
          if (s.kind !== 'ghost-adult' && s.kind !== 'ghost-kid') return null
          const adult = s.kind === 'ghost-adult'
          return (
            <button
              key={`btn-${s.id}`}
              type="button"
              onClick={adult ? onAddAdult : onAddKid}
              aria-label={adult ? '大人をもう1人座らせる' : '子どもを1人座らせる'}
              className="absolute rounded-xl"
              style={{ left: `${((xs[i] - 23) / VB_W) * 100}%`, top: `${((EDGE - 50) / VB_H) * 100}%`, width: `${(46 / VB_W) * 100}%`, height: `${(56 / VB_H) * 100}%` }}
            />
          )
        })}
      {mode === 'ages' &&
        onPickChild &&
        seats.map((s, i) => {
          if (s.age === undefined) return null
          return (
            <button
              key={`pick-${s.id}`}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => onPickChild(s.id)}
              className="absolute rounded-lg"
              style={{ left: `${((xs[i] - 17) / VB_W) * 100}%`, top: `${((EDGE + 23) / VB_H) * 100}%`, width: `${(34 / VB_W) * 100}%`, height: `${(18 / VB_H) * 100}%` }}
            />
          )
        })}
    </div>
  )
}
