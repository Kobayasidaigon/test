import { Link } from '@/router'
import { site } from '@/site.config'
import { Filled, LegalPage } from '@/components/landing/LegalPage'

// 特定商取引法にもとづく表記。中身は src/site.config.ts の operator と sales から出す。
// 運営者の名前や住所は、運営者が公開前に書く（空のあいだは「公開前に記入します」と出る）。

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
  return (
    <LegalPage
      title="特定商取引法にもとづく表記"
      lead={`${site.name}の有料版（${site.pricing.pro.unit}ぶんのライセンスキー）の販売についての表記です。`}
    >
      <dl className="border-t-[3px] border-double border-rule">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-x-6 gap-y-1 border-b border-rule/50 py-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <dt className="font-bold leading-[1.7]">{label}</dt>
            <dd className="leading-[1.85]">
              <Filled value={value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-[0.92rem] leading-[1.85] text-muted-foreground">
        定めた日: <Filled value={site.legalUpdatedOn} />
        <span className="mx-2">／</span>
        料金のくわしい説明は
        <Link to="/#pricing" className="mx-1 rounded text-rule-ink underline underline-offset-4">
          料金
        </Link>
        を、個人情報の扱いは
        <Link to="/privacy" className="mx-1 rounded text-rule-ink underline underline-offset-4">
          プライバシーポリシー
        </Link>
        をごらんください。
      </p>
    </LegalPage>
  )
}
