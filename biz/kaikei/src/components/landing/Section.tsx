import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// LP と、そのほかのページで共通に使う、小さな割りつけの部品。

/** ページの横幅をそろえる入れもの。 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[74rem] px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

/** 帳簿の二重線。章のはじまりに引く（道具の画面の、見出しの下の線と同じもの）。 */
export function LedgerRule({ className }: { className?: string }) {
  return <div aria-hidden className={cn('h-[3px] border-y border-rule', className)} />
}

/**
 * 章の見出し。
 * 日本語の見出しが変なところで折れないように、title には、まとまりごとに <Phrase> で包んだものを渡す。
 */
export function SectionHeading({
  id,
  title,
  lead,
  tone = 'ink',
  className,
}: {
  id?: string
  title: ReactNode
  lead?: ReactNode
  /** 'cover' は、青緑の地（帳簿の表紙の色）の上に置くとき */
  tone?: 'ink' | 'cover'
  className?: string
}) {
  return (
    <div className={className}>
      <h2 id={id} className="text-[1.6rem] leading-[1.5] sm:text-[2.05rem]">
        {title}
      </h2>
      {lead && (
        <p className={cn('mt-4 max-w-[38em] text-[1.02rem] leading-[1.9]', tone === 'cover' ? 'text-white/90' : 'text-muted-foreground')}>{lead}</p>
      )}
    </div>
  )
}

/** 見出しの中の、ひとまとまり（この中では折り返さない）。 */
export function Phrase({ children }: { children: ReactNode }) {
  return <span className="inline-block">{children}</span>
}

/** 行の番号。はんこの形の丸に、漢数字（道具の「はじめの画面」と同じ形）。 */
export function SealNumber({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-shu bg-paper font-serif text-lg font-bold leading-none text-shu-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}
