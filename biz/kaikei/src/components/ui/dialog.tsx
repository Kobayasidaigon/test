import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn/ui の Dialog（Radix）を、ひきつぎ会計の見た目に合わせたもの。
// ・地は紙の色、見出しは明朝、上のふちに帳簿の二重線
// ・スマホでは、下から出る紙にする（親指が届くところにボタンが来る）。中身が長いときは、中だけを動かす
// ・閉じるボタンは 44px。フォーカスを中に閉じこめる、Esc で閉じる、はもとの部品のまま
// ・閉じたら、フォーカスを「開く前にいたところ」へ戻す（下の rememberOpener / restoreFocus）

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "no-print fixed inset-0 z-50 bg-sumi/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// ---- 閉じたあとのフォーカス ----
// このサービスのダイアログは、DialogTrigger を使わずに open の状態だけで開いている。そのため Radix は
// 「閉じたあとにフォーカスを戻す先」を知らず、閉じるとフォーカスがページの先頭（body）に落ちていた。
// キーボードだけで取引を直す人が、1件直すたびに、Tab で画面の先頭から送り直すことになる（点検で見つかった）。
// そこで、開いたときにフォーカスがあった要素を自分で覚えておき、閉じたときに、そこへ戻す。

type Opener = {
  /** 開く前にフォーカスがあった要素 */
  element: HTMLElement
  /** その要素の親をたどった列（近い順）。要素が消えていたときに、いちばん近い「まだ画面にある」ところへ戻すため */
  ancestors: HTMLElement[]
}

/** いちばん最近の、ダイアログの外の「開く前の場所」。ダイアログの中から次のダイアログを開いたとき（直す → 消す）に引き継ぐ。 */
let lastOutsideOpener: Opener | null = null

function rememberOpener(): Opener | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) return lastOutsideOpener
  // ダイアログの中のボタンから開いたときは、そのボタンは、もうすぐ消える。元のダイアログを開いた場所を引き継ぐ
  if (active.closest('[role="dialog"]')) return lastOutsideOpener
  const ancestors: HTMLElement[] = []
  for (let el = active.parentElement; el && el !== document.body; el = el.parentElement) ancestors.push(el)
  lastOutsideOpener = { element: active, ancestors }
  return lastOutsideOpener
}

function restoreFocus(opener: Opener | null): boolean {
  if (!opener) return false
  // 別のダイアログが開いているあいだは、戻さない（フォーカスは、そのダイアログの中にあるべきなので）
  if (document.querySelector('[role="dialog"][data-state="open"]')) return false
  if (opener.element.isConnected && !opener.element.hasAttribute('disabled')) {
    opener.element.focus()
    return document.activeElement === opener.element
  }
  // 元の要素が、もうない（消した取引の行など）。いちばん近い、まだ画面にある囲みへ移す。
  // 次の Tab が、その近くから始まる
  const near = opener.ancestors.find((el) => el.isConnected)
  if (!near) return false
  if (!near.hasAttribute('tabindex')) near.setAttribute('tabindex', '-1')
  near.focus({ preventScroll: true })
  return document.activeElement === near
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  const opener = React.useRef<Opener | null>(null)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onOpenAutoFocus={(event) => {
          // Radix がフォーカスを中へ移す前に呼ばれる。このとき、フォーカスはまだ「開いたボタン」にある
          opener.current = rememberOpener()
          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented) return
          if (restoreFocus(opener.current)) event.preventDefault()
        }}
        className={cn(
          "no-print fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border border-t-[3px] border-t-rule bg-paper text-foreground shadow-paper duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          // スマホ: 下から出る紙
          "inset-x-0 bottom-0 rounded-t-xl data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
          // パソコン: まん中に出る紙
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">閉じる</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 border-b border-border px-5 pb-4 pr-14 pt-5 sm:px-6", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

/** 中身。長いときは、ここだけが上下に動く（見出しとボタンは、いつも見えている）。 */
const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", className)} {...props} />
))
DialogBody.displayName = "DialogBody"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2.5 border-t border-border bg-background/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6", className)}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-serif text-xl font-bold leading-snug", className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-[0.94rem] leading-relaxed text-muted-foreground", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
