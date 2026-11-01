// 案A「カプセルトイ」 — 家族のフィギュアの台。
// 入力では、＋／−でフィギュアが台に落ちてくる（AnimatePresence initial={false}：最初からいる人は動かさない）。
// 結果では AnimatePresence を使わない。initial={false} の中では、あとから足した動き（はねる・コイン）まで止まってしまうため。
// 代わりに useAnimationControls で、画面に入ったときと、台を押したときに動かす。
import { AnimatePresence, motion, useAnimationControls, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Child, FamilyInput, Mood } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Coin, Figure, Piggy, type FigureKind } from './art'
import { childLabel } from './lib'

const SHIRTS = ['#3cc8a4', '#ffc928', '#4cc3e8', '#ff9fb8', '#ff8a3d', '#8fd14f', '#ffffff']
export const figureKind = (c: Child): FigureKind => (c.age < 0 ? 'unborn' : c.age <= 2 ? 'baby' : 'child')
const BASE_W: Record<FigureKind | 'piggy', number> = { adult: 50, child: 44, baby: 40, unborn: 40, piggy: 78 }

function people(input: FamilyInput) {
  return [
    ...Array.from({ length: input.adults }, (_, i) => ({ id: `adult-${i}`, kind: 'adult' as FigureKind, label: '大人', shirt: SHIRTS[i], hair: i === 0 ? 0 : 1, child: undefined as Child | undefined })),
    ...input.children.map((c, i) => ({ id: c.id, kind: figureKind(c), label: childLabel(c), shirt: SHIRTS[(i + 2) % SHIRTS.length], hair: [2, 3, 0, 1, 2][i % 5], child: c as Child | undefined })),
  ]
}

function Stand() {
  return (
    <div aria-hidden className="relative -mt-3 h-6 rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--yolk)]">
      <div className="absolute inset-x-[-3px] -bottom-[11px] h-3 rounded-b-[10px] border-[3px] border-t-0 border-[var(--ink)] bg-[var(--yolk-deep)]" />
    </div>
  )
}

/* ───────── 入力の台（子どもを押すと、その子をえらぶ） ───────── */

export function FamilyStand({ input, selected, onSelect, room = 300 }: { input: FamilyInput; selected?: string | null; onSelect?: (id: string) => void; room?: number }) {
  const reduce = useReducedMotion()
  const ps = people(input)
  const sum = ps.reduce((a, p) => a + BASE_W[p.kind] + 4, 0)
  const k = Math.min(1.3, room / Math.max(sum, 1))
  const rowH = Math.round(BASE_W.adult * k * (100 / 60)) + 6
  return (
    <div className="relative">
      <div className="relative z-10 flex items-end justify-center gap-1 px-1" style={{ minHeight: rowH }}>
        <AnimatePresence initial={false}>
          {ps.map((p) => {
            const isSel = p.child && p.child.id === selected
            const fig = (
              <Figure
                kind={p.kind}
                shirt={p.shirt}
                hair={p.hair}
                width={BASE_W[p.kind] * k}
                expr="smile"
                title={p.kind === 'adult' ? '大人' : p.kind === 'unborn' ? 'これから生まれる子' : `${p.label}の子`}
              />
            )
            return (
              <motion.div
                key={p.id}
                layout={!reduce}
                initial={reduce ? false : { y: -60, opacity: 0, rotate: -12 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { y: 30, opacity: 0, rotate: 20, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
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
        </AnimatePresence>
      </div>
      <Stand />
    </div>
  )
}

/* ───────── 結果の台（家族と貯金箱） ─────────
   表情は毎年の差（mood）だけで決める。しょんぼりするのは貯金箱だけ。大人はおだやか、子どもはいつも笑顔。 */

// 台の幅に合わせてフィギュアの大きさを変える（1440px の広い列では大きく）
function useWidth(ref: RefObject<HTMLElement>, fallback: number) {
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

export function FamilyCheer({ input, mood, still = false }: { input: FamilyInput; mood: Mood; still?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const room = Math.min(460, useWidth(ref, 320) - 24)
  const inView = useInView(ref, { amount: 0.6 })
  const figs = useAnimationControls()
  const pig = useAnimationControls()
  const coins = useAnimationControls()
  const ps = people(input)
  const sum = ps.reduce((a, p) => a + BASE_W[p.kind] + 4, 0) + BASE_W.piggy + 8
  const k = Math.min(1.45, room / Math.max(sum, 1))
  const rowH = Math.round(BASE_W.adult * k * (100 / 60)) + 6
  const exprAdult = mood >= 2 ? 'joy' : mood === 1 ? 'smile' : 'calm'
  const exprChild = mood >= 1 ? 'joy' : 'smile'
  const lively = !reduce && !still && mood !== 0

  const play = () => {
    if (!lively) return
    if (mood >= 1) {
      figs.start((i: number) => ({ y: [0, -22, 0, -10, 0], rotate: [0, -4, 0, 3, 0], transition: { duration: 1, delay: 0.08 + i * 0.08, ease: 'easeOut' } }))
      pig.start({ y: [0, -14, 0, -6, 0], rotate: [0, 4, 0, -2, 0], transition: { duration: 1, delay: 0.3, ease: 'easeOut' } })
      coins.start((j: number) => ({ y: [8, -50], x: [(j - 1) * 3, (j - 1) * 20], opacity: [0, 1, 1, 0], rotate: [0, (j - 1) * 40], transition: { duration: 0.9, delay: 0.45 + j * 0.16, ease: 'easeOut', times: [0, 0.2, 0.7, 1] } }))
    } else {
      // しょんぼり：ゆっくり、ため息を2回
      pig.start({ scaleY: [1, 0.93, 1, 0.94, 1], y: [0, 3, 0, 3, 0], transition: { duration: 2.4, ease: 'easeInOut' } })
    }
  }
  useEffect(() => {
    if (inView) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  const body = (
    <>
      <div className="relative z-10 flex items-end justify-center gap-1 px-1" style={{ minHeight: rowH }}>
        {ps.map((p, i) => (
          <motion.div key={p.id} custom={i} animate={figs} className="flex flex-col items-center px-0.5 pt-1.5">
            <Figure
              kind={p.kind}
              shirt={p.shirt}
              hair={p.hair}
              width={BASE_W[p.kind] * k}
              expr={p.kind === 'adult' ? exprAdult : exprChild}
              title={p.kind === 'adult' ? '大人' : p.kind === 'unborn' ? 'これから生まれる子' : `${p.label}の子`}
            />
          </motion.div>
        ))}
        <motion.div animate={pig} className="relative ml-1.5 flex flex-col items-center" style={{ originY: 1 }}>
          {mood >= 1 && !reduce && (
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1">
              {[0, 1, 2].map((j) => (
                <motion.span key={j} custom={j} animate={coins} className="absolute -ml-[10px]" style={{ opacity: 0 }}>
                  <Coin size={20} />
                </motion.span>
              ))}
            </div>
          )}
          <Piggy mood={mood} width={BASE_W.piggy * k} />
        </motion.div>
      </div>
      <Stand />
    </>
  )

  return (
    <div ref={ref} className="relative">
      {lively ? (
        <button type="button" onClick={play} aria-label={mood >= 1 ? '家族と貯金箱を、もう一度はねさせる' : '貯金箱のため息を、もう一度見る'} className="block w-full rounded-[14px]">
          {body}
        </button>
      ) : (
        body
      )}
      <div className="mt-4 flex justify-end pr-1">
        <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--pink)] px-2 py-0.5 text-[12px] font-black leading-tight">貯金箱（家族の財布）</span>
      </div>
    </div>
  )
}
