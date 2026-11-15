import * as React from "react"

import { cn } from "@/lib/utils"

// 21st.dev の Accessible Tooltip（a11ypros。MIT License の a11y-tooltip をもとにしたもの）を借りた、言葉のひとこと説明。
// もとのまま使っているところ: 説明を role="tooltip" にして、出ているあいだだけ aria-describedby でつなぐこと。
// マウスをのせる・フォーカスで開く。Esc で閉じる。説明の上にマウスを動かしても消えない。
// 画面のはしで切れないように、はみ出た分だけ横にずらす。字ではないきっかけは、点線の下線つきのボタンで包む。
// 変えたところ: もとの専用の CSS を使わず Tailwind で書き直した。スマホではマウスをのせられないので、押しても開く・閉じるようにした。
// 出る向きは「下」だけにした。見た目を、墨の地に紙の色の字に。

export function Hint({
  content,
  children,
  label,
  tabbable = true,
  className,
}: {
  /** 説明の文 */
  content: React.ReactNode
  /** きっかけになる字（「摘要」など）。渡さなければ「？」の丸いボタンになる */
  children?: React.ReactNode
  /** 「？」のボタンの、読み上げ用の名前 */
  label?: string
  /**
   * Tab キーで止まるか。入力欄が続くフォームの中では false にして、Tab で次の入力欄へまっすぐ進めるようにする
   * （そのときは、同じ説明を、入力欄の aria-describedby で読み上げに渡すこと）
   */
  tabbable?: boolean
  className?: string
}) {
  const id = React.useId()
  const tipRef = React.useRef<HTMLSpanElement>(null)
  const [open, setOpen] = React.useState(false)
  const [shiftX, setShiftX] = React.useState(0)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  React.useEffect(() => clear, [])

  // 画面のはしで切れないように、はみ出た分だけ横にずらす
  React.useLayoutEffect(() => {
    if (!open) {
      setShiftX(0)
      return
    }
    const el = tipRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 12
    if (rect.left < pad) setShiftX(pad - rect.left)
    else if (rect.right > window.innerWidth - pad) setShiftX(window.innerWidth - pad - rect.right)
  }, [open])

  // Esc で閉じる（フォーカスは動かさない）
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const openSoon = () => {
    clear()
    timer.current = setTimeout(() => setOpen(true), 120)
  }
  const closeSoon = () => {
    clear()
    timer.current = setTimeout(() => setOpen(false), 140)
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={children ? undefined : (label ?? "説明を見る")}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        tabIndex={tabbable ? undefined : -1}
        onMouseEnter={openSoon}
        onMouseLeave={closeSoon}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => {
          clear()
          setOpen((v) => !v)
        }}
        className={cn(
          // 見た目は字の大きさのまま、押せるところだけを上下に広げて 44px にする
          "relative inline-flex cursor-help items-center rounded-sm before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
          children
            ? "border-b border-dashed border-current pb-px leading-[1.35]"
            : "size-6 justify-center rounded-full border border-rule-ink/60 bg-paper text-[0.8rem] font-bold leading-none text-rule-ink",
        )}
      >
        {children ?? "？"}
      </button>
      {open && (
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          onMouseEnter={clear}
          onMouseLeave={closeSoon}
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
          className="absolute left-1/2 top-[calc(100%+0.45rem)] z-40 w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md bg-sumi px-3 py-2 text-left text-[0.86rem] font-normal leading-relaxed text-white shadow-paper"
        >
          {content}
        </span>
      )}
    </span>
  )
}

export default Hint
