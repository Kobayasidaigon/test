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
// - 「元に戻す」は、Ctrl+Z（Mac は ⌘+Z）でも押せる。お知らせはページのいちばん最後にあるので、
//   キーボードだけの人は、消える前に Tab で届かないため（行を消したあと、フォーカスは次の行の金額に移る）。
// - スマホで、下から出る紙（Dialog）が開いているあいだは、画面の上に出す（index.css の [data-toaster]）。
//   紙の下のほうにある、エラーの文やボタンに重ならないように。

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
  /** 出した時刻。そのあとに文字を打ったかどうかを見るため。 */
  createdAt: number
}

let toastId = 0

const toastStore = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(text: ReactNode, type: ToastType, action?: Toast["action"], duration?: number) {
    const id = toastId++
    // 操作のあるお知らせと、エラーは、読んで押す時間がいるので、長めに出す。
    const remaining = duration ?? (action ? 9000 : type === "error" ? 8000 : 3500)
    const toast: Toast = { id, text, type, action, remaining, start: Date.now(), createdAt: Date.now() }
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

  /** 「元に戻す」などの操作が付いた、いちばん新しいお知らせ。 */
  latestWithAction(): Toast | undefined {
    for (let i = this.toasts.length - 1; i >= 0; i--) if (this.toasts[i].action) return this.toasts[i]
    return undefined
  },
}

/** キーボードで元に戻せるか（Ctrl+Z か ⌘+Z）を、押す人に伝える文。Mac かどうかは、描いたあとに見る。 */
function undoKeyLabel(): string {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘+Z" : "Ctrl+Z"
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

  const [undoKey, setUndoKey] = useState("Ctrl+Z")

  useEffect(() => {
    setToasts(toastStore.toasts)
    setUndoKey(undoKeyLabel())
    return toastStore.subscribe(() => setToasts(toastStore.toasts))
  }, [])

  // Ctrl+Z（⌘+Z）で、いちばん新しいお知らせの「元に戻す」を押す。
  // ただし、お知らせが出たあとに入力欄で文字を打っていたら、何もしない（入力欄の「打った文字を戻す」を、横取りしないため）。
  useEffect(() => {
    let typedAt = 0
    const onInput = () => {
      typedAt = Date.now()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.isComposing || e.key.toLowerCase() !== "z") return
      const t = toastStore.latestWithAction()
      if (!t || typedAt >= t.createdAt) return
      e.preventDefault()
      t.action?.onAction()
      toastStore.remove(t.id)
      // ボタンを押したときと違って、画面のどこも見ていないことがあるので、戻したことを言う。
      toastStore.add("元に戻しました。", "message")
    }
    document.addEventListener("input", onInput, true)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("input", onInput, true)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <div
      data-toaster
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
              aria-keyshortcuts="Control+Z Meta+Z"
              title={`${undoKey} でも押せます`}
              className="min-h-11 shrink-0 cursor-pointer rounded-sm border border-ink/60 bg-paper px-3 text-[13px] font-bold leading-tight hover:border-ink"
              onClick={() => {
                t.action?.onAction()
                toastStore.remove(t.id)
              }}
            >
              {t.action.label}
              {/* キーボードのある端末（マウスを乗せられる端末）でだけ、ショートカットを小さく添える。読み上げにも伝える。 */}
              <span className="hidden text-[11px] font-normal text-ink-soft [@media(hover:hover)]:block">{undoKey}</span>
              <span className="sr-only [@media(hover:hover)]:hidden">（{undoKey} でも押せます）</span>
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
