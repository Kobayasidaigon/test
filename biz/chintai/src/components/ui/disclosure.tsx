import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

// ddoemonn の Accordion（21st.dev）をもとにした、開いたり閉じたりする欄。
//
// もとの部品から残したもの:
// - useAccordion（開いている欄の管理、見出しのボタンに付ける属性、↓↑・Home・End で見出しの間を動く）。
// - 閉じている中身には inert を付けて、Tab で入れないようにすること。
//
// 変えたもの:
// - 見出しと中身の見た目は、使う側（点検の結果の1行）が決めるので、ここは「ふるまい」と「開く動き」だけにした。
// - 高さを測って動かす仕組み（motion と ResizeObserver）をやめて、CSS の grid（0fr → 1fr）で開く。
//   印刷のときに、CSS だけで全部開けるようにするため（index.css の [data-disclosure-panel]）。
// - いくつでも同時に開ける形（multiple）を基本にして、「全部開く／全部閉じる」を足した。
// - 中身の高さに上限を付けない（中でスクロールさせない。根拠の文は、全部見えたほうがよい）。

const useInertWhenClosed = (open: boolean) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { inert?: boolean }) | null
    if (!el) return
    el.inert = !open
    return () => {
      el.inert = false
    }
  }, [open])
  return ref
}

export type AccordionHeaderProps = {
  id: string
  ref: (node: HTMLButtonElement | null) => void
  type: "button"
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
  "aria-expanded": boolean
  "aria-controls": string
}

export type AccordionPanelProps = {
  id: string
  role: "region"
  "aria-labelledby": string
  open: boolean
}

export type UseAccordionOptions = {
  /** 欄の ID（並び順）。 */
  ids: readonly string[]
  /** はじめから開けておく欄。 */
  defaultOpen?: readonly string[]
}

export function useAccordion({ ids, defaultOpen = [] }: UseAccordionOptions) {
  const base = useId()
  const [open, setOpen] = useState<string[]>(() => defaultOpen.slice())

  const headers = useRef(new Map<string, HTMLButtonElement>())
  const binders = useRef(new Map<string, AccordionHeaderProps["ref"]>())

  const headerRef = useCallback((id: string): AccordionHeaderProps["ref"] => {
    const cached = binders.current.get(id)
    if (cached) return cached
    const bind = (node: HTMLButtonElement | null) => {
      if (node) headers.current.set(id, node)
      else headers.current.delete(id)
    }
    binders.current.set(id, bind)
    return bind
  }, [])

  const isOpen = useCallback((id: string) => open.includes(id), [open])

  const toggle = useCallback((id: string) => {
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const order = useMemo(() => ids.slice(), [ids])

  const move = useCallback(
    (id: string, delta: number, edge: "first" | "last" | null) => {
      if (order.length === 0) return
      const at = order.indexOf(id)
      if (at < 0) return
      const next = edge === "first" ? 0 : edge === "last" ? order.length - 1 : (at + delta + order.length) % order.length
      headers.current.get(order[next])?.focus()
    },
    [order],
  )

  const headerProps = useCallback(
    (id: string): AccordionHeaderProps => ({
      id: `${base}-header-${id}`,
      ref: headerRef(id),
      type: "button",
      onClick: () => toggle(id),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "ArrowDown") {
          event.preventDefault()
          move(id, 1, null)
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          move(id, -1, null)
        } else if (event.key === "Home") {
          event.preventDefault()
          move(id, 0, "first")
        } else if (event.key === "End") {
          event.preventDefault()
          move(id, 0, "last")
        }
      },
      "aria-expanded": open.includes(id),
      "aria-controls": `${base}-panel-${id}`,
    }),
    [base, open, toggle, move, headerRef],
  )

  const panelProps = useCallback(
    (id: string): AccordionPanelProps => ({
      id: `${base}-panel-${id}`,
      role: "region",
      "aria-labelledby": `${base}-header-${id}`,
      open: open.includes(id),
    }),
    [base, open],
  )

  const openAll = useCallback(() => setOpen(order.slice()), [order])
  const closeAll = useCallback(() => setOpen([]), [])
  /** 1つの欄を開く（もう開いていれば、そのまま）。 */
  const openOne = useCallback((id: string) => setOpen((prev) => (prev.includes(id) ? prev : [...prev, id])), [])

  return { open, isOpen, toggle, headerProps, panelProps, openAll, closeAll, openOne, allOpen: order.length > 0 && order.every((id) => open.includes(id)) }
}

/**
 * 開いたり閉じたりする中身。useAccordion の panelProps をそのまま渡す。
 * 閉じているときも、中身は HTML に残す（印刷のときに、CSS だけで開けるように）。
 */
export function DisclosurePanel({ open, className, children, ...rest }: AccordionPanelProps & { className?: string; children: ReactNode }) {
  const ref = useInertWhenClosed(open)
  return (
    <div
      data-disclosure-panel
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div ref={ref} {...rest} aria-hidden={open ? undefined : true} className={cn("min-h-0 overflow-hidden", className)}>
        {children}
      </div>
    </div>
  )
}

/** 見出しの右に置く、開閉の矢じり。 */
export function DisclosureChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180", className)}
    >
      <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
