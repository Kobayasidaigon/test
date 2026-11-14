import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { FolderOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// 21st.dev の File Dropzone（joyco）をもとにした、ファイルの読み込み口。
// もとのまま使っているところ: 点線の枠にファイルを落とせる、落とせるあいだ枠の色が変わる、
// 中のボタンでもファイルを選べる（キーボードでは、このボタンから選ぶ）。
// 変えたところ: 画像の見本・複数ファイル・一覧・大きさの上限の表示をやめて、「1つ選んだら、すぐ親に渡す」だけにした
// （中身の検査と、断るときの理由は、src/core の openBookFile がする）。文を日本語に。見た目を、紙と青緑の点線に。

export function FileDropzone({
  onFile,
  accept = ".json,application/json",
  title,
  description,
  buttonLabel,
  inputLabel,
  busy = false,
  className,
}: {
  /** ファイルが1つ選ばれた（落とされた）ときに呼ばれる */
  onFile: (file: File) => void
  accept?: string
  title: ReactNode
  description?: ReactNode
  buttonLabel: string
  /** 読み上げ用の、入力欄の名前 */
  inputLabel: string
  busy?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // 枠の中の子に入るたびに dragleave が起きるので、入った回数を数えて、本当に出たときだけ色を戻す
  const depth = useRef(0)

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
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      data-dragging={dragging || undefined}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-rule bg-paper px-4 py-6 text-center transition-colors",
        "data-[dragging=true]:border-rule-ink data-[dragging=true]:bg-rule-soft",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={inputLabel}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // 同じファイルをもう一度選べるように、選んだあとで空に戻す
          e.target.value = ""
          if (file) onFile(file)
        }}
      />
      <div aria-hidden className="flex size-12 items-center justify-center rounded-full border border-rule/50 bg-rule-soft text-rule-ink">
        <FolderOpen className="size-6" />
      </div>
      <div className="grid gap-1">
        <p className="font-bold leading-snug">{title}</p>
        {description && <p className="text-[0.86rem] leading-snug text-muted-foreground">{description}</p>}
      </div>
      <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "読み込んでいます…" : buttonLabel}
      </Button>
    </div>
  )
}

export default FileDropzone
