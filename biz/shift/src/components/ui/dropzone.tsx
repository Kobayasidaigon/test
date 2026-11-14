// 21st.dev の「File Dropzone」（joyco）をもとにした、ファイルの読み込み口。
// 借りたところ: 点線の枠にファイルを落とすか、ボタンで選ぶか、の2通りの入口。落とせる状態のときに枠の色が変わること。
//   まちがいの知らせを、枠のすぐ下に role="alert" で出すこと。見えない <input type="file"> を中に持つこと。
// 変えたところ: 画像の見本や、複数のファイルの一覧は、この道具では使わないので外した（読むのは .json の1つだけ）。
//   ファイルの中身の確かめは外（core の parsePlanText）でやるので、ここは選んだファイルをわたすだけ。
//   見た目は、紺の点線と、落とせるときの卵色。丸いアイコンは、ブロックの形にした。
import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { AlertCircle, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DropzoneProps {
  /** 選べるファイルの種類（input の accept） */
  accept?: string
  onFile: (file: File) => void
  /** 枠の中の見出し */
  title: ReactNode
  /** 見出しの下の説明 */
  hint?: ReactNode
  /** ボタンの文 */
  buttonLabel: string
  /** 読み上げ用の、入力欄の名前 */
  inputLabel: string
  /** 読み込めなかったときの理由（あれば、枠の下に出す） */
  error?: string | null
  className?: string
}

export function Dropzone({ accept, onFile, title, hint, buttonLabel, inputLabel, error, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // 子の要素の上を通るたびに dragleave が起きるので、入った回数を数えて、ちらつきを防ぐ
  const depth = useRef(0)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        data-dragging={dragging || undefined}
        onDragEnter={(e) => {
          e.preventDefault()
          depth.current += 1
          setDragging(true)
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setDragging(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink/60 bg-card px-4 py-6 text-center transition-colors data-[dragging=true]:border-solid data-[dragging=true]:border-ink data-[dragging=true]:bg-shift-egg/50 sm:flex-row sm:justify-between sm:text-left"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={inputLabel}
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // 同じファイルをもう一度選べるように、選んだあとで空に戻す
            e.target.value = ""
            if (file) onFile(file)
          }}
        />
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-well">
            <FileUp className="size-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-snug">{title}</p>
            {hint ? <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{hint}</p> : null}
          </div>
        </div>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          {buttonLabel}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-danger bg-danger-soft px-3 py-2 text-sm font-bold leading-relaxed text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

export default Dropzone
