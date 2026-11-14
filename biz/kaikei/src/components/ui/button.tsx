import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// shadcn/ui の Button を、ひきつぎ会計の見た目に合わせたもの。
// ・だいじな操作（default）は朱。はんこを押すように、押すと少し沈む
// ・高さは、いちばん小さいもの（sm）でも 44px より大きくする（スマホで押しやすいように）
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold leading-none transition-[background-color,box-shadow,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-lift hover:bg-shu-ink",
        secondary: "bg-rule-ink text-white shadow-lift hover:bg-[#154d49]",
        outline: "border-[1.5px] border-sumi/70 bg-paper text-foreground hover:bg-muted",
        soft: "border border-rule/50 bg-rule-soft text-secondary-foreground hover:bg-[#d3e7e3]",
        ghost: "text-foreground hover:bg-muted",
        destructive: "border-[1.5px] border-destructive bg-paper text-destructive hover:bg-shu-soft",
        link: "h-auto min-h-0 px-0 font-normal text-rule-ink underline underline-offset-4 hover:text-foreground",
      },
      size: {
        default: "h-12 px-5 text-base",
        sm: "h-11 px-3.5 text-[0.94rem]",
        lg: "h-14 px-7 text-lg",
        icon: "size-11",
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
    // フォームの中に置いても、勝手に送信されないように、決めていなければ type="button" にする
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : (type ?? "button")} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
