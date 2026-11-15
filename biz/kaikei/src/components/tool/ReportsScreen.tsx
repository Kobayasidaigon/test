import { useId, useMemo, useState } from 'react'
import { Printer, ZoomIn, ZoomOut } from 'lucide-react'
import {
  DEFAULT_AUDIT_TEXT,
  DISCLAIMER,
  FORMAT_NOTE,
  LIMITS,
  OUT_OF_SCOPE,
  buildReports,
  explain,
  formatWareki,
  formatYen,
  latestYear,
  previousYear,
  setNextBudget,
  updateAudit,
  updateOfficers,
  updateOrg,
  updateYear,
  type DiffStyle,
  type Reports,
} from '@/core'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Hint } from '@/components/ui/hint'
import { Label } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AuditPaper,
  BudgetDraftPaper,
  HandoverPaper,
  LedgerPaper,
  PaperFrame,
  REPORT_KINDS,
  SettlementPaper,
  type ReportKind,
} from '@/components/papers'
import { CommitDate, CommitMoney, CommitText } from './fields'
import { useWorkspace } from './store'

// ④ 資料。5種類を切り替えて、紙の形で見る。印刷する。
// 左に紙、右に「この資料に書くこと」（作成日、署名する人の名前など）。スマホでは、書くことが上、紙が下。

/** 右の欄の、ひとまとまり。 */
function PanelField({ label, hint, children, htmlFor }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[0.84rem] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SettlementPanel({ onNavigate }: { onNavigate: (tab: 'categories') => void }) {
  // 作成日と署名欄の名前は「資料に書くこと」なので、繰り越したあとの前の年度でも書ける
  const { book, year, apply } = useWorkspace()
  const id = useId()
  return (
    <>
      <PanelField label="作成日" htmlFor={`${id}-date`}>
        <CommitDate
          id={`${id}-date`}
          value={year.reportDate}
          emptyHint="空のままなら、印刷する日の日付が入ります。"
          onCommit={(v) => {
            const r = updateYear(book, year.id, { reportDate: v })
            return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
          }}
        />
      </PanelField>
      <PanelField label={`${book.roleNames.treasurer}の名前（署名欄）`} htmlFor={`${id}-treasurer`} hint="空のままなら、線だけを出します（手で書けます）。">
        <CommitText
          id={`${id}-treasurer`}
          value={year.officers.treasurer}
          maxLength={LIMITS.nameLength}
          onCommit={(v) => {
            const r = updateOfficers(book, year.id, { treasurer: v })
            return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
          }}
        />
      </PanelField>
      <div className="grid gap-1.5">
        <p className="text-[0.94rem] font-bold">「差」の欄の向き</p>
        <SegmentedControl<DiffStyle>
          label="「差」の欄の向き"
          tone="rule"
          value={book.diffStyle}
          onValueChange={(v) => apply(updateOrg(book, { diffStyle: v }))}
          options={[
            { value: 'actual-minus-budget', label: '決算 − 予算' },
            { value: 'budget-minus-actual', label: '予算 − 決算' },
          ]}
          className="w-full"
        />
        <p className="text-[0.84rem] leading-snug text-muted-foreground">前の年の決算書と、同じ向きにしてください。マイナスは △ で出ます。</p>
      </div>
      <div className="border-t border-rule/40 pt-3 text-[0.9rem] leading-relaxed">
        <p>科目の名前・予算額・「説明」の文は、「科目と予算」の画面で書きます。</p>
        <Button variant="link" size="sm" className="justify-start px-0 text-left" onClick={() => onNavigate('categories')}>
          「科目と予算」の画面へ
        </Button>
      </div>
    </>
  )
}

function AuditPanel() {
  // 監査は、年度が終わったあと（繰り越したあとのことも多い）にするので、読むだけの年度でも書ける
  const { book, year, apply } = useWorkspace()
  const id = useId()
  const auditors = year.officers.auditors
  const role = book.roleNames.auditor
  return (
    <>
      <PanelField
        label="報告書の文"
        htmlFor={`${id}-text`}
        hint="｛年度｝｛期間｝｛団体名｝と書いたところは、自動で置きかわります。団体の言い回しに合わせて、書きかえられます。"
      >
        <CommitText
          id={`${id}-text`}
          multiline
          rows={6}
          value={year.audit.text}
          maxLength={LIMITS.textLength}
          onCommit={(v) => {
            // 全角の｛｝で書かれても、置きかわるようにする
            const text = v.replace(/｛/g, '{').replace(/｝/g, '}')
            const r = updateAudit(book, year.id, { text })
            return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
          }}
        />
        {year.audit.text !== DEFAULT_AUDIT_TEXT && (
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => apply(updateAudit(book, year.id, { text: DEFAULT_AUDIT_TEXT }))}>
            はじめの文に戻す
          </Button>
        )}
      </PanelField>
      <PanelField label="監査をした日" htmlFor={`${id}-date`}>
        <CommitDate
          id={`${id}-date`}
          value={year.audit.date}
          emptyHint="空のままなら、紙に手で書けるように、空けて出します。"
          onCommit={(v) => {
            const r = updateAudit(book, year.id, { date: v })
            return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
          }}
        />
      </PanelField>
      <div className="grid gap-1.5">
        <p className="text-[0.94rem] font-bold">
          <Hint content={explain('監査')}>監査</Hint>をする人の数（署名欄の数）
        </p>
        <SegmentedControl
          label="監査をする人の数"
          tone="rule"
          value={String(auditors.length)}
          onValueChange={(v) => {
            const n = Number(v)
            const next = Array.from({ length: n }, (_, i) => auditors[i] ?? '')
            apply(updateOfficers(book, year.id, { auditors: next }))
          }}
          options={[
            { value: '1', label: '1人' },
            { value: '2', label: '2人' },
            { value: '3', label: '3人' },
          ]}
          className="w-full"
        />
      </div>
      {auditors.map((name, i) => (
        <PanelField key={i} label={`${role}の名前${auditors.length > 1 ? `（${i + 1}人め）` : ''}`} htmlFor={`${id}-auditor-${i}`}>
          <CommitText
            id={`${id}-auditor-${i}`}
            value={name}
            maxLength={LIMITS.nameLength}
            onCommit={(v) => {
              const r = updateOfficers(book, year.id, { auditors: auditors.map((a, k) => (k === i ? v : a)) })
              return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
            }}
          />
        </PanelField>
      ))}
      <PanelField label={`${book.roleNames.president}の名前（宛て名）`} htmlFor={`${id}-president`}>
        <CommitText
          id={`${id}-president`}
          value={year.officers.president}
          maxLength={LIMITS.nameLength}
          onCommit={(v) => {
            const r = updateOfficers(book, year.id, { president: v })
            return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
          }}
        />
      </PanelField>
      <p className="border-t border-rule/40 pt-3 text-[0.84rem] leading-relaxed text-muted-foreground">
        「{role}」「{book.roleNames.president}」という役の呼び名は、上の「団体の設定」で変えられます。
      </p>
    </>
  )
}

function BudgetPanel({ reports }: { reports: Reports }) {
  const { book, year, locked, apply } = useWorkspace()
  // 繰り越したあとでも、いまの年度のすぐ前の年度なら、予算案を変えられる（変えた金額は、いまの年度の予算額にも入る）。
  // それより前の年度は、次の年度も読むだけなので、変えられない
  const latest = latestYear(book)
  const frozen = locked && previousYear(book, latest.id)?.id !== year.id
  const draft = reports.budgetDraft
  const rows = [
    ...draft.income.rows.filter((r) => !r.isCarryover).map((r) => ({ ...r, side: '収入' })),
    ...draft.expense.rows.map((r) => ({ ...r, side: '支出' })),
  ]
  return (
    <>
      <p className="text-[0.9rem] leading-relaxed">
        {draft.nextYearLabel}の<Hint content={explain('予算')}>予算</Hint>を、科目ごとに入れます。空のままの科目は、今年度の予算と同じ金額になります。
      </p>
      {locked && (
        <p className="rounded-lg border border-rule/50 bg-rule-soft/40 px-3 py-2 text-[0.9rem] leading-relaxed">
          {frozen
            ? `「${year.label}」の予算案は、もう変えられません（次の年度も、読むだけになっているため）。`
            : `繰り越したあとなので、ここで変えた金額は、「${latest.label}」の同じ科目の予算額にも入ります。`}
        </p>
      )}
      <ul className="grid gap-0 overflow-hidden rounded-lg border border-rule/50">
        {rows.map((r, i) => (
          <li key={r.key} className={cn('grid grid-cols-[minmax(0,1fr)_8.4rem] items-center gap-x-2 gap-y-0.5 px-3 py-2', i > 0 && 'border-t border-rule/35')}>
            <span className="min-w-0">
              <span className={cn('mr-1.5 text-[0.76rem] font-bold', r.side === '収入' ? 'text-rule-ink' : 'text-shu-ink')}>{r.side}</span>
              <span className="font-bold">{r.name}</span>
              <span className="block text-[0.8rem] leading-snug text-muted-foreground">
                今年度 予算 <span className="num">{formatYen(r.currentBudget)}</span> ／ 決算 <span className="num">{formatYen(r.currentActual)}</span>
              </span>
            </span>
            <CommitMoney
              label={`「${r.name}」の、${draft.nextYearLabel}の予算案`}
              value={r.entered ? r.nextBudget : null}
              allowEmpty
              placeholder={formatYen(r.currentBudget)}
              disabled={frozen}
              onCommit={(v) => {
                const result = setNextBudget(book, year.id, r.key, v)
                return apply(result, { quiet: true }) ? null : result.ok ? null : result.message
              }}
            />
          </li>
        ))}
      </ul>
      <p className={cn('rounded-lg border px-3 py-2 text-[0.9rem] leading-relaxed', draft.gap === 0 ? 'border-rule/50 bg-rule-soft/40' : 'border-[#d9bb6a] bg-warn-soft')}>
        収入の予算 − 支出の予算 ＝ <span className="num font-bold">{formatYen(draft.gap)} 円</span>
        <span className="block text-[0.84rem] text-muted-foreground">
          {draft.gap === 0 ? '収入と支出の予算が、同じ金額になっています。' : '合計をそろえる団体では、差を「予備費」で調整します。そろえなくても、資料は作れます。'}
        </span>
      </p>
      <p className="text-[0.84rem] leading-relaxed text-muted-foreground">
        {draft.nextYearLabel}の「前年度繰越金」には、今年度の次年度繰越金が自動で入ります。次の年度から始める新しい科目は、繰り越したあとに「科目と予算」の画面で足してください。
      </p>
    </>
  )
}

export function ReportsScreen({
  kind,
  onKindChange,
  onPrint,
  onNavigate,
}: {
  kind: ReportKind
  onKindChange: (kind: ReportKind) => void
  /** 選んだ資料を印刷する */
  onPrint: (kinds: ReportKind[]) => void
  onNavigate: (tab: 'categories' | 'handover') => void
}) {
  const { book, year, today, isPro, bookLicense } = useWorkspace()
  const reports = useMemo(() => buildReports(book, year.id), [book, year.id])
  const [zoom, setZoom] = useState<'fit' | 'full'>('fit')
  const [ledgerAccount, setLedgerAccount] = useState(year.accounts[0].id)
  const [printOpen, setPrintOpen] = useState(false)
  const [selected, setSelected] = useState<ReportKind[]>(REPORT_KINDS.map((k) => k.kind))
  const watermark = !isPro
  const pro = site.pricing.pro

  if (!reports) return <Alert variant="error">この年度の資料を作れませんでした。</Alert>
  if (!reports.settlement.balanced) {
    // 残高の合計と繰越金が合わないのは、データが壊れているときだけ。まちがった資料を出さないように止める
    return (
      <Alert variant="error" role="alert">
        <AlertTitle>資料を出せません</AlertTitle>
        <AlertDescription>置き場所ごとの残高の合計と、次年度繰越金が合っていません。データが壊れているかもしれません。前に保存したひきつぎファイルを開き直してください。</AlertDescription>
      </Alert>
    )
  }
  const ledger = reports.ledgers.ledgers.find((l) => l.accountId === ledgerAccount) ?? reports.ledgers.ledgers[0]
  const current = REPORT_KINDS.find((k) => k.kind === kind)!

  return (
    <div className="grid grid-cols-1 gap-5">
      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-paper px-4 py-4 shadow-lift sm:px-6">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-xl">{year.label}の資料</h2>
          <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">入力した取引から、5種類の資料ができています。A4 の紙に、たて向きで印刷できます。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onPrint([kind])}>
            <Printer />
            「{current.short}」を印刷する
          </Button>
          <Button variant="outline" onClick={() => setPrintOpen(true)}>
            まとめて印刷する
          </Button>
        </div>
      </section>

      {watermark && (
        <Alert variant="warn">
          <AlertTitle>無料版では、印刷した紙に「見本」の透かしが入ります</AlertTitle>
          <AlertDescription>
            {/* キーの期限が切れて無料版に戻ったときは、そのことを、ここでも言う（なぜ透かしが入るようになったのかが、わかるように） */}
            {bookLicense.status === 'expired' && (
              <p className="font-bold">
                この帳簿の有料版のキーは、{bookLicense.license.expiresAt ? `${formatWareki(bookLicense.license.expiresAt)}に` : ''}期限が切れました。入力と、画面での確認は、このまま使えます。
              </p>
            )}
            <p>透かしなしで印刷するには、有料版（{pro.unit} {pro.priceText}・税込）のライセンスキーがいります。画面で確かめるだけなら、ずっと無料です。</p>
            <Button variant="link" size="sm" className="justify-start px-0 text-left" onClick={() => onNavigate('handover')}>
              有料版について（「引き継ぎ」の画面へ）
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={kind} onValueChange={(v) => onKindChange(v as ReportKind)}>
        <TabsList aria-label="資料の種類">
          {REPORT_KINDS.map((k) => (
            <TabsTrigger key={k.kind} value={k.kind} aria-label={k.label}>
              {/* スマホでは短い名前にして、2行に収める */}
              <span className="sm:hidden">{k.short}</span>
              <span className="max-sm:hidden">{k.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORT_KINDS.map((k) => (
          <TabsContent key={k.kind} value={k.kind} className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21.5rem] xl:items-start">
            {/* 紙 */}
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.86rem] text-muted-foreground">印刷したときの形です。</p>
                <Button variant="ghost" size="sm" onClick={() => setZoom((z) => (z === 'fit' ? 'full' : 'fit'))} aria-pressed={zoom === 'full'}>
                  {zoom === 'fit' ? <ZoomIn /> : <ZoomOut />}
                  {zoom === 'fit' ? '大きく表示する' : '全体を表示する'}
                </Button>
              </div>
              <PaperFrame zoom={zoom}>
                {k.kind === 'settlement' && <SettlementPaper report={reports.settlement} today={today} watermark={watermark} />}
                {k.kind === 'ledgers' && ledger && <LedgerPaper report={reports.ledgers} ledger={ledger} watermark={watermark} />}
                {k.kind === 'audit' && <AuditPaper report={reports.audit} watermark={watermark} />}
                {k.kind === 'budget' && <BudgetDraftPaper report={reports.budgetDraft} yearLabel={year.label} watermark={watermark} />}
                {k.kind === 'handover' && <HandoverPaper report={reports.handover} watermark={watermark} />}
              </PaperFrame>
            </div>

            {/* この資料に書くこと */}
            <aside aria-label={`${k.label}に書くこと`} className="grid gap-4 rounded-xl border border-border border-t-[3px] border-t-rule bg-paper px-4 py-4 shadow-lift xl:sticky xl:top-4">
              <h3 className="text-lg">この資料に書くこと</h3>
              {k.kind === 'settlement' && <SettlementPanel onNavigate={onNavigate} />}
              {k.kind === 'ledgers' && (
                <>
                  <p className="text-[0.9rem] leading-relaxed">
                    <Hint content={explain('出納帳')}>出納帳</Hint>は、お金の置き場所ごとに1つできます。画面で見るものを選んでください。印刷では、すべての置き場所の出納帳が続けて出ます。
                  </p>
                  <div role="radiogroup" aria-label="画面で見る出納帳" className="grid gap-2">
                    {reports.ledgers.ledgers.map((l) => (
                      <label
                        key={l.accountId}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] px-3 py-1.5 font-bold leading-tight has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                          l.accountId === ledger?.accountId ? 'border-rule-ink bg-rule-soft' : 'border-input/70 bg-paper hover:bg-muted',
                        )}
                      >
                        <input
                          type="radio"
                          name="ledger-account"
                          className="size-[1.1rem] shrink-0 accent-[var(--rule-ink)] outline-none"
                          checked={l.accountId === ledger?.accountId}
                          onChange={() => setLedgerAccount(l.accountId)}
                        />
                        <span className="min-w-0 flex-1">{l.title}</span>
                        <span className="num shrink-0 text-[0.84rem] font-normal text-muted-foreground">{l.rows.length - 1}件</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {k.kind === 'audit' && <AuditPanel />}
              {k.kind === 'budget' && <BudgetPanel reports={reports} />}
              {k.kind === 'handover' && (
                <>
                  <p className="text-[0.9rem] leading-relaxed">
                    保管場所、まだ払っていないもの、備品、次の担当の方へのメモは、「引き継ぎ」の画面で書きます。残高と照合の結果は、自動で入ります。
                  </p>
                  <Button variant="secondary" onClick={() => onNavigate('handover')}>
                    引き継ぎ書の中身を書く
                  </Button>
                </>
              )}
            </aside>
          </TabsContent>
        ))}
      </Tabs>

      <div className="grid gap-1 border-t border-rule/40 pt-4 text-[0.86rem] leading-relaxed text-muted-foreground">
        <p>{FORMAT_NOTE}</p>
        <p>{DISCLAIMER}</p>
        <p>{OUT_OF_SCOPE.map((s) => s.text).join(' ')}</p>
      </div>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>まとめて印刷する</DialogTitle>
            <DialogDescription>印刷する資料に、しるしを付けてください。資料ごとに、新しい紙から始まります。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="grid gap-2">
              {REPORT_KINDS.map((k) => {
                const checked = selected.includes(k.kind)
                return (
                  <li key={k.kind}>
                    <label
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-2 font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                        checked ? 'border-rule-ink bg-rule-soft' : 'border-input/70 bg-paper',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-5 shrink-0 accent-[var(--rule-ink)] outline-none"
                        checked={checked}
                        onChange={() => setSelected((list) => (checked ? list.filter((x) => x !== k.kind) : [...list, k.kind]))}
                      />
                      {k.label}
                    </label>
                  </li>
                )
              })}
            </ul>
            {watermark && <p className="mt-3 text-[0.9rem] leading-relaxed text-warn">無料版なので、紙に「見本」の透かしが入ります。</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPrintOpen(false)}>
              やめる
            </Button>
            <Button
              disabled={selected.length === 0}
              onClick={() => {
                setPrintOpen(false)
                // ダイアログが閉じてから印刷する（印刷の画面に、ダイアログが写りこまないように）
                setTimeout(() => onPrint(selected), 250)
              }}
            >
              <Printer />
              {selected.length}種類を印刷する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
