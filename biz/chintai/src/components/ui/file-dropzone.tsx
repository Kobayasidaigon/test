import { useCallback, useId, useRef, useState, type DragEvent } from "react"
import { AlertCircleIcon, FileJsonIcon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// joyco の File Dropzone（21st.dev）をもとにした、ファイルの読み込み口。
//
// もとの部品から残したもの:
// - ファイルを落とす枠（破線）と、「ファイルを選ぶ」ボタンの両方で選べること。
// - 引っぱってきたファイルが枠の上にあるあいだ、枠の色が変わること（data-dragging）。
// - 断った理由を、枠の下に role="alert" で出すこと。
//
// 変えたもの:
// - 画像のプレビュー、複数のファイル、送信の進み具合は、この道具には要らないので取った（1つの JSON を読むだけ）。
// - ファイルの中身を確かめるのは呼ぶ側（core の parseSavedText）。ここは、選ばれたファイルを渡すだけ。
//   断る理由（error）は、呼ぶ側から受け取って出す。
// - 見た目を、紙の「ここに貼る」欄にした（角を丸めない、破線、机の色）。

export interface FileDropzoneProps {
  /** 選べるファイルの種類（<input accept> と同じ書き方）。 */
  accept?: string
  /** ファイルが選ばれた（落とされた）ときに呼ぶ。 */
  onFile: (file: File) => void
  /** 枠の中の、大きい文。 */
  title: string
  /** 枠の中の、小さい文。 */
  hint?: string
  /** ボタンの文。 */
  buttonLabel?: string
  /** 断った理由（あれば、枠の下に出す）。 */
  error?: string | null
  /** 読み込んでいるあいだ、ボタンを押せなくする。 */
  busy?: boolean
  className?: string
}

export function FileDropzone({ accept, onFile, title, hint, buttonLabel = "ファイルを選ぶ", error, busy = false, className }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // 枠の中の子の上を通るたびに dragleave が来るので、入った回数を数えて、本当に出たときだけ戻す。
  const depth = useRef(0)
  const errorId = useId()

  const take = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    depth.current += 1
    setDragging(true)
  }
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    if (!busy) take(e.dataTransfer.files)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        data-dragging={dragging || undefined}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex min-h-44 flex-col items-center justify-center gap-1 rounded-sm border-[1.5px] border-dashed border-ink/45 bg-muted px-4 py-6 text-center transition-colors data-[dragging=true]:border-ink data-[dragging=true]:bg-marker-soft"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            take(e.target.files)
            // 同じファイルをもう一度選んでも、読み込めるようにする。
            e.target.value = ""
          }}
        />
        <FileJsonIcon aria-hidden className="mb-1 size-7 text-ink-soft" strokeWidth={1.5} />
        <p className="text-sm font-bold">{title}</p>
        {hint && <p className="text-[13px] leading-6 text-ink-soft">{hint}</p>}
        <Button className="mt-3" variant="outline" disabled={busy} aria-describedby={error ? errorId : undefined} onClick={() => inputRef.current?.click()}>
          <UploadIcon aria-hidden className="size-4" />
          {buttonLabel}
        </Button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-2 rounded-sm border border-pen/50 bg-pen-soft px-3 py-2 text-sm leading-6 text-ink">
          <AlertCircleIcon aria-hidden className="mt-1 size-4 shrink-0 text-pen" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export default FileDropzone
