import { memo, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Download, FileText, Handshake, ListTree, NotebookPen, Scale, Settings2 } from 'lucide-react'
import { SAMPLE_NOTE, buildReports, latestYear, type Book, type DateString } from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/input'
import { LogoMark, Seal } from '@/components/ui/seal'
import { Switch } from '@/components/ui/switch'
import { NavTabsList, NavTabsTrigger, Tabs, TabsContent } from '@/components/ui/tabs'
import { ReportPapers, type ReportKind } from '@/components/papers'
import { CategoriesScreen } from './CategoriesScreen'
import { HandoverScreen } from './HandoverScreen'
import { NewBookWizard } from './NewBookWizard'
import { OrgSettingsDialog } from './OrgSettingsDialog'
import { ReconcileScreen } from './ReconcileScreen'
import { ReportsScreen } from './ReportsScreen'
import { TransactionsScreen } from './TransactionsScreen'
import { TAB_STORAGE, useWorkspace } from './store'

// 帳簿を開いているときの、画面の骨組み。
// 上に見出し（団体の名前、年度、ファイルに保存）、その下に5つの画面の切り替え、いちばん下に印刷用の紙（画面では見えない）。

type TabKey = 'transactions' | 'categories' | 'reconcile' | 'reports' | 'handover'

const TABS: { key: TabKey; label: string; short: string; icon: typeof FileText }[] = [
  { key: 'transactions', label: '入力と一覧', short: '入力', icon: NotebookPen },
  { key: 'categories', label: '科目と予算', short: '科目', icon: ListTree },
  { key: 'reconcile', label: '残高の照合', short: '照合', icon: Scale },
  { key: 'reports', label: '資料', short: '資料', icon: FileText },
  { key: 'handover', label: '引き継ぎ', short: '引き継ぎ', icon: Handshake },
]

function readTab(): TabKey {
  try {
    const saved = window.sessionStorage.getItem(TAB_STORAGE)
    if (TABS.some((t) => t.key === saved)) return saved as TabKey
  } catch {
    // 覚えていなくても困らない
  }
  return 'transactions'
}

/**
 * 印刷用の紙。画面では見えず、印刷のときだけ出る（index.css の .print-only）。
 * どの画面を開いていても、印刷すると、選んだ資料だけが A4 に出る。
 * 帳簿が変わったときだけ描き直す（入力のたびに、何百行もの出納帳を描き直さないため）。
 */
const PrintSheets = memo(function PrintSheets({ book, yearId, kinds, today, watermark }: { book: Book; yearId: string; kinds: ReportKind[]; today: DateString; watermark: boolean }) {
  const reports = useMemo(() => buildReports(book, yearId), [book, yearId])
  if (!reports || !reports.settlement.balanced) return null
  return (
    <div className="print-only">
      <div className="paper-frame">
        <ReportPapers reports={reports} kinds={kinds} today={today} watermark={watermark} />
      </div>
    </div>
  )
})

export function WorkspaceShell() {
  const ws = useWorkspace()
  const { book, year, locked, unsaved, dirty, isSample, isPro, license, today } = ws
  const [tab, setTabRaw] = useState<TabKey>(readTab)
  const [reportKind, setReportKind] = useState<ReportKind>('settlement')
  const [printKinds, setPrintKinds] = useState<ReportKind[]>(['settlement'])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const latest = latestYear(book)

  const setTab = (next: TabKey) => {
    setTabRaw(next)
    try {
      window.sessionStorage.setItem(TAB_STORAGE, next)
    } catch {
      // 覚えられなくても困らない
    }
    window.scrollTo({ top: 0 })
  }

  // 「資料」で見ている種類を、印刷する種類の初期値にする（ブラウザのメニューから印刷したときも、見ている資料が出る）
  useEffect(() => {
    setPrintKinds([reportKind])
  }, [reportKind])

  const print = (kinds: ReportKind[]) => {
    // 印刷の画面が開く前に、印刷用の紙を選んだ種類に描きかえておく
    flushSync(() => setPrintKinds(kinds))
    // 印刷の見出し（ブラウザが紙の上に出すページの名前）を、団体と年度の名前にする
    const title = document.title
    document.title = `${book.orgName} ${year.label} 総会資料`
    const restore = () => {
      document.title = title
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  const openFile = async (file: File) => {
    const message = await ws.openFile(file)
    if (message) {
      // 開けなかったときは、いまの帳簿をそのまま残す
      ws.apply({ ok: false, code: 'open-failed', message: `このファイルは開けませんでした。${message}` })
    } else {
      setTab('transactions')
    }
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="min-h-dvh">
      <div className="no-print">
        {/* 公開前モードの切り替え（公開したあとは出ない） */}
        {license.prelaunch && (
          <div className="border-b border-border bg-kinari-deep/70">
            <div className="mx-auto flex max-w-[82rem] flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-1 text-[0.84rem] sm:px-6">
              <p className="leading-snug">
                <span className="mr-1.5 font-bold">公開前モード</span>
                {isPro ? '有料版のはたらきを、すべて試せます。' : '無料版の見え方を、確かめています。'}
              </p>
              <Switch checked={license.previewFree} onCheckedChange={license.setPreviewFree} className="min-h-11">
                無料版の表示を確かめる
              </Switch>
            </div>
          </div>
        )}

        <header className="border-b border-border bg-paper/80">
          {/* ページの大見出し。画面には出さず、読み上げと見出しの一覧のために置く（団体の名前は、すぐ下のボタンに見えている） */}
          <h1 className="sr-only">
            {book.orgName}の帳簿（{year.label}）
          </h1>
          <div className="mx-auto flex max-w-[82rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2 pt-3 sm:px-6">
            <Link to="/" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg sm:pr-1" aria-label={`${site.name} のトップページへ`}>
              <LogoMark />
              <span className="font-serif text-lg font-bold tracking-wide max-sm:sr-only">{site.name}</span>
            </Link>

            {/* スマホでは、団体の名前を「…」で切らない（どの団体の帳簿を開いているかは、係を兼ねる人にはだいじ）。
                名前が年度の欄と1行に並ばないときは、名前に1行使って、年度の欄を次の行に送る。それでも入らない名前は、折り返す。
                パソコンでは、いままでどおり1行（幅が足りなければ「…」。全部の名前は、設定を開くと見える） */}
            <div className="order-last flex min-w-0 basis-full flex-wrap items-center gap-x-2 gap-y-1 sm:order-none sm:basis-auto sm:flex-1 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="group inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 text-left hover:bg-muted"
                aria-label={`団体の設定を開く（${book.orgName}）`}
              >
                <span className="min-w-0 break-words font-serif text-[1.15rem] font-bold leading-tight sm:truncate">{book.orgName}</span>
                <Settings2 className="size-[1.1rem] shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
              </button>
              <NativeSelect
                aria-label="見る年度"
                value={year.id}
                onChange={(e) => ws.setYearId(e.target.value)}
                className="h-11 w-[9.6rem] shrink-0 font-bold sm:w-auto sm:min-w-[9.6rem]"
              >
                {[...book.years].reverse().map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                    {y.id === latest.id ? '' : '（読むだけ）'}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <p className={cn('max-w-[15rem] text-right text-[0.8rem] leading-tight max-md:sr-only', dirty ? 'font-bold text-shu-ink' : 'text-muted-foreground')} role="status">
                {!dirty && unsaved.neverSaved
                  ? 'サンプル（まだ何も変えていません）'
                  : unsaved.neverSaved
                    ? 'まだファイルに保存していません'
                    : unsaved.count > 0
                      ? `保存していない変更が ${unsaved.count}件`
                      : 'ファイルに保存ずみ'}
              </p>
              <Button variant={dirty ? 'default' : 'outline'} onClick={ws.saveFile} className="relative">
                <Download />
                ファイルに保存
                {dirty && (
                  <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-paper bg-sumi px-1 text-[0.68rem] font-bold leading-none text-white md:hidden">
                    {unsaved.neverSaved ? '!' : unsaved.count > 99 ? '99+' : unsaved.count}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:mt-1">
            <NavTabsList aria-label="画面の切り替え">
              {TABS.map((t) => (
                <NavTabsTrigger key={t.key} value={t.key}>
                  <t.icon aria-hidden="true" />
                  <span className="lg:hidden">{t.short}</span>
                  <span className="max-lg:hidden">{t.label}</span>
                </NavTabsTrigger>
              ))}
            </NavTabsList>
          </div>
          <div aria-hidden className="h-[3px] border-b border-t border-rule max-lg:hidden" />
        </header>

        <main className="mx-auto max-w-[82rem] px-4 pb-28 pt-5 sm:px-6 lg:pb-16">
          <div className="mb-5 grid gap-3 empty:hidden">
            {ws.changedElsewhere && (
              <Alert variant="warn" role="alert">
                <AlertTitle>別のタブ（ウィンドウ）で、この帳簿が変わりました</AlertTitle>
                <AlertDescription>
                  このまま入力を続けると、あちらの変更が消えます。
                  <Button variant="secondary" size="sm" className="ml-2 mt-1" onClick={ws.reloadFromStorage}>
                    あちらの内容を読み込む
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {ws.storageProblem && (
              <Alert variant="warn" role="alert">
                {ws.storageProblem}
              </Alert>
            )}
            {ws.notice && (
              <Alert variant={ws.notice.kind === 'error' ? 'error' : 'warn'} role="alert">
                <AlertDescription>
                  {ws.notice.message}
                  <Button variant="ghost" size="sm" className="ml-1" onClick={ws.clearNotice}>
                    わかりました
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {isSample && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-shu/40 bg-shu-soft/60 px-4 py-2.5">
                <p className="flex items-center gap-2.5 leading-snug">
                  <span className="rounded-sm border-2 border-shu px-1.5 py-0.5 font-serif text-[0.86rem] font-bold leading-none text-shu-ink">見本</span>
                  <span>
                    サンプルの帳簿を見ています。{SAMPLE_NOTE}
                    <span className="max-sm:hidden">自由に書きかえて、試してください。</span>
                  </span>
                </p>
                <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                  自分の団体で始める
                </Button>
              </div>
            )}
            {locked && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-rule/50 bg-rule-soft/50 px-4 py-2.5">
                <p className="flex items-center gap-3 leading-snug">
                  <Seal text="済" size={40} />
                  <span>
                    <span className="font-bold">「{year.label}」の取引・科目・予算額は、読むだけです。</span>
                    次の年度へ繰り越したためです。資料に書くこと（作成日、役員の名前、決算書の説明、監査報告書、次年度の予算案、引き継ぎ書）と、残高の照合は、いまも入れられます。印刷もできます。
                  </span>
                </p>
                <Button variant="soft" size="sm" onClick={() => ws.setYearId(latest.id)}>
                  いまの年度（{latest.label}）へ
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="transactions">
            <TransactionsScreen />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesScreen />
          </TabsContent>
          <TabsContent value="reconcile">
            <ReconcileScreen />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsScreen kind={reportKind} onKindChange={setReportKind} onPrint={print} onNavigate={setTab} />
          </TabsContent>
          <TabsContent value="handover">
            <HandoverScreen onOpenFile={(file) => (dirty ? setPendingFile(file) : openFile(file))} onNavigate={setTab} />
          </TabsContent>

          <footer className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-rule/40 pt-4 text-[0.86rem] text-muted-foreground">
            <Link to="/" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">
              {site.name}のトップへ
            </Link>
            <Link to="/#pricing" className="inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 hover:text-foreground">
              料金
            </Link>
            <Link to="/tokushoho" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">
              特定商取引法にもとづく表記
            </Link>
            <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">
              プライバシーポリシー
            </Link>
            <span>入力した内容は、どこにも送られません。</span>
          </footer>
        </main>
      </div>

      <PrintSheets book={book} yearId={year.id} kinds={printKinds} today={today} watermark={!isPro} />

      <OrgSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewBookWizard open={wizardOpen} onOpenChange={setWizardOpen} today={today} 
        onCreate={(next) => {
          ws.startWith(next)
          setTab('transactions')
        }}
      />

      {/* 保存していない変更があるのに、別のファイルを開こうとしたときの確かめ */}
      <Dialog open={pendingFile !== null} onOpenChange={(open) => !open && setPendingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>別のファイルを開きますか</DialogTitle>
            <DialogDescription>いまの帳簿は、開いたファイルの中身に入れかわります。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Alert variant="warn" role="alert">
              <AlertTitle>{unsaved.neverSaved ? 'いまの帳簿は、まだファイルに保存していません' : `いまの帳簿には、保存していない変更が ${unsaved.count}件あります`}</AlertTitle>
              <AlertDescription>
                このまま開くと、その内容はなくなります。
                <Button variant="secondary" size="sm" className="mt-2" onClick={ws.saveFile}>
                  <Download />
                  先に、いまの帳簿を保存する
                </Button>
              </AlertDescription>
            </Alert>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingFile(null)}>
              開かない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                if (file) openFile(file)
              }}
            >
              {dirty ? '保存せずに開く' : '開く'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
