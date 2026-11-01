// 案A「カプセルトイ」 — えらんでくらべる：出てきたカプセルが「くらべ棚」に並ぶ。
// 並びは、えらんだ順（compareMany のまま）。得する順にも並べかえられる（損する順の一覧は作らない）。
// 棒は1年あたりの差。確認中・準備中は0の棒にせず、点線の枠にする。値は墨色の文字で棒の下に書く。
// 被災した街は、得する順の並びに入れず、区切りの下に置く（金額でもくらべない）。
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { yenMan } from '@/shared'
import type { Comparison, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { ItemIcon } from './art'
import { ijuPending, isHit, levelTag, lookOf, perYearChip, thinCity, toneOf } from './lib'
import { NamedCapsuleG } from './machine'
import { DetailGrid, Notice, NextStepsBox, ResultHeader, RetryButtons, SectionTitle, StampBook, rentOf, type SampleMark } from './result'
import { GotouchiStamp } from './stamp'
import { LevelTag } from './towns'

type Order = 'picked' | 'gain'
const RENT_NOTE = '家賃は、いま住んでいる世帯が払っている平均。これから借りる家賃より低めに出ます。子育ての差には入れていません。'
const man1 = (yen: number) => `${(Math.round(yen / 1000) / 10).toFixed(1)}万円`

function amountWords(c: Comparison): { main: string; sub: string } {
  if (isHit(c)) return { main: '地震で被害を受けた街なので、得・損は出していません', sub: '制度の中身は、カプセルを開けると見られます' }
  if (c.status === 'unknown') return { main: '確認中', sub: c.unknown.map((u) => u.label).join('・') }
  const thin = thinCity(c)
  if (thin) return { main: thin.level === 'pref' ? 'まだ調べ中' : '準備中', sub: `わかる制度では差なし。${thin === c.to ? '' : `${thin.name}（今の街）の`}${thin.level === 'pref' ? '独自の給付など' : '保育料など'}はまだ` }
  const t = toneOf(c.perYear)
  const part = c.status === 'partial' ? 'わかる分で ' : ''
  if (t === 'even') return { main: `${part}ほぼ同じ`, sub: '' }
  if (t === 'plus') return { main: `${part}年 約${yenMan(c.perYear)} 得`, sub: '' }
  return { main: `${part}今の街が 年 約${yenMan(-c.perYear)} お得`, sub: '' }
}

// 棒：墨の線でかこんだコインの列のような帯。5万円ごとに刻み
function Bar({ c, max }: { c: Comparison; max: number }) {
  const reduce = useReducedMotion()
  if (isHit(c)) return null
  if (c.status === 'unknown' || thinCity(c)) return <span className="block h-[18px] w-[46%] rounded-full border-[2.5px] border-dashed border-[var(--ink)]/60" aria-hidden />
  const t = toneOf(c.perYear)
  const w = max > 0 ? Math.max(t === 'even' ? 0.04 : 0.06, Math.abs(c.perYear) / max) : 0.04
  const ticks = Math.floor(Math.abs(c.perYear) / 50000)
  return (
    <span className="flex items-center" aria-hidden>
      <motion.span
        className="relative block h-[18px] overflow-hidden rounded-full border-[2.5px] border-[var(--ink)]"
        style={{ background: t === 'plus' ? 'var(--plus)' : t === 'stay' ? 'var(--stay)' : '#c9ced6', transformOrigin: 'left center', width: `${w * 100}%` }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      >
        {Array.from({ length: ticks }, (_, k) => (
          <span key={k} className="absolute top-0 h-full w-[2px] bg-white/55" style={{ left: `${(((k + 1) * 50000) / Math.abs(c.perYear)) * 100}%` }} />
        ))}
        <span className="absolute left-1.5 right-1.5 top-[2px] h-[3px] rounded-full bg-white/35" />
      </motion.span>
      {c.status === 'partial' && <span className="ml-1 block h-[18px] w-5 rounded-r-full border-[2.5px] border-l-0 border-dashed border-[var(--ink)]/60" />}
    </span>
  )
}

function ShelfCapsule({ c }: { c: Comparison }) {
  return (
    <svg viewBox="-30 -30 60 60" width={56} height={56} aria-hidden overflow="visible">
      <NamedCapsuleG cap={{ id: c.to.id, color: lookOf(c.to).capsule, level: c.to.level, name: c.to.name.replace(/(市|区|町|村)$/, '') }} />
    </svg>
  )
}

function rowAria(c: Comparison) {
  const w = amountWords(c)
  const r = rentOf(c)
  const miss = c.unknown.length && !isHit(c) ? `。確認中の${c.unknown.map((u) => u.label).join('・')}は入っていません` : ''
  return `${c.to.pref}${c.to.name}（${levelTag(c.to)}）：${w.main}${w.sub && !isHit(c) ? `（${w.sub}）` : ''}${miss}${c.oneTime ? `。ほかに一度きり 最大 約${yenMan(c.oneTime, 0)}` : ''}${r && r.to !== null ? `。家賃の目安 月${man1(r.to)}` : ''}${c.care ? '。災害への配慮あり' : ''}`
}

function ShelfRow({ c, on, onClick, max }: { c: Comparison; on: boolean; onClick: () => void; max: number }) {
  const w = amountWords(c)
  const r = rentOf(c)
  return (
    <li className="va-plank pb-2.5">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        aria-label={rowAria(c)}
        className={cn(
          'grid w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[14px] px-1.5 py-1 text-left transition-colors sm:grid-cols-[60px_minmax(0,230px)_minmax(0,1fr)]',
          on ? 'bg-[var(--yolk)] shadow-[0_0_0_3px_var(--ink)] [--ink-soft:var(--ink)]' : 'hover:bg-white/70',
        )}
      >
        <span className="relative row-span-2 grid place-items-center pt-1 sm:row-span-1">
          <ShelfCapsule c={c} />
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[17px] font-black leading-tight">{c.to.name}</span>
            <span className="shrink-0 text-[12px] font-bold text-[var(--ink-soft)]">{c.to.pref}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            <LevelTag city={c.to} />
            {c.care && <span className="rounded-full border-2 border-[var(--stay)] px-1.5 text-[12px] font-black leading-tight text-[var(--stay)]">地震の配慮</span>}
            {r && r.to !== null && (
              <span className="text-[12px] font-bold text-[var(--ink-soft)]">
                家賃の目安 月{man1(r.to)}
                {r.diff !== null && Math.abs(r.diff) >= 1000 && `（今の街${r.diff > 0 ? '＋' : '−'}${man1(Math.abs(r.diff))}）`}
              </span>
            )}
          </span>
        </span>
        <span className="col-start-2 mt-1 min-w-0 sm:col-start-3 sm:mt-0">
          <Bar c={c} max={max} />
          <span className={cn('mt-0.5 block font-black leading-snug', isHit(c) ? 'text-[13px]' : 'text-[13.5px]')}>{w.main}</span>
          {w.sub && <span className="block text-[12px] font-bold text-[var(--ink-soft)]">{w.sub}</span>}
          {c.oneTime > 0 && <span className="mt-0.5 inline-block rounded-full bg-[var(--ink)] px-1.5 text-[12px] font-black text-[var(--yolk)]">ほかに一度きり 最大 約{yenMan(c.oneTime, 0)}</span>}
        </span>
      </button>
    </li>
  )
}

export function CompareShelf({ list, sel, onSelect }: { list: Comparison[]; sel: number; onSelect: (i: number) => void }) {
  const [order, setOrder] = useState<Order>('picked')
  // 得する順：被災した街は並べかえに入れず、区切りの下に置く。確認中・準備中は後ろ
  const { main, apart } = useMemo(() => {
    const ids = list.map((_, i) => i)
    if (order === 'picked') return { main: ids, apart: [] as number[] }
    const rankOf = (c: Comparison) => (c.status === 'unknown' || thinCity(c) ? 1 : 0)
    const sorted = ids.filter((i) => !isHit(list[i])).sort((a, b) => rankOf(list[a]) - rankOf(list[b]) || list[b].perYear - list[a].perYear)
    return { main: sorted, apart: ids.filter((i) => isHit(list[i])) }
  }, [list, order])
  // 目盛りの最大は20万円より小さくしない（知っている額が1つだけでも、棒がいっぱいに見えないように）
  const max = Math.max(...list.filter((c) => !isHit(c) && c.status !== 'unknown' && !thinCity(c)).map((c) => Math.abs(c.perYear)), 200000)
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">押すと、そのカプセルの中身を下に開きます。</p>
        <div role="group" aria-label="棚の並べ方" className="inline-flex rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--paper)] p-0.5">
          {(['picked', 'gain'] as Order[]).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={order === o}
              onClick={() => setOrder(o)}
              className={cn('min-h-[36px] rounded-full px-3 text-[12.5px] font-black', order === o ? 'bg-[var(--ink)] text-white' : '')}
            >
              {o === 'picked' ? 'えらんだ順' : '得する順'}
            </button>
          ))}
        </div>
      </div>
      <ol className="va-wall space-y-0 rounded-[18px] border-[3px] border-[var(--ink)] p-2 pb-1">
        {main.map((i) => (
          <ShelfRow key={list[i].to.id} c={list[i]} on={i === sel} onClick={() => onSelect(i)} max={max} />
        ))}
      </ol>
      {apart.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-black text-[var(--stay)]">
            <span className="h-[3px] flex-1 rounded-full bg-[var(--stay)]/40" />
            地震の配慮のため、並べかえに入れていません
            <span className="h-[3px] flex-1 rounded-full bg-[var(--stay)]/40" />
          </p>
          <ol className="va-wall rounded-[18px] border-[3px] border-dashed border-[var(--stay)] p-2 pb-1">
            {apart.map((i) => (
              <ShelfRow key={list[i].to.id} c={list[i]} on={i === sel} onClick={() => onSelect(i)} max={max} />
            ))}
          </ol>
        </div>
      )}
      <p className="mt-2 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{RENT_NOTE}</p>
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
function cell(c: Comparison, key: string): { text: string; soft?: boolean } {
  // 被災した街は、金額でくらべない
  if (isHit(c)) return { text: 'くらべていません', soft: true }
  const i = c.items.find((x) => x.key === key)
  if (!i) return { text: key === 'cash' ? '差なし' : '—' }
  if (i.perYear === null) return { text: '確認中', soft: true }
  if (Math.abs(i.perYear) < 1000) return { text: '差なし' }
  return { text: `${i.perYear > 0 ? '＋' : '−'}${yenMan(Math.abs(i.perYear))}` }
}

export function CompareTable({ list, input }: { list: Comparison[]; input: FamilyInput }) {
  const rows = ROWS.filter((r) => list.some((c) => c.items.some((i) => i.key === r.key)))
  const from = list[0]?.from
  const fromRent = list.map(rentOf).find((r) => r && r.from !== null)?.from ?? null
  const hasHit = list.some(isHit)
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
          ＋は候補の街のほうが得、−は今の街（{from?.name}）のほうが得。金額は{list[0] ? perYearChip(list[0]).replace('1年ぶん', '1年ぶんの額') : ''}。「—」は、この家族に当てはまらない項目です。
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
                      {isHit(c) && <span className="rounded-full border-2 border-[var(--stay)] px-1 text-[12px] font-black leading-tight text-[var(--stay)]">地震の配慮</span>}
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
                  {list.map((c) => {
                    const v = cell(c, r.key)
                    return (
                      <td key={c.to.id} className={cn('px-2 py-2 text-center font-black', v.soft && 'text-[12px] text-[var(--ink-soft)]')}>
                        {v.text}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--ink)]/15">
                <th scope="row" className="sticky left-0 z-10 bg-[var(--paper)] px-2 py-2 text-left text-[12.5px] font-black">
                  一度きりのお金
                </th>
                {list.map((c) => (
                  <td key={c.to.id} className={cn('px-2 py-2 text-center font-black', ijuPending(c, input) && 'text-[12px] text-[var(--ink-soft)]')}>
                    {c.oneTime > 0 ? `最大 ${yenMan(c.oneTime, 0)}` : ijuPending(c, input) ? '準備中（移住支援金）' : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-t-2 border-[var(--ink)]/15 bg-[#fff7e0]">
                <th scope="row" className="sticky left-0 z-10 bg-[#fff7e0] px-2 py-2 text-left text-[12.5px] font-black">
                  家賃の目安（月）
                  <span className="block text-[12px] font-bold text-[var(--ink-soft)]">
                    今の街 {from?.name} {fromRent !== null ? man1(fromRent) : 'データなし'}
                  </span>
                </th>
                {list.map((c) => {
                  const r = rentOf(c)
                  return (
                    <td key={c.to.id} className="px-2 py-2 text-center font-bold">
                      {r && r.to !== null ? man1(r.to) : 'データなし'}
                      {r && r.diff !== null && (
                        <span className="block text-[12px] text-[var(--ink-soft)]">{Math.abs(r.diff) < 1000 ? 'ほぼ同じ' : `${r.diff > 0 ? '＋' : '−'}${man1(Math.abs(r.diff))}`}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 px-1 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{RENT_NOTE}</p>
        {hasHit && (
          <p className="mt-1 px-1 text-[12px] font-bold leading-snug text-[var(--stay)]">
            地震で大きな被害を受けた街は、金額でくらべていません。制度の中身は、カプセルを開けると見られます。
          </p>
        )}
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
  const years = list[0].years
  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 pb-10 pt-3 sm:px-4">
      <ResultHeader onBack={onRepick} backLabel="街を入れなおす" />
      <section aria-labelledby="va-compare" className="mx-auto mb-7 max-w-[520px] lg:max-w-[980px]">
        <SectionTitle
          id="va-compare"
          color="#e8c48a"
          sub={`${from.name}とくらべた、子育ての制度の差。金額は${years > 1 ? `${years}年でならした1年あたり` : '1年ぶん'}。カプセルの見た目はデータのくわしさで、得か損かではありません。`}
        >
          くらべ棚（{list.length}個）
        </SectionTitle>
        <CompareShelf list={list} sel={sel} onSelect={onSelect} />
        <CompareTable list={list} input={input} />
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
            <NextStepsBox c={c} others={list.length - 1} input={input} />
            <RetryButtons onRetry={onRetry} onRestart={onRestart} />
            <Notice />
          </>
        }
      />
    </div>
  )
}
