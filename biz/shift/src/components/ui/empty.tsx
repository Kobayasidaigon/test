// 21st.dev の「Empty」（cnippet-dev）をもとにした、「まだ何もない」ときの表示。
// 借りたところ: Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent に分けた組み立てと、
//   まん中の絵の後ろに、かたむけた札を2枚重ねる見せ方（EmptyMedia の variant="icon"）。
// 変えたところ: 後ろの2枚を、勤務のブロック（卵色と空色）にした。点線の枠を紺の輪郭線に。
//   うすい影と、すみの光沢の線をやめた。見出しの書体を、このサービスの見出しの書体に。
import type React from "react"
import { cn } from "@/lib/utils"

export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-ink/50 bg-card/60 px-5 py-10 text-center",
        className,
      )}
      data-slot="empty"
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex max-w-md flex-col items-center text-center", className)} data-slot="empty-header" {...props} />
}

/** まん中の絵。後ろに、かたむけたブロックが2枚のぞく */
export function EmptyMedia({ className, children, ...props }: React.ComponentProps<"div">) {
  const tile = "grid size-12 place-items-center rounded-lg border-2 border-ink"
  return (
    <div className={cn("relative mb-5", className)} data-slot="empty-media" aria-hidden {...props}>
      <div className={cn(tile, "pointer-events-none absolute bottom-0 origin-bottom-left -translate-x-2 -rotate-12 bg-shift-egg")} />
      <div className={cn(tile, "pointer-events-none absolute bottom-0 origin-bottom-right translate-x-2 rotate-12 bg-shift-sky")} />
      <div className={cn(tile, "relative bg-card text-ink [&_svg]:size-6")}>{children}</div>
    </div>
  )
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-display text-lg font-extrabold leading-snug", className)} data-slot="empty-title" {...props} />
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-1.5 text-sm leading-relaxed text-ink-soft", className)} data-slot="empty-description" {...props} />
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex w-full min-w-0 max-w-md flex-col items-center gap-3 text-sm", className)} data-slot="empty-content" {...props} />
}

export default Empty
