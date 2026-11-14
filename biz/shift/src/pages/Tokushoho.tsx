import { site } from '@/site.config'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { LegalPage } from '@/components/landing/legal-page'

// 特定商取引法にもとづく表記。中身は src/site.config.ts の operator と sales から出す。
// 運営者の名前や住所は、公開前に運営者が site.config.ts に書く。空のあいだは「公開前に記入します」と出す。
const todo = '（公開前に記入します）'

export default function Tokushoho() {
  const rows: [string, string][] = [
    ['販売事業者', site.operator.name],
    ['運営責任者', site.operator.representative],
    ['所在地', site.operator.address],
    ['電話番号', site.operator.phone],
    ['メールアドレス', site.operator.email],
    ['販売価格', site.sales.price],
    ['商品代金以外の必要料金', site.sales.extraCost],
    ['支払方法', site.sales.payment],
    ['支払時期', site.sales.paymentTiming],
    ['商品の引渡し時期', site.sales.delivery],
    ['返品・キャンセル', site.sales.refund],
    ['動作環境', site.sales.environment],
  ]
  const missing = rows.some(([, v]) => !v)

  return (
    <LegalPage title="特定商取引法にもとづく表記" color="egg" lead={`${site.name}の${site.plans.pro.name}版（有料）の販売について、法律で決められた項目を記載します。`}>
      {missing ? (
        <Notice variant="warn" className="mb-6">
          <NoticeTitle>このページは、準備中です</NoticeTitle>
          {/* 決済ページがまだないときだけ「販売していません」と言う（決済ページがあるのに空の項目が残るのは、設定のもれ） */}
          <NoticeBody>{site.checkoutUrl ? '販売事業者の情報に、まだ記入していない項目があります。' : `${site.plans.pro.name}版は、まだ販売していません。販売事業者の名前や連絡先は、販売を始める前に、ここに記入します。`}</NoticeBody>
        </Notice>
      ) : null}

      <dl className="overflow-hidden rounded-xl border-2 border-ink bg-card shadow-hard">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-x-6 gap-y-1 border-b border-line px-4 py-3.5 last:border-b-0 sm:grid-cols-[13rem_1fr] md:px-6">
            <dt className="text-[14.5px] font-bold">{k}</dt>
            <dd className={v ? 'text-[15px] leading-[1.85]' : 'text-[15px] leading-[1.85] text-ink-soft'}>{v || todo}</dd>
          </div>
        ))}
      </dl>
    </LegalPage>
  )
}
