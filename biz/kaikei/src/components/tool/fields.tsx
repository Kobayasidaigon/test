import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { dateParts, formatWareki, formatYen, isValidDate, parseDateInput, parseYen, type DateString, type Yen } from '@/core'
import { cn } from '@/lib/utils'
import { Input, type InputProps } from '@/components/ui/input'

// 金額と日付の入力欄。道具の画面のあちこちで使う。
// 入力のきまり:
//   ・金額は、全角でもカンマつきでも読む（core の parseYen）。入力欄から離れると、カンマつきに整える
//   ・日付は「4/1」「0401」「2026/4/1」「R8.4.1」などを読む（core の parseDateInput）。カレンダーからも選べる
//   ・帳簿を変える入力は、1文字ごとではなく、入力欄から離れたとき（または Enter）に1回だけ反映する
//     （「最後に保存してから◯件の変更」の数が、1文字ごとに増えないように）

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 「令和8年4月1日（水）」 */
export function formatWarekiWithWeekday(date: DateString): string {
  if (!isValidDate(date)) return ''
  const { year, month, day } = dateParts(date)
  // 曜日は UTC の暦で出す（端末の時差で、1日ずれないように）
  const w = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${formatWareki(date)}（${WEEKDAYS[w]}）`
}

/** 入力欄に出す、短い日付（「4/1」）。年度の外の年なら、年も付ける。 */
export function shortDate(date: DateString | '', period?: { startDate: DateString; endDate: DateString }): string {
  if (!isValidDate(date)) return ''
  const { year, month, day } = dateParts(date)
  if (period) {
    const again = parseDateInput(`${month}/${day}`, period)
    if (again.ok && again.value === date) return `${month}/${day}`
  }
  return `${year}/${month}/${day}`
}

/** 金額の入力欄（値は、文字のまま親が持つ）。数字のキーボードが出る。右にそろえる。入力欄から離れると、カンマつきに整える。 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'value' | 'onChange'> & { value: string; onValueChange: (text: string) => void; unit?: boolean }
>(function MoneyInput({ className, unit = true, value, onValueChange, onBlur, ...props }, ref) {
  return (
    <span className="relative block">
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        className={cn('num text-right text-[1.08rem]', unit && 'pr-9', className)}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={(e) => {
          // 読める金額なら、カンマつきに整える（「１２０００」→「12,000」）
          const parsed = parseYen(value)
          if (parsed.ok && value !== formatYen(parsed.value)) onValueChange(formatYen(parsed.value))
          onBlur?.(e)
        }}
        {...props}
      />
      {unit && (
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.94rem] text-muted-foreground">
          円
        </span>
      )}
    </span>
  )
})

/**
 * 帳簿の金額を、その場で直す入力欄（科目の予算額など）。
 * 入力欄から離れたとき、または Enter で、変わっていれば onCommit を呼ぶ。
 * onCommit が文を返したら、まちがいとして下に出す（値は、直すまで入力のまま残す）。
 */
export function CommitMoney({
  value,
  onCommit,
  allowEmpty = false,
  label,
  placeholder,
  disabled,
  className,
}: {
  value: Yen | null
  /** 空にしたときは null が来る（allowEmpty のときだけ） */
  onCommit: (value: Yen | null) => string | null
  allowEmpty?: boolean
  /** 読み上げ用の名前（表の中では、見えるラベルがないため） */
  label: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const shown = value === null ? '' : formatYen(value)
  const [text, setText] = useState(shown)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  // 帳簿の側の値が変わったら（ほかの操作で変わった、年度を切り替えた）、入力欄も合わせる
  useEffect(() => {
    setText(shown)
    setError(null)
  }, [shown])

  const commit = () => {
    const raw = text.trim()
    if (raw === '') {
      if (allowEmpty) {
        if (value !== null) setError(onCommit(null))
        else setError(null)
      } else {
        // 空のままにはできないので、元の値に戻す
        setText(shown)
        setError(null)
      }
      return
    }
    const parsed = parseYen(raw)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    if (parsed.value === value) {
      setText(shown)
      setError(null)
      return
    }
    const message = onCommit(parsed.value)
    setError(message)
    if (message === null) setText(formatYen(parsed.value))
  }

  return (
    <span className={cn('block', className)}>
      <Input
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        disabled={disabled}
        value={text}
        className="num h-11 px-2.5 text-right"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            setText(shown)
            setError(null)
          }
        }}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-[0.84rem] font-bold leading-snug text-destructive">
          {error}
        </span>
      )}
    </span>
  )
}

/** 帳簿の文字を、その場で直す入力欄（科目の名前など）。入力欄から離れたとき、または Enter で反映する。 */
export function CommitText({
  value,
  onCommit,
  label,
  placeholder,
  maxLength,
  disabled,
  multiline = false,
  rows = 4,
  className,
  inputClassName,
  id,
  describedBy,
}: {
  value: string
  onCommit: (value: string) => string | null
  /** 読み上げ用の名前。見えるラベルを別に付けるときは、id を渡してラベルとつなぐ */
  label?: string
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  multiline?: boolean
  rows?: number
  className?: string
  inputClassName?: string
  id?: string
  describedBy?: string
}) {
  const [text, setText] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  useEffect(() => {
    setText(value)
    setError(null)
  }, [value])

  const commit = () => {
    if (text === value) {
      setError(null)
      return
    }
    setError(onCommit(text))
  }
  const shared = {
    id,
    'aria-label': label,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
    placeholder,
    maxLength,
    disabled,
    value: text,
    onBlur: commit,
  }
  return (
    <span className={cn('block', className)}>
      {multiline ? (
        <textarea
          {...shared}
          rows={rows}
          onChange={(e) => setText(e.target.value)}
          className={cn(
            'w-full rounded-lg border-[1.5px] border-input bg-paper px-3 py-2.5 text-base leading-relaxed focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:border-border disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive',
            inputClassName,
          )}
        />
      ) : (
        <Input
          {...shared}
          onChange={(e) => setText(e.target.value)}
          className={cn('h-11 px-2.5', inputClassName)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              setText(value)
              setError(null)
            }
          }}
        />
      )}
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-[0.84rem] font-bold leading-snug text-destructive">
          {error}
        </span>
      )}
    </span>
  )
}

/**
 * 日付の入力欄。「4/1」のように打てて、右のボタンでカレンダーからも選べる。
 * 値は文字のまま親が持つ（読めたかどうかは、親が parseDateInput で確かめる）。
 * 下に、読んだ結果（「令和8年4月1日（水）」）を出す。年をまちがえていないか、目で確かめられるように。
 */
export const DateField = forwardRef<
  HTMLInputElement,
  {
    text: string
    onTextChange: (text: string) => void
    /** 月と日だけを打ったときに、年を決めるための会計年度 */
    period?: { startDate: DateString; endDate: DateString }
    id?: string
    invalid?: boolean
    describedBy?: string
    label?: string
    disabled?: boolean
    placeholder?: string
    /** 読んだ結果（「令和8年4月1日（水）」）を、入力欄の下に出すか。'reserve' は、空のときも1行ぶんの高さを取る */
    showParsed?: boolean | 'reserve'
    onBlur?: () => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    /** カレンダーで日付を選んだときに呼ばれる（onTextChange のあと） */
    onPick?: (date: DateString) => void
    className?: string
  }
>(function DateField(
  { text, onTextChange, period, id, invalid, describedBy, label, disabled, placeholder = '例: 4/1', showParsed = 'reserve', onBlur, onKeyDown, onPick, className },
  ref,
) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const parsed = text.trim() === '' ? null : parseDateInput(text, period)
  const iso = parsed?.ok ? parsed.value : ''
  return (
    <span className={cn('block', className)}>
      <span className="relative block">
        <Input
          ref={ref}
          id={id}
          aria-label={label}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          inputMode="text"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          className="num pr-12"
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        {/* カレンダー。キーボードで続けて入れるときのじゃまにならないよう、Tab では止まらない（打って入れられるため） */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="カレンダーから日付を選ぶ"
          className="absolute right-0.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-rule-ink hover:bg-rule-soft disabled:opacity-40"
          onClick={() => {
            const el = pickerRef.current
            if (!el) return
            try {
              el.showPicker()
            } catch {
              // showPicker のないブラウザでは、入力欄そのものにフォーカスを移す
              el.focus()
              el.click()
            }
          }}
        >
          <CalendarDays className="size-5" aria-hidden="true" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={iso}
          min={period ? undefined : '1990-01-01'}
          className="pointer-events-none absolute bottom-0 right-0 size-px opacity-0"
          onChange={(e) => {
            if (!isValidDate(e.target.value)) return
            onTextChange(shortDate(e.target.value, period))
            onPick?.(e.target.value)
          }}
        />
      </span>
      {(showParsed === 'reserve' || (showParsed && parsed?.ok)) && (
        <span className={cn('mt-1 block text-[0.84rem] leading-tight text-muted-foreground', showParsed === 'reserve' && 'min-h-[1.25rem]')} aria-live="polite">
          {parsed?.ok ? formatWarekiWithWeekday(parsed.value) : ''}
        </span>
      )}
    </span>
  )
})

/**
 * 帳簿の日付を、その場で直す入力欄（資料の作成日、監査の日など）。空にもできる。
 * 入力欄から離れたとき、カレンダーで選んだとき、Enter で反映する。
 */
export function CommitDate({
  value,
  onCommit,
  period,
  id,
  label,
  disabled,
  emptyHint,
}: {
  value: DateString | ''
  onCommit: (value: DateString | '') => string | null
  period?: { startDate: DateString; endDate: DateString }
  id?: string
  label?: string
  disabled?: boolean
  /** 空のときに、下に出す文（「空のままなら、印刷した日が入ります」など） */
  emptyHint?: string
}) {
  const shown = value === '' ? '' : shortDate(value)
  const [text, setText] = useState(shown)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  useEffect(() => {
    setText(shown)
    setError(null)
  }, [shown])

  const commit = (raw: string) => {
    if (raw.trim() === '') {
      setError(value === '' ? null : onCommit(''))
      return
    }
    const parsed = parseDateInput(raw, period)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    setError(parsed.value === value ? null : onCommit(parsed.value))
    if (parsed.value === value) setText(shown)
  }

  return (
    <span className="block">
      <DateField
        id={id}
        label={label}
        text={text}
        period={period}
        disabled={disabled}
        invalid={error !== null}
        describedBy={error ? errorId : undefined}
        placeholder="例: 2027/4/10"
        showParsed
        onTextChange={setText}
        // カレンダーで選んだときは、入力欄から離れなくても反映する
        onPick={(date) => commit(date)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            commit(text)
          }
        }}
      />
      {error ? (
        <span id={errorId} role="alert" className="block text-[0.84rem] font-bold leading-snug text-destructive">
          {error}
        </span>
      ) : (
        value === '' && emptyHint && <span className="block text-[0.84rem] leading-snug text-muted-foreground">{emptyHint}</span>
      )}
    </span>
  )
}
