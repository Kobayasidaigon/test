import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn/ui の Alert をもとにした、お知らせの枠。
// もとのまま使っているところ: Alert / AlertTitle / AlertDescription の分け方と、左にアイコンを置く割りつけ。
// 変えたところ: 種類を4つに（お知らせ＝青緑、確かめてください＝からし色、できません＝朱、できました＝青緑の濃い色）。
// 左のふちを太い線にして、回覧板の付せんのように見せる。色だけにならないよう、種類ごとに形の違うアイコンを必ず出す。
// role は付けない（いつも出ている案内まで読み上げが割りこまないように）。急ぎの知らせは、使う側で role="alert" を付ける。

const alertVariants = cva("relative grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-l-[5px] px-4 py-3 text-[0.94rem] leading-relaxed", {
  variants: {
    variant: {
      info: "border-rule/45 border-l-rule bg-rule-soft/60 text-foreground [&>svg]:text-rule-ink",
      warn: "border-[#d9bb6a] border-l-[#b88a1c] bg-warn-soft text-foreground [&>svg]:text-warn",
      error: "border-shu/40 border-l-shu bg-shu-soft text-foreground [&>svg]:text-shu-ink",
      ok: "border-rule/45 border-l-rule-ink bg-paper text-foreground [&>svg]:text-rule-ink",
    },
  },
  defaultVariants: { variant: "info" },
})

const ICONS = { info: Info, warn: TriangleAlert, error: CircleAlert, ok: CircleCheck } as const

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, children, ...props }, ref) => {
    const Icon = ICONS[variant ?? "info"]
    return (
      <div ref={ref} className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon className="mt-[0.2rem] size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">{children}</div>
      </div>
    )
  },
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("font-bold leading-snug", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-0.5 [&_p+p]:mt-1.5", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription, AlertTitle }
