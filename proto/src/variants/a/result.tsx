// 案A「カプセルトイ」 — 結果：カプセルの中身（はんこ・家族の顔・説明書・確認中・一度きり・おまけ・棚・スタンプ帳・次の一歩）
import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ChevronRight, ExternalLink, RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { DATA_AS_OF, DISCLAIMER, MOOD_TEXT, everyday, yenMan } from '@/shared'
import type { Breakdown, City, Comparison, Confidence, FamilyInput, Pride } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule, CapsuleBottom, CapsuleTop, ItemIcon, MotifBadge } from './art'
import { Marquee } from './machine'
import { EmptyStamp, GotouchiStamp } from './stamp'
import { FamilyStand } from './steps'
import { TONE_BG, TONE_INK, itemAmount, lookOf, manNumber, nextSteps, prideMotif, shelfLine, toneOf, yearsActual } from './lib'

/* ───────── 小さな部品 ───────── */

const CONF_STYLE: Record<Confidence, string> = {
  確認済: 'border-[var(--ink)] bg-[var(--ink)] text-white',
  推定: 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]',
  仮置き: 'border-dashed border-[var(--ink-soft)] bg-transparent text-[var(--ink-soft)]',
}
export function Conf({ c }: { c: Confidence }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border-2 px-1.5 py-[1px] text-[10.5px] font-black leading-tight', CONF_STYLE[c])}>{c}</span>
}

function SectionTitle({ children, color = 'var(--yolk)', sub }: { children: ReactNode; color?: string; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-[19px] font-black leading-tight">
        <Capsule color={color} size={26} />
        {children}
      </h2>
      {sub && <p className="mt-1 text-[13px] font-bold leading-relaxed text-[var(--ink-soft)]">{sub}</p>}
    </div>
  )
}

function Sources({ list }: { list: Breakdown['sources'] }) {
  return (
    <details className="group mt-2">
      <summary className="inline-flex items-center gap-1 rounded-full text-[12.5px] font-black underline decoration-2 underline-offset-4">
        <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
        出典を見る（{list.length}）
      </summary>
      {list.length ? (
        <ul className="mt-1.5 space-y-1 pl-1">
          {list.map((s) => (
            <li key={s.url} className="text-[12.5px] leading-snug">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-bold text-[var(--stay)] underline underline-offset-2">
                <ExternalLink className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
                <span>{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[12.5px] font-bold text-[var(--ink-soft)]">出典はまだありません（公開前に確かめます）。</p>
      )}
    </details>
  )
}

function Detail({ text }: { text: string }) {
  return (
    <details className="mt-2">
      <summary className="inline-flex items-center gap-1 text-[12.5px] font-black underline decoration-2 underline-offset-4">
        <ChevronRight className="va-caret h-3.5 w-3.5 transition-transform" strokeWidth={3} aria-hidden />
        計算の中身
      </summary>
      <p className="mt-1.5 rounded-[10px] bg-[var(--paper-2)] px-2.5 py-2 text-[12.5px] leading-relaxed">{text}</p>
    </details>
  )
}

/* ───────── いちばん上のカプセル ───────── */

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
      <Capsule color={lookOf(city).capsule} size={20} />
      <span className="min-w-0 truncate text-[12.5px] font-black leading-tight">
        <span className="text-[var(--ink-soft)]">{tag}</span> {city.name}
      </span>
    </span>
  )
}

// 見出しは「、」で2行にわけ、2行目は数字と単位の途中で折り返さない
function Headline({ text }: { text: string }) {
  const i = text.indexOf('、')
  if (i < 0) return <>{text}</>
  return (
    <>
      <span className="inline-block">{text.slice(0, i + 1)}</span>
      <br />
      <span className="inline-block whitespace-nowrap">{text.slice(i + 1).trim()}</span>
    </>
  )
}

function MainCapsule({ c, years, isSample }: { c: Comparison; years: number; isSample: boolean }) {
  const reduce = useReducedMotion()
  const tone = toneOf(c.perYear)
  const look = lookOf(c.to)
  const ev = everyday(c.perYear)
  return (
    <section aria-labelledby="va-headline" className="va-paper relative overflow-hidden px-4 pb-5 pt-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <CityChip city={c.from} tag="いま" />
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={3} aria-label="から" />
        <CityChip city={c.to} tag="候補" />
        {isSample && <span className="ml-auto rounded-[6px] border-2 border-[var(--red-text)] px-1.5 text-[11px] font-black text-[var(--red-text)]">入力例で計算</span>}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={c.to.id}
          className="relative mx-auto mt-1 h-[196px] w-full max-w-[320px]"
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
        >
          <CapsuleTop size={104} className="absolute left-0 top-3 -rotate-[32deg]" />
          <CapsuleBottom size={104} color={look.capsule} className="absolute bottom-3 right-0 rotate-[16deg]" />
          <motion.div
            className="absolute left-1/2 top-1/2 -ml-[86px] -mt-[86px]"
            initial={reduce ? false : { scale: 1.9, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: -7 }}
            transition={{ type: 'spring', stiffness: 480, damping: 20, delay: 0.1 }}
          >
            <GotouchiStamp city={c.to} size={172} />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite" aria-atomic="true">
        <p className="text-center text-[13px] font-black text-[var(--ink-soft)]">
          {c.to.pref} {c.to.name} のカプセル
        </p>
        <h1 id="va-headline" className="va-pop mt-1 text-center text-[24px] leading-snug [overflow-wrap:anywhere] [word-break:keep-all]" style={{ color: TONE_INK[tone] === 'var(--ink-soft)' ? 'var(--ink)' : TONE_INK[tone] }}>
          <Headline text={c.headline} />
        </h1>
        <p className="mt-1.5 text-center text-[13.5px] font-bold leading-relaxed text-[var(--ink-soft)] [overflow-wrap:anywhere] [word-break:keep-all]">{c.subline}</p>
      </div>

      <div className="mt-3.5 rounded-[14px] border-[3px] border-[var(--ink)] px-3 py-3" style={{ background: TONE_BG[tone] }}>
        {tone === 'even' ? (
          <div className="text-center">
            <p className="text-[12.5px] font-black text-[var(--ink-soft)]">毎年の差</p>
            <p className="va-pop text-[30px] leading-tight">ほぼ 0円</p>
            <p className="text-[12.5px] font-bold text-[var(--ink-soft)]">1年で1万円もちがいません</p>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3">
            <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 text-[11.5px] font-black leading-tight">
              {tone === 'plus' ? `${c.to.name}だと得` : `${c.from.name}のままがお得`}
            </span>
            <p className="va-pop text-right text-[32px] leading-none" style={{ color: TONE_INK[tone] }}>
              <span className="text-[16px]">年 約</span>
              <CountUp yen={c.perYear} />
              <span className="text-[16px]">万円</span>
            </p>
            <p className="col-span-2 mt-2 flex flex-wrap justify-end gap-x-3 text-[13px] font-black">
              <span>{ev.month}</span>
              <span>{ev.day}</span>
            </p>
            {years > 1 && (
              <p className="col-span-2 mt-1 text-right text-[12.5px] font-bold text-[var(--ink-soft)]">
                {years}年の合計で 約{yenMan(Math.abs(c.total))}
              </p>
            )}
            {c.items.some((i) => !i.oneTime && i.total !== null && i.confidence !== '確認済') && (
              <p className="col-span-2 mt-1.5 text-right text-[11.5px] font-bold text-[var(--ink-soft)]">
                <Conf c="推定" /> の数字をふくみます
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ───────── 家族の顔と貯金箱 ───────── */

function FamilyFaces({ c, input }: { c: Comparison; input: FamilyInput }) {
  // 表情は毎年の差（mood）だけで決める。しょんぼりするのは貯金箱だけ。大人はおだやか、子どもはいつも笑顔。
  const exprAdult = c.mood >= 2 ? 'joy' : c.mood === 1 ? 'smile' : 'calm'
  const exprChild = c.mood >= 1 ? 'joy' : 'smile'
  return (
    <section aria-label="家族の顔" className="va-paper px-3 pb-4 pt-3">
      <h2 className="text-[15px] font-black">家族の顔</h2>
      <div className="mt-1.5">
        <FamilyStand key={`${c.to.id}-${c.mood}`} input={input} exprAdult={exprAdult} exprChild={exprChild} bounce={c.mood >= 1} piggy={c.mood} room={310} />
      </div>
      <div className="relative mt-4">
        <span aria-hidden className="absolute -top-[11px] right-[30px] h-0 w-0 border-x-[10px] border-b-[11px] border-x-transparent border-b-[var(--ink)]" />
        <span aria-hidden className="absolute -top-[7px] right-[32px] h-0 w-0 border-x-[8px] border-b-[9px] border-x-transparent border-b-[var(--paper-2)]" />
        <p className="rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2 text-[14px] font-black leading-relaxed">{MOOD_TEXT[c.mood]}</p>
      </div>
    </section>
  )
}

/* ───────── 説明書（項目ごと） ───────── */

function ItemCard({ i, c }: { i: Breakdown; c: Comparison }) {
  const a = itemAmount(i, c)
  const color = a.tone === 'plus' || a.tone === 'stay' || a.tone === 'even' ? TONE_INK[a.tone] : 'var(--ink)'
  return (
    <article className="va-paper px-3.5 pb-3.5 pt-3">
      <div className="flex items-start gap-3">
        <ItemIcon name={i.icon} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[16px] font-black leading-snug">{i.label}</h3>
            <Conf c={i.confidence} />
          </div>
          <p className="text-[12px] font-bold text-[var(--ink-soft)]">かかわる人：{i.who}</p>
        </div>
      </div>
      <p className="mt-2 text-[17px] font-black leading-snug" style={{ color }}>
        {a.text}
      </p>
      <p className="mt-1 text-[14px] font-medium leading-relaxed">{i.plain}</p>
      <Detail text={i.detail} />
      <Sources list={i.sources} />
    </article>
  )
}

function PrideCharm({ p, city }: { p: Pride; city: City }) {
  return (
    <article className="relative flex gap-3 rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 pb-3 pt-4 shadow-[3px_4px_0_var(--ink)]">
      <span aria-hidden className="absolute -top-[13px] left-[30px] h-[22px] w-[22px] rounded-full border-[3px] border-[#8a909c] bg-transparent" />
      <span aria-hidden className="absolute -top-[2px] left-[39px] h-[10px] w-[4px] rounded-full bg-[#8a909c]" />
      <MotifBadge name={prideMotif(p)} ink={lookOf(city).ink} size={64} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-[16px] font-black leading-snug">{p.label}</h3>
          <Conf c={p.confidence} />
        </div>
        <p className="mt-1 text-[14px] leading-relaxed">{p.fact}</p>
        {p.source && (
          <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 text-[12px] font-bold text-[var(--stay)] underline underline-offset-2">
            <ExternalLink className="mt-[2px] h-3 w-3 shrink-0" aria-hidden />
            <span>{p.source.label}</span>
          </a>
        )}
      </div>
    </article>
  )
}

/* ───────── 棚とスタンプ帳 ───────── */

function Shelf({ ranked, sel, onSelect }: { ranked: Comparison[]; sel: number; onSelect: (i: number) => void }) {
  return (
    <div>
      <div className="va-shelf -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(102px,1fr))] lg:overflow-visible">
        {ranked.map((r, i) => {
          const on = i === sel
          const [l1, l2] = shelfLine(r)
          const tone = toneOf(r.perYear)
          return (
            <button
              key={r.to.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={on}
              aria-label={`${r.to.pref}${r.to.name}：${r.headline}${r.oneTime ? `。一度きり 約${yenMan(r.oneTime, 0)}` : ''}${r.unknown.length ? '。確認中の項目あり' : ''}`}
              className={cn(
                'relative flex w-[116px] shrink-0 snap-start flex-col items-center rounded-[16px] border-[3px] px-1 pb-2 pt-2 text-center transition-colors lg:w-auto',
                on ? 'border-[var(--ink)] bg-[var(--yolk)] shadow-[3px_4px_0_var(--ink)]' : 'border-[var(--ink)] bg-[var(--paper)]',
              )}
            >
              {i === 0 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--red)] px-1.5 text-[10px] font-black text-white">いちばん上</span>}
              <Capsule color={lookOf(r.to).capsule} size={50} />
              <span className="mt-1 text-[11px] font-bold leading-none text-[var(--ink-soft)]">{r.to.pref}</span>
              <span className="text-[15px] font-black leading-tight">{r.to.name}</span>
              <span className="mt-1 whitespace-nowrap text-[11px] font-black leading-tight" style={{ color: tone === 'even' ? 'var(--ink-soft)' : TONE_INK[tone] }}>
                {l1}
                {l2 && <br />}
                {l2}
              </span>
              {(r.oneTime > 0 || r.unknown.length > 0) && (
                <span className="mt-1 flex flex-wrap justify-center gap-1">
                  {r.oneTime > 0 && <span className="rounded-full bg-[var(--ink)] px-1.5 text-[10px] font-black text-[var(--yolk)]">一度きり{yenMan(r.oneTime, 0)}</span>}
                  {r.unknown.length > 0 && <span className="rounded-full border border-dashed border-[var(--ink-soft)] px-1.5 text-[10px] font-black text-[var(--ink-soft)]">確認中あり</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div aria-hidden className="mt-1 h-3 rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)]" />
    </div>
  )
}

function StampBook({ from, ranked, opened }: { from: City; ranked: Comparison[]; opened: string[] }) {
  const cities = [from, ...ranked.map((r) => r.to)]
  const got = cities.filter((c) => c.id === from.id || opened.includes(c.id)).length
  return (
    <div className="rounded-[18px] border-[3px] border-[var(--ink)] bg-[#f6f1e3] p-3 shadow-[3px_4px_0_var(--ink)]">
      <p className="mb-2 text-right text-[12px] font-black text-[var(--ink-soft)]">
        {got} / {cities.length} 個
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-1 gap-y-2 lg:grid-cols-[repeat(auto-fill,minmax(96px,1fr))]">
        {cities.map((city) => {
          const isFrom = city.id === from.id
          const has = isFrom || opened.includes(city.id)
          return (
            <li key={city.id} className="flex flex-col items-center">
              {has ? <GotouchiStamp city={city} size={74} className="lg:h-[90px] lg:w-[90px]" /> : <EmptyStamp size={74} name={city.name} />}
              <span className="mt-0.5 text-[10.5px] font-black leading-tight text-[var(--ink-soft)]">{isFrom ? 'いまの街' : has ? city.name : 'まだ'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ───────── 結果の画面 ───────── */

export function Result({ input, ranked, sel, onSelect, onRetry, onRestart, isSample, opened }: {
  input: FamilyInput
  ranked: Comparison[]
  sel: number
  onSelect: (i: number) => void
  onRetry: () => void
  onRestart: () => void
  isSample: boolean
  opened: string[]
}) {
  const c = ranked[sel]
  const years = yearsActual(input)
  const known = c.items.filter((i) => !i.oneTime && i.total !== null)
  const once = c.items.filter((i) => i.oneTime)
  const steps = nextSteps(c, ranked.length - 1)

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 pb-10 pt-3 sm:px-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-full border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-[13px] font-black">
          <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden />
          条件を変える
        </button>
        <Marquee size="small" />
      </header>

      <div className="mx-auto max-w-[480px] lg:grid lg:max-w-none lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-4 lg:sticky lg:top-4">
          <MainCapsule c={c} years={years} isSample={isSample} />
          <FamilyFaces c={c} input={input} />
        </div>

        <div className="mt-6 space-y-8 lg:mt-0">
          <section>
            <SectionTitle sub="項目ごとに、どちらの街がいくら得かを分けました。小さな札は数字の確からしさです（確認済＝公式で確かめた／推定＝根拠つきの見込み／仮置き＝まだ確かめていない）。">
              カプセルの中身
            </SectionTitle>
            <div className="space-y-3">
              {known.map((i) => (
                <ItemCard key={i.key} i={i} c={c} />
              ))}
              {!known.length && <p className="va-paper px-4 py-3 text-[14px] font-bold">この家族では、毎年の差になる制度が見つかりませんでした。</p>}
            </div>
          </section>

          {c.unknown.length > 0 && (
            <section>
              <SectionTitle color="#c9ced6" sub="まだ確かめられていないので、0円とはせず、合計にも入れていません。">
                確認中
              </SectionTitle>
              <div className="space-y-3">
                {c.unknown.map((u) => (
                  <article key={u.key} className="rounded-[18px] border-[3px] border-dashed border-[var(--ink)] bg-[var(--paper-2)] px-3.5 pb-3.5 pt-3">
                    <div className="flex items-start gap-3">
                      <ItemIcon name="unknown" size={46} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[16px] font-black leading-snug">{u.label}</h3>
                          <span className="rounded-full border-2 border-dashed border-[var(--ink)] px-1.5 text-[10.5px] font-black">確認中</span>
                        </div>
                        <p className="text-[12px] font-bold text-[var(--ink-soft)]">かかわる人：{u.who}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed">{u.plain}</p>
                    <Detail text={u.detail} />
                    <Sources list={u.sources} />
                  </article>
                ))}
              </div>
            </section>
          )}

          {once.length > 0 && (
            <section>
              <SectionTitle color="var(--yolk)" sub="引っ越したときに一度だけもらえるお金です。毎年の差とは別に数えていて、家族の顔にも入れていません。">
                一度きりのお金
              </SectionTitle>
              <div className="space-y-3">
                {once.map((i) => (
                  <article key={i.key} className="rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3.5 pb-3.5 pt-3 shadow-[3px_4px_0_var(--ink)]" style={{ outline: '3px dashed var(--yolk-deep)', outlineOffset: -9 }}>
                    <div className="flex items-start gap-3">
                      <ItemIcon name={i.icon} size={46} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[16px] font-black leading-snug">{i.label}</h3>
                          <Conf c={i.confidence} />
                        </div>
                        <p className="text-[12px] font-bold text-[var(--ink-soft)]">かかわる人：{i.who}</p>
                      </div>
                    </div>
                    <p className="va-pop mt-2 text-[24px] leading-tight">一度だけ 約{yenMan(i.total ?? 0, 0)}</p>
                    <p className="mt-1 text-[14px] leading-relaxed">{i.plain}</p>
                    <Detail text={i.detail} />
                    <Sources list={i.sources} />
                  </article>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle color={lookOf(c.to).capsule} sub={`カプセルに入っていた、${c.to.name}の名物・有名なもの。`}>
              おまけ
            </SectionTitle>
            <div className="space-y-4 pt-2">
              {c.to.pride.map((p) => (
                <PrideCharm key={p.label} p={p} city={c.to} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle color="var(--sky)" sub="ほかの候補も、棚にならんでいます。押すと、そのカプセルを開けます。">
              ほかのカプセル
            </SectionTitle>
            <Shelf ranked={ranked} sel={sel} onSelect={onSelect} />
          </section>

          <section id="va-stampbook">
            <SectionTitle color="#f2c4a0" sub="開けた街のはんこがたまります。この端末の中にだけ残ります。">
              スタンプ帳
            </SectionTitle>
            <StampBook from={c.from} ranked={ranked} opened={opened} />
          </section>

          <section>
            <SectionTitle color="var(--mint)">次の一歩</SectionTitle>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-2.5 rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5">
                  <span className="va-pop grid h-7 w-7 shrink-0 place-items-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--mint)] text-[14px]">{i + 1}</span>
                  <span className="pt-0.5 text-[14.5px] font-bold leading-relaxed [overflow-wrap:anywhere] [word-break:keep-all]">{s}</span>
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

          <div className="flex flex-col items-center gap-3 pt-2">
            <button type="button" onClick={onRetry} className="va-push inline-flex w-full max-w-[360px] items-center justify-center gap-2 px-6 py-3.5 text-[18px] font-black">
              <RotateCcw className="h-5 w-5" strokeWidth={3} aria-hidden />
              条件を変えてもう1回
            </button>
            <button type="button" onClick={onRestart} className="text-[13px] font-black underline decoration-2 underline-offset-4">
              はじめの画面にもどる
            </button>
          </div>

          <footer className="rounded-[14px] border-2 border-[var(--ink)]/30 bg-white/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--ink)]">
            <p className="font-black">ご注意</p>
            <p className="mt-1">{DISCLAIMER}</p>
            <p className="mt-1">データは{DATA_AS_OF}時点。家賃や通勤時間、税金のちがいはまだ入っていません。</p>
            <p className="mt-1">入力した家族のことは、この端末の中だけで使い、どこにも送りません。でてくる街は計算で決まり、くじではありません。</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
