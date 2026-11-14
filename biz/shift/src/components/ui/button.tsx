import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// shadcn/ui の Button を、このサービスの見た目に作り変えたもの。
// 輪郭線は紺の 2px。影はぼかさず右下にずらして置き、押すと影のぶんだけ沈む（ブロックをはめる手ざわり）。
// スマホでは、どの大きさも高さ 44px 以上になる（sm は md 以上の幅でだけ小さくなる）。
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-ink font-bold leading-none transition-[transform,box-shadow,background-color] duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // いちばん大事な操作（組む、始める）
        default:
          "bg-shift-egg text-ink shadow-hard hover:bg-[#ffdd66] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        // 紺の地。LP などで、卵色と並べる2番めの操作に
        dark: "bg-ink text-paper shadow-[3px_3px_0_0_var(--shift-egg)] hover:bg-[#28336b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        // ふつうの操作
        outline:
          "bg-card text-ink shadow-hard-sm hover:bg-well active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        secondary:
          "bg-well text-ink hover:bg-[#ece3c8] active:translate-y-px",
        ghost: "border-transparent bg-transparent text-ink hover:bg-well active:translate-y-px",
        destructive:
          "border-danger bg-card text-danger shadow-[2px_2px_0_0_var(--danger)] hover:bg-danger-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        link: "h-auto min-h-0 border-0 bg-transparent p-0 text-ink underline decoration-2 underline-offset-4 hover:decoration-shift-tomato",
      },
      size: {
        default: "min-h-11 px-4 py-2 text-[15px]",
        sm: "min-h-11 px-3 py-1.5 text-sm md:min-h-9",
        lg: "min-h-13 px-6 py-3 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    // フォームの中に置いても、勝手に送信しないようにする
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : (type ?? "button")} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
