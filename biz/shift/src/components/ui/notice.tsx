// 21st.dev の「Alert」（shadcn）をもとにした、画面の中の知らせ。
// 借りたところ: 絵（左）と、見出し（NoticeTitle）・本文（NoticeBody）に分けた組み立て、種類（variant）で色を変える作り。
// 変えたところ: 種類を4つにした（info / ok / warn / danger）。色だけで伝えないよう、種類ごとに決まった絵を自動で出す。
//   うすい枠をやめ、左に太い帯を付けた紺の輪郭線の箱に。role は、急ぎの知らせ（danger）だけ alert にした。
import * as React from "react"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const noticeVariants = cva("relative flex w-full gap-3 rounded-lg border-2 border-l-[10px] px-3.5 py-3 text-sm leading-relaxed", {
  variants: {
    variant: {
      info: "border-ink bg-card text-ink",
      ok: "border-ok bg-ok-soft text-ink",
      warn: "border-ink border-l-shift-orange bg-[#fff4cf] text-ink",
      danger: "border-danger bg-danger-soft text-ink",
    },
  },
  defaultVariants: { variant: "info" },
})

const ICONS = { info: Info, ok: CheckCircle2, warn: AlertTriangle, danger: OctagonAlert } as const
const ICON_COLOR = { info: "text-ink", ok: "text-ok", warn: "text-ink", danger: "text-danger" } as const

export interface NoticeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof noticeVariants> {
  /** 絵を出さない */
  noIcon?: boolean
}

export const Notice = React.forwardRef<HTMLDivElement, NoticeProps>(({ className, variant, noIcon, children, role, ...props }, ref) => {
  const v = variant ?? "info"
  const Icon = ICONS[v]
  return (
    <div ref={ref} role={role ?? (v === "danger" ? "alert" : undefined)} className={cn(noticeVariants({ variant }), className)} {...props}>
      {noIcon ? null : <Icon aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", ICON_COLOR[v])} strokeWidth={2.4} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
})
Notice.displayName = "Notice"

export function NoticeTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-bold leading-snug", className)} {...props} />
}

export function NoticeBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-[13.5px] leading-relaxed [p+&]:mt-1", className)} {...props} />
}
