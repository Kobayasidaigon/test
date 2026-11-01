// 案A「カプセルトイ」 — 結果：カプセルの中身（はんこ・金額・家賃の目安・家族の顔・説明書・確認中・一度きり・おまけ・棚・スタンプ帳・次の一歩）
import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useAnimationControls, useInView, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowLeft, ChevronRight, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ALL_CITIES, DATA_AS_OF, DISCLAIMER, MUNI_SOURCE, cityById, compare, everyday, moodText, yenMan } from '@/shared'
import type { Breakdown, City, Comparison, Confidence, FamilyInput, Pride, Source } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, CapsuleBottom, CapsuleTop, CharmArt, ItemIcon } from './art'
import { FamilyCheer } from './family'
import { Marquee } from './machine'
import { EmptyStamp, GotouchiStamp } from './stamp'
import { LevelTag } from './towns'
import { TONE_BG, TONE_INK, avgLead, isHit, isSharedPride, itemAmount, levelTag, levelText, lookOf, manNumber, nextSteps, prideMotif, shelfLine, tiesAtTop, toneOf } from './lib'

/* ───────── 小さな部品 ───────── */

const CONF_STYLE: Record<Confidence, string> = {
  確認済: 'border-[var(--ink)] bg-[var(--ink)] text-white',
  推定: 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]',
  仮置き: 'border-dashed border-[var(--ink-soft)] bg-transparent text-[var(--ink-soft)]',
}
export function Conf({ c }: { c: Confidence }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border-2 px-1.5 py-px text-[12px] font-black leading-tight', CONF_STYLE[c])}>{c}</span>
}

export function SectionTitle({ children, color = 'var(--yolk)', sub, id }: { children: ReactNode; color?: string; sub?: ReactNode; id?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="flex items-center gap-2 text-[19px] font-black leading-tight">
        <Capsule color={color} size={26} />
        {children}
      </h2>
      {sub && <p className="mt-1 text-[13px] font-bold leading-relaxed text-[var(--ink-soft)]">{sub}</p>}
    </div>
  )
}

function SourceLink({ s }: { s: Source }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-bold text-[var(--stay)] underline underline-offset-2">
      <ExternalLink className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
      <span>{s.label}</span>
    </a>
  )
}

function Sources({ list }: { list: Source[] }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-[40px] items-center gap-1 rounded-full py-2 pr-2 text-[13px] font-black underline decoration-2 underline-offset-4">
        <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
        出典を見る（{list.length}）
      </summary>
      {list.length ? (
        <ul className="mb-1 space-y-1 pl-1">
          {list.map((s) => (
            <li key={s.url} className="text-[12.5px] leading-snug">
              <SourceLink s={s} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-1 text-[12.5px] font-bold text-[var(--ink-soft)]">出典はまだありません（公開前に確かめます）。</p>
      )}
    </details>
  )
}

function Detail({ text }: { text: string }) {
  return (
    <details>
      <summary className="inline-flex min-h-[40px] items-center gap-1 py-2 pr-2 text-[13px] font-black underline decoration-2 underline-offset-4">
        <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
        計算の中身
      </summary>
      <p className="mb-1 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-2 text-[12.5px] leading-relaxed">{text}</p>
    </details>
  )
}

function CountUp({ yen }: { yen: number }) {
  const reduce = useReducedMotion()
  const target = manNumber(yen)
  const [v, setV] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) {
      setV(target)
      return
    }
    const t = window.setTimeout(() => setV(target), 380)
    return () => window.clearTimeout(t)
  }, [target, reduce])
  return <NumberFlow value={v} locales="ja-JP" format={{ maximumFractionDigits: 1 }} willChange className="va-num" />
}

function CityChip({ city, tag }: { city: City; tag: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-0.5 pl-1 pr-2.5">
      <Capsule color={lookOf(city).capsule} level={city.level} size={20} />
      <span className="min-w-0 truncate text-[12.5px] font-black leading-tight">
        <span className="text-[var(--ink-soft)]">{tag}</span> {city.name}
      </span>
    </span>
  )
}

// 見出しは「、」で2行にわけ、2行目は数字と単位の途中で折り返さない。
// 「…制度を確認中」のような長い2行目は、「確認中」の前で折れるようにする
function Headline({ text }: { text: string }) {
  const i = text.indexOf('、')
  if (i < 0) return <>{text}</>
  const second = text.slice(i + 1).trim()
  const j = second.indexOf('確認中')
  return (
    <>
      <span className="inline-block">{text.slice(0, i + 1)}</span>
      <br />
      {j > 0 ? (
        <>
          <span className="inline-block">{second.slice(0, j)}</span>
          <wbr />
          <span className="inline-block">{second.slice(j)}</span>
        </>
      ) : (
        <span className={cn('inline-block', /\d/.test(second) && 'whitespace-nowrap')}>{second}</span>
      )}
    </>
  )
}

export type SampleMark = 'all' | 'some' | null

// 家賃の目安。比較に入っていない街は、同じ統計の街データから補う（rank のくわしい街は家賃を持たないため）
export function rentOf(c: Comparison) {
  const fromCity = cityById(c.from.id)
  const toCity = cityById(c.to.id)
  const from = c.rent?.from ?? fromCity?.rent?.family ?? null
  const to = c.rent?.to ?? toCity?.rent?.family ?? null
  if (from === null && to === null) return null
  return {
    from,
    to,
    diff: from !== null && to !== null ? to - from : null,
    note: c.rent?.note ?? '借家に住んでいる世帯が払っている家賃の平均（居住室18〜24畳）。募集家賃とは違う。毎年の差には入れていない',
    source: c.rent?.source ?? toCity?.rent?.source ?? fromCity?.rent?.source,
  }
}
const manText = (yen: number) => `${(Math.round(yen / 1000) / 10).toFixed(1)}万円`

/* ───────── いちばん上のカプセル ───────── */

function AmountBox({ c, input }: { c: Comparison; input: FamilyInput }) {
  const tone = toneOf(c.perYear)
  const ev = everyday(c.perYear)
  const hit = isHit(c)
  const first = useMemo(() => (c.years > 1 ? compare({ ...input, years: 1 }, c.from, c.to) : null), [c, input])
  const showFirst = first && first.status !== 'unknown' && Math.abs(first.perYear - c.perYear) >= 10000
  const estimated = c.items.some((i) => !i.oneTime && i.total !== null && i.confidence !== '確認済')
  const unknownLabel = c.unknown.map((u) => u.label).join('・')
  const jump = () => document.getElementById('va-unknown')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (c.status === 'unknown') {
    return (
      <div className="mt-3.5 rounded-[14px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3 py-3 text-center">
        <p className="text-[12.5px] font-black text-[var(--ink-soft)]">毎年の差</p>
        <p className="va-pop text-[30px] leading-tight">確認中</p>
        <p className="mt-1 text-[13.5px] font-bold leading-relaxed">
          まだ比べられません。確認中：{unknownLabel}（合計に入れていません）
        </p>
        <button type="button" onClick={jump} className="mt-1.5 inline-flex min-h-[40px] items-center gap-1 text-[13px] font-black underline decoration-2 underline-offset-4">
          確認中の項目へ <ArrowDown className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </button>
        <p className="mt-1 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{c.excluded}</p>
      </div>
    )
  }

  const lead = c.status === 'partial' ? 'わかっている項目では ' : ''
  return (
    <div className="mt-3.5 rounded-[14px] border-[3px] border-[var(--ink)] px-3 pb-3 pt-2.5" style={{ background: hit ? 'var(--paper-2)' : TONE_BG[tone] }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[12px] font-black leading-tight">{c.perYearLabel}</span>
        {!hit && tone !== 'even' && (
          <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[12px] font-black leading-tight text-white">{tone === 'plus' ? `${c.to.name}だと得` : `${c.from.name}のままがお得`}</span>
        )}
      </div>
      {tone === 'even' ? (
        <div className="mt-1.5">
          <p className="text-[13px] font-black text-[var(--ink-soft)]">{lead}毎年の差は</p>
          <p className="va-pop text-[30px] leading-tight">ほぼ 0円</p>
          {c.status === 'ok' && <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">1年で1万円もちがいません</p>}
        </div>
      ) : (
        <>
          {lead && <p className="mt-1.5 text-[13px] font-black text-[var(--ink-soft)]">{lead.trim()}</p>}
          <p className="va-pop mt-1 text-[34px] leading-none" style={{ color: hit ? 'var(--ink)' : TONE_INK[tone] }}>
            <span className="text-[16px]">年 約</span>
            <CountUp yen={c.perYear} />
            <span className="text-[16px]">万円</span>
          </p>
          <p className="mt-1.5 text-[13.5px] font-black">
            {c.years > 1 ? `${avgLead(c.years)}、` : ''}
            {ev.month}・{ev.day}
          </p>
        </>
      )}
      {(showFirst || c.years > 1) && tone !== 'even' && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-t-2 border-dashed border-[var(--ink)]/30 pt-2 text-[13px] font-bold">
          {showFirst && first && (
            <>
              <dt className="text-[var(--ink-soft)]">はじめの1年</dt>
              <dd className="text-right font-black">
                {first.perYear >= 0 ? '' : `${c.from.name}のままが `}年 約{yenMan(Math.abs(first.perYear))}
              </dd>
            </>
          )}
          {c.years > 1 && (
            <>
              <dt className="text-[var(--ink-soft)]">{c.years}年の合計</dt>
              <dd className="text-right font-black">約{yenMan(Math.abs(c.total))}</dd>
            </>
          )}
        </dl>
      )}
      {showFirst && c.items.some((i) => i.key === 'nursery' && i.perYear !== null) && (
        <p className="mt-1 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">保育料の差は、0〜2歳で保育園に通う年だけ。{c.years}年でならすと小さくなります。</p>
      )}
      {estimated && (
        <p className="mt-1.5 text-[12px] font-bold text-[var(--ink-soft)]">
          <Conf c="推定" /> の数字をふくみます
        </p>
      )}
      <p className="mt-1.5 border-t-2 border-dashed border-[var(--ink)]/30 pt-1.5 text-[12.5px] font-bold leading-snug">{c.excluded}</p>
      {c.status === 'partial' && (
        <button type="button" onClick={jump} className="inline-flex min-h-[40px] items-center gap-1 text-left text-[13px] font-black underline decoration-2 underline-offset-4">
          確認中の項目を見る <ArrowDown className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  )
}

// 家賃の目安：毎年の差とは別の札
export function RentTag({ c, compact = false }: { c: Comparison; compact?: boolean }) {
  const r = rentOf(c)
  if (!r) return null
  return (
    <div className={cn('relative rounded-[12px] border-[3px] border-[var(--ink)] bg-[#fff7e0] pl-7 pr-3 py-2.5', compact ? 'mt-2' : 'mt-3')}>
      <span aria-hidden className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)]" />
      <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] font-black">
        家賃の目安
        <span className="rounded-full border-2 border-[var(--ink)]/60 px-1.5 text-[12px] font-bold leading-tight text-[var(--ink-soft)]">上の金額とは別</span>
      </p>
      <p className="mt-0.5 text-[14px] font-black leading-snug">
        {c.from.name} {r.from !== null ? `月${manText(r.from)}` : 'データなし'}
        <span className="mx-1 text-[var(--ink-soft)]">→</span>
        {c.to.name} {r.to !== null ? `月${manText(r.to)}` : 'データなし'}
        {r.diff !== null && (
          <span className="ml-1 text-[13px] font-bold text-[var(--ink-soft)]">（{Math.abs(r.diff) < 1000 ? 'ほぼ同じ' : `${r.diff > 0 ? '＋' : '−'}${manText(Math.abs(r.diff))}`}）</span>
        )}
      </p>
      {!compact && <p className="mt-1 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{r.note}。</p>}
      {!compact && r.source && (
        <p className="mt-0.5 text-[12px] leading-snug">
          <SourceLink s={r.source} />
        </p>
      )}
    </div>
  )
}

export function CareNote({ c }: { c: Comparison }) {
  if (!c.care) return null
  const hit = c.care.level === 'hit'
  return (
    <aside aria-label="災害への配慮" className={cn('rounded-[14px] border-[3px] px-3 py-2.5', hit ? 'border-[var(--stay)] bg-[var(--stay-bg)]' : 'border-[var(--ink)]/40 bg-[var(--paper-2)]')}>
      <div className="flex items-start gap-2">
        <ItemIcon name="care" size={30} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-black leading-relaxed">{c.care.note}</p>
          <ul className="mt-1 space-y-0.5 text-[12.5px] leading-snug">
            {c.care.sources.map((s) => (
              <li key={s.url}>
                <SourceLink s={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

export function MainCapsule({ c, input, sample }: { c: Comparison; input: FamilyInput; sample: SampleMark }) {
  const reduce = useReducedMotion()
  const tone = toneOf(c.perYear)
  const look = lookOf(c.to)
  const hit = isHit(c)
  const headline = hit ? `${c.to.name}の子育ての制度` : c.headline
  const color = hit || c.status === 'unknown' || tone === 'even' ? 'var(--ink)' : TONE_INK[tone]
  return (
    <section aria-labelledby="va-headline" className="va-paper relative overflow-hidden px-4 pb-4 pt-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <CityChip city={c.from} tag="いま" />
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={3} aria-label="から" />
        <CityChip city={c.to} tag="候補" />
        {sample && (
          <span className="ml-auto rounded-[6px] border-2 border-[var(--red-text)] px-1.5 text-[12px] font-black text-[var(--red-text)]">{sample === 'all' ? '入力例で計算' : '一部は入力例で計算'}</span>
        )}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={c.to.id}
          className="relative mx-auto mt-1 h-[186px] w-full max-w-[320px]"
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
        >
          <CapsuleTop size={100} className="absolute left-0 top-3 -rotate-[32deg]" />
          <CapsuleBottom size={100} color={look.capsule} level={c.to.level} className="absolute bottom-3 right-0 rotate-[16deg]" />
          <motion.div
            className="absolute left-1/2 top-1/2 -ml-[82px] -mt-[82px]"
            initial={reduce ? false : { scale: 1.9, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: -7 }}
            transition={{ type: 'spring', stiffness: 480, damping: 20, delay: 0.1 }}
          >
            <GotouchiStamp city={c.to} size={164} />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <p className="text-[13px] font-black text-[var(--ink-soft)]">
          {c.to.pref} {c.to.name} のカプセル
        </p>
        <LevelTag city={c.to} />
      </div>
      <h1 id="va-headline" tabIndex={-1} className={cn('va-pop mt-1 text-center leading-snug outline-none [overflow-wrap:anywhere] [word-break:keep-all] focus-visible:outline-[3px] focus-visible:outline-[var(--ink)]', [...headline].length > 18 ? 'text-[21px]' : 'text-[24px]')} style={{ color }}>
        <Headline text={headline} />
      </h1>
      <p className="mt-1.5 text-center text-[13.5px] font-bold leading-relaxed text-[var(--ink-soft)] [overflow-wrap:anywhere] [word-break:keep-all]">{c.subline}</p>
      {c.to.level !== 'detailed' && <p className="mt-1.5 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-1.5 text-center text-[12.5px] font-bold leading-snug">{c.to.name}は、{levelText(c.to)}。</p>}
      {hit && (
        <div className="mt-2.5">
          <CareNote c={c} />
        </div>
      )}
      <AmountBox c={c} input={input} />
      <RentTag c={c} />
    </section>
  )
}

/* ───────── 家族の顔と貯金箱 ───────── */

export function FamilyFaces({ c, input }: { c: Comparison; input: FamilyInput }) {
  const hit = isHit(c)
  const mood = hit && c.mood < 0 ? 0 : c.mood
  // ほぼ同じ（mood 0）でも1万円以上の差があるときは、金額の言いかえを前に置く（見出しと食いちがわないように）
  const lead = c.status !== 'unknown' && !hit && mood === 0 && toneOf(c.perYear) !== 'even' ? `${everyday(c.perYear).month}の差。` : ''
  return (
    <section aria-label="家族の顔" className="va-paper px-3 pb-4 pt-3">
      <h2 className="text-[15px] font-black">家族の顔</h2>
      <div className="mt-1.5">
        <FamilyCheer key={`${c.to.id}-${c.mood}`} input={input} mood={mood} still={hit} />
      </div>
      <div className="relative mt-3">
        <span aria-hidden className="absolute -top-[11px] right-[42px] h-0 w-0 border-x-[10px] border-b-[11px] border-x-transparent border-b-[var(--ink)]" />
        <span aria-hidden className="absolute -top-[7px] right-[44px] h-0 w-0 border-x-[8px] border-b-[9px] border-x-transparent border-b-[var(--paper-2)]" />
        <p className="rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2 text-[14px] font-black leading-relaxed">
          {lead}
          {moodText(c)}
        </p>
      </div>
    </section>
  )
}

/* ───────── 説明書（項目ごと） ───────── */

function ManualCard({ i, c, n, total }: { i: Breakdown; c: Comparison; n: number; total: number }) {
  const a = itemAmount(i, c)
  const color = isHit(c) ? 'var(--ink)' : a.tone === 'plus' || a.tone === 'stay' || a.tone === 'even' ? TONE_INK[a.tone] : 'var(--ink)'
  return (
    <article className="va-manual relative">
      <div className="flex items-center justify-between gap-2 rounded-t-[12px] bg-[var(--ink)] px-3 py-1 text-[12px] font-black text-white">
        <span>説明書 {n}/{total}</span>
        <span className="text-white/85">{i.who}</span>
      </div>
      <div className="px-3.5 pb-2 pt-2.5">
        <div className="flex items-start gap-3">
          <ItemIcon name={i.icon} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-[16px] font-black leading-snug">{i.label}</h3>
              <Conf c={i.confidence} />
            </div>
            {c.years > 1 && i.perYear !== null && Math.abs(i.perYear) >= 1000 && <p className="mt-0.5 text-[12px] font-bold text-[var(--ink-soft)]">{c.years}年でならすと</p>}
            <p className="text-[16px] font-black leading-snug" style={{ color }}>
              {a.text}
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-[14px] font-medium leading-relaxed">{i.plain}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-4">
          <Detail text={i.detail} />
          <Sources list={i.sources} />
        </div>
      </div>
    </article>
  )
}

/* ───────── おまけ（アクリルのキーホルダー） ───────── */

function KeyChain({ art, glyph, color, label, children }: { art: Parameters<typeof CharmArt>[0]['motif']; glyph: string; color: string; label: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.6, once: true })
  const swing = () => {
    if (reduce) return
    controls.start({ rotate: [0, 15, -11, 7, -3.5, 1.5, 0], transition: { duration: 2, ease: 'easeOut' } })
  }
  useEffect(() => {
    if (inView) swing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])
  return (
    <article ref={ref} className="va-card relative rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 pb-3 pt-3 shadow-[3px_4px_0_var(--ink)] sm:grid sm:grid-cols-[176px_minmax(0,1fr)] sm:items-center sm:gap-4">
      {/* 台紙の吊り下げ穴 */}
      <span aria-hidden className="absolute left-1/2 top-2 h-3 w-9 -translate-x-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)] sm:left-[100px]" />
      <div className="flex justify-center pt-2">
        <button type="button" onClick={swing} aria-label={`おまけのキーホルダー（${label}）をゆらす`} className="flex flex-col items-center rounded-[16px]">
          <motion.div animate={controls} className="flex flex-col items-center" style={{ originY: 0 }}>
            {/* 金具と玉チェーン */}
            <svg aria-hidden width="30" height="52" viewBox="0 0 30 52">
              <path d="M15 2 Q22 2 22 8 Q22 13 15 13 Q8 13 8 8" fill="none" stroke="#8a909c" strokeWidth="3" strokeLinecap="round" />
              {[18, 24, 30, 36].map((y) => (
                <circle key={y} cx="15" cy={y} r="2.4" fill="#c4cad3" stroke="var(--ink)" strokeWidth="1.2" />
              ))}
              <circle cx="15" cy="45" r="6" fill="none" stroke="#8a909c" strokeWidth="3" />
            </svg>
            <div className="relative -mt-1.5 rounded-[30px] border-[3px] border-[var(--ink)] bg-white/80 p-[7px] shadow-[3px_4px_0_rgba(31,36,48,0.22)]">
              <span aria-hidden className="absolute left-1/2 top-[6px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--bg)]" />
              <svg viewBox="0 0 120 120" width="128" height="128" aria-hidden>
                <CharmArt motif={art} glyph={glyph} color={color} />
              </svg>
              <span aria-hidden className="pointer-events-none absolute left-[18%] top-[14%] h-[64%] w-[10px] -rotate-[28deg] rounded-full bg-white/55" />
            </div>
          </motion.div>
        </button>
      </div>
      <div className="mt-3 border-t-2 border-dashed border-[var(--ink)]/30 pt-2.5 sm:mt-0 sm:border-l-2 sm:border-t-0 sm:pl-4 sm:pt-0">{children}</div>
    </article>
  )
}

export function Omake({ c }: { c: Comparison }) {
  const city = c.to
  const look = lookOf(city)
  const main: Pride | undefined = look.pride ?? city.pride[0]
  const rest = city.pride.filter((p) => p !== main)
  const title = (p: Pride) => (isSharedPride(p) ? `${city.pref}の自慢` : p.kind === 'food' || p.kind === 'craft' ? `${city.name}の名物` : `${city.name}の自慢`)
  return (
    <section aria-labelledby="va-omake">
      <SectionTitle id="va-omake" color={look.capsule} sub={`カプセルに入っていた、${city.name}のおまけ。押すとゆれます。`}>
        おまけ
      </SectionTitle>
      <KeyChain art={main ? prideMotif(main) : null} glyph={look.glyph} color={look.capsule} label={main ? main.label : city.name}>
        {main ? (
          <>
            <p className="text-[12px] font-black text-[var(--ink-soft)]">{title(main)}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-[17px] font-black leading-snug">{main.label}</h3>
              <Conf c={main.confidence} />
            </div>
            <p className="mt-0.5 text-[14px] leading-relaxed">{main.fact}</p>
            {main.source && (
              <p className="mt-1 text-[12.5px] leading-snug">
                <SourceLink s={main.source} />
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[12px] font-black text-[var(--ink-soft)]">{city.name}のことば</p>
            <p className="mt-0.5 text-[15px] font-black leading-relaxed">「{city.phrase || city.name}」</p>
            <p className="mt-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">名物はまだ調べていません。街のキャッチフレーズを入れました。</p>
          </>
        )}
        {rest.map((p) => (
          <p key={p.label} className="mt-2 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-1.5 text-[13px] leading-relaxed">
            <span className="font-black">
              {title(p)}：{p.label}
            </span>{' '}
            {p.fact}
          </p>
        ))}
        {main && city.phrase && (
          <p className="mt-2 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
            街のことば「{city.phrase}」
          </p>
        )}
      </KeyChain>
    </section>
  )
}

/* ───────── 中身（説明書・確認中・一度きり・おまけ） ───────── */

export function CapsuleContents({ c }: { c: Comparison }) {
  const known = c.items.filter((i) => !i.oneTime && i.total !== null)
  const once = c.items.filter((i) => i.oneTime)
  return (
    <div className="space-y-8">
      {c.care && !isHit(c) && <CareNote c={c} />}
      <section aria-labelledby="va-manuals">
        <SectionTitle
          id="va-manuals"
          sub={`項目ごとに、どちらの街がいくら得かを分けました。${c.years > 1 ? `金額は${c.years}年でならした1年あたりです。` : ''}小さな札は数字の確からしさです（確認済＝公式で確かめた／推定＝根拠つきの見込み／仮置き＝まだ確かめていない）。`}
        >
          カプセルの中身
        </SectionTitle>
        <div className="space-y-3.5">
          {known.map((i, n) => (
            <ManualCard key={i.key} i={i} c={c} n={n + 1} total={known.length} />
          ))}
          {!known.length && (
            <p className="va-paper px-4 py-3 text-[14px] font-bold leading-relaxed">
              {c.unknown.length ? 'わかっている項目がまだありません。下の「確認中」を見てください。' : 'この家族では、毎年の差になる制度が見つかりませんでした。'}
            </p>
          )}
        </div>
      </section>

      {c.unknown.length > 0 && (
        <section id="va-unknown" aria-labelledby="va-unknown-h" className="scroll-mt-4">
          <SectionTitle id="va-unknown-h" color="#c9ced6" sub="まだ確かめられていないので、0円とはせず、合計にも入れていません。">
            確認中
          </SectionTitle>
          <div className="space-y-3">
            {c.unknown.map((u) => (
              <article key={u.key} className="rounded-[18px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3.5 pb-2 pt-3">
                <div className="flex items-start gap-3">
                  <ItemIcon name="unknown" size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[16px] font-black leading-snug">{u.label}</h3>
                      <span className="rounded-full border-2 border-dashed border-[var(--ink)] px-1.5 text-[12px] font-black">確認中</span>
                    </div>
                    <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">かかわる人：{u.who}</p>
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed">{u.plain}</p>
                <div className="flex flex-wrap gap-x-4">
                  <Detail text={u.detail} />
                  <Sources list={u.sources} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {once.length > 0 && (
        <section aria-labelledby="va-once">
          <SectionTitle id="va-once" color="var(--yolk)" sub="引っ越したときに一度だけもらえるお金です。毎年の差とは別に数えていて、家族の顔にも、並び順にも入れていません。">
            一度きりのお金
          </SectionTitle>
          <div className="space-y-3">
            {once.map((i) => (
              <article key={i.key} className="rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3.5 pb-2 pt-3 shadow-[3px_4px_0_var(--ink)]" style={{ outline: '3px dashed var(--yolk-deep)', outlineOffset: -9 }}>
                <div className="flex items-start gap-3">
                  <ItemIcon name={i.icon} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[16px] font-black leading-snug">{i.label}</h3>
                      <Conf c={i.confidence} />
                    </div>
                    <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">かかわる人：{i.who}</p>
                  </div>
                </div>
                <p className="va-pop mt-2 text-[22px] leading-tight">最大 約{yenMan(i.total ?? 0, 0)}（条件つき）</p>
                <p className="mt-1 text-[14px] leading-relaxed">{i.plain}</p>
                <div className="flex flex-wrap gap-x-4">
                  <Detail text={i.detail} />
                  <Sources list={i.sources} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Omake c={c} />
    </div>
  )
}

/* ───────── 棚とスタンプ帳 ───────── */

export function Shelf({ ranked, sel, onSelect, limit = 12 }: { ranked: Comparison[]; sel: number; onSelect: (i: number) => void; limit?: number }) {
  const [all, setAll] = useState(false)
  const ties = tiesAtTop(ranked)
  const list = all ? ranked : ranked.slice(0, limit)
  return (
    <div>
      <ul className="va-shelf -mx-1 flex overflow-x-auto px-1 pb-1 pt-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] lg:overflow-visible">
        {list.map((r, i) => {
          const on = i === sel
          const line = shelfLine(r)
          const tag = i === 0 && ties === 1 ? 'いちばん上' : ties > 1 && i < ties && r.status !== 'unknown' ? '同じ額' : null
          const labelColor = line.tone === 'plus' || line.tone === 'stay' ? TONE_INK[line.tone] : 'var(--ink-soft)'
          return (
            <li key={r.to.id} className="va-plank flex w-[124px] shrink-0 snap-start flex-col items-center px-1 pb-3 pt-1 lg:w-auto">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={on}
                aria-label={`${r.to.pref}${r.to.name}（${levelTag(r.to)}）：${isHit(r) ? '損得の演出は出していません' : r.headline}${r.oneTime ? `。一度きり 最大 約${yenMan(r.oneTime, 0)}` : ''}${r.unknown.length ? '。確認中の項目あり' : ''}${tag ? `。${tag}` : ''}`}
                className={cn('relative flex w-full flex-col items-center rounded-[14px] px-1 pb-1.5 pt-2.5 text-center transition-colors', on ? 'bg-[var(--yolk)] shadow-[0_0_0_3px_var(--ink)]' : 'hover:bg-white/70')}
              >
                {tag && (
                  <span className={cn('absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-1.5 text-[12px] font-black', tag === 'いちばん上' ? 'bg-[var(--red)] text-white' : 'bg-[var(--paper)]')}>
                    {tag}
                  </span>
                )}
                <Capsule color={lookOf(r.to).capsule} level={r.to.level} size={50} />
                <span className="mt-0.5 text-[12px] font-bold leading-none text-[var(--ink-soft)]">{r.to.pref}</span>
                <span className="text-[15px] font-black leading-tight">{r.to.name}</span>
                {/* 値札 */}
                <span className="relative mt-1.5 inline-block -rotate-2 rounded-[6px] border-2 border-[var(--ink)] bg-white px-1.5 pb-0.5 pt-1 text-[12px] font-black leading-tight" style={{ color: labelColor }}>
                  <span aria-hidden className="absolute -top-[5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]" />
                  {line.l1}
                  {line.l2 && <br />}
                  {line.l2}
                </span>
                {(r.oneTime > 0 || r.unknown.length > 0) && (
                  <span className="mt-1 flex flex-wrap justify-center gap-1">
                    {r.oneTime > 0 && <span className="rounded-full bg-[var(--ink)] px-1.5 text-[12px] font-black text-[var(--yolk)]">一度きりあり</span>}
                    {r.unknown.length > 0 && r.status !== 'unknown' && <span className="rounded-full border border-dashed border-[var(--ink-soft)] px-1.5 text-[12px] font-black text-[var(--ink-soft)]">確認中あり</span>}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {ranked.length > limit && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 min-h-[40px] w-full rounded-[10px] border-[2.5px] border-dashed border-[var(--ink)] bg-white/60 text-[13px] font-black">
          {all ? '棚をたたむ' : `ほかの${ranked.length - limit}個も棚に出す`}
        </button>
      )}
    </div>
  )
}

export function StampBook({ ids, waiting = [], onClear }: { ids: string[]; waiting?: City[]; onClear: () => void }) {
  const opened = ids.map((id) => cityById(id)).filter(Boolean).reverse()
  const shown = opened.slice(0, 18)
  const wait = waiting.filter((c) => !ids.includes(c.id)).slice(0, 4)
  const [ask, setAsk] = useState(false)
  return (
    <div className="va-book relative rounded-[18px] border-[3px] border-[var(--ink)] bg-[#f6f1e3] pb-3 pl-9 pr-3 pt-3 shadow-[3px_4px_0_var(--ink)]">
      {/* リングとじ */}
      <div aria-hidden className="absolute bottom-4 left-1.5 top-4 flex flex-col justify-around">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="block h-[14px] w-[22px] rounded-full border-[3px] border-[#8a909c] bg-transparent" />
        ))}
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-black">開けた街 {opened.length}個</p>
        {opened.length > 0 &&
          (ask ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClear()
                  setAsk(false)
                }}
                className="min-h-[36px] rounded-full border-2 border-[var(--ink)] bg-[var(--red)] px-2.5 text-[12px] font-black text-white"
              >
                消す
              </button>
              <button type="button" onClick={() => setAsk(false)} className="min-h-[36px] rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 text-[12px] font-black">
                やめる
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setAsk(true)} className="inline-flex min-h-[36px] items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 text-[12px] font-black">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              スタンプ帳を消す
            </button>
          ))}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-x-1 gap-y-2">
        {shown.map((city) => (
          <li key={city.id} className="flex flex-col items-center">
            <GotouchiStamp city={city} size={74} />
            <span className="mt-0.5 max-w-full truncate text-[12px] font-black leading-tight text-[var(--ink)]">{city.name}</span>
          </li>
        ))}
        {wait.map((city) => (
          <li key={city.id} className="flex flex-col items-center">
            <EmptyStamp size={74} name={city.name} />
            <span className="mt-0.5 text-[12px] font-black leading-tight text-[var(--ink-soft)]">まだ</span>
          </li>
        ))}
      </ul>
      {opened.length > shown.length && <p className="mt-2 text-[12px] font-bold text-[var(--ink-soft)]">ほかに{opened.length - shown.length}個あります。</p>}
      <p className="mt-2 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">開けた街の名前だけを、この端末に残しています。家族のことは残しません。</p>
    </div>
  )
}

/* ───────── 次の一歩・PR・ご注意 ───────── */

export function NextStepsBox({ c, others }: { c: Comparison; others: number }) {
  const steps = nextSteps(c, others)
  return (
    <section aria-labelledby="va-next">
      <SectionTitle id="va-next" color="var(--mint)">
        次の一歩
      </SectionTitle>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.text} className="flex items-start gap-2.5 rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5">
            <span className="va-pop grid h-7 w-7 shrink-0 place-items-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--mint)] text-[14px]">{i + 1}</span>
            <span className="min-w-0 pt-0.5 text-[14.5px] font-bold leading-relaxed [overflow-wrap:anywhere] [word-break:keep-all]">
              {s.text}
              {s.href && (
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-[13px] font-black text-[var(--stay)] underline underline-offset-2">
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  {s.link ?? '公式のページ'}
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
      <aside aria-label="広告の枠（PR・提携後に表示）" className="va-pr mt-4 px-4 py-4">
        <p className="flex items-center gap-2">
          <span className="rounded-[6px] bg-[#5a6170] px-2 py-0.5 text-[12px] font-black tracking-wider text-white">PR</span>
          <span className="text-[13px] font-black text-[#4b5260]">提携後に表示</span>
        </p>
        <p className="mt-2 text-[13px] font-bold leading-relaxed text-[#4b5260]">引っ越しや住まい探しのサービスが入る予定の枠です。試作なので、まだリンクはありません。上の結果とは関係なく表示されます。</p>
      </aside>
    </section>
  )
}

const CFA = ALL_CITIES.flatMap((c) => c.medical.sources).find((s) => s.url.includes('cfa.go.jp'))
const ESTAT = ALL_CITIES.find((c) => c.rent)?.rent?.source

export function Notice() {
  return (
    <footer className="rounded-[14px] border-2 border-[var(--ink)]/30 bg-white/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--ink)]">
      <p className="font-black">ご注意</p>
      <p className="mt-1">{DISCLAIMER}</p>
      <p className="mt-1">データは{DATA_AS_OF}時点。上の金額は子育ての制度の差だけで、家賃・通勤費・税金は入っていません（家賃は目安として別に出しています）。</p>
      <p className="mt-1">入力した家族のことは、この端末の中だけで使い、どこにも送りません。出てくる街は計算で決まり、くじではありません。</p>
      <p className="mt-2 font-black">出典</p>
      <ul className="mt-0.5 space-y-0.5">
        <li>
          <SourceLink s={MUNI_SOURCE} />
        </li>
        {CFA && (
          <li>
            <SourceLink s={{ ...CFA, label: `${CFA.label}を加工して作成` }} />
          </li>
        )}
        {ESTAT && (
          <li>
            <SourceLink s={{ ...ESTAT, label: ESTAT.label.includes('加工') ? ESTAT.label : `${ESTAT.label}を加工して作成` }} />
          </li>
        )}
      </ul>
    </footer>
  )
}

export function RetryButtons({ onRetry, onRestart, retryLabel = '条件を変えてもう1回' }: { onRetry: () => void; onRestart: () => void; retryLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <button type="button" onClick={onRetry} className="va-push inline-flex w-full max-w-[360px] items-center justify-center gap-2 px-6 py-3.5 text-[18px] font-black">
        <RotateCcw className="h-5 w-5" strokeWidth={3} aria-hidden />
        {retryLabel}
      </button>
      <button type="button" onClick={onRestart} className="min-h-[40px] text-[13px] font-black underline decoration-2 underline-offset-4">
        はじめの画面にもどる
      </button>
    </div>
  )
}

export function ResultHeader({ onBack, backLabel = '条件を変える' }: { onBack: () => void; backLabel?: string }) {
  return (
    <header className="mb-3 flex items-center justify-between gap-2">
      <button type="button" onClick={onBack} className="inline-flex min-h-[40px] items-center gap-1 rounded-full border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-[13px] font-black">
        <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden />
        {backLabel}
      </button>
      <Marquee size="small" />
    </header>
  )
}

/* ───────── 結果の画面（おまかせ） ───────── */

export function Result({ input, ranked, sel, onSelect, onRetry, onRestart, sample, book, onClearBook }: {
  input: FamilyInput
  ranked: Comparison[]
  sel: number
  onSelect: (i: number) => void
  onRetry: () => void
  onRestart: () => void
  sample: SampleMark
  book: string[]
  onClearBook: () => void
}) {
  const c = ranked[sel]
  const ties = tiesAtTop(ranked)
  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 pb-10 pt-3 sm:px-4">
      <ResultHeader onBack={onRetry} />
      <DetailGrid
        c={c}
        input={input}
        sample={sample}
        side={
          <section aria-labelledby="va-shelf">
            <SectionTitle
              id="va-shelf"
              color="var(--sky)"
              sub={`ほかの候補も棚にならんでいます。押すと、そのカプセルを開けます。並び順は、毎年の差が大きい順（確認中だけの街は後ろ）。一度きりのお金は並びに入れていません。${ties > 1 ? `上の${ties}つは同じ額です。` : ''}`}
            >
              ほかのカプセル
            </SectionTitle>
            <Shelf ranked={ranked} sel={sel} onSelect={onSelect} />
          </section>
        }
        book={<StampBook ids={book} waiting={ranked.slice(0, 6).map((r) => r.to)} onClear={onClearBook} />}
        bottom={
          <>
            <NextStepsBox c={c} others={ranked.length - 1} />
            <RetryButtons onRetry={onRetry} onRestart={onRestart} />
            <Notice />
          </>
        }
      />
    </div>
  )
}

// 1440px では3列：左にカプセル（固定）、真ん中に説明書、右に棚とスタンプ帳。スマホでは1列。
export function DetailGrid({ c, input, sample, side, book, bottom }: { c: Comparison; input: FamilyInput; sample: SampleMark; side?: ReactNode; book?: ReactNode; bottom: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 lg:grid lg:max-w-none lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-7 xl:grid-cols-[380px_minmax(0,580px)_minmax(0,1fr)]">
      <div className="order-1 lg:sticky lg:top-3 lg:col-start-1 lg:row-span-4 lg:row-start-1">
        <MainCapsule c={c} input={input} sample={sample} />
      </div>
      <div className="order-2 space-y-8 lg:col-start-2 xl:row-start-1">
        <FamilyFaces c={c} input={input} />
        <CapsuleContents c={c} />
      </div>
      {(side || book) && (
        <div className="order-3 space-y-8 lg:col-start-2 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          {side}
          {book && (
            <section aria-labelledby="va-book">
              <SectionTitle id="va-book" color="#f2c4a0" sub="開けた街のはんこがたまります。">
                スタンプ帳
              </SectionTitle>
              {book}
            </section>
          )}
        </div>
      )}
      <div className="order-4 space-y-8 lg:col-start-2 xl:row-start-2">{bottom}</div>
    </div>
  )
}
