import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// shadcn の Button（21st.dev）を、点検票の世界に合わせて作り変えたもの。
// - いちばん大事なボタンは、黒いインクのベタ。赤は「赤ペンの書き込み」だけに使うので、ボタンには使わない。
// - 角は書類らしく、ほとんど丸めない。
// - 押すところは 44px 以上（size="sm" も、スマホでは 44px にする）。
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold leading-none transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_0_rgb(0_0_0/0.25)] hover:bg-[#2b303a]",
        outline: "border border-ink/55 bg-paper text-ink hover:border-ink hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#d3dae4]",
        ghost: "text-ink hover:bg-ink/[0.07]",
        // 消す操作。赤ペンの色の文字と枠にして、ベタにはしない（押す前に、確かめの画面を出す）。
        destructive: "border border-pen/60 bg-paper text-pen hover:bg-pen-soft",
        link: "h-auto min-h-0 rounded-none p-0 font-normal text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3 py-2 text-[13px] sm:min-h-9",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "size-11 sm:size-9",
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
    // フォームの中に置いても、勝手に送信されないようにする。
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : (type ?? "button")} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
