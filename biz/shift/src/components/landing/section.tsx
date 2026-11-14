// LP のセクションの枠と見出し。どのセクションも、同じ余白・同じ見出しの形にそろえるための部品。
import type { ReactNode } from 'react'
import type { ShiftColor } from '@/core'
import { cn } from '@/lib/utils'

type Tone = 'paper' | 'white' | 'well' | 'ink' | 'egg'

const TONE: Record<Tone, string> = {
  paper: 'bg-paper text-ink',
  white: 'border-y-2 border-ink bg-card text-ink',
  well: 'border-y-2 border-ink bg-well text-ink',
  ink: 'bg-ink text-paper',
  egg: 'border-y-2 border-ink bg-shift-egg text-ink',
}

/** LP とそのほかのページで共通の、中身の幅と左右の余白（ナビ・フッターも同じ） */
export const LP_WIDTH = 'mx-auto w-full max-w-[1360px] px-4 md:px-6'

/** セクションの枠。id は、ナビのページ内リンクの行き先になる */
export function LpSection({ id, tone = 'paper', children, className }: { id?: string; tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn('lp-anchor', TONE[tone], className)}>
      <div className={LP_WIDTH + ' py-16 md:py-24'}>{children}</div>
    </section>
  )
}

/** セクションの見出し。上の小さな行（kicker）には、勤務のブロックと同じ四角を1つ置く */
export function LpHeading({
  id,
  kicker,
  color,
  title,
  lead,
  onDark = false,
  className,
}: {
  /** セクションの id（見出しの id は `${id}-title` になる） */
  id: string
  kicker: string
  color: ShiftColor
  title: ReactNode
  lead?: ReactNode
  /** 紺の地の上に置くとき */
  onDark?: boolean
  className?: string
}) {
  return (
    <header className={cn('max-w-[46rem]', className)}>
      <p className={cn('flex items-center gap-2 text-sm font-bold', onDark ? 'text-paper/85' : 'text-ink-soft')}>
        <span aria-hidden className={cn('blk', onDark && '!border-paper')} data-size="sm" data-color={color} />
        {kicker}
      </p>
      <h2 id={`${id}-title`} className="mt-3 text-[1.7rem] leading-[1.4] md:text-[2.35rem]">
        {title}
      </h2>
      {lead ? <p className={cn('lp-prose mt-4 text-base md:text-[17px]', onDark ? 'text-paper/90' : 'text-ink-soft')}>{lead}</p> : null}
    </header>
  )
}

/** 見出しの中で、まとまりごとに折り返すための小さな部品（変なところで折れないように） */
export function Ph({ children }: { children: ReactNode }) {
  return <span className="inline-block">{children}</span>
}
