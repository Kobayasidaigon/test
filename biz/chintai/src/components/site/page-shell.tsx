import type { ReactNode } from 'react'
import { Sheet } from '@/components/sheet'
import { DoubleRule } from '@/components/pen'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader, type NavItem } from '@/components/site/site-header'
import { cn } from '@/lib/utils'
import { Link } from '@/router'

// LP のほかのページ（このサイトについて、プライバシーポリシー、項目の一覧、項目ごとの解説）の、共通の枠。
// 上の帯とフッターは LP と同じ。本文は、机の上に置いた1枚の紙（Sheet）に書く。
// 描くときに window などにさわらないので、静的HTMLの書き出し（ssr: true）で使える。

/** LP のほかのページで、上の帯に出す行き先。 */
export const SUB_NAV: NavItem[] = [
  { label: 'トップ', to: '/' },
  { label: '項目の解説', to: '/items' },
  { label: '根拠の資料', to: '/#konkyo' },
  { label: 'よくある質問', to: '/#faq' },
  { label: 'このサイトについて', to: '/about' },
]

export type Crumb = { label: string; to?: string }

/** いまいる場所（トップ › 項目の解説 › 敷金）。 */
function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="いまいる場所" className="mb-4 text-[13px] leading-6 text-ink-soft">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-x-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.to ? (
              <Link to={c.to} className="inline-flex min-h-11 min-w-11 items-center underline decoration-ink-soft/50 underline-offset-4 hover:text-ink sm:min-h-8 sm:min-w-0">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageShell({
  title,
  eyebrow,
  lead,
  crumbs,
  children,
  after,
  wide = false,
}: {
  /** ページの題（h1）。 */
  title: ReactNode
  /** 題の上の、小さな文字。 */
  eyebrow?: ReactNode
  /** 題の下の、はじめの文。 */
  lead?: ReactNode
  crumbs: Crumb[]
  children: ReactNode
  /** 紙の下（机の上）に置くもの。 */
  after?: ReactNode
  /** 紙の幅を広くする（一覧のページ）。 */
  wide?: boolean
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[70] rounded-sm bg-ink px-4 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        本文へ進む
      </a>
      <SiteHeader items={SUB_NAV} />
      <main id="main" className={cn('mx-auto w-full px-3 pb-16 pt-5 sm:px-6 sm:pb-24 sm:pt-8', wide ? 'max-w-[64rem]' : 'max-w-[48rem]')}>
        <Breadcrumbs crumbs={crumbs} />
        <Sheet className="px-5 py-7 sm:px-12 sm:py-12">
          <header className="mb-8">
            {eyebrow && <p className="mb-2 text-[13px] leading-6 text-ink-soft">{eyebrow}</p>}
            <h1 className="text-[1.5rem] font-bold leading-[1.45] sm:text-[1.9rem]">{title}</h1>
            <DoubleRule className="mt-4" />
            {lead && <p className="mt-5 text-base leading-[1.9] sm:text-[17px]">{lead}</p>}
          </header>
          {children}
        </Sheet>
        {after}
      </main>
      <SiteFooter />
    </div>
  )
}

/** 紙の中の、ひとつの段（見出しと本文）。 */
export function PageSection({ id, title, children, className }: { id?: string; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('mt-10 scroll-mt-20 first:mt-0', className)}>
      <h2 className="mb-3 border-b-[1.5px] border-ink/70 pb-1.5 text-lg font-bold leading-snug">{title}</h2>
      <div className="space-y-3 text-[15px] leading-[1.9]">{children}</div>
    </section>
  )
}
