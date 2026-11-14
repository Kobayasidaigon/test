import type React from "react"

import { cn } from "@/lib/utils"

// 21st.dev の Empty（cnippet-dev）をもとにした、「まだ何もない」ときの案内。
// もとのまま使っているところ: Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent に
// 分かれた組み立て方と、アイコンの紙が少しずれて3枚重なって見える飾り。
// 変えたところ: 重なった紙を、帳簿の紙（生成りのふち、青緑のアイコン）に。見出しを明朝に。余白を小さめに。

export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-input/60 bg-paper/60 px-5 py-10 text-center", className)}
      data-slot="empty"
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex max-w-md flex-col items-center text-center", className)} data-slot="empty-header" {...props} />
}

const mediaCard =
  "flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-paper text-rule-ink shadow-lift [&_svg]:size-6 [&_svg]:shrink-0"

export function EmptyMedia({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("relative mb-5", className)} data-slot="empty-media" aria-hidden="true" {...props}>
      {/* うしろに、少しずれた紙を2枚 */}
      <div className={cn(mediaCard, "pointer-events-none absolute bottom-px origin-bottom-left -translate-x-1 -rotate-12 scale-90 shadow-none")} />
      <div className={cn(mediaCard, "pointer-events-none absolute bottom-px origin-bottom-right translate-x-1 rotate-12 scale-90 shadow-none")} />
      <div className={cn(mediaCard, "relative")}>{children}</div>
    </div>
  )
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-serif text-lg font-bold leading-snug", className)} data-slot="empty-title" {...props} />
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-1.5 text-[0.94rem] leading-relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4", className)}
      data-slot="empty-description"
      {...props}
    />
  )
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex w-full min-w-0 max-w-md flex-col items-center gap-3", className)} data-slot="empty-content" {...props} />
}

export default Empty
