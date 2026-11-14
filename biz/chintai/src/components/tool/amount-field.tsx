import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { MAX_AMOUNT, parseAmountInput } from '@/core'
import { InputWithUnit } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// 金額の入力欄。
// 見積書を見ながら打つので、全角の数字、カンマ、「円」、「8.2万」も受け付ける（直すのは core の parseAmountInput）。
// - 打っているあいだは、打った文字をそのまま見せる。欄から出たら、「82,000」の形に直す。
// - 数字として読めない文字が入っているときは、赤い枠と、直し方の文を出す（その行の金額は「未入力」として扱う）。

function format(value: number | null): string {
  return value === null ? '' : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export type AmountFieldProps = {
  value: number | null
  onChange: (value: number | null) => void
  /** 読み上げのための名前（見えるラベルがないとき）。 */
  'aria-label'?: string
  /** 見えるラベルの id（あるとき）。 */
  'aria-labelledby'?: string
  id?: string
  placeholder?: string
  /** Enter を押したときに呼ぶ（次の行の金額へ進む、など）。 */
  onEnter?: () => void
  className?: string
  inputClassName?: string
}

export const AmountField = forwardRef<HTMLInputElement, AmountFieldProps>(function AmountField(
  { value, onChange, id, placeholder, onEnter, className, inputClassName, ...aria },
  ref,
) {
  const [text, setText] = useState(() => format(value))
  const [focused, setFocused] = useState(false)
  const inner = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLInputElement)
  const errorId = useId()

  // 外から値が変わったとき（サンプルを入れた、ファイルを読み込んだ、元に戻した）は、表示を合わせる。
  // 打っている最中は、打った文字（「8.2万」など）を書き換えない。
  useEffect(() => {
    if (!focused) setText(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const invalid = text.trim() !== '' && parseAmountInput(text) === null

  return (
    <span className={cn('block', className)}>
      <InputWithUnit
        ref={inner}
        id={id}
        unit="円"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className={cn('num text-right', inputClassName)}
        onFocus={(e) => {
          setFocused(true)
          // 打ち直しやすいように、入っている数字を全部選ぶ。
          e.target.select()
        }}
        onBlur={() => {
          setFocused(false)
          const parsed = parseAmountInput(text)
          if (parsed !== null) setText(format(parsed))
        }}
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          onChange(next.trim() === '' ? null : parseAmountInput(next))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onEnter?.()
          }
        }}
        {...aria}
      />
      {invalid && (
        <span id={errorId} role="alert" className="mt-1 block text-xs leading-5 text-pen">
          数字で入れてください（例: 16500、8.2万）。{MAX_AMOUNT.toLocaleString('ja-JP')}円までです。
        </span>
      )}
    </span>
  )
})
