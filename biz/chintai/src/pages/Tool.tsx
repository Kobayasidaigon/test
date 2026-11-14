import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRightIcon, DownloadIcon, FolderOpenIcon, XIcon } from 'lucide-react'
import {
  RULES_VERIFIED_ON,
  createEmptyData,
  formatDateJa,
  formatYen,
  inspectEstimate,
  isEmptyData,
  sampleData,
  type AppData,
} from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { Brand } from '@/components/brand'
import { ExportHint } from '@/components/tool/export-hint'
import { ImportDialog, exportToFile } from '@/components/tool/file-actions'
import { InputStep } from '@/components/tool/input-step'
import { MessageStep } from '@/components/tool/message-step'
import { ResultStep } from '@/components/tool/result-step'
import { useAppData, type AppNotice } from '@/components/tool/use-app-data'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Steps } from '@/components/ui/steps'
import { Toaster, toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

// 道具の画面（/app）。3つの手順を、紙のファイルの「見出しの耳」で行き来する。
//   1. 見積書を入れる … 計算のもと（家賃など）と、見積書の項目。
//   2. 点検の結果 … 赤ペンが入った見積書、項目ごとの判定と根拠、相談先。印刷（A4）。
//   3. 確認の文面 … 不動産会社に送る文面（メール用・LINE用）。
// 内容は、変わるたびにブラウザの中に保存する。ファイルへの書き出しと読み込みは、いつも上に出しておく。
//
// このページは ssr: false（ブラウザで描く）。それでも、保存領域には useEffect の中でだけさわる（use-app-data.ts）。

type StepId = 'input' | 'result' | 'message'
const STEP_IDS: StepId[] = ['input', 'result', 'message']
/** いまの手順を、読み込み直しても覚えておくためのキー（タブを閉じたら忘れる）。 */
const STEP_KEY = `${site.slug}:ui:step`

type Confirm = 'sample' | 'clear' | null

export default function Tool() {
  const app = useAppData()
  const { data, setData, ready, notice, setNotice, savedAt } = app
  const [step, setStepState] = useState<StepId>('input')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [importOpen, setImportOpen] = useState(false)
  const main = useRef<HTMLElement>(null)

  const inspection = useMemo(() => inspectEstimate(data.estimate), [data.estimate])

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STEP_KEY) as StepId | null
      if (saved && STEP_IDS.includes(saved)) setStepState(saved)
    } catch {
      // 覚えていなくても、手順1から使える。
    }
  }, [])

  const setStep = (next: StepId) => {
    setStepState(next)
    try {
      window.sessionStorage.setItem(STEP_KEY, next)
    } catch {
      // 保存できなくても、そのまま使える。
    }
    // 手順が変わったら、紙のいちばん上から読めるようにする。読み上げにも、中身が変わったことが伝わるように、本文へフォーカスを移す。
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      main.current?.focus({ preventScroll: true })
    })
  }

  /** 内容をまるごと置きかえる。すぐあとなら、「元に戻す」で戻せる。 */
  const replaceData = (next: AppData, text: string) => {
    const before = data
    setData(next)
    toast.message(text, { label: '元に戻す', onAction: () => setData(before) })
  }

  const insertSample = () => replaceData(sampleData(), 'サンプルの見積書を入れました。')
  const askSample = () => (isEmptyData(data) ? insertSample() : setConfirm('sample'))

  const lineCount = data.estimate.lines.length

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="no-print sr-only z-[70] rounded-sm bg-ink px-4 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        本文へ進む
      </a>

      <header className="no-print">
        <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-3 px-3 pt-2 sm:px-6 sm:pt-3">
          <Brand />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <p className="mr-1 hidden text-xs leading-5 text-ink-soft md:block" aria-live="polite">
              {savedAt ? `このブラウザに保存しました（${formatTime(savedAt)}）` : ready && notice?.kind !== 'unavailable' ? '入れた内容は、このブラウザに保存されます' : ''}
            </p>
            <Button variant="outline" size="sm" onClick={() => exportToFile(data)} disabled={!ready}>
              <DownloadIcon aria-hidden className="size-4" />
              <span className="sm:hidden">書き出す</span>
              <span className="hidden sm:inline">ファイルに書き出す</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={!ready}>
              <FolderOpenIcon aria-hidden className="size-4" />
              <span className="sm:hidden">読み込む</span>
              <span className="hidden sm:inline">ファイルを読み込む</span>
            </Button>
          </div>
        </div>
        <h1 className="sr-only">{site.name} — 賃貸の初期費用の見積書を点検する道具</h1>
      </header>

      <nav aria-label="道具の流れ" className="no-print sticky top-0 z-40 border-b border-ink/15 bg-desk/95 backdrop-blur-[2px]">
        <div className="mx-auto max-w-[76rem] px-2 pt-2 sm:px-6">
          <Steps
            className="-mb-px"
            current={STEP_IDS.indexOf(step)}
            onStepChange={(i) => setStep(STEP_IDS[i])}
            items={[
              { title: '見積書を入れる', shortTitle: '見積書' },
              {
                title: '点検の結果',
                shortTitle: '結果',
                badge:
                  inspection.attentionCount > 0 ? (
                    <span className="font-pen text-[15px] leading-none text-pen" aria-label={`確かめる項目が ${inspection.attentionCount}つ`}>
                      {inspection.attentionCount}
                    </span>
                  ) : undefined,
              },
              { title: '確認の文面', shortTitle: '文面' },
            ]}
          />
        </div>
      </nav>

      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className={cn('mx-auto w-full max-w-[76rem] flex-1 px-3 py-5 outline-none sm:px-6 sm:py-7 print:max-w-none print:p-0', step === 'input' && lineCount > 0 && 'pb-28 lg:pb-7')}
      >
        {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

        {!ready ? (
          <p className="py-16 text-center text-sm text-ink-soft" role="status">
            保存されている内容を、読み込んでいます。
          </p>
        ) : step === 'input' ? (
          <InputStep data={data} setData={setData} inspection={inspection} onGoResult={() => setStep('result')} onSample={askSample} onClear={() => setConfirm('clear')} />
        ) : step === 'result' ? (
          <ResultStep data={data} setData={setData} inspection={inspection} onGoInput={() => setStep('input')} onGoMessage={() => setStep('message')} onSample={askSample} />
        ) : (
          <MessageStep data={data} setData={setData} inspection={inspection} onGoInput={() => setStep('input')} onGoResult={() => setStep('result')} />
        )}

        {ready && !isEmptyData(data) && <ExportHint className="no-print mt-6" onExport={() => exportToFile(data)} />}
      </main>

      <footer className="no-print border-t border-ink/15">
        <div className="mx-auto flex max-w-[76rem] flex-col gap-2 px-4 py-5 text-xs leading-6 text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            この道具は、見積書を自分で確かめるための補助です。法律の助言ではありません。　ルールの最終確認日: {formatDateJa(RULES_VERIFIED_ON)}
          </p>
          <ul className="flex shrink-0 flex-wrap gap-x-4">
            <li>
              <Link to="/" className="inline-flex min-h-11 items-center underline decoration-ink-soft/50 underline-offset-4 hover:text-ink sm:min-h-0">
                トップへ戻る
              </Link>
            </li>
            <li>
              <Link to="/about" className="inline-flex min-h-11 items-center underline decoration-ink-soft/50 underline-offset-4 hover:text-ink sm:min-h-0">
                このサイトについて
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="inline-flex min-h-11 items-center underline decoration-ink-soft/50 underline-offset-4 hover:text-ink sm:min-h-0">
                プライバシーポリシー
              </Link>
            </li>
          </ul>
        </div>
      </footer>

      {/* スマホでは、入力のあいだ、合計と「結果を見る」を、いつも下に出しておく。 */}
      {ready && step === 'input' && lineCount > 0 && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink/20 bg-paper/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_16px_-10px_rgb(31_45_71/0.4)] backdrop-blur-[2px] lg:hidden">
          <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-3">
            <p className="min-w-0 leading-tight">
              <span className="block text-[11px] text-ink-soft">
                合計
                {inspection.attentionCount > 0 && (
                  <span className="ml-2 font-pen text-[13px] text-pen">確かめる項目 {inspection.attentionCount}つ</span>
                )}
              </span>
              <span className="num text-lg font-bold">{formatYen(inspection.total)}</span>
            </p>
            <Button onClick={() => setStep('result')}>
              結果を見る
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        current={data}
        onImport={(next, warnings, fileName) => {
          replaceData(next, `「${fileName}」を読み込みました。`)
          setNotice(warnings.length > 0 ? { kind: 'warnings', text: 'ファイルの一部を、直して読み込みました。', details: warnings } : null)
          setStep('input')
        }}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          {confirm === 'sample' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>いまの内容を、サンプルに置きかえますか</AlertDialogTitle>
                <AlertDialogDescription>
                  いま入っている内容（{lineCount}行）は、サンプルの見積書に変わります。残しておきたいときは、先に「ファイルに書き出す」で保存してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>やめる</AlertDialogCancel>
                <AlertDialogAction onClick={insertSample}>サンプルに置きかえる</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>入れた内容を、全部消しますか</AlertDialogTitle>
                <AlertDialogDescription>
                  家賃などの数字、見積書の項目（{lineCount}行）、文面の名前と物件名を、全部消します。残しておきたいときは、先に「ファイルに書き出す」で保存してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>やめる</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    replaceData(createEmptyData(), '入れた内容を、全部消しました。')
                    setStep('input')
                  }}
                >
                  全部消す
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Toaster className={step === 'input' && lineCount > 0 ? 'bottom-[5.25rem] lg:bottom-5' : 'bottom-4 sm:bottom-5'} />
    </div>
  )
}

function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 読み込みや保存で起きたことを、紙の上に出す。何が起きたかと、どうすればよいかは、core が返した文に入っている。 */
function NoticeBanner({ notice, onClose }: { notice: AppNotice; onClose: () => void }) {
  const serious = notice.kind !== 'warnings'
  return (
    <div
      role={serious ? 'alert' : 'status'}
      className={cn('no-print mb-5 flex items-start gap-3 border-l-4 bg-paper py-2.5 pe-1.5 ps-4 shadow-paper', serious ? 'border-pen' : 'border-marker')}
    >
      <div className="min-w-0 flex-1 py-1.5 text-sm leading-7">
        <p className="font-bold">{serious ? '保存について、お知らせがあります' : 'お知らせ'}</p>
        <p>{notice.text}</p>
        {notice.kind === 'warnings' && (
          <ul className="mt-1 list-disc pl-5 text-[13px] leading-6 text-ink-soft">
            {notice.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" aria-label="お知らせを閉じる" onClick={onClose} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-soft hover:bg-ink/[0.07] hover:text-ink">
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  )
}
