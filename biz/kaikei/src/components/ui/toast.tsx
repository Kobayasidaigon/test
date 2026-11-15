import { useEffect, useState, type ReactNode } from "react"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

// 21st.dev の Toast（shugar）をもとにした、画面のすみに少しのあいだ出る知らせ。
// もとのまま使っているところ: 画面の外に置いた小さな保管場所（toastStore）に知らせをためて、出す側はどこからでも
// toast.success(...) のように呼べる仕組み。時間がたつと自分で消える。マウスをのせているあいだは消えない。
// 新しいもの3つだけを出す。ボタン（action）を1つ付けられる。
// 変えたところ: もとは createRoot で別の場所に描いていたが、<Toaster /> を画面に置く形にした（印刷のときに消せるように）。
// 重ねて縮める飾りはやめて、下から積む。消えるまでの時間を長く（3秒 → 6秒。まちがいの知らせは 12秒）。
// 種類ごとに形の違うアイコンを出す。読み上げに伝える（role="status"、まちがいは role="alert"）。文と色を、ひきつぎ会計のものに。
// ダイアログが開いているあいだは、スマホでは画面の上に出す（ダイアログの下のボタンに、かぶさらないように）。

type ToastType = "message" | "success" | "warning" | "error"

type ToastItem = {
  id: number
  text: ReactNode
  type: ToastType
  action?: string
  onAction?: () => void
  timeout?: ReturnType<typeof setTimeout>
  remaining: number
  start: number
}

let nextId = 0

const toastStore = {
  toasts: [] as ToastItem[],
  listeners: new Set<() => void>(),

  add(text: ReactNode, type: ToastType, options: { action?: string; onAction?: () => void; duration?: number } = {}) {
    const id = nextId++
    const item: ToastItem = {
      id,
      text,
      type,
      action: options.action,
      onAction: options.onAction,
      remaining: options.duration ?? (type === "error" ? 12_000 : options.action ? 9_000 : 6_000),
      start: Date.now(),
    }
    item.timeout = setTimeout(() => toastStore.remove(id), item.remaining)
    toastStore.toasts = [...toastStore.toasts, item]
    toastStore.notify()
    return id
  },

  remove(id: number) {
    const item = toastStore.toasts.find((t) => t.id === id)
    if (item?.timeout) clearTimeout(item.timeout)
    toastStore.toasts = toastStore.toasts.filter((t) => t.id !== id)
    toastStore.notify()
  },

  pauseAll() {
    for (const t of toastStore.toasts) {
      if (!t.timeout) continue
      clearTimeout(t.timeout)
      t.timeout = undefined
      t.remaining -= Date.now() - t.start
    }
  },

  resumeAll() {
    for (const t of toastStore.toasts) {
      if (t.timeout) continue
      t.start = Date.now()
      t.timeout = setTimeout(() => toastStore.remove(t.id), Math.max(1_500, t.remaining))
    }
  },

  subscribe(listener: () => void) {
    toastStore.listeners.add(listener)
    return () => {
      toastStore.listeners.delete(listener)
    }
  },

  notify() {
    toastStore.listeners.forEach((fn) => fn())
  },
}

/** 知らせを出す。どこからでも呼べる（React の外からでも）。 */
export const toast = {
  message: (text: ReactNode, options?: { action?: string; onAction?: () => void; duration?: number }) => toastStore.add(text, "message", options),
  success: (text: ReactNode, options?: { action?: string; onAction?: () => void; duration?: number }) => toastStore.add(text, "success", options),
  warning: (text: ReactNode, options?: { action?: string; onAction?: () => void; duration?: number }) => toastStore.add(text, "warning", options),
  error: (text: ReactNode, options?: { action?: string; onAction?: () => void; duration?: number }) => toastStore.add(text, "error", options),
  dismiss: (id: number) => toastStore.remove(id),
}

const STYLE: Record<ToastType, string> = {
  message: "border-sumi bg-sumi text-white",
  success: "border-rule-ink bg-rule-ink text-white",
  warning: "border-[#b88a1c] bg-warn-soft text-foreground",
  error: "border-shu bg-shu-soft text-foreground",
}
const ICON = { message: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert } as const

/** 知らせを描く場所。道具の画面に1つだけ置く。 */
export function Toaster({ className }: { className?: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  useEffect(() => {
    setToasts(toastStore.toasts)
    return toastStore.subscribe(() => setToasts(toastStore.toasts))
  }, [])

  // ダイアログが開いているあいだは、スマホとタブレットでは、知らせを画面の上に出す。
  // スマホのダイアログは下から出る紙で、ボタンがいちばん下にある。知らせも下に出すと、「保存しました」の知らせが
  // 「消す」「繰り越す」などのボタンに、消えるまでかぶさって押せなかった（点検で見つかった）。
  // ダイアログは body の直下に足されるので、body の子の出入りと、開閉のしるし（data-state）だけを見張る
  const [dialogOpen, setDialogOpen] = useState(false)
  useEffect(() => {
    const check = () => setDialogOpen(document.querySelector('[role="dialog"][data-state="open"]') !== null)
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] })
    return () => observer.disconnect()
  }, [])

  const visible = toasts.slice(-3)
  return (
    <div
      data-dialog-open={dialogOpen || undefined}
      className={cn(
        "no-print pointer-events-none fixed inset-x-3 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-5 sm:w-[26rem]",
        className,
        // 上の位置の指定は、呼ぶ側の bottom の指定より後ろに置く（同じ強さなので、! を付けて勝たせる）
        dialogOpen && "max-lg:!bottom-auto max-lg:top-3",
      )}
      onMouseEnter={() => toastStore.pauseAll()}
      onMouseLeave={() => toastStore.resumeAll()}
      onFocus={() => toastStore.pauseAll()}
      onBlur={() => toastStore.resumeAll()}
    >
      {visible.map((t) => {
        const Icon = ICON[t.type]
        const dark = t.type === "message" || t.type === "success"
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border-[1.5px] py-2.5 pl-3.5 pr-1.5 text-[0.94rem] leading-snug shadow-paper animate-in fade-in-0 slide-in-from-bottom-3 duration-200",
              STYLE[t.type],
            )}
          >
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 py-0.5">{t.text}</div>
            {t.action && (
              <button
                type="button"
                className={cn(
                  "min-h-11 shrink-0 rounded-md border px-3 text-[0.9rem] font-bold",
                  dark ? "border-white/60 hover:bg-white/15" : "border-sumi/50 bg-paper hover:bg-muted",
                )}
                onClick={() => {
                  t.onAction?.()
                  toastStore.remove(t.id)
                }}
              >
                {t.action}
              </button>
            )}
            <button
              type="button"
              aria-label="この知らせを閉じる"
              className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-md", dark ? "hover:bg-white/15" : "hover:bg-sumi/10")}
              onClick={() => toastStore.remove(t.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
