// 入力欄まわりの小さな部品（21st.dev の「Popover」（originui）に付いてきた shadcn/ui の Input と Label をもとにした）。
// どの入力欄にも、目に見えるラベルを付けるための Field と、紺の輪郭線にそろえた Input / Select / Textarea。
import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const control =
  "w-full rounded-lg border-2 border-ink bg-card px-3 text-base font-medium text-ink placeholder:font-normal placeholder:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(control, "h-11", className)} {...props} />
))
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-28 py-2 leading-relaxed", className)} {...props} />
))
Textarea.displayName = "Textarea"

/** ブラウザの <select> に、同じ輪郭線と矢印を付けたもの（スマホでは、端末の選び方がそのまま出る） */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <span className={cn("relative inline-block", className)}>
    <select ref={ref} className={cn(control, "h-11 appearance-none pr-9 font-bold")} {...props}>
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2" strokeWidth={3} />
  </span>
))
Select.displayName = "Select"

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-bold leading-snug text-ink", className)} {...props} />
}

/** ラベル + 入力欄 + 説明。children には、id を付けた入力欄を1つ入れる */
export function Field({ label, htmlFor, hint, className, children }: { label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-[13px] leading-relaxed text-ink-soft">{hint}</p> : null}
    </div>
  )
}
