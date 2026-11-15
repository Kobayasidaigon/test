import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { BookOpenText, CornerDownLeft, Undo2 } from 'lucide-react'
import {
  SAMPLE_NOTE,
  addTransaction,
  checkTransaction,
  formatYen,
  parseYen,
  summarizeYear,
  type Book,
  type Reports,
  type Result,
} from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { PaperFrame, SettlementPaper } from '@/components/papers'
import { Button } from '@/components/ui/button'
import { Input, Label, NativeSelect } from '@/components/ui/input'
import { Seal } from '@/components/ui/seal'
import { Container, Phrase } from './Section'
import { DEMO_TODAY, TRY_ACCOUNT_NAME, TRY_DATE, demoYearId } from './demo'

// LP のいちばん上。
// 21st.dev の Hero with Dashboard Mockup（felipemenezes098）をもとにした。
// もとのまま使っているところ: 左そろえの明朝の見出し → 説明 → ボタン、の順と、その横（下）に製品そのものを大きく置く組み立て。
// 変えたところ: 写真の背景と、作りものの画面（ダッシュボードの絵）をやめて、道具が作る本物の収支決算書（src/components/papers）を置いた。
// 出てくるときの、ぼかしの動き（motion）は外した。かわりに「1件入れると、決算書が変わる」を、本物のロジック（src/core）で動かす。

type Props = {
  /** いまの見本の帳簿（「ためしに1件」で変わる） */
  book: Book
  /** 何も足していない、もとの見本の帳簿 */
  base: Book
  reports: Reports
  onBookChange: (book: Book) => void
}

export function Hero({ book, base, reports, onBookChange }: Props) {
  const pro = site.pricing.pro
  const paperRef = useRef<HTMLDivElement>(null)
  return (
    <section className="overflow-x-clip pb-14 pt-9 sm:pb-20 sm:pt-12">
      {/* 並び: スマホでは「見出し → 決算書の見本 → ためしに1件」。パソコンでは、左に見出しと「ためしに1件」、右に決算書の見本 */}
      <Container className="grid gap-x-10 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] xl:gap-x-14">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <h1 className="text-[2.15rem] font-extrabold leading-[1.4] tracking-[0.04em] sm:text-[3rem] lg:text-[2.6rem] xl:text-[3.3rem]">
            <Phrase>会計係になった、</Phrase>
            <Phrase>あなたへ。</Phrase>
          </h1>
          <p className="mt-5 max-w-[30em] text-[1.16rem] leading-[1.9] sm:text-[1.24rem]">
            収入と支出を入れるだけで、総会の資料がそろいます。次の担当の方には、ファイルを1つ渡すだけです。
          </p>
          <p className="mt-3 max-w-[36em] leading-[1.9] text-muted-foreground">
            町内会・自治会、子ども会、PTA、サークルなど、係が毎年かわる小さな団体のための、会計の道具です。登録はいりません。
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="max-sm:w-full">
              <Link to="/app">無料で始める</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="max-sm:w-full">
              <Link to="/app#sample">
                <BookOpenText aria-hidden="true" />
                サンプルを見る
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-[0.9rem] leading-[1.8] text-muted-foreground">
            {site.pricing.summary}
            {pro.taxIncluded && '（税込）'}
          </p>
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <p className="flex items-start gap-2.5 text-[0.9rem] leading-[1.7] text-muted-foreground">
            <span className="mt-0.5 shrink-0 rounded-sm border-2 border-shu px-1.5 py-0.5 font-serif text-[0.84rem] font-bold leading-none text-shu-ink">見本</span>
            <span>
              「{book.orgName}」の{reports.settlement.title}。{SAMPLE_NOTE}
            </span>
          </p>
          <div ref={paperRef} className="lp-sheet relative mt-3">
            <PaperFrame>
              <SettlementPaper report={reports.settlement} today={DEMO_TODAY} />
            </PaperFrame>
            {/* 紙の右上に押した「見本」のはんこ（紙の中の字には、かからない位置） */}
            <Seal text="見本" className="pointer-events-none absolute -right-2 -top-4 size-[3.6rem] sm:-right-3 sm:-top-6 sm:size-[5.6rem] lg:-right-5" />
          </div>
          <p className="mt-3 text-[0.9rem] leading-[1.7] text-muted-foreground">道具が作る、そのままの形です。A4 の紙に、たて向きで印刷できます。</p>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <TryCard book={book} base={base} onBookChange={onBookChange} paperRef={paperRef} />
        </div>
      </Container>
    </section>
  )
}

/** 「ためしに、支出を1件入れてみてください」。入れると、横の決算書が、その場で変わる。 */
function TryCard({ book, base, onBookChange, paperRef }: Pick<Props, 'book' | 'base' | 'onBookChange'> & { paperRef: RefObject<HTMLDivElement> }) {
  const id = useId()
  const yearId = demoYearId(book)
  const year = book.years[0]
  const expenseCategories = year.categories.filter((c) => c.side === 'expense')
  const account = year.accounts.find((a) => a.name === TRY_ACCOUNT_NAME) ?? year.accounts[0]

  const [categoryId, setCategoryId] = useState(() => (expenseCategories.find((c) => c.name === '防災・防犯費') ?? expenseCategories[0]).id)
  const [description, setDescription] = useState('消火器の入れかえ')
  const [amountText, setAmountText] = useState('8,800')
  const [errors, setErrors] = useState<{ amount?: string; description?: string; other?: string }>({})
  // 入れたあとで、決算書のどの行が変わったかを知らせるための覚え（科目の名前）
  const [flash, setFlash] = useState<{ name: string; n: number } | null>(null)

  const added = year.transactions.length - base.years[0].transactions.length
  const before = summarizeYear(base.years[0], base.diffStyle)
  const now = summarizeYear(year, book.diffStyle)
  // 入れる前と変わった科目（支出の部）
  const changed = now.expense.filter((row) => before.expense.find((b) => b.categoryId === row.categoryId)?.actual !== row.actual)

  const submit = () => {
    const amount = parseYen(amountText)
    if (!amount.ok) {
      setErrors({ amount: amount.message })
      return
    }
    const input = { date: TRY_DATE, kind: 'expense' as const, categoryId, accountId: account.id, amount: amount.value, description }
    // 道具の画面と同じ確かめ（src/core の checkTransaction）を通す
    const check = checkTransaction(book, yearId, input, { today: DEMO_TODAY })
    if (check.errors.length > 0) {
      const next: typeof errors = {}
      for (const e of check.errors) {
        if (e.field === 'amount') next.amount = e.message
        else if (e.field === 'description') next.description = e.message
        else next.other = e.message
      }
      setErrors(next)
      return
    }
    // 残高がマイナスになる金額は、道具では「知らせたうえで入れられる」。見本では、決算書がおかしな数字にならないよう、入れずに知らせるだけにする
    const negative = check.warnings.find((w) => w.code === 'negative-balance')
    if (negative) {
      setErrors({ amount: `${negative.message}（見本では、入れずにおきます）` })
      return
    }
    const result: Result<Book> = addTransaction(book, yearId, input, () => `lp-try-${added + 1}`)
    if (!result.ok) {
      setErrors({ other: result.message })
      return
    }
    setErrors({})
    const name = expenseCategories.find((c) => c.id === categoryId)?.name ?? ''
    setFlash((f) => ({ name, n: (f?.n ?? 0) + 1 }))
    onBookChange(result.value)
  }

  // 変わった行を、決算書の上で、少しのあいだ色で知らせる（紙の部品には手を入れず、描いたあとの行に印を付ける）
  useEffect(() => {
    const root = paperRef.current
    if (!flash || !root) return
    const targets: Element[] = []
    root.querySelectorAll('.paper-table tbody tr').forEach((tr) => {
      if (tr.firstElementChild?.textContent === flash.name) targets.push(tr)
    })
    const result = root.querySelector('.paper-result')
    if (result) targets.push(result)
    targets.forEach((el) => {
      el.classList.remove('row-flash')
      // いちど描き直させて、色の動きを最初からやり直す
      void (el as HTMLElement).offsetWidth
      el.classList.add('row-flash')
    })
  }, [flash, paperRef])

  const reset = () => {
    setErrors({})
    setFlash(null)
    onBookChange(base)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border border-t-[3px] border-t-shu bg-paper shadow-paper">
      <form
        className="px-4 pb-4 pt-4 sm:px-6 sm:pt-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h2 id={`${id}-title`} className="text-[1.2rem] leading-snug">
          <Phrase>ためしに、支出を1件</Phrase>
          <Phrase>入れてみてください</Phrase>
        </h2>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${id}-category`}>科目</Label>
            <NativeSelect id={`${id}-category`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${id}-amount`}>金額</Label>
            <div className="relative">
              <Input
                id={`${id}-amount`}
                inputMode="numeric"
                autoComplete="off"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
                className="num pr-9 text-right text-[1.1rem]"
              />
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.9rem] text-muted-foreground">
                円
              </span>
            </div>
          </div>
          <div className="grid content-start gap-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-description`}>内容</Label>
            <Input
              id={`${id}-description`}
              value={description}
              maxLength={100}
              autoComplete="off"
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? `${id}-description-error` : undefined}
            />
          </div>
        </div>

        {(errors.amount || errors.description || errors.other) && (
          <div role="alert" className="mt-2.5 grid gap-1 text-[0.92rem] font-bold leading-snug text-destructive">
            {errors.amount && <p id={`${id}-amount-error`}>{errors.amount}</p>}
            {errors.description && <p id={`${id}-description-error`}>{errors.description}</p>}
            {errors.other && <p>{errors.other}</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit">
            <CornerDownLeft aria-hidden="true" />
            入れる
          </Button>
          {added > 0 && (
            <Button variant="ghost" onClick={reset}>
              <Undo2 aria-hidden="true" />
              もとに戻す
            </Button>
          )}
        </div>
      </form>

      <div aria-live="polite" className="border-t border-rule/50 bg-rule-soft/45 px-4 py-3.5 sm:px-6">
        {added === 0 ? (
          <p className="text-[0.92rem] leading-[1.75]">
            「入れる」を押すと、決算書の見本の数字が変わります。{account.name}から払ったことにして入れます。ここで入れたものは、どこにも保存されません。
          </p>
        ) : (
          <>
            <p className="font-bold leading-snug">
              {added}件 入れました。決算書の見本も、同じ数字に変わっています。
            </p>
            <table className="mt-2 w-full text-[0.92rem]">
              <thead>
                <tr className="text-[0.82rem] text-muted-foreground">
                  <td />
                  <th scope="col" className="pb-0.5 pl-3 text-right font-normal">
                    入れる前
                  </th>
                  <th scope="col" className="pb-0.5 pl-3 text-right font-normal">
                    いま
                  </th>
                </tr>
              </thead>
              <tbody>
                {changed.map((row) => (
                  <ChangeRow key={row.categoryId} label={`${row.name}の決算額`} before={before.expense.find((b) => b.categoryId === row.categoryId)?.actual ?? 0} after={row.actual} />
                ))}
                <ChangeRow label="支出合計" before={before.expenseTotal} after={now.expenseTotal} />
                <ChangeRow label="次年度繰越金" before={before.carryover} after={now.carryover} strong />
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  )
}

function ChangeRow({ label, before, after, strong = false }: { label: string; before: number; after: number; strong?: boolean }) {
  return (
    <tr className="border-t border-rule/40">
      <th scope="row" className="py-1 text-left font-normal leading-snug">
        {label}
      </th>
      <td className="num py-1 pl-3 text-right text-muted-foreground">{formatYen(before)}</td>
      <td className={`num py-1 pl-3 text-right ${strong ? 'text-[1.05rem] font-bold' : 'font-bold'}`}>{formatYen(after)}</td>
    </tr>
  )
}
