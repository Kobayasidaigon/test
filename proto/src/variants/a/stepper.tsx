/*
 * 人数のカウンター（大人・子ども）
 * 元にした部品: 21st「Number Flow」 — 作者 educalvolpz (Eduardo Calvo)
 *   https://21st.dev/@educalvolpz/components/number-flow
 * 変えたところ:
 *   - 「増えたら上へ、減ったら下へ、変わったけただけ転がる」考え方はそのまま。
 *     CSS クラスを付け外しする作りを、motion の AnimatePresence で書き直した。
 *   - 3けたの箱をやめ、ガチャの筐体についている小さな数字窓（墨色の窓に黄色の数字）1つにした。
 *   - ＋／−ボタンを左右に置き、日本語のラベルと「◯人」の読み上げを付けた。全画面の外枠は外した。
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Stepper({ label, value, min, max, onChange, unit = '人', stacked = false, className }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string; stacked?: boolean; className?: string }) {
  const reduce = useReducedMotion()
  // 前の値から、転がる向きを決める（描画中に前回の値を覚えておく React の書き方）
  const [seen, setSeen] = useState({ v: value, dir: 1 as 1 | -1 })
  if (seen.v !== value) setSeen({ v: value, dir: value > seen.v ? 1 : -1 })
  const dir = seen.v !== value ? (value > seen.v ? 1 : -1) : seen.dir
  const dy = reduce ? 0 : 22
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-2', stacked && 'flex-wrap justify-center gap-x-1.5 gap-y-1', className)}>
      <span className={cn('text-[15px] font-black', stacked ? 'w-full text-center text-[13px]' : 'min-w-[3.2em]')}>{label}</span>
      <button
        type="button"
        aria-label={`${label}をへらす`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="va-push grid h-10 w-10 place-items-center !rounded-full !shadow-[0_3px_0_var(--ink)] disabled:opacity-40"
        style={{ background: 'var(--paper)' }}
      >
        <Minus className="h-4 w-4" strokeWidth={3.2} aria-hidden />
      </button>
      <span className="relative inline-flex h-11 w-10 items-center justify-center overflow-hidden rounded-[10px] border-[3px] border-[var(--ink)] bg-[var(--ink)]" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            initial={{ y: dir * dy, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -dir * dy, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            className="va-pop text-[22px] leading-none text-[var(--yolk)]"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        aria-label={`${label}をふやす`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="va-push grid h-10 w-10 place-items-center !rounded-full !shadow-[0_3px_0_var(--ink)] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={3.2} aria-hidden />
      </button>
      <span className="va-sr" aria-live="polite">
        {label} {value}
        {unit}
      </span>
    </div>
  )
}
