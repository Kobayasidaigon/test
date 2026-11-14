import { AD_LABEL } from '@/core/texts'
import type { Offer } from '@/offers'
import { cn } from '@/lib/utils'

// 広告の枠。このサイトの収入は、ここの広告だけ。
// - 出すのは、src/offers.ts の visibleOffers() が返した枠だけ（リンク先が入っていない枠は、返ってこない。いまは全部空）。
// - 必ず「広告」と書く。点検の結果とは、線で区切って、紙（結果）の外に置く。
// - 外部のタグやスクリプトは使わない。ふつうのリンクだけ。

export function OfferSlot({ offers, className }: { offers: Offer[]; className?: string }) {
  if (offers.length === 0) return null
  return (
    <aside aria-label={AD_LABEL} className={cn('border border-rule-strong/70 bg-muted/60 p-4', className)}>
      <p className="mb-2 inline-block border border-ink-soft/60 px-1.5 text-xs leading-5 text-ink-soft">{AD_LABEL}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {offers.map((o) => (
          <li key={o.id} className="bg-paper p-3">
            <a href={o.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className="text-sm font-bold underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
              {o.title}
            </a>
            {o.description && <p className="mt-1 text-[13px] leading-6 text-ink-soft">{o.description}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-ink-soft">点検の結果は、広告とは関係なく決まります。</p>
    </aside>
  )
}
