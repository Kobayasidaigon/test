import { SHARE_NOTE } from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { Filled, LegalPage, TODO_TEXT } from '@/components/landing/LegalPage'

// プライバシーポリシー。
// 「入力した内容は、ブラウザの中と、自分で保存したファイルにだけ置き、サーバーに送らない」作りに合わせて書いてある。
// アクセス解析や広告を入れるとき、ホスティングの会社を変えたときは、中身を書き直すこと。

export default function Privacy() {
  const contact = site.operator.email || site.contact
  return (
    <LegalPage title="プライバシーポリシー" lead={`${site.name}が、どんな情報を、どこに置き、何に使うかを書いています。`}>
      <div className="legal-prose">
        <h2>入力した内容の扱い</h2>
        <p>
          {site.name}に入力した内容（団体の名前、役員の名前、お金の出入り、メモなど）は、お使いのブラウザの中（そのパソコンやスマートフォンの中）と、ご自分で保存した「ひきつぎファイル」にだけ置かれます。運営者のサーバーには送られず、運営者が見ることはできません。
        </p>
        <p>
          ブラウザのデータを消すと、ブラウザの中の内容も消えます。運営者が、消えた内容を元に戻すことはできません。大切な帳簿は、画面の「ファイルに保存」で、ファイルに残してください。
        </p>

        <h2>ひきつぎファイル</h2>
        <p>
          ひきつぎファイルは、お使いのパソコンやスマートフォンに保存されるファイルです。だれに渡すかは、ご自分で決めます。{SHARE_NOTE}
        </p>

        <h2>お支払いのときにお預かりする情報</h2>
        <p>
          有料版の決済は、Stripe のページで行います。カード番号などの情報は Stripe が受け取り、運営者には届きません。運営者は、ライセンスキーをお送りするために、メールアドレスと、団体の名前（またはお名前）をお預かりします。
        </p>
        <p>
          ライセンスキーの中には、お申し込みのときの団体の名前（またはお名前）、発行した日、期限の日が入っています。キーを道具に入れると、ひきつぎファイルの中にも保存され、ファイルと一緒に次の担当の方へ渡ります。
        </p>

        <h2>お預かりした情報の使いみち</h2>
        <ul>
          <li>ライセンスキーをお送りすること</li>
          <li>お問い合わせにお答えすること</li>
          <li>サービスについての、大事なお知らせをお送りすること</li>
        </ul>
        <p>法令にもとづく場合をのぞいて、ご本人の同意なく、第三者に渡すことはありません。</p>

        <h2>ページを開くときの通信</h2>
        <ul>
          <li>
            このサイトは、文字の形（書体）を Google Fonts（Google LLC）から読み込みます。そのとき、お使いの端末の IP アドレスや、ブラウザの種類などの情報が、Google に送られます。入力した内容は、送られません。
          </li>
          <li>
            サイトのファイルを配信するサーバー（運営者が契約している会社のもの）には、ふつうのウェブサイトと同じように、アクセスの記録（IP アドレス、日時、開いたページ、ブラウザの種類など）が残ることがあります。運営者は、これを、障害を調べるとき以外には使いません。
          </li>
        </ul>

        <h2>アクセス解析・広告・Cookie</h2>
        <p>
          このサイトには、アクセス解析や広告のしくみを入れていません。Cookie も使っていません。入力した内容の保存には、ブラウザの保存領域（localStorage）を使います。これは、お使いの端末の中だけに置かれるもので、運営者には送られません。
        </p>

        <h2>お問い合わせ</h2>
        <p>
          お預かりした情報の確認・訂正・削除のご希望は、次の宛先まで、ご連絡ください。
          <br />
          <span className="break-all font-bold">{contact || <span className="font-normal text-muted-foreground">{TODO_TEXT}</span>}</span>
        </p>

        <h2>このページの変更</h2>
        <p>内容を変えたときは、このページでお知らせします。</p>
        <p>
          定めた日: <Filled value={site.legalUpdatedOn} />
        </p>
      </div>
      <p className="mt-8 text-[0.92rem] leading-[1.85] text-muted-foreground">
        販売の条件は
        <Link to="/tokushoho" className="mx-1 rounded text-rule-ink underline underline-offset-4">
          特定商取引法にもとづく表記
        </Link>
        をごらんください。
      </p>
    </LegalPage>
  )
}
