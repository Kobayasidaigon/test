import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// 赤ペンの線。自分で描いた SVG（少しゆがんだ、手描きの線）。
//
// - 色は currentColor。赤ペン（text-pen）か、えんぴつ（text-pencil）かは、使う側のクラスで決める。
// - 線の太さは、囲む相手の大きさが変わっても同じにする（.pen-stroke の vector-effect）。
// - draw を付けると、描く動きが付く（動きを減らす設定のときと、印刷のときは、はじめから全部出る）。
// - どれも飾りなので、読み上げには出さない（aria-hidden）。意味は、必ず言葉でも伝えること。

type PenProps = {
  /** 描く動きを付ける。 */
  draw?: boolean
  /** 描き始めるまでの時間（ミリ秒）。順番に描かれていくように、行ごとにずらす。 */
  delay?: number
  className?: string
}

const delayStyle = (delay?: number): CSSProperties | undefined => (delay ? ({ '--pen-delay': `${delay}ms` } as CSSProperties) : undefined)

// 同じ形の丸が並ぶと、判子に見えてしまうので、形を3つ用意して、行ごとに変える。
// どれも、書き始めと書き終わりが少し重なる、ひと筆の楕円（200×80 のマスに描いてある）。
const CIRCLES = [
  'M 24 15 C 62 2 150 0 184 17 C 204 29 199 58 171 68 C 129 82 51 80 21 64 C -2 51 1 27 31 12 C 45 6 63 4 78 5',
  'M 31 10 C 81 -1 160 5 187 23 C 203 37 191 62 160 70 C 110 82 41 78 15 58 C -3 43 7 19 45 8 C 61 4 84 2 97 4',
  'M 17 23 C 35 5 121 -1 176 12 C 205 22 203 54 177 66 C 135 82 57 82 23 66 C -1 54 -1 31 23 16 C 31 11 41 8 54 7',
]

/**
 * 中身を、赤ペンの丸で囲む。strong を付けると、二重丸になる（上限の決まりを超えている可能性があるとき）。
 * 丸は、中身の外に少しはみ出す。まわりに 0.7em ほどの余白をあけて使うこと。
 */
export function PenCircle({
  children,
  variant = 0,
  strong = false,
  draw,
  delay,
  className,
}: PenProps & { children: ReactNode; variant?: number; strong?: boolean }) {
  const d = CIRCLES[Math.abs(variant) % CIRCLES.length]
  return (
    <span className={cn('relative inline-block', className)}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        className={cn('pointer-events-none absolute overflow-visible', draw && 'pen-draw')}
        style={{ left: '-0.6em', top: '-0.28em', width: 'calc(100% + 1.2em)', height: 'calc(100% + 0.56em)', ...delayStyle(delay) }}
      >
        <path className="pen-stroke" pathLength={1} d={d} strokeWidth={1.7} />
        {strong && (
          <path
            className="pen-stroke"
            pathLength={1}
            d={CIRCLES[(Math.abs(variant) + 1) % CIRCLES.length]}
            strokeWidth={1.4}
            transform="translate(100 40) scale(1.07 1.22) translate(-100 -40)"
            style={{ animationDelay: `calc(var(--pen-delay, 0ms) + 350ms)` }}
          />
        )}
      </svg>
    </span>
  )
}

/** 中身の下に、赤ペンの線を引く。double で二重線。 */
export function PenUnderline({ children, double = false, draw, delay, className }: PenProps & { children: ReactNode; double?: boolean }) {
  return (
    <span className={cn('relative inline-block', className)}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        className={cn('pointer-events-none absolute inset-x-0 overflow-visible', draw && 'pen-draw')}
        style={{ bottom: '-0.42em', height: '0.5em', width: '100%', ...delayStyle(delay) }}
      >
        <path className="pen-stroke" pathLength={1} d="M 2 5 C 34 1 62 8 101 4 S 168 2 198 5" strokeWidth={1.7} />
        {double && (
          <path
            className="pen-stroke"
            pathLength={1}
            d="M 5 11 C 40 8 70 13 108 10 S 170 9 196 12"
            strokeWidth={1.4}
            style={{ animationDelay: `calc(var(--pen-delay, 0ms) + 250ms)` }}
          />
        )}
      </svg>
    </span>
  )
}

/** チェックの印（気になる点が見つからなかった行に付ける）。 */
export function PenCheck({ draw, delay, className }: PenProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn('inline-block size-[1.25em] shrink-0 overflow-visible', draw && 'pen-draw', className)} style={delayStyle(delay)}>
      <path className="pen-stroke" pathLength={1} d="M 3.5 12.5 C 5.5 14.5 7.5 17.5 9.5 21 C 12.5 13 17 7 21.5 2.5" strokeWidth={2} />
    </svg>
  )
}

/** 余白の書き込みの前に置く、短い矢印（左を指す）。 */
export function PenArrow({ draw, delay, className }: PenProps) {
  return (
    <svg aria-hidden viewBox="0 0 34 20" className={cn('inline-block h-[0.9em] w-[1.5em] shrink-0 overflow-visible', draw && 'pen-draw', className)} style={delayStyle(delay)}>
      <path className="pen-stroke" pathLength={1} d="M 32 7 C 22 4 12 7 3 12" strokeWidth={1.7} />
      <path className="pen-stroke" pathLength={1} d="M 10 5 L 3 12 L 12 16" strokeWidth={1.7} />
    </svg>
  )
}

/**
 * 小さな丸の中に、1文字の印を入れる（区分の印: ？ 限 選 誰 重 契 他）。
 * 色が見えなくても区分がわかるように、文字そのものを変えてある。
 */
export function PenBadge({ mark, variant = 0, draw, delay, className }: PenProps & { mark: string; variant?: number }) {
  const rings = [
    'M 7 5 C 13 0 24 1 28 8 C 32 16 29 26 21 29 C 12 32 3 28 2 19 C 1 12 4 6 11 3',
    'M 9 3 C 17 -1 27 3 29 12 C 31 21 25 29 16 30 C 7 31 1 24 2 15 C 3 9 7 4 14 2',
  ]
  return (
    <span className={cn('relative inline-grid size-[1.9em] shrink-0 place-items-center', className)}>
      <svg aria-hidden viewBox="0 0 32 32" className={cn('pointer-events-none absolute inset-0 size-full overflow-visible', draw && 'pen-draw')} style={delayStyle(delay)}>
        <path className="pen-stroke" pathLength={1} d={rings[Math.abs(variant) % rings.length]} strokeWidth={1.6} />
      </svg>
      <span aria-hidden className="font-pen text-[0.95em] leading-none">
        {mark}
      </span>
    </span>
  )
}

/** 紙の罫線に使う、二重線（見積書の題の下など）。 */
export function DoubleRule({ className }: { className?: string }) {
  return <div aria-hidden className={cn('h-[5px] border-y border-rule-strong', className)} />
}
