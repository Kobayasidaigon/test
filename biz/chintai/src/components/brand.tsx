import { Link } from '@/router'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'

// サイトの印。白い見積書に、赤ペンの丸が1つ入った絵（public/favicon.svg と同じ絵）。

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn('size-7 shrink-0', className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 3.5 H 24.5 V 28.5 H 7.5 Z" fill="#fff" stroke="var(--ink)" strokeWidth="1.8" />
      <path d="M11.5 9.5 H 20.5 M11.5 14 H 20.5" stroke="var(--rule-strong)" strokeWidth="1.6" />
      <path d="M11.5 20.5 H 15" stroke="var(--rule-strong)" strokeWidth="1.6" />
      <path d="M17.2 18.2 C 20.5 16.6 26.6 17 27.6 19.8 C 28.6 22.8 23.6 24.6 19.8 24 C 16.2 23.4 14.6 20.6 17.6 18.4 C 18.6 17.7 19.8 17.4 20.8 17.4" stroke="var(--pen)" strokeWidth="1.8" />
    </svg>
  )
}

/** サイトの名前（トップへ戻るリンク）。 */
export function Brand({ className }: { className?: string }) {
  return (
    // 名前は、途中で折れないようにする（せまい画面で「みつもり点／検」と2行になるのを防ぐ）。
    <Link to="/" className={cn('inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm text-ink no-underline', className)} aria-label={`${site.name}のトップへ`}>
      <BrandMark />
      <span className="whitespace-nowrap text-[17px] font-bold leading-none tracking-[0.04em]">{site.name}</span>
    </Link>
  )
}
