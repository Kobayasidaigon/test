import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react"
import { SearchIcon } from "lucide-react"

import { prefersReducedMotion } from "@/lib/scroll"
import { cn } from "@/lib/utils"

// halaska-studio の Combobox（21st.dev）をもとにした、「打って探して、選ぶ」欄。
//
// もとの部品から残したもの:
// - 入力欄にフォーカスを置いたまま、aria-activedescendant で候補を指す作り（依存ライブラリなし）。
// - ↓↑ で候補を動かし、Enter で決め、Esc で閉じる。マウスを乗せると、指す候補が動く。外側を押すと閉じる。
//
// 変えたもの:
// - もとは「ボタンを押すと開く箱の中に、絞り込みの欄がある」形。ここでは、欄そのものをいつも見せて
//   （role="combobox"）、打ったら下に候補が出る形にした。見積書を見ながら、続けて何行も足せるように、
//   選んだあともフォーカスは欄に残す。
// - 候補を探すのは呼ぶ側（core の searchItems）。ここは、渡された候補を並べるだけ。
// - 候補のいちばん下に、「この名前のまま足す」のような、もう1つの選び方（extra）を置けるようにした。
// - 見つかった数を、読み上げで伝える。
// - デザイン用のトークン、すりガラス、紫の色は使っていない。紙と罫線の見た目にした。

export type ComboOption = {
  id: string
  label: string
  /** 右に出す、小さな補足（「抗菌施工」で見つかりました、など）。 */
  hint?: string
  /** 左に出す印（区分の印など）。 */
  leading?: ReactNode
}

export type ComboboxProps = {
  /** 欄の名前（読み上げ用。見えるラベルがあるなら、labelledBy を使う）。 */
  label?: string
  labelledBy?: string
  placeholder?: string
  query: string
  onQueryChange: (query: string) => void
  /** 候補（呼ぶ側で、もう絞り込んであるもの）。 */
  options: ComboOption[]
  onSelect: (option: ComboOption) => void
  /** 候補のいちばん下に置く、もう1つの選び方。 */
  extra?: { label: string; onSelect: () => void } | null
  /** 打ったのに候補がないときの文（extra がなければ出す）。 */
  emptyText?: string
  inputRef?: Ref<HTMLInputElement>
  className?: string
  inputClassName?: string
}

export function Combobox({
  label,
  labelledBy,
  placeholder,
  query,
  onQueryChange,
  options,
  onSelect,
  extra,
  emptyText = "見つかりませんでした。",
  inputRef,
  className,
  inputClassName,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const uid = useId()
  const total = options.length + (extra ? 1 : 0)
  const hasQuery = query.trim() !== ""
  const shown = open && hasQuery

  // 候補が変わったら、いちばん上を指す。
  useEffect(() => {
    setIdx(0)
  }, [query])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  // 指している候補が、一覧の見えるところに来るようにする。
  useEffect(() => {
    if (!shown) return
    document.getElementById(`${uid}-opt-${idx}`)?.scrollIntoView({ block: "nearest" })
  }, [idx, shown, uid])

  // 候補の一覧が、画面の下にはみ出すときは、欄を画面の上のほうへ動かして、候補が見えるようにする
  // （スマホでは、キーボードの分だけ見える範囲がせまいので、visualViewport の高さで比べる）。
  useEffect(() => {
    if (!shown) return
    const list = document.getElementById(`${uid}-list`)
    if (!list) return
    const visible = window.visualViewport?.height ?? window.innerHeight
    if (list.getBoundingClientRect().bottom > visible - 8) {
      wrap.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }, [shown, total, uid])

  const pick = (i: number) => {
    if (i < options.length) onSelect(options[i])
    else if (extra) extra.onSelect()
    else return
    setOpen(false)
  }

  return (
    <div ref={wrap} className={cn("relative scroll-mt-24", className)}>
      <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-soft" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-expanded={shown}
        aria-controls={`${uid}-list`}
        aria-autocomplete="list"
        aria-activedescendant={shown && total > 0 ? `${uid}-opt-${idx}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          // 日本語の変換を決める Enter では、候補を選ばない。
          if (e.nativeEvent.isComposing) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            if (!open) setOpen(true)
            else if (total > 0) setIdx((i) => Math.min(i + 1, total - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setIdx((i) => Math.max(i - 1, 0))
          } else if (e.key === "Enter") {
            if (shown && total > 0) {
              e.preventDefault()
              pick(idx)
            }
          } else if (e.key === "Escape") {
            if (shown) {
              e.stopPropagation()
              setOpen(false)
            } else if (hasQuery) {
              onQueryChange("")
            }
          }
        }}
        className={cn(
          "h-12 w-full rounded-sm border border-input border-b-ink/70 bg-paper pe-3 ps-10 text-base text-ink transition-[border-color] placeholder:text-placeholder hover:border-ink/60 focus-visible:border-ring",
          inputClassName,
        )}
      />

      <p role="status" aria-live="polite" className="sr-only">
        {shown ? (options.length > 0 ? `${options.length}件の候補があります。` : "候補は、ありません。") : ""}
      </p>

      {shown && (
        <div
          id={`${uid}-list`}
          role="listbox"
          aria-label={label ?? "候補"}
          className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 overflow-y-auto rounded-sm border border-ink/25 bg-paper p-1 shadow-lift"
        >
          {options.map((o, i) => (
            <div
              key={o.id}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={idx === i}
              // mousedown で選ぶ（click だと、先に入力欄のフォーカスが外れてしまう）。
              onMouseDown={(e) => {
                e.preventDefault()
                pick(i)
              }}
              onMouseEnter={() => setIdx(i)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[2px] px-2.5 py-1.5 text-[15px] leading-snug",
                idx === i ? "bg-marker-soft" : "bg-transparent",
              )}
            >
              {o.leading}
              <span className="min-w-0 flex-1">{o.label}</span>
              {o.hint && <span className="shrink-0 text-xs text-ink-soft">{o.hint}</span>}
            </div>
          ))}
          {options.length === 0 && !extra && <p className="px-2.5 py-3 text-sm text-ink-soft">{emptyText}</p>}
          {extra && (
            <div
              id={`${uid}-opt-${options.length}`}
              role="option"
              aria-selected={idx === options.length}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(options.length)
              }}
              onMouseEnter={() => setIdx(options.length)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-sm leading-snug",
                options.length > 0 && "mt-1 border-t border-rule pt-2",
                idx === options.length ? "bg-marker-soft" : "bg-transparent",
              )}
            >
              <span aria-hidden className="num text-base leading-none">＋</span>
              <span className="min-w-0 flex-1">{extra.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Combobox
