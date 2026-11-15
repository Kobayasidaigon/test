import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  FORMAT_NOTE,
  LIMITS,
  addBankAccount,
  addCategory,
  categoryUseCount,
  explain,
  formatWareki,
  formatYen,
  moveCategory,
  parseYen,
  previousYear,
  removeAccount,
  removeCategory,
  updateAccount,
  updateCategory,
  updateYear,
  type CategoryTotal,
  type Side,
} from '@/core'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Hint } from '@/components/ui/hint'
import { Field, Input } from '@/components/ui/input'
import { CommitMoney, CommitText, MoneyInput } from './fields'
import { useWorkspace } from './store'

// ② 科目と予算。
// 上に「お金の置き場所と、年度はじめの残高」、下に「収入の部」「支出の部」の科目。
// 名前・予算額・説明は、その場で書きかえられる（入力欄から離れたときに反映する）。
// 行は、パソコンでは横1列、スマホでは2段に折りたたんで出す（同じ部品を、CSS の並べ方だけ変えている）。

const SIDE_LABEL: Record<Side, string> = { income: '収入の部', expense: '支出の部' }

function SectionCard({ title, lead, children, accent }: { title: React.ReactNode; lead?: React.ReactNode; children: React.ReactNode; accent?: 'income' | 'expense' }) {
  return (
    <section className={cn('rounded-xl border border-border border-t-[3px] bg-paper shadow-lift', accent === 'expense' ? 'border-t-shu' : 'border-t-rule')}>
      <header className="px-4 pb-3 pt-4 sm:px-6">
        <h2 className="text-xl">{title}</h2>
        {lead && <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">{lead}</p>}
      </header>
      {children}
    </section>
  )
}

/** 置き場所（現金、口座）の一覧。 */
function AccountsSection() {
  const { book, year, locked, summary, apply } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [opening, setOpening] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  // 2年目からは、年度はじめの残高は、前の年度から繰り越した金額に決まっている
  const carried = previousYear(book, year.id) !== undefined
  const bankCount = year.accounts.filter((a) => a.kind === 'bank').length
  const removingAccount = year.accounts.find((a) => a.id === removing)

  const add = () => {
    const parsed = parseYen(opening.trim() === '' ? '0' : opening)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    const result = addBankAccount(book, year.id, { name, openingBalance: carried ? 0 : parsed.value })
    if (!apply(result, { quiet: true, done: '口座を足しました。' })) {
      setError(result.ok ? null : result.message)
      return
    }
    setAdding(false)
    setName('')
    setOpening('0')
    setError(null)
  }

  return (
    <SectionCard
      title="お金の置き場所と、年度はじめの残高"
      lead={
        carried
          ? `年度はじめ（${formatWareki(year.startDate)}）の残高は、前の年度から繰り越した金額です。合計が、決算書の「前年度繰越金」になります。`
          : `年度はじめ（${formatWareki(year.startDate)}）に、どこにいくらあったかを入れます。合計が、決算書の「前年度繰越金」になります。`
      }
    >
      <div className="border-t border-rule/40">
        <div className="hidden grid-cols-[minmax(0,1fr)_11rem_11rem] gap-3 border-b-[3px] border-double border-rule px-6 py-2 text-[0.86rem] font-bold text-rule-ink md:grid">
          <span>名前</span>
          <span className="text-right">年度はじめの残高（円）</span>
          <span className="text-right">いまの残高（円）</span>
        </div>
        <ul>
          {year.accounts.map((a) => {
            const balance = summary.accounts.find((b) => b.accountId === a.id)
            return (
              <li key={a.id} className="grid gap-x-3 gap-y-1.5 border-b border-rule/35 px-4 py-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_11rem_11rem] md:items-center">
                <div className="flex items-start gap-1.5">
                  {a.kind === 'cash' ? (
                    <p className="flex min-h-11 flex-1 items-center font-bold">
                      {a.name}
                      <span className="ml-2 text-[0.84rem] font-normal text-muted-foreground">（手元のお金）</span>
                    </p>
                  ) : (
                    <CommitText
                      className="min-w-0 flex-1"
                      label={`口座の名前（いまは「${a.name}」）`}
                      value={a.name}
                      maxLength={LIMITS.nameLength}
                      disabled={locked}
                      inputClassName="font-bold"
                      onCommit={(v) => {
                        const r = updateAccount(book, year.id, a.id, { name: v })
                        return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
                      }}
                    />
                  )}
                  {a.kind === 'bank' && !locked && (
                    <Button variant="ghost" size="icon" aria-label={`口座「${a.name}」を消す`} onClick={() => setRemoving(a.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-[0.84rem] text-muted-foreground md:hidden">年度はじめの残高</span>
                  {carried || locked ? (
                    <p className="num md:flex md:min-h-11 md:items-center md:justify-end md:px-2.5">
                      {formatYen(a.openingBalance)}
                      <span className="ml-1 text-[0.84rem] md:hidden">円</span>
                    </p>
                  ) : (
                    <CommitMoney
                      className="w-[9.5rem] md:w-auto"
                      label={`${a.name}の、年度はじめの残高`}
                      value={a.openingBalance}
                      onCommit={(v) => {
                        const r = updateAccount(book, year.id, a.id, { openingBalance: v ?? 0 })
                        return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-[0.84rem] text-muted-foreground md:hidden">いまの残高</span>
                  <p className={cn('num md:flex md:min-h-11 md:items-center md:justify-end md:px-2.5', (balance?.closing ?? 0) < 0 && 'font-bold text-destructive')}>
                    {formatYen(balance?.closing ?? 0)}
                    <span className="ml-1 text-[0.84rem] md:hidden">円</span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-rule-soft/50 px-4 py-3 sm:px-6">
          <p className="font-bold">
            <Hint content={explain('前年度繰越金')}>前年度繰越金</Hint>（年度はじめの残高の合計）
          </p>
          <p className="num text-xl font-bold">{formatYen(summary.openingTotal)} 円</p>
        </div>
        {!locked && (
          <div className="px-4 py-3 sm:px-6">
            {adding ? (
              <div className="grid gap-3 rounded-lg border border-rule/50 bg-rule-soft/40 p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-start">
                <Field label="足す口座の名前" error={error}>
                  {(p) => <Input {...p} value={name} maxLength={LIMITS.nameLength} placeholder="例: ゆうちょ、定期預金" autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()} />}
                </Field>
                {carried ? (
                  <p className="self-end pb-2 text-[0.86rem] leading-snug text-muted-foreground">残高は 0円 から始まります。お金を移した日に「移動」として入れてください。</p>
                ) : (
                  <Field label="年度はじめの残高">{(p) => <MoneyInput {...p} value={opening} onValueChange={setOpening} onFocus={(e) => e.target.select()} />}</Field>
                )}
                <div className="flex gap-2 sm:mt-[1.65rem]">
                  <Button variant="secondary" onClick={add}>
                    足す
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAdding(false)
                      setError(null)
                    }}
                  >
                    やめる
                  </Button>
                </div>
              </div>
            ) : bankCount < LIMITS.maxBankAccounts ? (
              <Button variant="soft" size="sm" onClick={() => setAdding(true)}>
                <Plus />
                預金口座を足す
              </Button>
            ) : (
              <p className="text-[0.86rem] text-muted-foreground">預金口座は {LIMITS.maxBankAccounts}つまでです。</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>口座「{removingAccount?.name}」を消しますか</DialogTitle>
            <DialogDescription>取引で使われている口座と、残高のある口座は、消せません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              消さない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removing) apply(removeAccount(book, year.id, removing), { done: '口座を消しました。' })
                setRemoving(null)
              }}
            >
              消す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

// 科目の1行の並べ方。
//   パソコン: 並び順 | 名前 | 予算額 | 決算額 | 説明 | 消す の横1列
//   スマホ:   1段め 名前・予算額 ／ 2段め 説明 ／ 3段め 決算額・並び順・消す（order で順番だけ入れかえる）
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[5.6rem_minmax(0,1.1fr)_9.5rem_8rem_minmax(0,1.3fr)_3rem]'

function CategoryRow({ row, index, count }: { row: CategoryTotal; index: number; count: number }) {
  const { book, year, locked, apply } = useWorkspace()
  // 消す前の確かめ。予算額・説明の文・次年度の予算案が入っている科目は、1回押しただけで消さない
  // （元に戻すはたらきがないので、入れた金額と文が、一緒になくなるため）。名前だけの科目は、すぐ消す（足し直せる）
  const [confirming, setConfirming] = useState(false)
  const hasNextBudget = Object.prototype.hasOwnProperty.call(year.nextBudget, row.categoryId)
  const filled = row.budget !== 0 || row.note !== '' || hasNextBudget
  const remove = () => apply(removeCategory(book, year.id, row.categoryId), { done: `科目「${row.name}」を消しました。` })
  const commit = (patch: { name?: string; budget?: number; note?: string }) => {
    const r = updateCategory(book, year.id, row.categoryId, patch)
    return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
  }
  return (
    <li className={cn('items-start gap-x-2 gap-y-2 border-b border-rule/35 px-4 py-3 sm:px-6 md:items-center md:gap-x-3', ROW_GRID)}>
      <div className="order-5 flex gap-0.5 md:order-none">
        <Button
          variant="ghost"
          size="icon"
          disabled={locked || index === 0}
          aria-label={`「${row.name}」を1つ上へ`}
          onClick={() => apply(moveCategory(book, year.id, row.categoryId, 'up'))}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={locked || index === count - 1}
          aria-label={`「${row.name}」を1つ下へ`}
          onClick={() => apply(moveCategory(book, year.id, row.categoryId, 'down'))}
        >
          <ArrowDown />
        </Button>
      </div>
      <div className="order-1 grid gap-0.5 md:order-none">
        <span className="text-[0.8rem] text-muted-foreground md:hidden">科目の名前</span>
        <CommitText label={`科目の名前（いまは「${row.name}」）`} value={row.name} maxLength={LIMITS.nameLength} disabled={locked} onCommit={(v) => commit({ name: v })} inputClassName="font-bold" />
      </div>
      <div className="order-2 col-span-2 grid w-[8.6rem] gap-0.5 md:order-none md:col-span-1 md:w-auto">
        <span className="text-[0.8rem] text-muted-foreground md:hidden">予算額（円）</span>
        <CommitMoney label={`「${row.name}」の予算額`} value={row.budget} disabled={locked} onCommit={(v) => commit({ budget: v ?? 0 })} />
      </div>
      <div className="order-4 flex min-h-11 items-center gap-2 self-center md:order-none md:block md:min-h-0 md:text-right">
        <span className="text-[0.8rem] leading-tight text-muted-foreground md:hidden">いままでの決算額</span>
        <p className="num md:px-2.5">
          {formatYen(row.actual)}
          <span className="ml-1 text-[0.84rem] md:hidden">円</span>
        </p>
      </div>
      <div className="order-3 col-span-3 md:order-none md:col-span-1">
        <CommitText
          label={`「${row.name}」の、決算書の説明`}
          value={row.note}
          maxLength={LIMITS.noteLength}
          disabled={locked}
          placeholder="決算書の「説明」に書く文（なくてもよい）"
          onCommit={(v) => commit({ note: v })}
          inputClassName="text-[0.94rem]"
        />
      </div>
      <div className="order-6 flex justify-end md:order-none">
        {!locked && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`科目「${row.name}」を消す`}
            onClick={() => {
              // 取引で使われている科目は、どのみち消せない。確かめを出さずに、消せない理由を知らせる
              if (filled && categoryUseCount(year, row.categoryId) === 0) setConfirming(true)
              else remove()
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>科目「{row.name}」を消しますか</DialogTitle>
            <DialogDescription>
              この科目に入れた
              {[row.budget !== 0 && `予算額（${formatYen(row.budget)}円）`, row.note !== '' && '決算書の説明の文', hasNextBudget && '次年度の予算案'].filter(Boolean).join('・')}
              も、一緒に消えます。元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              消さない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false)
                remove()
              }}
            >
              消す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

function CategorySection({ side }: { side: Side }) {
  const { book, year, locked, summary, apply } = useWorkspace()
  const rows = side === 'income' ? summary.income : summary.expense
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [error, setError] = useState<string | null>(null)
  const budgetTotal = side === 'income' ? summary.carryoverBudget + summary.incomeBudgetTotal : summary.expenseBudgetTotal
  const actualTotal = side === 'income' ? summary.openingTotal + summary.incomeTotal : summary.expenseTotal

  const add = () => {
    const parsed = parseYen(budget.trim() === '' ? '0' : budget)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    const result = addCategory(book, year.id, { side, name, budget: parsed.value })
    if (!apply(result, { quiet: true })) {
      setError(result.ok ? null : result.message)
      return
    }
    setName('')
    setBudget('')
    setError(null)
  }

  return (
    <SectionCard
      accent={side}
      title={SIDE_LABEL[side]}
      lead={
        side === 'income'
          ? '入ってくるお金の分け方です。上から、決算書に出る順に並びます。'
          : '出ていくお金の分け方です。上から、決算書に出る順に並びます。'
      }
    >
      <div className="border-t border-rule/40">
        <div className={cn('gap-3 border-b-[3px] border-double border-rule px-6 py-2 text-[0.86rem] font-bold text-rule-ink max-md:hidden', ROW_GRID)}>
          <span>並び順</span>
          <span>
            <Hint content={explain('科目')}>科目</Hint>の名前
          </span>
          <span className="text-right">
            <Hint content={explain('予算')}>予算額</Hint>（円）
          </span>
          <span className="text-right">
            <Hint content={explain('決算')}>決算額</Hint>（円）
          </span>
          <span>決算書の「説明」に書く文</span>
          <span />
        </div>
        <ul>
          {side === 'income' && (
            <li className={cn('items-center gap-x-2 gap-y-2 border-b border-rule/35 bg-background/50 px-4 py-3 sm:px-6 md:gap-x-3', ROW_GRID)}>
              <span className="max-md:hidden" />
              <p className="flex min-h-11 items-center font-bold leading-snug">前年度繰越金</p>
              <div className="col-span-2 grid w-[8.6rem] gap-0.5 md:col-span-1 md:w-auto">
                <span className="text-[0.8rem] text-muted-foreground md:hidden">予算額（円）</span>
                <CommitMoney
                  label="前年度繰越金の予算額"
                  value={year.carryoverBudget}
                  allowEmpty
                  placeholder={formatYen(summary.openingTotal)}
                  disabled={locked}
                  onCommit={(v) => {
                    const r = updateYear(book, year.id, { carryoverBudget: v })
                    return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
                  }}
                />
              </div>
              <div className="col-span-3 flex items-center gap-2 md:col-span-1 md:block md:text-right">
                <span className="text-[0.8rem] leading-tight text-muted-foreground md:hidden">決算額</span>
                <p className="num md:px-2.5">
                  {formatYen(summary.openingTotal)}
                  <span className="ml-1 text-[0.84rem] md:hidden">円</span>
                </p>
              </div>
              <p className="col-span-3 text-[0.84rem] leading-snug text-muted-foreground md:col-span-2">
                年度はじめの残高の合計が、自動で入ります。予算額を空にすると、決算額と同じ金額が出ます。
              </p>
            </li>
          )}
          {rows.map((row, i) => (
            <CategoryRow key={row.categoryId} row={row} index={i} count={rows.length} />
          ))}
        </ul>
        <div className={cn('items-baseline gap-x-2 gap-y-1 border-b-[3px] border-double border-rule bg-rule-soft/50 px-4 py-3 font-bold sm:px-6 md:gap-x-3', ROW_GRID)}>
          <span className="max-md:hidden" />
          <span>{side === 'income' ? '収入合計' : '支出合計'}</span>
          <span className="num col-span-2 text-right md:col-span-1 md:pr-2.5">
            <span className="mr-1 text-[0.8rem] font-normal text-muted-foreground md:hidden">予算</span>
            {formatYen(budgetTotal)}
          </span>
          <span className="num col-span-3 text-right md:col-span-1 md:pr-2.5">
            <span className="mr-1 text-[0.8rem] font-normal text-muted-foreground md:hidden">いままでの決算</span>
            {formatYen(actualTotal)}
          </span>
        </div>
        {!locked && (
          <form
            className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-start sm:px-6"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <Field label={`${side === 'income' ? '収入' : '支出'}の科目を足す`} error={error}>
              {(p) => <Input {...p} value={name} maxLength={LIMITS.nameLength} placeholder={side === 'income' ? '例: 寄付金' : '例: 研修費'} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label="予算額">{(p) => <MoneyInput {...p} value={budget} onValueChange={setBudget} placeholder="0" />}</Field>
            <Button type="submit" variant="secondary" className="sm:mt-[1.65rem]">
              <Plus />
              足す
            </Button>
          </form>
        )}
      </div>
    </SectionCard>
  )
}

export function CategoriesScreen() {
  const { summary } = useWorkspace()
  const gap = summary.budgetGap
  return (
    <div className="grid grid-cols-1 gap-6">
      <Alert variant="info">{FORMAT_NOTE}</Alert>
      <AccountsSection />
      <CategorySection side="income" />
      <CategorySection side="expense" />
      <section aria-labelledby="budget-balance" className="rounded-xl border border-border bg-paper px-4 py-4 shadow-lift sm:px-6">
        <h2 id="budget-balance" className="text-lg">
          予算のつり合い
        </h2>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 leading-relaxed">
          <span>
            収入の予算 <span className="num font-bold">{formatYen(summary.carryoverBudget + summary.incomeBudgetTotal)}</span> 円
          </span>
          <span aria-hidden>−</span>
          <span>
            支出の予算 <span className="num font-bold">{formatYen(summary.expenseBudgetTotal)}</span> 円
          </span>
          <span aria-hidden>＝</span>
          <span className={cn('num text-lg font-bold', gap !== 0 && 'text-warn')}>{formatYen(gap)} 円</span>
        </p>
        <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">
          {gap === 0
            ? '収入の予算と、支出の予算が、同じ金額になっています。'
            : `収入の予算のほうが ${formatYen(Math.abs(gap))}円 ${gap > 0 ? '多く' : '少なく'}なっています。合計をそろえる団体では、差を「予備費」の予算額で調整します。そろえなくても、資料は作れます。`}
        </p>
      </section>
    </div>
  )
}
