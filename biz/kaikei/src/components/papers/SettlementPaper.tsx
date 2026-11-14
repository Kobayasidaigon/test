import type { DateString, SettlementReport, SettlementSection } from '@/core'
import { Paper, PaperDate, PaperHeading, PaperSection, PaperSign, yen } from './Paper'

// 1. 収支決算書。
// 収入の部（最初の行が前年度繰越金）、支出の部、収入合計 − 支出合計 ＝ 次年度繰越金、繰越金の内訳、作成日と会計の署名欄。

function SectionTable({ section, totalLabel }: { section: SettlementSection; totalLabel: string }) {
  return (
    <table className="paper-table">
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '30%' }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">科目</th>
          <th scope="col">予算額</th>
          <th scope="col">決算額</th>
          <th scope="col">差</th>
          <th scope="col">説明</th>
        </tr>
      </thead>
      <tbody>
        {section.rows.map((row) => (
          <tr key={row.key}>
            <td>{row.name}</td>
            <td className="num">{yen(row.budget)}</td>
            <td className="num">{yen(row.actual)}</td>
            <td className="num">{yen(row.diff)}</td>
            <td className="small">{row.note}</td>
          </tr>
        ))}
        <tr className="total">
          <th scope="row">{totalLabel}</th>
          <td className="num">{yen(section.total.budget)}</td>
          <td className="num">{yen(section.total.actual)}</td>
          <td className="num">{yen(section.total.diff)}</td>
          <td />
        </tr>
      </tbody>
    </table>
  )
}

export function SettlementPaper({
  report,
  today,
  watermark = false,
}: {
  report: SettlementReport
  /** 作成日を決めていないときに出す日付（今日）。LP の見本では、決まった日付を渡す */
  today: DateString
  watermark?: boolean
}) {
  // 「差」の向き（決算−予算 か、予算−決算 か）は、表の見出しを2行にせず、単位の横に書く（1枚に収めるため）
  const unit = `（単位：円。${report.diffLabel.replace(/^差（(.+)）$/, '差は「$1」')}）`
  return (
    <Paper label={report.title} watermark={watermark}>
      <PaperHeading title={report.title} period={report.periodText} orgName={report.orgName} />

      <PaperSection title="収入の部" unit={unit} />
      <SectionTable section={report.income} totalLabel="収入合計" />

      <PaperSection title="支出の部" unit={unit} />
      <SectionTable section={report.expense} totalLabel="支出合計" />

      <div className="paper-result">
        <span className="term">
          収入合計 <b>{yen(report.incomeTotal)}</b>円
        </span>
        <span className="op">−</span>
        <span className="term">
          支出合計 <b>{yen(report.expenseTotal)}</b>円
        </span>
        <span className="op">＝</span>
        <span className="term main">
          次年度繰越金 <b>{yen(report.carryover)}</b>円
        </span>
      </div>

      <div className="paper-bottom">
        <div className="breakdown">
          <PaperSection title="次年度繰越金の内訳" unit="（単位：円）" />
          <table className="paper-table">
            <colgroup>
              <col style={{ width: '60%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">お金の置き場所</th>
                <th scope="col">金額</th>
              </tr>
            </thead>
            <tbody>
              {report.breakdown.map((b) => (
                <tr key={b.accountId}>
                  <td>{b.name}</td>
                  <td className="num">{yen(b.amount)}</td>
                </tr>
              ))}
              <tr className="total">
                <th scope="row">合計</th>
                <td className="num">{yen(report.breakdownTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="paper-closing">
          <p>上記のとおり、報告します。</p>
          <p className="paper-date">
            <PaperDate date={report.reportDate || today} />
          </p>
          <div className="paper-signs">
            <PaperSign role={report.treasurer.title} name={report.treasurer.name} />
          </div>
        </div>
      </div>
    </Paper>
  )
}
