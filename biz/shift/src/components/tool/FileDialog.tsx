// ファイルの読み込み。読み込み口（ImportZone）と、いまの内容と入れかえる前に確かめるダイアログ（FileDialog）。
// 中身の確かめは core の parsePlanText にまかせ、合わないファイルは、返ってきた理由の文をそのまま出して断る。
import { useState, type RefObject } from 'react'
import { formatMonth, parsePlanText, readFileText, type ShiftPlan } from '@/core'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropzone } from '@/components/ui/dropzone'

export type LoadedFile = { plan: ShiftPlan; savedAt: string | null; filename: string }

function formatSavedAt(iso: string | null): string {
  if (!iso) return '保存した日時はわかりません'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '保存した日時はわかりません'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}に保存`
}

/** ファイルを落とすか選ぶと、中身を確かめて、合っていれば onLoaded に plan をわたす */
export function ImportZone({ onLoaded }: { onLoaded: (plan: ShiftPlan, file: LoadedFile) => void }) {
  const [error, setError] = useState<string | null>(null)
  const onFile = async (file: File) => {
    setError(null)
    const read = await readFileText(file)
    if (!read.ok) return setError(`「${file.name}」は読み込めませんでした。${read.reason}`)
    const parsed = parsePlanText(read.text)
    if (!parsed.ok) return setError(`「${file.name}」は読み込めませんでした。${parsed.reason}`)
    onLoaded(parsed.plan, { plan: parsed.plan, savedAt: parsed.savedAt, filename: file.name })
  }
  return (
    <Dropzone
      accept=".json,application/json"
      onFile={onFile}
      title="保存したファイル（.json）を、ここに置きます"
      hint="中身を確かめてから読み込みます。この道具のファイルでなければ、理由を言って断ります。"
      buttonLabel="ファイルを選ぶ"
      inputLabel="保存したファイルを選ぶ"
      error={error}
    />
  )
}

export function FileDialog({
  open,
  onOpenChange,
  current,
  onReplace,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current: ShiftPlan
  onReplace: (plan: ShiftPlan) => void
  /** 開いたボタンがもうないとき（メニューから開いたとき）に、閉じたあとフォーカスを戻す先 */
  returnFocus?: RefObject<HTMLElement | null>
}) {
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const close = () => {
    onOpenChange(false)
    setLoaded(null)
  }
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())} returnFocus={returnFocus}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ファイルを開く</DialogTitle>
          <DialogDescription>前に「ファイルに保存する」で保存したファイルを読み込みます。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 pb-4">
            {loaded ? (
              <div className="rounded-lg border-2 border-ink bg-paper px-4 py-3">
                <p className="text-xs font-bold text-ink-soft">読み込んだファイル</p>
                <p className="mt-0.5 break-all text-sm font-bold">{loaded.filename}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  <dt className="text-ink-soft">店</dt>
                  <dd className="font-bold">{loaded.plan.storeName || '（店の名前なし）'}</dd>
                  <dt className="text-ink-soft">月</dt>
                  <dd className="font-bold">{formatMonth(loaded.plan.year, loaded.plan.month)}</dd>
                  <dt className="text-ink-soft">スタッフ</dt>
                  <dd className="font-bold">{loaded.plan.staff.length}人</dd>
                  <dt className="text-ink-soft">日時</dt>
                  <dd>{formatSavedAt(loaded.savedAt)}</dd>
                </dl>
                <p className="mt-3 text-sm leading-relaxed">
                  いま画面にある「{current.storeName || '（店の名前なし）'}・{formatMonth(current.year, current.month)}」の内容と、入れかえます。
                </p>
              </div>
            ) : (
              <ImportZone onLoaded={(_plan, file) => setLoaded(file)} />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            やめる
          </Button>
          {loaded ? (
            <>
              <Button variant="ghost" onClick={() => setLoaded(null)}>
                別のファイルを選ぶ
              </Button>
              <Button
                onClick={() => {
                  onReplace(loaded.plan)
                  close()
                }}
              >
                この内容に入れかえる
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
