// 案A「カプセルトイ」 — 筐体の部品（看板・カプセルの詰まった窓・取り出し口・前面）。絵はすべて自前のSVG。
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DataLevel } from '@/shared/types'
import { cn } from '@/lib/utils'
import { seeded } from './lib'

const PALETTE = ['#ffc928', '#ff8a3d', '#4cc3e8', '#3cc8a4', '#ff9fb8', '#8fd14f', '#e3a857', '#3d7be0', '#ff7aa2', '#b9c3cc', '#ff5a36', '#c7e05a', '#2f4b8f']

/* 看板（電飾つき） */
export function Marquee({ size = 'big', className, sub }: { size?: 'big' | 'small'; className?: string; sub?: string }) {
  const big = size === 'big'
  const bulbs = big ? 12 : 0
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div
        className={cn(
          'relative rounded-[16px] border-[3px] border-[var(--ink)] bg-[var(--yolk)] shadow-[0_5px_0_var(--ink)]',
          big ? 'px-7 pb-3 pt-2.5' : 'px-3 py-1',
        )}
      >
        <span className={cn('va-pop block whitespace-nowrap leading-none text-[var(--ink)]', big ? 'text-[34px]' : 'text-[17px]')}>
          住む街<span className="text-[var(--red)]">ガチャ</span>
        </span>
        {sub && <span className="mt-1 block text-center text-[12px] font-black leading-none text-[var(--ink)]">{sub}</span>}
        {big &&
          Array.from({ length: bulbs }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="va-bulb absolute h-2.5 w-2.5 rounded-full border-2 border-[var(--ink)]"
              style={{
                left: `${8 + (i % 6) * 16.8}%`,
                top: i < 6 ? -7 : undefined,
                bottom: i >= 6 ? -7 : undefined,
                background: i % 2 ? '#fff' : 'var(--red)',
                animationDelay: `${(i % 2) * 0.8}s`,
              }}
            />
          ))}
      </div>
    </div>
  )
}

/* カプセルの詰まった窓 */
export type Mix = Partial<Record<DataLevel, number>>
export interface FrontCap {
  id: string
  color: string
  level: DataLevel
  name: string
}

function pile(width: number, height: number, seed: string, mix: Mix) {
  const r = seeded(seed)
  const total = (mix.detailed ?? 0) + (mix.pref ?? 0) + (mix.basic ?? 0) || 1
  const pickLevel = (): DataLevel => {
    const v = r() * total
    if (v < (mix.detailed ?? 0)) return 'detailed'
    if (v < (mix.detailed ?? 0) + (mix.pref ?? 0)) return 'pref'
    return 'basic'
  }
  const out: { x: number; y: number; s: number; rot: number; color: string; level: DataLevel }[] = []
  const rad = 19
  let row = 0
  for (let y = height - 14 - rad; y > 26; y -= rad * 1.62) {
    const offset = row % 2 ? rad : 0
    for (let x = 22 + rad + offset; x < width - 22 - rad * 0.6; x += rad * 2.05) {
      out.push({ x: x + (r() - 0.5) * 6, y: y + (r() - 0.5) * 6, s: 0.92 + r() * 0.16, rot: (r() - 0.5) * 70, color: PALETTE[Math.floor(r() * PALETTE.length)], level: pickLevel() })
    }
    row++
  }
  return out
}

function CapsuleG({ color, level = 'detailed', r = 19 }: { color: string; level?: DataLevel; r?: number }) {
  const k = r / 19
  return (
    <g transform={k !== 1 ? `scale(${k})` : undefined}>
      <path d="M-19 0 A19 19 0 0 0 19 0 Z" fill={level === 'basic' ? 'rgba(255,255,255,0.7)' : color} stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" strokeDasharray={level === 'basic' ? '4 3.4' : undefined} />
      {level === 'pref' && <path d="M-11 3 L-6 12 M-2 3 L3 14 M7 3 L11 10" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />}
      {level === 'basic' && <path d="M-12 5 A13 13 0 0 0 12 5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />}
      <path d="M-19 0 A19 19 0 0 1 19 0 Z" fill="rgba(255,255,255,0.8)" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-11 -7 A12 12 0 0 1 -3 -14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="-20.5" y="-2.2" width="41" height="4.4" rx="2.2" fill={level === 'basic' ? '#fff' : color} stroke="var(--ink)" strokeWidth="2" />
    </g>
  )
}

// 手前に並べる「名前を書いたカプセル」の位置（窓の座標）
export const DOME_W = 320
export function frontSpots(n: number, height: number) {
  const gap = n <= 3 ? 74 : n === 4 ? 66 : 58
  return Array.from({ length: n }, (_, i) => ({ x: DOME_W / 2 + (i - (n - 1) / 2) * gap, y: height - 40 }))
}

export function NamedCapsuleG({ cap, r = 25 }: { cap: FrontCap; r?: number }) {
  const n = [...cap.name].length
  const fs = Math.min(12.5, 52 / Math.max(n, 1))
  return (
    <g>
      <CapsuleG color={cap.color} level={cap.level} r={r} />
      <rect x={-r + 3} y={-r * 0.62} width={(r - 3) * 2} height={r * 0.52} rx="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.8" transform="rotate(-6)" />
      <text x="0" y={-r * 0.24} textAnchor="middle" fontSize={fs} fontWeight={900} fill="var(--ink)" fontFamily="'Zen Maru Gothic', sans-serif" transform="rotate(-6)">
        {cap.name}
      </text>
    </g>
  )
}

export function Dome({ height = 150, jiggle = 0, shaking = false, mix = { detailed: 1 }, front, hideFront, className }: {
  height?: number
  jiggle?: number
  shaking?: boolean
  mix?: Mix
  front?: FrontCap[]
  hideFront?: boolean
  className?: string
}) {
  const W = DOME_W
  const mixKey = `${mix.detailed ?? 0}-${mix.pref ?? 0}-${mix.basic ?? 0}`
  const caps = useMemo(() => pile(W, height, `dome-${height}`, mix), [height, mixKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const controls = useAnimationControls()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce || (!jiggle && !shaking)) return
    if (shaking) {
      controls.start((i: number) => ({
        y: [0, -10 - (i % 3) * 4, 2, -6, 0],
        rotate: [0, (i % 2 ? 1 : -1) * 24, (i % 2 ? -1 : 1) * 12, 0],
        transition: { duration: 0.42, repeat: 2, delay: (i % 5) * 0.02 },
      }))
    } else {
      controls.start((i: number) => ({
        y: [0, -4 - (i % 4) * 2.5, 0],
        rotate: [0, (i % 2 ? 1 : -1) * 12, 0],
        transition: { duration: 0.36, delay: (i % 7) * 0.018 },
      }))
    }
  }, [jiggle, shaking, controls, reduce])
  const spots = front ? frontSpots(front.length, height) : []
  const clip = `dome-clip-${height}-${front?.length ?? 0}`
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn('block w-full', className)} aria-hidden overflow="visible">
      <defs>
        <clipPath id={clip}>
          <rect x="12" y="8" width={W - 24} height={height - 16} rx="30" />
        </clipPath>
      </defs>
      <rect x="12" y="8" width={W - 24} height={height - 16} rx="30" fill="#e9f7f2" />
      <g clipPath={`url(#${clip})`}>
        {caps.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.s})`} opacity={front?.length ? 0.55 : 1}>
            <motion.g custom={i} animate={controls}>
              <CapsuleG color={c.color} level={c.level} />
            </motion.g>
          </g>
        ))}
        {!hideFront &&
          front?.map((f, i) => (
            <g key={f.id} transform={`translate(${spots[i].x} ${spots[i].y})`}>
              <motion.g custom={i + 3} animate={controls}>
                <NamedCapsuleG cap={f} />
              </motion.g>
            </g>
          ))}
        <path d={`M30 ${height - 40} V44 Q30 26 52 22`} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <path d={`M${W - 34} 40 V${Math.max(60, height * 0.45)}`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      </g>
      <rect x="12" y="8" width={W - 24} height={height - 16} rx="30" fill="none" stroke="var(--ink)" strokeWidth="3.5" />
    </svg>
  )
}

/* 取り出し口（ふたつき）。children はふたの後ろ（口の中）に入る */
export function Outlet({ width = 200, height = 92, children, label = 'とりだしぐち', className }: { width?: number; height?: number; children?: ReactNode; label?: string; className?: string }) {
  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      <div className="absolute inset-0 overflow-hidden rounded-[22px] border-[3px] border-[var(--ink)] bg-[#2c3240]">
        <div className="absolute inset-x-4 top-3 h-2 rounded-full bg-[#4a5266]" />
        {children}
      </div>
      {/* ふた（上半分）。カプセルはこの後ろから転がり出る */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-4px] top-[-4px] z-20 rounded-t-[22px] rounded-b-[10px] border-[3px] border-[var(--ink)] bg-[var(--metal)]" style={{ height: height * 0.46 }}>
        <div className="absolute inset-x-5 top-2 h-2 rounded-full bg-white/80" />
        <p className="absolute inset-x-0 bottom-1 text-center text-[12px] font-black leading-none text-[var(--ink-soft)]">{label}</p>
      </div>
    </div>
  )
}

/* 筐体の前面（コイン口・ハンドル・取り出し口）。スタート画面ではハンドルを押せる */
export function MachineFront({ className, onHandle }: { className?: string; onHandle?: () => void }) {
  const reduce = useReducedMotion()
  const [poke, setPoke] = useState(0)
  const [say, setSay] = useState(false)
  useEffect(() => {
    if (!poke) return
    setSay(true)
    const t = window.setTimeout(() => setSay(false), 2200)
    return () => window.clearTimeout(t)
  }, [poke])
  return (
    <div className={cn('relative mx-auto grid w-full max-w-[340px] grid-cols-[1fr_auto] items-end gap-x-3 px-2', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-[52px] w-[64px] place-items-center rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--metal)]">
            <span className="h-[30px] w-[11px] rounded-full bg-[var(--ink)]" />
          </span>
          <span className="text-[12px] font-black leading-tight text-white">
            コイン口
            <br />
            （0円）
          </span>
        </div>
        <Outlet width={150} height={66} />
      </div>
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {say && (
            <motion.p
              role="status"
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -top-[52px] right-0 z-10 whitespace-nowrap rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 text-[13px] font-black text-[var(--ink)]"
            >
              まずは家族を入れてね
            </motion.p>
          )}
        </AnimatePresence>
        <button
          type="button"
          aria-label="ハンドル（まずは家族を入れてから回します）"
          onClick={() => {
            setPoke((p) => p + 1)
            onHandle?.()
          }}
          className="relative grid h-[104px] w-[104px] place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--metal)]"
        >
          <span className="absolute left-1/2 top-1/2 h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 translate-y-[4px] rounded-full bg-[var(--ink)]" aria-hidden />
          <motion.span
            aria-hidden
            key={poke}
            className="relative grid h-[78px] w-[78px] place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--yolk)]"
            initial={{ rotate: 0 }}
            animate={poke && !reduce ? { rotate: [0, 28, -8, 14, 0] } : { rotate: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="absolute h-[18px] w-[70px] -rotate-[28deg] rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)]" />
            <span className="relative h-[14px] w-[14px] rounded-full border-[3px] border-[var(--ink)] bg-[var(--paper)]" />
          </motion.span>
        </button>
        <span className="mt-1 text-[12px] font-black text-white">ハンドル</span>
      </div>
    </div>
  )
}
