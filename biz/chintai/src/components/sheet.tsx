import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DoubleRule } from './pen'

// 白い見積書の紙。道具の画面でも、LP でも、同じ紙を使う。

/** 紙。机（ページの地）の上に置く。 */
export function Sheet({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('sheet px-4 py-6 sm:px-8 sm:py-8 print:p-0', className)} {...props} />
}

/**
 * 紙の題。見積書のように、字の間をあけた題を真ん中に置き、下に二重線を引く。
 * eyebrow は、題の上の小さな文字（「点検用の写し」など）。right は、右上に置くもの（日付など）。
 */
export function SheetTitle({
  title,
  eyebrow,
  right,
  as: Tag = 'h2',
  className,
}: {
  title: string
  eyebrow?: ReactNode
  right?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <header className={cn('mb-6', className)}>
      <div className="flex items-end justify-between gap-3 text-xs leading-5 text-ink-soft">
        <span>{eyebrow}</span>
        {right && <span className="shrink-0 text-right">{right}</span>}
      </div>
      <Tag className="mt-2 text-center text-[1.35rem] font-bold tracking-[0.32em] [text-indent:0.32em] sm:text-2xl">{title}</Tag>
      <DoubleRule className="mt-3" />
    </header>
  )
}

/** 紙の中の、番号つきの見出し。 */
export function SheetHeading({
  n,
  title,
  note,
  right,
  as: Tag = 'h3',
  className,
}: {
  n?: number | string
  title: ReactNode
  note?: ReactNode
  right?: ReactNode
  as?: 'h2' | 'h3' | 'h4'
  className?: string
}) {
  return (
    <div className={cn('mb-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-ink/70 pb-1.5">
        <Tag className="flex items-center gap-2 text-base font-bold leading-snug">
          {n !== undefined && (
            <span aria-hidden className="num grid size-[22px] shrink-0 place-items-center bg-ink text-[13px] font-bold leading-none text-white">
              {n}
            </span>
          )}
          <span>{title}</span>
        </Tag>
        {right}
      </div>
      {note && <p className="mt-2 text-[13px] leading-6 text-ink-soft">{note}</p>}
    </div>
  )
}

/** 紙の上の「注意書き」。蛍光ペンの黄色い帯（色だけで伝えないように、文の頭に言葉を置くこと）。 */
export function SheetNote({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('border-l-4 border-marker bg-marker-soft/70 px-3 py-2 text-[13px] leading-6 text-ink', className)} {...props} />
}
