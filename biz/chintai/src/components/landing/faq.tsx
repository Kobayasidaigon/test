import type { ReactNode } from 'react'
import { consultDesks } from '@/core/consult'
import { formatDateJa } from '@/core/format'
import { items, otherItem, resolveBasis } from '@/core/items'
import { RULES_VERIFIED_ON } from '@/core/sources'
import { DATA_NOTE, DISCLAIMER, NOT_DOING } from '@/core/texts'
import { SourceLink } from '@/components/source-link'
import { DisclosureChevron, DisclosurePanel, useAccordion } from '@/components/ui/disclosure'
import { visibleOffers } from '@/offers'
import { Link } from '@/router'
import { site } from '@/site.config'

// よくある質問。開いたり閉じたりする欄は、道具の「理由と根拠を見る」と同じ部品（ui/disclosure.tsx。ddoemonn の Accordion がもと）。
// 閉じている答えも HTML には入っているので、静的HTMLの段階でも、検索エンジンにも、全部読める。
//
// 答えは、道具で実際にそうなっていることだけを書く。事実（相談先の番号、国民生活センターの呼びかけ など）は、
// core のデータから取り出して、出典を付ける。

const linkClass = 'underline decoration-ink/40 underline-offset-4 hover:decoration-ink'

type Faq = { id: string; q: string; a: ReactNode }

function buildFaqs(): Faq[] {
  const hotline = consultDesks.find((d) => d.id === 'hotline188')
  // 「契約の前に確かめる」ことについての、国民生活センターの呼びかけ（core の項目のデータにある、参考の文）。
  const beforeContract = resolveBasis(otherItem.related).find((n) => n.sources.some((s) => s.id === 'kokusen-wakamono10'))
  const ads = visibleOffers().length

  return [
    {
      id: 'free',
      q: '本当に無料ですか。あとからお金がかかることは、ありませんか。',
      a: (
        <>
          <p>{site.pricing.priceNote}有料版は、ありません。</p>
          <p>
            {site.pricing.revenueNote}
            {ads === 0 && 'いまは、広告をまだ1つも載せていません。'}
          </p>
        </>
      ),
    },
    {
      id: 'data',
      q: '入力した見積書の内容は、どこかに送られますか。',
      a: (
        <>
          <p>{DATA_NOTE}</p>
          <p>
            くわしくは、<Link to="/privacy" className={linkClass}>プライバシーポリシー</Link>に書いています。
          </p>
        </>
      ),
    },
    {
      id: 'photo',
      q: '見積書の写真や PDF を、読み取ってくれますか。',
      a: (
        <p>
          いいえ。項目と金額は、自分で入れます。項目は、一覧から押して選ぶか、見積書に書かれている言葉（「抗菌」「鍵」など）で探せます。一覧にない項目も、見積書のとおりの名前で足せます。
        </p>
      ),
    },
    {
      id: 'meaning',
      q: '「確かめる項目」と出たら、外せるということですか。',
      a: (
        <p>
          いいえ。「不動産会社に聞いてみる項目」という意味です。契約書の特約や物件の条件で、外せないこともあります。聞いてみて、だめなら、その条件で借りるかどうかを、自分で決めることになります。
        </p>
      ),
    },
    {
      id: 'price',
      q: '金額が高いか安いかは、教えてくれますか。',
      a: (
        <>
          <p>いいえ。{NOT_DOING[0].body}</p>
          <p>出すのは、計算だけです。たとえば、仲介手数料は、家賃から出した上限の目安と比べます。日割り家賃は、入居する日から出した目安と比べます。敷金や礼金は、家賃の何か月分にあたるかを出します。</p>
        </>
      ),
    },
    {
      id: 'after',
      q: 'もう申し込んだあとや、契約したあとでも、使えますか。',
      a: (
        <>
          <p>道具は、いつでも使えます。ただ、見積書を確かめるのは、契約の前がよいとされています。</p>
          {beforeContract && (
            <p>
              {beforeContract.text}
              <span className="mt-1 block">
                出典: <SourceLink source={beforeContract.sources[0]} />
              </span>
            </p>
          )}
        </>
      ),
    },
    {
      id: 'items',
      q: 'どんな項目に、対応していますか。',
      a: (
        <p>
          敷金、礼金、仲介手数料、火災保険料、鍵の交換費用、室内の消毒・抗菌など、{items.length}個の項目を、あらかじめ用意しています（
          <Link to="/items" className={linkClass}>項目の一覧</Link>
          ）。一覧にない項目は、見積書のとおりの名前で足せます。その行は、「何のお金か、確かめる」項目として扱います。
        </p>
      ),
    },
    {
      id: 'business',
      q: '店舗や事務所を借りるときにも、使えますか。',
      a: (
        <p>
          住むための部屋を借りるときの見積書を、対象にしています。たとえば、仲介手数料の「家賃の0.5か月分＋消費税」という上限の決まりは、住むための建物についてのものです。
        </p>
      ),
    },
    {
      id: 'trust',
      q: '結果は、何をもとにしていますか。',
      a: (
        <>
          <p>
            法令と、国・自治体などの資料に書かれていることだけを、もとにしています（
            <a href="#konkyo" className={linkClass}>根拠にしている資料</a>
            ）。ルールを最後に確かめたのは、{formatDateJa(RULES_VERIFIED_ON)}です。法令や資料は、変わることがあります。
          </p>
          <p>{DISCLAIMER}</p>
        </>
      ),
    },
    {
      id: 'consult',
      q: '困ったときは、どこに相談すればよいですか。',
      a: (
        <p>
          この道具は、個別の事情についての相談には答えられません。
          {hotline && (
            <>
              {hotline.name}（電話 {hotline.phone}）にかけると、身近な消費生活センターなどの相談窓口を、案内してもらえます。
            </>
          )}
          相談先は、点検の結果の画面と、<Link to="/about#soudan" className={linkClass}>このサイトについて</Link>に、まとめています。
        </p>
      ),
    },
    {
      id: 'phone',
      q: 'スマートフォンでも、使えますか。',
      a: (
        <p>
          使えます。ただし、入れた内容は、その端末のブラウザの中に保存されます。ほかの端末で続きをするときは、「ファイルに書き出す」で保存したファイルを、もう一方の端末で読み込んでください。
        </p>
      ),
    },
  ]
}

export function FaqList() {
  const faqs = buildFaqs()
  const accordion = useAccordion({ ids: faqs.map((f) => f.id), defaultOpen: [faqs[0].id] })
  return (
    <div className="border-t-[1.5px] border-ink/70">
      {/* スクリプトを切っている人には、答えを全部開いて見せる（開くボタンが動かないため）。 */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: '[data-disclosure-panel]{grid-template-rows:1fr!important}' }} />
      </noscript>
      {faqs.map((f) => {
        const header = accordion.headerProps(f.id)
        const open = header['aria-expanded']
        return (
          <div key={f.id} className="border-b border-ink/20">
            <h3>
              <button
                {...header}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-3 text-left text-base font-bold leading-snug hover:bg-ink/[0.03] sm:text-[17px]"
              >
                <span>{f.q}</span>
                <DisclosureChevron open={open} className="text-ink-soft" />
              </button>
            </h3>
            <DisclosurePanel {...accordion.panelProps(f.id)}>
              <div className="max-w-[41em] space-y-2 pb-5 pr-2 text-[15px] leading-[1.85] text-ink">{f.a}</div>
            </DisclosurePanel>
          </div>
        )
      })}
    </div>
  )
}
