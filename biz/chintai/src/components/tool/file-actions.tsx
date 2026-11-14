import { useEffect, useState } from 'react'
import { buildExportFile, formatYen, inspectEstimate, isEmptyData, parseSavedText, type AppData } from '@/core'
import { downloadTextFile, readTextFile } from '@/lib/file-io'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { toast } from '@/components/ui/toast'

// ファイルへの書き出しと、ファイルからの読み込み。
// ブラウザのデータは消えることがあるので、内容を JSON の1ファイルにして、手元に残せるようにする。
// 読み込むときは、中身を確かめて（core の parseSavedText）、合わないファイルは、理由を言って断る。

/** いまの内容を、ファイルに書き出す。 */
export function exportToFile(data: AppData): void {
  try {
    const file = buildExportFile(data, new Date())
    downloadTextFile(file)
    toast.message(`ファイルに書き出しました（${file.filename}）。ブラウザの「ダウンロード」に入っています。`)
  } catch {
    toast.error('ファイルに書き出せませんでした。もう一度、お試しください。')
  }
}

/** 読み込むファイルの大きさの上限（バイト）。書き出したファイルは、100行でも数十KBにおさまる。 */
const MAX_FILE_BYTES = 2_000_000

type Pending = { data: AppData; warnings: string[]; savedAt: string | null; fileName: string }

function describe(data: AppData): string {
  const r = inspectEstimate(data.estimate)
  return `${data.estimate.lines.length}行、合計 ${formatYen(r.total)}`
}

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${p(d.getMinutes())}`
}

export type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** いまの内容（置きかえる前に、確かめるかどうかを決める）。 */
  current: AppData
  /** 読み込むと決まったときに呼ぶ。 */
  onImport: (data: AppData, warnings: string[], fileName: string) => void
}

export function ImportDialog({ open, onOpenChange, current, onImport }: ImportDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  // 開き直したときは、前のエラーや、確かめ待ちのファイルを残さない。
  useEffect(() => {
    if (open) {
      setError(null)
      setPending(null)
      setBusy(false)
    }
  }, [open])

  const finish = (p: Pending) => {
    onImport(p.data, p.warnings, p.fileName)
    onOpenChange(false)
  }

  const onFile = async (file: File) => {
    setError(null)
    if (file.size > MAX_FILE_BYTES) {
      setError(`「${file.name}」は、読み込めませんでした。ファイルが大きすぎます。みつもり点検で書き出したファイルを、選んでください。`)
      return
    }
    setBusy(true)
    try {
      const parsed = parseSavedText(await readTextFile(file))
      if (!parsed.ok) {
        setError(`「${file.name}」は、読み込めませんでした。${parsed.reason}`)
        return
      }
      const next: Pending = { data: parsed.data, warnings: parsed.warnings, savedAt: parsed.savedAt, fileName: file.name }
      // いまの内容が空なら、確かめずに読み込む。入っているなら、置きかえてよいかを確かめる。
      if (isEmptyData(current)) finish(next)
      else setPending(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ファイルを開けませんでした。もう一度、ファイルを選び直してください。')
    } finally {
      setBusy(false)
    }
  }

  const savedAt = pending ? formatSavedAt(pending.savedAt) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {pending ? (
          <>
            <DialogHeader>
              <DialogTitle>いまの内容を、ファイルの内容に置きかえますか</DialogTitle>
              <DialogDescription>置きかえると、いま入っている内容は、ファイルの内容に変わります（読み込んだすぐあとなら、「元に戻す」で戻せます）。</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-y border-rule py-3 text-sm leading-6">
              <dt className="text-ink-soft">ファイル</dt>
              <dd className="break-all">
                {pending.fileName}
                <br />
                <span className="num">{describe(pending.data)}</span>
                {savedAt && <span className="text-ink-soft">（{savedAt} に書き出し）</span>}
              </dd>
              <dt className="text-ink-soft">いまの内容</dt>
              <dd className="num">{describe(current)}</dd>
            </dl>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>
                やめて、選び直す
              </Button>
              <Button onClick={() => finish(pending)}>ファイルの内容に置きかえる</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>ファイルを読み込む</DialogTitle>
              <DialogDescription>「ファイルに書き出す」で保存したファイル（mitsumori-tenken-….json）を読み込みます。ファイルは、どこにも送信されません。</DialogDescription>
            </DialogHeader>
            <FileDropzone
              accept=".json,application/json"
              title="ここに、ファイルを置く"
              hint="または、下のボタンから選んでください。"
              buttonLabel="ファイルを選ぶ"
              onFile={onFile}
              error={error}
              busy={busy}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
