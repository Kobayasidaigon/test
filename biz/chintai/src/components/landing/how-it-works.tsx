import { useId, useState, type ReactNode } from 'react'
import { getCategory } from '@/core/categories'
import { formatYen } from '@/core/format'
import { buildMessage } from '@/core/message'
import { searchItems } from '@/core/search'
import { ASK_TOTAL_LABEL, ASK_TOTAL_NOTE } from '@/core/texts'
import type { Inspection } from '@/core/types'
import { CategoryMark } from '@/components/category-mark'
import { MessagePreview } from '@/components/message-preview'
import { PenCircle } from '@/components/pen'
import { Input } from '@/components/ui/input'
import { guidePath } from '@/lib/guide-link'
import { Link } from '@/router'

// 使い方（3つの手順）。道具の画面の3つの手順（見積書を入れる／点検の結果／確認の文面）と、同じ名前・同じ順にしてある。
//
// ln-dev7 の How It Works Steps（21st.dev）をもとにした。
// もとの部品から残したもの:
// - 番号と、番号をつなぐ1本の線、その下に題と短い説明、という組み立て。アイコンを使わず、文字で見せること。
// 変えたもの:
// - 丸い番号を、道具の画面と同じ、黒い四角の番号にした。真ん中寄せをやめて、左寄せにした。
// - 見本の文と、下のボタンは取った。かわりに、手順ごとに、道具の本物の部品を小さく置いた
//   （1 は、その場で打てる項目さがし。2 と 3 は、サンプルの見積書を本物のロジックに通した結果）。

/**
 * 見積書の言葉から、項目を探してみる欄。道具の「項目を足す」と同じ探し方（core の searchItems）を、その場で試せる。
 * はじめから「抗菌」が入っていて、静的HTMLの段階でも、候補が出ている。
 */
function TrySearch() {
  const [query, setQuery] = useState('抗菌')
  const inputId = useId()
  const matches = searchItems(query, 3)
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-bold">
        見積書の言葉を、入れてみる
      </label>
      <Input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例: 抗菌、鍵、サポート"
        autoComplete="off"
        enterKeyHint="search"
      />
      <div aria-live="polite" className="mt-2 min-h-[3.5rem]">
        {query.trim() === '' ? (
          <p className="text-[13px] leading-6 text-ink-soft">見積書に書かれている言葉を、入れてみてください。</p>
        ) : matches.length === 0 ? (
          <p className="text-[13px] leading-6 text-ink-soft">
            この道具の一覧には、見つかりませんでした。道具の画面では、「一覧にない項目」として、そのままの名前で足せます。
          </p>
        ) : (
          <ul>
            {matches.map((m, i) => {
              const guide = guidePath(m.item.guide?.slug ?? null)
              return (
                <li key={m.item.id} className="flex items-center gap-2 border-b border-rule py-1.5 last:border-b-0">
                  <CategoryMark id={m.item.category} variant={i} className="text-[12px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{m.item.name}</span>
                    <span className="block text-xs leading-5 text-ink-soft">{getCategory(m.item.category).label}</span>
                  </span>
                  {guide && (
                    <Link to={guide} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-xs text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
                      解説<span className="sr-only">（{m.item.name}）</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <p className="mt-2 border-t border-rule pt-2 text-xs leading-5 text-ink-soft">
        全角と半角、カタカナとひらがなの違いは、そろえて探します。見積書での書かれ方が少し違っても、見つかります。
      </p>
    </div>
  )
}

function Step({ n, title, children, demo, last }: { n: number; title: string; children: ReactNode; demo: ReactNode; last?: boolean }) {
  return (
    <li className="relative flex flex-col">
      {/* 番号をつなぐ線（広い画面だけ）。 */}
      {!last && <span aria-hidden className="absolute left-9 right-[-2.5rem] top-[13px] hidden h-px bg-rule-strong md:block" />}
      <span aria-hidden className="num relative grid size-7 place-items-center bg-ink text-[15px] font-bold leading-none text-white">
        {n}
      </span>
      <h3 className="mt-4 text-lg font-bold leading-snug">
        <span className="sr-only">手順{n}　</span>
        {title}
      </h3>
      <p className="mt-2 text-[15px] leading-[1.85] text-ink-soft">{children}</p>
      <div className="sheet mt-5 px-4 py-4">{demo}</div>
    </li>
  )
}

export function HowItWorks({ inspection }: { inspection: Inspection }) {
  // 手順3の見本。サンプルの見積書から、1つの項目だけを選んだときの、LINE 用の文面。
  const one = inspection.findings.find((f) => f.itemId === 'shodoku') ?? inspection.findings.find((f) => f.askDefault)
  const line = one ? buildMessage({ inspection, lineIds: [one.lineId], senderName: '', propertyName: '' }, 'line') : null

  return (
    <div>
      <ol className="grid gap-x-10 gap-y-10 md:grid-cols-3">
        <Step n={1} title="見積書を入れる" demo={<TrySearch />}>
          家賃、管理費、入居する日と、見積書の項目・金額を入れます。項目は、一覧から押して選ぶか、見積書に書かれている言葉で探せます。
        </Step>

        <Step
          n={2}
          title="点検の結果を見る"
          demo={
            <div>
              <p className="mb-2 text-xs text-ink-soft">サンプルの見積書の結果</p>
              <dl className="grid grid-cols-2 border border-rule-strong/70">
                <div className="px-3 py-2.5">
                  <dt className="text-[13px] font-bold">確かめる項目</dt>
                  <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <PenCircle variant={2} className="mx-[0.7em] my-[0.3em] text-pen">
                      <span className="font-pen text-[1.6rem] leading-none">{inspection.attentionCount}つ</span>
                    </PenCircle>
                    <span className="text-xs text-ink-soft">{inspection.findings.length}行のうち</span>
                  </dd>
                </div>
                <div className="border-l border-rule-strong/70 px-3 py-2.5">
                  <dt className="text-[13px] font-bold">入力した項目の合計</dt>
                  <dd className="num mt-2 text-[1.35rem] font-bold leading-none">{formatYen(inspection.total)}</dd>
                </div>
              </dl>
              <dl className="border border-t-0 border-rule-strong/70 px-3 py-2.5">
                <dt className="text-[13px] font-bold">{ASK_TOTAL_LABEL}</dt>
                <dd>
                  <span className="num mt-1.5 block text-[1.35rem] font-bold leading-none">
                    {formatYen(inspection.askTotal)}
                    <span className="ml-2 font-sans text-xs font-normal text-ink-soft">{inspection.askCount}項目の合計</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-ink-soft">{ASK_TOTAL_NOTE}</span>
                </dd>
              </dl>
            </div>
          }
        >
          確かめたほうがよい行に、赤ペンが入ります。なぜそう言うのかと、根拠にした資料を、行ごとに読めます。A4 の紙に印刷して、相談に持っていけます。
        </Step>

        <Step
          n={3}
          title="確認の文面を作る"
          last
          demo={
            line && (
              <div>
                <p className="mb-2 text-xs text-ink-soft">1つの項目を選んだときの、LINE用の文面</p>
                <MessagePreview message={line} />
              </div>
            )
          }
        >
          聞きたい項目を選ぶと、不動産会社に送る文面ができます。メール用のていねいな文と、LINE用の短い文。コピーして、自分の言葉に直して使います。
        </Step>
      </ol>

      <ul className="mt-10 grid gap-x-10 gap-y-2 border-t border-ink/20 pt-6 text-sm leading-7 text-ink-soft md:grid-cols-2">
        <li>まず動きを見たいときは、道具の画面で「サンプルの見積書を入れる」を押してください。何も入力しなくても、試せます。</li>
        <li>入れた内容は、変わるたびに、そのブラウザの中に保存されます。</li>
        <li>「ファイルに書き出す」で、1つのファイルに保存できます。あとで読み込めば、続きから使えます。</li>
        <li>不動産会社の名前を入れる欄は、ありません。</li>
      </ul>
    </div>
  )
}
