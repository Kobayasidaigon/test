import { adDisclosure } from '@/core/consult'
import { formatDateJa } from '@/core/format'
import { getSource, RULES_VERIFIED_ON } from '@/core/sources'
import { DATA_NOTE, DISCLAIMER, NOT_DOING } from '@/core/texts'
import { ConsultDesks } from '@/components/consult-desks'
import { PageSection, PageShell } from '@/components/site/page-shell'
import { SourceLink } from '@/components/source-link'
import { Button } from '@/components/ui/button'
import { visibleOffers } from '@/offers'
import { Link } from '@/router'
import { site } from '@/site.config'

// このサイトについて（/about）。
// 有料版がなく、ものを売らないサイトなので、特定商取引法にもとづく表記のかわりに、このページを置く。
// 運営者、広告で運営していること、この道具の立て付け（免責）、相談先を書く。
// 文とデータは、site.config.ts と core から出している（画面や LP と、同じ言い方になる）。
// 運営者の名前と連絡先は、site.config.ts が空のあいだ、「公開前に記入します」と出る。
// 「個人が運営しているサイトです」の文は、運営のしかたが変わったら（法人にした、など）、直すこと。

const todo = '（公開前に記入します）'
const linkClass = 'underline decoration-ink/40 underline-offset-4 hover:decoration-ink'

export default function About() {
  const ad = getSource(adDisclosure.sourceIds[0])
  const ads = visibleOffers().length
  const contact = site.operator.email || site.contact
  return (
    <PageShell
      title="このサイトについて"
      lead={`${site.name}は、${site.tagline}ための、無料の道具です。だれが、どうやって運営しているのか、この道具に何ができて何ができないのかを、ここにまとめます。`}
      crumbs={[{ label: 'トップ', to: '/' }, { label: 'このサイトについて' }]}
    >
      <PageSection title="運営者">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1">
          <dt className="text-ink-soft">運営者</dt>
          <dd>{site.operator.name || todo}</dd>
          <dt className="text-ink-soft">連絡先</dt>
          <dd className="break-all">{contact || todo}</dd>
        </dl>
        <p>個人が運営しているサイトです。不動産会社や、保険・引越しなどの会社が運営しているサイトではありません。</p>
      </PageSection>

      <PageSection title="料金と、運営のしかた">
        <p>{site.pricing.priceNote}有料版は、ありません。</p>
        <p>{site.pricing.revenueNote}</p>
        <p>
          {ads === 0
            ? 'いまは、広告をまだ1つも載せていません。載せるようになったら、点検の結果の画面と、項目ごとの解説のページに、枠で区切って出します。'
            : '広告は、点検の結果の画面と、項目ごとの解説のページに、枠で区切って出しています。'}
          広告のリンクは、ほかのサイトへ移るふつうのリンクです。このサイトに、広告配信やアクセス解析のためのプログラム（タグ）は入れていません。
        </p>
        <p className="text-sm leading-7 text-ink-soft">
          {adDisclosure.text}
          <span className="mt-1 block">
            出典: <SourceLink source={ad} />
          </span>
        </p>
      </PageSection>

      <PageSection title="この道具の立て付け">
        <p>{DISCLAIMER}</p>
        <p>この道具がしないことは、次の{NOT_DOING.length}つです。</p>
        <ul className="space-y-1">
          {NOT_DOING.map((n) => (
            <li key={n.title} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.9em] h-px w-3 shrink-0 bg-ink/60" />
              <span>{n.title}</span>
            </li>
          ))}
        </ul>
        <p>
          点検の結果に出す「根拠」は、法令と、国・自治体などの資料に書かれていることだけです。もとにした資料は、
          <Link to="/#konkyo" className={linkClass}>
            根拠にしている資料
          </Link>
          に、全部並べています。ルール（項目のデータと出典）を最後に確かめたのは、{formatDateJa(RULES_VERIFIED_ON)}です。法令や資料は、変わることがあります。
        </p>
      </PageSection>

      <PageSection id="soudan" title="困ったときの相談先">
        <ConsultDesks />
      </PageSection>

      <PageSection title="入力した内容の扱い">
        <p>{DATA_NOTE}</p>
        <p>
          くわしくは、
          <Link to="/privacy" className={linkClass}>
            プライバシーポリシー
          </Link>
          に書いています。
        </p>
      </PageSection>

      <PageSection title="お問い合わせ">
        <p>このサイトの内容のまちがいや、資料が新しくなっていることに気づいたときは、次の連絡先まで、お知らせください。個別の契約についての相談には、お答えできません。</p>
        <p className="break-all">{contact || todo}</p>
      </PageSection>

      <div className="mt-10 border-t border-rule pt-6">
        <Button asChild>
          <Link to="/app">見積書を点検する</Link>
        </Button>
      </div>
    </PageShell>
  )
}
