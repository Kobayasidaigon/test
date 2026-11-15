// 「よくある質問」。答えは、道具が実際にそうなっていることだけを書く。金額と人数は site.config.ts から、祝日の出典は core から取る。
import type { ReactNode } from 'react'
import { EQUINOX_ANNOUNCED_THROUGH, HOLIDAY_SOURCES } from '@/core'
import { site } from '@/site.config'
import { Accordion, type AccordionItem } from '@/components/ui/accordion'
import { LpHeading, LpSection, Ph } from './section'

function P({ children }: { children: ReactNode }) {
  return <p className="lp-prose [&+p]:mt-2">{children}</p>
}

/** '2026-11-14' を「2026年11月14日」にする */
function jaDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export function Faq() {
  const { free, pro } = site.pricing
  const proPlan = site.plans.pro

  const items: AccordionItem[] = [
    {
      id: 'signup',
      title: '登録やインストールは、要りますか。',
      content: <P>どちらも要りません。「道具を開く」を押すと、ブラウザの中でそのまま動きます。メールアドレスも、パスワードも聞きません。</P>,
    },
    {
      id: 'where',
      title: 'スタッフの名前や希望休は、どこに保存されますか。',
      content: (
        <>
          <P>お使いのブラウザの中（そのパソコンやスマホの中）だけです。このサイトのサーバーには送りません。</P>
          <P>ブラウザの履歴やサイトのデータを消すと、いっしょに消えます。「ファイルに保存する」で、ファイルにも残しておいてください。</P>
        </>
      ),
    },
    {
      id: 'two-pcs',
      title: '家のパソコンと店のパソコン、両方で使えますか。',
      content: <P>使えます。ただし、自動ではそろいません。片方で「ファイルに保存する」を押してファイルを作り、もう片方で「ファイルを開く」から読み込みます。</P>,
    },
    {
      id: 'phone',
      title: 'スマホだけでも使えますか。',
      content: <P>スマホの幅でも使えるように作ってあります。表は、名前の列を残したまま、横に動かして見ます。最初にスタッフや人数を入れるところは量が多いので、パソコンのほうが楽です。</P>,
    },
    {
      id: 'holiday',
      title: '祝日は、どうあつかわれますか。',
      content: (
        <>
          <P>日本の祝日を、国民の祝日に関する法律の決まり（振替休日などをふくみます）から計算して、表に印を付けます。祝日の人数は「日曜と同じ」「その曜日のまま」「休みにする」から選べて、日ごとにも変えられます。</P>
          <P>
            計算した日付は、次の公表の一覧と同じになることを確かめています。{EQUINOX_ANNOUNCED_THROUGH + 1}年からあとの春分の日・秋分の日は見込みで、新しく決まった祝日は入りません。カレンダーでもお確かめください。
          </P>
          <ul className="mt-2 grid gap-1 text-[13.5px] leading-relaxed text-ink-soft">
            {HOLIDAY_SOURCES.map((s) => (
              <li key={s.id}>
                出典:{' '}
                <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-ink underline underline-offset-4">
                  {s.title}
                </a>
                （{jaDate(s.checkedOn)}に確認）
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      id: 'draft',
      title: 'できた表は、そのまま使ってよいですか。',
      content: (
        <>
          <P>たたき台です。あなたが決めた条件（休み希望、連勤の上限など）に合っているかは点検しますが、いちばん良い表であることや、労働基準法などの法令に合っていることは保証しません。</P>
          <P>気になるところは、マスを押して直してください。「別の案を作る」を押せば、何度でも組み直せます。</P>
        </>
      ),
    },
    {
      id: 'nine',
      title: `スタッフが${free.staffLimit + 1}人以上の店は、無料では使えませんか。`,
      content: (
        <P>
          無料版で入れられるスタッフは、{free.staffLimit}人までです。{free.staffLimit + 1}人以上の店は、{proPlan.name}版（{proPlan.price}・税込）をお使いください。動作を確かめているのは、{pro.testedStaffLimit}人までです。
        </P>
      ),
    },
    {
      id: 'next-month',
      title: '次の月も、スタッフや条件を入れ直しますか。',
      content: (
        <>
          <P>入れ直さなくてかまいません。①で月を変えると、店の名前、勤務の種類、スタッフ、曜日ごとの必要な人数、条件は、そのまま残ります（無料版でも同じです）。消えるのは、前の月の希望休と表です。</P>
          <P>
            {proPlan.name}版の「翌月への引き継ぎ」は、これに加えて、前の月の終わりの勤務を持っていき、月をまたぐ連勤や、続けて入れない組み合わせも数えます。
          </P>
        </>
      ),
    },
    {
      id: 'key',
      title: `${proPlan.name}版のキーは、何台で使えますか。なくしたときは。`,
      content: (
        <>
          <P>キーは、使うブラウザごとに入れます。同じ店で使うパソコンやスマホなら、何台に入れてもかまいません。</P>
          <P>ブラウザのデータを消すと、キーもいっしょに消えます。キーが書いてあるメールは、残しておいてください。なくしたときは、お問い合わせ先にご連絡いただければ、送り直します。</P>
        </>
      ),
    },
    {
      id: 'once',
      title: `${proPlan.name}版は、あとから料金がかかりませんか。`,
      content: (
        <P>
          かかりません。{site.sales.paymentTiming}
          ライセンスキーに、期限はありません。
        </P>
      ),
    },
    {
      id: 'browser',
      title: 'どのブラウザで使えますか。',
      content: <P>動作を確かめているのは、Google Chrome と同じしくみのブラウザ（Chromium）です。Safari、Firefox でも動くように作っていますが、まだ確かめられていません。うまく動かないときは、Chrome でお試しください。</P>,
    },
  ]
  if (site.contact) {
    items.push({
      id: 'contact',
      title: '困ったときは、どこに聞けばよいですか。',
      content: <P>こちらまでご連絡ください: {site.contact}</P>,
    })
  }

  return (
    <LpSection id="faq" tone="white">
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
        <LpHeading
          id="faq"
          kicker="よくある質問"
          color="plum"
          title={
            <>
              <Ph>よくある</Ph>
              <Ph>質問</Ph>
            </>
          }
          lead="質問を押すと、答えが開きます。"
          className="lg:sticky lg:top-24"
        />
        <Accordion items={items} defaultOpen={['signup']} />
      </div>
    </LpSection>
  )
}
