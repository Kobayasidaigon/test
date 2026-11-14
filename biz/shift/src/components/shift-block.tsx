// 勤務のブロック。色つきの四角に、記号（早・遅 など）を1〜2文字。
// 表のマス、記号の説明、選択肢、LP の見本で、同じ見た目を使う（見た目は src/index.css の .blk）。
import type { ShiftColor, ShiftType } from '@/core'
import { cn } from '@/lib/utils'

export type BlockSize = 'sm' | 'md' | 'lg'

/** 表に出す記号。記号が空なら、名前の頭の1文字で代える */
export function symbolOf(shift: Pick<ShiftType, 'symbol' | 'name'>): string {
  return shift.symbol || [...shift.name][0] || '？'
}

export function ShiftBlock({
  shift,
  size = 'md',
  className,
  label,
}: {
  shift: Pick<ShiftType, 'symbol' | 'name' | 'color'>
  size?: BlockSize
  className?: string
  /** 読み上げ用の名前。省くと、読み上げない（となりに名前の字があるとき） */
  label?: string
}) {
  return (
    <span className={cn('blk', className)} data-color={shift.color} data-size={size === 'md' ? undefined : size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {symbolOf(shift)}
    </span>
  )
}

/** 色だけのブロック（色を選ぶところ用） */
export function ColorBlock({ color, size = 'md', className }: { color: ShiftColor | 'off'; size?: BlockSize; className?: string }) {
  return <span className={cn('blk', className)} data-color={color} data-size={size === 'md' ? undefined : size} aria-hidden />
}

/** 休み希望のブロック（紺の地に白ぬきの「休」） */
export function OffBlock({ size = 'md', className }: { size?: BlockSize; className?: string }) {
  return (
    <span className={cn('blk', className)} data-color="off" data-size={size === 'md' ? undefined : size} aria-hidden>
      休
    </span>
  )
}
