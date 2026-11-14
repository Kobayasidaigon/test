import * as React from "react"

import { cn } from "@/lib/utils"

// originui の Input（21st.dev）をもとにした入力欄。
// 見積書の記入欄らしく、角を丸めず、下の線を濃くした。高さは、指で押せる 44px。
// 文字は 16px（iPhone の Safari は、16px より小さい入力欄にフォーカスすると、画面を勝手に拡大するため）。
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-sm border border-input border-b-ink/70 bg-paper px-3 py-2 text-base text-ink transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-ink/60 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-pen aria-[invalid=true]:bg-pen-soft/50",
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

/**
 * 入力欄の右に、単位（「円」など）を置く形。originui の「inline end add-on」の例をもとにした。
 * 単位は飾りなので、読み上げには、入力欄のラベルのほうで伝える。
 */
const InputWithUnit = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { unit: string; wrapClassName?: string }>(
  ({ unit, className, wrapClassName, ...props }, ref) => (
    <span className={cn("relative block", wrapClassName)}>
      <Input ref={ref} className={cn("pe-9", className)} {...props} />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-sm text-ink-soft">
        {unit}
      </span>
    </span>
  ),
)
InputWithUnit.displayName = "InputWithUnit"

export { Input, InputWithUnit }
