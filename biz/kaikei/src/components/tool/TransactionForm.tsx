import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, CornerDownLeft } from 'lucide-react'
import {
  LIMITS,
  addTransaction,
  checkTransaction,
  defaultReceiptNo,
  descriptionSuggestions,
  explain,
  formatMonthDay,
  formatYen,
  isWithin,
  parseDateInput,
  parseYen,
  updateTransaction,
  type Notice,
  type Transaction,
  type TransactionInput,
  type TransactionKind,
} from '@/core'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/hint'
import { Input, Label, NativeSelect } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DateField, MoneyInput, shortDate } from './fields'
import { useWorkspace } from './store'

// 取引を1件入れる（直す）ためのフォーム。この道具の主役。
//
// 入力の流れ:
//   上の段で「収入・支出・移動」と「お金の置き場所」を選ぶ（続けて入れるあいだ、選んだままになる）。
//   下の段は 日付 → 科目 → 内容 → 金額 の順。Enter で次の欄へ進み、金額で Enter を押すと入る。
//   入ったら、日付と科目はそのままで、内容と金額だけが空になり、日付の欄に戻る。キーボードだけで続けて入れられる。
//
// 確かめ:
//   まちがい（errors）は、欄の下にすべて出して、入れさせない。
//   知らせ（warnings: 年度の外の日付、残高がマイナスになる、など）は、内容を見せて「このまま入れる」を選べるようにする。

type FieldName = 'date' | 'categoryId' | 'toAccountId' | 'description' | 'amount' | 'receiptNo' | 'accountId' | 'kind'

const KIND_OPTIONS: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '収入' },
  { value: 'transfer', label: '移動' },
]

/** いくつかの中から1つを選ぶ、押しやすい札。名前が長くても折り返して並ぶ（置き場所の名前は、団体が自由に付けるため）。 */
function ChoiceChips<T extends string>({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: ReactNode
  options: { value: T; label: string }[]
  value: T | ''
  onChange: (value: T) => void
  error?: string
}) {
  const name = useId()
  const errorId = useId()
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-[0.94rem] font-bold leading-snug">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-[1.5px] px-3 py-1.5 text-[0.94rem] font-bold leading-tight transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              value === o.value ? 'border-rule-ink bg-rule-soft text-secondary-foreground' : 'border-input/70 bg-paper text-foreground hover:bg-muted',
            )}
          >
            {/* 本物のラジオボタン。選んだかどうかが、色だけでなく丸の形でもわかる */}
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="size-[1.1rem] shrink-0 accent-[var(--rule-ink)] outline-none" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[0.9rem] font-bold text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

const RECEIPT_HELP = '領収書やレシートに自分で書いた通し番号です。支出には、次の番号が自動で入ります。変えても、空にしてもかまいません。'

/** ラベルの行。説明つきの言葉（点線の下線）があってもなくても、同じ高さにして、入力欄の位置をそろえる。 */
const LABEL = 'flex min-h-[1.6rem] items-center'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-[0.88rem] font-bold leading-snug text-destructive">
      {message}
    </p>
  )
}

export function TransactionForm({
  editing,
  onSaved,
  onCancel,
  onDelete,
}: {
  /** 直す取引。渡さなければ、新しく入れるフォームになる */
  editing?: Transaction
  /** 入れた（直した）あとに呼ばれる。新しく入れたときは、その取引の id と、ひとことの文が来る */
  onSaved?: (transactionId: string, summary: string) => void
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { book, year, today, apply } = useWorkspace()
  const uid = useId()
  const cash = year.accounts[0]
  const firstBank = year.accounts.find((a) => a.kind === 'bank')
  const canTransfer = year.accounts.length >= 2

  const [kind, setKind] = useState<TransactionKind>(editing?.kind ?? 'expense')
  const [accountId, setAccountId] = useState(editing?.accountId ?? cash.id)
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? firstBank?.id ?? '')
  const [dateText, setDateText] = useState(() => {
    if (editing) return shortDate(editing.date, year)
    // 今日が年度の中なら、今日を入れておく。年度が終わったあとに入力するときは、空にして打ってもらう
    return isWithin(today, year.startDate, year.endDate) ? shortDate(today, year) : ''
  })
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [amountText, setAmountText] = useState(editing ? formatYen(editing.amount) : '')
  // 領収書の番号。自分で打つまでは、自動の番号（支出なら次の番号）を出しておく
  const [receiptText, setReceiptText] = useState(editing?.receiptNo ?? '')
  const [receiptAuto, setReceiptAuto] = useState(!editing)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ input: TransactionInput; warnings: Notice[] } | null>(null)
  // 種類ごとに、最後に選んだ科目を覚えておく（収入と支出を行き来しても、選び直さなくてよいように）
  const lastCategory = useRef<Partial<Record<TransactionKind, string>>>({})

  const dateRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const categories = year.categories.filter((c) => c.side === kind)
  const suggestions = useMemo(
    () => (kind !== 'transfer' && categoryId ? descriptionSuggestions(book, categoryId) : []),
    [book, kind, categoryId],
  )
  const receiptShown = receiptAuto ? defaultReceiptNo(year, kind) : receiptText

  // 知らせの枠が出たら、「このまま入れる」にフォーカスを移す（キーボードだけで先へ進めるように）
  useEffect(() => {
    if (pending) confirmRef.current?.focus()
  }, [pending])

  const changeKind = (next: TransactionKind) => {
    if (kind !== 'transfer') lastCategory.current[kind] = categoryId
    setKind(next)
    setCategoryId(next === 'transfer' ? '' : (lastCategory.current[next] ?? ''))
    if (next === 'transfer' && (toAccountId === '' || toAccountId === accountId)) {
      setToAccountId(year.accounts.find((a) => a.id !== accountId)?.id ?? '')
    }
    setErrors({})
    setPending(null)
  }

  const focusField = (field: FieldName) => {
    if (field === 'date') dateRef.current?.focus()
    else if (field === 'categoryId') categoryRef.current?.focus()
    else if (field === 'description') descriptionRef.current?.focus()
    else if (field === 'amount') amountRef.current?.focus()
    else if (field === 'receiptNo') receiptRef.current?.focus()
  }

  const save = (input: TransactionInput) => {
    if (editing) {
      const result = updateTransaction(book, year.id, editing.id, input)
      if (!apply(result, { quiet: true })) {
        setFormError(result.ok ? null : result.message)
        return
      }
      onSaved?.(editing.id, '直しました。')
      return
    }
    const result = addTransaction(book, year.id, input)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    apply(result)
    const added = result.value.years.find((y) => y.id === year.id)?.transactions.at(-1)
    const name = kind === 'transfer' ? '移動' : (categories.find((c) => c.id === input.categoryId)?.name ?? '')
    onSaved?.(added?.id ?? '', `${formatMonthDay(input.date)} ${name}${input.description ? `「${input.description}」` : ''} ${formatYen(input.amount)}円`)
    // 続けて入れられるように、内容と金額だけを空にして、日付の欄に戻る
    setDescription('')
    setAmountText('')
    setReceiptAuto(true)
    setReceiptText('')
    setErrors({})
    setFormError(null)
    setPending(null)
    requestAnimationFrame(() => {
      dateRef.current?.focus()
      dateRef.current?.select()
    })
  }

  const submit = () => {
    setFormError(null)
    const date = parseDateInput(dateText, year)
    const amount = parseYen(amountText)
    const input: TransactionInput = {
      date: date.ok ? date.value : '',
      kind,
      categoryId: kind === 'transfer' ? null : categoryId || null,
      description,
      // 読めなかったときは 0 を渡す（core が「金額のまちがい」として拾う。文は、下で parseYen のものに置きかえる）
      amount: amount.ok ? amount.value : 0,
      accountId,
      toAccountId: kind === 'transfer' ? toAccountId || null : null,
      receiptNo: receiptAuto ? undefined : receiptText,
    }
    const check = checkTransaction(book, year.id, input, { today, ignoreTransactionId: editing?.id })
    const next: Partial<Record<FieldName, string>> = {}
    for (const e of check.errors) {
      const field = (e.field ?? 'kind') as FieldName
      if (!next[field]) next[field] = e.message
    }
    // 文字が読めなかったときは、読めなかった理由のほうを出す（「小数は入れられません」など）
    if (!date.ok) next.date = date.message
    if (!amount.ok) next.amount = amount.message
    setErrors(next)
    const order: FieldName[] = ['date', 'categoryId', 'description', 'amount', 'receiptNo']
    const first = order.find((f) => next[f])
    if (Object.keys(next).length > 0) {
      setPending(null)
      if (first) focusField(first)
      if (next.kind) setFormError(next.kind)
      return
    }
    if (check.warnings.length > 0) {
      setPending({ input, warnings: check.warnings })
      return
    }
    save(input)
  }

  /** Enter で次の欄へ（日本語の変換を決める Enter では動かさない）。 */
  const onEnter = (next: () => void) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    next()
  }

  const accountOptions = year.accounts.map((a) => ({ value: a.id, label: a.name }))
  const id = (name: string) => `${uid}-${name}`
  const err = (name: FieldName) => (errors[name] ? id(`${name}-error`) : undefined)

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="grid gap-4"
    >
      {/* 上の段: 種類と、お金の置き場所。続けて入れるあいだ、選んだままになる */}
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[auto_1fr]">
        <div>
          <p className="mb-1.5 text-[0.94rem] font-bold leading-snug" id={id('kind-label')}>
            お金の動き
          </p>
          <SegmentedControl
            label="お金の動き"
            value={kind}
            onValueChange={changeKind}
            options={KIND_OPTIONS.map((o) => ({ ...o, disabled: o.value === 'transfer' && !canTransfer }))}
            className="w-full sm:w-auto sm:min-w-[17rem]"
          />
          {kind === 'transfer' && (
            <p className="mt-1.5 max-w-[24rem] text-[0.84rem] leading-snug text-muted-foreground">{explain('預け入れ・引き出し')}</p>
          )}
        </div>
        {kind === 'transfer' ? (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
            <ChoiceChips
              legend="どこから"
              options={accountOptions}
              value={accountId}
              onChange={(next) => {
                // 「どこへ」と同じ置き場所を選んだら、向きを入れかえる（預け入れ ⇔ 引き出し を、1回で切り替えられる）
                if (next === toAccountId) setToAccountId(accountId)
                setAccountId(next)
              }}
              error={errors.accountId}
            />
            <ArrowRight aria-hidden className="mt-[2.55rem] hidden size-5 shrink-0 text-muted-foreground sm:block" />
            <ChoiceChips legend="どこへ" options={accountOptions.filter((o) => o.value !== accountId)} value={toAccountId} onChange={setToAccountId} error={errors.toAccountId} />
          </div>
        ) : (
          <ChoiceChips
            legend={kind === 'income' ? 'どこに入りましたか（お金の置き場所）' : 'どこから払いましたか（お金の置き場所）'}
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
            error={errors.accountId}
          />
        )}
      </div>

      {/* 下の段: 日付 → 科目 → 内容 → 金額 の順 */}
      <div
        className={cn(
          'grid grid-cols-2 gap-x-3 gap-y-3',
          editing
            ? '' // 直すときはダイアログの中なので、いつも2列（日付・科目 ／ 内容 ／ 金額・領収書の番号）
            : // スマホ: 2列。タブレットと小さめのパソコン: 3列で2段。広いパソコン: 横1列
              kind === 'transfer'
              ? 'md:grid-cols-[10rem_13rem_minmax(0,1fr)] xl:grid-cols-[9.5rem_minmax(0,1fr)_11rem_7.5rem_auto]'
              : 'md:grid-cols-[10rem_13rem_minmax(0,1fr)] xl:grid-cols-[9.5rem_minmax(9rem,13rem)_minmax(0,1fr)_11rem_7.5rem_auto]',
        )}
      >
        <div className={cn(kind === 'transfer' && (editing ? 'col-span-2' : 'col-span-2 md:col-span-1'))}>
          <Label className={LABEL} htmlFor={id('date')}>日付</Label>
          <DateField
            ref={dateRef}
            id={id('date')}
            className="mt-1.5"
            text={dateText}
            onTextChange={setDateText}
            period={year}
            invalid={!!errors.date}
            describedBy={err('date')}
            onKeyDown={onEnter(() => (kind === 'transfer' ? descriptionRef.current?.focus() : categoryRef.current?.focus()))}
          />
          <FieldError id={id('date-error')} message={errors.date} />
        </div>

        {kind !== 'transfer' && (
          <div>
            <Label className={LABEL} htmlFor={id('category')}>
              <Hint tabbable={false} content={explain('科目')}>
                科目
              </Hint>
            </Label>
            <NativeSelect
              ref={categoryRef}
              id={id('category')}
              className="mt-1.5"
              value={categoryId}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={[id('category-help'), err('categoryId')].filter(Boolean).join(' ')}
              onChange={(e) => setCategoryId(e.target.value)}
              onKeyDown={onEnter(() => descriptionRef.current?.focus())}
            >
              <option value="">科目を選ぶ</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            {/* 点線の言葉の説明は Tab で止まらないので、同じ説明を、読み上げにはここから渡す */}
            <span id={id('category-help')} className="sr-only">
              {explain('科目')}
            </span>
            <FieldError id={id('categoryId-error')} message={errors.categoryId} />
          </div>
        )}

        <div className={cn('col-span-2', !editing && (kind === 'transfer' ? 'xl:col-span-1' : 'md:col-span-1'))}>
          <Label className={LABEL} htmlFor={id('description')}>
            内容（
            <Hint tabbable={false} content={explain('摘要')}>
              摘要
            </Hint>
            ）
          </Label>
          <Input
            ref={descriptionRef}
            id={id('description')}
            className="mt-1.5"
            value={description}
            maxLength={LIMITS.descriptionLength}
            list={suggestions.length > 0 ? id('suggestions') : undefined}
            autoComplete="off"
            enterKeyHint="next"
            placeholder={kind === 'transfer' ? '例: 会費を預け入れ' : '例: 夏祭りの飲み物'}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={[id('description-help'), err('description')].filter(Boolean).join(' ')}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={onEnter(() => {
              amountRef.current?.focus()
              amountRef.current?.select()
            })}
          />
          {suggestions.length > 0 && (
            <datalist id={id('suggestions')}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          <span id={id('description-help')} className="sr-only">
            {explain('摘要')}
          </span>
          <FieldError id={id('description-error')} message={errors.description} />
        </div>

        <div>
          <Label className={LABEL} htmlFor={id('amount')}>金額</Label>
          <div className="mt-1.5">
            <MoneyInput
              ref={amountRef}
              id={id('amount')}
              value={amountText}
              onValueChange={setAmountText}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={err('amount')}
              onKeyDown={onEnter(submit)}
            />
          </div>
          <FieldError id={id('amount-error')} message={errors.amount} />
        </div>

        <div>
          <Label className={LABEL} htmlFor={id('receipt')}>
            <Hint tabbable={false} content={RECEIPT_HELP}>
              領収書の番号
            </Hint>
          </Label>
          <Input
            ref={receiptRef}
            id={id('receipt')}
            className="num mt-1.5 text-center"
            value={receiptShown}
            maxLength={LIMITS.receiptNoLength}
            autoComplete="off"
            aria-invalid={errors.receiptNo ? true : undefined}
            aria-describedby={[id('receipt-help'), err('receiptNo')].filter(Boolean).join(' ')}
            onChange={(e) => {
              setReceiptAuto(false)
              setReceiptText(e.target.value)
            }}
            onKeyDown={onEnter(submit)}
          />
          <span id={id('receipt-help')} className="sr-only">
            {RECEIPT_HELP}
          </span>
          <FieldError id={id('receiptNo-error')} message={errors.receiptNo} />
        </div>

        {!editing && (
          <div className="col-span-2 flex items-start md:col-span-1 md:pt-[1.975rem]">
            <Button type="submit" className="w-full md:w-auto">
              <CornerDownLeft />
              入れる
            </Button>
          </div>
        )}
      </div>

      {formError && (
        <Alert variant="error" role="alert">
          {formError}
        </Alert>
      )}

      {pending && (
        <Alert variant="warn" role="alert">
          <AlertTitle>入れる前に、確かめてください</AlertTitle>
          <AlertDescription>
            <ul className="grid gap-1">
              {pending.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button ref={confirmRef} size="sm" onClick={() => save(pending.input)}>
                このまま{editing ? '保存する' : '入れる'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const field = pending.warnings.find((w) => w.field)?.field as FieldName | undefined
                  setPending(null)
                  focusField(field ?? 'date')
                }}
              >
                入力にもどって直す
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {editing && (
        <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="destructive" onClick={onDelete}>
            この取引を消す
          </Button>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <Button variant="ghost" onClick={onCancel}>
              やめる
            </Button>
            <Button type="submit">直した内容を保存する</Button>
          </div>
        </div>
      )}
    </form>
  )
}
