import { useEffect, useState } from 'react'
import { Calculator } from 'lucide-react'
import {
  bookBalanceAsOf,
  dateFromLocal,
  explain,
  formatWareki,
  formatYen,
  isWithin,
  parseDateInput,
  parseYen,
  reconcileYear,
  setReconciliation,
  type ReconcileRow,
} from '@/core'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Seal } from '@/components/ui/seal'
import { DateField, MoneyInput, shortDate } from './fields'
import { useWorkspace } from './store'

// ③ 残高の照合。
// 置き場所ごとに、「確かめた日」と「実際の残高（通帳の残高、数えた現金）」を入れると、
// その日までの帳簿の残高と照らし合わせる。合えば朱の「合」のはんこ。合わなければ、いくら違うかと、考えられる原因を出す。

/** お札と硬貨の枚数から、現金の合計を出す小さな道具。 */
const DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1] as const

function CashCounter({ onUse }: { onUse: (total: number) => void }) {
  const [counts, setCounts] = useState<Record<number, string>>({})
  const total = DENOMINATIONS.reduce((sum, d) => {
    const n = Number((counts[d] ?? '').normalize('NFKC'))
    return sum + (Number.isInteger(n) && n > 0 && n < 100_000 ? n * d : 0)
  }, 0)
  return (
    <div className="mt-3 rounded-lg border border-rule/50 bg-rule-soft/40 p-3">
      <p className="text-[0.9rem] font-bold">お札と硬貨の枚数を入れると、合計を出します</p>
      {/* 列の数は、枠の幅に合わせて決める（1列を 9.5rem より細くしない）。
          決まった数の列にすると、パソコンの2列組みの中で、枚数の欄が字も見えないほど細くなるため */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
        {DENOMINATIONS.map((d) => (
          <label key={d} className="flex items-center gap-1.5 text-[0.9rem]">
            <span className="num w-[4.2rem] shrink-0 text-right">{formatYen(d)}円</span>
            <span aria-hidden>×</span>
            <Input
              inputMode="numeric"
              aria-label={`${formatYen(d)}円の枚数`}
              value={counts[d] ?? ''}
              onChange={(e) => setCounts((c) => ({ ...c, [d]: e.target.value.replace(/[^0-9０-９]/g, '').slice(0, 5) }))}
              className="num h-11 min-w-0 px-2 text-right"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p>
          合計 <span className="num text-lg font-bold">{formatYen(total)}</span> 円
        </p>
        <Button variant="secondary" size="sm" onClick={() => onUse(total)}>
          この金額を使う
        </Button>
      </div>
    </div>
  )
}

function ReconcileCard({ row }: { row: ReconcileRow }) {
  // 照合の記録は、帳簿の数字を変えない「確かめた記録」なので、繰り越したあとの前の年度でも入れられる
  // （年度末の照合は、年度が終わったあとの監査ですることがある）
  const { book, year, today, apply } = useWorkspace()
  const period = year
  // 確かめた日の初期値: 記録があればその日。なければ、今日（年度の中なら）か、年度の終わりの日
  const initialDate = row.date ?? (isWithin(today, year.startDate, year.endDate) ? today : year.endDate)
  const [dateText, setDateText] = useState(shortDate(initialDate, period))
  const [actualText, setActualText] = useState(row.actual === null ? '' : formatYen(row.actual))
  const [errors, setErrors] = useState<{ date?: string; actual?: string }>({})
  const [counter, setCounter] = useState(false)
  const [justStamped, setJustStamped] = useState(false)

  // 年度を切り替えたとき・記録が消えたときは、入力欄を記録に合わせる
  useEffect(() => {
    setDateText(shortDate(row.date ?? initialDate, period))
    setActualText(row.actual === null ? '' : formatYen(row.actual))
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.date, row.actual, year.id])

  const parsedDate = parseDateInput(dateText, period)
  // 入力の途中でも、その日までの帳簿の残高を見せる
  const bookBalance = parsedDate.ok ? bookBalanceAsOf(year, row.accountId, parsedDate.value) : row.bookBalance
  const word = row.kind === 'cash' ? '数えた現金' : '通帳の残高'

  const check = () => {
    const next: { date?: string; actual?: string } = {}
    const actual = parseYen(actualText)
    if (!parsedDate.ok) next.date = parsedDate.message
    if (!actual.ok) next.actual = actual.message
    if (parsedDate.ok) {
      // 「今日」は、押したときの日付で見る（画面を開いたまま日付が変わっても、今日の日付を断らないように）
      const now = dateFromLocal(new Date())
      if (parsedDate.value > now) {
        // 先の日付の残高は、まだ数えられない。年を打ちまちがえたまま「合っています」と記録しないように断る
        next.date = '今日より先の日付です。数えた日（今日か、それより前の日）を入れてください。'
      } else if (parsedDate.value < year.startDate) {
        next.date = `この年度が始まる日（${formatWareki(year.startDate)}）より前の日付です。年を確かめてください。`
      }
    }
    setErrors(next)
    if (next.date || !parsedDate.ok || !actual.ok) return
    const result = setReconciliation(book, year.id, row.accountId, { date: parsedDate.value, actual: actual.value })
    if (apply(result)) setJustStamped(true)
  }

  const id = `rec-${row.accountId}`
  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border border-t-[3px] border-t-rule bg-paper shadow-lift">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pb-2 pt-4 sm:px-6">
        <h2 id={`${id}-title`} className="text-xl">
          {row.name}
        </h2>
        <p className="text-[0.9rem] text-muted-foreground">
          {row.kind === 'cash' ? '手元の現金を数えて、帳簿とくらべます。' : '通帳を記帳して、残高を帳簿とくらべます。'}
        </p>
      </header>

      <div className="grid gap-5 px-4 pb-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-date`}>確かめた日</Label>
              <DateField
                id={`${id}-date`}
                className="mt-1.5"
                text={dateText}
                onTextChange={setDateText}
                period={period}
                invalid={!!errors.date}
                describedBy={errors.date ? `${id}-date-error` : undefined}
              />
              {errors.date && (
                <p id={`${id}-date-error`} role="alert" className="text-[0.88rem] font-bold text-destructive">
                  {errors.date}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor={`${id}-actual`}>{word}</Label>
              <div className="mt-1.5">
                <MoneyInput
                  id={`${id}-actual`}
                  value={actualText}
                  onValueChange={setActualText}
                  aria-invalid={errors.actual ? true : undefined}
                  aria-describedby={errors.actual ? `${id}-actual-error` : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      check()
                    }
                  }}
                />
              </div>
              {errors.actual && (
                <p id={`${id}-actual-error`} role="alert" className="mt-1 text-[0.88rem] font-bold text-destructive">
                  {errors.actual}
                </p>
              )}
            </div>
          </div>

          <p className="mt-1 flex items-baseline justify-between gap-3 border-b border-rule/40 pb-2 text-[0.94rem]">
            <span>
              帳簿の残高
              <span className="ml-1 text-[0.84rem] text-muted-foreground">{parsedDate.ok ? `（${formatWareki(parsedDate.value)}まで）` : ''}</span>
            </span>
            <span className={cn('num text-lg', bookBalance < 0 && 'font-bold text-destructive')}>{formatYen(bookBalance)} 円</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={check}>照らし合わせる</Button>
            {row.kind === 'cash' && (
              <Button variant="soft" onClick={() => setCounter((v) => !v)} aria-expanded={counter}>
                <Calculator />
                枚数から計算する
              </Button>
            )}
            {row.status !== 'unchecked' && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (apply(setReconciliation(book, year.id, row.accountId, null))) setJustStamped(false)
                }}
              >
                記録を消す
              </Button>
            )}
          </div>
          {counter && (
            <CashCounter
              onUse={(total) => {
                setActualText(formatYen(total))
                setCounter(false)
              }}
            />
          )}
        </div>

        {/* 結果 */}
        <div aria-live="polite">
          {row.status === 'unchecked' && (
            <div className="flex h-full min-h-28 items-center justify-center rounded-lg border border-dashed border-input/60 bg-background/50 px-4 py-5 text-center text-[0.94rem] leading-relaxed text-muted-foreground">
              まだ照らし合わせていません。
              <br />
              確かめた日と、{word}を入れてください。
            </div>
          )}
          {row.status === 'match' && (
            <div className="flex h-full items-center gap-4 rounded-lg border border-rule/50 bg-rule-soft/40 px-4 py-4">
              <Seal text="合" size={76} animate={justStamped} title="合っています" />
              <div>
                <p className="font-serif text-lg font-bold leading-snug">{row.message}</p>
                <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {row.date && formatWareki(row.date)}の時点で、帳簿も{row.kind === 'cash' ? '現金' : '通帳'}も{' '}
                  <span className="num font-bold text-foreground">{formatYen(row.actual ?? 0)} 円</span> です。
                </p>
              </div>
            </div>
          )}
          {(row.status === 'over' || row.status === 'short') && (
            <Alert variant="error" role="alert" className="h-full content-start">
              <AlertTitle className="text-lg">{row.message}</AlertTitle>
              <AlertDescription>
                <p className="text-[0.9rem] text-muted-foreground">
                  {row.date && formatWareki(row.date)}の時点で、帳簿は <span className="num">{formatYen(row.bookBalance)}</span> 円、
                  {row.kind === 'cash' ? '現金' : '通帳'}は <span className="num">{formatYen(row.actual ?? 0)}</span> 円です。
                </p>
                {row.hints.length > 0 && (
                  <>
                    <p className="mt-2 font-bold">考えられること</p>
                    <ul className="mt-1 grid gap-1.5">
                      {row.hints.map((h, i) => (
                        <li key={i} className="flex gap-2">
                          <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 bg-shu" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </section>
  )
}

export function ReconcileScreen() {
  const { year, locked } = useWorkspace()
  const result = reconcileYear(year)
  const total = result.rows.length
  const matched = total - result.uncheckedCount - result.mismatchCount
  return (
    <div className="grid grid-cols-1 gap-6">
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-paper px-4 py-4 shadow-lift sm:px-6">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="text-xl">残高の照合</h2>
          <p className="mt-1 text-[0.94rem] leading-relaxed text-muted-foreground">{explain('残高の照合')}月に1度と、年度の終わりにしておくと、まちがいに早く気づけます。</p>
        </div>
        <p className="shrink-0 rounded-lg border border-rule/50 bg-rule-soft/50 px-4 py-2 text-center leading-snug" role="status">
          <span className="block text-[0.84rem] text-muted-foreground">合っている置き場所</span>
          <span className="num text-2xl font-bold">{matched}</span>
          <span className="mx-1 text-muted-foreground">/</span>
          <span className="num text-lg">{total}</span>
          {result.mismatchCount > 0 && <span className="mt-0.5 block text-[0.84rem] font-bold text-destructive">合っていない: {result.mismatchCount}</span>}
        </p>
      </section>
      {locked && (
        <Alert variant="info">
          「{year.label}」は、繰り越したあとの年度です。取引は読むだけですが、照合の記録は、いまも入れられます。合わなかった分の直しは、いまの年度の取引として入れてください。
        </Alert>
      )}
      {result.rows.map((row) => (
        <ReconcileCard key={`${year.id}-${row.accountId}`} row={row} />
      ))}
    </div>
  )
}
