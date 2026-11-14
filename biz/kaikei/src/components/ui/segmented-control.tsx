import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// 21st.dev の Segmented Control（ddoemonn）をもとにした、2〜4個から1つを選ぶ切り替え。
// もとのまま使っているところ: ラジオグループとしてのふるまい（矢印キー・Home/End で動く、選んだものだけ Tab で止まる）と、
// 選んだしるしがすべって動き、その下の字の色が、しるしの形に切りぬかれて変わる仕組み
// （しるしの中に、白ぬきの字を逆向きにずらして重ねてある）。
// 変えたところ: もとは motion のばねで動かしていたが、CSS の transition に置きかえた（道具の画面を軽くするため。
// 動きを減らす設定では、index.css の決まりで、すぐに切り替わる）。見た目を「紙の上の、墨のしるし」に。
// 高さを 44px 以上に。字を大きく。幅いっぱいに広げられるように。選んだものは、色だけでなく aria-checked でも伝わる。

const SLIDE = "transform 0.24s cubic-bezier(0.3, 0.9, 0.3, 1)"

export type SegmentedOption<T extends string = string> = {
  value: T
  label: ReactNode
  /** 読み上げ用の名前（label が文字でないとき） */
  ariaLabel?: string
  disabled?: boolean
}

export type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[]
  /** 何を選ぶのかの名前（読み上げに使う） */
  label: string
  value: T
  onValueChange: (value: T) => void
  className?: string
  /** しるしの色。だいじな切り替え（収入・支出）は墨、そのほかは青緑 */
  tone?: "sumi" | "rule"
  disabled?: boolean
}

export function SegmentedControl<T extends string = string>({
  options,
  label,
  value,
  onValueChange,
  className,
  tone = "sumi",
  disabled = false,
}: SegmentedControlProps<T>) {
  const count = Math.max(1, options.length)
  const template = `repeat(${count}, minmax(0, 1fr))`
  const found = options.findIndex((o) => o.value === value)
  const index = found < 0 ? 0 : found

  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const seek = useCallback(
    (from: number, dir: number) => {
      let i = from
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count
        if (!options[i]?.disabled) return i
      }
      return from
    },
    [count, options],
  )

  const go = (i: number) => {
    const option = options[i]
    if (!option || option.disabled || disabled) return
    buttons.current[i]?.focus()
    if (option.value !== value) onValueChange(option.value)
  }

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      go(seek(i, 1))
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      go(seek(i, -1))
    } else if (e.key === "Home") {
      e.preventDefault()
      go(seek(count - 1, 1))
    } else if (e.key === "End") {
      e.preventDefault()
      go(seek(0, -1))
    }
  }

  const seg = "flex min-h-11 items-center justify-center px-2.5 py-1.5 text-center text-[0.94rem] font-bold leading-tight"

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative inline-block select-none rounded-lg border-[1.5px] border-input bg-muted p-[3px]",
        disabled && "opacity-55",
        className,
      )}
    >
      <div className="relative grid" style={{ gridTemplateColumns: template, touchAction: "manipulation" }}>
        {/* 下の段: 選ばれていないときの字 */}
        {options.map((option) => (
          <span key={option.value} aria-hidden className={cn(seg, "pointer-events-none", option.disabled ? "text-muted-foreground/50" : "text-foreground/80")}>
            {option.label}
          </span>
        ))}

        {/* すべって動くしるし。中に、白ぬきの字を、逆向きに同じだけずらして重ねてある（字は動かず、色だけが変わって見える） */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-md shadow-lift",
            tone === "sumi" ? "bg-sumi" : "bg-rule-ink",
          )}
          style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)`, transition: SLIDE }}
        >
          <div className="absolute inset-0" style={{ transform: `translateX(${index * -100}%)`, transition: SLIDE }}>
            <div className="absolute inset-y-0 left-0 grid" style={{ width: `${count * 100}%`, gridTemplateColumns: template }}>
              {options.map((option) => (
                <span key={option.value} className={cn(seg, "text-white")}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 上の段: 押すところ（見えないボタン） */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: template }}>
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-label={option.ariaLabel}
              disabled={disabled || option.disabled}
              tabIndex={i === index ? 0 : -1}
              onClick={() => go(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="cursor-pointer rounded-md outline-offset-1 disabled:cursor-not-allowed"
            >
              {!option.ariaLabel && <span className="sr-only">{option.label}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SegmentedControl
