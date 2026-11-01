// 案C「街カード」— 自作の絵（街の絵・カードの裏・家族・貯金箱・小銭）
// 街の絵は「2色刷り」のつもりで描く: 街のインクで塗り、墨の線を少しずらして重ねる（版ずれ）。
import { useId, type ReactNode } from 'react'
import { Briefcase, Factory, Hammer, House, Mountain, Utensils } from 'lucide-react'
import type { Mood, Pride } from '@/shared'
import { meta } from './lib'

export const INK = '#1D1B19'
export const CREAM = '#FFFCF4'
const SKIN = '#F2D3B8'
const PIG = '#EDB3A6'
const PIG_D = '#DE998A'
const GOLD = '#D9A21B'
const FLAME = '#E8A33A'

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** a から b へ t の割合で混ぜる（t=1 で b） */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/** 塗り（街のインク）と、少しずらした墨の線を重ねる */
function Print({ color, children, sw = 1.6, dx = 1.5, dy = 1.2 }: { color: string; children: ReactNode; sw?: number; dx?: number; dy?: number }) {
  return (
    <>
      <g fill={color} stroke="none" transform={`translate(${dx} ${dy})`}>{children}</g>
      <g fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">{children}</g>
    </>
  )
}

const waves = (y: number, x0: number, n: number, color: string, w = 1.3) => (
  <path d={`M${x0} ${y}` + ' q5 -3 10 0 t10 0'.repeat(n)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
)

// 2次ベジェの点
const qp = (t: number, a: number, b: number, c: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c

type ArtProps = { ink: string; uid: string }

const ART: Record<string, (p: ArtProps) => ReactNode> = {
  adachi: ({ ink, uid }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <circle cx="196" cy="30" r="15" fill={`url(#${uid}-dot)`} />
      <circle cx="196" cy="30" r="15" fill="none" stroke={INK} strokeWidth="1.2" />
      <Print color={mix(ink, CREAM, 0.55)}>
        <path d="M0 98 L36 90 L204 90 L240 98 L240 112 L0 112 Z" />
      </Print>
      <Print color={ink}>
        <path d="M86 52 L120 34 L154 52 Z" />
        <path d="M50 66 Q66 63 76 55 L164 55 Q174 63 190 66 Q176 70 164 68 L76 68 Q64 70 50 66 Z" />
        <rect x="72" y="68" width="96" height="22" />
      </Print>
      {[82, 98, 114, 126, 142, 158].map((x) => <line key={x} x1={x} y1="71" x2={x} y2="89" stroke={CREAM} strokeWidth="2.4" />)}
      <path d="M110 35 L130 35" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="0" y="112" width="240" height="20" fill={mix(ink, CREAM, 0.3)} />
      {waves(119, 12, 4, CREAM)}
      {waves(125, 120, 5, CREAM)}
      {waves(129, 40, 3, CREAM)}
    </>
  ),
  kita: ({ ink, uid }) => {
    const trees: [number, number, number][] = [[24, 88, 11], [46, 77, 13], [70, 70, 12], [96, 66, 13], [150, 70, 12], [176, 76, 13], [204, 84, 11], [228, 92, 10]]
    return (
      <>
        <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
        <circle cx="122" cy="28" r="12" fill={`url(#${uid}-dot)`} />
        <Print color={mix(ink, CREAM, 0.62)}>
          <path d="M0 104 Q46 64 104 66 Q170 68 240 98 L240 132 L0 132 Z" />
        </Print>
        {trees.map(([x, y]) => <line key={x} x1={x} y1={y} x2={x} y2={y + 15} stroke={INK} strokeWidth="2" />)}
        <Print color={ink}>{trees.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</Print>
        {[[30, 40], [60, 30], [168, 36], [210, 22], [140, 50]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="2.4" ry="1.4" fill={ink} transform={`rotate(-30 ${x} ${y})`} />)}
        <path d="M0 83 L240 87" stroke={INK} strokeWidth="0.9" />
        <Print color={CREAM}>
          <rect x="66" y="94" width="108" height="24" rx="7" />
        </Print>
        <rect x="67" y="107" width="107" height="5" fill={ink} />
        {[76, 94, 112, 130, 148].map((x) => <rect key={x} x={x} y="98" width="13" height="7" rx="1.5" fill={INK} opacity="0.85" />)}
        <path d="M114 94 L120 86.5 L126 94 M116.5 86.5 L123.5 86.5" stroke={INK} strokeWidth="1.4" fill="none" />
        <circle cx="84" cy="119" r="3.5" fill={INK} />
        <circle cx="156" cy="119" r="3.5" fill={INK} />
        <path d="M0 122.5 L240 122.5" stroke={INK} strokeWidth="1.6" />
      </>
    )
  },
  ota: ({ ink, uid }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <circle cx="40" cy="30" r="13" fill={`url(#${uid}-dot)`} />
      <path d="M24 74 Q90 56 140 44" stroke={ink} strokeWidth="1.3" strokeDasharray="2 4" fill="none" />
      <g transform="translate(138 30) rotate(-12)">
        <Print color={ink}>
          <path d="M0 8 Q2 3 12 3 L50 3 Q60 4 62 8 Q60 12 50 12 L12 12 Q2 12 0 8 Z" />
          <path d="M26 9 L40 9 L30 26 L23 26 Z" />
          <path d="M4 5 L-1 -7 L6 -7 L14 4 Z" />
        </Print>
        {[18, 24, 30, 36, 42].map((x) => <circle key={x} cx={x} cy="6.5" r="1" fill={CREAM} />)}
      </g>
      <Print color={mix(ink, CREAM, 0.5)}>
        <rect x="188" y="58" width="12" height="62" />
        <path d="M180 48 L208 48 L204 60 L184 60 Z" />
      </Print>
      <rect x="185" y="51" width="18" height="5" fill={CREAM} />
      <path d="M194 48 L194 38" stroke={INK} strokeWidth="1.4" />
      <Print color={ink}>
        <path d="M12 120 L12 90 L30 78 L30 90 L48 78 L48 90 L66 78 L66 90 L84 78 L84 90 L102 78 L102 120 Z" />
      </Print>
      {[20, 38, 56, 74, 92].map((x) => <rect key={x} x={x - 3} y="100" width="6" height="8" fill={CREAM} />)}
      <Print color={mix(ink, CREAM, 0.5)}>
        <rect x="112" y="62" width="9" height="58" />
      </Print>
      <path d="M112 68 L121 68 M112 74 L121 74" stroke={INK} strokeWidth="2" />
      <circle cx="118" cy="54" r="4" fill={CREAM} stroke={INK} strokeWidth="1.2" />
      <circle cx="124" cy="45" r="5.5" fill={CREAM} stroke={INK} strokeWidth="1.2" />
      <rect x="0" y="120" width="240" height="12" fill={mix(ink, CREAM, 0.4)} />
      <path d="M126 126.5 L240 126.5" stroke={CREAM} strokeDasharray="8 6" strokeWidth="1.6" />
    </>
  ),
  kawaguchi: ({ ink, uid }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <circle cx="204" cy="32" r="17" fill={`url(#${uid}-dot)`} />
      {[[68, 22, 6], [76, 12, 8], [102, 36, 5], [110, 28, 6.5]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={CREAM} stroke={INK} strokeWidth="1.2" />)}
      <Print color={ink}>
        <rect x="58" y="44" width="20" height="76" />
        <path d="M55 44 L68 31 L81 44 Z" />
      </Print>
      <path d="M58 62 L78 62 M58 84 L78 84 M58 104 L78 104" stroke={CREAM} strokeWidth="2" />
      <Print color={mix(ink, CREAM, 0.4)}>
        <rect x="92" y="58" width="16" height="62" />
        <path d="M89 58 L100 47 L111 58 Z" />
      </Print>
      <path d="M78 76 L92 76" stroke={INK} strokeWidth="3.2" />
      <Print color={mix(ink, CREAM, 0.62)}>
        <path d="M124 120 L124 84 L156 68 L188 84 L188 120 Z" />
      </Print>
      <rect x="146" y="96" width="20" height="24" fill={INK} />
      <rect x="149" y="100" width="14" height="20" fill={FLAME} />
      {[[140, 104], [172, 100], [176, 110], [137, 94], [170, 90]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill={FLAME} />)}
      <Print color={mix(ink, INK, 0.45)}>
        <path d="M14 104 Q14 121 33 121 Q52 121 52 104 Z" />
        <path d="M10 101 L56 101 L56 105 L10 105 Z" />
      </Print>
      <circle cx="33" cy="97" r="2.6" fill={INK} />
      <rect x="0" y="120" width="240" height="12" fill={mix(ink, CREAM, 0.45)} />
      {waves(126, 70, 6, CREAM)}
    </>
  ),
  soka: ({ ink, uid }) => {
    const posts = [0.12, 0.24, 0.36, 0.5, 0.64, 0.76, 0.88]
    return (
      <>
        <defs>
          <clipPath id={`${uid}-sb`}><circle cx="186" cy="34" r="19" /></clipPath>
        </defs>
        <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
        <circle cx="186" cy="34" r="19" fill={mix(ink, CREAM, 0.3)} stroke={INK} strokeWidth="1.6" />
        {[[176, 24], [190, 22], [182, 32], [196, 30], [172, 34]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y} q3 -1 5 1`} stroke={INK} strokeWidth="1.1" fill="none" />)}
        <rect x="160" y="39" width="54" height="16" fill={INK} clipPath={`url(#${uid}-sb)`} />
        <rect x="0" y="108" width="240" height="24" fill={mix(ink, CREAM, 0.72)} />
        {waves(118, 10, 4, CREAM)}
        {waves(126, 140, 4, CREAM)}
        <Print color={ink}>
          <path d="M28 116 Q120 40 212 116 L204 116 Q120 52 36 116 Z" />
        </Print>
        <path d="M34 104 Q120 30 206 104" stroke={INK} strokeWidth="1.5" fill="none" />
        {posts.map((t) => (
          <line key={t} x1={qp(t, 28, 120, 212)} y1={qp(t, 116, 40, 116)} x2={qp(t, 34, 120, 206)} y2={qp(t, 104, 30, 104)} stroke={INK} strokeWidth="1.3" />
        ))}
        {[18, 222].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 110 Q${x + (i ? 4 : -4)} 90 ${x + (i ? -2 : 2)} 70`} stroke={INK} strokeWidth="2.6" fill="none" />
            <Print color={mix(ink, INK, 0.35)}>
              <ellipse cx={x + (i ? -4 : 4)} cy="72" rx="15" ry="5" />
              <ellipse cx={x + (i ? 2 : -2)} cy="84" rx="12" ry="4.5" />
              <ellipse cx={x + (i ? -6 : 6)} cy="62" rx="9" ry="4" />
            </Print>
          </g>
        ))}
      </>
    )
  },
  kawasaki: ({ ink }) => (
    <>
      <rect width="240" height="132" fill={ink} />
      {[[14, 14], [60, 24], [96, 10], [150, 18], [200, 12], [228, 30], [180, 40]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" fill={CREAM} />)}
      <circle cx="34" cy="28" r="9" fill={CREAM} />
      <circle cx="38.5" cy="25" r="8" fill={ink} />
      <path d="M0 116 L0 92 L22 92 L22 74 L30 74 L30 92 L52 92 L52 60 L58 60 L58 92 L70 92 L70 84 L96 84 L96 92 L118 92 L118 50 L124 50 L124 92 L150 92 L150 70 L178 70 L178 92 L240 92 L240 116 Z" fill={INK} />
      <circle cx="198" cy="84" r="14" fill={INK} />
      <circle cx="224" cy="88" r="10" fill={INK} />
      <path d="M150 80 L240 80 M60 100 L150 100 M96 88 L118 88" stroke={INK} strokeWidth="2.4" />
      <path d="M121 50 Q115 40 121 30 Q127 40 121 50 Z" fill={FLAME} />
      <path d="M55 60 Q52 54 55 48 Q58 54 55 60 Z" fill={FLAME} />
      {[[8, 98], [14, 104], [26, 80], [40, 98], [55, 70], [55, 84], [64, 96], [78, 88], [88, 88], [104, 98], [121, 60], [121, 74], [132, 98], [158, 76], [166, 84], [190, 80], [204, 86], [222, 86], [232, 100], [182, 104]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.8" height="1.8" fill={CREAM} />
      ))}
      <rect x="0" y="116" width="240" height="16" fill={mix(ink, INK, 0.45)} />
      {[[20, 121, 18], [56, 125, 10], [118, 121, 8], [121, 128, 4], [150, 123, 26], [196, 127, 14]].map(([x, y, w]) => (
        <path key={`${x}${y}`} d={`M${x} ${y} L${x + w} ${y}`} stroke={CREAM} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.8" />
      ))}
      <path d="M118 120 L124 120" stroke={FLAME} strokeWidth="1.6" />
    </>
  ),
  sagamihara: ({ ink }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.86)} />
      {[[24, 22], [92, 14], [120, 34], [212, 20], [228, 50]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2} Z`} fill={ink} />
      ))}
      <g transform="translate(58 34) rotate(-18)">
        <rect x="-26" y="-3" width="18" height="6" fill={CREAM} stroke={INK} strokeWidth="1.2" />
        <rect x="8" y="-3" width="18" height="6" fill={CREAM} stroke={INK} strokeWidth="1.2" />
        <path d="M-17 -3 L-17 3 M17 -3 L17 3" stroke={INK} strokeWidth="1" />
        <rect x="-6" y="-6" width="12" height="12" fill={ink} stroke={INK} strokeWidth="1.3" />
      </g>
      <Print color={mix(ink, CREAM, 0.55)}>
        <path d="M0 104 L28 80 L48 92 L82 60 L112 86 L138 70 L164 92 L196 72 L222 88 L240 82 L240 132 L0 132 Z" />
      </Print>
      <path d="M182 112 L182 34 M194 112 L194 34 M182 44 L194 54 M194 44 L182 54 M182 64 L194 74 M194 64 L182 74 M182 84 L194 94 M194 84 L182 94 M182 34 L194 34" stroke={INK} strokeWidth="1.3" />
      <Print color={ink}>
        <rect x="150" y="30" width="18" height="80" rx="2" />
        <path d="M150 30 Q159 5 168 30 Z" />
        <path d="M150 92 L140 112 L150 110 Z" />
        <path d="M168 92 L178 112 L168 110 Z" />
      </Print>
      <rect x="151" y="48" width="16" height="4" fill={CREAM} />
      <rect x="151" y="76" width="16" height="4" fill={CREAM} />
      <circle cx="159" cy="38" r="3" fill={CREAM} stroke={INK} strokeWidth="1" />
      <rect x="0" y="112" width="240" height="20" fill={mix(ink, CREAM, 0.35)} />
      <path d="M128 120 L210 120" stroke={CREAM} strokeWidth="1.4" />
    </>
  ),
  osaka: ({ ink, uid }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <circle cx="204" cy="28" r="14" fill={`url(#${uid}-dot)`} />
      <Print color={mix(ink, CREAM, 0.62)}>
        <rect x="8" y="78" width="26" height="42" />
        <rect x="38" y="62" width="22" height="58" />
        <rect x="160" y="70" width="24" height="50" />
        <rect x="188" y="86" width="30" height="34" />
      </Print>
      {[[14, 86], [22, 86], [14, 98], [22, 98], [44, 70], [52, 70], [44, 82], [52, 82], [44, 94], [52, 94], [166, 78], [174, 78], [166, 90], [174, 90]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="5" fill={CREAM} />)}
      <Print color={ink}>
        <path d="M94 120 L107 86 L133 86 L146 120 L135 120 L120 100 L105 120 Z" />
        <path d="M110 86 L114 42 L126 42 L130 86 Z" />
        <rect x="101" y="30" width="38" height="13" rx="2" />
        <rect x="113" y="16" width="14" height="14" />
      </Print>
      <path d="M120 16 L120 4" stroke={INK} strokeWidth="1.6" />
      <path d="M112.5 54 L127.5 54 M111.8 64 L128.2 64 M111 74 L129 74" stroke={CREAM} strokeWidth="1.8" />
      {[106, 114, 122, 130].map((x) => <rect key={x} x={x} y="34" width="5" height="5" fill={CREAM} />)}
      <Print color={mix(ink, CREAM, 0.72)}>
        <path d="M158 110 L234 110 L226 125 L166 125 Z" />
      </Print>
      <Print color={mix(ink, CREAM, 0.3)}>
        {[174, 196, 218].map((x) => <circle key={x} cx={x} cy="104" r="10" />)}
      </Print>
      {[174, 196, 218].map((x) => (
        <g key={x}>
          <path d={`M${x - 8} 99 Q${x - 3} 95 ${x} 99 Q${x + 4} 95 ${x + 8} 99`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${x - 6} 102 l3 -3 l3 3 l3 -3 l3 3`} stroke={CREAM} strokeWidth="1.2" fill="none" />
        </g>
      ))}
      <rect x="0" y="120" width="158" height="12" fill={mix(ink, CREAM, 0.45)} />
      <rect x="230" y="120" width="10" height="12" fill={mix(ink, CREAM, 0.45)} />
    </>
  ),
  sapporo: ({ ink }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <path d="M0 88 Q40 64 80 80 Q120 60 170 78 Q210 66 240 80 L240 98 L0 98 Z" fill={mix(ink, CREAM, 0.68)} stroke={INK} strokeWidth="1.2" />
      <rect x="0" y="96" width="240" height="36" fill={mix(ink, CREAM, 0.45)} />
      {Array.from({ length: 13 }, (_, i) => i - 6).map((i) => (
        <line key={i} x1={120 + i * 9} y1="96" x2={120 + i * 42} y2="132" stroke={i % 2 ? INK : CREAM} strokeWidth={i % 2 ? 1.1 : 1.6} opacity={i % 2 ? 0.55 : 0.9} />
      ))}
      <Print color={CREAM}>
        <rect x="86" y="70" width="68" height="28" />
        <rect x="110" y="32" width="20" height="24" />
      </Print>
      <Print color={ink}>
        <path d="M80 72 L120 52 L160 72 Z" />
        <path d="M106 34 L120 15 L134 34 Z" />
      </Print>
      <circle cx="120" cy="44" r="6.5" fill={CREAM} stroke={INK} strokeWidth="1.4" />
      <path d="M120 44 L120 39.5 M120 44 L123.5 45.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      {[93, 105, 129, 141].map((x) => <rect key={x} x={x} y="77" width="6" height="11" fill={INK} opacity="0.85" />)}
      <rect x="115" y="84" width="10" height="14" fill={ink} stroke={INK} strokeWidth="1.2" />
      <path d="M120 15 L120 8" stroke={INK} strokeWidth="1.4" />
    </>
  ),
  kagoshima: ({ ink }) => (
    <>
      <rect width="240" height="132" fill={mix(ink, CREAM, 0.88)} />
      <Print color={mix(ink, CREAM, 0.86)} sw={1.2}>
        {[[112, 36, 7], [122, 25, 9], [137, 16, 11], [156, 11, 12], [176, 10, 10]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}
      </Print>
      <Print color={mix(ink, INK, 0.3)}>
        <path d="M22 104 L80 52 L94 58 L106 44 L118 50 L132 46 L198 104 Z" />
      </Print>
      <path d="M80 52 L68 80 M106 44 L104 76 M132 46 L146 78" stroke={CREAM} strokeWidth="1.3" opacity="0.7" />
      <rect x="0" y="100" width="240" height="32" fill={ink} />
      {waves(110, 20, 4, CREAM)}
      {waves(118, 120, 6, CREAM)}
      {waves(126, 30, 5, CREAM)}
      <g transform="translate(160 101)">
        <Print color={CREAM} sw={1.3}>
          <path d="M0 2 L42 2 L37 10 L5 10 Z" />
          <rect x="10" y="-6" width="20" height="8" />
        </Print>
        <rect x="24" y="-11" width="4" height="6" fill={INK} />
      </g>
      <path d="M22 104 Q16 82 26 62" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Print color={mix(ink, INK, 0.2)} sw={1.3}>
        <path d="M26 62 Q12 56 4 66 Q14 60 26 64 Z" />
        <path d="M26 62 Q40 54 48 64 Q38 58 26 64 Z" />
        <path d="M26 62 Q18 46 8 46 Q18 52 25 62 Z" />
        <path d="M26 62 Q34 46 44 46 Q34 52 27 62 Z" />
      </Print>
    </>
  ),
}

/** 街のカードに入る絵 */
export function CityArt({ id, className, label }: { id: string; className?: string; label?: boolean }) {
  const raw = useId()
  const uid = 'vc' + raw.replace(/[^a-zA-Z0-9]/g, '')
  const m = meta(id)
  const draw = ART[id]
  return (
    <svg viewBox="0 0 240 132" className={className} preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : undefined} aria-label={label ? `絵: ${m.motif}` : undefined} aria-hidden={label ? undefined : true}>
      <defs>
        <pattern id={`${uid}-dot`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="1.25" fill={m.ink} />
        </pattern>
      </defs>
      {draw ? draw({ ink: m.ink, uid }) : <rect width="240" height="132" fill={mix(m.ink, CREAM, 0.85)} />}
    </svg>
  )
}

/** カードの裏（山札の柄）。どのカードも同じ柄 */
export function BackPattern({ className }: { className?: string }) {
  const raw = useId()
  const uid = 'vb' + raw.replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <pattern id={`${uid}-roof`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M1 6 L5 2.6 L9 6 M2.6 6 L2.6 8.6 L7.4 8.6 L7.4 6" fill="none" stroke={CREAM} strokeWidth="0.55" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="140" fill="#27365F" />
      <rect x="5" y="5" width="90" height="130" rx="4" fill={`url(#${uid}-roof)`} />
      <rect x="5" y="5" width="90" height="130" rx="4" fill="none" stroke={CREAM} strokeWidth="0.8" />
      <rect x="8" y="8" width="84" height="124" rx="2.5" fill="none" stroke={CREAM} strokeWidth="0.35" />
      <circle cx="50" cy="70" r="22" fill="#27365F" stroke={CREAM} strokeWidth="0.8" />
      <circle cx="50" cy="70" r="19" fill="none" stroke={CREAM} strokeWidth="0.35" />
      <path d="M38 73 L50 61 L62 73 M42 70 L42 81 L58 81 L58 70" fill="none" stroke={CREAM} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="47.5" y="74" width="5" height="7" fill={CREAM} />
    </svg>
  )
}

// ---------- 家族と貯金箱 ----------
export type Face = 'grin' | 'smile' | 'calm' | 'sleep'
const SHIRTS = ['#C23B22', '#27365F', '#3F7D4E', '#D9A21B', '#B2456E', '#2E7480']
/** 子どもを悲しませない: 表情は grin / smile / calm だけを使う */
export const faceFor = (mood: Mood): Face => (mood >= 2 ? 'grin' : mood === 1 ? 'smile' : 'calm')

function FaceMarks({ cx, cy, face }: { cx: number; cy: number; face: Face }) {
  const ex = 4.6
  return (
    <g stroke={INK} fill="none" strokeWidth="1.5" strokeLinecap="round">
      {face === 'grin' ? (
        <>
          <path d={`M${cx - ex - 2} ${cy + 1.5} q2 -2.6 4 0`} />
          <path d={`M${cx + ex - 2} ${cy + 1.5} q2 -2.6 4 0`} />
          <path d={`M${cx - 4.5} ${cy + 5} Q${cx} ${cy + 11} ${cx + 4.5} ${cy + 5} Z`} fill={INK} />
          <circle cx={cx - 7.5} cy={cy + 5} r="2" fill="#E9897A" stroke="none" opacity="0.7" />
          <circle cx={cx + 7.5} cy={cy + 5} r="2" fill="#E9897A" stroke="none" opacity="0.7" />
        </>
      ) : face === 'sleep' ? (
        <>
          <path d={`M${cx - ex - 1.8} ${cy + 1} q1.8 1.8 3.6 0`} />
          <path d={`M${cx + ex - 1.8} ${cy + 1} q1.8 1.8 3.6 0`} />
          <circle cx={cx} cy={cy + 6} r="1.2" />
        </>
      ) : (
        <>
          <circle cx={cx - ex} cy={cy + 1} r="1.45" fill={INK} stroke="none" />
          <circle cx={cx + ex} cy={cy + 1} r="1.45" fill={INK} stroke="none" />
          {face === 'smile'
            ? <path d={`M${cx - 4} ${cy + 5.2} Q${cx} ${cy + 9} ${cx + 4} ${cy + 5.2}`} />
            : <path d={`M${cx - 2.6} ${cy + 6.2} Q${cx} ${cy + 7.6} ${cx + 2.6} ${cy + 6.2}`} />}
        </>
      )}
    </g>
  )
}

/** 家族の人。kind=baby は「これから生まれる子」（点線） */
export function Person({ kind, seed = 0, face = 'smile', className, title }: { kind: 'adult' | 'child' | 'baby'; seed?: number; face?: Face; className?: string; title?: string }) {
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  if (kind === 'baby') {
    return (
      <svg viewBox="0 0 48 56" className={className} {...a11y}>
        <path d="M11 56 Q12 42 24 41 Q36 42 37 56" fill={CREAM} stroke={INK} strokeWidth="1.4" strokeDasharray="3 2.4" />
        <circle cx="24" cy="29" r="11" fill={CREAM} stroke={INK} strokeWidth="1.4" strokeDasharray="3 2.4" />
        <FaceMarks cx={24} cy={28} face="sleep" />
        <path d="M37 13 l1.2 2.6 2.8 .4 -2 2 .5 2.8 -2.5 -1.3 -2.5 1.3 .5 -2.8 -2 -2 2.8 -.4 Z" fill={GOLD} stroke={INK} strokeWidth="0.9" />
      </svg>
    )
  }
  const shirt = SHIRTS[seed % SHIRTS.length]
  if (kind === 'adult') {
    const v = seed % 2
    return (
      <svg viewBox="0 0 48 56" className={className} {...a11y}>
        {v === 1 && <path d="M11 34 Q7 10 24 8.5 Q41 10 37 34 Z" fill={INK} />}
        <path d="M5 56 Q7 38 24 36 Q41 38 43 56 Z" fill={shirt} stroke={INK} strokeWidth="1.6" />
        <circle cx="24" cy="22" r="12.5" fill={SKIN} stroke={INK} strokeWidth="1.6" />
        {v === 0
          ? <path d="M11.5 21 Q11 8 24 8.5 Q37 9 36.5 20 Q31 13.5 21 15 Q15 16 11.5 21 Z" fill={INK} />
          : <path d="M11.6 22 Q12 9 24 9 Q36 9 36.4 22 Q33 14 26 13.4 Q24 17 13.6 22 Z" fill={INK} />}
        <FaceMarks cx={24} cy={22} face={face} />
      </svg>
    )
  }
  const v = seed % 2
  return (
    <svg viewBox="0 0 48 56" className={className} {...a11y}>
      <path d="M10 56 Q11 42 24 40 Q37 42 38 56 Z" fill={shirt} stroke={INK} strokeWidth="1.6" />
      {v === 1 && <><circle cx="11.5" cy="22" r="3.6" fill={INK} /><circle cx="36.5" cy="22" r="3.6" fill={INK} /></>}
      <circle cx="24" cy="27" r="11.5" fill={SKIN} stroke={INK} strokeWidth="1.6" />
      {v === 0
        ? <><path d="M12.6 25 Q13.5 14.4 24 14.6 Q34.5 14.4 35.4 25 Q29 19.5 24 20 Q18.5 19.5 12.6 25 Z" fill={INK} /><path d="M24 15 Q22 9 27.5 8.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" /></>
        : <path d="M12.6 26 Q13 14.5 24 14.5 Q35 14.5 35.4 26 Q30 19 24 19.8 Q18 19 12.6 26 Z" fill={INK} />}
      <FaceMarks cx={24} cy={27} face={face} />
    </svg>
  )
}

/** 家族の財布＝貯金箱。悲しむのはこの子だけ */
export function Piggy({ mood, className, title }: { mood: Mood; className?: string; title?: string }) {
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  const sad = mood < 0
  return (
    <svg viewBox="0 0 72 60" className={className} {...a11y}>
      {mood > 0 && (
        <g className="vc-coins">
          <g className="vc-coin vc-coin-1"><circle cx="30" cy="10" r="5" fill={GOLD} stroke={INK} strokeWidth="1.2" /><path d="M30 7.5 L30 12.5" stroke={INK} strokeWidth="1" /></g>
          {mood > 1 && <g className="vc-coin vc-coin-2"><circle cx="42" cy="6" r="4.4" fill={GOLD} stroke={INK} strokeWidth="1.2" /><path d="M42 3.8 L42 8.2" stroke={INK} strokeWidth="1" /></g>}
        </g>
      )}
      <path d={sad ? 'M12 34 q-6 1 -6 -4' : 'M12 32 q-7 -2 -5 -7 q2 -3 4.5 0'} fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="19" y="44" width="7" height="10" rx="2.5" fill={PIG_D} stroke={INK} strokeWidth="1.5" />
      <rect x="41" y="44" width="7" height="10" rx="2.5" fill={PIG_D} stroke={INK} strokeWidth="1.5" />
      <ellipse cx="34" cy="34" rx="22.5" ry="16.5" fill={PIG} stroke={INK} strokeWidth="1.8" />
      {sad
        ? <path d="M22 21 Q14 21 15 30 Q19 26 27 23 Z" fill={PIG_D} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        : <path d="M23 21 L20 9 L31 18 Z" fill={PIG_D} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />}
      <path d="M29 19.5 L40 19.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="56.5" cy="35" rx="5.6" ry="6.6" fill={PIG_D} stroke={INK} strokeWidth="1.6" />
      <circle cx="55" cy="33.5" r="1" fill={INK} />
      <circle cx="58.2" cy="33.5" r="1" fill={INK} />
      <g stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round">
        {mood === 2 && <><path d="M41.5 29 Q44.5 25.5 47.5 29" /><path d="M45 42 Q49.5 46.5 54 42" /></>}
        {mood === 1 && <><circle cx="45" cy="28.5" r="1.8" fill={INK} stroke="none" /><path d="M46 42 Q49.5 45 53 42" /></>}
        {mood === 0 && <><circle cx="45" cy="28.5" r="1.8" fill={INK} stroke="none" /><path d="M46.5 43 L52.5 43" /></>}
        {mood === -1 && <><circle cx="45" cy="30" r="1.8" fill={INK} stroke="none" /><path d="M42 25 L47.5 26.4" /><path d="M46.5 44 Q49.5 42 52.5 44" /></>}
        {mood === -2 && <><path d="M42 29 Q45 32 48 29" /><path d="M42 25.5 L47.5 27.5" /><path d="M46 44.5 Q49.5 41.5 53 44.5" /></>}
      </g>
      {sad && <path className="vc-sweat" d="M62 14 q3.4 4.6 0 6.8 q-3.4 -2.2 0 -6.8 Z" fill="#9CC7D6" stroke={INK} strokeWidth="1" />}
    </svg>
  )
}

/** 世帯年収の段: 小銭の山 */
export function CoinStack({ n, className }: { n: number; className?: string }) {
  return (
    <svg viewBox="0 0 44 52" className={className} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(0 ${-i * 7})`}>
          <path d="M6 42 L6 46 Q22 52 38 46 L38 42" fill={mix(GOLD, INK, 0.25)} stroke={INK} strokeWidth="1.3" />
          <ellipse cx="22" cy="42" rx="16" ry="5" fill={GOLD} stroke={INK} strokeWidth="1.3" />
        </g>
      ))}
    </svg>
  )
}

/** 名物の種類のしるし */
export function KindIcon({ kind, className }: { kind: Pride['kind']; className?: string }) {
  const p = { className, 'aria-hidden': true as const, strokeWidth: 2.2 }
  switch (kind) {
    case 'food': return <Utensils {...p} />
    case 'craft': return <Hammer {...p} />
    case 'industry': return <Factory {...p} />
    case 'nature': return <Mountain {...p} />
    case 'job': return <Briefcase {...p} />
    default: return <House {...p} />
  }
}
