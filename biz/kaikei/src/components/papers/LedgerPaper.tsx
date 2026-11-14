import { formatMonthDay, type Ledger, type LedgerReport } from '@/core'
import { Paper, PaperHeading, yen } from './Paper'

// 2. 出納帳。お金の置き場所ごとに1つ（現金出納帳、預金出納帳）。
// 日付、領収書の番号、科目、摘要、入金、出金、残高。最初の行は「前年度より繰越」。
// 何ページにも続くので、表の見出しの行は、次のページにも出る（paper.css）。

export function LedgerPaper({ report, ledger, watermark = false }: { report: LedgerReport; ledger: Ledger; watermark?: boolean }) {
  return (
    <Paper label={`${report.yearLabel} ${ledger.title}`} watermark={watermark}>
      <PaperHeading title={ledger.title} period={`${report.yearLabel}　${report.periodText}`} orgName={report.orgName} />
      <p className="paper-unit" style={{ textAlign: 'right', marginTop: 'calc(var(--u) * 2)', marginBottom: 'calc(var(--u) * 1.2)' }}>
        （単位：円）
      </p>
      <table className="paper-table">
        <colgroup>
          <col style={{ width: '10.5%' }} />
          <col style={{ width: '7.5%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">月日</th>
            <th scope="col" className="small" style={{ letterSpacing: 0 }}>
              領収書
              <br />
              の番号
            </th>
            <th scope="col">科目</th>
            <th scope="col">摘要</th>
            <th scope="col">入金</th>
            <th scope="col">出金</th>
            <th scope="col">残高</th>
          </tr>
        </thead>
        <tbody>
          {ledger.rows.map((row) => (
            <tr key={row.key} className={row.kind === 'opening' ? 'muted' : undefined}>
              <td className="nowrap small">{formatMonthDay(row.date)}</td>
              <td className="center small">{row.receiptNo}</td>
              <td className="small">{row.categoryName}</td>
              <td className="small">{row.description}</td>
              <td className="num">{row.inflow === null ? '' : yen(row.inflow)}</td>
              <td className="num">{row.outflow === null ? '' : yen(row.outflow)}</td>
              <td className="num">{yen(row.balance)}</td>
            </tr>
          ))}
          <tr className="total">
            <th scope="row" colSpan={4}>
              合計
            </th>
            <td className="num">{yen(ledger.inflowTotal)}</td>
            <td className="num">{yen(ledger.outflowTotal)}</td>
            <td className="num">{yen(ledger.closing)}</td>
          </tr>
        </tbody>
      </table>
      <p className="paper-note">
        前年度より繰越 {yen(ledger.opening)}円 ＋ 入金 {yen(ledger.inflowTotal)}円 − 出金 {yen(ledger.outflowTotal)}円 ＝ 残高 {yen(ledger.closing)}円
      </p>
    </Paper>
  )
}

/** すべての置き場所の出納帳を、続けて出す。 */
export function LedgerPapers({ report, watermark = false }: { report: LedgerReport; watermark?: boolean }) {
  return (
    <>
      {report.ledgers.map((ledger) => (
        <LedgerPaper key={ledger.accountId} report={report} ledger={ledger} watermark={watermark} />
      ))}
    </>
  )
}
