// 案D「家計レシート」 — 伝票（注文票）に印字された選択肢。選ぶと、赤ペンの丸がくるっと描かれる。
// ふるまい（矢印キー・Home/End、選んだものだけ Tab で止まる）は 21st「Receipt Pricing」（n1m4mz）の
// period-toggle のラジオグループの書き方を借りた。見た目と丸の描き方はこの案で作った。
import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface ChoiceOption<T extends string | number> {
  value: T
  label: string
  sub?: string
  icon?: ReactNode
  group?: string
  aria?: string
  disabled?: boolean
}

/** 手で描いたような、少しゆがんで最後が重なる楕円。 */
function handEllipse(w: number, h: number, seed: number) {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2 - 2.5
  const ry = h / 2 - 2.5
  const start = -2.75 + seed * 0.13
  const sweep = Math.PI * 2 + 0.6
  const n = 48
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = start + sweep * t
    const wob = 1 + 0.035 * Math.sin(a * 3 + seed) + 0.018 * Math.sin(a * 5 + seed * 2)
    const grow = 0.95 + 0.07 * t
    pts.push(`${(cx + Math.cos(a) * rx * wob * grow).toFixed(1)} ${(cy + Math.sin(a) * ry * wob * grow - 1.4 * t).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

export function HandCircle({ seed = 1, padX = 12, padY = 7 }: { seed?: number; padX?: number; padY?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const reduce = useReducedMotion()
  useLayoutEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = (box?.w ?? 0) + padX * 2
  const H = (box?.h ?? 0) + padY * 2
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', left: -padX, top: -padY, pointerEvents: 'none', overflow: 'visible' }}
    >
      {box && (
        <motion.path
          d={handEllipse(W, H, seed)}
          fill="none"
          stroke="var(--red)"
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.42, ease: [0.3, 0.7, 0.4, 1] }}
        />
      )}
    </svg>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true">
      <path d="M3 8.4 L6.6 12 L13.4 3.6" fill="none" stroke="var(--red)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChoiceSlip<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 1,
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T
  onChange: (v: T) => void
  columns?: 1 | 2
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = options.findIndex((o) => o.value === value)
  const focusable = selected >= 0 ? selected : options.findIndex((o) => !o.disabled)

  const move = (from: number, step: number) => {
    const n = options.length
    let i = from
    for (let k = 0; k < n; k++) {
      i = (i + step + n) % n
      if (!options[i].disabled) return i
    }
    return from
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = move(i, 1)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = move(i, -1)
    else if (e.key === 'Home') next = move(-1, 1)
    else if (e.key === 'End') next = move(options.length, -1)
    else return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  // グループ（都道府県など）ごとに見出しを出す
  const groups: { name?: string; items: { o: ChoiceOption<T>; i: number }[] }[] = []
  options.forEach((o, i) => {
    const last = groups[groups.length - 1]
    if (!last || last.name !== o.group) groups.push({ name: o.group, items: [{ o, i }] })
    else last.items.push({ o, i })
  })

  return (
    <div role="radiogroup" aria-label={label} className="vd-slip px-2 pb-2 pt-1">
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {g.name && (
            <p aria-hidden="true" className="px-3 pb-0.5 pt-2.5 text-[12px] font-bold tracking-[0.18em] text-[var(--ink-2)]">
              {g.name}
            </p>
          )}
          <div className={cn('grid', columns === 2 ? 'grid-cols-2 gap-x-1' : 'grid-cols-1 divide-y divide-dashed divide-[rgba(42,39,48,.14)]')}>
            {g.items.map(({ o, i }) => {
              const checked = i === selected
              return (
                <button
                  key={String(o.value)}
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={o.aria}
                  aria-disabled={o.disabled || undefined}
                  tabIndex={i === focusable ? 0 : -1}
                  onClick={() => !o.disabled && onChange(o.value)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={cn('vd-opt', o.disabled && 'cursor-not-allowed opacity-45')}
                >
                  <span className="vd-box">{checked && <Check />}</span>
                  {o.icon && <span className="flex-none text-[var(--ink-2)]">{o.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="relative inline-block text-[16px] leading-snug">
                      {o.label}
                      {checked && <HandCircle seed={i + 1} />}
                    </span>
                    {o.sub && <span className="mt-0.5 block text-[12.5px] font-normal leading-snug text-[var(--ink-2)]">{o.sub}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
