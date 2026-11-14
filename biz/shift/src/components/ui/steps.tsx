// 21st.dev の「Steps」（adit-firdaus）をもとにした、作業の流れの見出し。
// 借りたところ: <ol> と aria-current="step" で流れを伝える組み立て、番号の入った印、印どうしをつなぐ線、
//   「速く押しても、押した様子が必ず見える」ための usePressFeedback（押した状態を最低 90ms 保つ）。
// 変えたところ: もとは「先の手順は押せない」進み具合の表示だが、この道具は行き来が自由なので、どの手順も押せるようにした。
//   印は丸をやめ、勤務のブロックと同じ四角（紺の輪郭線、いまの手順は卵色で、ずらした影つき）。
//   すべる丸（sliding thumb）は使っていない。手順ごとのひとこと（note）と、スマホ用の短い名前を足した。
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface StepItem {
  title: string
  /** 幅がせまいときの短い名前 */
  shortTitle?: string
  /** 名前の下に小さく出すひとこと（「7人」「不足 2か所」など） */
  note?: ReactNode
  /** note を、注意の色にする */
  noteTone?: "plain" | "warn"
}

export interface StepsProps {
  items: StepItem[]
  /** いまの手順（0 から） */
  current: number
  onStepChange: (index: number) => void
  "aria-label"?: string
  className?: string
}

/** 押した状態を見せる最低の時間（ms） */
const MIN_VISIBLE = 90

/**
 * 速いタップでも、押した様子が見えるようにする。
 * :active だけだと、指を離すのが速いときに1コマも描かれないことがある。
 */
function usePressFeedback() {
  const [pressed, setPressed] = useState(false)
  const pressedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const press = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    pressedAt.current = Date.now()
    setPressed(true)
  }, [])

  const release = useCallback(() => {
    const remaining = Math.max(0, MIN_VISIBLE - (Date.now() - pressedAt.current))
    if (remaining === 0) {
      setPressed(false)
      return
    }
    timer.current = setTimeout(() => setPressed(false), remaining)
  }, [])

  return {
    pressed,
    pressProps: { onPointerDown: press, onPointerUp: release, onPointerCancel: release, onPointerLeave: release },
  }
}

function Step({ item, index, current, last, onSelect }: { item: StepItem; index: number; current: boolean; last: boolean; onSelect: (i: number) => void }) {
  const { pressed, pressProps } = usePressFeedback()
  return (
    <li className="relative flex min-w-0 flex-1" aria-current={current ? "step" : undefined}>
      <button
        {...pressProps}
        type="button"
        onClick={() => onSelect(index)}
        className={cn(
          "group relative z-[1] flex min-h-14 min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center md:flex-row md:gap-2.5 md:px-2 md:text-left",
          "focus-visible:outline-offset-0",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md border-2 border-ink font-num text-sm font-bold transition-[transform,box-shadow,background-color] duration-100",
            current ? "bg-shift-egg shadow-hard-sm" : "bg-card group-hover:bg-well",
            pressed && "translate-x-[2px] translate-y-[2px] shadow-none",
          )}
        >
          {index + 1}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-[11px] leading-tight md:text-sm", current ? "font-extrabold text-ink" : "font-bold text-ink-soft group-hover:text-ink")}>
            <span className="md:hidden">{item.shortTitle ?? item.title}</span>
            <span className="hidden md:inline">{item.title}</span>
          </span>
          {item.note ? (
            <span className={cn("mt-0.5 hidden text-[11px] font-bold leading-tight md:block", item.noteTone === "warn" ? "text-danger" : "text-ink-soft")}>{item.note}</span>
          ) : null}
        </span>
        <span className="sr-only">{current ? "（いまの手順）" : ""}</span>
      </button>
      {/* 印どうしをつなぐ線。飾りなので、読み上げない */}
      {!last && <span aria-hidden className="pointer-events-none absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-[1.3rem] border-t-2 border-dashed border-ink/35 md:hidden" />}
      {!last && <span aria-hidden className="pointer-events-none my-auto hidden w-6 shrink-0 border-t-2 border-dashed border-ink/35 md:block lg:w-10" />}
    </li>
  )
}

export function Steps({ items, current, onStepChange, className, "aria-label": ariaLabel = "作業の流れ" }: StepsProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex items-stretch">
        {items.map((item, index) => (
          <Step key={index} item={item} index={index} current={index === current} last={index === items.length - 1} onSelect={onStepChange} />
        ))}
      </ol>
    </nav>
  )
}

export default Steps
