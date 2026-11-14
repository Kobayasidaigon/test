import * as React from "react"

import { cn } from "@/lib/utils"

// shadcn/ui の Input・Label をもとにした入力欄の部品。
// ・文字を大きく（17px）、高さを 48px 以上にして、押しやすく読みやすくする
// ・ふちは、紙の上で形がはっきりわかる濃さにする（--input）
// ・まちがいがあるときは aria-invalid を付けると、ふちが朱になる（色だけにならないよう、下に文も出す）
const fieldBase =
  "w-full rounded-lg border-[1.5px] border-input bg-paper px-3 text-base text-foreground placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return <input type={type} className={cn(fieldBase, "h-12", className)} ref={ref} {...props} />
})
Input.displayName = "Input"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return <textarea className={cn(fieldBase, "min-h-28 py-2.5 leading-relaxed", className)} ref={ref} {...props} />
  },
)
Textarea.displayName = "Textarea"

/**
 * ブラウザに元からある選ぶ欄（select）。見た目だけをそろえる。
 * 自作の選ぶ欄にしないのは、スマホではその機種の選び方（大きな一覧）が出て、キーボードでもそのまま使えるため。
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          fieldBase,
          // 右はしの「選べます」の矢じるしは、index.css の .select-arrow で描く
          "select-arrow h-12 appearance-none pr-9",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  },
)
NativeSelect.displayName = "NativeSelect"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("block text-[0.94rem] font-bold leading-snug text-foreground", className)} {...props} />
))
Label.displayName = "Label"

type FieldProps = {
  label: React.ReactNode
  /** ラベルの下に出す、ひとこと説明 */
  hint?: React.ReactNode
  /** まちがいの文。あると、入力欄のふちが朱になり、読み上げにも伝わる */
  error?: string | null
  className?: string
  /** 入力欄。id・aria-describedby・aria-invalid を受け取って、そのまま入力欄に渡す */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode
}

/** ラベル・説明・まちがいの文を、入力欄とひとまとめにする。 */
function Field({ label, hint, error, className, children }: FieldProps) {
  const id = React.useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-[0.86rem] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[0.9rem] font-bold leading-snug text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { Field, Input, Label, NativeSelect, Textarea }
