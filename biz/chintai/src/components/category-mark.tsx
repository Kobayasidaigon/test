import { getCategory } from '@/core/categories'
import type { CategoryId, Finding } from '@/core/types'
import { cn } from '@/lib/utils'
import { PenBadge, PenCheck } from './pen'

// 区分の印。
// - 確かめる区分は、赤ペンの小さな丸の中に、区分ごとの1文字（？ 限 選 誰 重 契 他）。
// - 「ふつうはかかる」は、えんぴつ色のチェック。
// 色だけで区分を伝えないように、印の文字そのものを変えてある。言葉（区分の名前）も、必ず近くに出すこと。

type Props = {
  id: CategoryId
  /** 丸の形を、行ごとに少し変えるための番号。 */
  variant?: number
  draw?: boolean
  delay?: number
  className?: string
}

/** 区分の印だけ（飾り。読み上げには出さない）。 */
export function CategoryMark({ id, variant, draw, delay, className }: Props) {
  const c = getCategory(id)
  if (c.attention === 'calm') {
    return (
      <span className={cn('inline-grid size-[1.9em] shrink-0 place-items-center text-pencil', className)}>
        <PenCheck draw={draw} delay={delay} />
      </span>
    )
  }
  return <PenBadge mark={c.mark} variant={variant} draw={draw} delay={delay} className={cn('text-pen', className)} />
}

/** 区分の印と、名前。 */
export function CategoryTag({ id, variant, className }: Props) {
  const c = getCategory(id)
  return (
    <span className={cn('inline-flex items-center gap-1.5 align-middle', className)}>
      <CategoryMark id={id} variant={variant} className="text-[0.82em]" />
      <span>{c.label}</span>
    </span>
  )
}

/**
 * 1行の点検の結果に付ける印。
 * - 形（文字）は区分で決まる。ただし、「ふつうはかかる」の行でも、計算が目安と違って確かめる項目になったときは「！」にする。
 * - 色は、判定の強さで決まる。確かめる項目（check・alert）だけが赤ペン。ほかは、えんぴつ色。
 *   赤を「確かめる項目」だけに使うことで、赤が並んでいる行を拾えば、聞くことの一覧になる。
 */
export function FindingMark({ f, variant, draw, delay, className }: { f: Pick<Finding, 'category' | 'level'> } & Omit<Props, 'id'>) {
  const c = getCategory(f.category)
  const attention = f.level === 'check' || f.level === 'alert'
  if (c.attention === 'calm' && !attention) {
    return (
      <span className={cn('inline-grid size-[1.9em] shrink-0 place-items-center text-pencil', className)}>
        <PenCheck draw={draw} delay={delay} />
      </span>
    )
  }
  return <PenBadge mark={c.attention === 'calm' ? '！' : c.mark} variant={variant} draw={draw} delay={delay} className={cn(attention ? 'text-pen' : 'text-pencil', className)} />
}
