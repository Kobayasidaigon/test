/**
 * SegmentedControl
 * Adapted from Klyv (https://github.com/Klyv-UI/klyv), © 2026 Klyv contributors.
 * Licensed under the MIT License:
 *
 * MIT License
 *
 * Copyright (c) 2026 Klyv contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// 21st.dev の「Segmented Control」（klyv-ui）をもとにした、1つだけ選ぶ切り替え。
// もとのふるまい（radiogroup、矢印キーで動く、選んだものだけ Tab で止まる）は、そのまま使っている。
// 変えたところ: 丸いピルをやめ、紺の輪郭線でつながった角ばった箱にした。選んだものは紺の地に白ぬき。
// 選択肢が多いとき用に、折り返して並ぶ「札」の形（variant="chips"）を足した。選択肢の前にブロックなどを置ける（lead）。
import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string = string> {
  value: T
  label: string
  /** ラベルの前に置くもの（勤務のブロックなど） */
  lead?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** 読み上げ用の、この切り替えの名前 */
  label: string
  /** joined = つながった箱（2〜4個向け）、chips = 折り返して並ぶ札（数が多いとき） */
  variant?: "joined" | "chips"
  fullWidth?: boolean
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  label,
  variant = "joined",
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (event: KeyboardEvent, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown"
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp"
    if (!forward && !back) return
    event.preventDefault()
    const step = forward ? 1 : -1
    const total = options.length
    for (let offset = 1; offset <= total; offset += 1) {
      const next = (index + step * offset + total * offset) % total
      if (!options[next].disabled) {
        onValueChange(options[next].value)
        refs.current[next]?.focus()
        return
      }
    }
  }

  // 選んだものがない（値が選択肢にない）ときも、Tab で入れるようにする
  const hasSelected = options.some((o) => o.value === value)

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        variant === "joined"
          ? "inline-flex overflow-hidden rounded-lg border-2 border-ink bg-card"
          : "flex flex-wrap gap-2",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected || (!hasSelected && index === 0) ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-3.5 text-sm font-bold leading-tight transition-colors",
              "disabled:pointer-events-none disabled:opacity-40",
              "focus-visible:relative focus-visible:z-10 focus-visible:outline-offset-[-3px]",
              variant === "joined"
                ? cn("border-ink [&:not(:first-child)]:border-l-2", fullWidth && "flex-1")
                : "rounded-lg border-2 border-ink",
              selected ? "bg-ink text-paper" : "bg-card text-ink hover:bg-well",
              variant === "chips" && selected && "shadow-[2px_2px_0_0_var(--shift-egg)]",
            )}
          >
            {option.lead}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
