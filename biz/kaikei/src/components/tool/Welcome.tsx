import { useState, type ReactNode } from 'react'
import { BookOpenText, FilePlus2 } from 'lucide-react'
import { DATA_NOTE, OUT_OF_SCOPE, SAMPLE_NOTE, createSampleBook, type Book } from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { LogoMark } from '@/components/ui/seal'
import { NewBookWizard } from './NewBookWizard'
import type { Store } from './store'

// はじめて開いたときの画面。
// 「ひきつぎファイルを開く」「新しく始める」「サンプルを見る」の3つを、1枚の紙の上の3行として並べる
// （届け出の用紙のように、上から順に読んで、自分に合う行を選ぶ）。

function ChoiceRow({ index, title, lead, children }: { index: string; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule/60 px-5 py-6 first:border-t-0 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-10">
      <div className="flex gap-4">
        {/* 行の番号。はんこの形の丸に、漢数字 */}
        <span aria-hidden className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-shu font-serif text-lg font-bold leading-none text-shu-ink">
          {index}
        </span>
        <div>
          <h2 className="text-[1.35rem] leading-snug">{title}</h2>
          <p className="mt-1.5 text-[0.94rem] leading-relaxed text-muted-foreground">{lead}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  )
}

export function Welcome({ store }: { store: Store }) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const open = async (file: File) => {
    setBusy(true)
    setFileError(null)
    const message = await store.openFile(file)
    setBusy(false)
    if (message) setFileError(message)
  }

  const start = (book: Book) => store.startWith(book)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-2" aria-label={`${site.name} のトップページへ`}>
          <LogoMark />
          <span className="font-serif text-xl font-bold tracking-wide">{site.name}</span>
        </Link>
        <nav className="flex items-center gap-1 text-[0.94rem]" aria-label="サイトの案内">
          <Link to="/" className="inline-flex min-h-11 items-center rounded-lg px-3 underline underline-offset-4 hover:bg-muted">
            使い方と料金
          </Link>
        </nav>
      </header>

      <main>
        <div className="mt-8 sm:mt-12">
          <h1 className="text-[1.75rem] leading-snug sm:text-[2.3rem]">
            <span className="inline-block">会計のしごとを、</span>
            <span className="inline-block">ここから始めます。</span>
          </h1>
          <p className="mt-3 max-w-[38em] leading-relaxed text-muted-foreground">
            収入と支出を入れていくと、総会の資料ができあがります。登録はいりません。下の3つから、あてはまるものを選んでください。
          </p>
        </div>

        {store.notice && (
          <Alert variant={store.notice.kind === 'error' ? 'error' : 'warn'} role="alert" className="mt-6">
            <AlertDescription>
              <p>{store.notice.message}</p>
              {store.notice.detail && <p className="text-[0.84rem] text-muted-foreground">（くわしい理由: {store.notice.detail}）</p>}
            </AlertDescription>
          </Alert>
        )}
        {store.storageProblem && (
          <Alert variant="warn" className="mt-6">
            {store.storageProblem}
          </Alert>
        )}

        <div className="mt-7 overflow-hidden rounded-xl border border-border border-t-[3px] border-t-rule bg-paper shadow-paper">
          <ChoiceRow index="一" title="ひきつぎファイルを開く" lead="前の担当の方から受け取ったファイルや、自分で保存したファイルがあるとき。続きから始められます。">
            <FileDropzone
              onFile={open}
              busy={busy}
              inputLabel="ひきつぎファイルを選ぶ"
              title="ここにファイルを置くか、下のボタンで選びます"
              description="「ひきつぎ会計_」で始まる名前の、.json のファイルです。"
              buttonLabel="ひきつぎファイルを選ぶ"
            />
            {fileError && (
              <Alert variant="error" role="alert" className="mt-3">
                <AlertTitle>このファイルは開けませんでした</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </ChoiceRow>

          <ChoiceRow index="二" title="新しく始める" lead="はじめて使うとき。団体の種類を選ぶと、よくある科目が入った帳簿ができます。">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setWizardOpen(true)}>
              <FilePlus2 />
              新しい帳簿を作る
            </Button>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-muted-foreground">町内会・自治会、子ども会、PTA、サークルなどのひな形があります。</p>
          </ChoiceRow>

          <ChoiceRow index="三" title="サンプルを見る" lead="まず、ようすを見たいとき。入力ずみの帳簿で、資料の印刷まで試せます。">
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => start(createSampleBook())}>
              <BookOpenText />
              サンプルを入れて見る
            </Button>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-muted-foreground">「あおぞら町内会」の2年ぶんの帳簿が入ります。{SAMPLE_NOTE}</p>
          </ChoiceRow>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section aria-labelledby="welcome-data">
            <h2 id="welcome-data" className="rule-double pb-1.5 text-lg">
              入力した内容の置き場所
            </h2>
            <p className="mt-3 text-[0.94rem] leading-relaxed">{DATA_NOTE}</p>
          </section>
          <section aria-labelledby="welcome-scope">
            <h2 id="welcome-scope" className="rule-double pb-1.5 text-lg">
              使えないこと
            </h2>
            <ul className="mt-3 grid gap-1.5 text-[0.94rem] leading-relaxed">
              {OUT_OF_SCOPE.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 bg-shu" />
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

      </main>

      <NewBookWizard open={wizardOpen} onOpenChange={setWizardOpen} today={store.today} onCreate={start} />
    </div>
  )
}
