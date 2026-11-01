/*
 * カプセルが開いたときの紙ふぶき
 * 元にした部品: 21st「Confetti」 — 作者 motiondotdev（Motion 公式の例）
 *   https://21st.dev/@motiondotdev/components/motion-confetti
 * 変えたところ:
 *   - 1粒ずつの動き（初速・減速・重力・ゆらぎを、前もってキーフレームに計算して motion の animate で流す）はそのまま使った。
 *   - ボタンは外し、親から fireKey を変えると1回はじける形にした。
 *   - 粒の形を「カプセルの半分」「コイン」「きらり」にし、色はこの案のパレットだけにした。
 *   - 動きを減らす設定の人には出さない。
 */
import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const COLORS = ['#ffc928', '#d93a2b', '#3cc8a4', '#4cc3e8', '#ff9fb8', '#ff8a3d']
const SHAPES = ['half', 'half', 'coin', 'spark', 'strip'] as const
type Shape = (typeof SHAPES)[number]
const FRAMES = 40

interface Particle {
  keyframes: { transform: string[]; opacity: number[] }
  duration: number
  size: number
  color: string
  shape: Shape
}

function buildKeyframes(o: { angle: number; v: number; decay: number; gravity: number; wobbleSpeed: number; wobbleOffset: number; ticks: number; tilt: number; rotation: number }) {
  const transform: string[] = []
  const opacity: number[] = []
  let v = o.v
  let x = 0
  let y = 0
  let wobble = o.wobbleOffset
  let tick = 0
  for (let i = 0; i <= FRAMES; i++) {
    const t = i / FRAMES
    if (i > 0) {
      const target = Math.round((i * o.ticks) / FRAMES)
      while (tick < target) {
        x += Math.cos(o.angle) * v
        y += Math.sin(o.angle) * v + o.gravity * 3
        v *= o.decay
        wobble += o.wobbleSpeed
        tick++
      }
    }
    const tx = i === 0 ? 0 : x + Math.cos(wobble) * 12
    const scale = t < 0.05 ? (t / 0.05) * 1.15 : t < 0.08 ? 1.15 - ((t - 0.05) / 0.03) * 0.15 : 1
    transform.push(`translate(${tx}px, ${y}px) scale(${scale}) rotateY(${o.tilt * 360 * t}deg) rotate(${o.rotation}deg)`)
    opacity.push(t <= 0.55 ? 1 : t <= 0.8 ? 1 - ((t - 0.55) / 0.25) * 0.5 : 0.5 - ((t - 0.8) / 0.2) * 0.5)
  }
  return { transform, opacity }
}

function Bit({ p }: { p: Particle }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const play = animate(ref.current, p.keyframes, { duration: p.duration, ease: 'linear' })
    return () => play.cancel()
  }, [p])
  const s = p.size
  const common = { position: 'absolute' as const, left: -s / 2, top: -s / 2, willChange: 'transform, opacity', pointerEvents: 'none' as const }
  if (p.shape === 'half')
    return <div ref={ref} style={{ ...common, width: s, height: s / 2, borderRadius: `${s}px ${s}px 0 0`, background: p.color, border: '2px solid #1f2430' }} />
  if (p.shape === 'coin')
    return <div ref={ref} style={{ ...common, width: s * 0.8, height: s * 0.8, borderRadius: '50%', background: '#ffc928', border: '2px solid #1f2430', boxShadow: 'inset 0 0 0 2px #e0a800' }} />
  if (p.shape === 'spark')
    return (
      <div ref={ref} style={{ ...common, width: s, height: s }}>
        <svg viewBox="0 0 20 20" width={s} height={s} aria-hidden>
          <path d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z" fill={p.color} stroke="#1f2430" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    )
  return <div ref={ref} style={{ ...common, width: s * 0.3, height: s * 1.6, borderRadius: 3, background: p.color }} />
}

export function CapsuleConfetti({ fireKey, count = 46 }: { fireKey: number; count?: number }) {
  const reduce = useReducedMotion()
  const [bursts, setBursts] = useState<{ id: number; particles: Particle[] }[]>([])
  useEffect(() => {
    if (!fireKey || reduce) return
    const duration = 2.2
    const ticks = Math.round(duration * 60)
    const particles: Particle[] = Array.from({ length: count }, () => {
      const spread = (110 * Math.PI) / 180
      const angle = -Math.PI / 2 + (0.5 * spread - Math.random() * spread)
      return {
        keyframes: buildKeyframes({
          angle,
          v: 13 + Math.random() * 24,
          decay: 0.91,
          gravity: 1,
          wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
          wobbleOffset: Math.random() * 10,
          ticks,
          tilt: 1 + Math.random() * 3,
          rotation: Math.random() * 360,
        }),
        duration,
        size: 10 + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      }
    })
    setBursts((b) => [...b, { id: fireKey, particles }])
    const t = window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== fireKey)), (duration + 0.4) * 1000)
    return () => window.clearTimeout(t)
  }, [fireKey, reduce, count])
  if (reduce) return null
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" style={{ perspective: 600 }}>
      {bursts.map((b) => (
        <div key={b.id}>
          {b.particles.map((p, i) => (
            <Bit key={i} p={p} />
          ))}
        </div>
      ))}
    </div>
  )
}
