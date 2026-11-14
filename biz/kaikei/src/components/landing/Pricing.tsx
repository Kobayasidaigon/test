import { Check, ExternalLink } from 'lucide-react'
import { formatYen } from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { Button } from '@/components/ui/button'
import { Container, LedgerRule, Phrase, SectionHeading } from './Section'

// 料金（無料／1年度ぶん）。金額と文は、すべて src/site.config.ts の pricing から出す。
// 21st.dev の Two-Plan Pricing Cards（ln-dev7）をもとにした。
// もとのまま使っているところ: 無料と有料の2つを横に並べ、名前 → ひとこと → 金額 → チェックの一覧 → ボタン、の順に積む組み立て。
// 変えたところ: 角の丸い2枚のカードをやめて、1枚の紙を罫線で左右に分けた。「Recommended」の札と、英語の小さな字は外した。
// 購入のボタンは、決済ページ（site.checkoutUrl）が決まるまで「販売準備中」と出す（うそのリンクを作らない）。

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-[1.7]">
          <Check className="mt-[0.28em] size-[1.1rem] shrink-0 text-rule-ink" strokeWidth={3} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Price({ value, note }: { value: number; note: string }) {
  return (
    <p className="flex items-baseline gap-1.5 border-y border-rule/50 py-4">
      <span className="num text-[3rem] font-bold leading-none">{formatYen(value)}</span>
      <span className="text-xl font-bold">円</span>
      <span className="ml-2 text-[0.94rem] text-muted-foreground">{note}</span>
    </p>
  )
}

export function Pricing() {
  const { free, pro, summary } = site.pricing
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-4 pb-16 sm:pb-24">
      <Container>
        <LedgerRule />
        <SectionHeading id="pricing-title" className="pt-10 sm:pt-14" title="料金" />
        <p className="mt-3 font-serif text-[1.25rem] font-bold leading-[1.75] sm:text-[1.4rem]">
          {/* 「。」で分けて、文の途中（「1年度」と「980円」の間など）で折れないようにする */}
          {summary
            .split('。')
            .filter(Boolean)
            .map((sentence, i, all) => (
              <Phrase key={sentence}>
                {sentence}。{i === all.length - 1 && pro.taxIncluded && <span className="text-[0.8em] font-normal">（税込）</span>}
              </Phrase>
            ))}
        </p>

        <div className="mt-8 grid overflow-hidden rounded-xl border border-border bg-paper shadow-paper md:grid-cols-2">
          <article className="flex flex-col gap-5 border-t-[3px] border-t-rule px-5 py-6 sm:px-7 sm:py-7">
            <div>
              <h3 className="text-[1.4rem]">{free.name}</h3>
              <p className="mt-1 text-[0.94rem] text-muted-foreground">入力から、資料の確認、引き継ぎまで。期限はありません。</p>
            </div>
            <Price value={free.price} note="ずっと" />
            <FeatureList items={free.features} />
            <Button asChild variant="outline" size="lg" className="mt-auto w-full">
              <Link to="/app">無料で始める</Link>
            </Button>
          </article>

          <article className="flex flex-col gap-5 border-t-[3px] border-t-shu px-5 py-6 max-md:border-b-0 md:border-l md:border-l-rule/50 sm:px-7 sm:py-7">
            <div>
              <h3 className="text-[1.4rem]">{pro.name}</h3>
              <p className="mt-1 text-[0.94rem] text-muted-foreground">総会に出す資料を、印刷するときに。</p>
            </div>
            <Price value={pro.price} note={`${pro.taxIncluded ? '税込・' : ''}${pro.unit}ぶん`} />
            <div>
              <p className="mb-2.5 text-[0.94rem] font-bold">無料でできることに、加えて</p>
              <FeatureList items={pro.features} />
            </div>
            {site.checkoutUrl ? (
              <Button asChild size="lg" className="mt-auto w-full">
                <a href={site.checkoutUrl} target="_blank" rel="noreferrer">
                  購入のページへ進む
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : (
              <p className="mt-auto flex min-h-14 w-full items-center justify-center rounded-lg border-[1.5px] border-dashed border-input/80 bg-muted px-4 text-center text-lg font-bold text-muted-foreground">
                販売準備中です
              </p>
            )}
          </article>
        </div>

        <ul className="mt-6 grid max-w-[60em] gap-2 text-[0.92rem] leading-[1.8] text-muted-foreground">
          <li>{pro.note}</li>
          <li>
            キーは、発行した日から{pro.licenseDays}日のあいだ使えます（総会が年度の終わりより遅くなっても使えるように、1年より長くしてあります）。届いたキーは、道具の「引き継ぎ」の画面で入れます。
          </li>
          <li>
            {site.sales.refund}
            <Link to="/tokushoho" className="ml-1 rounded text-rule-ink underline underline-offset-4">
              特定商取引法にもとづく表記
            </Link>
          </li>
        </ul>
      </Container>
    </section>
  )
}
