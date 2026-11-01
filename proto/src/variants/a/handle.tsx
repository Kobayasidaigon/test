/*
 * ガチャのハンドル（ドラッグで回す／タップでも回る）
 * 考え方を借りた部品: 21st「Kokonut UI Detent Dial」 — 作者 kokonutd（kokonutUI, MIT License）
 *   https://21st.dev/@kokonutd/components/kokonut-detent-dial
 * 借りたところ: 指の位置から角度を出す計算、0時をまたいだときの角度の折り返し、さわったときの小さな振動。
 * 変えたところ: 端のあるダイヤルではなく、時計回りにしか進まない「ラチェット」にした。
 *   1/4回転ごとにカチッと止まり、ぐるっと1周すると onTurned。タップ・Enter・Space なら自動で1周する。
 */
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function pointerAngle(event: PointerEvent, rect: DOMRect) {
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  return { angle: (Math.atan2(dx, -dy) * 180) / Math.PI, distance: Math.hypot(dx, dy) }
}
function hapticTick() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
}

export function GachaHandle({ onTurned, onNotch, disabled = false, size = 168 }: { onTurned: () => void; onNotch?: (quarter: number) => void; disabled?: boolean; size?: number }) {
  const reduce = useReducedMotion()
  const rot = useMotionValue(0)
  const quarter = useRef(0)
  const finished = useRef(false)
  const drag = useRef<{ id: number; rect: DOMRect; last: number; x: number; y: number; moved: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const R = size / 2 - 13
  const progress = useTransform(rot, (r) => Math.max(0.001, Math.min(r, 360) / 360))

  const finish = () => {
    if (finished.current) return
    finished.current = true
    drag.current = null
    setBusy(true)
    animate(rot, 360, { duration: 0.12 })
    window.setTimeout(onTurned, reduce ? 0 : 180)
  }

  useMotionValueEvent(rot, 'change', (r) => {
    const q = Math.min(4, Math.floor(r / 90 + 1e-6))
    if (q > quarter.current) {
      quarter.current = q
      onNotch?.(q)
      hapticTick()
    }
    if (r >= 359.5) finish()
  })

  const autoTurn = () => {
    if (finished.current || disabled) return
    setBusy(true)
    if (reduce) {
      rot.jump(360)
      return
    }
    animate(rot, 360, { duration: 0.85, ease: [0.5, 0, 0.35, 1] })
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || finished.current || busy) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, rect, last: pointerAngle(e, rect).angle, x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true
    const { angle, distance } = pointerAngle(e, d.rect)
    if (distance < 12) {
      d.last = angle
      return
    }
    let delta = angle - d.last
    if (delta > 180) delta -= 360
    else if (delta < -180) delta += 360
    d.last = angle
    // 時計回りだけ進む。もどすのは、さっきカチッと止まった所まで
    const next = delta > 0 ? rot.get() + delta : Math.max(quarter.current * 90, rot.get() + delta)
    rot.set(next)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) {
      autoTurn()
      return
    }
    if (!finished.current) animate(rot, quarter.current * 90, reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26 })
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      autoTurn()
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" overflow="visible">
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="var(--metal)" stroke="var(--ink)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#c4cad3" strokeWidth="9" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke="var(--yolk)"
          strokeWidth="9"
          strokeLinecap="round"
          style={{ pathLength: progress }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {[0, 90, 180, 270].map((a) => {
          const rad = (a * Math.PI) / 180
          return <circle key={a} cx={size / 2 + Math.sin(rad) * R} cy={size / 2 - Math.cos(rad) * R} r="3.2" fill="var(--ink)" />
        })}
      </svg>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label="ハンドルを回して、カプセルを出す（押すだけでも回ります）"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full',
          disabled ? 'cursor-not-allowed opacity-50' : busy ? 'cursor-progress' : 'cursor-grab active:cursor-grabbing',
        )}
        style={{ width: size * 0.74, height: size * 0.74 }}
      >
        <motion.div aria-hidden className="absolute inset-0 rounded-full border-[3px] border-[var(--ink)] bg-[var(--yolk)] shadow-[3px_5px_0_var(--ink)]" style={{ rotate: rot }}>
          <span className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)]" style={{ width: size * 0.66, height: size * 0.19 }}>
            <span className="absolute left-[12%] top-1/2 h-[30%] w-[22%] -translate-y-1/2 rounded-full bg-white/45" />
          </span>
          <span className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--paper)]" style={{ width: size * 0.15, height: size * 0.15 }} />
        </motion.div>
      </div>
      {!disabled && !busy && (
        <svg aria-hidden viewBox="0 0 60 60" width="54" height="54" className="va-nudge pointer-events-none absolute -right-7 -top-6" overflow="visible">
          <path d="M10 22 A26 26 0 0 1 48 20" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
          <path d="M48 20 L50 8 M48 20 L37 17" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}
