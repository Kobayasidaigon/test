// 21st.dev の「Quantity Stepper」（arihantcodes / Spectrum UI）をもとにした、数の入力。
// 借りたところ: −／＋を押し続けると、だんだん速くくり返す動き（HOLD_DELAY → HOLD_INTERVAL → HOLD_FAST_INTERVAL）、
//   上限・下限に当たったときに数を小さくゆらして知らせる動き、↑↓／PageUp／PageDown／Home／End のキー操作。
// 変えたところ: 数を直接打てるように、まん中を本物の <input> にした（もとは表示だけ）。
//   空（＝決めない）を許せるようにした。framer-motion を使わず CSS だけにした（数字が転がる動きは、表の中では目ざわりなので外した）。
//   丸いピルをやめ、紺の輪郭線の箱に。−／＋は、スマホでも押しやすい 44px。
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NumberFieldProps {
  /** null は「空」（決めない） */
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  /** 空にできるか。true なら、消すと null になる */
  allowEmpty?: boolean
  /** 空のときに出す文字（「なし」など） */
  placeholder?: string
  /** 読み上げ用の名前（「月曜の早番の必要な人数」など） */
  label: string
  /** 数の後ろに出す単位（「人」「日」） */
  unit?: string
  disabled?: boolean
  id?: string
  className?: string
}

const HOLD_DELAY = 400
const HOLD_INTERVAL = 90
const HOLD_FAST_INTERVAL = 45
const HOLD_FAST_AFTER = 10

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function NumberField({ value, onChange, min = 0, max = 99, allowEmpty = false, placeholder, label, unit, disabled, id, className }: NumberFieldProps) {
  // 打っている途中の文字（「1」→「12」のように、途中の値をそのまま見せるため）
  const [draft, setDraft] = useState<string | null>(null)
  const [nudge, setNudge] = useState(0)
  const [announcement, setAnnouncement] = useState("")

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const repeatCount = useRef(0)

  const stopRepeat = useCallback(() => {
    if (delayRef.current !== null) clearTimeout(delayRef.current)
    if (repeatRef.current !== null) clearInterval(repeatRef.current)
    delayRef.current = null
    repeatRef.current = null
    repeatCount.current = 0
  }, [])
  useEffect(() => stopRepeat, [stopRepeat])

  /** 数を動かす。上限・下限に当たって動かせなかったら false */
  const stepBy = useCallback(
    (delta: number) => {
      const current = valueRef.current
      // 空から＋を押したら下限（ふつうは 0 か 1）から始める。−を押しても同じ
      const next = current === null ? clamp(delta > 0 ? Math.max(min, 1) : min, min, max) : clamp(current + delta, min, max)
      if (current !== null && next === current) {
        setNudge((n) => n + 1)
        setAnnouncement(delta < 0 ? `${min}より小さくはできません` : `${max}より大きくはできません`)
        return false
      }
      valueRef.current = next
      setDraft(null)
      onChange(next)
      setAnnouncement(`${next}${unit ?? ""}`)
      return true
    },
    [min, max, onChange, unit],
  )

  const startHold = (delta: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    stopRepeat()
    if (!stepBy(delta)) return
    delayRef.current = setTimeout(() => {
      const tick = () => {
        if (!stepBy(delta)) {
          stopRepeat()
          return
        }
        repeatCount.current += 1
        if (repeatCount.current === HOLD_FAST_AFTER) {
          if (repeatRef.current !== null) clearInterval(repeatRef.current)
          repeatRef.current = setInterval(tick, HOLD_FAST_INTERVAL)
        }
      }
      repeatRef.current = setInterval(tick, HOLD_INTERVAL)
    }, HOLD_DELAY)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    let delta = 0
    if (event.key === "ArrowUp") delta = 1
    else if (event.key === "ArrowDown") delta = -1
    else if (event.key === "PageUp") delta = 5
    else if (event.key === "PageDown") delta = -5
    else if (event.key === "Enter") {
      ;(event.target as HTMLInputElement).blur()
      return
    } else return
    event.preventDefault()
    stepBy(delta)
  }

  const commit = (text: string) => {
    // 全角の数字で打っても読めるようにする
    const t = text.normalize("NFKC").trim()
    setDraft(null)
    if (t === "") {
      if (allowEmpty) onChange(null)
      return
    }
    const n = Number(t)
    if (!Number.isFinite(n)) return
    const next = clamp(Math.round(n), min, max)
    if (next !== n) setNudge((k) => k + 1)
    if (next !== value) onChange(next)
  }

  const shown = draft ?? (value === null ? "" : String(value))
  const atMin = value !== null && value <= min
  const atMax = value !== null && value >= max

  return (
    <span
      className={cn(
        "inline-flex h-11 items-stretch overflow-hidden rounded-lg border-2 border-ink bg-card align-middle",
        "focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-focus",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label}を1減らす`}
        disabled={disabled}
        onPointerDown={startHold(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        className={cn("grid w-11 shrink-0 touch-manipulation place-items-center border-r-2 border-ink bg-well transition-colors hover:bg-[#ece3c8] active:bg-shift-egg md:w-9", atMin && "text-ink/35")}
      >
        <Minus aria-hidden className="size-4" strokeWidth={3} />
      </button>
      <span key={nudge} className={cn("flex min-w-0 items-center", nudge > 0 && "animate-nudge")}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="spinbutton"
          aria-label={label}
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          disabled={disabled}
          placeholder={placeholder}
          value={shown}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d０-９]/g, "").slice(0, 3))}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            if (draft !== null) commit(e.target.value)
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "h-full w-10 min-w-0 border-0 bg-transparent p-0 text-center font-num text-base font-bold text-ink outline-none placeholder:font-sans placeholder:text-xs placeholder:font-medium placeholder:text-ink-soft",
            unit && "w-8 text-right",
          )}
        />
        {unit ? <span aria-hidden className="pl-0.5 pr-1.5 text-xs font-bold text-ink-soft">{unit}</span> : null}
      </span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label}を1ふやす`}
        disabled={disabled}
        onPointerDown={startHold(1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        className={cn("grid w-11 shrink-0 touch-manipulation place-items-center border-l-2 border-ink bg-well transition-colors hover:bg-[#ece3c8] active:bg-shift-egg md:w-9", atMax && "text-ink/35")}
      >
        <Plus aria-hidden className="size-4" strokeWidth={3} />
      </button>
      {/* −／＋を指で押したときの変化を読み上げる（キーボードのときは、入力欄の値の変化が読まれる） */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  )
}

export default NumberField
