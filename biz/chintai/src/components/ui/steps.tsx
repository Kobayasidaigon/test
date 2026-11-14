import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

// adit-firdaus の Steps（21st.dev）をもとにした、道具の流れの表示。
//
// もとの部品から残したもの:
// - 手順の状態（終わった／いま／これから）を current から決める考え方と、状態を言葉でも伝えること（色だけにしない）。
// - <ol> と aria-current="step" の組み立て。
//
// 変えたもの:
// - 丸い番号と、つなぐ線をやめて、紙のファイルの「見出しの耳（インデックス）」にした。
//   いまの手順の耳は、下の紙とつながった白。ほかの耳は、机の色に沈める。
// - もとは「先の手順は押せない」決まりだったが、この道具は行き来して使うので、どの手順も押せるようにした
//   （見積書が空のときは、結果の画面のほうで「まだ入っていません」と案内する）。
// - 押したときの小さな動きは、CSS だけにした。

export type StepStatus = "complete" | "current" | "upcoming"

export interface StepItem {
  /** 手順の名前。 */
  title: ReactNode
  /** せまい画面で出す、短い名前（なければ title）。 */
  shortTitle?: ReactNode
  /** 耳の右に出す、小さなしるし（確かめる項目の数 など）。 */
  badge?: ReactNode
}

export interface StepsProps extends Omit<HTMLAttributes<HTMLOListElement>, "onChange"> {
  items: StepItem[]
  /** いまの手順（0 から数える）。 */
  current: number
  onStepChange?: (index: number) => void
  "aria-label"?: string
}

// 読み上げのための言葉（画面には出さない）。
const STATUS_LABEL: Record<StepStatus, string> = {
  complete: "すんだ手順",
  current: "いまの手順",
  upcoming: "これからの手順",
}

export function Steps({ items, current, onStepChange, className, "aria-label": ariaLabel = "道具の流れ", ...rest }: StepsProps) {
  const statusAt = (index: number): StepStatus => (index < current ? "complete" : index === current ? "current" : "upcoming")

  return (
    <ol {...rest} aria-label={ariaLabel} className={cn("flex items-end gap-1 sm:gap-1.5", className)}>
      {items.map((item, index) => {
        const status = statusAt(index)
        const isCurrent = status === "current"
        return (
          <li key={index} className="min-w-0 flex-1 sm:flex-none" aria-current={isCurrent ? "step" : undefined}>
            <button
              type="button"
              onClick={() => onStepChange?.(index)}
              className={cn(
                "group relative flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-t-md border border-b-0 px-2 text-sm leading-none transition-[background-color,color,height] duration-150 sm:gap-2.5 sm:px-5",
                isCurrent
                  ? "z-10 h-12 border-ink/15 bg-paper font-bold text-ink shadow-[0_-1px_0_rgb(23_26_32/0.04)]"
                  : "h-11 border-transparent bg-ink/[0.08] text-ink-soft hover:bg-ink/[0.13] hover:text-ink active:h-[42px]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "num grid size-[22px] shrink-0 place-items-center rounded-[2px] text-[13px] font-bold leading-none",
                  isCurrent ? "bg-ink text-white" : "border border-ink-soft/60 text-ink-soft group-hover:border-ink group-hover:text-ink",
                )}
              >
                {index + 1}
              </span>
              <span className="truncate">
                <span className="sm:hidden">{item.shortTitle ?? item.title}</span>
                <span className="hidden sm:inline">{item.title}</span>
              </span>
              {item.badge}
              <span className="sr-only">（{STATUS_LABEL[status]}）</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default Steps
