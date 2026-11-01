/*
 * ご当地はんこ
 * 元にした部品: 21st「Stamp」(Awards variant="stamp") — 作者 designali-in (Ali Imam)
 *   https://21st.dev/@designali-in/components/stamp
 * 変えたところ:
 *   - ギザギザの切手ふちと lucide の星をやめ、駅スタンプのような二重の輪にした。
 *   - 弧にそって文字を置く考え方（textPath）はそのまま使い、上に「都道府県＋街の名前」、下に「住む街ガチャ・年月」を置いた。
 *     文字数に合わせて字の大きさを変える。id は useId で一つずつ分ける。
 *   - 真ん中の絵柄を、その街の名物（city.pride）から選んだ手描きの絵にした。
 *   - インクのかすれ（feTurbulence＋点の抜け）を足して、紙に押したはんこに見えるようにした。
 */
import { useId, useMemo } from 'react'
import type { City } from '@/shared/types'
import { Motif } from './art'
import { lookOf, seeded, stampLabel } from './lib'

export function GotouchiStamp({ city, size = 160, className, faded = false, label }: { city: City; size?: number; className?: string; faded?: boolean; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const look = lookOf(city)
  const top = `${city.pref}・${city.name}`
  const n = [...top].length
  const topSize = Math.min(21, 168 / n - 2.2)
  const under = stampLabel(city)
  const underSize = Math.min(14, 96 / Math.max([...under].length, 1))
  const specks = useMemo(() => {
    const r = seeded(city.id)
    return Array.from({ length: 46 }, () => {
      const a = r() * Math.PI * 2
      const d = 18 + r() * 78
      return { x: 100 + Math.cos(a) * d, y: 100 + Math.sin(a) * d, r: 0.6 + r() * 1.9 }
    })
  }, [city.id])

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ color: look.ink, opacity: faded ? 0.9 : 1 }}
      role="img"
      aria-label={label ?? `${city.pref}${city.name}のご当地はんこ（${under}）`}
    >
      <defs>
        <filter id={`rough-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <mask id={`speck-${uid}`}>
          <rect width="200" height="200" fill="#fff" />
          {specks.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#000" />
          ))}
        </mask>
        <path id={`top-${uid}`} d="M 41 100 A 59 59 0 0 1 159 100" fill="none" />
        <path id={`bot-${uid}`} d="M 31 100 A 69 69 0 0 0 169 100" fill="none" />
      </defs>
      <g filter={`url(#rough-${uid})`} mask={`url(#speck-${uid})`}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="7" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <text fontSize={topSize} fontWeight={900} fill="currentColor" letterSpacing="2" fontFamily="'Zen Maru Gothic', sans-serif">
          <textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="11.5" fontWeight={700} fill="currentColor" letterSpacing="2.5" fontFamily="'Zen Maru Gothic', sans-serif">
          <textPath href={`#bot-${uid}`} startOffset="50%" textAnchor="middle">
            住む街ガチャ・2026.11
          </textPath>
        </text>
        <g transform="translate(72 64) scale(0.875)">
          <Motif name={look.motif} />
        </g>
        <text x="100" y="138" textAnchor="middle" fontSize={underSize} fontWeight={900} fill="currentColor" fontFamily="'Zen Maru Gothic', sans-serif">
          {under}
        </text>
        <path d="M22 100 l3 -5 l3 5 l-3 5 Z M172 100 l3 -5 l3 5 l-3 5 Z" fill="currentColor" />
      </g>
    </svg>
  )
}

// スタンプ帳のあき枠
export function EmptyStamp({ size = 72, name }: { size?: number; name: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${name}のはんこは、まだ`}>
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--ink-soft)" strokeWidth="5" strokeDasharray="10 12" opacity="0.6" />
      <text x="100" y="110" textAnchor="middle" fontSize="30" fontWeight={900} fill="var(--ink-soft)" fontFamily="'Zen Maru Gothic', sans-serif">
        {name}
      </text>
    </svg>
  )
}
