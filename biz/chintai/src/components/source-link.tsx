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

/** 出典の番号（丸の中の数字）。20 までは丸数字、それより多いときは「(21)」の形。 */
function sourceMark(n: number): string {
  return n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`
}

/**
 * 根拠の文と、その出典の一覧。
 * 同じ資料が、いくつもの文の出典になることが多いので、文のあとには番号（①②）だけを置き、
 * 資料の名前とリンクは、下に1回ずつ並べる（同じ資料の名前を、何度もくり返さないため）。
 */
export function BasisList({ notes, className }: { notes: ResolvedBasis[]; className?: string }) {
  const sources: Source[] = []
  for (const note of notes) for (const s of note.sources) if (!sources.some((x) => x.id === s.id)) sources.push(s)
  const numberOf = (s: Source) => sources.findIndex((x) => x.id === s.id) + 1

  return (
    <div className={className}>
      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="print-keep border-l-2 border-rule-strong pl-3 text-sm leading-7">
            {note.text}
            <span className="ml-1.5 whitespace-nowrap text-[13px] text-ink-soft">
              <span className="sr-only">出典は、下の</span>
              <span aria-hidden>出典 </span>
              {note.sources.map((s) => sourceMark(numberOf(s))).join('')}
            </span>
          </li>
        ))}
      </ul>
      <ol className="mt-2 space-y-0.5 pl-3">
        {sources.map((s, i) => (
          <li key={s.id} className="print-keep flex gap-1.5">
            <span className="shrink-0 text-[13px] leading-6 text-ink-soft">{sourceMark(i + 1)}</span>
            <SourceLink source={s} />
          </li>
        ))}
      </ol>
    </div>
  )
}
