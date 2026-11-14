import type { AuditReport } from '@/core'
import { Paper, PaperDate, PaperSign, yen } from './Paper'

// 3. 会計監査報告書。
// 宛て名、決まった文（団体で言い回しを変えられる）、金額、監査の日、監査をした人の署名欄（はんこの丸）。
// 監査の日が空のときは、紙に手で書けるように空けて出す。

export function AuditPaper({ report, watermark = false }: { report: AuditReport; watermark?: boolean }) {
  return (
    <Paper label={`${report.yearLabel} ${report.title}`} watermark={watermark}>
      <p style={{ textAlign: 'right' }}>
        <PaperDate date={report.date} />
      </p>
      <p style={{ marginTop: 'calc(var(--u) * 8)', fontSize: 'calc(var(--u) * 4.3)' }}>{report.addressee}</p>

      <h2 className="paper-title" style={{ marginTop: 'calc(var(--u) * 16)' }}>
        {report.title}
      </h2>

      <p className="paper-body-text">{report.body}</p>

      <table className="paper-table" style={{ width: '76%', margin: 'calc(var(--u) * 12) auto 0' }}>
        <colgroup>
          <col style={{ width: '58%' }} />
          <col style={{ width: '42%' }} />
        </colgroup>
        <tbody>
          <tr>
            <th scope="row">収入合計（前年度繰越金を含む）</th>
            <td className="num">{yen(report.figures.incomeTotal)} 円</td>
          </tr>
          <tr>
            <th scope="row">支出合計</th>
            <td className="num">{yen(report.figures.expenseTotal)} 円</td>
          </tr>
          <tr className="total">
            <th scope="row" style={{ textAlign: 'left', letterSpacing: 0 }}>
              次年度繰越金
            </th>
            <td className="num">{yen(report.figures.carryover)} 円</td>
          </tr>
        </tbody>
      </table>

      <div className="paper-closing" style={{ marginTop: 'calc(var(--u) * 22)' }}>
        <div className="paper-signs" style={{ gap: 'calc(var(--u) * 7)' }}>
          {report.auditors.map((name, i) => (
            <PaperSign key={i} role={report.auditorTitle} name={name} />
          ))}
        </div>
      </div>
    </Paper>
  )
}
