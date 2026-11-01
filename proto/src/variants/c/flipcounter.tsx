/**
 * 案C「街カード」— 子どもの年齢を「めくる」カウンター。
 *
 * 21st から借りた部品（詳しくは CREDITS.md）
 * - Quantity Stepper — arihantcodes（Spectrum UI）
 *   https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper
 *   借りたもの: 押しっぱなしで加速しながら進む、端まで来たら数字が小さく震える、
 *   spinbutton としてのキーボード操作（↑↓・PageUp/Down・Home/End）、ポインタ操作だけを読み上げる live region。
 *   変えたもの: 数字が縦に転がる → 日めくりのように、上の辺を軸に紙がめくれる（rotateX）。
 *   -1 を「これから（生まれる）」として出す。白いピル → 厚紙の札。文言を日本語に。
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const HOLD_DELAY = 420
const HOLD_INTERVAL = 140
const HOLD_FAST_INTERVAL = 70
const HOLD_FAST_AFTER = 6
const SHAKE = [0, -4, 4, -2, 2, 0]

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const show = (v: number) => (v < 0 ? 'これから' : String(v))
const speak = (v: number) => (v < 0 ? 'これから生まれる' : `${v}歳`)

const page = {
  enter: (d: number) => ({ rotateX: d > 0 ? -92 : 92, opacity: 0.2 }),
  center: { rotateX: 0, opacity: 1 },
  exit: (d: number) => ({ rotateX: d > 0 ? 92 : -92, opacity: 0 }),
}

export function AgeFlip({ value, onChange, label, min = -1, max = 18 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  const reduce = useReducedMotion()
  const [dir, setDir] = useState(1)
  const [flash, setFlash] = useState(0)
  const [say, setSay] = useState('')
  const shake = useAnimationControls()
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = useRef(0)

  const stop = useCallback(() => {
    if (delay.current) clearTimeout(delay.current)
    if (repeat.current) clearInterval(repeat.current)
    delay.current = null
    repeat.current = null
    count.current = 0
  }, [])
  useEffect(() => stop, [stop])

  useEffect(() => {
    if (!flash) return
    if (!reduce) { shake.set({ x: 0 }); void shake.start({ x: SHAKE, transition: { duration: 0.3 } }) }
    const id = setTimeout(() => setFlash(0), 400)
    return () => clearTimeout(id)
  }, [flash, reduce, shake])

  const stepBy = useCallback((d: number) => {
    const next = clamp(valueRef.current + d, min, max)
    if (next === valueRef.current) {
      setFlash((f) => f + 1)
      setSay(d < 0 ? 'これより下はありません' : `${max}歳までです`)
      return false
    }
    valueRef.current = next
    setDir(d > 0 ? 1 : -1)
    onChange(next)
    setSay(speak(next))
    return true
  }, [min, max, onChange])

  const hold = (d: number) => (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stop()
    if (!stepBy(d)) return
    delay.current = setTimeout(() => {
      const tick = () => {
        if (!stepBy(d)) { stop(); return }
        count.current += 1
        if (count.current === HOLD_FAST_AFTER) {
          if (repeat.current) clearInterval(repeat.current)
          repeat.current = setInterval(tick, HOLD_FAST_INTERVAL)
        }
      }
      repeat.current = setInterval(tick, HOLD_INTERVAL)
    }, HOLD_DELAY)
  }

  const onKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }
    let next: number
    if (e.key in map) next = value + map[e.key]
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    else return
    e.preventDefault()
    const c = clamp(next, min, max)
    if (c === value) { if (e.key !== 'Home' && e.key !== 'End') setFlash((f) => f + 1); return }
    valueRef.current = c
    setDir(c > value ? 1 : -1)
    onChange(c)
  }

  return (
    <div className="vc-age" role="group" aria-label={label}>
      <motion.button type="button" tabIndex={-1} aria-label="年齢を1つ下げる" className={cn('vc-age-btn', value <= min && 'is-end')}
        onPointerDown={hold(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBy(-1) } }}
        whileTap={reduce ? undefined : { scale: 0.86 }}>
        <Minus aria-hidden strokeWidth={2.6} />
      </motion.button>
      <motion.span
        role="spinbutton" tabIndex={0} aria-label={label}
        aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-valuetext={speak(value)}
        onKeyDown={onKey} animate={shake}
        className={cn('vc-age-pad', flash > 0 && 'is-flash')}
      >
        <span className="vc-age-rings" aria-hidden />
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce || flash ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }}
            className={cn('vc-age-sheet', value < 0 && 'is-soon')}
          >
            <span className="vc-age-num">{show(value)}</span>
            {value >= 0 && <span className="vc-age-unit">歳</span>}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <motion.button type="button" tabIndex={-1} aria-label="年齢を1つ上げる" className={cn('vc-age-btn', value >= max && 'is-end')}
        onPointerDown={hold(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBy(1) } }}
        whileTap={reduce ? undefined : { scale: 0.86 }}>
        <Plus aria-hidden strokeWidth={2.6} />
      </motion.button>
      <span className="sr-only" aria-live="polite">{say}</span>
    </div>
  )
}
