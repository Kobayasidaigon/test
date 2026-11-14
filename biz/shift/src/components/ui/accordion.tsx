// 21st.dev の「Accordion」（ddoemonn）をもとにした、開いたり閉じたりする一覧。よくある質問に使う。
// 借りたところ: 1つの枠の中に、行を線で区切って重ねる組み立て。行の頭（質問）の右に、開くと向きが変わる山形の印。
//   ↑↓／Home／End で行の頭を行き来するキー操作。行の頭を見出し（heading）としてあつかうこと。開いた中身を、少しくぼんだ地にすること。
// 変えたところ: もとは motion（アニメーションのライブラリ）で高さを測って動かし、閉じた中身を aria-hidden にしていた。
//   ここでは HTML の <details> にした。JavaScript が動く前の静的HTMLでも開けて、ページ内の検索でも中身が見つかるようにするため
//   （LP は静的HTMLに書き出す）。開く動きは CSS だけ（src/index.css の .lp-faq。対応していないブラウザでは、そのまま開く）。
//   細い灰色の枠と、ぼかした影を、紺の輪郭線と、ずらした影に。行は 44px より高くして、指で押しやすくした。
import type { KeyboardEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type AccordionItem = {
  id: string
  title: ReactNode
  content: ReactNode
}

export type AccordionProps = {
  items: readonly AccordionItem[]
  /** 最初から開いておく行の id */
  defaultOpen?: readonly string[]
  /** 行の頭の、見出しの段（h3 なら 3） */
  headingLevel?: 2 | 3 | 4
  className?: string
}

export function Accordion({ items, defaultOpen = [], headingLevel = 3, className }: AccordionProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4"

  // ↑↓／Home／End で、行の頭を行き来する
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.tagName !== "SUMMARY") return
    const heads = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("summary"))
    const at = heads.indexOf(target)
    if (at < 0) return
    let next = -1
    if (event.key === "ArrowDown") next = (at + 1) % heads.length
    else if (event.key === "ArrowUp") next = (at - 1 + heads.length) % heads.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = heads.length - 1
    if (next < 0) return
    event.preventDefault()
    heads[next].focus()
  }

  return (
    <div onKeyDown={onKeyDown} className={cn("overflow-hidden rounded-xl border-2 border-ink bg-card shadow-hard", className)}>
      {items.map((item, index) => (
        <details key={item.id} id={`faq-${item.id}`} open={defaultOpen.includes(item.id) || undefined} className={cn("lp-faq group", index > 0 && "border-t-2 border-ink")}>
          <summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fff8dc] focus-visible:relative focus-visible:outline-offset-[-3px] md:px-5">
            <Heading className="min-w-0 flex-1 text-[1rem] leading-snug md:text-[1.08rem]">{item.title}</Heading>
            <svg aria-hidden width="18" height="18" viewBox="0 0 256 256" fill="none" className="lp-faq-chev shrink-0">
              <path d="M208 96l-80 80-80-80" stroke="currentColor" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="border-t-2 border-ink/15 bg-paper px-4 pb-4 pt-3 text-[15px] leading-[1.9] text-ink md:px-5">{item.content}</div>
        </details>
      ))}
    </div>
  )
}

export default Accordion
