// サービスの印。3つのブロックが、L字にはまった形（自分で描いた SVG）。LP と道具の画面の両方で使う。
import { site } from '@/site.config'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden focusable="false">
      <rect x="2.25" y="2.25" width="12.5" height="12.5" rx="2.5" fill="var(--shift-egg)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="2.25" y="17.25" width="12.5" height="12.5" rx="2.5" fill="var(--shift-tomato)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="17.25" y="17.25" width="12.5" height="12.5" rx="2.5" fill="var(--shift-sky)" stroke="var(--ink)" strokeWidth="2.5" />
    </svg>
  )
}

/** 印 + サービスの名前 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-[1.05rem] font-extrabold leading-none text-ink', className)}>
      <LogoMark className="size-7" />
      {site.name}
    </span>
  )
}
