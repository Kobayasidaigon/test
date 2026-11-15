// 21st.dev の「Animated Dialog」（rmahammad）をもとにした、ダイアログ。
// もとの考え方をそのまま使っている:
//   - Radix Dialog にまかせるもの（フォーカスを中に閉じこめる、Esc で閉じる、外を押すと閉じる、aria-modal）
//   - 幅 640px 以下では、下から出てくるシート（指が届く位置に操作が来る）
//   - 頭（Header）と足（Footer）は動かず、中身（Body）だけがスクロールする
// 見た目は作り変えた: すりガラスと、ぼかした影をやめ、紺の輪郭線と、ずらした影にした。
import * as React from "react"
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const EASE = [0.2, 0, 0, 1] as const
/** はずまずに、すっと止まるばね */
const SPRING: Transition = { type: "spring", stiffness: 460, damping: 38, mass: 0.9 }

const CENTER_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.98 },
} as const
const SHEET_MOTION = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
} as const

/** 画面の幅を見る。最初の描画では false（静的HTMLと同じ結果にするため） */
export function useIsMobile(query = "(max-width: 640px)") {
  const [matches, setMatches] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [query])
  return matches
}

const OpenContext = React.createContext(false)
/** 閉じたあとにフォーカスを戻す先（開いたときにフォーカスがあった要素）を返す */
const ReturnFocusContext = React.createContext<() => HTMLElement | null>(() => null)

export interface DialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  /**
   * 開いたボタンがもう画面にないとき（メニューの中のボタンから開いたときなど）に、フォーカスを戻す先。
   * 指定がなく、開いたボタンもないときは、どこにも戻さない。
   */
  returnFocus?: React.RefObject<HTMLElement | null>
}

export function Dialog({ open: openProp, defaultOpen, onOpenChange, children, returnFocus, ...props }: DialogProps) {
  // 閉じるときの動き（AnimatePresence）のために、開いているかどうかを自分でも持つ
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : uncontrolled

  // このダイアログは Trigger を使わずに開け閉めしているので、Radix は「どのボタンから開いたか」を知らない。
  // そのままでは、閉じたときにフォーカスが body に落ち、キーボードの人はページの頭から Tab を押し直すことになる。
  // そこで、開いた瞬間にフォーカスがあった要素を覚えておき、閉じたらそこへ戻す。
  // 描く前（open が true になった最初の描画）に読む。Radix がフォーカスを中へ移すのは、そのあと（effect の中）
  const opener = React.useRef<HTMLElement | null>(null)
  const wasOpen = React.useRef(false)
  if (open && !wasOpen.current && typeof document !== "undefined") {
    const el = document.activeElement
    opener.current = el instanceof HTMLElement && el !== document.body ? el : null
  }
  wasOpen.current = open
  const getReturn = React.useCallback(() => {
    const el = opener.current
    if (el && el.isConnected) return el
    return returnFocus?.current ?? null
  }, [returnFocus])
  const handle = React.useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  return (
    <OpenContext.Provider value={open}>
      <ReturnFocusContext.Provider value={getReturn}>
        <DialogPrimitive.Root open={open} onOpenChange={handle} {...props}>
          {children}
        </DialogPrimitive.Root>
      </ReturnFocusContext.Provider>
    </OpenContext.Provider>
  )
}

export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-lg font-extrabold leading-snug text-ink", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("mt-1 text-sm leading-relaxed text-ink-soft", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

/** 動かない頭の部分 */
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0 px-5 pb-3 pt-5 pr-14", className)} {...props} />
}
/** ここだけがスクロールする */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-1", className)} {...props} />
}
/** 動かない足の部分（操作のボタンが、いつも見える） */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2 border-t-2 border-ink bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4", className)}
      {...props}
    />
  )
}

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** 右上の「閉じる」を出すか */
  showClose?: boolean
  /** 幅 640px 以下でも、下からのシートにせず、まん中に出す */
  centeredOnMobile?: boolean
}

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, showClose = true, centeredOnMobile = false, onCloseAutoFocus, ...props }, ref) => {
    const open = React.useContext(OpenContext)
    const getReturn = React.useContext(ReturnFocusContext)
    // 呼ぶ側が戻し先を決めていれば（④のマスのシートなど）それに任せ、決めていなければ、開いたボタンへ戻す
    const closeAutoFocus = (e: Event) => {
      onCloseAutoFocus?.(e)
      if (e.defaultPrevented) return
      const el = getReturn()
      if (!el) return
      e.preventDefault()
      el.focus({ preventScroll: true })
    }
    const reduce = useReducedMotion()
    const isMobile = useIsMobile()
    const isSheet = isMobile && !centeredOnMobile
    const variants = isSheet ? SHEET_MOTION : CENTER_MOTION

    return (
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="no-print fixed inset-0 z-50 bg-ink/45"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
              />
            </DialogPrimitive.Overlay>
            {/* まん中に置くための枠。motion の transform と、位置合わせの transform がぶつからないようにする */}
            <div className={cn("no-print pointer-events-none fixed inset-0 z-50 flex", isSheet ? "items-end" : "items-center justify-center p-4")}>
              <DialogPrimitive.Content asChild forceMount ref={ref} onCloseAutoFocus={closeAutoFocus} {...props}>
                <motion.div
                  className={cn(
                    "pointer-events-auto relative flex w-full flex-col overflow-hidden border-2 border-ink bg-card text-ink focus:outline-none",
                    isSheet ? "max-h-[90dvh] rounded-t-2xl border-b-0" : "max-h-[86dvh] max-w-lg rounded-xl shadow-hard-lg",
                    className,
                  )}
                  initial={reduce ? false : variants.initial}
                  animate={variants.animate}
                  exit={variants.exit}
                  transition={reduce ? { duration: 0 } : SPRING}
                >
                  {isSheet ? <span aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/25" /> : null}
                  {showClose ? (
                    <DialogPrimitive.Close
                      aria-label="閉じる"
                      className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-lg text-ink transition-colors hover:bg-well"
                    >
                      <X aria-hidden className="size-5" strokeWidth={2.5} />
                    </DialogPrimitive.Close>
                  ) : null}
                  {children}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    )
  },
)
DialogContent.displayName = "DialogContent"
