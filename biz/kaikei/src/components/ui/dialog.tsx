import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn/ui の Dialog（Radix）を、ひきつぎ会計の見た目に合わせたもの。
// ・地は紙の色、見出しは明朝、上のふちに帳簿の二重線
// ・スマホでは、下から出る紙にする（親指が届くところにボタンが来る）。中身が長いときは、中だけを動かす
// ・閉じるボタンは 44px。フォーカスを中に閉じこめる、Esc で閉じる、はもとの部品のまま

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

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
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
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 border-b border-border px-5 pb-4 pr-14 pt-5 sm:px-6", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

/** 中身。長いときは、ここだけが上下に動く（見出しとボタンは、いつも見えている）。 */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", className)} {...props} />
)
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
