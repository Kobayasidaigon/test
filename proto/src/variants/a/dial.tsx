/*
 * つまみ（年齢ダイヤル・期間のつまみ）
 * 元にした部品: 21st「Kokonut UI Detent Dial」 — 作者 kokonutd（@dorianbaffier / kokonutUI, MIT License）
 *   https://21st.dev/@kokonutd/components/kokonut-detent-dial
 *   MIT License, Copyright (c) 2025 kokonutUI
 * 変えたところ:
 *   - 指で回す計算（角度の折り返し、ノッチに吸い付く力、はじくと惰性で回る、端で少し行き過ぎて戻る）、
 *     キーボード・ホイール操作、数字が1けたずつ転がる表示は、ほぼそのまま使った。
 *   - 回せる角度（sweep）と始まりの角度を変えられるようにし、「1年／5年／18歳まで」のような
 *     まわりの札（notches）を置けるようにした。札を押してもその位置まで回る。
 *   - 見た目をガチャの筐体のつまみに：卵黄色のノブ、墨色の太い線、ぼかさない影、ふちのギザギザ。
 *   - 目盛りの色を墨と赤に。テーマ用の CSS とダークモードの指定は外した。
 *   - 赤い目印はふちのギザギザの帯の中だけに収め、窓の文字（18歳まで）に重ならないようにした。
 *   - 読み上げの名前（ariaLabel）を外から渡せるようにした（例: 1人目の子の年齢）。
 */
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'motion/react'
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MAX_OVERSHOOT = 16
const DETENT_PULL = 0.65
const DEAD_ZONE = 14
const FLICK_THRESHOLD = 0.4
const VELOCITY_WINDOW_MS = 80
const COAST = 0.3
const SETTLE_SPRING = { type: 'spring', duration: 0.35, bounce: 0.25 } as const
const EASE_OUT = [0.23, 1, 0.32, 1] as const

const damp = (distance: number, max: number) => max * (1 - Math.exp(-distance / max))
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
const snap = (v: number, min: number, step: number) => Number((Math.round((v - min) / step) * step + min).toFixed(10))
function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: Math.round((cx + radius * Math.sin(rad)) * 100) / 100, y: Math.round((cy - radius * Math.cos(rad)) * 100) / 100 }
}
function pointerAngle(event: PointerEvent, rect: DOMRect) {
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  return { angle: (Math.atan2(dx, -dy) * 180) / Math.PI, distance: Math.hypot(dx, dy) }
}
function hapticTick() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(1)
}

export interface DialProps {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onValueChange: (value: number) => void
  formatValue: (value: number) => string
  size?: number
  sweep?: number
  startAngle?: number
  notches?: { value: number; label: string }[]
  endLabels?: [string, string]
  ariaLabel?: string
  className?: string
}

export function Dial({
  label,
  min,
  max,
  step = 1,
  value: valueProp,
  onValueChange,
  formatValue,
  size = 200,
  sweep = 270,
  startAngle = -135,
  notches,
  endLabels,
  ariaLabel,
  className,
}: DialProps) {
  const labelId = useId()
  const knobRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const range = max - min
  const initial = clamp(valueProp, min, max)
  const [value, setValue] = useState(initial)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [grabbing, setGrabbing] = useState(false)
  const committed = useRef(initial)
  const pointerType = useRef('mouse')
  const raw = useMotionValue(initial)
  const animation = useRef<AnimationPlaybackControls | null>(null)
  const drag = useRef<{ id: number; rect: DOMRect; lastAngle: number; samples: { t: number; v: number }[] } | null>(null)

  const rotation = useTransform(raw, (r) => {
    const degPerUnit = range === 0 ? 0 : sweep / range
    if (r < min) return startAngle - damp((min - r) * degPerUnit, MAX_OVERSHOOT)
    if (r > max) return startAngle + sweep + damp((r - max) * degPerUnit, MAX_OVERSHOOT)
    const notch = snap(r, min, step)
    const pulled = notch + (r - notch) * (1 - DETENT_PULL)
    return startAngle + (pulled - min) * degPerUnit
  })

  useMotionValueEvent(raw, 'change', (r) => {
    const next = clamp(snap(r, min, step), min, max)
    if (next === committed.current) return
    setDirection(next > committed.current ? 1 : -1)
    committed.current = next
    setValue(next)
    onValueChange(next)
    if (pointerType.current === 'touch') hapticTick()
  })

  // 親から値が変わったときは、その場所へ飛ぶだけ（途中の値を親に返さない）
  useEffect(() => {
    if (drag.current) return
    const next = clamp(valueProp, min, max)
    if (next !== committed.current) {
      animation.current?.stop()
      setDirection(next > committed.current ? 1 : -1)
      committed.current = next
      setValue(next)
      raw.jump(next)
    }
  }, [valueProp, min, max, raw])

  useEffect(() => () => animation.current?.stop(), [])

  const settleTo = (target: number) => {
    animation.current?.stop()
    animation.current = animate(raw, target, reduceMotion ? { duration: 0 } : SETTLE_SPRING)
  }
  const stepBy = (delta: number) => {
    animation.current?.stop()
    const target = clamp(snap(committed.current + delta, min, step), min, max)
    pointerType.current = 'keyboard'
    raw.jump(target)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const { angle } = pointerAngle(event, rect)
    animation.current?.stop()
    pointerType.current = event.pointerType
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, rect, lastAngle: angle, samples: [{ t: event.timeStamp, v: raw.get() }] }
    setGrabbing(true)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const { angle, distance } = pointerAngle(event, current.rect)
    if (distance < DEAD_ZONE) {
      current.lastAngle = angle
      return
    }
    let delta = angle - current.lastAngle
    if (delta > 180) delta -= 360
    else if (delta < -180) delta += 360
    current.lastAngle = angle
    const next = raw.get() + (delta / sweep) * range
    raw.set(next)
    current.samples.push({ t: event.timeStamp, v: next })
    while (current.samples.length > 2 && event.timeStamp - current.samples[0].t > VELOCITY_WINDOW_MS) current.samples.shift()
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    setGrabbing(false)
    const first = current.samples[0]
    const last = current.samples[current.samples.length - 1] ?? first
    const elapsed = (last.t - first.t) / 1000
    const paused = event.timeStamp - last.t > VELOCITY_WINDOW_MS
    const velocity = elapsed > 0 && !paused ? (last.v - first.v) / elapsed : 0
    const position = raw.get()
    const inBounds = position >= min && position <= max
    if (reduceMotion || !inBounds || Math.abs(velocity) < range * FLICK_THRESHOLD) {
      settleTo(clamp(snap(position, min, step), min, max))
      return
    }
    animation.current?.stop()
    const target = clamp(snap(position + velocity * COAST, min, step), min, max)
    animation.current = animate(raw, target, { type: 'spring', velocity, stiffness: 140, damping: 24, restDelta: 0.005 })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = Math.max(step, snap(range / 10, 0, step))
    const keySteps: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
      Home: min - committed.current,
      End: max - committed.current,
    }
    if (!(event.key in keySteps)) return
    event.preventDefault()
    stepBy(keySteps[event.key])
  }

  const wheelStep = useRef({ step, stepBy })
  wheelStep.current = { step, stepBy }
  useEffect(() => {
    const knob = knobRef.current
    if (!knob) return
    let acc = 0
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== knob) return
      e.preventDefault()
      acc += e.deltaY
      while (Math.abs(acc) >= 40) {
        const sign = Math.sign(acc)
        acc -= sign * 40
        wheelStep.current.stepBy(-sign * wheelStep.current.step)
      }
    }
    knob.addEventListener('wheel', onWheel, { passive: false })
    return () => knob.removeEventListener('wheel', onWheel)
  }, [])

  const center = size / 2
  const tickCount = Math.max(1, Math.min(Math.round(range / step), 56))
  const activeTick = Math.round(((value - min) / (range || 1)) * tickCount)
  const knobSize = size * 0.64
  const outer = size / 2 - 4
  const angleOf = (v: number) => startAngle + ((v - min) / (range || 1)) * sweep

  return (
    <div className={cn('relative select-none', className)} style={{ width: size, height: size }}>
      <svg aria-hidden="true" className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        <circle cx={center} cy={center} r={outer + 1} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="3" />
        {Array.from({ length: tickCount + 1 }, (_, i) => {
          const angle = startAngle + (i / tickCount) * sweep
          const current = i === activeTick
          const len = current ? 15 : i === 0 || i === tickCount ? 11 : 7
          const a = polar(center, center, outer - 3 - len, angle)
          const b = polar(center, center, outer - 3, angle)
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={current ? 'var(--red)' : i <= activeTick ? 'var(--ink)' : '#a9b0bb'}
              strokeWidth={current ? 4 : 2.4}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {endLabels &&
        endLabels.map((t, i) => {
          const p = polar(center, center, outer + 14, i === 0 ? startAngle - 8 : startAngle + sweep + 8)
          return (
            <span key={t} aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-bold text-[var(--ink-soft)]" style={{ left: p.x, top: p.y }}>
              {t}
            </span>
          )
        })}

      {notches?.map((n) => {
        const p = polar(center, center, outer + 26, angleOf(n.value))
        const on = n.value === value
        return (
          <button
            key={n.value}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => {
              pointerType.current = 'mouse'
              settleTo(n.value)
            }}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-[2.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-black leading-tight',
              on ? 'bg-[var(--yolk)] shadow-[0_3px_0_var(--ink)]' : 'bg-[var(--paper)]',
            )}
            style={{ left: p.x, top: p.y }}
          >
            {n.label}
          </button>
        )
      })}

      <div
        ref={knobRef}
        role="slider"
        tabIndex={0}
        aria-labelledby={ariaLabel ? undefined : labelId}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full',
          'border-[3px] border-[var(--ink)] bg-[var(--yolk)] shadow-[3px_5px_0_var(--ink)]',
          grabbing ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ width: knobSize, height: knobSize }}
      >
        <motion.div aria-hidden className="absolute inset-0" style={{ rotate: rotation }}>
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
              style={{ transform: `rotate(${i * 15}deg)` }}
            >
              <span className="absolute left-0 top-[3px] h-[7px] w-[2px] rounded-full bg-[var(--yolk-deep)]" />
            </span>
          ))}
          <span className="absolute left-1/2 top-[2px] h-[11px] w-[7px] -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--red)]" />
        </motion.div>
        <div className="pointer-events-none absolute inset-[12%] flex flex-col items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--paper)]">
          <span id={labelId} className="text-[12px] font-bold leading-none text-[var(--ink-soft)]">
            {label}
          </span>
          <RollingValue text={formatValue(value)} direction={direction} reduceMotion={Boolean(reduceMotion)} room={knobSize * 0.76 * 0.84} />
        </div>
      </div>
    </div>
  )
}

const rollVariants: Variants = {
  enter: (offset: number) => ({ opacity: 0, transform: `translateY(${offset}px)`, filter: offset === 0 ? 'blur(0px)' : 'blur(2px)' }),
  center: { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' },
  exit: (offset: number) => ({ opacity: 0, transform: `translateY(${-offset}px)`, filter: offset === 0 ? 'blur(0px)' : 'blur(2px)' }),
}

// 文字の幅（全角=1、半角=0.6）から、丸い窓に収まる字の大きさを出す
const emWidth = (t: string) => [...t].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 0.62 : 1), 0)

export function RollingValue({ text, direction, reduceMotion, room = 80, className }: { text: string; direction: 1 | -1; reduceMotion: boolean; room?: number; className?: string }) {
  const offset = reduceMotion ? 0 : direction * 12
  const chars = [...text]
  const fontSize = Math.max(12, Math.min(26, room / Math.max(emWidth(text), 1)))
  return (
    <span aria-hidden className={cn('va-pop relative mt-1 flex leading-none text-[var(--ink)]', className)} style={{ fontSize }}>
      {chars.map((char, index) => (
        <span key={`${chars.length}-${index}`} className="relative inline-flex overflow-hidden py-[2px]">
          <AnimatePresence custom={offset} initial={false} mode="popLayout">
            <motion.span key={char} custom={offset} variants={rollVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.16, ease: EASE_OUT }}>
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
