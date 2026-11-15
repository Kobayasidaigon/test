import type { ReactNode } from 'react'
import { getCategory } from '@/core/categories'
import { formatDateJa } from '@/core/format'
import { findGuideItem, listGuideItems, NO_RULE_TEXT, resolveBasis } from '@/core/items'
import { RULES_VERIFIED_ON, VERIFY_METHOD_NOTE } from '@/core/sources'
import { DISCLAIMER, MESSAGE_NOTE } from '@/core/texts'
import { CategoryMark } from '@/components/category-mark'
import { BrokerageTry } from '@/components/guide/brokerage-try'
import { OfferSlot } from '@/components/offer-slot'
import { PageSection, PageShell } from '@/components/site/page-shell'
import { BasisList } from '@/components/source-link'
import { Button } from '@/components/ui/button'
import { visibleOffers } from '@/offers'
import { Link, useRoutePath } from '@/router'

// 項目ごとの解説（/items/<slug>）。1つの部品で、全部の解説ページを描く。
// 中身は、すべて core の項目のデータ（items.ts の guide・basis・related・limits・ask など）から出す。
// このページに、項目についての事実を、じかに書かないこと（出典のない文が、まぎれこまないように）。
//
// 静的HTMLに書き出す（ssr: true）。どの項目のページかは、URL のパスから決める。

/** 項目ごとに、解説のページだけに置くもの（その場で試せる、小さな点検）。 */
const EXTRA: Record<string, { title: string; note: string; body: ReactNode }> = {
  'chukai-tesuryo': {
    title: 'ここで、比べてみる',
    note: '家賃と、見積書の仲介手数料を入れると、道具と同じ計算で、上限の目安と比べます。',
    body: <BrokerageTry />,
  },
}

const linkClass = 'underline decoration-ink/40 underline-offset-4 hover:decoration-ink'

export default function ItemGuide() {
  const path = useRoutePath()
  const slug = path.replace(/^\/items\//, '').replace(/\/+$/, '')
  const item = findGuideItem(slug)

  if (!item) {
    // ページの一覧（routes.ts）は、解説のある項目から作っているので、ふつうはここに来ない。
    return (
      <PageShell title="このページは、見つかりませんでした" crumbs={[{ label: 'トップ', to: '/' }, { label: '項目の解説', to: '/items' }, { label: '見つかりません' }]}>
        <p className="text-[15px] leading-[1.9]">
          項目の解説は、
          <Link to="/items" className={linkClass}>
            項目の一覧
          </Link>
          から選べます。
        </p>
      </PageShell>
    )
  }

  const category = getCategory(item.category)
  const basis = resolveBasis(item.basis)
  const related = resolveBasis(item.related)
  const extra = EXTRA[item.guide.slug]
  const others = listGuideItems().filter((g) => g.id !== item.id)
  const offers = visibleOffers('item', item.id)
  // 題は「項目の名前 — 何を確かめるか」の形。見出しでは、2つの段に分けて見せる。
  const [name, point] = item.guide.title.split(' — ')

  return (
    <PageShell
      eyebrow="賃貸の初期費用の、項目の解説"
      title={
        <>
          <span className="block">{name}</span>
          {/* 読み上げと検索エンジンには、「項目の名前 — 何を確かめるか」と、区切って伝わるようにする。 */}
          {point && <span className="sr-only"> — </span>}
          {point && <span className="mt-1 block text-[0.62em] font-normal leading-[1.6] text-ink-soft">{point}</span>}
        </>
      }
      lead={item.guide.lead}
      crumbs={[{ label: 'トップ', to: '/' }, { label: '項目の解説', to: '/items' }, { label: item.name }]}
      after={
        <>
          <OfferSlot offers={offers} className="mt-6" />
          <nav aria-labelledby="other-guides" className="mt-10">
            <h2 id="other-guides" className="border-b-[1.5px] border-ink/70 pb-1.5 text-base font-bold">
              ほかの項目の解説
            </h2>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {others.map((g, i) => (
                <li key={g.id} className="border-b border-ink/15">
                  <Link to={`/items/${g.guide.slug}`} className="flex min-h-12 items-center gap-2.5 py-1.5 text-[15px] no-underline hover:underline hover:underline-offset-4">
                    <CategoryMark id={g.category} variant={i} className="text-[12px]" />
                    <span>{g.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <Link to="/items" className={`inline-flex min-h-11 items-center ${linkClass}`}>
                項目の一覧を見る
              </Link>
            </p>
          </nav>
        </>
      }
    >
      <dl className="-mt-2 mb-9 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 border-y border-rule py-3 text-sm leading-7">
        <dt className="text-ink-soft">区分</dt>
        <dd className="flex flex-wrap items-center gap-x-2">
          <CategoryMark id={item.category} className="text-[13px]" />
          <span className="font-bold">{category.label}</span>
          <span className="text-[13px] text-ink-soft">{category.short}</span>
        </dd>
        {item.aliases.length > 0 && (
          <>
            <dt className="text-ink-soft">
              見積書での
              <br className="sm:hidden" />
              書かれ方
            </dt>
            <dd>{item.aliases.join('、')}</dd>
          </>
        )}
      </dl>

      <PageSection title="何のお金か">
        {item.guide.what.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </PageSection>

      <PageSection title="確かめること">
        <ul className="space-y-5">
          {item.guide.points.map((p) => (
            <li key={p.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              {/* 画面では、箇条書きの点（四角い欄にすると、押して印を付けられるものに見えるが、押しても何も起きないため）。 */}
              <span aria-hidden className="mt-[0.62em] size-1.5 shrink-0 rounded-full bg-ink/70 print:hidden" />
              {/* 紙に印刷したときに、確かめたら手で印を付けられる、空のチェック欄（道具の結果と同じ形）。 */}
              <span aria-hidden className="mt-[0.5em] hidden size-[14px] shrink-0 rounded-[1px] border-[1.5px] border-ink/60 print:block" />
              <div>
                <h3 className="text-base font-bold leading-snug">{p.title}</h3>
                <p className="mt-1">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </PageSection>

      {extra && (
        <PageSection title={extra.title}>
          <p>{extra.note}</p>
          {extra.body}
        </PageSection>
      )}

      <PageSection title="聞き方の文例">
        <p className="border-l-4 border-marker bg-marker-soft/60 px-3 py-2">{item.howToAsk}</p>
        <dl className="space-y-3">
          <div>
            <dt className="text-[13px] font-bold">メールで聞くとき</dt>
            <dd className="mt-1 border border-rule-strong/70 px-3 py-2">{item.ask.mail}</dd>
          </div>
          <div>
            <dt className="text-[13px] font-bold">LINE で聞くとき</dt>
            <dd className="mt-1 border border-rule-strong/70 px-3 py-2">{item.ask.line}</dd>
          </div>
        </dl>
        <p className="text-[13px] leading-6 text-ink-soft">
          道具の画面では、見積書に書かれている名前と金額を入れた、あいさつ付きの文面ができます。{MESSAGE_NOTE}
        </p>
      </PageSection>

      <PageSection title="根拠">
        {item.basisStatus === 'verified' && basis.length > 0 ? (
          <>
            <p className="text-[13px] leading-6 text-ink-soft">法令や、国・自治体の資料に書かれていることです。</p>
            <BasisList notes={basis} />
          </>
        ) : (
          <p>{item.why === NO_RULE_TEXT ? NO_RULE_TEXT : 'この項目についての、国の決まりや資料は、見つかりませんでした。'}</p>
        )}
      </PageSection>

      {related.length > 0 && (
        <PageSection title="参考">
          <p className="text-[13px] leading-6 text-ink-soft">決まりではありませんが、公的な機関の案内や、相談の例です。</p>
          <BasisList notes={related} />
        </PageSection>
      )}

      {item.limits.length > 0 && (
        <PageSection title="この道具が、確かめられなかったこと">
          {item.limits.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </PageSection>
      )}

      {item.caveat && (
        <PageSection title="添えておくこと">
          <p>{item.caveat}</p>
        </PageSection>
      )}

      <section aria-labelledby="guide-start" className="mt-10 border-t-[1.5px] border-ink/70 pt-6">
        <h2 id="guide-start" className="text-lg font-bold leading-snug">
          自分の見積書で、確かめる
        </h2>
        <p className="mt-2 text-[15px] leading-[1.9]">
          道具に、見積書の項目と金額を入れると、「{item.name}」を含めて、行ごとに点検します。確かめる項目について、不動産会社に送る文面も作れます。無料で、登録はいりません。
        </p>
        <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
          <Link to="/app">自分の見積書を点検する（無料）</Link>
        </Button>
      </section>

      <p className="mt-8 text-[13px] leading-6 text-ink-soft">
        {DISCLAIMER}困ったときの相談先は、
        <Link to="/about#soudan" className={linkClass}>
          このサイトについて
        </Link>
        にまとめています。
        <span className="block">ルールの最終確認日: {formatDateJa(RULES_VERIFIED_ON)}</span>
        {VERIFY_METHOD_NOTE && <span className="block">{VERIFY_METHOD_NOTE}</span>}
      </p>
    </PageShell>
  )
}
