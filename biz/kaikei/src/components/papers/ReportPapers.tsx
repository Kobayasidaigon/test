import type { DateString, Reports } from '@/core'
import { AuditPaper } from './AuditPaper'
import { BudgetDraftPaper } from './BudgetDraftPaper'
import { HandoverPaper } from './HandoverPaper'
import { LedgerPapers } from './LedgerPaper'
import { SettlementPaper } from './SettlementPaper'

/** 資料の種類。並びは、総会の資料をとじる順。 */
export const REPORT_KINDS = [
  { kind: 'settlement', label: '収支決算書', short: '決算書' },
  { kind: 'ledgers', label: '出納帳', short: '出納帳' },
  { kind: 'audit', label: '会計監査報告書', short: '監査報告' },
  { kind: 'budget', label: '次年度の予算案', short: '予算案' },
  { kind: 'handover', label: '引き継ぎ書', short: '引き継ぎ書' },
] as const

export type ReportKind = (typeof REPORT_KINDS)[number]['kind']

/** 選んだ種類の資料を、続けて出す（印刷に使う）。 */
export function ReportPapers({
  reports,
  kinds,
  today,
  watermark,
}: {
  reports: Reports
  kinds: readonly ReportKind[]
  today: DateString
  watermark: boolean
}) {
  return (
    <>
      {REPORT_KINDS.filter((k) => kinds.includes(k.kind)).map(({ kind }) => {
        if (kind === 'settlement') return <SettlementPaper key={kind} report={reports.settlement} today={today} watermark={watermark} />
        if (kind === 'ledgers') return <LedgerPapers key={kind} report={reports.ledgers} watermark={watermark} />
        if (kind === 'audit') return <AuditPaper key={kind} report={reports.audit} watermark={watermark} />
        if (kind === 'budget') return <BudgetDraftPaper key={kind} report={reports.budgetDraft} yearLabel={reports.settlement.yearLabel} watermark={watermark} />
        return <HandoverPaper key={kind} report={reports.handover} watermark={watermark} />
      })}
    </>
  )
}
