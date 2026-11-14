import type { ReactNode } from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// 21st.dev の Steps（adit-firdaus）をもとにした、「いま何番目か」を見せる部品。
// もとのまま使っているところ: 番号つきのリスト（ol）、いまの段に aria-current="step"、
// 済んだ段だけ押して戻れる（先の段は押せない）、段の状態を読み上げ用の文でも伝える、つなぎの線が済んだ分だけ色づく。
// 変えたところ: もとの専用の CSS と、すべるしるしの仕組みは使わず、Tailwind で書き直した。
// 番号の丸を、はんこの形に（いまの段は朱、済んだ段は青緑にチェック）。文を日本語に。

export type StepItem = {
  title: ReactNode
}

const STATUS_LABEL = { complete: "済み", current: "いまここ", upcoming: "これから" } as const

export function Steps({
  items,
  current,
  onStepChange,
  label = "進みぐあい",
  className,
}: {
  items: StepItem[]
  /** いまの段（0 から数える） */
  current: number
  /** 済んだ段を押したときに呼ばれる（渡さなければ、押せない） */
  onStepChange?: (index: number) => void
  label?: string
  className?: string
}) {
  return (
    <ol aria-label={label} className={cn("flex items-start", className)}>
      {items.map((item, index) => {
        const status = index < current ? "complete" : index === current ? "current" : "upcoming"
        const clickable = onStepChange !== undefined && status === "complete"
        const marker = (
          <span
            aria-hidden
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-serif text-base font-bold leading-none",
              status === "current" && "border-shu bg-shu text-white",
              status === "complete" && "border-rule-ink bg-rule-ink text-white",
              status === "upcoming" && "border-input bg-paper text-muted-foreground",
            )}
          >
            {status === "complete" ? <Check className="size-5" strokeWidth={3} /> : index + 1}
          </span>
        )
        const body = (
          <>
            {marker}
            <span className={cn("text-[0.86rem] leading-tight sm:text-[0.94rem]", status === "current" ? "font-bold text-foreground" : "text-muted-foreground")}>
              {item.title}
            </span>
            <span className="sr-only">（{STATUS_LABEL[status]}）</span>
          </>
        )
        return (
          <li key={index} aria-current={status === "current" ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center">
            {/* つなぎの線。済んだところまでが青緑になる */}
            {index > 0 && (
              <span
                aria-hidden
                className={cn("absolute right-1/2 top-[1.05rem] h-0.5 w-full -translate-y-1/2", index <= current ? "bg-rule-ink" : "bg-border")}
              />
            )}
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepChange(index)}
                className="relative z-[1] flex min-h-11 flex-col items-center gap-1.5 rounded-lg px-1 text-center hover:[&>span:first-child]:bg-[#154d49]"
              >
                {body}
              </button>
            ) : (
              <span className="relative z-[1] flex flex-col items-center gap-1.5 px-1 text-center">{body}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default Steps
