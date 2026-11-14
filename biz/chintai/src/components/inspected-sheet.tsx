import type { CSSProperties } from 'react'
import { formatYen } from '@/core/format'
import type { Finding, Inspection } from '@/core/types'
import { scrollToId } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { PenArrow, PenCheck, PenCircle, PenUnderline } from './pen'

// 赤ペンが入った見積書。点検の結果（Inspection）を、見積書の行の順に並べて、
// 確かめる項目の金額を赤ペンの丸で囲み、右の余白に「何を確かめるか」を書き込む。
//
// 道具の結果の画面でも、LP の一番上でも、同じ部品を使う（どちらも、本物の判定ロジックの結果を渡す）。
// 描くときに window などにさわらないので、静的HTMLの書き出し（ssr: true）でも使える。
//
// 色だけで伝えないための決めごと:
// - 確かめる項目は、丸（形）と、余白の言葉（headline）の両方で伝える。
// - 気になる点が見つからなかった行は、チェックの印と言葉。

/** 行の高さがそろうように、番号・名前・金額・書き込みの4つのマスに置く。せまい画面では、書き込みを下の段に回す。 */
const ROW = 'grid grid-cols-[1.6rem_minmax(0,1fr)_auto] gap-x-2 sm:grid-cols-[2rem_minmax(0,1fr)_8.5rem_minmax(0,1.3fr)] sm:gap-x-3'

/** 順番に描かれていくように、行ごとに描き始めをずらす（ミリ秒）。 */
const STEP = 110

function fadeStyle(draw: boolean, delay: number): CSSProperties | undefined {
  return draw ? { animationDelay: `${delay + 250}ms` } : undefined
}

/** 金額。確かめる項目は丸で囲み、上限を超えている可能性があるときは二重丸にする。 */
function Amount({ f, index, draw }: { f: Finding; index: number; draw: boolean }) {
  if (f.amount === null) return <span className="text-[13px] text-ink-soft">未入力</span>
  const text = (
    <span className="num">
      {f.totalRole === 'subtract' ? '−' : ''}
      {formatYen(f.amount)}
    </span>
  )
  if (f.level === 'check' || f.level === 'alert') {
    return (
      <PenCircle variant={index} strong={f.level === 'alert'} draw={draw} delay={index * STEP} className="text-pen">
        <span className="text-ink">{text}</span>
      </PenCircle>
    )
  }
  return text
}

/** 余白の書き込み。 */
function Note({ f, index, draw }: { f: Finding; index: number; draw: boolean }) {
  const fade = draw ? 'animate-in fade-in fill-mode-both duration-500' : ''
  const style = fadeStyle(draw, index * STEP)
  if (f.level === 'check' || f.level === 'alert') {
    return (
      <p className={cn('font-pen text-[16px] text-pen', fade)} style={style}>
        <PenArrow className="mr-1 align-[-0.05em]" />
        {f.headline}
      </p>
    )
  }
  if (f.level === 'note') {
    return (
      <p className={cn('font-pen text-[15px] text-pencil', fade)} style={style}>
        {f.headline}
      </p>
    )
  }
  return (
    <p className={cn('flex items-start gap-1.5 text-[13px] leading-6 text-ink-soft', fade)} style={style}>
      <PenCheck draw={draw} delay={index * STEP} className="mt-[0.2em] text-pencil" />
      <span>{f.headline}</span>
    </p>
  )
}

export type InspectedSheetProps = {
  inspection: Inspection
  /** 赤ペンを、描く動きつきで出す。 */
  draw?: boolean
  /** 項目の名前を、くわしい結果（id="finding-<行のID>"）へのリンクにする。 */
  linkToDetails?: boolean
  /** リンクを押したときに呼ぶ（くわしい結果を開く、など）。 */
  onSelect?: (lineId: string) => void
  /** 出す行の数（LP で、上のほうだけ見せたいとき）。 */
  limit?: number
  className?: string
}

export function InspectedSheet({ inspection, draw = false, linkToDetails = false, onSelect, limit, className }: InspectedSheetProps) {
  const findings = limit === undefined ? inspection.findings : inspection.findings.slice(0, limit)
  return (
    <div className={className}>
      <div aria-hidden className={cn(ROW, 'hidden border-b-[1.5px] border-ink/70 pb-1.5 text-xs text-ink-soft sm:grid')}>
        <span className="text-center">No.</span>
        <span>項目</span>
        <span className="pr-[0.9em] text-right">金額（税込）</span>
        <span>赤ペンの書き込み</span>
      </div>
      <ol className="border-t-[1.5px] border-ink/70 sm:border-t-0">
        {findings.map((f, i) => (
          <li key={f.lineId} className={cn(ROW, 'print-keep items-start border-b border-rule py-2.5 sm:py-3')}>
            <span aria-hidden className="num pt-[0.15em] text-center text-[13px] text-ink-soft">
              {i + 1}
            </span>
            <div className="min-w-0">
              {linkToDetails ? (
                <a
                  href={`#finding-${f.lineId}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelect?.(f.lineId)
                    scrollToId(`finding-${f.lineId}`)
                  }}
                  className="text-[15px] leading-snug underline decoration-ink/30 decoration-dotted underline-offset-4 hover:decoration-ink hover:decoration-solid print:no-underline"
                >
                  {f.label}
                </a>
              ) : (
                <span className="text-[15px] leading-snug">{f.label}</span>
              )}
              {f.totalRole === 'exclude' && <span className="ml-1.5 whitespace-nowrap text-xs text-ink-soft">（合計に入れない）</span>}
              {f.totalRole === 'subtract' && f.amount !== null && <span className="ml-1.5 whitespace-nowrap text-xs text-ink-soft">（合計から引く）</span>}
            </div>
            <div className="pl-[0.7em] pr-[0.9em] text-right text-[15px] leading-snug">
              <Amount f={f} index={i} draw={draw} />
            </div>
            <div className="col-span-2 col-start-2 mt-1.5 min-w-0 sm:col-span-1 sm:col-start-auto sm:mt-0">
              <Note f={f} index={i} draw={draw} />
            </div>
          </li>
        ))}
      </ol>
      {limit === undefined && (
        <div className={cn(ROW, 'items-baseline border-b-[1.5px] border-ink/70 py-3')}>
          <span />
          <span className="text-[15px] font-bold">合計</span>
          <span className="pl-[0.7em] pr-[0.9em] text-right text-lg font-bold leading-none">
            <PenUnderline draw={draw} delay={findings.length * STEP} className="text-pencil">
              <span className="num text-ink">{formatYen(inspection.total)}</span>
            </PenUnderline>
          </span>
          <span className="col-span-2 col-start-2 mt-1 text-[13px] leading-6 text-ink-soft sm:col-span-1 sm:col-start-auto sm:mt-0">
            {inspection.missingAmountCount > 0 ? `金額が未入力の ${inspection.missingAmountCount}項目は、入っていません。` : '入力した項目を足した金額です。'}
          </span>
        </div>
      )}
    </div>
  )
}
