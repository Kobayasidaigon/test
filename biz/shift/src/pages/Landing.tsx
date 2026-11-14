// ランディングページ（/）。静的HTMLに書き出すので、描くときに window などに触らない（動く部分は、各部品の useEffect から始まる）。
// 中身は src/components/landing/ に、セクションごとに分けてある。並び順は、仕様書の「LP に入れるもの」と同じ:
//   一番上（見出しと動く見本）→ どういう道具か → 使い方の3ステップ → 組めないときは理由を言う → できないこと
//   → データの扱い → 料金 → よくある質問 → フッター
import { ArrowRight } from 'lucide-react'
import { Link } from '@/router'
import { site } from '@/site.config'
import { Button } from '@/components/ui/button'
import { About } from '@/components/landing/about'
import { DataSection } from '@/components/landing/data'
import { Faq } from '@/components/landing/faq'
import { Hero } from '@/components/landing/hero'
import { How } from '@/components/landing/how'
import { Limits } from '@/components/landing/limits'
import { Pricing } from '@/components/landing/pricing'
import { Reasons } from '@/components/landing/reasons'
import { LP_WIDTH, Ph } from '@/components/landing/section'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <SiteHeader landing />
      <main>
        <Hero />
        <About />
        <How />
        <Reasons />
        <Limits />
        <DataSection />
        <Pricing />
        <Faq />

        {/* 最後のひと押し */}
        <section aria-labelledby="closing-title" className="bg-shift-egg">
          <div className={`${LP_WIDTH} flex flex-col items-start gap-x-10 gap-y-5 py-12 md:flex-row md:items-center md:justify-between md:py-16`}>
            <div>
              <h2 id="closing-title" className="text-[1.6rem] leading-[1.4] md:text-[2.1rem]">
                <Ph>まずは、サンプルの店で</Ph>
                <Ph>動かしてみてください。</Ph>
              </h2>
              <p className="lp-prose mt-2 text-[15px] md:text-base">
                登録はいりません。スタッフ<span className="font-num">{site.pricing.free.staffLimit}</span>人までは、無料のまま使い続けられます。
              </p>
            </div>
            <Button asChild size="lg" variant="dark" className="w-full shrink-0 text-[17px] shadow-[4px_4px_0_0_#fff] max-[359px]:px-3 max-[359px]:text-[15px] sm:w-auto">
              <Link to="/app">
                自分の店で使う（無料）
                <ArrowRight aria-hidden strokeWidth={3} />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter landing />
    </div>
  )
}
