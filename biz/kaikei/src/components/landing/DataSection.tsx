import { HardDrive, ServerOff, X } from 'lucide-react'
import { Link } from '@/router'
import { Container, Phrase, SectionHeading } from './Section'

// 「登録なし。どこにも預けない」。
// 地の色は、帳簿の表紙の青緑（--rule-ink）。ページの中で、ここだけ色を変えて、いちばん大事な約束だとわかるようにする。
// 絵は、21st.dev の部品ではなく、このページのために組んだ（データがどこにあって、どこには行かないか）。

const POINTS = [
  {
    title: '登録もログインも、ありません。',
    body: 'サイトを開けば、すぐに使えます。お名前やメールアドレスをうかがうのは、有料版をお申し込みのときだけです。',
  },
  {
    title: '入力した内容は、送られません。',
    body: '置き場所は、お使いのブラウザの中と、ご自分で保存したひきつぎファイルの2つだけ。運営者は、あなたの団体の帳簿を見ることができません。',
  },
  {
    title: 'アクセス解析も、広告も、入れていません。',
    body: 'だれが、どのページを見たかを集めるしくみは、ありません。',
  },
]

export function DataSection() {
  return (
    <section id="data" aria-labelledby="data-title" className="bg-rule-ink py-14 text-white sm:py-20">
      <Container>
        <div className="grid gap-x-14 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <SectionHeading
              id="data-title"
              tone="cover"
              title={
                <>
                  <Phrase>登録は、いりません。</Phrase>
                  <Phrase>団体のお金の情報を、</Phrase>
                  <Phrase>どこにも預けません。</Phrase>
                </>
              }
            />
            <dl className="mt-7 grid gap-5">
              {POINTS.map((point) => (
                <div key={point.title} className="border-l-[3px] border-white/50 pl-4">
                  <dt className="text-[1.08rem] font-bold leading-snug">{point.title}</dt>
                  <dd className="mt-1.5 max-w-[36em] text-[0.96rem] leading-[1.85] text-white/90">{point.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* データのある場所の絵 */}
          <div className="grid gap-3" role="img" aria-label="入力した内容は、あなたのパソコンやスマートフォンの中（ブラウザの中の控えと、ひきつぎファイル）にだけあり、運営者のサーバーには送られません。">
            <div className="rounded-xl bg-paper p-4 text-foreground shadow-paper sm:p-5">
              <p className="flex items-center gap-2 font-serif text-[1.1rem] font-bold">
                <HardDrive className="size-5 text-rule-ink" aria-hidden="true" />
                あなたのパソコン・スマートフォン
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-lg border border-rule/60 bg-rule-soft/50 px-3.5 py-3">
                  <p className="font-bold leading-snug">ブラウザの中の控え</p>
                  <p className="mt-1 text-[0.86rem] leading-[1.7] text-muted-foreground">入力するたびに、自動で保存されます。</p>
                </div>
                <div className="rounded-lg border border-rule/60 bg-rule-soft/50 px-3.5 py-3">
                  <p className="font-bold leading-snug">ひきつぎファイル</p>
                  <p className="mt-1 text-[0.86rem] leading-[1.7] text-muted-foreground">「ファイルに保存」で、ご自分で残します。</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[0.92rem] font-bold" aria-hidden="true">
              <span className="h-6 border-l-2 border-dashed border-white/60" />
              <span className="flex size-7 items-center justify-center rounded-full border-2 border-white/80">
                <X className="size-4" strokeWidth={3} />
              </span>
              <span>ここから先へは、送りません</span>
            </div>
            <div className="rounded-xl border-2 border-dashed border-white/55 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-2 font-serif text-[1.05rem] font-bold">
                <ServerOff className="size-5" aria-hidden="true" />
                運営者のサーバー
              </p>
              <p className="mt-1 text-[0.9rem] leading-[1.75] text-white/90">帳簿のデータは、届きません。保存する場所も、ありません。</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-4 border-t border-white/35 pt-6 text-[0.94rem] leading-[1.85] text-white/90 md:grid-cols-2">
          <p>
            <span className="font-bold text-white">そのかわり、帳簿を守るのは、ご自分です。</span>
            ブラウザの中のデータは、消えることがあります。作業のあとは「ファイルに保存」を押して、ひきつぎファイルを残してください。消えた帳簿を、運営者が元に戻すことはできません。
          </p>
          <p>
            <span className="font-bold text-white">ページを開くときの通信について。</span>
            文字の形（書体）は、Google のサーバーから読み込みます。このときも、入力した内容は送られません。くわしくは
            <Link to="/privacy" className="mx-0.5 rounded font-bold underline underline-offset-4 outline-white">
              プライバシーポリシー
            </Link>
            に書いてあります。
          </p>
        </div>
      </Container>
    </section>
  )
}
