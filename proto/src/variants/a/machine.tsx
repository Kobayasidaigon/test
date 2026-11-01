// 案A「カプセルトイ」 — 筐体の部品（看板・カプセルの詰まった窓・取り出し口）。絵はすべて自前のSVG。
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CITY_LOOK, seeded } from './lib'

const PALETTE = Object.values(CITY_LOOK).map((l) => l.capsule)

/* 看板（電飾つき） */
export function Marquee({ size = 'big', className }: { size?: 'big' | 'small'; className?: string }) {
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
function pile(width: number, height: number, seed: string) {
  const r = seeded(seed)
  const out: { x: number; y: number; s: number; rot: number; color: string }[] = []
  const rad = 19
  let row = 0
  for (let y = height - 14 - rad; y > 26; y -= rad * 1.62) {
    const offset = row % 2 ? rad : 0
    for (let x = 22 + rad + offset; x < width - 22 - rad * 0.6; x += rad * 2.05) {
      out.push({ x: x + (r() - 0.5) * 6, y: y + (r() - 0.5) * 6, s: 0.92 + r() * 0.16, rot: (r() - 0.5) * 70, color: PALETTE[Math.floor(r() * PALETTE.length)] })
    }
    row++
  }
  return out
}

function CapsuleG({ color }: { color: string }) {
  return (
    <g>
      <path d="M-19 0 A19 19 0 0 0 19 0 Z" fill={color} stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-19 0 A19 19 0 0 1 19 0 Z" fill="rgba(255,255,255,0.8)" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-11 -7 A12 12 0 0 1 -3 -14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="-20.5" y="-2.2" width="41" height="4.4" rx="2.2" fill={color} stroke="var(--ink)" strokeWidth="2" />
    </g>
  )
}

export function Dome({ height = 150, jiggle = 0, shaking = false, className }: { height?: number; jiggle?: number; shaking?: boolean; className?: string }) {
  const W = 320
  const caps = useMemo(() => pile(W, height, `dome-${height}`), [height])
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
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn('block w-full', className)} aria-hidden overflow="visible">
      <defs>
        <clipPath id={`dome-clip-${height}`}>
          <rect x="12" y="8" width={W - 24} height={height - 16} rx="30" />
        </clipPath>
      </defs>
      <rect x="12" y="8" width={W - 24} height={height - 16} rx="30" fill="#e9f7f2" />
      <g clipPath={`url(#dome-clip-${height})`}>
        {caps.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.s})`}>
            <motion.g custom={i} animate={controls}>
              <CapsuleG color={c.color} />
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

/* 筐体の前面（コイン口・ハンドル・取り出し口）— 飾り */
export function MachineFront({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 120" className={cn('block w-full', className)} aria-hidden>
      <rect x="18" y="10" width="92" height="56" rx="12" fill="var(--metal)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="57" y="20" width="14" height="36" rx="7" fill="var(--ink)" />
      <text x="64" y="80" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="'Zen Maru Gothic', sans-serif">コイン</text>
      <circle cx="232" cy="40" r="34" fill="var(--metal)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="232" cy="40" r="25" fill="var(--yolk)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="212" y="34" width="40" height="12" rx="6" fill="var(--red)" stroke="var(--ink)" strokeWidth="3" transform="rotate(-28 232 40)" />
      <circle cx="232" cy="40" r="5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="120" y="76" width="80" height="40" rx="14" fill="#2c3240" stroke="var(--ink)" strokeWidth="3" />
      <path d="M126 92 Q160 80 194 92" fill="none" stroke="#5c6476" strokeWidth="5" strokeLinecap="round" />
      <text x="160" y="72" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="'Zen Maru Gothic', sans-serif">とりだしぐち</text>
    </svg>
  )
}
