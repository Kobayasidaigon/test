// 案A「カプセルトイ」 — 結果：カプセルの中身（はんこ・金額・家賃と待機児童の目安・家族の顔・説明書・確認中・一度きり・おまけ・棚・スタンプ帳・次の一歩）
import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useAnimationControls, useInView, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight, ChevronRight, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { DATA_AS_OF, DISCLAIMER, MUNI_SOURCE, NATIONAL_SOURCES, REFERENCE_SOURCES, cityById, compare, yenMan } from '@/shared'
import type { Breakdown, Care, City, Comparison, Confidence, FamilyInput, Mood, Pride, Source } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, CapsuleBottom, CapsuleTop, CharmArt, Coin, ItemIcon, Piggy } from './art'
import { FamilyCheer } from './family'
import { Marquee } from './machine'
import { EmptyStamp, GotouchiStamp } from './stamp'
import { LevelTag } from './towns'
import {
  TONE_BG, TONE_INK, avgLead, everydayText, fromHit, headlineOf, ijuState, isHit, isPending, isSharedPride, itemAmount, levelTag, levelText, lookOf, manNumber,
  missingText, moodLine, nextSteps, onceShort, perYearChip, prefKind, prideIsPref, scopeOf, shelfLine, sublineOf, thinText, tiesAtTop, toneOf, waitDraft, waitOf, waitText,
  type ShelfExtra,
} from './lib'

/* ───────── 小さな部品 ───────── */

const CONF_STYLE: Record<Confidence, string> = {
  確認済: 'border-[var(--ink)] bg-[var(--ink)] text-white',
  推定: 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]',
  仮置き: 'border-dashed border-[var(--ink-soft)] bg-transparent text-[var(--ink-soft)]',
}
export function Conf({ c }: { c: Confidence }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border-2 px-1.5 py-px text-[12px] font-black leading-tight', CONF_STYLE[c])}>{c}</span>
}

// 確からしさの札の凡例（長い説明文のかわりに、3つの札をならべる）
function ConfLegend() {
  const rows: [Confidence, string][] = [
    ['確認済', '公式で確かめた'],
    ['推定', '根拠つきの見込み'],
    ['仮置き', 'まだ確かめていない'],
  ]
  return (
    <ul aria-label="数字の確からしさの札" className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {rows.map(([c, t]) => (
        <li key={c} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--ink-soft)]">
          <Conf c={c} />
          {t}
        </li>
      ))}
    </ul>
  )
}

export function SectionTitle({ children, color = 'var(--yolk)', sub, id }: { children: ReactNode; color?: string; sub?: ReactNode; id?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="flex items-center gap-2 text-[19px] font-black leading-tight">
        <Capsule color={color} size={26} />
        {children}
      </h2>
      {sub && <div className="mt-1 text-[13px] font-bold leading-relaxed text-[var(--ink-soft)]">{sub}</div>}
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

// 金額のとなりの小さな貯金箱。スマホの最初の画面でも、うれしい・しょんぼりが字を読まずに分かるように（表情は mood だけで決める）
function BoxPiggy({ mood }: { mood: Mood }) {
  const reduce = useReducedMotion()
  const controls = useAnimationControls()
  useEffect(() => {
    if (reduce || mood === 0) return
    const t = window.setTimeout(() => {
      if (mood > 0) controls.start({ y: [0, -14, 0, -6, 0], rotate: [0, -6, 0, 4, 0], transition: { duration: 0.9, ease: 'easeOut' } })
      else controls.start({ scaleY: [1, 0.92, 1, 0.94, 1], y: [0, 2, 0, 2, 0], transition: { duration: 2.2, ease: 'easeInOut' } })
    }, 650)
    return () => window.clearTimeout(t)
  }, [mood, reduce, controls])
  return (
    <motion.div aria-hidden animate={controls} className="relative -mb-1 shrink-0" style={{ originY: 1 }}>
      {mood > 0 && !reduce && (
        <motion.span
          className="absolute -top-1 left-1/2 -ml-[9px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [6, -18, -26, -32], rotate: [0, 0, 30, 60] }}
          transition={{ duration: 1.1, delay: 0.85, times: [0, 0.25, 0.7, 1] }}
        >
          <Coin size={18} />
        </motion.span>
      )}
      <Piggy mood={mood} width={56} />
    </motion.div>
  )
}

function AmountBox({ c, input }: { c: Comparison; input: FamilyInput }) {
  const scope = scopeOf(c)
  const tone = toneOf(c.perYear)
  const ev = everydayText(c.perYear)
  const first = useMemo(() => (c.years > 1 ? compare({ ...input, years: 1 }, c.from, c.to) : null), [c, input])
  const showFirst = first && first.status !== 'unknown' && Math.abs(first.perYear - c.perYear) >= 10000
  const estimated = c.items.some((i) => !i.oneTime && i.total !== null && i.confidence !== '確認済')
  const unknownLabel = c.unknown.map((u) => u.label).join('・')
  const jump = () => document.getElementById('va-unknown')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // 被災した街：金額を大きく出さず、向き（得・損）も書かない
  if (scope === 'care') {
    return (
      <div className="mt-3.5 rounded-[14px] border-[3px] border-[var(--stay)] bg-[var(--paper-2)] px-3 py-3">
        <p className="text-[12.5px] font-black text-[var(--ink-soft)]">金額でのくらべ</p>
        <p className="mt-0.5 text-[15px] font-black leading-relaxed">
          {c.to.name}は地震のあと、くらしの状況が変わっています。金額でくらべるのは控えて、制度の中身だけを下に書いています。
        </p>
      </div>
    )
  }

  if (scope === 'unknown') {
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

  // くわしくない街で、わかる差が1万円未満：「ほぼ0円」とは言わない
  if (scope === 'thin') {
    return (
      <div className="mt-3.5 rounded-[14px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3 py-3 text-center">
        <p className="text-[12.5px] font-black text-[var(--ink-soft)]">毎年の差</p>
        <p className="va-pop text-[26px] leading-tight">まだ分かりません</p>
        <p className="mt-1.5 text-left text-[13.5px] font-bold leading-relaxed">{thinText(c)}</p>
        <p className="mt-1.5 border-t-2 border-dashed border-[var(--ink)]/30 pt-1.5 text-left text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{c.excluded}</p>
      </div>
    )
  }

  const lead = c.status === 'partial' ? 'わかっている項目では' : scope === 'known' ? 'わかっている制度では' : ''
  return (
    <div className="mt-3.5 rounded-[14px] border-[3px] border-[var(--ink)] px-3 pb-3 pt-2.5" style={{ background: TONE_BG[tone] }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[12px] font-black leading-tight">{perYearChip(c)}</span>
        {tone !== 'even' && (
          <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[12px] font-black leading-tight text-white">{tone === 'plus' ? `${c.to.name}だと得` : `${c.from.name}のままがお得`}</span>
        )}
      </div>
      {tone === 'even' ? (
        <div className="mt-1.5">
          <p className="text-[13px] font-black text-[var(--ink-soft)]">{lead ? `${lead}、` : ''}毎年の差は</p>
          {c.status === 'partial' ? (
            <p className="va-pop text-[26px] leading-tight">年1万円未満</p>
          ) : (
            <>
              <p className="va-pop text-[30px] leading-tight">ほぼ 0円</p>
              <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">1年で1万円もちがいません</p>
            </>
          )}
        </div>
      ) : (
        <>
          {lead && <p className="mt-1.5 text-[13px] font-black text-[var(--ink-soft)]">{lead}</p>}
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="va-pop text-[34px] leading-none" style={{ color: TONE_INK[tone] }}>
              <span className="text-[16px]">年 約</span>
              <CountUp yen={c.perYear} />
              <span className="text-[16px]">万円</span>
            </p>
            <BoxPiggy key={`${c.to.id}-${c.mood}`} mood={c.mood} />
          </div>
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
      <p className="mt-1.5 border-t-2 border-dashed border-[var(--ink)]/30 pt-1.5 text-[12.5px] font-bold leading-snug">
        {scope === 'known' && missingText(c)}
        {c.excluded}
      </p>
      {c.status === 'partial' && (
        <button type="button" onClick={jump} className="inline-flex min-h-[40px] items-center gap-1 text-left text-[13px] font-black underline decoration-2 underline-offset-4">
          確認中の項目を見る <ArrowDown className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
        </button>
      )}
    </div>
  )
}

// 家賃の目安：毎年の差とは別の札
export function RentTag({ c, compact = false, className }: { c: Comparison; compact?: boolean; className?: string }) {
  const r = rentOf(c)
  if (!r) return null
  return (
    <div className={cn('relative rounded-[12px] border-[3px] border-[var(--ink)] bg-[#fff7e0] py-2.5 pl-7 pr-3 shadow-[3px_4px_0_var(--ink)]', className)}>
      <span aria-hidden className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)]" />
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-black">
        家賃の目安
        {/* いま住んでいる世帯の平均で、これから借りる家賃（募集家賃）ではないので「推定」 */}
        <Conf c="推定" />
        <span className="rounded-full border-2 border-[var(--ink)]/60 px-1.5 text-[12px] font-bold leading-tight text-[var(--ink-soft)]">子育ての差とは別</span>
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

// 待機児童の目安：家賃と同じく、お金の差とは別の札。0人は「表で0人」で、入りやすさを約束するものではない。
// 地の色は、損得の色（青・緑）と分けて、紙の色にする。まだ確定していない数（熊本県内）には「暫定」と小さく添える
const DraftMark = ({ conf }: { conf?: Confidence }) =>
  waitDraft(conf) ? <span className="ml-0.5 text-[12px] font-bold text-[var(--ink-soft)]">（{waitDraft(conf)}）</span> : null
export function WaitTag({ c, compact = false, className }: { c: Comparison; compact?: boolean; className?: string }) {
  const w = waitOf(c)
  if (!w) return null
  const conf: Confidence = w.fromConf === '推定' || w.toConf === '推定' ? '推定' : '確認済'
  return (
    <div className={cn('relative rounded-[12px] border-[3px] border-[var(--ink)] bg-[#f4f0e8] py-2.5 pl-7 pr-3 shadow-[3px_4px_0_var(--ink)]', className)}>
      <span aria-hidden className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)]" />
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-black">
        保育園の待機児童
        <Conf c={conf} />
        <span className="rounded-full border-2 border-[var(--ink)]/60 px-1.5 text-[12px] font-bold leading-tight text-[var(--ink-soft)]">お金の差とは別</span>
      </p>
      <p className="mt-0.5 text-[14px] font-black leading-snug">
        {c.from.name} {waitText(w.from)}
        <DraftMark conf={w.fromConf} />
        <span className="mx-1 text-[var(--ink-soft)]">→</span>
        {c.to.name} {waitText(w.to)}
        <DraftMark conf={w.toConf} />
        <span className="ml-1 whitespace-nowrap text-[12px] font-bold text-[var(--ink-soft)]">（{w.asOf}）</span>
      </p>
      {!compact && (
        <p className="mt-1 text-[12px] font-bold leading-snug text-[var(--ink-soft)]">
          {w.note}。人数は街の大きさで変わり、申し込みの多い大きな街ほど多く出ます。0人でも、希望の園に入れるとは限りません。
        </p>
      )}
      {!compact && w.source && (
        <p className="mt-0.5 text-[12px] leading-snug">
          <SourceLink s={w.source} />
        </p>
      )}
    </div>
  )
}

// 災害への配慮。候補の街（c.care）にも、今の街（c.from.care）にも使う
export function CareNote({ care, town }: { care?: Care; town?: string }) {
  if (!care) return null
  const hit = care.level === 'hit'
  return (
    <aside aria-label={`災害への配慮${town ? `（${town}）` : ''}`} className={cn('rounded-[14px] border-[3px] px-3 py-2.5', hit ? 'border-[var(--stay)] bg-[var(--stay-bg)]' : 'border-[var(--ink)]/40 bg-[var(--paper-2)]')}>
      <div className="flex items-start gap-2">
        <ItemIcon name="care" size={30} />
        <div className="min-w-0">
          {town && <p className="text-[12.5px] font-black text-[var(--ink-soft)]">{town}</p>}
          <p className="text-[13.5px] font-black leading-relaxed">{care.note}</p>
          <ul className="mt-1 space-y-0.5 text-[12.5px] leading-snug">
            {care.sources.map((s) => (
              <li key={s.url} className="flex min-h-[40px] items-center">
                <SourceLink s={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

export function MainCapsule({ c, input, sample, note }: { c: Comparison; input: FamilyInput; sample: SampleMark; note?: ReactNode }) {
  const reduce = useReducedMotion()
  const scope = scopeOf(c)
  const tone = toneOf(c.perYear)
  const look = lookOf(c.to)
  const hit = isHit(c)
  const headline = headlineOf(c)
  const color = scope === 'care' || scope === 'unknown' || scope === 'thin' || tone === 'even' ? 'var(--ink)' : TONE_INK[tone]
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
            transition={{ type: 'spring', stiffness: 480, damping: 20, delay: 0.1, opacity: { duration: 0.15, delay: 0.1 } }}
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
      {/* 確認中の項目があるときは、見出しの金額が「わかる分だけ」の額だと先に言う */}
      {c.status === 'partial' && !hit && (
        <p className="mt-1.5 flex justify-center">
          <span className="rounded-full border-[2.5px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-2.5 py-0.5 text-[12.5px] font-black leading-tight">わかっている項目だけで</span>
        </p>
      )}
      <h1 id="va-headline" tabIndex={-1} className={cn('va-pop mt-1 text-center leading-snug outline-none [overflow-wrap:anywhere] [word-break:keep-all] focus-visible:outline-[3px] focus-visible:outline-[var(--ink)]', [...headline].length > 18 ? 'text-[21px]' : 'text-[24px]')} style={{ color }}>
        <Headline text={headline} />
      </h1>
      <p className="mt-1.5 text-center text-[13.5px] font-bold leading-relaxed text-[var(--ink-soft)] [overflow-wrap:anywhere] [word-break:keep-all]">{sublineOf(c)}</p>
      {note}
      {scope !== 'thin' && (c.to.level !== 'detailed' || c.from.level !== 'detailed') && (
        <div className="mt-1.5 space-y-0.5 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-1.5 text-center text-[12.5px] font-bold leading-snug">
          {/* わかる分の金額を出すとき（known）は、まだ調べていないものを金額の箱（missingText）で言うので、ここでは重ねない */}
          {c.to.level !== 'detailed' && <p>{c.to.name}は、{levelText(c.to, scope === 'known')}。</p>}
          {c.from.level !== 'detailed' && (
            <p>
              {c.from.name}（今の街）は、{levelText(c.from, scope === 'known')}。
            </p>
          )}
        </div>
      )}
      {hit && (
        <div className="mt-2.5">
          <CareNote care={c.care} />
        </div>
      )}
      {fromHit(c) && (
        <div className="mt-2.5">
          <CareNote care={c.from.care} town={`今の街（${c.from.name}）について`} />
        </div>
      )}
      <AmountBox c={c} input={input} />
    </section>
  )
}

/* ───────── 家族の顔と貯金箱 ───────── */

export function FamilyFaces({ c, input }: { c: Comparison; input: FamilyInput }) {
  const hit = isHit(c)
  const mood = hit && c.mood < 0 ? 0 : c.mood
  // ほぼ同じ（mood 0）でも1万円以上の差があるときは、金額の言いかえを前に置く（見出しと食いちがわないように）
  const lead = c.status !== 'unknown' && !hit && mood === 0 && toneOf(c.perYear) !== 'even' ? `${everydayText(c.perYear).month}の差。` : ''
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
          {moodLine(c)}
        </p>
      </div>
    </section>
  )
}

/* ───────── 説明書（項目ごと） ───────── */

function ManualCard({ i, c, n, total }: { i: Breakdown; c: Comparison; n: number; total: number }) {
  const a = itemAmount(i, c)
  const color = a.tone === 'plus' || a.tone === 'stay' || a.tone === 'even' ? TONE_INK[a.tone] : 'var(--ink)'
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
            {c.years > 1 && a.tone !== 'care' && i.perYear !== null && Math.abs(i.perYear) >= 1000 && <p className="mt-0.5 text-[12px] font-bold text-[var(--ink-soft)]">{c.years}年でならすと</p>}
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
  // キーホルダーにするのは、その街だけの名物。県全体で同じ名物（東京都の「求人の多さ」など）しかない街は、街の字のキーホルダーにする
  const own: Pride | null = look.pride
  const shared = city.pride.filter((p) => p !== own)
  const title = (p: Pride) => (prideIsPref(p, city) ? `${city.pref}の自慢` : p.kind === 'food' || p.kind === 'craft' ? `${city.name}の名物` : `${city.name}の自慢`)
  return (
    <section aria-labelledby="va-omake">
      <SectionTitle id="va-omake" color={look.capsule} sub={`カプセルに入っていた、${city.name}のおまけ。押すとゆれます。`}>
        おまけ
      </SectionTitle>
      {/* 名物に絵がない街（白みりんなど）は、街の字のキーホルダーにして、名物の説明はそのまま出す */}
      <KeyChain art={look.motif} glyph={look.glyph} color={look.capsule} label={look.motif && own ? own.label : `${look.glyph}の字`}>
        {own ? (
          <>
            <p className="text-[12px] font-black text-[var(--ink-soft)]">{title(own)}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-[17px] font-black leading-snug">{own.label}</h3>
              <Conf c={own.confidence} />
            </div>
            <p className="mt-0.5 text-[14px] leading-relaxed">{own.fact}</p>
            {own.source && (
              <p className="mt-1 text-[12.5px] leading-snug">
                <SourceLink s={own.source} />
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[12px] font-black text-[var(--ink-soft)]">{city.name}のおまけ</p>
            <h3 className="text-[17px] font-black leading-snug">「{look.glyph}」の字のキーホルダー</h3>
            {city.phrase && <p className="mt-1 border-l-[4px] border-[var(--yolk-deep)] pl-2 text-[15px] font-black leading-relaxed">{city.phrase}</p>}
            <p className="mt-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">
              {city.phrase ? `${city.name}のキャッチフレーズです。` : ''}
              {city.name}だけの名物は、まだ調べていません。
            </p>
          </>
        )}
        {shared.map((p) => (
          <div key={p.label} className="mt-2 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-1.5 text-[13px] leading-relaxed">
            <p>
              <span className="font-black">
                {title(p)}：{p.label}
              </span>
              {isSharedPride(p) && <span className="text-[var(--ink-soft)]">（{prefKind(city.pref)}全体のこと）</span>} {p.fact}
            </p>
            {p.source && (
              <p className="mt-0.5 text-[12.5px] leading-snug">
                <SourceLink s={p.source} />
              </p>
            )}
          </div>
        ))}
        {own && city.phrase && (
          <p className="mt-2 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">
            街のことば「{city.phrase}」
          </p>
        )}
      </KeyChain>
    </section>
  )
}

/* ───────── 中身（説明書・確認中・一度きり・おまけ） ───────── */

export function CapsuleContents({ c, input }: { c: Comparison; input: FamilyInput }) {
  const known = c.items.filter((i) => !i.oneTime && i.total !== null)
  const once = c.items.filter((i) => i.oneTime)
  const iju = ijuState(c, input)
  const ijuWait = iju === 'pending'
  // 調べた結果、実施していない・一部の地域だけと分かった街（額は一度きりにも入れない）
  const ijuKnown = (iju === 'none' || iju === 'part') && c.to.ijuCheck ? c.to.ijuCheck : null
  const hit = isHit(c)
  return (
    <div className="space-y-8">
      {c.care && !hit && <CareNote care={c.care} />}
      <section aria-labelledby="va-manuals">
        <SectionTitle
          id="va-manuals"
          sub={
            <>
              {hit ? '制度の中身を、項目ごとに書きました。' : `項目ごとに、どちらの街がいくら得かを分けました。${c.years > 1 ? `金額は${c.years}年でならした1年あたり。` : ''}`}
              <ConfLegend />
            </>
          }
        >
          カプセルの中身
        </SectionTitle>
        <div className="space-y-3.5">
          {known.map((i, n) => (
            <ManualCard key={i.key} i={i} c={c} n={n + 1} total={known.length} />
          ))}
          {!known.length && (
            <p className="va-paper px-4 py-3 text-[14px] font-bold leading-relaxed">
              {c.unknown.length
                ? 'わかっている項目がまだありません。下の「確認中」を見てください。'
                : missingText(c)
                  ? `この家族に当てはまる、わかっている制度では、差は見つかりませんでした。${missingText(c)}`
                  : 'この家族では、毎年の差になる制度が見つかりませんでした。'}
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

      {(once.length > 0 || ijuWait || ijuKnown) && (
        <section aria-labelledby="va-once">
          <SectionTitle
            id="va-once"
            color="var(--yolk)"
            sub={
              once.length > 0
                ? '引っ越したときに一度だけもらえるお金です。毎年の差とは別に数えていて、家族の顔にも、上の金額にも入れていません。'
                : '移住支援金のように、引っ越したときに一度だけのお金。毎年の差とは別に書いています。'
            }
          >
            一度きりのお金
          </SectionTitle>
          <div className="space-y-3">
            {ijuWait && (
              <article className="rounded-[18px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3.5 pb-3 pt-3">
                <div className="flex items-start gap-3">
                  <ItemIcon name="iju" size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[16px] font-black leading-snug">移住支援金（一度きり）</h3>
                      <span className="rounded-full border-2 border-dashed border-[var(--ink)] px-1.5 text-[12px] font-black">準備中</span>
                    </div>
                    <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">かかわる人：家族みんな</p>
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed">
                  23区から{c.to.name}へ移るとき、移住支援金の対象になるかは、まだ調べていません。「ない」という意味ではありません。{c.to.name}のページで確かめてください。
                </p>
                {c.to.url && (
                  <p className="mt-1 flex min-h-[40px] items-center text-[12.5px] leading-snug">
                    <SourceLink s={{ label: `${c.to.name}の公式サイト`, url: c.to.url }} />
                  </p>
                )}
              </article>
            )}
            {ijuKnown && (
              <article className="rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--paper-2)] px-3.5 pb-2 pt-3">
                <div className="flex items-start gap-3">
                  <ItemIcon name="iju" size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[16px] font-black leading-snug">移住支援金（一度きり）</h3>
                      <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-1.5 text-[12px] font-black">{ijuKnown.result === 'none' ? '実施なし' : '一部の地域だけ'}</span>
                      <Conf c={ijuKnown.confidence} />
                    </div>
                    <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">かかわる人：家族みんな</p>
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed">
                  {ijuKnown.note}
                  {ijuKnown.result === 'part' ? '住む場所で変わるので、上の金額にも、一度きりの額にも入れていません。' : ''}
                </p>
                <Sources list={ijuKnown.sources} />
              </article>
            )}
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
                <p className="va-pop mt-2 text-[22px] leading-tight">
                  {i.upTo ? '最大' : ''}
                  {yenMan(i.total ?? 0, 0)}
                  <span className="text-[15px]">（条件つき）</span>
                </p>
                {/* 額が分からない部分（子どもの加算など）は、額に足さずに別の行で */}
                {i.pendingPart && <p className="mt-0.5 text-[15px] font-black leading-snug">＋{i.pendingPart}（額は確認中）</p>}
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

// 棚のカプセルの読み上げ（くわしさ・確認中の項目・一度きりも言う）
export function shelfAria(r: Comparison, tag?: string | null) {
  const body = isHit(r) ? '地震で被害を受けた街なので、得・損は出していません' : `${r.status === 'partial' ? 'わかっている項目だけで、' : ''}${headlineOf(r)}`
  const miss = r.unknown.length && !isHit(r) ? `。確認中の${r.unknown.map((u) => u.label).join('・')}は入っていません` : ''
  return `${r.to.pref}${r.to.name}（${levelTag(r.to)}）：${body}${miss}${r.oneTime ? `。一度きり ${onceShort(r)}` : ''}${tag ? `。${tag}` : ''}`
}

// 値札（「わかる分で」の小さな前置きつき）
function PriceTag({ r, className }: { r: Comparison; className?: string }) {
  const line = shelfLine(r)
  const color = line.tone === 'plus' || line.tone === 'stay' ? TONE_INK[line.tone] : 'var(--ink-soft)'
  const dashed = line.tone === 'unknown' || line.tone === 'care'
  return (
    <span
      className={cn('relative inline-block -rotate-2 rounded-[6px] border-2 bg-white px-1.5 pb-0.5 pt-1 text-center text-[12px] font-black leading-tight', dashed ? 'border-dashed border-[var(--ink)]' : 'border-[var(--ink)]', className)}
      style={{ color }}
    >
      <span aria-hidden className="absolute -top-[5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]" />
      {line.part && <span className="block text-[12px] text-[var(--ink-soft)]">わかる分で</span>}
      {line.l1}
      {line.l2 && <br />}
      {line.l2}
    </span>
  )
}

// extra は全国の台のとき：同じ額の街の本当の数（棚には同じ都道府県の街を perPref 個までしか出さない）
export function Shelf({ ranked, sel, onSelect, limit = 12, extra }: { ranked: Comparison[]; sel: number; onSelect: (i: number) => void; limit?: number; extra?: ShelfExtra }) {
  const [all, setAll] = useState(false)
  const [groupAll, setGroupAll] = useState(false)
  const ties = tiesAtTop(ranked)
  // 同じ額が3個以上続くときは、1枚の棚板にまとめて、値札も1枚にする
  const group = ties >= 3 ? ties : 0
  const GROUP_SHOWN = 8
  const groupList = ranked.slice(0, group)
  const groupShown = groupAll || sel >= GROUP_SHOWN ? groupList : groupList.slice(0, GROUP_SHOWN)
  const rest = ranked.slice(group)
  const restLimit = Math.max(4, limit - Math.min(group, GROUP_SHOWN))
  const restShown = all ? rest : rest.slice(0, restLimit)
  const top = ranked[0]
  const allTies = Math.max(group, extra?.topTies ?? 0)
  return (
    <div className="space-y-4">
      {group > 0 && top && (
        <div className="relative rounded-[16px] border-[3px] border-[var(--ink)] bg-[var(--paper)]/70 px-2 pb-2 pt-3">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 text-[12px] font-black">同じ額 ×{allTies}</span>
            <PriceTag r={top} className="rotate-0" />
          </div>
          <p className="mt-1.5 px-1 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">
            {allTies > group ? `棚には${group}個（同じ都道府県の街は${extra?.perPref}個まで）。` : ''}くわしい街から、今の街に近い順。押すと開けます。
          </p>
          <ul className="va-shelf -mx-1 mt-1 flex flex-wrap px-1 pt-1">
            {groupShown.map((r, i) => {
              const on = i === sel
              return (
                <li key={r.to.id} className="va-plank flex w-1/4 min-w-[76px] flex-col items-center px-0.5 pb-3 pt-0.5 sm:w-1/5 lg:w-1/3 xl:w-1/4">
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-pressed={on}
                    aria-label={shelfAria(r, '同じ額')}
                    className={cn('flex w-full flex-col items-center rounded-[12px] px-0.5 pb-1 pt-1.5 text-center transition-colors', on ? 'bg-[var(--yolk)] shadow-[0_0_0_3px_var(--ink)] [--ink-soft:var(--ink)]' : 'hover:bg-white/70')}
                  >
                    <Capsule color={lookOf(r.to).capsule} level={r.to.level} size={40} />
                    <span className="mt-0.5 w-full truncate text-[13.5px] font-black leading-tight">{r.to.name}</span>
                    <span className="text-[12px] font-bold leading-tight text-[var(--ink-soft)]">{levelTag(r.to)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {groupList.length > groupShown.length && (
            <button type="button" onClick={() => setGroupAll(true)} className="mt-1 min-h-[40px] w-full rounded-[10px] border-[2.5px] border-dashed border-[var(--ink)] bg-white/60 text-[13px] font-black">
              同じ額の街を、あと{groupList.length - groupShown.length}個見る
            </button>
          )}
        </div>
      )}
      {restShown.length > 0 && (
        <ul className={cn('va-shelf -mx-1 flex px-1 pb-1 pt-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] lg:overflow-visible', all ? 'flex-wrap' : 'overflow-x-auto')}>
          {restShown.map((r, k) => {
            const i = k + group
            const on = i === sel
            const tag = i === 0 && ties === 1 ? 'いちばん上' : ties === 2 && i < 2 ? '同じ額' : null
            return (
              <li key={r.to.id} className={cn('va-plank flex shrink-0 snap-start flex-col items-center px-1 pb-3 pt-1 lg:w-auto', all ? 'w-1/3' : 'w-[106px]')}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-pressed={on}
                  aria-label={shelfAria(r, tag)}
                  className={cn('relative flex w-full flex-col items-center rounded-[14px] px-1 pb-1.5 pt-2.5 text-center transition-colors', on ? 'bg-[var(--yolk)] shadow-[0_0_0_3px_var(--ink)] [--ink-soft:var(--ink)]' : 'hover:bg-white/70')}
                >
                  {tag && (
                    <span className={cn('absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-1.5 text-[12px] font-black', tag === 'いちばん上' ? 'bg-[var(--red)] text-white' : 'bg-[var(--paper)]')}>
                      {tag}
                    </span>
                  )}
                  <Capsule color={lookOf(r.to).capsule} level={r.to.level} size={50} />
                  <span className="mt-0.5 text-[12px] font-bold leading-none text-[var(--ink-soft)]">{r.to.pref}</span>
                  <span className="text-[15px] font-black leading-tight">{r.to.name}</span>
                  <PriceTag r={r} className="mt-1.5" />
                  {(r.oneTime > 0 || (r.unknown.length > 0 && r.status !== 'unknown')) && (
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
      )}
      {rest.length > restLimit && (
        <button type="button" onClick={() => setAll((a) => !a)} className="min-h-[40px] w-full rounded-[10px] border-[2.5px] border-dashed border-[var(--ink)] bg-white/60 text-[13px] font-black">
          {all ? '棚をたたむ' : `ほかの${rest.length - restLimit}個も棚に出す`}
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

export function NextStepsBox({ c, others, input }: { c: Comparison; others: number; input?: FamilyInput }) {
  const steps = nextSteps(c, others, input)
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

const madeFrom = (s: Source): Source => ({ ...s, label: s.label.includes('加工') ? s.label : `${s.label}を加工して作成` })

export function Notice() {
  return (
    <footer className="rounded-[14px] border-2 border-[var(--ink)]/30 bg-white/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--ink)]">
      <p className="font-black">ご注意</p>
      <p className="mt-1">{DISCLAIMER}</p>
      <p className="mt-1">データは{DATA_AS_OF}時点。上の金額は子育ての制度の差だけで、家賃・通勤費・税金は入っていません（家賃と待機児童は目安として別に出しています）。</p>
      <p className="mt-1">入力した家族のことは、この端末の中だけで使い、どこにも送りません。出てくる街は計算で決まり、くじではありません。</p>
      <p className="mt-2 font-black">出典</p>
      <ul className="mt-0.5">
        <li className="flex min-h-[40px] items-center py-1">
          <SourceLink s={MUNI_SOURCE} />
        </li>
        {NATIONAL_SOURCES.map((s) => (
          <li key={s.url} className="flex min-h-[40px] items-center py-1">
            <SourceLink s={madeFrom(s)} />
          </li>
        ))}
        {REFERENCE_SOURCES.map((s) => (
          <li key={s.url} className="flex min-h-[40px] items-center py-1">
            <SourceLink s={s} />
          </li>
        ))}
      </ul>
      <p className="mt-1">
        保育料の無償化・中学校の給食費・移住支援金の街ごとの値（移住支援金の子どもの加算と受付の状況をふくむ）は、国・都道府県・市区町村の公開資料をもとに、このサイトがまとめたものです（出典は項目ごとの「出典を見る」に）。
      </p>
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

export function Result({ input, ranked, extra, sel, onSelect, onRetry, onRestart, onGoPick, sample, book, onClearBook }: {
  input: FamilyInput
  ranked: Comparison[]
  extra?: ShelfExtra // 全国の台で、棚に出さなかった街（同じ都道府県は何個までか）と、上から同じ額が続く本当の数
  sel: number
  onSelect: (i: number) => void
  onRetry: () => void
  onRestart: () => void
  onGoPick?: () => void
  sample: SampleMark
  book: string[]
  onClearBook: () => void
}) {
  const c = ranked[sel]
  const ties = tiesAtTop(ranked)
  // 全国の台では、同じ都道府県の街を棚に出しきらないので、同じ額の街の数は棚の外もふくめて言う
  const allTies = Math.max(ties, extra?.topTies ?? 0)
  const allPending = ranked.every(isPending)
  const jumpShelf = () => document.getElementById('va-shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // 同じ額の街がほかにもあるときは、なぜこの街が出たのかを見出しの下に書く
  const tieNote =
    ties > 1 && sel < ties ? (
      <p className="mt-1.5 text-center text-[12.5px] font-bold leading-snug">
        同じ額の街が、ほかに{allTies - 1}個あります{allTies > ties ? `（棚には${ties - 1}個）` : ''}。
        <button type="button" onClick={jumpShelf} className="inline-flex min-h-[32px] items-center font-black underline decoration-2 underline-offset-4">
          棚で見る
        </button>
      </p>
    ) : undefined
  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 pb-10 pt-3 sm:px-4">
      <ResultHeader onBack={onRetry} />
      {allPending && onGoPick && (
        <div className="mx-auto mb-4 flex max-w-[520px] flex-col gap-2 rounded-[16px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper)] px-3.5 py-3 lg:max-w-none lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[14px] font-bold leading-relaxed">
            この台の街は、どれも、この家族に関係する制度が<span className="font-black">まだ確認中</span>でした。はんこと、待機児童・医療費・家賃の目安（分かる街だけ）は見られます。
          </p>
          <button type="button" onClick={onGoPick} className="va-push inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-[15px] font-black">
            くわしい街とくらべる
            <ArrowRight className="h-4 w-4" strokeWidth={3} aria-hidden />
          </button>
        </div>
      )}
      <DetailGrid
        c={c}
        input={input}
        sample={sample}
        note={tieNote}
        side={
          <section aria-labelledby="va-shelf" className="scroll-mt-4">
            <SectionTitle
              id="va-shelf"
              color="var(--sky)"
              sub={
                allPending ? (
                  `${ranked.length}個とも、まだ確認中です。押すと、そのカプセルを開けます。`
                ) : (
                  <>
                    押すと、そのカプセルを開けます。並びは、毎年の差が大きい順。
                    {extra && extra.hidden.length > 0 && (
                      <span className="mt-0.5 block">
                        全国の台なので、同じ都道府県の街は{extra.perPref}個までにしています（ほかに{extra.hidden.slice(0, 3).map((h) => `${h.pref}の街が${h.count}個`).join('、')}{extra.hidden.length > 3 ? 'など' : ''}）。行きたい街は「えらんでくらべる」でも見られます。
                      </span>
                    )}
                    <details className="mt-0.5">
                      <summary className="inline-flex min-h-[36px] items-center gap-1 text-[12.5px] font-black text-[var(--ink)] underline decoration-2 underline-offset-4">
                        <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
                        並び方のきまり
                      </summary>
                      <ul className="mt-1 space-y-0.5 rounded-[10px] bg-white/70 px-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--ink)]">
                        <li>・毎年の差（{perYearChip(c)}）が大きい順。</li>
                        <li>・確認中の項目がある街は、わかる分の額で並べます。わかる分で得にならない街は、全部わかる街の後ろ。</li>
                        <li>・まだ比べられない街（札が「確認中」「調べ中」「準備中」）は、いちばん後ろ。</li>
                        <li>・同じ額の街は、全部わかる街から。そのあとは、くわしい街から、今の街に近い順{extra ? '（全国の台は、都道府県を順にめぐる）' : ''}。</li>
                        <li>・一度きりのお金（移住支援金など）は、額に足さずに並べます（同じ額のときだけ、あるほうを先に）。</li>
                        <li>・地震で大きな被害を受けた街は、並べていません。</li>
                        <li>・札の言葉：「確認中」は、この家族に関係する項目が分からない街。「調べ中」は、制度が一部わかる街で、わかる分では差がない街。「準備中」は、国の調査だけの街。</li>
                      </ul>
                    </details>
                  </>
                )
              }
            >
              ほかのカプセル
            </SectionTitle>
            <Shelf ranked={ranked} sel={sel} onSelect={onSelect} extra={extra} />
          </section>
        }
        book={<StampBook ids={book} waiting={ranked.slice(0, 6).map((r) => r.to)} onClear={onClearBook} />}
        bottom={
          <>
            <NextStepsBox c={c} others={ranked.length - 1} input={input} />
            <RetryButtons onRetry={onRetry} onRestart={onRestart} />
            <Notice />
          </>
        }
      />
    </div>
  )
}

// 左の列が画面の高さに収まるときだけ、スクロールしても止まって見えるようにする（収まらないと下が切れたままになるため）
function useFits(ref: RefObject<HTMLElement>, margin = 24) {
  const [fits, setFits] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setFits(el.offsetHeight <= window.innerHeight - margin)
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    window.addEventListener('resize', check)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [ref, margin])
  return fits
}

// 1440px では3列：左にカプセル（収まるときだけ固定）、真ん中に家族・家賃・説明書、右に棚とスタンプ帳。スマホでは1列。
// 家賃の目安はカプセルの外（家族の顔の下）に置く。スマホでは家族の顔が金額の箱のすぐ後に来る。
export function DetailGrid({ c, input, sample, note, side, book, bottom }: { c: Comparison; input: FamilyInput; sample: SampleMark; note?: ReactNode; side?: ReactNode; book?: ReactNode; bottom: ReactNode }) {
  const leftRef = useRef<HTMLDivElement>(null)
  const fits = useFits(leftRef)
  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 lg:grid lg:max-w-none lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-7 xl:grid-cols-[380px_minmax(0,580px)_minmax(0,1fr)]">
      <div ref={leftRef} className={cn('order-1 lg:col-start-1 lg:row-span-4 lg:row-start-1', fits && 'lg:sticky lg:top-3')}>
        <MainCapsule c={c} input={input} sample={sample} note={note} />
      </div>
      <div className="order-2 space-y-8 lg:col-start-2 xl:row-start-1">
        <div className="space-y-3">
          <FamilyFaces c={c} input={input} />
          <RentTag c={c} />
          <WaitTag c={c} />
        </div>
        <CapsuleContents c={c} input={input} />
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
