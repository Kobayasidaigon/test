import type { BudgetDraftReport, BudgetDraftSection } from '@/core'
import { Paper, PaperHeading, PaperSection, yen } from './Paper'

// 4. 次年度の予算案。
// 科目ごとに、今年度の予算、今年度の決算、次年度の予算案、今年度の予算との差。
// 見出しは「今年度」「次年度」と書かず、年度の呼び名（令和7年度、令和8年度）で書く
// （総会でこの紙を読む人には、どちらが「今年度」かがわかりにくいため）。

function DraftTable({ section, totalLabel, yearLabel, nextYearLabel }: { section: BudgetDraftSection; totalLabel: string; yearLabel: string; nextYearLabel: string }) {
  return (
    <table className="paper-table">
      <colgroup>
        <col style={{ width: '28%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">科目</th>
          <th scope="col" className="small">
            {yearLabel}
            <br />
            予算額
          </th>
          <th scope="col" className="small">
            {yearLabel}
            <br />
            決算額
          </th>
          <th scope="col" className="small">
            {nextYearLabel}
            <br />
            予算額（案）
          </th>
          <th scope="col" className="small">
            予算額の増減
          </th>
        </tr>
      </thead>
      <tbody>
        {section.rows.map((row) => (
          <tr key={row.key}>
            <td>{row.name}</td>
            <td className="num">{yen(row.currentBudget)}</td>
            <td className="num">{yen(row.currentActual)}</td>
            <td className="num">{yen(row.nextBudget)}</td>
            <td className="num">{yen(row.nextBudget - row.currentBudget)}</td>
          </tr>
        ))}
        <tr className="total">
          <th scope="row">{totalLabel}</th>
          <td className="num">{yen(section.total.currentBudget)}</td>
          <td className="num">{yen(section.total.currentActual)}</td>
          <td className="num">{yen(section.total.nextBudget)}</td>
          <td className="num">{yen(section.total.nextBudget - section.total.currentBudget)}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function BudgetDraftPaper({
  report,
  yearLabel,
  watermark = false,
}: {
  report: BudgetDraftReport
  /** いまの年度の呼び名（「令和7年度」） */
  yearLabel: string
  watermark?: boolean
}) {
  return (
    <Paper label={report.title} watermark={watermark} pages={1 + (report.income.rows.length + report.expense.rows.length) / 38}>
      <PaperHeading title={report.title} period={report.nextPeriodText} orgName={report.orgName} />

      <PaperSection title="収入の部" unit="（単位：円）" />
      <DraftTable section={report.income} totalLabel="収入合計" yearLabel={yearLabel} nextYearLabel={report.nextYearLabel} />

      <PaperSection title="支出の部" unit="（単位：円）" />
      <DraftTable section={report.expense} totalLabel="支出合計" yearLabel={yearLabel} nextYearLabel={report.nextYearLabel} />

      <div className="paper-result">
        <span className="term">
          収入合計 <b>{yen(report.income.total.nextBudget)}</b>円
        </span>
        <span className="op">−</span>
        <span className="term">
          支出合計 <b>{yen(report.expense.total.nextBudget)}</b>円
        </span>
        <span className="op">＝</span>
        <span className="term main">
          差引 <b>{yen(report.gap)}</b>円
        </span>
      </div>
      <p className="paper-note">「前年度繰越金」の{report.nextYearLabel}の予算額は、{yearLabel}の次年度繰越金です。</p>
    </Paper>
  )
}
