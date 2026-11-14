import type { DateString, SettlementReport, SettlementSection } from '@/core'
import { Paper, PaperDate, PaperHeading, PaperSection, PaperSign, yen } from './Paper'

// 1. 収支決算書。
// 収入の部（最初の行が前年度繰越金）、支出の部、収入合計 − 支出合計 ＝ 次年度繰越金、繰越金の内訳、作成日と会計の署名欄。

function SectionTable({ section, totalLabel, diffLabel }: { section: SettlementSection; totalLabel: string; diffLabel: string }) {
  // 「差（決算−予算）」は幅がせまいので、「差」と向きを2行に分けて書く
  const [diffHead, diffSub] = diffLabel.split('（')
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
          <th scope="col">
            {diffHead}
            {diffSub && <span className="small" style={{ display: 'block', fontWeight: 400, letterSpacing: 0 }}>（{diffSub}</span>}
          </th>
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
  return (
    <Paper label={report.title} watermark={watermark} pages={1 + (report.income.rows.length + report.expense.rows.length) / 34}>
      <PaperHeading title={report.title} period={report.periodText} orgName={report.orgName} />

      <PaperSection title="収入の部" unit="（単位：円）" />
      <SectionTable section={report.income} totalLabel="収入合計" diffLabel={report.diffLabel} />

      <PaperSection title="支出の部" unit="（単位：円）" />
      <SectionTable section={report.expense} totalLabel="支出合計" diffLabel={report.diffLabel} />

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

      <div style={{ breakInside: 'avoid' }}>
        <PaperSection title="次年度繰越金の内訳" unit="（単位：円）" />
        <table className="paper-table" style={{ width: '58%' }}>
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
    </Paper>
  )
}
