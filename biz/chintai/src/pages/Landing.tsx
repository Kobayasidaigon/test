import { categories } from '@/core/categories'
import { Categories } from '@/components/landing/categories'
import { categoryDemoInspection, sampleInspection } from '@/components/landing/demo'
import { FaqList } from '@/components/landing/faq'
import { Guides } from '@/components/landing/guides'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { MessageSample } from '@/components/landing/message-sample'
import { NotDoing } from '@/components/landing/not-doing'
import { Operation } from '@/components/landing/operation'
import { Section } from '@/components/landing/section'
import { Sources } from '@/components/landing/sources'
import { DoubleRule } from '@/components/pen'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader, type NavItem } from '@/components/site/site-header'
import { Button } from '@/components/ui/button'
import { Link } from '@/router'

// ランディングページ（/）。静的HTMLに書き出す（ssr: true）ので、描くときに window などにさわらない。
//
// 並びは、仕様書の「LP に入れるもの」の順。
//   1 一番上（見出しと、赤ペンが入る見積書）　2 何がわかるか　3 使い方　4 確認の文面の見本　5 この道具がしないこと
//   6 根拠にしている資料　7 項目ごとの解説への入口　8 このサイトの運営　9 よくある質問　10 フッター
//
// 絵は、すべて、道具の本物の部品に、本物のロジックの結果を渡したもの（撮った画像や、手で書いた見本ではない）。
// 机（地の色）の上に、紙（白）を置く。紙に入れる欄と、机にじかに書く欄を交互にして、同じ箱が並ばないようにしている。

const NAV: NavItem[] = [
  { label: '何がわかるか', hash: 'wakaru' },
  { label: '使い方', hash: 'tsukaikata' },
  { label: '文面の見本', hash: 'bunmen' },
  { label: '根拠の資料', hash: 'konkyo' },
  { label: '項目の解説', hash: 'kaisetsu' },
  { label: 'よくある質問', hash: 'faq' },
]

export default function Landing() {
  const sample = sampleInspection()
  const demo = categoryDemoInspection()

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[70] rounded-sm bg-ink px-4 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        本文へ進む
      </a>
      <SiteHeader items={NAV} />

      <main id="main">
        <Hero inspection={sample} />

        <Section
          id="wakaru"
          title="行ごとに、何を確かめるかがわかります"
          lead={`見積書の行を、${categories.length}つの区分に分けて点検します。区分は、色だけでなく、印と言葉で見分けられます。区分を選ぶと、その区分の行が、道具でどう点検されるかを見られます。`}
          className="border-t border-ink/15"
        >
          <Categories inspection={demo} />
        </Section>

        <Section id="tsukaikata" title="使い方は、3つの手順です" className="border-t border-ink/15">
          <HowItWorks inspection={sample} />
        </Section>

        <Section
          id="bunmen"
          title="不動産会社に聞くための、文面ができます"
          lead="点検の結果から、聞きたい項目を選ぶと、文面ができます。手で書いた見本ではなく、道具が実際に作った文面を、そのまま載せています。"
          className="border-t border-ink/15"
        >
          <MessageSample inspection={sample} />
        </Section>

        <Section id="shinaikoto" title="この道具が、しないこと" lead="できないことを、先に書いておきます。" className="border-t border-ink/15">
          <NotDoing />
        </Section>

        <Section
          id="konkyo"
          title="根拠にしている資料"
          lead="点検の結果に出す「根拠」は、法令と、国・自治体などの資料に書かれていることだけです。もとにした資料を、全部並べます。"
          className="border-t border-ink/15"
        >
          <Sources />
        </Section>

        <Section
          id="kaisetsu"
          title="項目ごとの解説"
          lead="見積書でよく見る項目について、何のお金か、何を確かめるか、どう聞くかを、1ページずつまとめました。"
          className="border-t border-ink/15"
        >
          <Guides />
        </Section>

        <Section id="unei" title="このサイトの運営" className="border-t border-ink/15">
          <Operation />
        </Section>

        <Section id="faq" title="よくある質問" split className="border-t border-ink/15">
          <FaqList />
        </Section>

        <section aria-labelledby="start-title" className="mx-auto max-w-[76rem] px-4 pb-16 sm:px-6 sm:pb-24">
          <DoubleRule />
          <div className="flex flex-col gap-5 pt-9 md:flex-row md:items-center md:justify-between md:gap-10">
            <div>
              <h2 id="start-title" className="text-[1.5rem] font-bold leading-[1.4] sm:text-[1.9rem]">
                <span className="inline-block">見積書を手元に置いて、</span>
                <span className="inline-block">始めましょう。</span>
              </h2>
              <p className="text-jp mt-2 text-[15px] text-ink-soft">まず動きを見たいときは、道具の画面で「サンプルの見積書を入れる」を押してください。</p>
            </div>
            <Button asChild size="lg" className="w-full shrink-0 md:w-auto">
              <Link to="/app">自分の見積書を点検する（無料）</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
