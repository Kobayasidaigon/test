import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// 21st.dev の Switch（kemiljk）をもとにした、入・切の切り替え。
// もとのまま使っているところ: 本物の button に role="switch" と aria-checked を付ける作り
// （クリック・スペース・Enter・フォーカスが、そのまま使える）。label で包むと、文のところを押しても切り替わる。
// 変えたところ: もとの専用の CSS を使わず Tailwind で書き直した。入のときは青緑。
// 色だけにならないよう、つまみの中に「入」「切」の字を出す。押せる高さは 44px。

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: ReactNode
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, disabled = false, children, className, ...rest },
  ref,
) {
  const control = (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-[3.4rem] shrink-0 items-center rounded-full border-[1.5px] transition-colors disabled:opacity-50",
        checked ? "border-rule-ink bg-rule-ink" : "border-input bg-muted",
        // 見た目は小さくても、押せるところは 44px にする
        "before:absolute before:-inset-y-2 before:-inset-x-1 before:content-['']",
        !children && className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[1.45rem] items-center justify-center rounded-full bg-paper text-[0.62rem] font-bold leading-none shadow-lift transition-transform",
          checked ? "translate-x-[1.75rem] text-rule-ink" : "translate-x-[1px] text-muted-foreground",
        )}
      >
        {checked ? "入" : "切"}
      </span>
    </button>
  )
  if (!children) return control
  return (
    <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-3", disabled && "cursor-not-allowed opacity-60", className)}>
      {control}
      <span className="text-[0.94rem] leading-snug">{children}</span>
    </label>
  )
})

export default Switch
