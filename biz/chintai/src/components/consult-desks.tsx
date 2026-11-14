import { consultDesks } from '@/core/consult'
import { getSource } from '@/core/sources'
import { CONSULT_NOTE } from '@/core/texts'
import { cn } from '@/lib/utils'
import { SourceLink } from './source-link'

// 相談先。この道具は、個別の事情についての相談には答えないので、結果の画面と印刷に、相談の窓口を出す。
// 名前・電話番号・受付の時間は、core/consult.ts にあるもの（公式のページで確かめたもの）だけを出す。

export function ConsultDesks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm leading-7">{CONSULT_NOTE}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3 print:grid-cols-3">
        {consultDesks.map((d) => (
          <li key={d.id} className={cn('print-keep flex flex-col gap-1.5 border border-rule-strong/70 p-3')}>
            <p className="text-sm font-bold leading-snug">{d.name}</p>
            {d.phone && (
              <p className="leading-none">
                <span className="mr-1.5 text-xs text-ink-soft">電話</span>
                <a href={`tel:${d.phone.replace(/[^\d]/g, '')}`} className="num text-xl font-bold underline decoration-ink/30 underline-offset-4 hover:decoration-ink print:no-underline">
                  {d.phone}
                </a>
              </p>
            )}
            <p className="text-[13px] leading-6">{d.what}</p>
            {d.hours && <p className="text-[13px] leading-6">受付: {d.hours}</p>}
            {d.note && <p className="text-[13px] leading-6 text-ink-soft">{d.note}</p>}
            <p className="mt-auto pt-1">
              <SourceLink source={getSource(d.sourceId)} className="text-xs leading-5" />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
