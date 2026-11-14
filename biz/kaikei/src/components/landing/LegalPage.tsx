import type { ReactNode } from 'react'
import { Container } from './Section'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

// 特定商取引法にもとづく表記と、プライバシーポリシーの、共通の割りつけ。
// LP と同じ見出し・同じフッターの間に、1枚の紙を置いて、その上に本文を書く。

/** 運営者がまだ書いていない項目に出す文。 */
export const TODO_TEXT = '（公開前に記入します）'

export function LegalPage({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main>
        <Container className="py-9 sm:py-14">
          <article className="mx-auto max-w-[52rem] rounded-xl border border-border border-t-[3px] border-t-rule bg-paper px-5 py-8 shadow-paper sm:px-11 sm:py-12">
            <h1 className="text-[1.55rem] leading-[1.5] sm:text-[1.95rem]">{title}</h1>
            {lead && <p className="mt-3 max-w-[40em] leading-[1.9] text-muted-foreground">{lead}</p>}
            <div className="mt-8">{children}</div>
          </article>
        </Container>
      </main>
      <SiteFooter />
    </div>
  )
}

/** まだ書いていない項目は、うすい字にして、書いてある項目と見分けられるようにする。 */
export function Filled({ value }: { value: string }) {
  if (value) return <>{value}</>
  return <span className="text-muted-foreground">{TODO_TEXT}</span>
}
