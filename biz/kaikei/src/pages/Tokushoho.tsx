import { Link } from '@/router'
import { site } from '@/site.config'

// 特定商取引法にもとづく表記。中身は src/site.config.ts の operator と sales から出す。
const todo = '（公開前に記入します）'

export default function Tokushoho() {
  const rows: [string, string][] = [
    ['販売事業者', site.operator.name || todo],
    ['運営責任者', site.operator.representative || todo],
    ['所在地', site.operator.address || todo],
    ['電話番号', site.operator.phone || todo],
    ['メールアドレス', site.operator.email || todo],
    ['販売価格', site.sales.price],
    ['商品代金以外の必要料金', site.sales.extraCost],
    ['支払方法', site.sales.payment],
    ['支払時期', site.sales.paymentTiming],
    ['商品の引渡し時期', site.sales.delivery],
    ['返品・キャンセル', site.sales.refund],
  ]
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm text-muted-foreground"><Link to="/" className="underline underline-offset-4">{site.name}</Link></p>
      <h1 className="mt-4 text-2xl font-bold">特定商取引法にもとづく表記</h1>
      <dl className="mt-8 divide-y border-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="font-medium">{k}</dt>
            <dd className="text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
