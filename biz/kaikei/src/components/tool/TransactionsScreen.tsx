import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, NotebookPen, Pencil, Search, SearchX } from 'lucide-react'
import {
  filterTransactions,
  formatMonthDay,
  formatYen,
  listYearIssues,
  removeTransaction,
  transactionViews,
  type Transaction,
  type TransactionKind,
  type TransactionView,
} from '@/core'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input, NativeSelect } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TransactionForm } from './TransactionForm'
import { useWorkspace } from './store'

// ① 取引の入力と一覧。
// 上に「いまの残高」、まん中に入力のフォーム、下に取引の一覧。
// 一覧は、パソコンでは表、スマホでは1件ずつの札にする（スマホで表を横に動かさなくてよいように）。

const KIND_LABEL: Record<TransactionKind, string> = { income: '収入', expense: '支出', transfer: '移動' }

/** 収入・支出・移動のしるし。色だけでなく、字でも伝える。 */
function KindBadge({ kind }: { kind: TransactionKind }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-sm border px-1.5 text-[0.76rem] font-bold leading-none',
        kind === 'income' && 'border-rule-ink/50 bg-rule-soft text-secondary-foreground',
        kind === 'expense' && 'border-shu/45 bg-shu-soft text-shu-ink',
        kind === 'transfer' && 'border-input/60 bg-muted text-muted-foreground',
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

/** いまの残高と、収入・支出の合計。帳簿の欄のように、縦の罫線で区切る。 */
function BalanceStrip() {
  const { summary } = useWorkspace()
  return (
    <section aria-label="いまの残高と、収入・支出の合計" className="overflow-hidden rounded-xl border border-border bg-paper shadow-lift">
      <dl className="grid grid-cols-2 divide-rule/40 max-lg:[&>div:nth-child(n+3)]:border-t max-lg:[&>div:nth-child(n+3)]:border-rule/40 max-lg:[&>div:nth-child(odd)]:border-r max-lg:[&>div:nth-child(odd)]:border-rule/40 lg:grid-cols-[1fr_1fr_1.1fr_1.6fr] lg:divide-x">
        <div className="px-4 py-3">
          <dt className="text-[0.84rem] font-bold text-rule-ink">収入の合計</dt>
          <dd className="num mt-0.5 text-xl leading-tight">
            {formatYen(summary.incomeTotal)}
            <span className="ml-0.5 text-[0.84rem]">円</span>
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[0.84rem] font-bold text-shu-ink">支出の合計</dt>
          <dd className="num mt-0.5 text-xl leading-tight">
            {formatYen(summary.expenseTotal)}
            <span className="ml-0.5 text-[0.84rem]">円</span>
          </dd>
        </div>
        <div className="bg-rule-soft/50 px-4 py-3">
          <dt className="text-[0.84rem] font-bold">いまの残高（合計）</dt>
          <dd className="num mt-0.5 text-[1.45rem] font-bold leading-tight">
            {formatYen(summary.carryover)}
            <span className="ml-0.5 text-[0.84rem] font-normal">円</span>
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[0.84rem] font-bold text-muted-foreground">置き場所ごとの残高</dt>
          <dd className="mt-1 grid gap-0.5 text-[0.9rem] leading-snug">
            {summary.accounts.map((a) => (
              <span key={a.accountId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{a.name}</span>
                <span className={cn('num shrink-0', a.closing < 0 && 'font-bold text-destructive')}>{formatYen(a.closing)} 円</span>
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function amountText(view: TransactionView): string {
  return formatYen(view.transaction.amount)
}

export function TransactionsScreen() {
  const { book, year, locked, today, apply } = useWorkspace()
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [lastAdded, setLastAdded] = useState<{ id: string; text: string } | null>(null)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<TransactionKind | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [newestFirst, setNewestFirst] = useState(true)
  const [limit, setLimit] = useState(100)

  // 年度を切り替えたら、しぼりこみと「いま入れた」の知らせを元に戻す
  useEffect(() => {
    setText('')
    setKind('')
    setCategoryId('')
    setAccountId('')
    setLastAdded(null)
    setLimit(100)
  }, [year.id])

  const views = useMemo(() => transactionViews(year), [year])
  const filtered = useMemo(() => {
    const list = filterTransactions(views, {
      text: text || undefined,
      kind: kind || undefined,
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
    })
    return newestFirst ? [...list].reverse() : list
  }, [views, text, kind, categoryId, accountId, newestFirst])
  const issues = useMemo(() => listYearIssues(year, { today }), [year, today])
  const filtering = text !== '' || kind !== '' || categoryId !== '' || accountId !== ''
  const shown = filtered.slice(0, limit)

  const clearFilter = () => {
    setText('')
    setKind('')
    setCategoryId('')
    setAccountId('')
  }

  return (
    <div className="grid gap-6">
      <BalanceStrip />

      {issues.length > 0 && (
        <Alert variant="warn">
          <AlertTitle>確かめてほしいことが、{issues.length}つあります</AlertTitle>
          <AlertDescription>
            <ul className="grid gap-1">
              {issues.map((n, i) => (
                <li key={i}>{n.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!locked && (
        <section aria-labelledby="tx-form-title" className="rounded-xl border border-border border-t-[3px] border-t-shu bg-paper px-4 py-5 shadow-paper sm:px-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="tx-form-title" className="text-xl">
              取引を入れる
            </h2>
            <p className="text-[0.86rem] text-muted-foreground max-lg:hidden">Enter キーで次の欄へ進みます。金額で Enter を押すと、入ります。</p>
          </div>
          <TransactionForm key={year.id} onSaved={(id, summary) => setLastAdded({ id, text: summary })} />
          <p className="mt-3 min-h-[1.6rem] text-[0.94rem] leading-snug" role="status" aria-live="polite">
            {lastAdded && (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-sm bg-rule-ink px-1.5 py-0.5 text-[0.8rem] font-bold text-white">入れました</span>
                <span>{lastAdded.text}</span>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-1 font-bold text-rule-ink underline underline-offset-4"
                  onClick={() => {
                    const tx = year.transactions.find((t) => t.id === lastAdded.id)
                    if (tx) setEditing(tx)
                  }}
                >
                  いま入れた取引を直す
                </button>
              </span>
            )}
          </p>
        </section>
      )}

      <section aria-labelledby="tx-list-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="tx-list-title" className="text-xl">
            取引の一覧
            <span className="ml-2 font-sans text-[0.94rem] font-normal text-muted-foreground">
              {filtering ? `${filtered.length}件（全 ${views.length}件のうち）` : `${views.length}件`}
            </span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setNewestFirst((v) => !v)} aria-label={`並びを変える。いまは、日付の${newestFirst ? '新しい順' : '古い順'}`}>
            <ArrowDownUp />
            {newestFirst ? '新しい順' : '古い順'}
          </Button>
        </div>

        {views.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-paper/70 p-2.5 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
            <label className="relative col-span-2 block md:col-span-1">
              <span className="sr-only">内容・科目・金額・領収書の番号でさがす</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-[1.1rem] -translate-y-1/2 text-muted-foreground" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="さがす（内容、金額など）" className="h-11 pl-9" type="search" />
            </label>
            <NativeSelect aria-label="収入・支出・移動でしぼる" value={kind} onChange={(e) => setKind(e.target.value as TransactionKind | '')} className="h-11">
              <option value="">すべての動き</option>
              <option value="income">収入だけ</option>
              <option value="expense">支出だけ</option>
              <option value="transfer">移動だけ</option>
            </NativeSelect>
            <NativeSelect aria-label="科目でしぼる" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11">
              <option value="">すべての科目</option>
              <optgroup label="収入">
                {year.categories.filter((c) => c.side === 'income').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="支出">
                {year.categories.filter((c) => c.side === 'expense').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </NativeSelect>
            <NativeSelect aria-label="お金の置き場所でしぼる" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="col-span-2 h-11 md:col-span-1">
              <option value="">すべての置き場所</option>
              {year.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
            {filtering && (
              <Button variant="outline" size="sm" className="col-span-2 md:col-span-1" onClick={clearFilter}>
                すべて表示する
              </Button>
            )}
          </div>
        )}

        {views.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyMedia>
                <NotebookPen />
              </EmptyMedia>
              <EmptyTitle>まだ、取引が入っていません</EmptyTitle>
              <EmptyDescription>
                {locked
                  ? 'この年度には、取引がありません。'
                  : '通帳と領収書を手もとに置いて、上の「取引を入れる」から、日付の古い順に入れていくと、まちがいが少なくなります。'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyMedia>
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>あてはまる取引が、ありません</EmptyTitle>
              <EmptyDescription>さがす言葉や、しぼりこみを変えてみてください。</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={clearFilter}>
              すべて表示する
            </Button>
          </Empty>
        ) : (
          <>
            {/* パソコン: 表 */}
            <div className="mt-3 hidden overflow-hidden rounded-xl border border-border bg-paper shadow-lift md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[6.5rem] pl-4">日付</TableHead>
                    <TableHead className="w-[4rem]">動き</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="text-right">金額（円）</TableHead>
                    <TableHead>置き場所</TableHead>
                    <TableHead className="text-center">領収書</TableHead>
                    <TableHead className="w-[5.5rem] pr-3 text-center">{locked ? '' : '直す'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((v) => {
                    const t = v.transaction
                    return (
                      <TableRow key={t.id} className={cn('hover:bg-muted/60', lastAdded?.id === t.id && 'row-flash')}>
                        <TableCell className="num whitespace-nowrap pl-4">
                          {formatMonthDay(t.date)}
                          {v.outsideYear && <span className="ml-1 rounded-sm bg-warn-soft px-1 text-[0.72rem] font-bold text-warn">年度の外</span>}
                        </TableCell>
                        <TableCell>
                          <KindBadge kind={t.kind} />
                        </TableCell>
                        <TableCell className="min-w-[7rem]">{v.categoryName}</TableCell>
                        <TableCell className="min-w-[10rem]">{t.description}</TableCell>
                        <TableCell className="num text-right text-[1.02rem]">{amountText(v)}</TableCell>
                        <TableCell className="text-[0.88rem]">{v.accountText}</TableCell>
                        <TableCell className="num text-center">{t.receiptNo}</TableCell>
                        <TableCell className="pr-3 text-center">
                          {!locked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${formatMonthDay(t.date)} ${v.categoryName} ${t.description} ${formatYen(t.amount)}円 を直す`}
                              onClick={() => setEditing(t)}
                            >
                              <Pencil />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* スマホ: 1件ずつの札。押すと、直す画面が開く */}
            <ul className="mt-3 grid gap-0 overflow-hidden rounded-xl border border-border bg-paper shadow-lift md:hidden">
              {shown.map((v) => {
                const t = v.transaction
                const body = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.86rem] text-muted-foreground">
                        <span className="num">{formatMonthDay(t.date)}</span>
                        <KindBadge kind={t.kind} />
                        {v.outsideYear && <span className="rounded-sm bg-warn-soft px-1 text-[0.72rem] font-bold text-warn">年度の外</span>}
                        {t.receiptNo && <span className="num">No.{t.receiptNo}</span>}
                      </span>
                      <span className="font-bold leading-snug">{v.categoryName}</span>
                      {t.description && <span className="text-[0.9rem] leading-snug">{t.description}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="num text-[1.08rem] font-bold">{amountText(v)} 円</span>
                      <span className="max-w-[9rem] text-right text-[0.78rem] leading-tight text-muted-foreground">{v.accountText}</span>
                    </span>
                  </>
                )
                return (
                  <li key={t.id} className={cn('border-b border-rule/35 last:border-b-0', lastAdded?.id === t.id && 'row-flash')}>
                    {locked ? (
                      <div className="flex items-start gap-3 px-3.5 py-3">{body}</div>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 px-3.5 py-3 outline-offset-[-3px] active:bg-muted"
                        onClick={() => setEditing(t)}
                        aria-label={`${formatMonthDay(t.date)} ${KIND_LABEL[t.kind]} ${v.categoryName} ${t.description} ${formatYen(t.amount)}円 ${v.accountText}。押すと直せます`}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            {filtered.length > limit && (
              <div className="mt-3 text-center">
                <Button variant="outline" onClick={() => setLimit((n) => n + 200)}>
                  続きを表示する（残り {filtered.length - limit}件）
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 直す */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>取引を直す</DialogTitle>
            <DialogDescription>直したいところを書きかえて、「直した内容を保存する」を押してください。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {editing && (
              <TransactionForm
                key={editing.id}
                editing={editing}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
                onDelete={() => {
                  setDeleting(editing)
                  setEditing(null)
                }}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* 消す前の確かめ（元に戻す機能はないので、必ず聞く） */}
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>この取引を消しますか</DialogTitle>
            <DialogDescription>消すと、元に戻せません。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {deleting && (
              <p className="rounded-lg border border-border bg-background/60 px-4 py-3 leading-relaxed">
                {formatMonthDay(deleting.date)}　{views.find((v) => v.transaction.id === deleting.id)?.categoryName}
                <br />
                {deleting.description && (
                  <>
                    {deleting.description}
                    <br />
                  </>
                )}
                <span className="num font-bold">{formatYen(deleting.amount)} 円</span>
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              消さない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting && apply(removeTransaction(book, year.id, deleting.id), { done: '取引を1件、消しました。' })) {
                  if (lastAdded?.id === deleting.id) setLastAdded(null)
                }
                setDeleting(null)
              }}
            >
              消す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
