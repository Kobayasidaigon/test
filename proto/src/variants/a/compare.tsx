// 案A「カプセルトイ」 — えらんでくらべる：出てきたカプセルが「くらべ棚」に並ぶ。
// 並びは、えらんだ順（compareMany のまま）。得する順にも並べかえられる（損する順の一覧は作らない）。
// 棒は1年あたりの差。確認中は0の棒にせず、点線の枠にする。値は墨色の文字で棒の先に書く。
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { yenMan } from '@/shared'
import type { Comparison, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, ItemIcon } from './art'
import { isHit, lookOf, toneOf } from './lib'
import { DetailGrid, Notice, NextStepsBox, ResultHeader, RetryButtons, SectionTitle, StampBook, rentOf, type SampleMark } from './result'
import { GotouchiStamp } from './stamp'
import { LevelTag } from './towns'

type Order = 'picked' | 'gain'

function amountWords(c: Comparison) {
  if (isHit(c)) return { main: '損得の演出は出していません', sub: '公式の情報をごらんください' }
  if (c.status === 'unknown') return { main: '確認中', sub: c.unknown.map((u) => u.label).join('・') }
  const t = toneOf(c.perYear)
  const part = c.status === 'partial' ? 'わかる分で ' : ''
  if (t === 'even') return { main: `${part}ほぼ同じ`, sub: '' }
  if (t === 'plus') return { main: `${part}年 約${yenMan(c.perYear)} 得`, sub: '' }
  return { main: `${part}今の街が 年 約${yenMan(-c.perYear)} お得`, sub: '' }
}

function Bar({ c, max }: { c: Comparison; max: number }) {
  const reduce = useReducedMotion()
  if (isHit(c)) return null
  if (c.status === 'unknown') return <span className="block h-[18px] w-[46%] rounded-[4px] border-2 border-dashed border-[var(--ink-soft)]" aria-hidden />
  const t = toneOf(c.perYear)
  const w = max > 0 ? Math.max(t === 'even' ? 0.02 : 0.05, Math.abs(c.perYear) / max) : 0.02
  return (
    <span className="flex items-center" aria-hidden>
      <motion.span
        className="block h-[18px] rounded-r-[4px]"
        style={{ background: t === 'plus' ? 'var(--plus)' : t === 'stay' ? 'var(--stay)' : '#a9b0bb', transformOrigin: 'left center', width: `${w * 100}%` }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      />
      {c.status === 'partial' && <span className="ml-0.5 block h-[18px] w-4 rounded-r-[4px] border-2 border-l-0 border-dashed border-[var(--ink-soft)]" />}
    </span>
  )
}

export function CompareShelf({ list, sel, onSelect }: { list: Comparison[]; sel: number; onSelect: (i: number) => void }) {
  const [order, setOrder] = useState<Order>('picked')
  const idx = useMemo(() => {
    const ids = list.map((_, i) => i)
    if (order === 'picked') return ids
    const rankOf = (c: Comparison) => (isHit(c) ? 2 : c.status === 'unknown' ? 1 : 0)
    return ids.sort((a, b) => rankOf(list[a]) - rankOf(list[b]) || list[b].perYear - list[a].perYear)
  }, [list, order])
  // 目盛りの最大は20万円より小さくしない（知っている額が1つだけでも、棒がいっぱいに見えないように）
  const max = Math.max(...list.filter((c) => !isHit(c) && c.status !== 'unknown').map((c) => Math.abs(c.perYear)), 200000)
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">押すと、そのカプセルの中身を下に開きます。</p>
        <div role="radiogroup" aria-label="棚の並べ方" className="inline-flex rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--paper)] p-0.5">
          {(['picked', 'gain'] as Order[]).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={order === o}
              onClick={() => setOrder(o)}
              className={cn('min-h-[36px] rounded-full px-3 text-[12.5px] font-black', order === o ? 'bg-[var(--ink)] text-white' : '')}
            >
              {o === 'picked' ? 'えらんだ順' : '得する順'}
            </button>
          ))}
        </div>
      </div>
      <ol className="va-wall space-y-0 rounded-[18px] border-[3px] border-[var(--ink)] p-2 pb-1">
        {idx.map((i) => {
          const c = list[i]
          const on = i === sel
          const w = amountWords(c)
          const r = rentOf(c)
          return (
            <li key={c.to.id} className="va-plank pb-2.5">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={on}
                aria-label={`${c.to.pref}${c.to.name}：${w.main}${c.oneTime ? `。一度きり 最大 約${yenMan(c.oneTime, 0)}` : ''}${c.care ? '。災害への配慮あり' : ''}`}
                className={cn('grid w-full grid-cols-[52px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[14px] px-1.5 py-1.5 text-left transition-colors sm:grid-cols-[60px_minmax(0,200px)_minmax(0,1fr)]', on ? 'bg-[var(--yolk)] shadow-[0_0_0_3px_var(--ink)]' : 'hover:bg-white/70')}
              >
                <span className="relative row-span-2 grid place-items-center sm:row-span-1">
                  <Capsule color={lookOf(c.to).capsule} level={c.to.level} size={50} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="text-[12px] font-bold text-[var(--ink-soft)]">{c.to.pref}</span>
                    <LevelTag city={c.to} />
                    {c.care && <span className="rounded-full border-2 border-[var(--stay)] px-1.5 text-[12px] font-black leading-tight text-[var(--stay)]">配慮</span>}
                  </span>
                  <span className="block truncate text-[17px] font-black leading-tight">{c.to.name}</span>
                  {r && r.to !== null && <span className="block text-[12px] font-bold text-[var(--ink-soft)]">家賃の目安 月{(Math.round(r.to / 1000) / 10).toLocaleString('ja-JP')}万円</span>}
                </span>
                <span className="col-start-2 min-w-0 sm:col-start-3">
                  <Bar c={c} max={max} />
                  <span className="mt-1 block text-[13.5px] font-black leading-snug">{w.main}</span>
                  {w.sub && <span className="block text-[12px] font-bold text-[var(--ink-soft)]">{w.sub}</span>}
                  {c.oneTime > 0 && <span className="mt-0.5 inline-block rounded-full bg-[var(--ink)] px-1.5 text-[12px] font-black text-[var(--yolk)]">ほかに一度きり 最大 約{yenMan(c.oneTime, 0)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* 項目ごとの表（スマホでは表の中だけ横に動く） */
const ROWS: { key: string; label: string }[] = [
  { key: 'nursery', label: '0〜2歳の保育料' },
  { key: 'cash', label: '現金の給付' },
  { key: 'lunch', label: '中学校の給食費' },
  { key: 'medical', label: '高校生の医療費' },
]
function cell(c: Comparison, key: string): string {
  const i = c.items.find((x) => x.key === key)
  if (!i) return key === 'cash' ? '差なし' : '—'
  if (i.perYear === null) return '確認中'
  if (Math.abs(i.perYear) < 1000) return '差なし'
  return `${i.perYear > 0 ? '＋' : '−'}${yenMan(Math.abs(i.perYear))}`
}

export function CompareTable({ list }: { list: Comparison[] }) {
  const rows = ROWS.filter((r) => list.some((c) => c.items.some((i) => i.key === r.key)))
  const years = list[0]?.years ?? 1
  return (
    <details className="group mt-3 rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)]">
      <summary className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-[14px] font-black">
        <ItemIcon name="nursery" size={26} />
        <span className="flex-1">項目ごとの表で見る</span>
        <span className="va-caret text-[16px] transition-transform" aria-hidden>
          ›
        </span>
      </summary>
      <div className="px-2 pb-3">
        <p className="mb-2 px-1 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
          ＋は候補の街のほうが得、−は今の街のほうが得（{years > 1 ? `${years}年でならした1年あたり` : '1年で'}）。家賃は暮らしのお金の目安で、差には入れていません。
        </p>
        <div className="overflow-x-auto overscroll-x-contain rounded-[10px] border-2 border-[var(--ink)]/25">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--paper-2)]">
                <th scope="col" className="sticky left-0 z-10 bg-[var(--paper-2)] px-2 py-2 text-left text-[12px] font-black">
                  項目
                </th>
                {list.map((c) => (
                  <th key={c.to.id} scope="col" className="px-2 py-2 text-center text-[13px] font-black">
                    <span className="flex flex-col items-center gap-0.5">
                      <GotouchiStamp city={c.to} size={40} />
                      {c.to.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t-2 border-[var(--ink)]/15">
                  <th scope="row" className="sticky left-0 z-10 bg-[var(--paper)] px-2 py-2 text-left text-[12.5px] font-black">
                    {r.label}
                  </th>
                  {list.map((c) => (
                    <td key={c.to.id} className={cn('px-2 py-2 text-center font-black', cell(c, r.key) === '確認中' && 'text-[var(--ink-soft)]')}>
                      {cell(c, r.key)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--ink)]/15">
                <th scope="row" className="sticky left-0 z-10 bg-[var(--paper)] px-2 py-2 text-left text-[12.5px] font-black">
                  一度きりのお金
                </th>
                {list.map((c) => (
                  <td key={c.to.id} className="px-2 py-2 text-center font-black">
                    {c.oneTime > 0 ? `最大 ${yenMan(c.oneTime, 0)}` : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-t-2 border-[var(--ink)]/15 bg-[#fff7e0]">
                <th scope="row" className="sticky left-0 z-10 bg-[#fff7e0] px-2 py-2 text-left text-[12.5px] font-black">
                  家賃の目安（月）
                </th>
                {list.map((c) => {
                  const r = rentOf(c)
                  return (
                    <td key={c.to.id} className="px-2 py-2 text-center font-bold">
                      {r && r.to !== null ? `${(Math.round(r.to / 1000) / 10).toLocaleString('ja-JP')}万円` : 'データなし'}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

export function CompareResult({ input, list, sel, onSelect, onRepick, onRetry, onRestart, sample, book, onClearBook }: {
  input: FamilyInput
  list: Comparison[]
  sel: number
  onSelect: (i: number) => void
  onRepick: () => void
  onRetry: () => void
  onRestart: () => void
  sample: SampleMark
  book: string[]
  onClearBook: () => void
}) {
  const c = list[sel]
  const from = list[0].from
  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 pb-10 pt-3 sm:px-4">
      <ResultHeader onBack={onRepick} backLabel="街を入れなおす" />
      <section aria-labelledby="va-compare" className="mx-auto mb-7 max-w-[520px] lg:max-w-[980px]">
        <SectionTitle
          id="va-compare"
          color="#e8c48a"
          sub={`${from.name}とくらべた、子育ての制度の差（${list[0].perYearLabel}）。カプセルの見た目はデータのくわしさで、得か損かではありません。`}
        >
          くらべ棚（{list.length}個）
        </SectionTitle>
        <CompareShelf list={list} sel={sel} onSelect={onSelect} />
        <CompareTable list={list} />
      </section>
      <div className="mx-auto mb-4 flex max-w-[520px] items-center gap-2 lg:max-w-none">
        <span className="h-[3px] flex-1 rounded-full bg-[var(--ink)]/25" />
        <p className="text-[13px] font-black">{c.to.name}のカプセルを開けたところ</p>
        <span className="h-[3px] flex-1 rounded-full bg-[var(--ink)]/25" />
      </div>
      <DetailGrid
        c={c}
        input={input}
        sample={sample}
        book={<StampBook ids={book} waiting={list.map((x) => x.to)} onClear={onClearBook} />}
        bottom={
          <>
            <NextStepsBox c={c} others={list.length - 1} />
            <RetryButtons onRetry={onRetry} onRestart={onRestart} />
            <Notice />
          </>
        }
      />
    </div>
  )
}
