import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { OUT_OF_SCOPE } from '@/core'
import { site } from '@/site.config'
import { Container, LedgerRule, SectionHeading } from './Section'

// よくある質問。
// 21st.dev の FAQ Section（kevingirelli）をもとにした。
// もとのまま使っているところ: 「split」の割りつけ（パソコンでは、左に見出し、右に質問の一覧）。質問は見出し（h3）の中の押せる行で、
// 見出しの下に「ここにない質問は…」の1行を置ける。
// 変えたところ: Radix の Accordion をやめて、ブラウザに元からある <details> にした。
// 閉じている答えも静的HTMLに入るので、ページ内の検索で見つかり、JavaScript が動かなくても開ける。
// 質問と答えの頭に「問」「答」のしるしを付けた。行の高さを 44px 以上に。見本の英語の質問は、すべて入れかえた。

const pro = site.pricing.pro
const tax = OUT_OF_SCOPE.find((s) => s.id === 'tax')

const ITEMS: { id: string; question: string; answer: ReactNode }[] = [
  {
    id: 'lost',
    question: '入力したデータが、消えてしまうことはありませんか。',
    answer: (
      <>
        <p>入力した内容は、お使いのブラウザの中に、自動で保存されます。ただ、ブラウザのデータを消したり、パソコンが壊れたりすると、なくなります。</p>
        <p>作業のあとは、画面の右上の「ファイルに保存」を押して、ひきつぎファイルを残してください。保存していない変更があるときは、画面に件数が出ます。</p>
      </>
    ),
  },
  {
    id: 'new-pc',
    question: 'パソコンを替えたら、どうなりますか。',
    answer: (
      <p>
        前のパソコンで「ファイルに保存」をして、新しいパソコンで「ひきつぎファイルを開く」を選ぶと、続きから使えます。有料版のキーもファイルに入っているので、入れ直さなくてすみます。
      </p>
    ),
  },
  {
    id: 'phone',
    question: 'スマートフォンでも使えますか。',
    answer: (
      <>
        <p>使えます。入力も、資料の確認も、スマートフォンの幅の画面に合わせてあります。印刷は、プリンターにつながったパソコンからのほうが、かんたんです。</p>
        <p>パソコンとスマートフォンの間で、データが自動でそろうことはありません。両方で使うときは、ファイルに保存して、もう一方で開いてください。</p>
      </>
    ),
  },
  {
    id: 'receipts',
    question: '領収書は、どうすればいいですか。',
    answer: (
      <p>
        領収書そのものは、これまでどおり、紙でつづっておいてください。支出を入れると、領収書の番号が順に付きます。同じ番号を領収書に書いておくと、出納帳と見くらべやすくなります。領収書の写真を取りこむことは、できません。
      </p>
    ),
  },
  {
    id: 'together',
    question: '会長や監査の方と、いっしょに使えますか。',
    answer: (
      <p>
        同時には使えません。帳簿は1つのファイルなので、入力する人は1人にしてください。ほかの方に見てもらうときは、資料を印刷して渡すか、ひきつぎファイルを渡して、開いて見てもらいます。別々に入力した2つのファイルを、1つにまとめることはできません。
      </p>
    ),
  },
  {
    id: 'midyear',
    question: '年度の途中からでも、始められますか。',
    answer: (
      <p>
        始められます。新しく始めるときに、年度のはじめの残高（現金と、口座ごと）を入れます。そのあと、年度のはじめからの取引を入れていくと、決算書ができます。これまでの表計算ソフトや紙の帳簿を、取りこむことはできません。
      </p>
    ),
  },
  {
    id: 'format',
    question: 'うちの団体の決算書と、形が少し違います。',
    answer: (
      <p>
        科目の名前と並びは、自由に変えられます。決算書の「差」の向き（決算−予算／予算−決算）と、役の呼び名（監事、会計監査など）も変えられます。紙の割りつけそのものは、変えられません。団体の規約と、前の年の資料の形に合わせて、お使いください。
      </p>
    ),
  },
  {
    id: 'price',
    question: `${pro.priceText}は、いつ、何のために払うのですか。`,
    answer: (
      <>
        <p>
          透かしのない資料を印刷するときと、次の年度へ繰り越すときに、いります。入力、集計、残高の照合、画面での確認、ファイルの保存は、ずっと無料です。無料のままでも印刷できますが、紙に「見本」の透かしが入ります。
        </p>
        <p>キーは、発行した日から{pro.licenseDays}日のあいだ使えます。次の年度の資料も透かしなしで印刷するときは、あらためてお申し込みください。</p>
      </>
    ),
  },
  {
    id: 'tax',
    question: '税務署への申告にも、使えますか。',
    answer: <p>使えません。{tax?.detail}</p>,
  },
  {
    id: 'closing',
    question: 'このサービスが終わったら、データはどうなりますか。',
    answer: (
      <p>
        帳簿は、あなたの手元（ブラウザの中と、ひきつぎファイル）にあるので、運営者の都合で消えることはありません。ただ、このサイトがなくなると、ひきつぎファイルを、この画面で開くことはできなくなります。総会の資料は、毎年、印刷して残しておくことをおすすめします。
      </p>
    ),
  },
]

export function Faq() {
  const contact = site.contact || site.operator.email
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-4 pb-16 sm:pb-24">
      <Container>
        <LedgerRule />
        <div className="grid gap-x-12 gap-y-6 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <SectionHeading id="faq-title" title="よくある質問" />
            <p className="mt-4 text-[0.96rem] leading-[1.85] text-muted-foreground">質問を押すと、答えが開きます。</p>
            {contact && (
              <p className="mt-2 text-[0.96rem] leading-[1.85] text-muted-foreground">
                ここにない質問は、<span className="break-all font-bold text-foreground">{contact}</span> まで、お寄せください。
              </p>
            )}
          </div>

          <div className="border-t border-rule/60">
            {ITEMS.map((item, i) => (
              <details key={item.id} open={i === 0} className="group border-b border-rule/60">
                <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 rounded-md py-3.5 pr-1 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="mt-[0.15em] flex size-7 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-shu font-serif text-[0.92rem] font-bold leading-none text-shu-ink">
                    問
                  </span>
                  <h3 className="flex-1 font-sans text-[1.06rem] font-bold leading-[1.6] tracking-normal">{item.question}</h3>
                  <Plus aria-hidden className="mt-1 size-5 shrink-0 text-rule-ink transition-transform duration-200 group-open:rotate-45" strokeWidth={2.6} />
                </summary>
                <div className="flex gap-3 pb-5 pr-1 sm:pr-8">
                  <span aria-hidden className="mt-[0.15em] flex size-7 shrink-0 items-center justify-center rounded-sm bg-rule-ink font-serif text-[0.92rem] font-bold leading-none text-white">
                    答
                  </span>
                  <div className="grid max-w-[40em] gap-2 leading-[1.9]">{item.answer}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
