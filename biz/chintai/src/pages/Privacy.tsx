import { Link } from '@/router'
import { site } from '@/site.config'

// プライバシーポリシー。
// 「入力した内容はブラウザの中だけに保存し、サーバーに送らない」「有料版はなく、決済もしない」前提で書いてある。
// 土台にあった、決済（Stripe）とライセンスキーの段落は、このサービスには当てはまらないので消した。
// 【仮の形】文は本物だが、見た目はページの担当（③）が LP に合わせて作り直す。
// 広告の枠（src/offers.ts）に実際のリンクを入れるときは、提携先の決まりに合わせて、「広告について」の段落を見直すこと。
export default function Privacy() {
  const contact = site.operator.email || site.contact || '（公開前に記入します）'
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm text-muted-foreground"><Link to="/" className="underline underline-offset-4">{site.name}</Link></p>
      <h1 className="mt-4 text-2xl font-bold">プライバシーポリシー</h1>
      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground">入力した内容の扱い</h2>
          <p className="mt-2">{site.name}に入力した内容（家賃、見積書の項目と金額、お名前、物件名など）は、お使いのブラウザの中（そのパソコンやスマートフォンの中）だけに保存されます。運営者のサーバーには送られず、運営者が見ることもできません。</p>
          <p className="mt-2">ブラウザの履歴やサイトのデータを消すと、入力した内容も消えます。残しておきたいときは、道具の画面の「ファイルに書き出す」で、ファイルに保存してください。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">会員登録とお支払い</h2>
          <p className="mt-2">{site.name}は無料で、会員登録はありません。お支払いの情報をお預かりすることもありません。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">広告について</h2>
          <p className="mt-2">このサイトは、広告の収入で運営します。広告には、必ず「広告」と表示します。広告は、ほかのサイトへのリンクです。リンク先のサイトでの情報の扱いは、そのサイトの決まりによります。</p>
          <p className="mt-2">このサイトには、アクセス解析や広告配信のためのプログラム（タグ）を入れていません。</p>
        </section>
        <section>
          {/* index.html が Google Fonts を読み込んでいるあいだは、この段落が要る。書体を自分のサーバーから配る形に変えたら、消すこと。 */}
          <h2 className="text-base font-bold text-foreground">書体の読み込み</h2>
          <p className="mt-2">文字の書体を表示するために、Google Fonts（Google のサーバー）から書体のデータを読み込みます。このとき、お使いの端末の IP アドレスなどが、Google に送られます。入力した内容が送られることはありません。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">お問い合わせ</h2>
          <p className="mt-2">このページの内容についてのお問い合わせは、次の宛先までご連絡ください。<br />{contact}</p>
        </section>
      </div>
    </main>
  )
}
