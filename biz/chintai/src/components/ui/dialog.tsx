import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn の Dialog（21st.dev、Radix）をもとにした、上に重ねる画面。
// 机の上に、もう1枚の紙を置いた見た目にした（白い紙、角は丸めない、紙の影）。
// スマホでは、画面の下から出る紙にして、親指が届くところにボタンが来るようにしている。
// フォーカスを中に閉じ込めること、Esc で閉じること、閉じたら元のボタンにフォーカスを戻すことは、Radix がやってくれる。

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
      "no-print fixed inset-0 z-50 bg-[#1b2433]/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/** 重ねる紙の、置き場所と見た目。AlertDialog でも同じものを使う。 */
export const dialogPaperClass =
  "no-print fixed z-50 flex bg-paper text-ink max-h-[calc(100dvh-1.5rem)] w-full flex-col gap-4 overflow-y-auto p-5 shadow-lift duration-200 " +
  "inset-x-0 bottom-0 rounded-t-md pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2px] sm:p-7 " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
  "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:slide-in-from-bottom-2 sm:data-[state=closed]:slide-out-to-bottom-2"

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn(dialogPaperClass, className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-2 top-2 grid size-11 cursor-pointer place-items-center rounded-sm text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink">
        <X aria-hidden className="size-5" />
        <span className="sr-only">閉じる</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pe-10", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-bold leading-snug", className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm leading-7 text-ink-soft", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
