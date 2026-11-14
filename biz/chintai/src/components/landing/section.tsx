import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// LP の1つの欄。見出しと、ひとことの説明を、左寄せで置く。
// id は、上の帯のリンク（#wakaru など）の行き先になる。上の帯が残るぶん、止まる位置を下げておく（scroll-mt）。

export function Section({
  id,
  title,
  lead,
  children,
  className,
  split = false,
}: {
  id: string
  title: ReactNode
  lead?: ReactNode
  children: ReactNode
  className?: string
  /** 広い画面で、見出しを左、中身を右に置く（中身が、幅のせまい1列のとき）。 */
  split?: boolean
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-16 sm:scroll-mt-20', className)}>
      <div className={cn('mx-auto max-w-[76rem] px-4 py-12 sm:px-6 sm:py-[4.5rem]', split && 'lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-14')}>
        <header className={cn('mb-7 sm:mb-9', split && 'lg:sticky lg:top-24 lg:mb-0 lg:self-start')}>
          <h2 id={`${id}-title`} className="text-[1.5rem] font-bold leading-[1.4] sm:text-[1.9rem]">
            {title}
          </h2>
          {lead && <p className="text-jp mt-3 text-[15px] text-ink-soft sm:text-base">{lead}</p>}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
