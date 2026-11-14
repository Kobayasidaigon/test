import { NOT_DOING } from '@/core/texts'

// この道具がしないこと。文は、core の texts.ts にあるもの（画面と同じ言い方）を、そのまま出す。
// 紙や箱に入れず、机の上に、濃い罫線で区切って並べる（注意書きとして、落ち着いて読めるように）。

export function NotDoing() {
  return (
    <dl className="grid gap-x-12 border-t-[1.5px] border-ink/70 md:grid-cols-2">
      {NOT_DOING.map((n) => (
        <div key={n.title} className="border-b border-ink/20 py-5 md:py-6">
          <dt className="flex items-start gap-2.5 text-[17px] font-bold leading-snug">
            {/* 「しない」ことを表す、えんぴつの短い横線（飾り）。 */}
            <svg aria-hidden viewBox="0 0 24 24" className="mt-[0.2em] size-[1.1em] shrink-0 text-pencil">
              <path className="pen-stroke" d="M 3 12.5 C 8 11 15 13.5 21 11.5" strokeWidth={2.2} />
            </svg>
            <span>{n.title}</span>
          </dt>
          <dd className="mt-2 pl-[1.8rem] text-[15px] leading-[1.85] text-ink-soft">{n.body}</dd>
        </div>
      ))}
    </dl>
  )
}
