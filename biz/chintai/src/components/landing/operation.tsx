import { adDisclosure } from '@/core/consult'
import { formatYen } from '@/core/format'
import { getSource } from '@/core/sources'
import { SourceLink } from '@/components/source-link'
import { visibleOffers } from '@/offers'
import { Link } from '@/router'
import { site } from '@/site.config'

// このサイトの運営。料金と売り方は、site.config.ts の pricing にある事実だけを出す。
// 左は、見積書と同じ「項目と金額」の表（このサイトを使うのにかかるお金）。右は、広告で運営していることの説明。

export function Operation() {
  const p = site.pricing
  const ads = visibleOffers().length
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: '道具の利用料', value: formatYen(p.toolPriceYen), strong: true },
    { label: '会員登録', value: p.signupRequired ? 'あり' : 'なし' },
    { label: '有料版', value: 'なし' },
    { label: '入力した内容の送信', value: p.sendsInputToServer ? 'あり' : 'なし' },
    { label: '運営の収入', value: p.revenue === 'ads' ? '広告' : '' },
  ]
  return (
    <div className="grid items-start gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="sheet px-4 py-5 sm:px-7 sm:py-6">
        <table className="w-full border-collapse text-[15px]">
          <caption className="border-b-[1.5px] border-ink/70 pb-1.5 text-left text-[13px] text-ink-soft">このサイトを使うのに、かかるお金</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-rule">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  {r.label}
                </th>
                <td className={r.strong ? 'num py-2.5 text-right text-lg font-bold' : 'py-2.5 text-right'}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[13px] leading-6 text-ink-soft">{p.priceNote}</p>
      </div>

      <div className="max-w-[40em] text-[15px] leading-[1.85]">
        <p>{p.revenueNote}</p>
        <p className="mt-3">
          {ads === 0
            ? 'いまは、広告をまだ1つも載せていません。載せるようになったら、点検の結果の画面と、項目ごとの解説のページに、枠で区切って出します。'
            : '広告は、点検の結果の画面と、項目ごとの解説のページに、枠で区切って出しています。'}
        </p>
        <p className="mt-3 text-sm leading-7 text-ink-soft">
          {adDisclosure.text}
          <span className="mt-1 block">
            出典: <SourceLink source={getSource(adDisclosure.sourceIds[0])} />
          </span>
        </p>
        <p className="mt-4 text-sm">
          <Link to="/about" className="inline-flex min-h-11 items-center underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            運営者と、この道具がしないことについて
          </Link>
        </p>
      </div>
    </div>
  )
}
