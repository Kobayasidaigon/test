import { ChevronDown, FileJson2, FolderOpen, Mail, Usb } from 'lucide-react'
import { SHARE_NOTE, createSampleBook, formatYen, latestYear, suggestFileName, summarizeYear } from '@/core'
import { site } from '@/site.config'
import { Container, Phrase, SealNumber, SectionHeading } from './Section'

// 「引き継ぎは、ファイル1つ」。渡す → 開く → 続きから、の3つの段。
// 21st.dev の How It Works Steps（ln-dev7）をもとにした。
// もとのまま使っているところ: 番号の丸を3つ横に並べ、細い線でつなぐ形。スマホでは縦に並べ、段の間に矢じるしを置く。
// 変えたところ: 「01 02 03」の数字を、はんこの形の丸に漢数字に。字だけだった段に、道具の画面の一部をまねた小さな絵を付けた
// （ファイルの名前、年度の一覧、残高は、サンプルの帳簿から本物の関数で出している）。まん中のボタンと、英語の小見出しは外した。

// 絵に出すファイルの名前の日付。決め打ちにする（静的HTMLと、ブラウザで描いた結果を同じにするため）
const SAVED_ON = new Date(2026, 10, 14, 12)

export function HandoverSteps() {
  const book = createSampleBook()
  const year = latestYear(book)
  const summary = summarizeYear(year, book.diffStyle)
  const fileName = suggestFileName(book, SAVED_ON)
  const pro = site.pricing.pro

  const steps = [
    {
      numeral: '一',
      title: '渡す',
      body: '「ファイルに保存」を押すと、ひきつぎファイルが1つできます。メールに付けるか、USB メモリに入れて、次の担当の方に渡します。',
      art: (
        <div className="flex h-full flex-col justify-center gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-rule/60 bg-paper px-3 py-2.5 shadow-lift">
            <FileJson2 className="size-7 shrink-0 text-rule-ink" strokeWidth={1.6} />
            {/* 長い名前は、「_」のうしろで折り返す */}
            <span className="min-w-0 text-[0.8rem] font-bold leading-snug [overflow-wrap:anywhere]">
              {fileName.split('_').map((part, i, all) => (
                <span key={i}>
                  {part}
                  {i < all.length - 1 && (
                    <>
                      _<wbr />
                    </>
                  )}
                </span>
              ))}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 text-[0.84rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-[1.1rem]" /> メール
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Usb className="size-[1.1rem]" /> USB メモリ
            </span>
          </div>
        </div>
      ),
    },
    {
      numeral: '二',
      title: '開く',
      body: '受け取った方は、このサイトの「ひきつぎファイルを開く」で、そのファイルを選びます。登録も、インストールも、いりません。',
      art: (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule bg-paper px-3 py-3 text-center">
          <span className="flex size-9 items-center justify-center rounded-full border border-rule/50 bg-rule-soft text-rule-ink">
            <FolderOpen className="size-5" />
          </span>
          <span className="text-[0.84rem] font-bold leading-snug">ここにファイルを置くか、選びます</span>
          <span className="rounded-md bg-rule-ink px-3 py-1.5 text-[0.82rem] font-bold leading-none text-white">ひきつぎファイルを選ぶ</span>
        </div>
      ),
    },
    {
      numeral: '三',
      title: '続きから',
      body: '同じ画面で、続きから入力できます。過去の年度も、同じファイルに入っています（過去の年度の取引は、読むだけです）。',
      art: (
        <div className="flex h-full flex-col justify-center gap-2">
          <div className="rounded-lg border border-border bg-paper shadow-lift">
            <p className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[0.84rem]">
              <span className="font-serif font-bold">{book.orgName}</span>
              <span className="inline-flex items-center gap-1 rounded border border-input px-1.5 py-0.5 font-bold">
                {year.label}
                <ChevronDown className="size-3.5" />
              </span>
            </p>
            <ul className="px-3 py-1.5 text-[0.82rem] leading-[1.7]">
              {[...book.years].reverse().map((y) => (
                <li key={y.id} className="flex justify-between gap-2">
                  <span className={y.id === year.id ? 'font-bold' : 'text-muted-foreground'}>{y.label}</span>
                  <span className="text-muted-foreground">{y.id === year.id ? '入力できます' : '読むだけ'}</span>
                </li>
              ))}
            </ul>
            <p className="flex items-baseline justify-between gap-2 border-t border-rule/50 bg-rule-soft/50 px-3 py-1.5 text-[0.82rem]">
              <span>いまの残高（合計）</span>
              <span className="num text-[0.98rem] font-bold">{formatYen(summary.carryover)} 円</span>
            </p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="handover" aria-labelledby="handover-title" className="scroll-mt-0 bg-kinari-deep/60 py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="handover-title"
          title={
            <>
              <Phrase>引き継ぎは、</Phrase>
              <Phrase>ファイルを1つ渡すだけ。</Phrase>
            </>
          }
          lead="帳簿のすべてが、1つのファイルに入ります。次の担当の方は、そのファイルを開けば、同じ画面で、続きから始められます。"
        />

        <div className="relative mt-10">
          {/* 3つの丸をつなぐ線（パソコンだけ） */}
          <div aria-hidden className="absolute inset-x-[16.66%] top-5 hidden border-t-2 border-dashed border-rule/70 md:block" />
          <ol className="relative grid gap-y-3 md:grid-cols-3 md:gap-x-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex flex-col">
              <div className="flex items-center gap-3 md:flex-col md:gap-2.5">
                <SealNumber className="relative z-[1]">{step.numeral}</SealNumber>
                <h3 className="text-[1.3rem] md:text-center">{step.title}</h3>
              </div>
              <div aria-hidden className="mt-3 h-[9.5rem] rounded-xl border border-border bg-background/70 p-3">
                {step.art}
              </div>
              <p className="mt-3 text-[0.96rem] leading-[1.85]">{step.body}</p>
              {i < steps.length - 1 && <ChevronDown aria-hidden className="mx-auto mt-2 size-6 text-rule md:hidden" />}
            </li>
          ))}
          </ol>
        </div>

        <div className="mt-9 grid gap-x-10 gap-y-4 border-t border-rule/50 pt-6 text-[0.94rem] leading-[1.85] md:grid-cols-2">
          <p>
            <span className="font-bold">有料版のキーも、ファイルと一緒に渡ります。</span>
            {pro.note}
          </p>
          <p>
            <span className="font-bold">渡すときの注意。</span>
            {SHARE_NOTE}
          </p>
        </div>
      </Container>
    </section>
  )
}
