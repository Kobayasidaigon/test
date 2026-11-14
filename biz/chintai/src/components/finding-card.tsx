import type { ReactNode } from 'react'
import { getCategory } from '@/core/categories'
import { formatYen } from '@/core/format'
import { OTHER_ITEM_ID } from '@/core/items'
import type { Finding } from '@/core/types'
import { guidePath } from '@/lib/guide-link'
import { cn } from '@/lib/utils'
import { Link } from '@/router'
import { FindingMark } from './category-mark'
import { BasisList } from './source-link'
import { DisclosureChevron, DisclosurePanel, type AccordionHeaderProps, type AccordionPanelProps } from './ui/disclosure'

// 1行についての、くわしい点検の結果。
// 上に、ひとことの判定（赤ペンの字）と、添えること（外せないこともある、など）をいつも見せる。
// 「なぜそう言うのか」「確かめること」「聞き方」「根拠」は、開くと出る（印刷では、全部開いて出る）。

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h4 className="mb-1.5 text-[13px] font-bold leading-snug text-ink">{title}</h4>
      {children}
    </section>
  )
}

/** 開くと出る中身。解説ページなど、ほかの場所でも使えるように分けてある。 */
export function FindingDetails({ f, className }: { f: Finding; className?: string }) {
  const attention = f.level === 'check' || f.level === 'alert'
  const guide = guidePath(f.guideSlug)
  return (
    <div className={cn('space-y-5', className)}>
      <Section title="なぜそう言うのか">
        <ul className="space-y-1.5 text-sm leading-7">
          {f.reasons.map((r, i) => (
            <li key={i} className="print-keep flex gap-2">
              <span aria-hidden className="mt-[0.85em] size-1 shrink-0 rounded-full bg-ink/60" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Section>

      {f.checks.length > 0 && (
        <Section title="確かめること">
          <ul className="space-y-1.5 text-sm leading-7">
            {f.checks.map((c, i) => (
              <li key={i} className="print-keep flex gap-2.5">
                {/* 印刷して持っていったときに、確かめたら印を付けられる、空のチェック欄。 */}
                <span aria-hidden className="mt-[0.45em] size-[13px] shrink-0 rounded-[1px] border-[1.5px] border-ink/60" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="聞き方">
        <p className="print-keep border-l-4 border-marker bg-marker-soft/60 px-3 py-2 text-sm leading-7">{f.howToAsk}</p>
      </Section>

      {f.basisStatus === 'verified' && f.basis.length > 0 && (
        <Section title="根拠（法令や、国・自治体の資料に書かれていること）">
          <BasisList notes={f.basis} />
        </Section>
      )}
      {/* 一覧にない項目（'other'）は、「確かめていない」ことを、下の「確かめられなかったこと」で伝える。 */}
      {f.basisStatus === 'none-found' && f.itemId !== OTHER_ITEM_ID && (
        <Section title="根拠">
          <p className="text-sm leading-7">この項目についての、国の決まりや資料は、見つかりませんでした。</p>
        </Section>
      )}

      {f.related.length > 0 && (
        <Section title="参考（決まりではありませんが、公的な機関の案内や、相談の例です）">
          <BasisList notes={f.related} />
        </Section>
      )}

      {f.limits.length > 0 && (
        <Section title="この道具が、確かめられなかったこと">
          <ul className="space-y-1 text-sm leading-7">
            {f.limits.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* 確かめる項目では、同じ文を上にいつも出しているので、ここでは出さない。 */}
      {!attention && f.caveat && (
        <Section title="添えておくこと">
          <p className="text-sm leading-7">{f.caveat}</p>
        </Section>
      )}

      {guide && (
        <p className="no-print text-sm">
          <Link to={guide} className="underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            「{f.itemName}」の解説を読む
          </Link>
        </p>
      )}
    </div>
  )
}

export type FindingCardProps = {
  f: Finding
  /** 見積書の中の、何行目か（1 から）。 */
  n: number
  header: AccordionHeaderProps
  panel: AccordionPanelProps
  /** 右下に置くもの（「確認の文面に入れる」のチェック など）。 */
  footer?: ReactNode
  className?: string
}

export function FindingCard({ f, n, header, panel, footer, className }: FindingCardProps) {
  const category = getCategory(f.category)
  const attention = f.level === 'check' || f.level === 'alert'
  const open = header['aria-expanded']
  return (
    <li
      id={`finding-${f.lineId}`}
      tabIndex={-1}
      className={cn(
        'scroll-mt-20 border-b border-rule py-5 outline-none first:pt-2 focus-visible:bg-marker-soft/40',
        // 印刷では、確かめる項目と、開いてある項目だけを出す（ほかの項目は、1枚目の見積書の一覧にある）。
        !attention && !open && 'print:hidden',
        className,
      )}
    >
      <div className="print-keep grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <FindingMark f={f} variant={n} className="mt-0.5 text-[15px]" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <h3 className="text-base font-bold leading-snug">
              <span className="num mr-1.5 text-[13px] font-normal text-ink-soft">{n}.</span>
              {f.label}
            </h3>
            <span className="num text-base font-bold">
              {f.amount === null ? <span className="text-[13px] font-normal text-ink-soft">金額は未入力</span> : `${f.totalRole === 'subtract' ? '−' : ''}${formatYen(f.amount)}`}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-ink-soft">
            区分: {category.label}
            {f.label !== f.itemName && <span>　／　「{f.itemName}」として点検</span>}
            {f.totalRole === 'exclude' && <span>　／　合計には入れていません</span>}
          </p>

          <p className={cn('mt-2', attention ? 'font-pen text-[17px] text-pen' : f.level === 'note' ? 'font-pen text-[16px] text-pencil' : 'text-sm leading-7 text-ink')}>
            {f.headline}
          </p>
          {attention && f.caveat && <p className="mt-1 text-[13px] leading-6 text-ink-soft">※ {f.caveat}</p>}
        </div>
      </div>

      <div className="mt-2 pl-0 sm:pl-[calc(1.9em+0.75rem)]">
        <div className="no-print flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <button
            {...header}
            className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm text-ink underline decoration-ink/30 underline-offset-4 hover:bg-ink/[0.05] hover:decoration-ink"
          >
            <span>{open ? '理由と根拠を閉じる' : '理由と根拠を見る'}</span>
            <span className="sr-only">（{f.label}）</span>
            <DisclosureChevron open={open} />
          </button>
          {footer}
        </div>
        {/* 確かめる項目は、印刷では、閉じていても開いて出す。 */}
        <DisclosurePanel {...panel} printOpen={attention}>
          <FindingDetails f={f} className="border-t border-dashed border-rule-strong/60 pb-1 pt-4" />
        </DisclosurePanel>
      </div>
    </li>
  )
}
