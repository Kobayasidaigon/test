import { PageSection, PageShell } from '@/components/site/page-shell'
import { Link } from '@/router'
import { site } from '@/site.config'

// プライバシーポリシー（/privacy）。
// 「入力した内容はブラウザの中だけに保存し、サーバーに送らない」「有料版はなく、決済もしない」前提で書いてある。
// 広告の枠（src/offers.ts）に実際のリンクを入れるときは、提携先の決まりに合わせて、「広告について」の段を見直すこと。
// index.html が Google Fonts を読み込んでいるあいだは、「書体の読み込み」の段が要る。
// 書体を自分のサーバーから配る形に変えたら、その段を消すこと。

const linkClass = 'underline decoration-ink/40 underline-offset-4 hover:decoration-ink'

export default function Privacy() {
  const contact = site.operator.email || site.contact || '（公開前に記入します）'
  return (
    <PageShell
      title="プライバシーポリシー"
      lead={`${site.name}は、入力した内容を、運営者のサーバーに送りません。このページでは、このサイトで何が保存され、何が外に送られるのかを書きます。`}
      crumbs={[{ label: 'トップ', to: '/' }, { label: 'プライバシーポリシー' }]}
    >
      <PageSection title="入力した内容の扱い">
        <p>
          {site.name}に入力した内容（家賃、見積書の項目と金額、お名前、物件名など）は、お使いのブラウザの中（そのパソコンやスマートフォンの中）だけに保存されます。運営者のサーバーには送られず、運営者が見ることもできません。
        </p>
        <p>ブラウザの履歴やサイトのデータを消すと、入力した内容も消えます。残しておきたいときは、道具の画面の「ファイルに書き出す」で、ファイルに保存してください。</p>
        <p>「ファイルに書き出す」で作ったファイルは、お使いの端末に保存されるだけで、どこにも送られません。</p>
      </PageSection>

      <PageSection title="会員登録とお支払い">
        <p>{site.name}は無料で、会員登録はありません。お名前やメールアドレスを登録していただくことも、お支払いの情報をお預かりすることもありません。</p>
      </PageSection>

      <PageSection title="広告について">
        <p>このサイトは、広告の収入で運営します。広告には、必ず「広告」と表示します。広告は、ほかのサイトへのリンクです。リンク先のサイトでの情報の扱いは、そのサイトの決まりによります。</p>
        <p>このサイトには、アクセス解析や広告配信のためのプログラム（タグ）を入れていません。</p>
      </PageSection>

      <PageSection title="書体の読み込み">
        <p>文字の書体を表示するために、Google Fonts（Google のサーバー）から書体のデータを読み込みます。このとき、お使いの端末の IP アドレスなどが、Google に送られます。入力した内容が送られることはありません。</p>
      </PageSection>

      <PageSection title="ほかのサイトへのリンク">
        <p>
          点検の結果や解説のページには、根拠にした資料（国や自治体などの公式のサイト）へのリンクがあります。リンク先のサイトでの情報の扱いは、そのサイトの決まりによります。
        </p>
      </PageSection>

      <PageSection title="お問い合わせ">
        <p>このページの内容についてのお問い合わせは、次の宛先までご連絡ください。</p>
        <p className="break-all">{contact}</p>
        <p>
          運営者については、
          <Link to="/about" className={linkClass}>
            このサイトについて
          </Link>
          をご覧ください。
        </p>
      </PageSection>
    </PageShell>
  )
}
