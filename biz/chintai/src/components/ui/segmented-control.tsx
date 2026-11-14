import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// ddoemonn の Segmented Control（21st.dev）をもとにした、2〜3個からの切り替え（メール用／LINE用）。
//
// もとの部品から残したもの:
// - ラジオグループとしてのふるまい（矢印キー・Home・End で動く、選んだものだけ Tab で止まる）。
// - 選んだしるしがすべって動き、その下の文字だけ色が反転する仕組み（しるしの中に、もう1組の文字を逆向きに動かして重ねる）。
// - 動きを減らす設定のときは、すべらせずに切り替える。
//
// 変えたもの:
// - 見た目を、書類の「どちらかに○を付ける欄」に寄せた（四角い枠、黒いインクのしるし、角を丸めない）。
// - 高さを 44px にして、指で押せるようにした。フォーカスの枠は、サイト共通の青い枠。
// - もとは motion（ばねの動き）ですべらせていたが、CSS の transition に置きかえた。
//   道具の画面が読み込むプログラムを軽くするため（この部品のためだけに、動きのライブラリを入れない）。
//   動きを減らす設定のときは、index.css の決まりで、すべらせずに切り替わる。

/** しるしと、その中の文字を、逆向きに同じだけ動かす。2つの動きがずれると文字がぶれるので、同じ決まりを使う。 */
const SLIDE = "transition-transform duration-[220ms] ease-[cubic-bezier(0.3,0.9,0.3,1)]"

const SEG = "flex items-center justify-center px-4 text-center text-sm font-bold leading-none whitespace-nowrap"

export type SegmentedOption = { value: string; label: string; disabled?: boolean }

export type SegmentedControlProps = {
  options: SegmentedOption[]
  /** 読み上げのための、欄の名前。 */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function SegmentedControl({ options, label, value, defaultValue, onValueChange, className }: SegmentedControlProps) {
  const count = Math.max(1, options.length)
  const template = `repeat(${count}, minmax(0, 1fr))`

  const [internal, setInternal] = useState(() => defaultValue ?? options[0]?.value ?? "")
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const found = options.findIndex((o) => o.value === current)
  const index = found < 0 ? 0 : found

  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const emit = useRef(onValueChange)
  emit.current = onValueChange

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next)
      if (next !== current) emit.current?.(next)
    },
    [controlled, current],
  )

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

  const go = useCallback(
    (i: number) => {
      const option = options[i]
      if (!option || option.disabled) return
      buttons.current[i]?.focus()
      select(option.value)
    },
    [options, select],
  )

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
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

  return (
    <div role="radiogroup" aria-label={label} className={cn("relative inline-block select-none rounded-sm border border-ink/70 bg-paper p-[3px]", className)}>
      <div className="relative grid h-[38px]" style={{ gridTemplateColumns: template, touchAction: "manipulation" }}>
        {options.map((option) => (
          <span key={option.value} aria-hidden className={cn(SEG, "pointer-events-none", option.disabled ? "text-ink-soft/50" : "text-ink-soft")}>
            {option.label}
          </span>
        ))}

        {/* 選んだしるし。中に、白い文字の組をもう1つ置いて、しるしの下だけ色が反転して見えるようにする。 */}
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[2px] bg-ink", SLIDE)}
          style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)` }}
        >
          <div className={cn("absolute inset-0", SLIDE)} style={{ transform: `translateX(${index * -100}%)` }}>
            <div className="absolute inset-y-0 left-0 grid" style={{ width: `${count * 100}%`, gridTemplateColumns: template }}>
              {options.map((option) => (
                <span key={option.value} className={cn(SEG, "text-white")}>
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute -inset-[3px] grid" style={{ gridTemplateColumns: template }}>
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-disabled={option.disabled || undefined}
              tabIndex={i === index ? 0 : -1}
              onClick={() => !option.disabled && select(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="cursor-pointer rounded-sm"
            >
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SegmentedControl
