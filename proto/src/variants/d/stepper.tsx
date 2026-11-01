/*
 * 案D「家計レシート」 — 人数と年齢を変えるつまみ。
 *
 * 21st の部品「Quantity Stepper」（作者: arihantcodes_1f7b8c4d / Spectrum UI）
 *   https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper
 * を、この案に合わせて作り変えた。
 * - 借りたもの: 増えると下から・減ると上から数字が転がる動き、押すとむにっと縮む手ざわり、
 *   端でそれ以上押すと横にふるえて赤くなる合図、長押しで速くなる連打、ARIA の spinbutton とキー操作。
 * - 変えたもの: 白いピルの見た目を、感熱紙の白とインクの線の札に。数字の代わりに「これから生まれる」などの
 *   言葉も出せるように format / valueText を足した。framer-motion を motion/react に。日本語の読み上げに。
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const HOLD_DELAY = 420
const HOLD_INTERVAL = 110
const HOLD_FAST_INTERVAL = 55
const HOLD_FAST_AFTER = 6
const SHAKE = [0, -4, 4, -2, 2, 0]

const roll = {
  enter: (dir: number) => ({ y: dir * 16, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir * -16, opacity: 0 }),
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export interface StepperProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  /** 読み上げる名前（例: 大人の人数） */
  label: string
  /** 画面に出す文字（例: 2人、これから生まれる） */
  format?: (v: number) => string
  /** 読み上げる文字。なければ format と同じ */
  valueText?: (v: number) => string
  /** 端に来たときに読み上げる言葉 */
  edgeText?: (atMin: boolean) => string
  width?: number
  className?: string
}

export function Stepper({ value, onChange, min, max, label, format = String, valueText, edgeText, width = 92, className }: StepperProps) {
  const reduce = useReducedMotion()
  const [dir, setDir] = useState(1)
  const [flash, setFlash] = useState(0)
  const [repeating, setRepeating] = useState(false)
  const [say, setSay] = useState('')
  const shake = useAnimationControls()
  const current = clamp(value, min, max)
  const valueRef = useRef(current)
  useEffect(() => {
    valueRef.current = current
  }, [current])

  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef(0)

  const stop = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current)
    if (repeatRef.current) clearInterval(repeatRef.current)
    delayRef.current = null
    repeatRef.current = null
    countRef.current = 0
    setRepeating(false)
  }, [])
  useEffect(() => stop, [stop])

  useEffect(() => {
    if (!flash) return
    if (!reduce) {
      shake.set({ x: 0 })
      void shake.start({ x: SHAKE, transition: { duration: 0.3, ease: 'easeInOut' } })
    }
    const t = setTimeout(() => setFlash(0), 420)
    return () => clearTimeout(t)
  }, [flash, reduce, shake])

  const text = valueText ?? format

  const stepBy = useCallback(
    (delta: number) => {
      const next = clamp(valueRef.current + delta, min, max)
      if (next === valueRef.current) {
        setFlash((n) => n + 1)
        setSay(edgeText ? edgeText(delta < 0) : delta < 0 ? 'これ以上は減らせません' : 'これ以上は増やせません')
        return false
      }
      valueRef.current = next
      setDir(delta > 0 ? 1 : -1)
      onChange(next)
      setSay(`${label} ${text(next)}`)
      return true
    },
    [min, max, onChange, label, text, edgeText],
  )

  const hold = (delta: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stop()
    if (!stepBy(delta)) return
    delayRef.current = setTimeout(() => {
      setRepeating(true)
      const tick = () => {
        if (!stepBy(delta)) return stop()
        countRef.current += 1
        if (countRef.current === HOLD_FAST_AFTER) {
          if (repeatRef.current) clearInterval(repeatRef.current)
          repeatRef.current = setInterval(tick, HOLD_FAST_INTERVAL)
        }
      }
      repeatRef.current = setInterval(tick, HOLD_INTERVAL)
    }, HOLD_DELAY)
  }

  // キーボードや読み上げソフトで押されたとき（detail が 0 の click）。pointerdown を通らないので、ここで1つ動かす
  const keyClick = (delta: number) => (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) stepBy(delta)
  }

  const onKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    let next: number
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = current + 1
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        next = current - 1
        break
      case 'PageUp':
        next = current + 5
        break
      case 'PageDown':
        next = current - 5
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
      default:
        return
    }
    e.preventDefault()
    const c = clamp(next, min, max)
    if (c === current) {
      if (e.key !== 'Home' && e.key !== 'End') {
        setFlash((n) => n + 1)
        setSay(edgeText ? edgeText(next < current) : 'これ以上は動かせません')
      }
      return
    }
    valueRef.current = c
    setDir(c > current ? 1 : -1)
    onChange(c)
  }

  const squish = reduce ? undefined : { scale: 0.86 }
  const t = reduce || flash ? { duration: 0 } : repeating ? { duration: 0.08, ease: 'easeOut' as const } : { type: 'spring' as const, stiffness: 420, damping: 30 }

  return (
    <div role="group" aria-label={label} className={cn('vd-stepper select-none', className)}>
      <motion.button
        type="button"
        aria-label={`${label}を減らす`}
        data-edge={current <= min}
        onPointerDown={hold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={keyClick(-1)}
        whileTap={squish}
      >
        <Minus size={18} strokeWidth={2.4} aria-hidden="true" />
      </motion.button>
      <motion.span
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={text(current)}
        onKeyDown={onKey}
        animate={shake}
        style={{ width }}
        className={cn('rounded-lg text-[17px] transition-colors', flash ? 'text-[var(--red-ink)]' : 'text-[var(--ink)]')}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.span key={current} className="inline-block whitespace-nowrap" custom={dir} variants={roll} initial="enter" animate="center" exit="exit" transition={t}>
            {format(current)}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <motion.button
        type="button"
        aria-label={`${label}を増やす`}
        data-edge={current >= max}
        onPointerDown={hold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={keyClick(1)}
        whileTap={squish}
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
      </motion.button>
      <span className="vd-sr" aria-live="polite">
        {say}
      </span>
    </div>
  )
}
