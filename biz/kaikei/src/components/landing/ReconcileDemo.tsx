import { useId, useMemo, useState } from 'react'
import { CircleAlert, Undo2 } from 'lucide-react'
import {
  bookBalanceAsOf,
  formatWareki,
  formatYen,
  parseYen,
  reconcileYear,
  removeTransaction,
  setReconciliation,
  type Book,
} from '@/core'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Seal } from '@/components/ui/seal'
import { Container, LedgerRule, Phrase, SectionHeading } from './Section'
import { RECON_ACCOUNT_NAME, RECON_DATE, RECON_DUPLICATE_ID, createReconcileDemoBook } from './demo'

// 残高の照合の見本。
// 道具の「残高の照合」の画面と同じ計算（src/core の setReconciliation と reconcileYear）を、そのまま動かす。
// 見本の帳簿には、わざと二重に入れた取引が1件ある。はじめから「合わない」状態を見せて、
// 「いくら違うか」と「考えられる原因」が出るところを、静的HTMLの段階でも読めるようにしてある。

export function ReconcileDemo() {
  const id = useId()
  const initial = useMemo(createReconcileDemoBook, [])
  const [book, setBook] = useState<Book>(initial)
  const year = book.years[0]
  const account = year.accounts.find((a) => a.name === RECON_ACCOUNT_NAME) ?? year.accounts[0]
  const row = reconcileYear(year).rows.find((r) => r.accountId === account.id)!
  const [actualText, setActualText] = useState(() => formatYen(row.actual ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [stamped, setStamped] = useState(false)

  const hasDuplicate = year.transactions.some((t) => t.id === RECON_DUPLICATE_ID)
  const bookBalance = bookBalanceAsOf(year, account.id, RECON_DATE)

  const check = () => {
    const actual = parseYen(actualText)
    if (!actual.ok) {
      setError(actual.message)
      return
    }
    const result = setReconciliation(book, year.id, account.id, { date: RECON_DATE, actual: actual.value })
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError(null)
    setStamped(true)
    setBook(result.value)
  }

  const removeDuplicate = () => {
    // 照合の記録（確かめた日と、通帳の残高）は、そのまま残る。取引を消したあとの帳簿で、もう一度くらべられる
    const result = removeTransaction(book, year.id, RECON_DUPLICATE_ID)
    if (!result.ok) return
    setError(null)
    setStamped(true)
    setBook(result.value)
  }

  const reset = () => {
    setBook(initial)
    setActualText(formatYen(reconcileYear(initial.years[0]).rows.find((r) => r.accountId === account.id)?.actual ?? 0))
    setError(null)
    setStamped(false)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="pb-16 sm:pb-24">
      <Container>
        <LedgerRule />
        <div className="grid gap-x-12 gap-y-8 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <div>
            <SectionHeading
              id={`${id}-title`}
              title={
                <>
                  <Phrase>通帳と合っているか、</Phrase>
                  <Phrase>確かめる欄があります。</Phrase>
                </>
              }
              lead="通帳の残高と、手元の現金を数えて入れると、帳簿の残高と照らし合わせます。合わないときは、いくら違うかと、考えられる原因を知らせます。"
            />
            <p className="mt-4 max-w-[38em] text-[0.94rem] leading-[1.85] text-muted-foreground">
              見本の帳簿には、防犯灯の電気代を、わざと二重に入れてあります。通帳の残高を書きかえて、試すこともできます。
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border border-t-[3px] border-t-rule bg-paper shadow-paper">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pb-1 pt-4 sm:px-6">
              <h3 className="text-xl">{account.name}</h3>
              <p className="flex items-center gap-2 text-[0.88rem] text-muted-foreground">
                <span className="rounded-sm border-2 border-shu px-1.5 py-0.5 font-serif text-[0.8rem] font-bold leading-none text-shu-ink">見本</span>
                {formatWareki(RECON_DATE)}に確かめた、として
              </p>
            </div>

            <form
              className="px-4 pb-4 sm:px-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                check()
              }}
            >
              <div className="mt-2 grid gap-x-4 gap-y-3 sm:grid-cols-2 sm:items-end">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-actual`}>通帳の残高</Label>
                  <div className="relative">
                    <Input
                      id={`${id}-actual`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={actualText}
                      onChange={(e) => setActualText(e.target.value)}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                      className="num pr-9 text-right text-[1.1rem]"
                    />
                    <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.9rem] text-muted-foreground">
                      円
                    </span>
                  </div>
                </div>
                <p className="flex items-baseline justify-between gap-3 border-b border-rule/40 pb-2.5 text-[0.94rem]">
                  <span>帳簿の残高</span>
                  <span className="num text-lg">{formatYen(bookBalance)} 円</span>
                </p>
              </div>
              {error && (
                <p id={`${id}-error`} role="alert" className="mt-2 text-[0.92rem] font-bold leading-snug text-destructive">
                  {error}
                </p>
              )}
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Button type="submit">照らし合わせる</Button>
                {book !== initial && (
                  <Button variant="ghost" onClick={reset}>
                    <Undo2 aria-hidden="true" />
                    もとに戻す
                  </Button>
                )}
              </div>
            </form>

            <div aria-live="polite" className="border-t border-rule/50 px-4 py-4 sm:px-6">
              {row.status === 'match' ? (
                <div className="flex items-center gap-4">
                  <Seal text="合" size={72} animate={stamped} title="合っています" />
                  <div>
                    <p className="font-serif text-lg font-bold leading-snug">{row.message}</p>
                    <p className="mt-1 text-[0.92rem] leading-[1.7] text-muted-foreground">
                      {formatWareki(RECON_DATE)}の時点で、帳簿も通帳も <span className="num font-bold text-foreground">{formatYen(row.actual ?? 0)} 円</span> です。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[auto_1fr] gap-x-3">
                  <CircleAlert className="mt-1 size-5 text-shu-ink" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-bold leading-snug">{row.message}</p>
                    <ul className="mt-2 grid gap-1.5 text-[0.92rem] leading-[1.75]">
                      {row.hints.map((hint) => (
                        <li key={hint} className="flex gap-2">
                          <span aria-hidden className="mt-[0.72em] size-1.5 shrink-0 bg-rule" />
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                    {hasDuplicate && (
                      <Button variant="soft" size="sm" className="mt-3" onClick={removeDuplicate}>
                        二重に入れた取引を消してみる
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
