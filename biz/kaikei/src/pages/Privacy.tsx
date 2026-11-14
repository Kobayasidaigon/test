import { Link } from '@/router'
import { site } from '@/site.config'

// プライバシーポリシー。このひな形は「入力した内容はブラウザの中だけに保存し、サーバーに送らない」前提で書いてある。
// アクセス解析や広告を入れるときは、その内容を書き足すこと。
export default function Privacy() {
  const contact = site.operator.email || site.contact || '（公開前に記入します）'
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm text-muted-foreground"><Link to="/" className="underline underline-offset-4">{site.name}</Link></p>
      <h1 className="mt-4 text-2xl font-bold">プライバシーポリシー</h1>
      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground">入力した内容の扱い</h2>
          <p className="mt-2">{site.name}に入力した内容は、お使いのブラウザの中（そのパソコンやスマートフォンの中）だけに保存されます。運営者のサーバーには送られず、運営者が見ることもできません。</p>
          <p className="mt-2">ブラウザの履歴やサイトのデータを消すと、入力した内容も消えます。大切なデータは、画面の「書き出し」でファイルに保存してください。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">お支払いのときにお預かりする情報</h2>
          <p className="mt-2">有料プランの決済は Stripe のページで行います。カード番号などの情報は Stripe が受け取り、運営者には届きません。運営者は、ライセンスキーをお送りするためのメールアドレスとお名前（または団体名・店名）をお預かりします。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">お預かりした情報の使いみち</h2>
          <p className="mt-2">ライセンスキーの送付、お問い合わせへの返信、サービスの大事なお知らせにだけ使います。法令にもとづく場合を除いて、ご本人の同意なく第三者に渡しません。</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">お問い合わせ</h2>
          <p className="mt-2">お預かりした情報の確認・訂正・削除のご希望は、次の宛先までご連絡ください。<br />{contact}</p>
        </section>
      </div>
    </main>
  )
}
