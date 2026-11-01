// 案A「カプセルトイ」 — 20市を足したときに描き足した名物の絵（はんこの一色刷り 64×64 と、キーホルダーの色つき 120×120）。
// art.tsx と同じ描き方：墨の太い線、平らな色、ぼかさない。白いハイライトは線で入れる。
// ロゴ・マスコット・商品の包み・著作物・有名キャラクターに似た形は描かない（だるま・野球のボールなどは、どこにでもある形にした）。
import type { MotifKey } from './lib'

const INK = 'var(--ink)'
const KO = 'var(--paper)' // はんこの白ぬき（紙の色）
const ST = { stroke: INK, strokeWidth: 3.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

// clam・ferry・sake・bean は、同じ地域で絵がかぶらないように、あとから描き足した（船橋・松戸・西宮・尼崎）
export const MOTIF_20 = ['bonsai', 'imo', 'daruma', 'boat', 'tea', 'lotus', 'kabu', 'anchor', 'shirasu', 'melon', 'mountain', 'soba', 'baseball', 'beef', 'clam', 'ferry', 'sake', 'bean'] as const
export type Motif20 = (typeof MOTIF_20)[number]
export const isMotif20 = (m: MotifKey | null): m is Motif20 => !!m && (MOTIF_20 as readonly string[]).includes(m)

// 野球のボールの縫い目。左右のカーブ（3次ベジェ）と、それにそった小さなハの字
const f1 = (v: number) => Math.round(v * 10) / 10
function seamPoints(cx: number, cy: number, r: number, side: -1 | 1) {
  return [[0.57, -0.81], [0.24, -0.4], [0.24, 0.4], [0.57, 0.81]].map(([x, y]) => [cx + side * x * r, cy + y * r])
}
function seam(cx: number, cy: number, r: number, side: -1 | 1) {
  const P = seamPoints(cx, cy, r, side).map((p) => p.map(f1).join(' '))
  return `M${P[0]} C ${P[1]}, ${P[2]}, ${P[3]}`
}
function stitches(cx: number, cy: number, r: number, side: -1 | 1, n: number, len: number) {
  const P = seamPoints(cx, cy, r, side)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = 0.1 + (0.8 * i) / (n - 1)
    const u = 1 - t
    const b = [0, 1].map((k) => u ** 3 * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t ** 3 * P[3][k])
    const d = [0, 1].map((k) => 3 * u * u * (P[1][k] - P[0][k]) + 6 * u * t * (P[2][k] - P[1][k]) + 3 * t * t * (P[3][k] - P[2][k]))
    const m = Math.hypot(d[0], d[1]) || 1
    const tx = d[0] / m, ty = d[1] / m
    const nx = -ty, ny = tx
    const a = [b[0] - nx * len + tx * len * 0.55, b[1] - ny * len + ty * len * 0.55]
    const c = [b[0] + nx * len + tx * len * 0.55, b[1] + ny * len + ty * len * 0.55]
    out.push(`M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])}`)
  }
  return out.join(' ')
}

/* ───────── はんこ（一色刷り。currentColor と、紙の色の白ぬき） ───────── */

export function Stamp20({ name }: { name: Motif20 }) {
  const s = { stroke: 'currentColor', strokeWidth: 3.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  switch (name) {
    case 'bonsai':
      // 盆栽：鉢、くねった幹、3つの葉の玉
      return (
        <g>
          <path d="M30 47 C 27 40, 36 37, 33 31 C 31 27, 25 27, 23 22" {...s} strokeWidth={5} />
          <path d="M34 33 C 38 31, 41 30, 44 26" {...s} strokeWidth={3.2} />
          <path d="M5 24 C 3 16, 12 11, 19 13 C 23 8, 33 9, 35 15 C 40 16, 41 24, 35 27 C 27 30, 10 31, 5 24 Z" fill="currentColor" />
          <path d="M35 29 C 33 23, 40 19, 45 21 C 49 17, 57 18, 58 23 C 63 24, 63 31, 57 32 C 50 34, 39 35, 35 29 Z" fill="currentColor" />
          <path d="M19 12 C 17 6, 25 1, 31 3 C 36 0, 45 2, 45 8 C 49 9, 49 15, 43 16 C 36 18, 23 18, 19 12 Z" fill="currentColor" />
          <path d="M13 21 q4 -3 8 0 M25 20 q3 -3 6 0 M41 27 q3 -3 7 0 M28 10 q3 -3 7 0" stroke={KO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <rect x="11" y="45" width="42" height="6" rx="2.5" fill="currentColor" />
          <path d="M15 51 H49 L45 60 H19 Z" fill="currentColor" />
          <path d="M20 55 H44" stroke={KO} strokeWidth="1.6" />
        </g>
      )
    case 'imo':
      // さつまいも：1本と、切ったところ（皮の輪と白い中身）
      return (
        <g>
          <path d="M8 44 C 3 36, 14 26, 28 22 C 40 18, 52 16, 57 20 C 61 24, 56 32, 44 38 C 32 44, 14 52, 8 44 Z" fill="currentColor" />
          <path d="M57 20 L62 17 M8 44 L3 48" {...s} strokeWidth={2.4} />
          <path d="M18 37 q3 -2.5 6 0.5 M31 30 q3 -2.5 6 0.5 M43 25 q3 -2.5 6 0.5" stroke={KO} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M14 36 A 12 12 0 0 1 20 29" stroke={KO} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="45" cy="50" r="11" fill="currentColor" />
          <circle cx="45" cy="50" r="7.2" fill={KO} />
          <circle cx="42.5" cy="48" r="1.3" fill="currentColor" />
          <circle cx="47.5" cy="52" r="1.3" fill="currentColor" />
        </g>
      )
    case 'daruma':
      // だるま：片目だけ入った、まるい体
      return (
        <g>
          <path d="M32 5 C 48 5, 56 19, 56 36 C 56 52, 46 60, 32 60 C 18 60, 8 52, 8 36 C 8 19, 16 5, 32 5 Z" fill="currentColor" />
          <path d="M32 13 C 42 13, 47 21, 47 29 C 47 37, 40 42, 32 42 C 24 42, 17 37, 17 29 C 17 21, 22 13, 32 13 Z" fill={KO} />
          <circle cx="26" cy="27" r="4.4" fill="currentColor" />
          <circle cx="38" cy="27" r="3.8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20 q5 -3.5 10 -0.5 M34 19.5 q5 -3 10 0.5" {...s} strokeWidth={2.6} />
          <path d="M24 36 q4 -3 8 0 q4 -3 8 0" {...s} strokeWidth={2.2} />
          <path d="M21 51 q11 -8 22 0" stroke={KO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M26 55.5 q6 -4 12 0" stroke={KO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'boat':
      // ボート：交差したオールと、細長い艇。下に水
      return (
        <g>
          <path d="M14 10 L50 44 M50 10 L14 44" {...s} strokeWidth={3} />
          <path d="M5 4 Q4 13 13 17 Q17 9 5 4 Z M59 4 Q60 13 51 17 Q47 9 59 4 Z" fill="currentColor" />
          <path d="M3 40 Q32 49 61 40 L57 48 Q32 56 7 48 Z" fill="currentColor" />
          <path d="M11 45 Q32 51 53 45" stroke={KO} strokeWidth="1.5" fill="none" />
          <circle cx="24" cy="44.5" r="1.6" fill={KO} />
          <circle cx="40" cy="44.5" r="1.6" fill={KO} />
          <path d="M4 60 q5 -3.5 10 0 t10 0 t10 0 t10 0 t10 0 t10 0" {...s} strokeWidth={2.4} />
        </g>
      )
    case 'tea':
      // お茶：湯のみと湯気、茶葉2枚
      return (
        <g>
          <path d="M10 28 H46 L42 54 Q41 59 36 59 H20 Q15 59 14 54 Z" fill="currentColor" />
          <ellipse cx="28" cy="29" rx="15" ry="3" fill={KO} />
          <path d="M13 45 H43" stroke={KO} strokeWidth="1.8" />
          <path d="M22 21 q-3 -4 0 -8 q3 -4 0 -8 M32 21 q-3 -4 0 -8 q3 -4 0 -8" {...s} strokeWidth={2.4} />
          <path d="M44 22 Q50 6 61 7 Q57 21 44 22 Z" fill="currentColor" />
          <path d="M46 20 Q53 13 59 9" stroke={KO} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M48 27 Q57 19 63 25 Q56 32 48 27 Z" fill="currentColor" />
          <path d="M50 27 Q56 25 61 25.5" stroke={KO} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'lotus':
      // ハス：まん中の花びら、左右の花びら、下に葉
      return (
        <g>
          <path d="M5 52 Q32 40 59 52 Q32 63 5 52 Z" fill="currentColor" />
          <path d="M32 47 L32 56" stroke={KO} strokeWidth="1.6" />
          <path d="M30 41 Q13 44 5 35 Q18 28 30 41 Z M34 41 Q51 44 59 35 Q46 28 34 41 Z" fill="currentColor" stroke={KO} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M30 40 Q11 35 9 17 Q24 20 30 40 Z M34 40 Q53 35 55 17 Q40 20 34 40 Z" fill="currentColor" stroke={KO} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 4 Q44 20 32 41 Q20 20 32 4 Z" fill="currentColor" stroke={KO} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 12 V32" stroke={KO} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      )
    case 'kabu':
      // カブ：まるい根と、3枚の葉。細いひげ根
      return (
        <g>
          <path d="M29 28 C 17 24, 9 14, 13 4 C 23 8, 30 17, 30 28 Z" fill="currentColor" />
          <path d="M32 27 C 29 15, 32 7, 38 2 C 43 10, 39 20, 34 27 Z" fill="currentColor" />
          <path d="M35 28 C 45 21, 53 15, 58 8 C 58 19, 48 27, 35 28 Z" fill="currentColor" />
          <path d="M16 9 Q22 17 28 25 M37 7 Q36 16 33 24 M53 13 Q45 21 37 26" stroke={KO} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M32 27 C 47 27, 54 36, 54 44 C 54 54, 44 59, 32 59 C 20 59, 10 54, 10 44 C 10 36, 17 27, 32 27 Z" fill="currentColor" />
          <path d="M19 30.5 Q32 34 45 30.5" stroke={KO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M16 45 A 14 14 0 0 1 22 35" stroke={KO} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M32 59 Q34 62 30 63.5" {...s} strokeWidth={2} />
        </g>
      )
    case 'anchor':
      // 港：いかりと、ロープ
      return (
        <g>
          <circle cx="32" cy="9" r="5" {...s} strokeWidth={3.2} />
          <path d="M32 14 V55" {...s} strokeWidth={5} />
          <path d="M20 22 H44" {...s} strokeWidth={4.4} />
          <path d="M11 39 Q14 56 32 58 Q50 56 53 39" {...s} strokeWidth={4.6} />
          <path d="M11 32 L5 42 L16 41 Z M53 32 L59 42 L48 41 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 9 C 46 7, 50 19, 41 25 C 36 28, 38 34, 44 34" {...s} strokeWidth={2} strokeDasharray="3 2.4" />
        </g>
      )
    case 'shirasu':
      // しらす丼：どんぶりに、白いご飯と、目のついた小さな魚
      return (
        <g>
          <path d="M7 31 Q11 19 32 18 Q53 19 57 31 Z" fill={KO} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M5 31 H59 Q57 50 41 56 H23 Q7 50 5 31 Z" fill="currentColor" />
          <rect x="23" y="55" width="18" height="5" rx="1.5" fill="currentColor" />
          <path d="M11 39 H53" stroke={KO} strokeWidth="1.6" />
          {[[14, 28], [22, 25], [31, 23], [40, 24], [48, 27], [18, 30], [27, 29], [36, 28.5], [45, 30]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x} ${y} q3 ${i % 2 ? -1.6 : 1.6} 6 0`} {...s} strokeWidth={1.5} />
              <circle cx={x} cy={y} r="1" fill="currentColor" />
            </g>
          ))}
        </g>
      )
    case 'melon':
      // メロン：網の目と、T字のつる
      return (
        <g>
          <circle cx="32" cy="38" r="22" fill="currentColor" />
          <path d="M13 29 Q22 26 30 29 Q40 33 51 29 M10.5 40 Q20 36 30 40 Q42 44 53.5 39 M14 50 Q24 47 33 50 Q42 53 50 49" stroke={KO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M22 18 Q18 30 22 40 Q26 50 22 58 M33 16 Q30 28 34 38 Q38 49 34 60 M44 19 Q48 30 44 41 Q41 51 45 57" stroke={KO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M18 31 A 15 15 0 0 1 24 22" stroke={KO} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M32 16 V7 M24 7 H40" {...s} strokeWidth={3.4} />
          <path d="M41 8 Q51 0 59 6 Q51 14 41 8 Z" fill="currentColor" />
        </g>
      )
    case 'mountain':
      // 高尾山：木の生えた山と、登山道と、お日さま
      return (
        <g>
          <path d="M2 56 L21 22 L28 31 L39 12 L62 56 Z" fill="currentColor" />
          <path d="M13 47 l4 -8 l4 8 Z M24 50 l4 -8 l4 8 Z M34 43 l4 -8 l4 8 Z M46 49 l4 -8 l4 8 Z M29 36 l3 -6 l3 6 Z" fill={KO} />
          <path d="M39 17 L35 24 L41 29 L36 36" stroke={KO} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="2.6 2.2" />
          <circle cx="54" cy="12" r="5" {...s} strokeWidth={2.6} />
          <path d="M2 60 H62" {...s} strokeWidth={2.6} />
        </g>
      )
    case 'soba':
      // ざるそば：竹のざると、そばと、おはし
      return (
        <g>
          <path d="M40 4 L62 22 M45 2 L64 17" {...s} strokeWidth={2.4} />
          <rect x="5" y="30" width="54" height="26" rx="6" fill="currentColor" />
          <path d="M11 40 H53 M11 47 H53" stroke={KO} strokeWidth="1.2" />
          <path d="M10 34 Q18 16 32 16 Q46 16 54 34 Z" fill={KO} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M14 31 q3.5 -5 7 0 t7 0 t7 0 t7 0 t7 0 M18 25 q3.5 -4.5 7 0 t7 0 t7 0 t7 0 M24 20 q3 -3.6 6 0 t6 0 t6 0" {...s} strokeWidth={1.6} />
        </g>
      )
    case 'baseball':
      // 野球のボール：縫い目
      return (
        <g>
          <circle cx="32" cy="32" r="25" fill="currentColor" />
          <path d={`${seam(32, 32, 25, -1)} ${seam(32, 32, 25, 1)}`} stroke={KO} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`${stitches(32, 32, 25, -1, 6, 2.8)} ${stitches(32, 32, 25, 1, 6, 2.8)}`} stroke={KO} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'beef':
      // 牛肉：さしの入ったステーキと、脂のふち
      return (
        <g>
          <path d="M8 31 C 6 18, 21 9, 36 11 C 51 13, 59 24, 57 37 C 55 50, 40 57, 25 55 C 13 53, 10 43, 8 31 Z" fill="currentColor" />
          <path d="M36 15 C 48 17, 54 25, 53 36" stroke={KO} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M17 27 q5 -3.5 10 0.5 M14 39 q5 -2.5 9 1 M27 46 q6 -2.5 11 0.5 M30 32 q4 -2.5 8 0 M38 41 q3 -2 6 0.5 M22 19 q4 -2 7 0" stroke={KO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'clam':
      // ホンビノス貝：横に広い二枚貝。成長の輪と、上のちょうつがい。下に干潟の波
      return (
        <g>
          <path d="M3 35 C 3 22, 14 12, 28 11 C 42 10, 54 20, 55 33 C 55 43, 45 49, 29 49 C 13 49, 3 44, 3 35 Z" fill="currentColor" />
          <path d="M22 13 Q28 4 34 13 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 37 Q29 48 51 37 M10 29 Q29 40 48 29 M15 21 Q29 31 42 21" stroke={KO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M9 28 A 20 20 0 0 1 17 17" stroke={KO} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M42 49 C 42 42, 48 38, 54 38 C 60 38, 64 43, 63 49 C 63 54, 58 57, 52 57 C 46 57, 42 54, 42 49 Z" fill="currentColor" stroke={KO} strokeWidth="2" />
          <path d="M51 39.5 Q54 34.5 57 39.5 Z" fill="currentColor" />
          <path d="M45.5 50 Q53 55 60.5 49.5" stroke={KO} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M3 61 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0" {...s} strokeWidth={2.2} />
        </g>
      )
    case 'ferry':
      // 渡し舟：笠をかぶった船頭と、竿。木の舟と、川の波。岸のあし
      return (
        <g>
          <path d="M7 36 Q6 24 9 13 M13 37 Q13 27 16 20" {...s} strokeWidth={2} />
          <ellipse cx="9" cy="10" rx="2.4" ry="5" fill="currentColor" transform="rotate(-8 9 10)" />
          <ellipse cx="16.5" cy="17" rx="2.2" ry="4.4" fill="currentColor" transform="rotate(10 16.5 17)" />
          <path d="M37 24 H47 L49 43 H35 Z" fill="currentColor" />
          <circle cx="42" cy="19" r="3.6" fill="currentColor" />
          <path d="M32 16 L42 9.5 L52 16 Z" fill="currentColor" />
          <path d="M53 3 L35 58" {...s} strokeWidth={2.6} />
          <path d="M44 28.5 L50 27" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M3 37 Q8 42 14 43 H61 L57 50 Q55 53 49 53 H16 Q8 52 3 37 Z" fill="currentColor" />
          <path d="M15 47.5 H56" stroke={KO} strokeWidth="1.6" />
          <path d="M4 60 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" {...s} strokeWidth={2.2} />
        </g>
      )
    case 'sake':
      // 酒だる：こもで包んだたる。なわの帯と、まん中の札（水のしずく＝宮水）
      return (
        <g>
          <path d="M12 13 Q9 35 12 52 Q20 59 32 59 Q44 59 52 52 Q55 35 52 13 Z" fill="currentColor" />
          <ellipse cx="32" cy="13" rx="20" ry="5.5" fill="currentColor" />
          <ellipse cx="32" cy="13" rx="15" ry="3" fill={KO} />
          <path d="M11 23 Q32 30 53 23 M11 47 Q32 54 53 47" stroke={KO} strokeWidth="2.2" fill="none" />
          <path d="M16 24.5 l3 -3 M21 26 l3 -3 M40 26 l3 -3 M45 24.5 l3 -3 M16 48.5 l3 -3 M21 50 l3 -3 M40 50 l3 -3 M45 48.5 l3 -3" stroke={KO} strokeWidth="1.3" strokeLinecap="round" />
          <rect x="22" y="29" width="20" height="16" rx="2" fill={KO} />
          <path d="M32 31.5 C 29.5 35, 28 37.5, 28 39.5 A 4 4 0 0 0 36 39.5 C 36 37.5, 34.5 35, 32 31.5 Z" fill="currentColor" />
        </g>
      )
    case 'bean':
      // そら豆：ひらいたさやに、大きな豆が3つ。手前にもう1つ（はしの黒いすじ）
      return (
        <g>
          <path d="M3 31 C 3 20, 14 14, 30 15 C 44 16, 54 12, 60 3 C 64 16, 58 33, 42 38 C 28 42, 4 43, 3 31 Z" fill="currentColor" />
          <path d="M9 30 C 10 23, 18 20, 30 21 C 42 22, 50 19, 55 13 C 54 24, 48 30, 38 33 C 26 36, 10 37, 9 30 Z" fill={KO} />
          <ellipse cx="18" cy="29" rx="6" ry="4.6" fill="currentColor" />
          <ellipse cx="31" cy="28" rx="6.2" ry="4.8" fill="currentColor" />
          <ellipse cx="43.5" cy="25" rx="5.6" ry="4.3" fill="currentColor" transform="rotate(-18 43.5 25)" />
          <path d="M26 45 C 17 44, 12 50, 14 56 C 16 62, 27 63, 34 59 C 41 55, 42 48, 37 45.5 C 34 44, 30 45.5, 26 45 Z" fill="currentColor" />
          <path d="M33 47.5 Q37.5 50.5 35 56" stroke={KO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M18 51 A 9 9 0 0 1 23 47.5" stroke={KO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )
  }
}

/* ───────── キーホルダー（色つき 120×120） ───────── */

export function Charm20({ name }: { name: Motif20 }) {
  switch (name) {
    case 'bonsai':
      return (
        <g>
          <path d="M58 86 C 52 74, 70 68, 62 56 C 58 50, 46 50, 43 42" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
          <path d="M58 86 C 52 74, 70 68, 62 56 C 58 50, 46 50, 43 42" fill="none" stroke="#8a5a3a" strokeWidth="7" strokeLinecap="round" />
          <path d="M64 60 C 72 56, 79 53, 86 47" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M64 60 C 72 56, 79 53, 86 47" fill="none" stroke="#8a5a3a" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M12 44 C 9 35, 20 28, 29 31 C 33 24, 46 24, 50 31 C 58 30, 63 39, 56 45 C 47 50, 21 50, 12 44 Z" fill="#4f9a3a" {...ST} />
          <path d="M70 50 C 67 42, 76 36, 83 39 C 87 33, 98 33, 101 40 C 109 40, 112 48, 105 52 C 97 56, 76 56, 70 50 Z" fill="#4f9a3a" {...ST} />
          <path d="M36 26 C 33 17, 43 11, 51 14 C 56 7, 69 8, 71 15 C 79 15, 82 24, 75 28 C 66 32, 43 33, 36 26 Z" fill="#4f9a3a" {...ST} />
          <path d="M20 37 q7 -6 14 -2 M77 44 q6 -5 12 -2 M45 20 q7 -6 14 -2" stroke="#8fd14f" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="20" y="84" width="80" height="9" rx="4" fill="#3b5aa6" {...ST} />
          <path d="M26 93 H94 L87 108 H33 Z" fill="#2f4b8f" {...ST} />
          <path d="M36 98 H84" stroke="#6f8fd8" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M30 88 H52" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
          <path d="M38 108 V113 M82 108 V113" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'imo':
      return (
        <g>
          <path d="M106 33 L114 26 M12 74 L5 80" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M12 74 C 6 60, 24 42, 50 35 C 72 29, 96 25, 106 33 C 113 41, 104 55, 82 65 C 60 75, 22 91, 12 74 Z" fill="#c2456e" {...ST} strokeWidth={3.6} />
          <path d="M30 62 q5 -4 10 1 M54 50 q5 -4 10 1 M77 42 q4 -4 9 0 M44 68 q4 -3 8 0" stroke="#8c2a50" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M24 60 A 30 30 0 0 1 38 46" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="80" cy="90" rx="24" ry="17" fill="#c2456e" {...ST} />
          <ellipse cx="80" cy="89" rx="18.5" ry="12.5" fill="#ffd45a" stroke="#e0a800" strokeWidth="1.6" />
          <path d="M70 86 q5 -3 10 0 M80 93 q5 -3 9 0" stroke="#ffe9a0" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'daruma':
      return (
        <g>
          <path d="M60 8 C 92 8, 106 36, 106 66 C 106 96, 88 112, 60 112 C 32 112, 14 96, 14 66 C 14 36, 28 8, 60 8 Z" fill="#d93a2b" {...ST} strokeWidth={3.6} />
          <path d="M60 23 C 80 23, 89 37, 89 51 C 89 66, 77 74, 60 74 C 43 74, 31 66, 31 51 C 31 37, 40 23, 60 23 Z" fill="#fffdf7" {...ST} />
          <circle cx="48" cy="47" r="8.5" fill="#fff" {...ST} strokeWidth={2.6} />
          <circle cx="48" cy="47" r="5" fill={INK} />
          <circle cx="72" cy="47" r="8.5" fill="#fff" {...ST} strokeWidth={2.6} />
          <path d="M36 35 q10 -8 20 -2 M64 33 q10 -6 20 2" stroke={INK} strokeWidth="4.6" fill="none" strokeLinecap="round" />
          <path d="M46 62 q7 -5 14 0 q7 -5 14 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M28 90 q8 -6 16 0 t16 0 t16 0 t16 0" stroke="#ffc928" strokeWidth="4.4" fill="none" strokeLinecap="round" />
          <path d="M34 100 q6.5 -5 13 0 t13 0 t13 0 t13 0" stroke="#ffc928" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M27 44 A 38 38 0 0 1 38 22" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
      )
    case 'boat':
      return (
        <g>
          <path d="M24 18 L96 74 M96 18 L24 74" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
          <path d="M24 18 L96 74 M96 18 L24 74" fill="none" stroke="#e3a857" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="19" cy="14" rx="7.5" ry="13" transform="rotate(-52 19 14)" fill="#d93a2b" {...ST} />
          <ellipse cx="101" cy="14" rx="7.5" ry="13" transform="rotate(52 101 14)" fill="#d93a2b" {...ST} />
          <path d="M2 88 H118 V104 Q60 114 2 104 Z" fill="#4cc3e8" {...ST} />
          <path d="M12 97 q6 -4 12 0 t12 0 M50 100 q6 -4 12 0 t12 0 M88 97 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M6 66 Q60 80 114 66 L108 80 Q60 94 12 80 Z" fill="#ffc928" {...ST} strokeWidth={3.4} />
          <path d="M14 74 Q60 86 106 74" stroke="#d93a2b" strokeWidth="3" fill="none" />
          {[38, 60, 82].map((x) => (
            <ellipse key={x} cx={x} cy={x === 60 ? 77.5 : 76.5} rx="5" ry="2.4" fill="#a8642a" stroke={INK} strokeWidth="1.6" />
          ))}
        </g>
      )
    case 'tea':
      return (
        <g>
          <path d="M42 36 q-5 -6 0 -12 q5 -6 0 -12 M58 34 q-5 -6 0 -12 q5 -6 0 -12" stroke="#b9c3cc" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M14 48 H90 L82 98 Q80 108 70 108 H34 Q24 108 22 98 Z" fill="#f3eee2" {...ST} strokeWidth={3.6} />
          <path d="M19 78 H85" stroke="#3d7be0" strokeWidth="6" />
          <path d="M19 86 H84" stroke="#3d7be0" strokeWidth="2" />
          <ellipse cx="52" cy="48" rx="38" ry="8" fill="#8fd14f" {...ST} />
          <ellipse cx="52" cy="47.5" rx="27" ry="4.5" fill="#b8e07a" />
          <path d="M28 58 L32 96" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          <path d="M84 40 Q96 10 116 14 Q108 38 84 40 Z" fill="#4f9a3a" {...ST} />
          <path d="M88 37 Q100 24 112 17" stroke="#8fd14f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M92 46 Q108 34 118 44 Q106 56 92 46 Z" fill="#6fb83a" {...ST} />
          <path d="M95 46 Q106 43 115 45" stroke="#c7e05a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'lotus':
      return (
        <g>
          <path d="M2 90 H118 V106 Q60 116 2 106 Z" fill="#4cc3e8" {...ST} />
          <path d="M14 100 q6 -4 12 0 M92 100 q6 -4 12 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M8 90 Q60 70 112 90 Q60 108 8 90 Z" fill="#6fb83a" {...ST} />
          <path d="M60 82 V98 M60 90 L34 92 M60 90 L86 92" stroke="#4f8a24" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M56 74 Q26 80 12 64 Q34 52 56 74 Z" fill="#ff9fb8" {...ST} />
          <path d="M64 74 Q94 80 108 64 Q86 52 64 74 Z" fill="#ff9fb8" {...ST} />
          <path d="M56 72 Q22 64 18 32 Q46 38 56 72 Z" fill="#ffc2d1" {...ST} />
          <path d="M64 72 Q98 64 102 32 Q74 38 64 72 Z" fill="#ffc2d1" {...ST} />
          <path d="M60 10 Q82 38 60 74 Q38 38 60 10 Z" fill="#ffd8e2" {...ST} strokeWidth={3.4} />
          <path d="M60 16 Q56 22 58 30 M24 38 Q26 44 31 48 M96 38 Q94 44 89 48" stroke="#e8708f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M52 30 A 22 22 0 0 1 56 22" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'kabu':
      return (
        <g>
          <path d="M56 50 C 40 44, 24 30, 26 10 C 44 16, 56 30, 58 50 Z" fill="#6fb83a" {...ST} />
          <path d="M60 48 C 56 28, 60 14, 72 4 C 82 18, 76 34, 64 48 Z" fill="#8fd14f" {...ST} />
          <path d="M64 50 C 80 40, 94 30, 104 16 C 106 36, 90 50, 64 50 Z" fill="#6fb83a" {...ST} />
          <path d="M32 16 Q44 30 56 46 M71 12 Q68 28 63 44 M98 24 Q82 38 66 48" stroke="#3f7a12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M60 48 C 88 48, 100 64, 100 78 C 100 96, 82 106, 60 106 C 38 106, 20 96, 20 78 C 20 64, 32 48, 60 48 Z" fill="#fffdf7" {...ST} strokeWidth={3.6} />
          <path d="M36 54 Q60 60 84 54" stroke="#c7e05a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M30 82 A 28 28 0 0 1 40 62" stroke="#e9edf1" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M60 106 Q64 112 57 117" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'anchor':
      return (
        <g>
          <path d="M2 94 H118 V108 Q60 117 2 108 Z" fill="#4cc3e8" {...ST} />
          <path d="M12 102 q6 -4 12 0 t12 0 M84 102 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="16" r="9" fill="none" stroke={INK} strokeWidth="10" />
          <circle cx="60" cy="16" r="9" fill="none" stroke="#3d7be0" strokeWidth="4.5" />
          <path d="M22 66 Q26 98 60 100 Q94 98 98 66" fill="none" stroke={INK} strokeWidth="15" strokeLinecap="round" />
          <path d="M22 66 Q26 98 60 100 Q94 98 98 66" fill="none" stroke="#3d7be0" strokeWidth="8.5" strokeLinecap="round" />
          <path d="M22 54 L10 74 L30 72 Z M98 54 L110 74 L90 72 Z" fill="#3d7be0" {...ST} />
          <rect x="54" y="24" width="12" height="72" rx="5" fill="#3d7be0" {...ST} />
          <rect x="32" y="32" width="56" height="11" rx="5.5" fill="#2f4b8f" {...ST} />
          <path d="M58 30 V88" stroke="#9fdcef" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M60 18 C 88 16, 92 42, 70 48 C 50 54, 48 68, 70 72" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d="M60 18 C 88 16, 92 42, 70 48 C 50 54, 48 68, 70 72" fill="none" stroke="#e8c48a" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="5 3" />
        </g>
      )
    case 'shirasu':
      return (
        <g>
          <path d="M100 26 Q112 14 118 22 Q114 36 100 26 Z" fill="#6fb83a" {...ST} />
          <path d="M14 56 Q20 30 60 28 Q100 30 106 56 Z" fill="#fffdf7" {...ST} />
          {[[24, 50], [34, 44], [46, 40], [58, 37], [70, 39], [82, 43], [92, 49], [30, 54], [42, 50], [54, 47], [66, 47], [78, 50], [88, 54], [50, 55], [64, 56]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x} ${y} q5 ${i % 2 ? -2.6 : 2.6} 10 0`} fill="none" stroke="#e0d6c2" strokeWidth="3.2" strokeLinecap="round" />
              <path d={`M${x} ${y} q5 ${i % 2 ? -2.6 : 2.6} 10 0`} fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
              <circle cx={x} cy={y} r="1.5" fill={INK} />
            </g>
          ))}
          <circle cx="44" cy="38" r="2.4" fill="#6fb83a" stroke={INK} strokeWidth="1" />
          <circle cx="76" cy="42" r="2.4" fill="#6fb83a" stroke={INK} strokeWidth="1" />
          <path d="M8 56 H112 Q108 88 80 98 H40 Q12 88 8 56 Z" fill="#3d7be0" {...ST} strokeWidth={3.6} />
          <path d="M14 68 H106" stroke="#fff" strokeWidth="3" />
          <path d="M20 76 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="#9fdcef" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="40" y="97" width="40" height="9" rx="3" fill="#2f4b8f" {...ST} />
          <path d="M18 62 L24 84" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity="0.6" />
        </g>
      )
    case 'melon':
      return (
        <g>
          <circle cx="60" cy="68" r="42" fill="#9ccf5b" {...ST} strokeWidth={3.6} />
          <path d="M24 52 Q40 46 56 52 Q74 58 94 50 M19 70 Q36 64 56 70 Q78 76 101 68 M26 88 Q42 83 60 88 Q76 92 92 86" stroke="#eaf6d5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M40 30 Q32 52 40 70 Q47 88 40 106 M62 26 Q56 50 64 68 Q72 88 64 110 M84 32 Q92 52 84 72 Q78 90 86 104" stroke="#eaf6d5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M30 56 A 32 32 0 0 1 44 36" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M60 27 V12 M46 12 H74" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M60 27 V12 M46 12 H74" fill="none" stroke="#6b8a3a" strokeWidth="4" strokeLinecap="round" />
          <path d="M76 14 Q92 0 108 10 Q94 24 76 14 Z" fill="#4f9a3a" {...ST} />
          <path d="M80 14 Q94 9 104 10" stroke="#8fd14f" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'mountain':
      return (
        <g>
          <circle cx="98" cy="22" r="11" fill="#ffc928" {...ST} />
          <path d="M14 26 q4 -6 10 -3 q4 -6 11 -2 q7 0 6 6 q-2 4 -8 3 H18 q-6 0 -4 -4 Z" fill="#fffdf7" {...ST} strokeWidth={2.6} />
          <path d="M2 100 L30 52 L42 64 L64 26 L118 100 Z" fill="#5a9a3a" {...ST} strokeWidth={3.4} />
          <path d="M2 100 L30 52 L42 64 L52 78 L64 70 L84 100 Z" fill="#8fd14f" {...ST} strokeWidth={3} />
          {[[18, 92], [32, 84], [46, 90], [60, 86], [76, 94], [92, 80], [102, 92], [80, 66]].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y} l6 -12 l6 12 Z`} fill="#3f7a12" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          ))}
          <path d="M64 30 L58 42 L68 50 L60 62 L70 70" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeDasharray="4 3.4" />
          <path d="M2 100 H118 V110 Q60 116 2 110 Z" fill="#6fb83a" {...ST} />
        </g>
      )
    case 'soba':
      return (
        <g>
          <path d="M70 10 L116 46 M80 6 L118 36" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M70 10 L116 46 M80 6 L118 36" stroke="#a8642a" strokeWidth="3" strokeLinecap="round" />
          <rect x="6" y="56" width="92" height="48" rx="10" fill="#e8c48a" {...ST} strokeWidth={3.6} />
          <path d="M14 70 H90 M14 80 H90 M14 90 H90" stroke="#c9a46a" strokeWidth="2.2" />
          <path d="M14 64 Q22 30 52 28 Q82 30 90 64 Z" fill="#b5a48a" {...ST} />
          <path d="M20 60 q5 -8 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M26 50 q5 -7 10 0 t10 0 t10 0 t10 0 t10 0 M34 40 q5 -6 10 0 t10 0 t10 0 t10 0" stroke="#7a6a54" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M40 30 l6 -6 M52 28 l2 -8 M62 30 l6 -5" stroke="#26372b" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M86 84 H114 L111 106 Q110 112 104 112 H96 Q90 112 89 106 Z" fill="#2f4b8f" {...ST} />
          <ellipse cx="100" cy="84" rx="14" ry="3.6" fill="#6b3a1e" {...ST} strokeWidth={2.4} />
        </g>
      )
    case 'baseball':
      return (
        <g>
          <path d="M6 44 H22 M2 60 H18 M6 76 H22" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="66" cy="60" r="42" fill="#fffdf7" {...ST} strokeWidth={3.6} />
          <path d="M84 98 A 42 42 0 0 0 106 70 Q100 92 84 98 Z" fill="#e3e6eb" />
          <path d={`${seam(66, 60, 42, -1)} ${seam(66, 60, 42, 1)}`} stroke="#d93a2b" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`${stitches(66, 60, 42, -1, 7, 4.6)} ${stitches(66, 60, 42, 1, 7, 4.6)}`} stroke="#d93a2b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 50 A 34 34 0 0 1 46 32" stroke="#e3e6eb" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'beef':
      return (
        <g>
          <rect x="6" y="80" width="108" height="26" rx="10" fill="#e8c48a" {...ST} strokeWidth={3.4} />
          <path d="M14 92 H106" stroke="#c9a46a" strokeWidth="2.2" />
          <circle cx="104" cy="88" r="2.4" fill="#a8642a" />
          <path d="M16 58 C 12 34, 38 18, 64 20 C 92 22, 108 40, 104 62 C 100 84, 76 92, 50 90 C 28 88, 19 78, 16 58 Z" fill="#fff1e4" {...ST} strokeWidth={3.6} />
          <path d="M22 58 C 19 38, 41 26, 62 27 C 86 29, 98 43, 95 61 C 92 78, 74 85, 52 84 C 33 83, 25 74, 22 58 Z" fill="#d9524a" />
          <path d="M34 50 q8 -6 16 0 M30 64 q7 -4 14 1 M50 72 q9 -4 17 1 M56 54 q6 -4 12 0 M70 64 q5 -3 10 1 M44 38 q6 -3 11 0 M74 44 q5 -3 9 1" stroke="#ffd9cf" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M36 34 A 30 30 0 0 1 52 28" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M96 16 Q104 4 112 10 M104 10 L100 26" stroke="#4f9a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M101 14 q-6 2 -8 6 M103 20 q-6 1 -8 5" stroke="#6fb83a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'clam':
      return (
        <g>
          <path d="M2 96 Q60 86 118 96 V108 Q60 116 2 108 Z" fill="#e8d3a0" {...ST} />
          {[[14, 101], [30, 105], [56, 102], [80, 106], [104, 101]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="#c9a46a" />
          ))}
          <path d="M10 66 C 10 42, 30 22, 56 21 C 82 20, 104 40, 104 64 C 104 82, 86 92, 58 92 C 30 92, 10 84, 10 66 Z" fill="#d9c9a6" {...ST} strokeWidth={3.6} />
          <path d="M47 25 Q56 9 65 25 Z" fill="#b39d74" {...ST} strokeWidth={2.6} />
          <path d="M16 70 Q57 90 98 70 M20 56 Q57 76 94 56 M28 43 Q57 62 86 43 M40 31 Q57 44 74 31" stroke="#a08a64" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M20 54 A 38 38 0 0 1 34 34" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M94 80 C 101 79, 108 84, 110 90 C 112 97, 106 101, 98 101 C 90 101, 84 98, 84 92 C 84 86, 88 81, 94 80 Z" fill="#b9a88a" {...ST} />
          <path d="M87 94 Q98 99 109 93" stroke="#8a7a5e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'ferry':
      return (
        <g>
          <path d="M8 80 Q6 54 12 30 M20 82 Q20 62 26 46" stroke={INK} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M8 80 Q6 54 12 30 M20 82 Q20 62 26 46" stroke="#6fb83a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="12.5" cy="24" rx="4.6" ry="9" fill="#a8642a" {...ST} strokeWidth={2.4} transform="rotate(-6 12.5 24)" />
          <ellipse cx="27" cy="40" rx="4.2" ry="8" fill="#a8642a" {...ST} strokeWidth={2.4} transform="rotate(10 27 40)" />
          <path d="M2 88 H118 V106 Q60 115 2 106 Z" fill="#4cc3e8" {...ST} />
          <path d="M12 98 q6 -4 12 0 t12 0 M64 100 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M76 44 H96 L99 76 H73 Z" fill="#2f4b8f" {...ST} />
          <path d="M77 54 H96" stroke="#6f8fd8" strokeWidth="2.4" />
          <circle cx="86" cy="36" r="6.5" fill="#ffdcbf" {...ST} strokeWidth={2.6} />
          <path d="M68 31 L86 20 L104 31 Z" fill="#e8c48a" {...ST} />
          <path d="M76 27 L96 27" stroke="#c9a46a" strokeWidth="2" strokeLinecap="round" />
          <path d="M106 6 L70 112" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M106 6 L70 112" stroke="#c98a45" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="89" cy="56" r="4" fill="#ffdcbf" {...ST} strokeWidth={2.2} />
          <path d="M4 64 Q14 76 28 78 H116 L108 92 Q104 96 96 96 H30 Q12 94 4 64 Z" fill="#c98a45" {...ST} strokeWidth={3.4} />
          <path d="M26 86 H108" stroke="#8a5a3a" strokeWidth="2.4" />
          <path d="M12 72 Q18 80 28 82" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
      )
    case 'sake':
      return (
        <g>
          <path d="M22 24 Q16 62 22 98 Q38 110 60 110 Q82 110 98 98 Q104 62 98 24 Z" fill="#ead9a8" {...ST} strokeWidth={3.6} />
          <path d="M30 36 L26 52 M38 34 L34 52 M84 36 L88 52 M92 38 L95 52 M28 86 L25 98 M36 88 L33 102 M86 88 L89 100 M94 86 L96 96" stroke="#c9a46a" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="60" cy="24" rx="38" ry="10" fill="#c98a45" {...ST} strokeWidth={3.4} />
          <ellipse cx="60" cy="23" rx="28" ry="5.5" fill="#e3a857" />
          <path d="M18 42 Q60 56 102 42 M18 80 Q60 94 102 80" stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M18 42 Q60 56 102 42 M18 80 Q60 94 102 80" stroke="#d93a2b" strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d="M18 42 Q60 56 102 42 M18 80 Q60 94 102 80" stroke="#fff" strokeWidth="1.6" fill="none" strokeDasharray="3 5" />
          <rect x="40" y="52" width="40" height="28" rx="4" fill="#fffdf7" {...ST} />
          <path d="M60 56 C 55 63, 52 67, 52 70.5 A 8 8 0 0 0 68 70.5 C 68 67, 65 63, 60 56 Z" fill="#4cc3e8" {...ST} strokeWidth={2.4} />
          <path d="M56.5 69 A 4 4 0 0 0 58.5 73.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M26 58 Q24 74 27 88" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.65" />
        </g>
      )
    case 'bean':
      return (
        <g>
          <path d="M4 52 C 4 34, 24 24, 52 26 C 78 28, 98 20, 108 4 C 116 26, 106 56, 76 64 C 52 70, 6 72, 4 52 Z" fill="#6fb83a" {...ST} strokeWidth={3.6} />
          <path d="M14 51 C 16 40, 30 35, 52 36 C 74 37, 90 32, 99 22 C 97 40, 86 51, 68 55 C 46 60, 16 62, 14 51 Z" fill="#f3f8e6" stroke="#4f8a24" strokeWidth="2" />
          <ellipse cx="32" cy="48" rx="11" ry="8.5" fill="#9ccf5b" {...ST} strokeWidth={2.6} />
          <ellipse cx="55" cy="47" rx="11.5" ry="8.8" fill="#9ccf5b" {...ST} strokeWidth={2.6} />
          <ellipse cx="78" cy="42" rx="10.5" ry="8" fill="#9ccf5b" {...ST} strokeWidth={2.6} transform="rotate(-18 78 42)" />
          <path d="M26 45 q3 -3 7 -2 M49 44 q3 -3 7 -2 M72 40 q3 -3 7 -2" stroke="#d6efb0" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M108 4 Q114 0 117 6" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M50 78 C 34 76, 26 88, 30 98 C 34 110, 54 112, 66 104 C 78 96, 80 84, 70 79 C 64 76, 58 79, 50 78 Z" fill="#a8d66a" {...ST} strokeWidth={3.4} />
          <path d="M66 83 Q74 88 70 98" stroke="#2c3a20" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M38 90 A 16 16 0 0 1 46 82" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )
  }
}
