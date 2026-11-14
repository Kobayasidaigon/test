// 「料金」。無料と、買い切りの2つ。金額と「できること」の文は、すべて src/site.config.ts から出す（道具の中の案内と同じ文）。
//
// 21st.dev の「Two-Plan Pricing Cards」（ln-dev7）をもとにしている。
// 借りたところ: 2枚の札をとなり合わせ、名前とひとこと → 上下を線ではさんだ金額 → ✓の一覧 → いちばん下にボタン、という組み立てと、
//   札の上のふちにのせる小さな札（もとは「Recommended」）、下の1行の断り書き。
// 変えたところ: 「おすすめ」と押すのをやめ、札には「どんな店向けか」を書いた。細い枠と丸い角を、紺の輪郭線と、ずらした影に。
//   購入のボタンは、決済ページ（site.checkoutUrl）が空のあいだは「販売準備中」にして、押せなくした（うそのリンクを作らない）。
//   見本の英語の文と金額は消した。
import { ArrowRight, Check, ExternalLink } from 'lucide-react'
import { Link } from '@/router'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LpHeading, LpSection, Ph } from './section'

export function Pricing() {
  const { free, pro } = site.plans
  const limit = site.pricing.free.staffLimit
  const yen = (text: string) => text.replace(/円$/, '')

  const plans = [
    {
      key: 'free',
      badge: `スタッフ${limit}人までの店に`,
      name: free.name,
      lead: free.note,
      price: yen(free.price),
      cadence: 'ずっと',
      features: free.features,
      highlight: false,
    },
    {
      key: 'pro',
      badge: `スタッフ${limit + 1}人以上の店に`,
      name: pro.name,
      lead: pro.note,
      price: yen(pro.price),
      cadence: '税込・1回だけ',
      features: pro.features,
      highlight: true,
    },
  ] as const

  return (
    <LpSection id="pricing">
      <LpHeading
        id="pricing"
        kicker="料金"
        color="sky"
        title={
          <>
            <Ph>無料で使えます。</Ph>
            <Ph>大きい店は、買い切りで。</Ph>
          </>
        }
        lead="月額の料金はありません。無料版は、お試しではなく、期限なしでそのまま使い続けられます。"
      />

      <div className="mt-12 grid gap-x-7 gap-y-10 md:mt-16 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        {plans.map((plan) => (
          <article key={plan.key} className={cn('relative flex flex-col gap-6 rounded-xl border-2 border-ink bg-card p-5 pt-8 md:p-7 md:pt-9', plan.highlight ? 'shadow-[6px_6px_0_0_var(--shift-egg),6px_6px_0_2px_var(--ink)]' : 'shadow-hard-lg')}>
            <span className={cn('absolute -top-3.5 left-5 rounded-md border-2 border-ink px-2.5 py-0.5 text-[12.5px] font-extrabold leading-snug md:left-7', plan.highlight ? 'bg-shift-egg text-ink' : 'bg-ink text-paper')}>{plan.badge}</span>

            <div>
              <h3 className="text-[1.4rem]">{plan.name}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">{plan.lead}</p>
            </div>

            <p className="flex items-baseline gap-2 border-y-2 border-ink/15 py-4">
              <span className="font-display text-[2.9rem] font-extrabold leading-none">{plan.price}</span>
              <span className="text-lg font-extrabold">円</span>
              <span className="ml-1 text-sm text-ink-soft">{plan.cadence}</span>
            </p>

            <ul className="flex flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[15px] leading-[1.7]">
                  <Check aria-hidden className="mt-1 size-4 shrink-0" strokeWidth={3.5} />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-1">
              {plan.key === 'free' ? (
                <Button asChild size="lg" className="w-full">
                  <Link to="/app">
                    無料で使いはじめる
                    <ArrowRight aria-hidden strokeWidth={3} />
                  </Link>
                </Button>
              ) : site.checkoutUrl ? (
                <Button asChild size="lg" variant="dark" className="w-full">
                  <a href={site.checkoutUrl} target="_blank" rel="noreferrer">
                    {pro.name}版を買う（{pro.price}）
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="outline" disabled className="w-full">
                    販売準備中
                  </Button>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
                    まだ買えません。販売を始めたら、ここに購入のボタンが出ます。
                    {site.licensePublicKey ? '' : `それまでは、${pro.name}版の機能も、道具の画面で試せます。`}
                  </p>
                </>
              )}
            </div>
          </article>
        ))}

        {/* 買ったあとの流れ */}
        <div className="md:col-span-2 xl:col-span-1 xl:pl-2 xl:pt-2">
          <h3 className="text-[1.1rem]">{pro.name}版の、使いはじめ方</h3>
          <ol className="mt-3 grid gap-3">
            {[
              `決済ページで、${pro.price}（税込）を支払います。お支払い方法は、${site.sales.payment}です。`,
              'メールで、ライセンスキーが届きます。',
              `道具の画面の右上から「${pro.name}版について」を開いて、キーを貼り付けます。`,
            ].map((t, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-[1.8]">
                <span aria-hidden className="blk mt-0.5" data-size="sm" data-color="sky">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t-2 border-ink/15 pt-3 text-[13.5px] leading-[1.8] text-ink-soft">
            キーは、あなたのブラウザの中で確かめます。確かめるために、どこかへ送ることはありません。返品・返金の条件は、
            <Link to="/tokushoho" className="font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-shift-tomato">
              特定商取引法にもとづく表記
            </Link>
            をご覧ください。
          </p>
        </div>
      </div>
    </LpSection>
  )
}
