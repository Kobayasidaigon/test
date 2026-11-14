import { useEffect, useState, type ReactNode } from "react"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// shugar の Toast（21st.dev）をもとにした、短いお知らせ。
//
// もとの部品から残したもの:
// - 画面の外に置いた小さな入れ物（toastStore）に、どこからでもお知らせを足せる作り（useToasts）。
// - 数秒で消えること。マウスを乗せているあいだは、消えるまでの時間を止めること。
// - 「元に戻す」の操作を、お知らせの中に置けること。
//
// 変えたもの:
// - もとは createRoot で body に別の React を作っていたが、ページの中に <Toaster /> を置く形にした
//   （印刷のときに消す、読み上げの領域を1つにする、といった扱いを、ページの側で決められるように）。
// - 重なって縮む見せ方をやめて、下から順に積むだけにした（最大3つ）。
// - 「元に戻す」は、絵だけのボタンではなく、文字のボタンにした。キーボードでも届く。
// - 見た目を、机の上の「付せん」にした（蛍光ペンの黄色、黒いインクの文字）。エラーは、赤ペンの枠。
// - role="status"（エラーは role="alert"）で、読み上げに伝える。

type ToastType = "message" | "error"

type Toast = {
  id: number
  text: ReactNode
  type: ToastType
  /** 操作のボタン（「元に戻す」など）。 */
  action?: { label: string; onAction: () => void }
  timeout?: ReturnType<typeof setTimeout>
  remaining: number
  start: number
}

let toastId = 0

const toastStore = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(text: ReactNode, type: ToastType, action?: Toast["action"], duration?: number) {
    const id = toastId++
    // 操作のあるお知らせと、エラーは、読んで押す時間がいるので、長めに出す。
    const remaining = duration ?? (action ? 9000 : type === "error" ? 8000 : 3500)
    const toast: Toast = { id, text, type, action, remaining, start: Date.now() }
    toast.timeout = setTimeout(() => this.remove(id), remaining)
    // 積みすぎない。古いものから消す。
    while (this.toasts.length >= 3) this.remove(this.toasts[0].id)
    this.toasts = [...this.toasts, toast]
    this.notify()
    return id
  },

  remove(id: number) {
    const t = this.toasts.find((x) => x.id === id)
    if (t?.timeout) clearTimeout(t.timeout)
    this.toasts = this.toasts.filter((x) => x.id !== id)
    this.notify()
  },

  pauseAll() {
    for (const t of this.toasts) {
      if (!t.timeout) continue
      clearTimeout(t.timeout)
      t.timeout = undefined
      t.remaining -= Date.now() - t.start
    }
  },

  resumeAll() {
    for (const t of this.toasts) {
      if (t.timeout) continue
      t.start = Date.now()
      t.timeout = setTimeout(() => this.remove(t.id), Math.max(1500, t.remaining))
    }
  },

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  },

  notify() {
    this.listeners.forEach((fn) => fn())
  },
}

/** お知らせを出す。React の外（イベントの中）から呼べる。 */
export const toast = {
  message: (text: ReactNode, action?: Toast["action"]) => toastStore.add(text, "message", action),
  error: (text: ReactNode) => toastStore.add(text, "error"),
  dismiss: (id: number) => toastStore.remove(id),
}

/** もとの部品と同じ名前の入口。 */
export const useToasts = () => toast

/** お知らせを出す場所。ページに1つだけ置く。 */
export function Toaster({ className }: { className?: string }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    setToasts(toastStore.toasts)
    return toastStore.subscribe(() => setToasts(toastStore.toasts))
  }, [])

  return (
    <div
      className={cn("no-print pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-5 sm:items-end sm:px-0", className)}
      onMouseEnter={() => toastStore.pauseAll()}
      onMouseLeave={() => toastStore.resumeAll()}
      onFocus={() => toastStore.pauseAll()}
      onBlur={() => toastStore.resumeAll()}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-[26rem] animate-toast-in items-center gap-2 rounded-[2px] py-1.5 pe-1.5 ps-4 text-sm leading-6 text-ink shadow-lift",
            t.type === "error" ? "border-l-4 border-pen bg-paper" : "bg-marker",
          )}
        >
          <span className="min-w-0 flex-1 py-1.5">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="min-h-11 shrink-0 cursor-pointer rounded-sm border border-ink/60 bg-paper px-3 text-[13px] font-bold hover:border-ink"
              onClick={() => {
                t.action?.onAction()
                toastStore.remove(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="お知らせを閉じる"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink/70 hover:bg-ink/10 hover:text-ink"
            onClick={() => toastStore.remove(t.id)}
          >
            <XIcon aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
