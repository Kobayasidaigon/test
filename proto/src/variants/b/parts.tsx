/*
 * 案B「ドット絵の旅」— 21st.dev の部品を、この案の世界観に合わせて作り変えたもの。
 *
 * - PixelButton  … 「8-bit Button」theorcdev（8bitcn）https://21st.dev/@theorcdev/components/8bit-button
 *     角を欠いたドットの枠・上のハイライトと下の影・押すと沈む、という考え方を借りた。
 *     10個の div で組んでいた枠を box-shadow 4本に置き換え、色を「旅のしおり」の紙色と金色に変更。
 * - PixelGauge   … 「8-bit Progress」theorcdev（8bitcn）https://21st.dev/@theorcdev/components/8bit-progress
 *     縦横2枚の枠を少しずらして重ね、角を欠く枠の作り方と、マス目で埋まる retro 表示を借りた。
 *     真ん中から左右に伸びる「今の街 ⇔ 候補の街」の両側ゲージに作り変え、1マスずつ点く動きを追加。
 * - PixelStepper … 「Quantity Stepper」arihantcodes（Spectrum UI）https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper
 *     数字が上下に転がる、端で首を振る、長押しで連続、spinbutton のキーボード操作と読み上げはそのまま。
 *     丸い形をドットの四角に、＋−を手描きのドットに、文言を日本語に、表示を「これから／◯歳」にできるよう変更。
 * - TypeText     … 「Typewriter Text」educalvolpz（SmoothUI）https://21st.dev/@educalvolpz/components/typewriter-text
 *     1文字ずつ出す・動きを減らす設定なら全文、の考え方を借りた。句読点で少し間をあける、
 *     タップで全文、読み上げには全文を渡す、終わったら「つぎ」の三角を点滅、を追加。
 * - PixelConfetti… 「Confetti」motiondotdev https://21st.dev/@motiondotdev/components/motion-confetti
 *     速度・減衰・重力・ゆらぎからキーフレームを作る物理計算をそのまま使い、
 *     丸や細長い紙を四角いドットと金貨に、色をこの案の色に、ボタン発火を外からの合図（burst）に変更。
 */
import { forwardRef, useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/* ───────── PixelButton ───────── */
const btn = cva('vb-btn', {
  variants: {
    tone: { go: 'vb-btn--go', plain: 'vb-btn--plain', dark: 'vb-btn--dark' },
    size: { sm: 'vb-btn--sm', md: '', lg: 'vb-btn--lg' },
    block: { true: 'vb-btn--block', false: '' },
  },
  defaultVariants: { tone: 'go', size: 'md', block: false },
})
export type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(({ className, tone, size, block, type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} className={cn(btn({ tone, size, block }), className)} {...p} />
))
PixelButton.displayName = 'PixelButton'

/** ドットの三角（カーソル・つぎへ） */
export function PixelArrow({ dir = 'right', className }: { dir?: 'right' | 'down' | 'left'; className?: string }) {
  const d = dir === 'right' ? 'M0 0h1v5H0zM1 1h1v3H1zM2 2h1v1H2z' : dir === 'left' ? 'M2 0h1v5H2zM1 1h1v3H1zM0 2h1v1H0z' : 'M0 0h5v1H0zM1 1h3v1H1zM2 2h1v1H2z'
  const vb = dir === 'down' ? '0 0 5 3' : '0 0 3 5'
  return (
    <svg viewBox={vb} className={cn('vb-arrow', className)} shapeRendering="crispEdges" aria-hidden focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  )
}

/* ───────── PixelGauge（今の街 ⇔ 候補の街） ───────── */
export function PixelGauge({ value, scale, leftLabel, rightLabel, label, delay = 0, cells = 10 }: {
  value: number; scale: number; leftLabel: string; rightLabel: string; label: string; delay?: number; cells?: number
}) {
  const reduce = useReducedMotion()
  const n = Math.abs(value) < 1000 ? 0 : Math.max(1, Math.min(cells, Math.round((Math.abs(value) / scale) * cells)))
  const side = n === 0 ? 'none' : value > 0 ? 'right' : 'left'
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), reduce ? 0 : 250 + delay)
    return () => clearTimeout(t)
  }, [delay, reduce])
  const cell = (filled: boolean, order: number, kind: 'plus' | 'calm', key: string) => (
    <span key={key} className={cn('vb-cell', filled && `is-${kind}`, filled && on && 'is-on')} style={{ transitionDelay: reduce ? '0ms' : `${order * 55}ms` }} />
  )
  return (
    <div className="vb-gauge" role="img" aria-label={label}>
      <div className="vb-gauge__track">
        {Array.from({ length: cells }, (_, i) => {
          const fromMid = cells - 1 - i
          return cell(side === 'left' && fromMid < n, fromMid, 'calm', `l${i}`)
        })}
        <span className="vb-gauge__mid" aria-hidden />
        {Array.from({ length: cells }, (_, i) => cell(side === 'right' && i < n, i, 'plus', `r${i}`))}
      </div>
      <div className="vb-gauge__ends" aria-hidden>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

/* ───────── PixelStepper ───────── */
const HOLD_DELAY = 400
const HOLD_INTERVAL = 110
const HOLD_FAST_INTERVAL = 60
const HOLD_FAST_AFTER = 6
const FLASH_DURATION = 400
const SHAKE_KEYFRAMES = [0, -4, 4, -2, 2, 0]
const rollVariants = {
  enter: (dir: number) => ({ y: dir * 14, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir * -14, opacity: 0 }),
}
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function Glyph({ plus }: { plus?: boolean }) {
  return (
    <svg viewBox="0 0 7 7" width="14" height="14" shapeRendering="crispEdges" aria-hidden focusable="false">
      <path d={plus ? 'M0 3h7v1H0zM3 0h1v7H3z' : 'M0 3h7v1H0z'} fill="currentColor" />
    </svg>
  )
}

export function PixelStepper({ value, onChange, min = 0, max = 9, label, format = (v) => String(v), unitWord = '', minText, maxText }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label: string
  format?: (v: number) => string; unitWord?: string; minText?: string; maxText?: string
}) {
  const reduce = useReducedMotion()
  const [dir, setDir] = useState(1)
  const [flash, setFlash] = useState(0)
  const [repeating, setRepeating] = useState(false)
  const [say, setSay] = useState('')
  const shake = useAnimationControls()
  const current = clamp(value, min, max)
  const valueRef = useRef(current)
  useEffect(() => { valueRef.current = current }, [current])
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef(0)

  const stop = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current)
    if (repeatRef.current) clearInterval(repeatRef.current)
    delayRef.current = repeatRef.current = null
    countRef.current = 0
    setRepeating(false)
  }, [])
  useEffect(() => stop, [stop])

  useEffect(() => {
    if (!flash) return
    if (!reduce) {
      shake.set({ x: 0 })
      void shake.start({ x: SHAKE_KEYFRAMES, transition: { duration: 0.3, ease: 'easeInOut' } })
    }
    const t = setTimeout(() => setFlash(0), FLASH_DURATION)
    return () => clearTimeout(t)
  }, [flash, reduce, shake])

  const stepBy = useCallback((delta: number) => {
    const next = clamp(valueRef.current + delta, min, max)
    if (next === valueRef.current) {
      setFlash((c) => c + 1)
      setSay(delta < 0 ? (minText ?? `これより少なくはできません`) : (maxText ?? `これより多くはできません`))
      return false
    }
    valueRef.current = next
    setDir(delta > 0 ? 1 : -1)
    onChange(next)
    setSay(`${label} ${format(next)}${unitWord}`)
    return true
  }, [min, max, onChange, label, format, unitWord, minText, maxText])

  const startHold = (delta: number) => (e: PointerEvent<HTMLButtonElement>) => {
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

  const onKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const next = e.key === 'Home' ? min : max
      if (next !== current) { setDir(next > current ? 1 : -1); onChange(next) }
      return
    }
    if (!(e.key in map)) return
    e.preventDefault()
    stepBy(map[e.key])
  }

  // キーボードの人も＋−を押せるように、ボタンにもフォーカスを残す（元の部品は tabIndex=-1）
  const roll = reduce || flash ? { duration: 0 } : repeating ? { duration: 0.08 } : { type: 'spring' as const, stiffness: 420, damping: 30 }
  return (
    <div className={cn('vb-stepper', flash > 0 && 'is-flash')} role="group" aria-label={label}>
      <motion.button type="button" className="vb-stepper__btn" aria-label={`${label}を減らす`}
        onPointerDown={startHold(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBy(-1) } }}
        whileTap={reduce ? undefined : { y: 2 }} data-edge={current <= min || undefined}>
        <Glyph />
      </motion.button>
      <motion.span role="spinbutton" tabIndex={0} aria-label={label} aria-valuenow={current} aria-valuemin={min} aria-valuemax={max}
        aria-valuetext={`${format(current)}${unitWord}`} onKeyDown={onKey} animate={shake} className="vb-stepper__val">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.span key={current} custom={dir} variants={rollVariants} initial="enter" animate="center" exit="exit" transition={roll} className="vb-stepper__num">
            {format(current)}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <motion.button type="button" className="vb-stepper__btn" aria-label={`${label}を増やす`}
        onPointerDown={startHold(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBy(1) } }}
        whileTap={reduce ? undefined : { y: 2 }} data-edge={current >= max || undefined}>
        <Glyph plus />
      </motion.button>
      <span className="vb-sr" aria-live="polite">{say}</span>
    </div>
  )
}

/* ───────── TypeText（メッセージウィンドウの文字送り） ───────── */
const PAUSE = /[。、？！…]/
export function TypeText({ text, speed = 34, instant = false, skip = 0, onDone, className, arrow = true }: {
  text: string; speed?: number; instant?: boolean; skip?: number; onDone?: () => void; className?: string; arrow?: boolean
}) {
  const reduce = useReducedMotion()
  const immediate = instant || !!reduce
  const [n, setN] = useState(immediate ? text.length : 0)
  const nRef = useRef(n)
  const show = (v: number) => { nRef.current = v; setN(v) }
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (immediate) {
      show(text.length)
      doneRef.current?.()
      return
    }
    show(0)
    let i = 0
    const type = () => {
      i += 1
      show(i)
      if (i >= text.length) { doneRef.current?.(); return }
      timer.current = setTimeout(type, PAUSE.test(text[i - 1]) ? speed * 6 : speed)
    }
    timer.current = setTimeout(type, 120)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [text, speed, immediate])

  // 外からの「全部見せて」の合図（ウィンドウをタップ）。値が変わったときだけ反応する
  const lastSkip = useRef(skip)
  useEffect(() => {
    if (skip === lastSkip.current) return
    lastSkip.current = skip
    if (timer.current) clearTimeout(timer.current)
    if (nRef.current < text.length) {
      show(text.length)
      doneRef.current?.()
    }
  }, [skip, text.length])

  const done = n >= text.length
  return (
    <span className={className}>
      <span className="vb-sr">{text}</span>
      <span aria-hidden>
        {text.slice(0, n)}
        <span className="vb-ghost">{text.slice(n)}</span>
        {done && arrow && <PixelArrow dir="down" className="vb-next" />}
      </span>
    </span>
  )
}

/* ───────── PixelConfetti（四角いドットと金貨が舞う） ───────── */
const CONFETTI_COLORS = ['#ffcc33', '#d9452f', '#6bb34f', '#3a6fb0', '#fffdf6', '#f4a3b5', '#2f8f86']
type Particle = { keyframes: { transform: string[]; opacity: number[] }; duration: number; size: number; color: string; coin: boolean }
type Burst = { id: number; particles: Particle[] }

function buildKeyframes({ angle, startVelocity, decay, gravity, drift, wobbleSpeed, wobbleOffset, ticks }: {
  angle: number; startVelocity: number; decay: number; gravity: number; drift: number; wobbleSpeed: number; wobbleOffset: number; ticks: number
}) {
  const transform: string[] = []
  const opacity: number[] = []
  const frames = 30
  let v = startVelocity, x = 0, y = 0, wobble = wobbleOffset, tick = 0
  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    if (i > 0) {
      const target = Math.round((i * ticks) / frames)
      while (tick < target) {
        x += Math.cos(angle) * v + drift
        y += Math.sin(angle) * v + gravity * 3
        v *= decay
        wobble += wobbleSpeed
        tick++
      }
    }
    // ドットらしく、位置は 3px 単位にそろえる
    const tx = Math.round((i === 0 ? 0 : x + Math.cos(wobble) * 10) / 3) * 3
    const ty = Math.round(y / 3) * 3
    transform.push(`translate(${tx}px, ${ty}px)`)
    opacity.push(t <= 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4))
  }
  return { transform, opacity }
}

function Dot({ p }: { p: Particle }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const playback = animate(ref.current, p.keyframes, { duration: p.duration, ease: 'linear' })
    return () => playback.cancel()
  }, [p])
  return <span ref={ref} className={cn('vb-confetti__dot', p.coin && 'is-coin')} style={{ width: p.size, height: p.size, background: p.coin ? undefined : p.color }} />
}

export function PixelConfetti({ burst, count = 46, power = 26, className }: { burst: number; count?: number; power?: number; className?: string }) {
  const reduce = useReducedMotion()
  const [bursts, setBursts] = useState<Burst[]>([])
  useEffect(() => {
    if (!burst || reduce) return
    const id = burst
    const duration = 2.2
    const ticks = Math.round(duration * 60)
    const particles = Array.from({ length: count }, (_, i) => {
      const spread = (110 * Math.PI) / 180
      const angle = -Math.PI / 2 + (0.5 * spread - Math.random() * spread)
      return {
        keyframes: buildKeyframes({
          angle, startVelocity: power * 0.5 + Math.random() * power, decay: 0.9, gravity: 1, drift: 0,
          wobbleSpeed: Math.random() * 0.1 + 0.05, wobbleOffset: Math.random() * 10, ticks,
        }),
        duration,
        size: [6, 6, 9, 9, 12][i % 5],
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        coin: i % 6 === 0,
      }
    })
    setBursts((b) => [...b, { id, particles }])
    const t = setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), (duration + 0.4) * 1000)
    return () => clearTimeout(t)
  }, [burst, count, power, reduce])
  return (
    <div className={cn('vb-confetti', className)} aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} className="vb-confetti__burst">
          {b.particles.map((p, i) => <Dot key={i} p={p} />)}
        </div>
      ))}
    </div>
  )
}

/** 小さな札（確認済・推定・仮置き、入力例 など） */
export function Tag({ children, tone = 'plain', className }: { children: ReactNode; tone?: 'plain' | 'ok' | 'guess' | 'temp' | 'sample' | 'pr'; className?: string }) {
  return <span className={cn('vb-tag', `vb-tag--${tone}`, className)}>{children}</span>
}
