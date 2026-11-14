import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

// ddoemonn の Copy Button（21st.dev）をもとにした、コピーのボタン。
//
// もとの部品から残したもの:
// - useCopyToClipboard（navigator.clipboard が使えないブラウザでは、見えない入力欄と execCommand でコピーする）。
// - 「コピーする → コピーしました → 数秒で戻る」の3つの状態と、失敗のときの表示。
// - チェックの印が、線を描くように出ること。読み上げにも結果を伝えること。
//
// 変えたもの:
// - motion のばねの動きをやめて、CSS だけにした（ボタンの見た目は、サイト共通の Button と同じ）。
// - チェックの印を、手描きの赤ペンの線にした。
// - 文字が切りかわってもボタンの幅が変わらないように、3つの文を同じマスに重ねて置いている（ここは、もとのまま）。

export type CopyStatus = "idle" | "copied" | "error"

function writeFallback(text: string): boolean {
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.top = "0"
  area.style.left = "0"
  area.style.opacity = "0"
  document.body.appendChild(area)

  const selection = document.getSelection()
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  area.select()
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }

  document.body.removeChild(area)
  if (selection && previous) {
    selection.removeAllRanges()
    selection.addRange(previous)
  }
  return ok
}

export function useCopyToClipboard({ timeout = 2500, onCopy }: { timeout?: number; onCopy?: (value: string) => void } = {}) {
  const [status, setStatus] = useState<CopyStatus>("idle")
  const [ticket, setTicket] = useState(0)

  const mounted = useRef(true)
  const copied = useRef(onCopy)
  copied.current = onCopy

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const copy = useCallback(async (text: string) => {
    if (!text) return false
    let ok = false
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        ok = true
      } else {
        ok = writeFallback(text)
      }
    } catch {
      try {
        ok = writeFallback(text)
      } catch {
        ok = false
      }
    }
    if (!mounted.current) return ok
    setStatus(ok ? "copied" : "error")
    setTicket((t) => t + 1)
    if (ok) copied.current?.(text)
    return ok
  }, [])

  useEffect(() => {
    if (ticket === 0 || status === "idle") return
    const id = setTimeout(() => setStatus("idle"), timeout)
    return () => clearTimeout(id)
  }, [ticket, status, timeout])

  return { copy, status }
}

export type CopyButtonProps = {
  /** コピーする文字。 */
  value: string
  label?: string
  copiedLabel?: string
  errorLabel?: string
  onCopy?: (value: string) => void
  disabled?: boolean
  className?: string
} & VariantProps<typeof buttonVariants>

export function CopyButton({
  value,
  label = "コピーする",
  copiedLabel = "コピーしました",
  errorLabel = "コピーできません",
  onCopy,
  disabled = false,
  className,
  variant,
  size,
}: CopyButtonProps) {
  const { copy, status } = useCopyToClipboard({ onCopy })

  const labels: Array<[CopyStatus, string]> = [
    ["idle", label],
    ["copied", copiedLabel],
    ["error", errorLabel],
  ]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void copy(value)
      }}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      <span className="grid size-[18px] shrink-0" aria-hidden>
        <svg
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("col-start-1 row-start-1 size-[18px] transition-opacity duration-150", status === "idle" ? "opacity-100" : "opacity-0")}
        >
          <path d="M12.2 6.4V4.6A1.9 1.9 0 0 0 10.3 2.7H4.6A1.9 1.9 0 0 0 2.7 4.6v5.7a1.9 1.9 0 0 0 1.9 1.9h1.8" />
          <rect x="6.4" y="6.4" width="8.9" height="8.9" rx="1.9" />
        </svg>
        {status === "copied" && (
          <svg viewBox="0 0 18 18" className="pen-draw col-start-1 row-start-1 size-[18px] overflow-visible">
            <path className="pen-stroke" pathLength={1} d="M 2.5 9.5 C 4 11 5.6 13 7 15.5 C 9.4 10 12.6 5.6 16.5 2" strokeWidth={2.2} style={{ animationDuration: "0.3s" }} />
          </svg>
        )}
        {status === "error" && (
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="col-start-1 row-start-1 size-[18px]">
            <path d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5" />
          </svg>
        )}
      </span>

      <span aria-hidden className="relative grid text-left">
        {labels.map(([key, text]) => (
          <span key={key} className={cn("col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-150", key === status ? "opacity-100" : "opacity-0")}>
            {text}
          </span>
        ))}
      </span>

      {/* 読み上げには、いまの状態の文だけを伝える。 */}
      <span className="sr-only">{status === "idle" ? label : ""}</span>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? copiedLabel : status === "error" ? errorLabel : ""}
      </span>
    </button>
  )
}

export default CopyButton
