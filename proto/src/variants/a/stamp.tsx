/*
 * ご当地はんこ
 * 元にした部品: 21st「Stamp」(Awards variant="stamp") — 作者 designali-in (Ali Imam)
 *   https://21st.dev/@designali-in/components/stamp
 * 変えたところ:
 *   - ギザギザの切手ふちと lucide の星をやめ、駅スタンプのような二重の枠にした。
 *     枠の形で街の種類が分かる（市は丸、区は角丸の四角、町と村は八角形）。
 *   - 弧にそって文字を置く考え方（textPath）はそのまま使い、上に「都道府県＋街の名前」、下に「住む街ガチャ・年月」を置いた。
 *     文字数に合わせて字の大きさを変える。id は useId で一つずつ分ける。
 *   - 真ん中に、その街だけの名物（city.pride）の手描きの絵を置く。県全体で同じ名物しかない街や、
 *     まだ名物を調べていない街は、街の名前の字（足立・北・大田…）を置いて、見分けがつくようにした。
 *   - インクの色は街ごとに変え（カプセルの色と組）、かすれ（feTurbulence＋点の抜け）を足した。
 */
import { useId, useMemo } from 'react'
import type { City } from '@/shared/types'
import { Motif } from './art'
import { lookOf, seeded } from './lib'

const octagon = (cx: number, cy: number, r: number) => {
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 + 22.5) * Math.PI) / 180
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Glyph({ text }: { text: string }) {
  const chars = [...text]
  if (chars.length === 4) {
    return (
      <text textAnchor="middle" fontSize="38" fontWeight={900} fill="currentColor" fontFamily="'Mochiy Pop One', 'Zen Maru Gothic', sans-serif">
        <tspan x="100" y="92">{chars.slice(0, 2).join('')}</tspan>
        <tspan x="100" y="130">{chars.slice(2).join('')}</tspan>
      </text>
    )
  }
  const fs = chars.length <= 1 ? 66 : chars.length === 2 ? 52 : 40
  return (
    <text x="100" y={104 + fs * 0.3} textAnchor="middle" fontSize={fs} fontWeight={900} fill="currentColor" fontFamily="'Mochiy Pop One', 'Zen Maru Gothic', sans-serif">
      {text}
    </text>
  )
}

export function GotouchiStamp({ city, size = 160, className, label }: { city: City; size?: number; className?: string; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const look = lookOf(city)
  const top = `${city.pref}・${city.name}`
  const n = [...top].length
  const round = look.frame === 'circle'
  const topSize = round ? Math.min(21, 168 / n - 2.2) : Math.min(19, 132 / n)
  const under = look.under
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
      style={{ color: look.ink }}
      role="img"
      aria-label={label ?? `${city.pref}${city.name}のご当地はんこ（${look.pride ? look.pride.label : city.name}）`}
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
        {look.frame === 'circle' && (
          <>
            <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="7" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2.4" />
          </>
        )}
        {look.frame === 'square' && (
          <>
            <rect x="9" y="9" width="182" height="182" rx="34" fill="none" stroke="currentColor" strokeWidth="7" />
            <rect x="21" y="21" width="158" height="158" rx="24" fill="none" stroke="currentColor" strokeWidth="2.4" />
          </>
        )}
        {look.frame === 'octagon' && (
          <>
            <polygon points={octagon(100, 100, 95)} fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
            <polygon points={octagon(100, 100, 82)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          </>
        )}
        {round ? (
          <>
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
            <path d="M22 100 l3 -5 l3 5 l-3 5 Z M172 100 l3 -5 l3 5 l-3 5 Z" fill="currentColor" />
          </>
        ) : (
          <>
            <text x="100" y="50" textAnchor="middle" fontSize={topSize} fontWeight={900} fill="currentColor" letterSpacing="1.5" fontFamily="'Zen Maru Gothic', sans-serif">
              {top}
            </text>
            <path d="M44 58 H156" stroke="currentColor" strokeWidth="2.2" />
            <path d="M44 154 H156" stroke="currentColor" strokeWidth="2.2" />
            <text x="100" y="172" textAnchor="middle" fontSize="11.5" fontWeight={700} fill="currentColor" letterSpacing="2" fontFamily="'Zen Maru Gothic', sans-serif">
              住む街ガチャ・2026.11
            </text>
          </>
        )}
        {look.motif ? (
          <g transform="translate(72 64) scale(0.875)">
            <Motif name={look.motif} />
          </g>
        ) : (
          <Glyph text={look.glyph} />
        )}
        <text x="100" y={look.motif ? 138 : round ? 146 : 147} textAnchor="middle" fontSize={underSize} fontWeight={900} fill="currentColor" fontFamily="'Zen Maru Gothic', sans-serif">
          {under}
        </text>
      </g>
    </svg>
  )
}

// スタンプ帳のあき枠
export function EmptyStamp({ size = 72, name }: { size?: number; name: string }) {
  const n = [...name].length
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${name}のはんこは、まだ`}>
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--ink-soft)" strokeWidth="5" strokeDasharray="10 12" opacity="0.6" />
      <text x="100" y="110" textAnchor="middle" fontSize={Math.min(30, 150 / Math.max(n, 1))} fontWeight={900} fill="var(--ink-soft)" fontFamily="'Zen Maru Gothic', sans-serif">
        {name}
      </text>
    </svg>
  )
}
