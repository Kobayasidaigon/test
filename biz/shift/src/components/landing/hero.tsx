// LP の一番上。見出し、ひとこと、「自分の店で使う（無料）」、動く見本、4つの強み。
import { ArrowRight } from 'lucide-react'
import { Link } from '@/router'
import { site, formatYen } from '@/site.config'
import { Button } from '@/components/ui/button'
import { HeroDemo } from './hero-demo'
import { Ph } from './section'

/** 4つの強み。どれも、道具が実際にそうなっていること（仕様書の「強み」） */
const POINTS = [
  { color: 'egg', title: '登録なし', body: '開いたら、すぐ使えます。メールアドレスも、パスワードもいりません。' },
  { color: 'teal', title: '名前が外に出ない', body: 'スタッフの名前も希望休も、店のパソコンの中だけ。サーバーに送りません。' },
  { color: 'tomato', title: '組めない理由を言う', body: '何日のどの勤務に何人足りないか、なぜ入れる人がいないかを、文で出します。' },
  { color: 'sky', title: '月額なし', body: `無料のまま使えます。大きい店向けの買い切り版は ${formatYen(site.pricing.pro.priceYen)}（税込）。` },
] as const

export function Hero() {
  const { free } = site.pricing
  return (
    <section aria-labelledby="hero-title" className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-4 pb-14 pt-8 md:px-6 md:pb-20 md:pt-12">
        <div className="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-soft md:text-[15px]">
              <span aria-hidden className="flex gap-1">
                <span className="blk" data-size="sm" data-color="egg">
                  早
                </span>
                <span className="blk" data-size="sm" data-color="sky">
                  遅
                </span>
                <span className="blk" data-size="sm" data-color="tomato">
                  通
                </span>
              </span>
              スタッフ5〜20人の店の、店長・オーナーの方へ
            </p>
            <h1 id="hero-title" className="mt-4 text-[1.85rem] leading-[1.35] sm:text-[2.6rem] lg:text-[3.35rem] lg:leading-[1.25]">
              <Ph>シフトを組むところだけ、</Ph>
              <Ph>機械にまかせる。</Ph>
            </h1>
          </div>
          <div className="lg:pb-2">
            <p className="lp-prose text-base text-ink-soft md:text-[17px]">
              希望休と必要な人数を入れてボタンを押すと、来月のシフトのたたき台ができます。希望休は今までどおり紙や LINE で集めて、できた表は印刷して貼るだけです。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button asChild size="lg" className="w-full text-[17px] max-[359px]:px-3 max-[359px]:text-[15px] sm:w-auto">
                <Link to="/app">
                  自分の店で使う（無料）
                  <ArrowRight aria-hidden strokeWidth={3} />
                </Link>
              </Button>
              <a href="#pricing" className="inline-flex min-h-11 items-center text-[15px] font-bold underline decoration-2 underline-offset-[6px] hover:decoration-shift-tomato">
                料金を見る
              </a>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              登録はいりません。スタッフ<span className="font-num">{free.staffLimit}</span>人までは、期限なしで無料です。
            </p>
          </div>
        </div>

        <div className="mt-8 md:mt-10">
          <HeroDemo />
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
          {POINTS.map((p) => (
            <li key={p.title} className="border-t-2 border-ink pt-4">
              <h2 className="flex items-center gap-2 text-[1.1rem]">
                <span aria-hidden className="blk" data-size="sm" data-color={p.color} />
                {p.title}
              </h2>
              <p className="mt-1.5 text-[14.5px] leading-[1.85] text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
