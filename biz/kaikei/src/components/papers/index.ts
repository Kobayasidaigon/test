// 総会の資料（5種類）の「紙」。道具の画面と、LP の見本の両方で使う。
// 中身は src/core の buildReports() が作った値を、そのまま渡す。
export { Paper, PaperFrame } from './Paper'
export { SettlementPaper } from './SettlementPaper'
export { LedgerPaper, LedgerPapers } from './LedgerPaper'
export { AuditPaper } from './AuditPaper'
export { BudgetDraftPaper } from './BudgetDraftPaper'
export { HandoverPaper } from './HandoverPaper'
export { ReportPapers, REPORT_KINDS, type ReportKind } from './ReportPapers'
