// 道具の画面（/app）。4つの手順（①店とスタッフ → ②必要な人数と条件 → ③希望休 → ④シフト表）を行き来する。
// ここは、保存と読み込み、手順の切りかえ、自動作成の進行、ダイアログをまとめる役。
// 手順ごとの中身は src/components/tool/、計算は src/core/ にある。
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Download, FolderOpen, Menu, Undo2 } from 'lucide-react'
import {
  buildExportFile,
  checkPlan,
  downloadText,
  featureGate,
  formatMonth,
  isScheduleEmpty,
  localToday,
  makeSample,
  nextMonthOf,
  nextSeed,
  SAMPLES,
  startSolve,
  type SampleId,
  type ShiftPlan,
  type SolveHandle,
  type SolveProgress,
  type Suggestion,
} from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { useLicense } from '@/lib/use-license'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Steps } from '@/components/ui/steps'
import { Switch } from '@/components/ui/switch'
import { toast, Toaster } from '@/components/ui/toast'
import { Logo } from '@/components/logo'
import { FileDialog } from '@/components/tool/FileDialog'
import { LicenseDialog } from '@/components/tool/LicenseDialog'
import { PrintSheet } from '@/components/tool/PrintSheet'
import { Start } from '@/components/tool/Start'
import { StepNeeds } from '@/components/tool/StepNeeds'
import { StepSchedule, type SuggestState } from '@/components/tool/StepSchedule'
import { StepStore } from '@/components/tool/StepStore'
import { StepWishes } from '@/components/tool/StepWishes'
import { ToolProvider } from '@/components/tool/tool-context'
import { usePlanStore } from '@/components/tool/use-plan-store'

/** 開いていた手順を覚えておく場所（内容そのものは、core の保存領域に入る） */
const STEP_KEY = `${site.slug}:step`

const STEP_TITLES = [
  { title: '店とスタッフ', shortTitle: '店とスタッフ' },
  { title: '必要な人数と条件', shortTitle: '人数と条件' },
  { title: '希望休', shortTitle: '希望休' },
  { title: 'シフト表', shortTitle: 'シフト表' },
]

const NO_SUGGEST: SuggestState & { forPlan: ShiftPlan | null } = { status: 'idle', result: null, progress: null, forPlan: null }

/** 表のほか（人数・条件・希望・スタッフ）が変わったかを見るための文字。店の名前は、組み方に関係しないので入れない */
const inputsKey = (p: ShiftPlan) => JSON.stringify({ ...p, schedule: null, storeName: '' })

const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

export default function Tool() {
  const store = usePlanStore()
  const license = useLicense()
  const plan = store.plan

  const [step, setStepState] = useState(0)
  const [licenseOpen, setLicenseOpen] = useState(false)
  const [fileOpen, setFileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  /**
   * いまの内容をまるごと入れかえる操作の前の確かめ（はじめからやり直す、メニューからサンプルを入れる）。
   * 押しまちがい1回で、1か月ぶんの入力が消えないようにする（「元に戻す」のお知らせは数秒で消え、読み込み直すと戻せないため）
   */
  const [confirmReplace, setConfirmReplace] = useState<{ kind: 'restart' } | { kind: 'sample'; id: SampleId } | null>(null)

  const [solving, setSolving] = useState<SolveProgress | null>(null)
  const [suggest, setSuggest] = useState(NO_SUGGEST)
  const [animKey, setAnimKey] = useState(0)
  const [solvedKey, setSolvedKey] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const handle = useRef<SolveHandle | null>(null)
  const token = useRef(0)
  const mainRef = useRef<HTMLElement>(null)
  /** 右上の「そのほかの操作」。メニューから開いたダイアログを閉じたら、ここへフォーカスを戻す（メニューの中のボタンは、もう消えているため） */
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  /** 入れかえの確かめを閉じたあとの戻し先。やめたときはメニューのボタン、はじめの画面に戻ったとき（メニューがない）は手順の頭 */
  const confirmReturn = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        const m = menuButtonRef.current
        return m && m.isConnected ? m : mainRef.current
      },
    }),
    [],
  )

  // 前に開いていた手順に戻す
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STEP_KEY))
      if (Number.isInteger(saved) && saved >= 0 && saved <= 3) setStepState(saved)
    } catch {
      // 保存領域が使えないときは、①から
    }
  }, [])

  // 画面を離れるときは、計算をやめる
  useEffect(() => () => handle.current?.cancel(), [])

  const goStep = useCallback((index: number) => {
    setStepState(index)
    try {
      localStorage.setItem(STEP_KEY, String(index))
    } catch {
      // 覚えられなくても、使うのに困らない
    }
    window.scrollTo(0, 0)
    // 読み上げとキーボードの位置を、新しい手順の頭に移す
    mainRef.current?.focus({ preventScroll: true })
  }, [])

  const { replace, planRef } = store

  const { undo } = store
  /** 「元に戻す」付きのお知らせ。いまの plan のあいだだけ有効（別の変更をしたら消える） */
  const notifyUndo = useCallback(
    (text: string, kind: 'message' | 'success' = 'message') => toast[kind](text, { label: '元に戻す', onClick: () => undo(), validFor: planRef.current }),
    [undo, planRef],
  )
  // plan が変わったら、前の状態のための「元に戻す」のお知らせを消す
  useEffect(() => toast.dropStale(plan), [plan])
  /** サンプルに入れかえたことのお知らせは、表ができてから出す（組んでいる途中に出すと、すぐ古くなって消えるため） */
  const sampleNotice = useRef<string | null>(null)

  /** 自動作成を始める。fresh は、入れたばかりのサンプルを組むとき（「元に戻す」の1回ぶんに数えない） */
  const runSolve = useCallback(
    (base: ShiftPlan, fresh = false) => {
      handle.current?.cancel()
      const mine = ++token.current
      setSolving({ phase: 'greedy', ratio: 0 })
      setSuggest(NO_SUGGEST)
      setAnnounce('')
      handle.current = startSolve(base, {
        seed: nextSeed(base.schedule.seed),
        onProgress: (p) => {
          if (mine === token.current) setSolving(p)
        },
        onResult: (result) => {
          if (mine !== token.current) return
          setSolving(null)
          if (planRef.current !== base) {
            // 計算のあいだに内容が変わっていたら、古い内容で組んだ表は使わない
            toast.error('組んでいるあいだに内容が変わったので、結果を使いませんでした。もう一度、押してください。')
            return
          }
          const next = { ...base, schedule: result.schedule }
          replace(next, { keepHistory: !fresh })
          setSolvedKey(inputsKey(next))
          setAnimKey((k) => k + 1)
          setAnnounce(`表ができました。${result.check.summary.join(' ')}`)
          if (sampleNotice.current) {
            notifyUndo(sampleNotice.current)
            sampleNotice.current = null
          }
          if (result.check.missingTotal > 0) setSuggest({ status: 'working', result: null, progress: null, forPlan: next })
        },
        onSuggestProgress: (done, total) => {
          if (mine === token.current) setSuggest((s) => (s.status === 'working' ? { ...s, progress: { done, total } } : s))
        },
        onSuggestions: (s) => {
          if (mine !== token.current) return
          setSuggest((prev) => (s && prev.forPlan ? { status: 'done', result: s, progress: null, forPlan: prev.forPlan } : NO_SUGGEST))
        },
        onError: (message) => {
          if (mine !== token.current) return
          setSolving(null)
          setSuggest(NO_SUGGEST)
          toast.error(`組んでいる途中で止まりました（${message}）。もう一度、押してください。`)
        },
      })
    },
    [replace, planRef, notifyUndo],
  )


  const startSample = (id: SampleId) => {
    const next = nextMonthOf(localToday())
    const sample = makeSample(id, next.year, next.month)
    const hadPlan = planRef.current !== null
    sampleNotice.current = null
    replace(sample)
    goStep(3)
    runSolve(sample, true)
    const label = SAMPLES.find((s) => s.id === id)?.label ?? ''
    sampleNotice.current = hadPlan ? `${label}のサンプルに入れかえました。` : null
  }

  const startOwn = (blank: ShiftPlan) => {
    replace(blank)
    setSolvedKey(null)
    goStep(0)
  }

  const importPlan = (loaded: ShiftPlan) => {
    const hadPlan = planRef.current !== null
    handle.current?.cancel()
    token.current++
    setSolving(null)
    setSuggest(NO_SUGGEST)
    setSolvedKey(null)
    replace(loaded)
    goStep(isScheduleEmpty(loaded.schedule) ? 0 : 3)
    if (hadPlan) notifyUndo('ファイルの内容に入れかえました。')
    else toast.success('ファイルを読み込みました。')
  }

  const saveFile = () => {
    if (!plan) return
    const file = buildExportFile(plan)
    downloadText(file.filename, file.text, file.mime)
    toast.success(`ファイルに保存しました（${file.filename}）。`)
  }

  const restart = () => {
    handle.current?.cancel()
    token.current++
    setSolving(null)
    setSuggest(NO_SUGGEST)
    replace(null)
    setMenuOpen(false)
    // はじめの画面にも「さっきの内容に戻す」を出しておく（このお知らせが消えても戻せるように）
    notifyUndo('はじめの画面に戻りました。入れていた内容は、「元に戻す」で戻せます。')
  }

  const adopt = (s: Suggestion) => {
    replace(s.plan)
    setSolvedKey(inputsKey(s.plan))
    setAnimKey((k) => k + 1)
    setSuggest(NO_SUGGEST)
    notifyUndo(s.relaxation.kind === 'reseed' ? '別の案に入れかえました。' : `「${s.label}」に変えて、組み直した表に入れかえました。`)
  }

  // 印刷用の表は、マスの数が多い（30人で約1000マス）。打つ・押すの反応をおくらせないよう、少しあとで描き直す
  const printPlan = useDeferredValue(plan)
  const report = useMemo(() => (plan ? checkPlan(plan) : null), [plan])
  const gate = useMemo(() => (plan ? featureGate(plan, license.isPro) : null), [plan, license.isPro])
  const stale = !!plan && solvedKey !== null && solvedKey !== inputsKey(plan)
  const shownSuggest: SuggestState = plan && suggest.forPlan === plan ? suggest : NO_SUGGEST

  const stepItems = useMemo(() => {
    if (!plan || !report) return STEP_TITLES
    const wishCount = Object.values(plan.wishes).reduce((n, row) => n + Object.keys(row).length, 0)
    const empty = isScheduleEmpty(plan.schedule)
    const trouble = report.violations.length + report.shortages.length + report.roleShortages.length
    return [
      { ...STEP_TITLES[0], note: `スタッフ ${plan.staff.length}人` },
      { ...STEP_TITLES[1], note: plan.rules.maxConsecutive !== null ? `連勤は${plan.rules.maxConsecutive}日まで` : '連勤の上限なし' },
      { ...STEP_TITLES[2], note: wishCount > 0 ? `希望 ${wishCount}件` : '希望なし' },
      { ...STEP_TITLES[3], note: empty ? 'まだ空です' : trouble > 0 ? `見直すところ ${trouble}か所` : '点検は問題なし', noteTone: !empty && trouble > 0 ? ('warn' as const) : ('plain' as const) },
    ]
  }, [plan, report])

  const menuItem = 'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-bold hover:bg-well disabled:opacity-40'

  return (
    <div className="min-h-dvh">
      {/* 印刷の用紙（A4 横）と余白。道具の画面が開いているあいだだけ入れる（ほかのページの印刷には影響させない） */}
      <style>{'@page { size: A4 landscape; margin: 8mm; }'}</style>

      <div className="no-print flex min-h-dvh flex-col">
        <header className="border-b-2 border-ink bg-card">
          {/* スマホでは2段（1段め: 印とメニュー、2段め: 店と月・保存の様子と「ファイルに保存する」）。広い画面では1段に並ぶ */}
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 md:gap-x-3 md:px-6 md:py-2">
            <Link to="/" aria-label={`${site.name}のトップページへ`} className="mr-1 flex min-h-11 items-center rounded-md md:mr-2">
              <Logo />
            </Link>

            {plan ? (
              <>
                {/*
                  店の名前が長いときは、名前だけを「…」で切る（年月と保存の様子は、いつも見えるように残す）。
                  スマホでは、2段めの左に、店の名前／年月と保存の様子、の2行。
                  タブレットや小さめのノートの幅（md〜lg）では、ボタンと同じ段に入りきらないので、2段めをまるごと使う。
                  広い画面（xl = 1280px から）では、印のすぐ右に、横1行で並ぶ。
                */}
                <p className="order-3 flex min-w-0 flex-1 flex-col pb-1 text-sm leading-snug md:basis-full md:flex-row md:items-baseline md:gap-x-3 xl:order-none xl:basis-0 xl:pb-0">
                  <span className="truncate font-bold" title={plan.storeName || undefined}>
                    {plan.storeName || '（店の名前なし）'}
                  </span>
                  {/* 年月と保存の様子は、それぞれ途中で折り返さない。とてもせまい画面では、保存の様子だけが次の行に回る */}
                  <span className="flex shrink-0 flex-wrap items-baseline gap-x-2 md:flex-nowrap md:gap-x-3">
                    <span className="whitespace-nowrap text-[13px] font-bold md:text-sm">{formatMonth(plan.year, plan.month)}</span>
                    <span role="status" className={store.save.status === 'failed' ? 'whitespace-nowrap text-[12.5px] font-bold text-danger' : 'whitespace-nowrap text-[12.5px] text-ink-soft'}>
                      {store.save.status === 'saved' ? (
                        <>
                          {/* スマホでは「保存済み」だけにする（時刻まで出すと、となりのボタンと並ばない） */}
                          <span className="hidden sm:inline">このブラウザに</span>保存済み{store.save.at ? <span className="hidden sm:inline">（{clock(store.save.at)}）</span> : null}
                        </>
                      ) : store.save.status === 'failed' ? (
                        '保存できていません'
                      ) : null}
                    </span>
                  </span>
                </p>
                <Button variant="ghost" size="sm" className="hidden md:ml-auto md:inline-flex" disabled={!store.canUndo} onClick={() => store.undo()}>
                  <Undo2 aria-hidden />
                  元に戻す
                </Button>
                <Button variant="outline" size="sm" className="order-4 mb-1 md:order-none md:mb-0" onClick={saveFile}>
                  <Download aria-hidden />
                  ファイルに保存する
                </Button>
                <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => setFileOpen(true)}>
                  <FolderOpen aria-hidden />
                  ファイルを開く
                </Button>
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button ref={menuButtonRef} variant="ghost" size="icon" className="order-1 ml-auto md:order-none md:ml-0" aria-label="そのほかの操作">
                      <Menu aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-1.5">
                    <button
                      type="button"
                      className={`${menuItem} md:hidden`}
                      disabled={!store.canUndo}
                      onClick={() => {
                        store.undo()
                        setMenuOpen(false)
                      }}
                    >
                      <Undo2 aria-hidden className="size-4" />
                      元に戻す
                    </button>
                    <button
                      type="button"
                      className={`${menuItem} md:hidden`}
                      onClick={() => {
                        setFileOpen(true)
                        setMenuOpen(false)
                      }}
                    >
                      <FolderOpen aria-hidden className="size-4" />
                      ファイルを開く
                    </button>
                    {SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={menuItem}
                        onClick={() => {
                          setMenuOpen(false)
                          setConfirmReplace({ kind: 'sample', id: s.id })
                        }}
                      >
                        {s.label}のサンプルを入れる
                      </button>
                    ))}
                    <button
                      type="button"
                      className={menuItem}
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmReplace({ kind: 'restart' })
                      }}
                    >
                      すべて消して、はじめの画面に戻る
                    </button>
                    <button
                      type="button"
                      className={`${menuItem} border-t border-line`}
                      onClick={() => {
                        setMenuOpen(false)
                        setLicenseOpen(true)
                      }}
                    >
                      {site.plans.pro.name}版について・キーを入れる
                    </button>
                  </PopoverContent>
                </Popover>
                {/* スマホで、ここから下を2段めにするための区切り */}
                <span aria-hidden className="order-2 basis-full md:hidden" />
              </>
            ) : (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setLicenseOpen(true)}>
                {/* 店のデータがあるときの、メニューの中の名前とそろえる（LP と、キーを送るメールの案内が、この名前で書いてある） */}
                {site.plans.pro.name}版について・キーを入れる
              </Button>
            )}
          </div>
        </header>

        {plan ? (
          <div className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
            <Steps items={stepItems} current={step} onStepChange={goStep} className="mx-auto max-w-[1440px] px-2 py-1 md:px-6 md:py-1.5" />
          </div>
        ) : null}

        <main ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 outline-none md:px-6 md:py-8">
          {!store.ready ? (
            <p className="py-16 text-center text-sm text-ink-soft">読み込んでいます…</p>
          ) : !plan || !gate || !report ? (
            <Start issue={store.issue} onDismissIssue={store.dismissIssue} onSample={startSample} onStart={startOwn} onImport={importPlan} onRestore={store.canUndo ? () => store.undo() : undefined} />
          ) : (
            <ToolProvider value={{ plan, update: store.update, replace: store.replace, undo: store.undo, notifyUndo, gate, isPro: license.isPro, openLicense: () => setLicenseOpen(true), goStep }}>
              {store.save.status === 'failed' ? (
                <Notice variant="danger" className="mb-5">
                  <NoticeTitle>このブラウザに、保存できていません</NoticeTitle>
                  <NoticeBody>保存の場所が使えないか、いっぱいになっています。このままページを閉じると、内容が消えます。上の「ファイルに保存する」で、ファイルに保存してください。</NoticeBody>
                </Notice>
              ) : null}

              {step === 0 ? <StepStore /> : null}
              {step === 1 ? <StepNeeds /> : null}
              {step === 2 ? <StepWishes /> : null}
              {step === 3 ? <StepSchedule report={report} solving={solving} suggest={shownSuggest} animKey={animKey} stale={stale} onSolve={() => runSolve(plan)} onAdopt={adopt} /> : null}

              <nav aria-label="前後の手順" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-5">
                {step > 0 ? (
                  <Button variant="ghost" onClick={() => goStep(step - 1)}>
                    前へ戻る（{STEP_TITLES[step - 1].title}）
                  </Button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <Button variant={step === 2 ? 'default' : 'outline'} onClick={() => goStep(step + 1)}>
                    次へ進む（{STEP_TITLES[step + 1].title}）
                  </Button>
                ) : null}
              </nav>
            </ToolProvider>
          )}
        </main>

        <footer className="border-t-2 border-ink/20 bg-card/60">
          <div className="mx-auto grid max-w-[1440px] gap-3 px-3 py-5 text-[12.5px] leading-relaxed text-ink-soft md:px-6">
            <p className="max-w-[60em]">この道具は、決めた条件に合っているかを点検するだけです。労働基準法などの法令に合っていることを保証するものではありません。</p>
            {license.ready && license.prelaunch ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border-2 border-dashed border-ink/40 px-3 py-1">
                <span className="font-bold text-ink">公開前モード: {site.plans.pro.name}版の機能を、すべて試せます。</span>
                <Switch checked={license.previewFree} onChange={license.setPreviewFree} label={<span className="text-[13px]">無料版の表示を確かめる</span>} className="py-0.5" />
              </div>
            ) : null}
            <nav aria-label="このサイトのページ" className="flex flex-wrap gap-x-5 gap-y-1">
              <Link to="/" className="flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 md:min-h-0 md:min-w-0">
                トップページ
              </Link>
              <Link to="/#pricing" className="flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 md:min-h-0 md:min-w-0">
                料金
              </Link>
              <Link to="/tokushoho" className="flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 md:min-h-0 md:min-w-0">
                特定商取引法にもとづく表記
              </Link>
              <Link to="/privacy" className="flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 md:min-h-0 md:min-w-0">
                プライバシーポリシー
              </Link>
            </nav>
          </div>
        </footer>

        {/* 自動作成の結果を、読み上げに伝える */}
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
      </div>

      {printPlan ? <PrintSheet plan={printPlan} /> : null}
      <Toaster />
      {plan ? <FileDialog open={fileOpen} onOpenChange={setFileOpen} current={plan} onReplace={importPlan} returnFocus={menuButtonRef} /> : null}
      <LicenseDialog open={licenseOpen} onOpenChange={setLicenseOpen} license={license} returnFocus={menuButtonRef} />

      {/* はじめからやり直す・サンプルを入れる、の前の確かめ（月を変えるときと同じ形） */}
      <Dialog open={confirmReplace !== null && plan !== null} onOpenChange={(v) => !v && setConfirmReplace(null)} returnFocus={confirmReturn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmReplace?.kind === 'sample' ? `${SAMPLES.find((x) => x.id === confirmReplace.id)?.label ?? ''}のサンプルに入れかえますか` : 'すべて消して、はじめの画面に戻りますか'}
            </DialogTitle>
            <DialogDescription>いま入れている内容は、このブラウザからも消えます。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="list-disc space-y-1 pb-3 pl-5 text-sm leading-relaxed">
              <li>消えるもの: {plan?.storeName ? `「${plan.storeName}」の` : ''}店の名前、勤務の種類、スタッフ、必要な人数、条件、希望休、シフト表のすべて</li>
              <li>このページを開いているあいだは「元に戻す」で戻せますが、読み込み直すと戻せません。</li>
            </ul>
            <p className="pb-3 text-sm leading-relaxed text-ink-soft">いまの内容を残しておきたいときは、先に「ファイルに保存する」で保存してください。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReplace(null)}>
              やめる
            </Button>
            <Button variant="outline" onClick={saveFile}>
              <Download aria-hidden />
              先にファイルに保存する
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const c = confirmReplace
                setConfirmReplace(null)
                if (c?.kind === 'sample') startSample(c.id)
                else if (c?.kind === 'restart') restart()
              }}
            >
              {confirmReplace?.kind === 'sample' ? 'サンプルに入れかえる' : '消して、はじめの画面に戻る'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
