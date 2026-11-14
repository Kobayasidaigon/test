import { useMemo, useState } from 'react'
import { buildReports, type Book } from '@/core'
import { ClosingCta } from '@/components/landing/ClosingCta'
import { DataSection } from '@/components/landing/DataSection'
import { Documents } from '@/components/landing/Documents'
import { Faq } from '@/components/landing/Faq'
import { FitSection } from '@/components/landing/FitSection'
import { HandoverSteps } from '@/components/landing/HandoverSteps'
import { Hero } from '@/components/landing/Hero'
import { Pricing } from '@/components/landing/Pricing'
import { ReconcileDemo } from '@/components/landing/ReconcileDemo'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { SiteHeader } from '@/components/landing/SiteHeader'
import { createDemoBook, demoYearId } from '@/components/landing/demo'

// ランディングページ（/）。
// このページの絵は、どれも本物: 見本の帳簿（src/core のサンプル）から、道具と同じ関数で資料を作り、
// 道具と同じ紙の部品（src/components/papers）で描いている。
// 静的HTMLに書き出されるので、描くときに window や localStorage には触らない（見本は、いつ作っても同じ結果になる）。

export default function Landing() {
  // 見本の帳簿。いちばん上の「ためしに1件入れる」で変わり、下の資料の見本にも、そのまま映る
  const base = useMemo(createDemoBook, [])
  const [book, setBook] = useState<Book>(base)
  const reports = useMemo(() => buildReports(book, demoYearId(book)), [book])
  if (!reports) return null

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main>
        <Hero book={book} base={base} reports={reports} onBookChange={setBook} />
        <Documents reports={reports} yearLabel={book.years[0].label} />
        <ReconcileDemo />
        <HandoverSteps />
        <DataSection />
        <FitSection />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  )
}
