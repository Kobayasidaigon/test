// 21st.dev の「Toast」（shugar）をもとにした、短いお知らせ。
// 借りたところ: 部品の外に置いた小さな入れ物（toastStore）に足していく作り、
//   マウスを乗せているあいだは消えるまでの時間を止める（pause / resume）、取り消し（Undo）の操作つきのお知らせ。
// 変えたところ: もとは createRoot で body に別の React を足していたが、<Toaster /> を画面の中に1つ置く形にした
//   （1ファイルのビルドでページを切り替えても、残りかすが出ないように）。
//   重ねて奥に引っこむ動きはやめ、下から順に積むだけにした。見た目は紺の地に白ぬきの字、卵色のずらした影。
//   読み上げのために role="status" を付けた。操作つきのお知らせは、押しそこねないよう長めに出す。
import { useEffect, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastKind = "message" | "success" | "error"

export type ToastAction = {
  label: string
  onClick: () => void
  /**
   * この操作（元に戻す、など）が有効なあいだの「いまの状態」。
   * dropStale に別の状態がわたされたら、このお知らせは消える
   * （そのあとで別の変更をしたのに、古いお知らせの「元に戻す」で別のものが戻ってしまうのを防ぐ）。
   */
  validFor?: unknown
}

type Toast = {
  id: number
  text: ReactNode
  kind: ToastKind
  action?: ToastAction
  timeout?: ReturnType<typeof setTimeout>
  remaining: number
  start: number
}

let nextId = 0
const store = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),
  notify() {
    this.listeners.forEach((fn) => fn())
  },
  add(text: ReactNode, kind: ToastKind, action?: Toast["action"]) {
    const id = nextId++
    // 取り消しのボタンがあるときは、読んで押すまでの時間を長めに取る
    const toast: Toast = { id, text, kind, action, remaining: action ? 8000 : kind === "error" ? 7000 : 3500, start: Date.now() }
    toast.timeout = setTimeout(() => this.remove(id), toast.remaining)
    // 同時に出すのは3つまで（古いものから消す）
    this.toasts = [...this.toasts.slice(-2), toast]
    this.notify()
  },
  remove(id: number) {
    const t = this.toasts.find((x) => x.id === id)
    if (t?.timeout) clearTimeout(t.timeout)
    this.toasts = this.toasts.filter((x) => x.id !== id)
    this.notify()
  },
  dropStale(current: unknown) {
    const kept = this.toasts.filter((t) => !t.action || !("validFor" in t.action) || t.action.validFor === current)
    if (kept.length === this.toasts.length) return
    for (const t of this.toasts) if (!kept.includes(t) && t.timeout) clearTimeout(t.timeout)
    this.toasts = kept
    this.notify()
  },
  pause() {
    for (const t of this.toasts) {
      if (!t.timeout) continue
      clearTimeout(t.timeout)
      t.timeout = undefined
      t.remaining -= Date.now() - t.start
    }
  },
  resume() {
    for (const t of this.toasts) {
      if (t.timeout) continue
      t.start = Date.now()
      t.timeout = setTimeout(() => this.remove(t.id), Math.max(1000, t.remaining))
    }
  },
}

/** お知らせを出す。どこからでも呼べる（画面に <Toaster /> が1つ置いてあること） */
export const toast = {
  message: (text: ReactNode, action?: Toast["action"]) => store.add(text, "message", action),
  success: (text: ReactNode, action?: Toast["action"]) => store.add(text, "success", action),
  error: (text: ReactNode) => store.add(text, "error"),
  /** 状態が変わったことを知らせる。古い状態のための操作つきのお知らせを消す */
  dropStale: (current: unknown) => store.dropStale(current),
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    const update = () => setToasts([...store.toasts])
    update()
    store.listeners.add(update)
    return () => {
      store.listeners.delete(update)
    }
  }, [])

  return (
    <div
      // スマホでは上に出す（下からのシートや、下にある操作のボタンを、お知らせでかくさないため）
      className="no-print pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:bottom-0 sm:top-auto sm:items-end sm:px-5 sm:pb-5 sm:pt-0"
      onMouseEnter={() => store.pause()}
      onMouseLeave={() => store.resume()}
      onFocus={() => store.pause()}
      onBlur={() => store.resume()}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border-2 py-2 pl-4 pr-2 text-sm font-bold leading-relaxed animate-in fade-in duration-200 max-sm:slide-in-from-top-3 sm:slide-in-from-bottom-3",
            t.kind === "error" ? "border-danger bg-card text-danger shadow-[3px_3px_0_0_var(--danger)]" : "border-ink bg-ink text-paper shadow-[3px_3px_0_0_var(--shift-egg)]",
          )}
        >
          <span className="min-w-0 flex-1 py-1">{t.text}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick()
                store.remove(t.id)
              }}
              className="min-h-11 shrink-0 rounded-md border-2 border-paper bg-shift-egg px-3 text-sm font-extrabold text-ink"
            >
              {t.action.label}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="このお知らせを閉じる"
            onClick={() => store.remove(t.id)}
            className={cn("grid size-11 shrink-0 place-items-center rounded-md", t.kind === "error" ? "hover:bg-danger-soft" : "hover:bg-paper/15")}
          >
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
