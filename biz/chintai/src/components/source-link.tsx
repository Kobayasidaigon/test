import { formatDateJa } from '@/core/format'
import type { Source } from '@/core/sources'
import type { ResolvedBasis } from '@/core/types'
import { cn } from '@/lib/utils'

// 根拠の出し方。どの文にも、出典（発行元、文書名、文書の中の場所、確かめた日）とリンクを付ける。
// 印刷したときは、リンクのあとに URL を出す（index.css の a.print-url）。

/** 出典へのリンク（公式サイトを、別のタブで開く）。 */
export function SourceLink({ source, className }: { source: Source; className?: string }) {
  return (
    <span className={cn('text-[13px] leading-6 text-ink-soft', className)}>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="print-url text-ink underline decoration-ink/35 underline-offset-[3px] hover:decoration-ink">
        {source.publisher}「{source.title}」
      </a>
      {source.place && <span>　{source.place}</span>}
      <span className="whitespace-nowrap">（{formatDateJa(source.verifiedOn)}に確認）</span>
    </span>
  )
}

/** 根拠の文と、その出典の一覧。 */
export function BasisList({ notes, className }: { notes: ResolvedBasis[]; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {notes.map((note, i) => (
        <li key={i} className="border-l-2 border-rule-strong pl-3">
          <p className="text-sm leading-7">{note.text}</p>
          <ul className="mt-1 space-y-0.5">
            {note.sources.map((s) => (
              <li key={s.id} className="flex gap-1.5">
                <span aria-hidden className="shrink-0 whitespace-nowrap text-[13px] leading-6 text-ink-soft">出典</span>
                <span className="sr-only">出典:</span>
                <SourceLink source={s} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
