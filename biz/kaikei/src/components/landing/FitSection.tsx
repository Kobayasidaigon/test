import { Check, X } from 'lucide-react'
import { DISCLAIMER, FACTS, OUT_OF_SCOPE, findFact, formatSeireki } from '@/core'
import { Container, LedgerRule, Phrase, SectionHeading } from './Section'

// 「向いている団体／向いていない団体」。
// 21st.dev の Us vs Them Comparison（olewandowski1）をもとにした。
// もとのまま使っているところ: 左右に並べた2つの欄。片方はチェックの行、もう片方はバツの行（色だけでなく、形でも分ける）。
// 変えたところ: もとは「自社とほかの会社」をくらべる部品だった。ほかのサービスを悪く言う使い方はせず、
// 「このサービスが合う団体と、合わない団体」を正直に並べる欄にした。おすすめの札、ボタン、見本の文は外した。
// カードを2枚並べるのをやめて、1枚の紙を、帳簿の罫線で左右に分けた。

const GOOD_FIT: { text: string; detail?: string }[] = [
  { text: '町内会・自治会とその班、子ども会、老人クラブ、スポーツ少年団、PTA、サークルなど。', detail: '団体の種類を選ぶと、よくある科目が入った帳簿から始められます。' },
  { text: '1年の取引が、おおむね300件まで。', detail: '会費の集金や、行事の買い物を、1件ずつ入れていく使い方です。' },
  { text: 'お金の置き場所が、現金と、預金口座3つまで。', detail: '口座のない団体は、現金だけでも使えます。' },
  { text: '会計係が、毎年のように交代する。', detail: 'ひきつぎファイルと引き継ぎ書で、次の方に渡せます。' },
  { text: '総会で、収支決算書と、監査の報告を出している。' },
  { text: '資料を、前の年の形に合わせたい。', detail: '科目の名前と並び、決算書の「差」の向き、役の呼び名（監事、会計監査など）を変えられます。' },
]

// 「対象外」は、道具の画面と同じ文（src/core/notices.ts）を使う。そこにない2つを、ここで足す
const NOT_FIT = [
  ...OUT_OF_SCOPE.map((s) => ({ text: s.text, detail: s.detail })),
  { text: '会計を2つ以上に分けている団体には、向きません。', detail: '一般会計と特別会計のように、帳簿を分けてつけることはできません。' },
  { text: '2人以上で、同時に入力することはできません。', detail: '帳簿は、1つのファイルです。別々に入力した2つのファイルを、あとで1つにまとめることはできません。' },
]

export function FitSection() {
  // 「対象外」の理由のもとにした、公の資料
  const factIds = [...new Set(OUT_OF_SCOPE.flatMap((s) => s.factIds))]
  const facts = factIds.map((factId) => findFact(factId)).filter((f) => f !== undefined)
  // 本文まで開いて確かめられていない資料があるうちは、「出典」とは言わず、そのことを書いておく
  const unverified = FACTS.some((f) => factIds.includes(f.id) && f.how !== 'page')
  // 確かめた日。資料によって日が違うときは、いちばん古い日から新しい日までを書く（どれか1つの日だけを書くと、うそになるため）
  const days = facts.map((f) => f.checkedOn).sort()
  const firstDay = days[0] ?? ''
  const lastDay = days[days.length - 1] ?? ''
  const checkedText = firstDay === lastDay ? formatSeireki(firstDay) : `${formatSeireki(firstDay)}から${formatSeireki(lastDay)}の間`

  return (
    <section id="fit" aria-labelledby="fit-title" className="scroll-mt-4 py-16 sm:py-24">
      <Container>
        <LedgerRule />
        <SectionHeading
          id="fit-title"
          className="pt-10 sm:pt-14"
          title={
            <>
              <Phrase>向いている団体と、</Phrase>
              <Phrase>向いていない団体。</Phrase>
            </>
          }
          lead="小さな団体の、現金と預金の出入りをまとめるための道具です。できないことも、先にお伝えします。"
        />

        <div className="mt-8 grid overflow-hidden rounded-xl border border-border bg-paper shadow-paper md:grid-cols-2">
          <div className="border-t-[3px] border-t-rule px-5 py-6 sm:px-7">
            <h3 className="text-[1.3rem]">向いている団体</h3>
            <ul className="mt-4 grid gap-3">
              {GOOD_FIT.map((item) => (
                <li key={item.text} className="flex gap-3">
                  <span className="mt-[0.3em] flex size-[1.25rem] shrink-0 items-center justify-center rounded-sm bg-rule-ink text-white">
                    <Check className="size-3.5" strokeWidth={3.2} aria-hidden="true" />
                  </span>
                  <span className="leading-[1.75]">
                    <span className="font-bold">{item.text}</span>
                    {item.detail && <span className="mt-0.5 block text-[0.9rem] text-muted-foreground">{item.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t-[3px] border-t-input/70 bg-background/45 px-5 py-6 max-md:border-t md:border-l md:border-l-rule/50 sm:px-7">
            <h3 className="text-[1.3rem]">向いていない団体・できないこと</h3>
            <ul className="mt-4 grid gap-3">
              {NOT_FIT.map((item) => (
                <li key={item.text} className="flex gap-3">
                  <span className="mt-[0.3em] flex size-[1.25rem] shrink-0 items-center justify-center rounded-sm border-[1.5px] border-sumi/70 text-foreground">
                    <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="leading-[1.75]">
                    <span className="font-bold">{item.text}</span>
                    <span className="mt-0.5 block text-[0.9rem] text-muted-foreground">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-x-10 gap-y-5 text-[0.88rem] leading-[1.8] text-muted-foreground md:grid-cols-2">
          <p>{DISCLAIMER}</p>
          <div>
            <p className="font-bold text-foreground">{unverified ? '参考にした公の資料' : '出典'}</p>
            <ul className="mt-1 grid gap-1">
              {facts.map((fact) => (
                <li key={fact.id}>
                  {fact.source.publisher}「
                  <a href={fact.source.url} target="_blank" rel="noreferrer" className="rounded text-rule-ink underline underline-offset-4">
                    {fact.source.title}
                  </a>
                  」{fact.basis && `（${fact.basis}）`}
                </li>
              ))}
            </ul>
            <p className="mt-1.5">
              {checkedText}に確かめました。
              {unverified && '検索結果に出た抜粋で確かめたもので、ページの本文での確かめが済んでいない資料を含みます。'}
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
