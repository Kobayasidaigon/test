// Feature 11 from Hirael <https://hirael.com/blocks/features/feature-11>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
// （21st.dev の Feature Tab Switcher。もとの表示を残してある）
//
// もとのまま使っているところ: 縦に並んだタブ（名前と、ひとことの説明）の横に、選んだものの中身を見せる枠を置く組み立て。
// 矢印キーでタブを動かすと、中身もついてくる。
// 変えたところ: 中身を、見本の一覧（作りもののデータ）から、道具が作る本物の資料の紙（src/components/papers）にした。
// Radix の Tabs をやめて、自分で書いた（5枚とも静的HTMLに書き出して、選んでいない紙は隠すだけにするため。
// スマホではタブが横に並ぶので、矢印キーは、上下・左右のどちらでも動くようにした）。
// タブの見た目は、帳簿のインデックス（選んだものが、朱の線の付いた紙のつまみになる）に。

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { FORMAT_NOTE, type Reports } from '@/core'
import { AuditPaper, BudgetDraftPaper, HandoverPaper, LedgerPaper, PaperFrame, REPORT_KINDS, SettlementPaper, type ReportKind } from '@/components/papers'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Container, LedgerRule, Phrase, SealNumber, SectionHeading } from './Section'
import { DEMO_TODAY } from './demo'

// 資料ごとの、ひとことの説明（何が書いてあるか）。道具で実際に出るものだけを書く
const SUMMARY: Record<ReportKind, string> = {
  settlement: '科目ごとの予算と決算、その差。収入合計から支出合計を引いた、次年度繰越金。繰越金の内訳と、会計の署名欄。',
  ledgers: '現金と、口座ごとに1冊ずつ。日付の順に、入金・出金・残高が並びます。領収書の番号つき。',
  audit: '決まった文と、金額が入ります。言い回しは、団体に合わせて変えられます。監査をした方の署名欄つき。',
  budget: '今年度の予算と決算の横に、次年度の案を入れる欄があります。総会にかける予算書（案）になります。',
  handover: '残高と照合の結果、通帳やはんこの保管場所、まだ払っていないもの、備品、次の担当の方へのメモ。',
}
const NUMERALS = ['一', '二', '三', '四', '五']

export function Documents({ reports, yearLabel }: { reports: Reports; yearLabel: string }) {
  const baseId = useId()
  const [active, setActive] = useState<ReportKind>('settlement')
  const [zoom, setZoom] = useState<'fit' | 'full'>('fit')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = REPORT_KINDS.findIndex((k) => k.kind === active)
    let next = index
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % REPORT_KINDS.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + REPORT_KINDS.length) % REPORT_KINDS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = REPORT_KINDS.length - 1
    else return
    e.preventDefault()
    const kind = REPORT_KINDS[next].kind
    setActive(kind)
    tabRefs.current[kind]?.focus()
  }

  const paper = (kind: ReportKind) => {
    if (kind === 'settlement') return <SettlementPaper report={reports.settlement} today={DEMO_TODAY} />
    // 出納帳は、置き場所ごとに1冊ずつできる。見本では、現金出納帳を見せる
    if (kind === 'ledgers') return <LedgerPaper report={reports.ledgers} ledger={reports.ledgers.ledgers[0]} />
    if (kind === 'audit') return <AuditPaper report={reports.audit} />
    if (kind === 'budget') return <BudgetDraftPaper report={reports.budgetDraft} yearLabel={yearLabel} />
    return <HandoverPaper report={reports.handover} />
  }

  return (
    <section id="documents" aria-labelledby={`${baseId}-title`} className="scroll-mt-4 pb-16 sm:pb-24">
      <Container>
        <LedgerRule />
        <SectionHeading
          id={`${baseId}-title`}
          className="pt-10 sm:pt-14"
          title={
            <>
              <Phrase>総会の資料が、</Phrase>
              <Phrase>5種類そろいます。</Phrase>
            </>
          }
          lead="収支決算書だけでなく、会計監査報告書と、次の担当の方への引き継ぎ書まで。どれも、入力した内容からできあがります。下は、見本の団体の帳簿から、道具が作った資料です。"
        />

        <div className="mt-8 grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
          <div
            role="tablist"
            aria-label="資料の種類"
            onKeyDown={onKeyDown}
            className="flex gap-1.5 max-lg:flex-wrap lg:sticky lg:top-5 lg:flex-col lg:gap-2 lg:self-start"
          >
            {REPORT_KINDS.map(({ kind, label, short }, i) => {
              const selected = kind === active
              return (
                <button
                  key={kind}
                  ref={(el) => {
                    tabRefs.current[kind] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${kind}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${kind}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(kind)}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border text-left transition-colors',
                    'max-lg:min-h-11 max-lg:items-center max-lg:px-3 max-lg:py-1.5 lg:px-4 lg:py-3.5',
                    selected
                      ? 'border-rule bg-paper shadow-lift max-lg:shadow-[inset_0_3px_0_var(--shu)] lg:shadow-[inset_4px_0_0_var(--shu),var(--shadow-lift)]'
                      : 'border-transparent hover:border-border hover:bg-paper/60',
                  )}
                >
                  <SealNumber className={cn('max-lg:hidden', !selected && 'border-input/60 bg-transparent text-muted-foreground')}>{NUMERALS[i]}</SealNumber>
                  <span className="min-w-0">
                    <span className={cn('block font-serif font-bold leading-snug lg:text-[1.15rem]', selected ? 'text-foreground' : 'text-foreground/80')}>
                      <span className="lg:hidden">{short}</span>
                      <span className="max-lg:hidden">{label}</span>
                    </span>
                    <span className="mt-1 block text-[0.88rem] leading-[1.7] text-muted-foreground max-lg:hidden">{SUMMARY[kind]}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="min-w-0">
            {REPORT_KINDS.map(({ kind, label }) => (
              <div key={kind} role="tabpanel" id={`${baseId}-panel-${kind}`} aria-labelledby={`${baseId}-tab-${kind}`} hidden={kind !== active}>
                {/* スマホでは、説明をタブの下に出す */}
                <p className="mb-3 text-[0.94rem] leading-[1.8] lg:hidden">
                  <span className="font-bold">{label}</span>　{SUMMARY[kind]}
                </p>
                <div className="rounded-xl bg-kinari-deep/55 p-3 sm:p-6">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="text-[0.88rem] text-muted-foreground">印刷したときの形です（A4・たて）。</p>
                    <Button variant="ghost" size="sm" onClick={() => setZoom((z) => (z === 'fit' ? 'full' : 'fit'))} aria-pressed={zoom === 'full'}>
                      {zoom === 'fit' ? <ZoomIn aria-hidden="true" /> : <ZoomOut aria-hidden="true" />}
                      {zoom === 'fit' ? '大きく表示する' : '全体を表示する'}
                    </Button>
                  </div>
                  <div className={cn('lp-sheet mx-auto', zoom === 'fit' && 'max-w-[40rem]')}>
                    <PaperFrame zoom={zoom}>{paper(kind)}</PaperFrame>
                  </div>
                </div>
              </div>
            ))}
            <p className="mt-4 max-w-[44em] text-[0.9rem] leading-[1.8] text-muted-foreground">{FORMAT_NOTE}</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
