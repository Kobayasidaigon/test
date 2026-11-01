/*
 * 札（ふだ）でえらぶ — 働き方・今の街
 * 元にした部品: 21st「Segmented Control」 — 作者 balick
 *   https://21st.dev/@balick/components/segmented-control
 * 変えたところ:
 *   - ラジオグループとしてのふるまい（矢印キー・Home/End で選択が動く、選んだものだけ Tab で止まる）と、
 *     選んだところへ「しるし」が layoutId ですべっていく考え方はそのまま使った。
 *   - 横一列のピルをやめ、ひもで吊るした札を格子に並べた。すべっていくのは黄色い札の地。
 *   - 選んだ札は少しゆれて、赤い丸のしるしがポンと付く。札には小さな説明（hint）と絵（icon）も付けられ、
 *     選んだときの地の色（tint。街のカプセルの色など）も変えられる。
 *   - 小さい札（compact）は字を13pxにして折り返さない。minCol を渡すと、札がその幅より細くなる画面では
 *     札を縦に並べる（「通わない」が札のふちからはみ出さないように）。
 */
import { motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TagOption<T extends string> {
  value: T
  label: ReactNode
  sub?: ReactNode
  hint?: ReactNode
  aria?: string
  icon?: ReactNode
  tint?: string
}

export function TagGroup<T extends string>({ options, value, onChange, ariaLabel, columns = 2, compact = false, minCol }: {
  options: TagOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  columns?: number
  compact?: boolean
  minCol?: number // 札の最小の幅（px）。入りきらない幅では、札を縦に並べる
}) {
  const pill = useId()
  const reduce = useReducedMotion()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const select = (index: number) => {
    const i = (index + options.length) % options.length
    onChange(options[i].value)
    refs.current[i]?.focus()
  }
  const onKey = (e: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + columns, ArrowLeft: index - 1, ArrowUp: index - columns, Home: 0, End: options.length - 1 }
    if (e.key in moves) {
      e.preventDefault()
      select(Math.max(0, Math.min(options.length - 1, moves[e.key])))
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid gap-y-3.5', compact ? 'gap-x-1.5' : 'gap-x-2.5')}
      style={{ gridTemplateColumns: minCol ? `repeat(auto-fit, minmax(${minCol}px, 1fr))` : `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o, index) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(n) => {
              refs.current[index] = n
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.aria}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, index)}
            className="group relative rounded-[16px] pt-3 text-left"
          >
            {/* くぎと、ひも */}
            <span aria-hidden className="absolute left-1/2 top-[-3px] h-[9px] w-[9px] -translate-x-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--metal)]" />
            <span aria-hidden className="absolute left-1/2 top-[4px] h-3 w-[2.5px] -translate-x-1/2 rounded-full bg-[var(--ink)]" />
            <motion.span
              className={cn(
                'relative block rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] shadow-[3px_4px_0_var(--ink)]',
                compact ? 'px-1.5 pb-1.5 pt-2.5 text-center' : 'px-3 pb-3 pt-3.5',
              )}
              style={{ transformOrigin: '50% -12px' }}
              animate={on && !reduce ? { rotate: [0, -5, 3.5, -1.5, 0] } : { rotate: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {on && (
                <motion.span
                  layoutId={pill}
                  className="absolute inset-0 rounded-[11px]"
                  style={{ background: o.tint ?? 'var(--yolk)' }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.22, duration: 0.42 }}
                />
              )}
              {/* 札の穴 */}
              <span aria-hidden className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)]" />
              <span className={cn('relative block', o.icon && 'flex items-center gap-1.5')}>
                {o.icon && <span className="shrink-0">{o.icon}</span>}
                <span className="block min-w-0">
                {o.sub && <span className="block text-[12px] font-bold leading-tight text-[var(--ink-soft)]">{o.sub}</span>}
                <span className={cn('block font-black leading-snug [word-break:keep-all]', compact ? 'whitespace-nowrap text-[13px]' : 'text-[16px]')}>
                  {typeof o.label === 'string' ? o.label.replace(/・/g, '・\u200b') : o.label}
                </span>
                {o.hint && <span className="mt-0.5 block text-[12px] font-bold leading-snug text-[var(--ink-soft)]">{o.hint}</span>}
                </span>
              </span>
              {on && (
                <motion.span
                  aria-hidden
                  initial={reduce ? false : { scale: 1.8, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: -12 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22, opacity: { duration: 0.12 } }}
                  className="absolute -right-2 -top-2.5 grid h-8 w-8 place-items-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)] text-white"
                >
                  <Check className="h-4 w-4" strokeWidth={4} />
                </motion.span>
              )}
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}
