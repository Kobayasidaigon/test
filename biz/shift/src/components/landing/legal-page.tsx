// 特定商取引法にもとづく表記・プライバシーポリシーなど、文だけのページの枠。LP と同じナビとフッターを使う。
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/router'
import type { ShiftColor } from '@/core'
import { LP_WIDTH } from './section'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

export function LegalPage({ title, lead, color, children }: { title: string; lead?: ReactNode; color: ShiftColor; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className={`${LP_WIDTH} py-10 md:py-16`}>
          <div className="max-w-[50rem]">
            <p>
              <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-[6px] hover:decoration-shift-tomato">
                <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
                トップページへ
              </Link>
            </p>
            <h1 className="mt-3 flex items-start gap-3 text-[1.6rem] leading-[1.4] max-[359px]:text-[1.3rem] md:text-[2.2rem]">
              <span aria-hidden className="blk mt-1.5 max-[359px]:mt-0.5 md:mt-2.5" data-color={color} />
              <span className="min-w-0">{title}</span>
            </h1>
            {lead ? <p className="lp-prose mt-4 text-[15px] text-ink-soft md:text-base">{lead}</p> : null}
            <div className="mt-8 md:mt-10">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

/** 文のページの中の、ひとまとまり */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-ink/15 py-6 first:border-t-0 first:pt-0">
      <h2 className="text-[1.15rem] md:text-[1.25rem]">{title}</h2>
      <div className="lp-prose mt-2 grid gap-2 text-[15px] text-ink">{children}</div>
    </section>
  )
}
