/*
 * 案D「家計レシート」 — 結果のレシート。
 *
 * 21st の部品「Receipt Pricing」（作者: n1m4mz）
 *   https://21st.dev/@n1m4mz/components/receipt-pricing
 * から、次の作りを借りて作り変えた。
 * - 上下のギザギザを CSS マスクで切る作り（theme.css の .vd-paper）、感熱紙の細い横じま、
 *   点線のリーダーでつないだ品目の行、二重線の上の合計、ハッシュで決めるレシート番号とバーコード、斜めのはんこ。
 * - 出し直すとき「古い紙がちぎれて落ちる → 新しい紙が上から1行ずつ現れる（印字ヘッドの影つき）」段取り。
 * 変えたところ: 料金表をやめて「家計の差額」のレシートに。品目の行をタップで開くボタンにし、計算の中身と出典、
 * 確からしさ（確認済／推定／仮置き）を出す。確認中の行、一度きりの「別会計」、赤ペンの丸と一言を足した。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { DATA_AS_OF, everyday, yenMan } from '@/shared'
import type { Breakdown, Comparison, Confidence, FamilyInput } from '@/shared/types'
import { cn } from '@/lib/utils'
import { HandCircle } from './choice'
import { MOOD_NOTE, YEN_HINT, bars, familyShort, incomeLabel, kidsShort, perMonth, receiptNo, signedMan, workLabel } from './lib'

export function Conf({ c }: { c: Confidence }) {
  return <span className={cn('vd-conf', c === '推定' && 'vd-conf--est', c === '仮置き' && 'vd-conf--tmp')}>{c}</span>
}

function Rule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('vd-rule', className)} />
}

function amountClass(v: number | null) {
  if (v === null) return ''
  if (v >= 500) return 'text-[var(--plus)]'
  if (v <= -500) return 'text-[var(--ink)]'
  return 'text-[var(--ink-2)]'
}

function Line({ item }: { item: Breakdown }) {
  const [open, setOpen] = useState(false)
  const unknown = item.perYear === null && !item.oneTime
  const amount = item.oneTime ? `+${yenMan(item.total ?? 0, 0)}` : unknown ? null : signedMan(item.perYear ?? 0)
  const id = `vd-line-${item.key}`
  return (
    <li className="border-b border-dashed border-[rgba(42,39,48,.16)] last:border-b-0">
      <button type="button" className="vd-line" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold leading-snug">{item.label}</span>
          <span className="vd-leader" aria-hidden="true" />
          {amount ? (
            <span className={cn('shrink-0 text-[17px] font-bold tabular-nums', item.oneTime ? 'text-[var(--plus)]' : amountClass(item.perYear))}>{amount}</span>
          ) : (
            <span className="vd-stamp shrink-0 !text-[13px]">確認中</span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--ink-2)]">
          <span>{item.who}</span>
          <Conf c={item.confidence} />
          {!unknown && !item.oneTime && (
            <span className="tabular-nums">
              {perMonth(item.perYear ?? 0)}
              {Math.abs(item.perYear ?? 0) >= 500 ? ' × 12か月' : ''}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-0.5 font-medium text-[var(--ink)] underline decoration-dashed underline-offset-4">
            {open ? 'とじる' : '中身と出典'}
            <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
          </span>
        </span>
        <span className="mt-1.5 block text-[13.5px] leading-relaxed">{item.plain}</span>
      </button>
      {open && (
        <div id={id} className="mb-3 rounded-md bg-[var(--paper-2)] px-3 py-2.5 text-[12.5px] leading-relaxed">
          <p>{item.detail}</p>
          {item.sources.length ? (
            <ul className="mt-2 space-y-1.5">
              {item.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
                    出典: {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[var(--red-ink)]">出典はまだ付いていません（{item.confidence}）。公開の前に確かめます。</p>
          )}
        </div>
      )}
    </li>
  )
}

function Barcode({ seed }: { seed: string }) {
  return (
    <div aria-hidden="true" className="mx-auto mt-5 flex h-10 w-fit items-stretch">
      {bars(seed, 48).map((w, i) => (
        <span key={i} className={i % 2 === 0 ? 'bg-[var(--ink)]' : ''} style={{ width: `${w}px` }} />
      ))}
    </div>
  )
}

type Phase = 'idle' | 'tear' | 'hidden' | 'print'
const TEAR_MS = 220
const PRINT_MS = 900
const ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EXIT = 'cubic-bezier(0.4, 0, 1, 1)'

function phaseStyle(p: Phase): CSSProperties {
  if (p === 'tear') return { transform: 'translateY(28px) rotate(0.6deg)', opacity: 0, transition: `transform ${TEAR_MS}ms ${EXIT}, opacity ${TEAR_MS}ms linear` }
  if (p === 'hidden') return { clipPath: 'inset(0 0 100% 0)', transition: 'none' }
  if (p === 'print') return { clipPath: 'inset(0 0 0 0)', transition: `clip-path ${PRINT_MS}ms ${ENTER}` }
  return {}
}
function headStyle(p: Phase): CSSProperties {
  if (p === 'hidden') return { transform: 'translateY(-100%)', opacity: 1, transition: 'none' }
  if (p === 'print') return { transform: 'translateY(0)', opacity: 1, transition: `transform ${PRINT_MS}ms ${ENTER}` }
  return { opacity: 0, transition: 'opacity 160ms linear' }
}

const keyOf = (c: Comparison) => `${c.from.id}>${c.to.id}:${c.years}:${c.total}`

export function Receipt({ c, input, isSample, printOnMount }: { c: Comparison; input: FamilyInput; isSample: boolean; printOnMount: boolean }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(c)
  const [phase, setPhase] = useState<Phase>(printOnMount && !reduce ? 'hidden' : 'idle')
  const first = useRef(true)

  // 最初の表示（演出を飛ばして来たときだけ）: 上から1行ずつ現れる
  useEffect(() => {
    if (!(printOnMount && !reduce)) return
    const t1 = window.setTimeout(() => setPhase('print'), 60)
    const t2 = window.setTimeout(() => setPhase('idle'), 60 + PRINT_MS)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ほかの街を選んだら、古い紙をちぎって新しい紙を出す
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (keyOf(c) === keyOf(shown)) return
    if (reduce) {
      setShown(c)
      setPhase('idle')
      return
    }
    setPhase('tear')
    const t1 = window.setTimeout(() => {
      setShown(c)
      setPhase('hidden')
    }, TEAR_MS)
    const t2 = window.setTimeout(() => setPhase('print'), TEAR_MS + 34)
    const t3 = window.setTimeout(() => setPhase('idle'), TEAR_MS + 34 + PRINT_MS)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOf(c), reduce])

  const r = shown
  const yearly = r.items.filter((i) => !i.oneTime)
  const once = r.items.filter((i) => i.oneTime)
  const no = receiptNo(input, r.to.id)
  const ev = everyday(r.perYear)
  const flat = Math.abs(r.perYear) < 500

  return (
    <div className="vd-paper-wrap">
      <article
        className="vd-paper overflow-hidden px-5 pb-9 pt-9 text-[14px] leading-relaxed sm:px-6"
        aria-label={`家計レシート。${r.from.name}から${r.to.name}へ移ったときの差`}
        style={phaseStyle(phase)}
      >
        <header className="text-center">
          <p className="text-[21px] font-bold tracking-[0.06em]">
            <span className="vd-wide">住む街ガチャ</span>
          </p>
          <p className="mt-1 text-[13px] font-bold tracking-[0.4em]">家計レシート</p>
          <p className="mt-1 text-[12px] text-[var(--ink-2)]">
            {DATA_AS_OF}時点の調査値 ／ No.{no}
          </p>
        </header>

        <Rule className="mt-4" />
        <div className="relative">
          <dl className="mt-3 grid grid-cols-[5.6em_1fr] gap-x-2 gap-y-1 text-[13px]">
            <dt className="text-[var(--ink-2)]">今の街</dt>
            <dd>
              {r.from.name}（{r.from.pref}）
            </dd>
            <dt className="text-[var(--ink-2)]">引っ越し先</dt>
            <dd className="font-bold">
              {r.to.name}（{r.to.pref}）
            </dd>
            <dt className="text-[var(--ink-2)]">家族</dt>
            <dd>
              {familyShort(input)}
              <span className="block text-[12px] text-[var(--ink-2)]">{kidsShort(input)}</span>
            </dd>
            <dt className="text-[var(--ink-2)]">年収</dt>
            <dd>{incomeLabel(input.income)}</dd>
            <dt className="text-[var(--ink-2)]">働き方</dt>
            <dd>{workLabel(input.work)}</dd>
            <dt className="text-[var(--ink-2)]">期間</dt>
            <dd>{r.years}年</dd>
          </dl>
          {isSample && <span className="vd-stamp absolute right-0 top-3">入力例</span>}
        </div>

        <Rule className="mt-3" />
        <p className="mt-3 flex items-baseline justify-between gap-2 text-[12px] font-bold tracking-[0.08em] text-[var(--ink-2)]">
          <span>品目</span>
          <span>{r.years > 1 ? `年あたり（${r.years}年の平均）` : '1年の差'}</span>
        </p>
        <p className="mt-1 text-[11.5px] leading-snug text-[var(--ink-2)]">{YEN_HINT}</p>
        {yearly.length ? (
          <ul className="mt-1">
            {yearly.map((it) => (
              <Line key={it.key} item={it} />
            ))}
          </ul>
        ) : (
          <p className="my-3 text-[13.5px]">この家族の条件では、子育ての制度で差が出る項目がありません。</p>
        )}

        <Rule className="mt-1" />
        <p className="mt-3 flex items-baseline gap-2 text-[14px]">
          <span>小計（年あたり）</span>
          <span className="vd-leader" aria-hidden="true" />
          <span className={cn('font-bold tabular-nums', amountClass(r.perYear))}>{signedMan(r.perYear)}</span>
        </p>
        {r.years > 1 && (
          <p className="flex items-baseline gap-2 text-[14px] text-[var(--ink-2)]">
            <span>× {r.years}年</span>
          </p>
        )}
        <div aria-hidden="true" className="vd-rule--double mt-2" />
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="text-[15px] font-bold">
            <span className="vd-tall">合計</span>（{r.years}年で）
          </span>
          <span className="relative inline-block">
            <span className={cn('text-[29px] font-bold leading-none tabular-nums', amountClass(r.total))}>{signedMan(r.total)}</span>
            <HandCircle seed={3} padX={12} padY={10} />
          </span>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-3 text-[13px] tabular-nums text-[var(--ink-2)]">
          {flat ? <span>月にしても、1日にしても、ほぼ0円</span> : (
            <>
              <span>月にすると {ev.month.replace('月 ', '')}</span>
              <span>1日 {ev.day.replace('1日 ', '')}</span>
            </>
          )}
        </p>
        <p className="vd-hand mt-3 text-right text-[20px] leading-tight text-[var(--red-ink)]" style={{ transform: 'rotate(-3deg)' }}>
          {MOOD_NOTE[r.mood]}
        </p>
        <p className="mt-2 text-[15px] font-bold leading-snug">→ {r.headline}</p>
        {r.unknown.length > 0 && (
          <p className="mt-2 text-[12.5px] leading-snug text-[var(--red-ink)]">
            確認中の「{r.unknown.map((u) => u.label).join('・')}」は、0円にせず合計から外しています。
          </p>
        )}

        {once.length > 0 && (
          <section aria-label="一度きりのお金（別会計）" className="mt-5 rounded-md border-[1.5px] border-[var(--ink)] px-3 pb-2 pt-2.5">
            <p className="flex items-center justify-between text-[13px] font-bold tracking-[0.12em]">
              一度きり（別会計）
              <span className="text-[11.5px] font-normal tracking-normal text-[var(--ink-2)]">毎年の合計には入れていません</span>
            </p>
            <ul className="mt-1">
              {once.map((it) => (
                <Line key={it.key} item={it} />
              ))}
            </ul>
          </section>
        )}

        <Rule className="mt-5" />
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11.5px] text-[var(--ink-2)]">
          <span>数字の確からしさ:</span>
          <Conf c="確認済" />
          <span>公式で確認</span>
          <Conf c="推定" />
          <span>根拠つきの見込み</span>
          <Conf c="仮置き" />
          <span>まだ確かめていない</span>
        </p>
        <Barcode seed={`${no}-${r.to.id}`} />
        <p className="mt-1 text-center text-[11px] tracking-[0.3em] text-[var(--ink-2)]" aria-hidden="true">
          {no}-{r.to.id.toUpperCase()}
        </p>
        <p className="mt-3 text-center text-[12.5px]">条件を変えれば、何枚でも出せます</p>
        <div aria-hidden="true" className="vd-head-line" style={headStyle(phase)} />
      </article>
    </div>
  )
}

/** ガチャの演出で印字する、短いレシート。 */
export function MiniReceipt({ c, input }: { c: Comparison; input: FamilyInput }) {
  const yearly = c.items.filter((i) => !i.oneTime)
  return (
    <div className="px-5 pb-6 pt-7 text-[13px] leading-[20px]">
      <p className="text-center text-[19px] font-bold leading-[26px]">
        <span className="vd-wide">住む街ガチャ</span>
      </p>
      <p className="text-center text-[12px] font-bold tracking-[0.4em]">家計レシート</p>
      <p className="text-center text-[11.5px] text-[var(--ink-2)]">No.{receiptNo(input, c.to.id)}</p>
      <Rule className="my-2" />
      <p className="text-center font-bold">
        {c.from.name} → {c.to.name}
      </p>
      <p className="text-center text-[12px] text-[var(--ink-2)]">
        {c.years}年で比べる ／ {familyShort(input)}
      </p>
      <Rule className="my-2" />
      {yearly.length ? (
        yearly.map((it) => (
          <p key={it.key} className="flex items-baseline gap-2">
            <span className="truncate">{it.label.replace('（現金の給付）', '')}</span>
            <span className="vd-leader" aria-hidden="true" />
            <span className="shrink-0 font-bold tabular-nums">{it.perYear === null ? '確認中' : signedMan(it.perYear)}</span>
          </p>
        ))
      ) : (
        <p>差が出る項目なし</p>
      )}
      <div aria-hidden="true" className="vd-rule--double my-2" />
      <p className="flex items-baseline gap-2 text-[15px] font-bold">
        <span className="vd-tall">合計</span>
        <span className="text-[12px] font-normal">年あたり</span>
        <span className="vd-leader" aria-hidden="true" />
        <span className="text-[20px] tabular-nums">{signedMan(c.perYear)}</span>
      </p>
      {c.oneTime > 0 && (
        <p className="mt-1 flex items-baseline gap-2 text-[12px]">
          <span>一度きり（別会計）</span>
          <span className="vd-leader" aria-hidden="true" />
          <span className="font-bold tabular-nums">+{yenMan(c.oneTime, 0)}</span>
        </p>
      )}
      <Rule className="my-2" />
      <p className="text-center text-[13px] font-bold leading-snug">{c.headline}</p>
      <div aria-hidden="true" className="mx-auto mt-3 flex h-7 w-fit items-stretch">
        {bars(`${c.to.id}-${c.years}`, 40).map((w, i) => (
          <span key={i} className={i % 2 === 0 ? 'bg-[var(--ink)]' : ''} style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  )
}
