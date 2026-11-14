import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import * as React from "react"

import { cn } from "@/lib/utils"

// originui の Checkbox（21st.dev、Radix）をもとにしたチェックの欄。
// 点検票のチェック欄らしく、四角い枠に、赤ペンの手描きのチェックが入る（枠から少しはみ出す）。
// 色だけに頼らないように、入っているかどうかは、チェックの印そのもので伝える。
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer relative size-[22px] shrink-0 cursor-pointer rounded-[2px] border-[1.5px] border-ink/70 bg-paper text-pen transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ink",
      // 押せる範囲を、見た目より広げる（44px）。
      "after:absolute after:-inset-[11px] after:content-['']",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="pointer-events-none absolute -inset-[5px] block">
      <svg aria-hidden viewBox="0 0 24 24" className="pen-draw size-full overflow-visible">
        <path className="pen-stroke" pathLength={1} d="M 4.5 12.5 C 6.5 14.5 8.5 17 10 20 C 13 13 17.5 7.5 22.5 2.5" strokeWidth={2.4} style={{ animationDuration: "0.25s" }} />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
