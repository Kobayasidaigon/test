import type React from "react"
import { cn } from "@/lib/utils"

// cnippet-dev の Empty（21st.dev）をもとにした、「まだ何もない」ときの表示。
// 組み立て（Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent）は、もとのまま。
// 見た目を、紙の上の「記入欄の空き」にした（破線の枠、左寄せにもできる）。
// もとの「重ねたアイコンの飾り」はやめて、EmptyMedia には、手描きの絵（SVG）をそのまま置く。

export function Empty({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-5 rounded-sm border-[1.5px] border-dashed border-ink/30 bg-muted/60 px-5 py-10 text-center",
        className,
      )}
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div data-slot="empty-header" className={cn("flex max-w-md flex-col items-center text-center", className)} {...props} />
}

export function EmptyMedia({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div data-slot="empty-media" aria-hidden className={cn("mb-3 flex shrink-0 items-center justify-center", className)} {...props} />
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div data-slot="empty-title" className={cn("text-lg font-bold leading-snug", className)} {...props} />
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p data-slot="empty-description" className={cn("mt-1.5 text-sm leading-7 text-ink-soft", className)} {...props} />
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div data-slot="empty-content" className={cn("flex w-full min-w-0 max-w-md flex-col items-center gap-3 text-sm", className)} {...props} />
}

export default Empty
