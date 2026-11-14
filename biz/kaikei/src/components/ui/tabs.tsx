import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// shadcn/ui の Tabs（Radix）を、ひきつぎ会計の見た目に合わせたもの。
// 矢印キーで動く、選んだタブだけ Tab キーで止まる、などのふるまいは、もとの部品のまま。
// 見た目は2通り:
//   ・帳簿の見出し（TabsList / TabsTrigger）… 資料の切り替えに使う。選んだタブは、紙の色のつまみ（インデックス）になる
//   ・画面の切り替え（NavTabsList / NavTabsTrigger）… 21st.dev の Mobile Navigation Tabs（shadcnui-blocks）の、
//     アイコンの下に名前を置いた下のタブを借りた。スマホでは画面の下に固定し、パソコンでは上の横ならびになる

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("flex flex-wrap items-end gap-x-1 gap-y-1.5 border-b-[3px] border-double border-rule", className)} {...props} />
  ),
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-t-lg border border-b-0 border-transparent px-3.5 text-[0.94rem] font-bold text-muted-foreground transition-colors hover:text-foreground",
        "data-[state=active]:border-rule data-[state=active]:bg-paper data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_3px_0_var(--shu)]",
        className,
      )}
      {...props}
    />
  ),
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("outline-offset-4", className)} {...props} />,
)
TabsContent.displayName = TabsPrimitive.Content.displayName

/** 画面の切り替え。スマホでは画面の下に固定する（親指で届く）。パソコンでは、見出しの下の横ならび。 */
const NavTabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "no-print grid grid-cols-5 border-rule bg-paper",
        // スマホ: 下に固定。ホームバーのぶんだけ下を空ける
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t-[3px] max-lg:border-double max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-6px_18px_-12px_rgb(74_60_30/0.5)]",
        // パソコン: 上の横ならび
        "lg:flex lg:gap-1 lg:border-0 lg:bg-transparent",
        className,
      )}
      {...props}
    />
  ),
)
NavTabsList.displayName = "NavTabsList"

const NavTabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "group relative flex min-w-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-foreground [&_svg]:shrink-0",
        // スマホ: アイコンの下に名前。選んだものは、上に朱の線
        "max-lg:min-h-[3.6rem] max-lg:flex-col max-lg:gap-0.5 max-lg:px-0.5 max-lg:pb-1 max-lg:pt-1.5 max-lg:text-[0.72rem] max-lg:font-bold max-lg:leading-tight max-lg:outline-offset-[-3px] max-lg:data-[state=active]:shadow-[inset_0_3px_0_var(--shu)] max-lg:[&_svg]:size-[1.4rem]",
        // パソコン: アイコンの右に名前。選んだものは、紙の色のつまみ
        "lg:min-h-12 lg:gap-2 lg:rounded-t-lg lg:border lg:border-b-0 lg:border-transparent lg:px-4 lg:text-base lg:font-bold lg:data-[state=active]:border-rule lg:data-[state=active]:bg-paper lg:data-[state=active]:shadow-[inset_0_3px_0_var(--shu)] lg:[&_svg]:size-[1.15rem]",
        className,
      )}
      {...props}
    />
  ),
)
NavTabsTrigger.displayName = "NavTabsTrigger"

export { NavTabsList, NavTabsTrigger, Tabs, TabsContent, TabsList, TabsTrigger }
