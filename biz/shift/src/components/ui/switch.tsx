// 21st.dev の「Switch」（halaska-studio）をもとにした、入・切の切り替え。
// 借りたところ: <button role="switch" aria-checked> と、となりのラベルを1つの <label> でくるむ組み立て、
//   つまみが少しはずんで動く動き。
// 変えたところ: もとはテーマ用の部品（usePal など）に頼っていたので、Tailwind のクラスだけで書き直した。
//   丸いつまみをやめ、ブロックと同じ角ばった四角に。入のときは紺の地に卵色のつまみ、切のときは白の地に紺のつまみ。
//   色だけに頼らないよう、つまみの位置に加えて「入」「切」の字を出している。
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** 右に出すラベル */
  label?: ReactNode
  /** ラベルの下に出す、小さな説明 */
  description?: ReactNode
  "aria-label"?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-1.5", disabled && "cursor-not-allowed opacity-50", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-8 w-[3.75rem] shrink-0 rounded-md border-2 border-ink transition-colors duration-150",
          checked ? "bg-ink" : "bg-card",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 grid w-6 -translate-y-1/2 place-items-center text-[11px] font-extrabold leading-none",
            checked ? "left-1 text-paper" : "right-1 text-ink-soft",
          )}
        >
          {checked ? "入" : "切"}
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute top-[3px] size-[22px] rounded-[4px] border-2 border-ink transition-[left,background-color] duration-200 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
            checked ? "left-[31px] bg-shift-egg" : "left-[3px] bg-ink",
          )}
        />
      </button>
      {label || description ? (
        <span className="min-w-0 pt-1">
          {label ? <span className="block text-[15px] font-bold leading-snug">{label}</span> : null}
          {description ? <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{description}</span> : null}
        </span>
      ) : null}
    </label>
  )
}

export default Switch
