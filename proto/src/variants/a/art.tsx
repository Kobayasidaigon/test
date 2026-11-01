// 案A「カプセルトイ」 — 手描きの絵（カプセル・家族のフィギュア・貯金箱・はんこの絵柄・キーホルダーの絵・項目のアイコン・小さな筐体）。すべてSVGで自前。
import { useId, type CSSProperties } from 'react'
import type { DataLevel, Mood } from '@/shared/types'
import type { MotifKey } from './lib'
import { Charm20, Stamp20, isMotif20 } from './art20'

const INK = 'var(--ink)'

/* ───────── カプセル ─────────
   データの細かさを見た目で分ける。
   detailed … 下半分に色がしっかり（市区町村の制度まで調べた街）
   pref     … 下半分がしま模様（県や市区町村の制度が一部わかる街）
   basic    … 下半分もすけている（国の全国調査だけ分かる街。市区町村の制度は準備中） */

export function Capsule({ color, size = 64, level = 'detailed', className, style, label }: {
  color: string
  size?: number
  level?: DataLevel
  className?: string
  style?: CSSProperties
  label?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const bottomFill = level === 'pref' ? `url(#stripe-${uid})` : level === 'basic' ? 'rgba(255,255,255,0.55)' : color
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {level === 'pref' && (
        <defs>
          <pattern id={`stripe-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="14" height="14" fill={color} />
            <rect width="5.5" height="14" fill="#fff" opacity="0.85" />
          </pattern>
        </defs>
      )}
      <path d="M6 50 A44 44 0 0 0 94 50 Z" fill={bottomFill} stroke={INK} strokeWidth="4" strokeLinejoin="round" strokeDasharray={level === 'basic' ? '7 6' : undefined} />
      {level === 'basic' && <path d="M14 58 A36 36 0 0 0 86 58" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9" />}
      <path d="M6 50 A44 44 0 0 1 94 50 Z" fill="rgba(255,255,255,0.78)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 36 A30 30 0 0 1 42 18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      {level !== 'basic' && <path d="M24 66 A28 28 0 0 0 38 80" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="5" strokeLinecap="round" />}
      <rect x="3" y="46" width="94" height="8" rx="4" fill={level === 'basic' ? '#fff' : color} stroke={INK} strokeWidth="3.5" />
    </svg>
  )
}

export function CapsuleTop({ size = 100, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 56" width={size} height={size * 0.56} className={className} style={style} aria-hidden>
      <path d="M6 50 A44 44 0 0 1 94 50 Z" fill="rgba(255,255,255,0.85)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 36 A30 30 0 0 1 42 18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <rect x="3" y="46" width="94" height="8" rx="4" fill="#e9edf1" stroke={INK} strokeWidth="3.5" />
    </svg>
  )
}

export function CapsuleBottom({ color, size = 100, level = 'detailed', className, style }: { color: string; size?: number; level?: DataLevel; className?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fill = level === 'pref' ? `url(#bstripe-${uid})` : level === 'basic' ? 'rgba(255,255,255,0.6)' : color
  return (
    <svg viewBox="0 0 100 52" width={size} height={size * 0.52} className={className} style={style} aria-hidden>
      {level === 'pref' && (
        <defs>
          <pattern id={`bstripe-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="14" height="14" fill={color} />
            <rect width="5.5" height="14" fill="#fff" opacity="0.85" />
          </pattern>
        </defs>
      )}
      <path d="M6 4 A44 44 0 0 0 94 4 Z" fill={fill} stroke={INK} strokeWidth="4" strokeLinejoin="round" strokeDasharray={level === 'basic' ? '7 6' : undefined} />
      {level === 'basic' && <path d="M14 12 A36 36 0 0 0 86 12" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />}
      {level !== 'basic' && <path d="M24 18 A30 30 0 0 0 40 36" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="5" strokeLinecap="round" />}
      <rect x="3" y="1" width="94" height="8" rx="4" fill={level === 'basic' ? '#fff' : color} stroke={INK} strokeWidth="3.5" />
    </svg>
  )
}

/* ───────── 家族のフィギュア ───────── */

export type Expr = 'joy' | 'smile' | 'calm'
export type FigureKind = 'adult' | 'child' | 'baby' | 'unborn'

const GEO = {
  adult: { hy: 22, hr: 14, top: 38, bot: 72, ht: 11, hb: 13, legTop: 70, legBot: 88, sy: 44 },
  child: { hy: 42, hr: 13, top: 56, bot: 78, ht: 9, hb: 11, legTop: 76, legBot: 88, sy: 60 },
  baby: { hy: 58, hr: 13, top: 71, bot: 87, ht: 10, hb: 14, legTop: 0, legBot: 0, sy: 75 },
} as const

function hairPath(style: number, hx: number, hy: number, hr: number) {
  const short = `M ${hx - hr - 0.5} ${hy + 1} Q ${hx - hr - 1} ${hy - hr - 1.5} ${hx} ${hy - hr - 1.5} Q ${hx + hr + 1} ${hy - hr - 1.5} ${hx + hr + 0.5} ${hy + 1} Q ${hx + hr * 0.55} ${hy - hr * 0.55} ${hx} ${hy - hr * 0.48} Q ${hx - hr * 0.6} ${hy - hr * 0.5} ${hx - hr - 0.5} ${hy + 1} Z`
  if (style % 4 === 1)
    return `M ${hx - hr - 1.5} ${hy + hr * 0.6} Q ${hx - hr - 2.5} ${hy - hr - 2} ${hx} ${hy - hr - 1.8} Q ${hx + hr + 2.5} ${hy - hr - 2} ${hx + hr + 1.5} ${hy + hr * 0.6} L ${hx + hr * 0.62} ${hy + hr * 0.6} Q ${hx + hr * 0.72} ${hy - hr * 0.32} ${hx} ${hy - hr * 0.45} Q ${hx - hr * 0.72} ${hy - hr * 0.32} ${hx - hr * 0.62} ${hy + hr * 0.6} Z`
  return short
}

function Face({ hx, hy, expr }: { hx: number; hy: number; expr: Expr }) {
  return (
    <g>
      {expr === 'joy' ? (
        <>
          <path d={`M ${hx - 7.2} ${hy + 2.6} Q ${hx - 4.8} ${hy - 1} ${hx - 2.4} ${hy + 2.6}`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d={`M ${hx + 2.4} ${hy + 2.6} Q ${hx + 4.8} ${hy - 1} ${hx + 7.2} ${hy + 2.6}`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d={`M ${hx - 4.2} ${hy + 6} Q ${hx} ${hy + 12.5} ${hx + 4.2} ${hy + 6} Z`} fill={INK} />
          <path d={`M ${hx - 2} ${hy + 8.8} Q ${hx} ${hy + 10.6} ${hx + 2} ${hy + 8.8}`} fill="#ff7a8a" />
        </>
      ) : (
        <>
          <circle cx={hx - 4.8} cy={hy + 1.6} r="1.9" fill={INK} />
          <circle cx={hx + 4.8} cy={hy + 1.6} r="1.9" fill={INK} />
          {expr === 'smile' ? (
            <path d={`M ${hx - 3.6} ${hy + 6.2} Q ${hx} ${hy + 9.8} ${hx + 3.6} ${hy + 6.2}`} fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
          ) : (
            <path d={`M ${hx - 2.6} ${hy + 7} Q ${hx} ${hy + 8} ${hx + 2.6} ${hy + 7}`} fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
          )}
        </>
      )}
      <circle cx={hx - 8.6} cy={hy + 5.2} r="2.3" fill="#ff9fb8" opacity="0.85" />
      <circle cx={hx + 8.6} cy={hy + 5.2} r="2.3" fill="#ff9fb8" opacity="0.85" />
    </g>
  )
}

function Base() {
  return (
    <g>
      <ellipse cx="30" cy="93" rx="21" ry="5.5" fill="#2c3240" stroke={INK} strokeWidth="2" />
      <ellipse cx="30" cy="90.5" rx="21" ry="5" fill="#4a5266" stroke={INK} strokeWidth="2" />
    </g>
  )
}

export function Figure({ kind, expr = 'smile', shirt, hair = 0, width = 52, className, style, title }: {
  kind: FigureKind; expr?: Expr; shirt: string; hair?: number; width?: number; className?: string; style?: CSSProperties; title?: string
}) {
  const h = (width * 100) / 60
  if (kind === 'unborn') {
    return (
      <svg viewBox="0 0 60 100" width={width} height={h} className={className} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <Base />
        <g transform="translate(13 52)">
          <path d="M2 18 A16 16 0 0 0 34 18 Z" fill="#ffc4d3" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M2 18 A16 16 0 0 1 34 18 Z" fill="rgba(255,255,255,0.85)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <rect x="0.5" y="16.2" width="35" height="3.6" rx="1.8" fill="#ffc4d3" stroke={INK} strokeWidth="2" />
          <path d="M18 14 C 14 8, 8.5 11, 12 15.5 L 18 21 L 24 15.5 C 27.5 11, 22 8, 18 14 Z" fill="var(--red)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </svg>
    )
  }
  const g = GEO[kind]
  const hx = 30
  const armDown = expr !== 'joy'
  const L = { x1: hx - g.ht, y1: g.sy, x2: armDown ? hx - g.ht - 6 : hx - g.ht - 9, y2: armDown ? g.sy + 15 : g.sy - 15 }
  const R = { x1: hx + g.ht, y1: g.sy, x2: armDown ? hx + g.ht + 6 : hx + g.ht + 9, y2: armDown ? g.sy + 15 : g.sy - 15 }
  const body = `M ${hx - g.ht} ${g.top + 6} Q ${hx - g.ht} ${g.top} ${hx - g.ht + 6} ${g.top} H ${hx + g.ht - 6} Q ${hx + g.ht} ${g.top} ${hx + g.ht} ${g.top + 6} L ${hx + g.hb} ${g.bot} H ${hx - g.hb} Z`
  return (
    <svg viewBox="0 0 60 100" width={width} height={h} className={className} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} overflow="visible">
      <Base />
      {kind !== 'baby' ? (
        <g>
          <rect x={hx - 8.5} y={g.legTop} width="7.5" height={g.legBot - g.legTop} rx="3.2" fill="#3a4150" stroke={INK} strokeWidth="2.2" />
          <rect x={hx + 1} y={g.legTop} width="7.5" height={g.legBot - g.legTop} rx="3.2" fill="#3a4150" stroke={INK} strokeWidth="2.2" />
        </g>
      ) : (
        <g>
          <ellipse cx={hx - 8} cy="88" rx="5.5" ry="3.4" fill="var(--skin)" stroke={INK} strokeWidth="2" />
          <ellipse cx={hx + 8} cy="88" rx="5.5" ry="3.4" fill="var(--skin)" stroke={INK} strokeWidth="2" />
        </g>
      )}
      {[L, R].map((a, i) => (
        <g key={i}>
          <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={shirt} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx={a.x2} cy={a.y2} r="3.3" fill="var(--skin)" stroke={INK} strokeWidth="1.8" />
        </g>
      ))}
      <path d={body} fill={shirt} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      {kind === 'baby' && <path d={`M ${hx - 6} ${g.top + 0.5} Q ${hx} ${g.top + 8} ${hx + 6} ${g.top + 0.5} Z`} fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />}
      <circle cx={hx} cy={g.hy} r={g.hr} fill="var(--skin)" stroke={INK} strokeWidth="2.8" />
      {kind === 'baby' ? (
        <path d={`M ${hx - 2} ${g.hy - g.hr + 0.5} q 1 -6 7 -5 q -5 1 -3.5 5`} fill="none" stroke="#3b2a20" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <>
          <path d={hairPath(hair, hx, g.hy, g.hr)} fill="#3b2a20" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          {hair % 4 === 2 && <path d={`M ${hx} ${g.hy - g.hr - 1.5} q 1.5 -6 6.5 -6.5`} fill="none" stroke="#3b2a20" strokeWidth="2.6" strokeLinecap="round" />}
          {hair % 4 === 3 && (
            <>
              <circle cx={hx - g.hr - 2} cy={g.hy - 3} r="4.2" fill="#3b2a20" stroke={INK} strokeWidth="1.4" />
              <circle cx={hx + g.hr + 2} cy={g.hy - 3} r="4.2" fill="#3b2a20" stroke={INK} strokeWidth="1.4" />
            </>
          )}
        </>
      )}
      <Face hx={hx} hy={g.hy} expr={expr} />
    </svg>
  )
}

/* ───────── 貯金箱（家族の財布）。しょんぼりするのはこの子だけ ─────────
   マイナスのときは、耳がたれて、体が少しつぶれて、汗のしずくが出る。 */

export function Piggy({ mood, width = 96, className, style }: { mood: Mood; width?: number; className?: string; style?: CSSProperties }) {
  const happy = mood > 0
  const sad = mood < 0
  return (
    <svg viewBox="0 0 100 84" width={width} height={(width * 84) / 100} className={className} style={style} aria-hidden overflow="visible">
      {[22, 34, 58, 70].map((x) => (
        <rect key={x} x={x} y="58" width="9" height="15" rx="3" fill="#f27f9d" stroke={INK} strokeWidth="2.6" />
      ))}
      <g transform={sad ? 'translate(0 3) scale(1 0.95)' : undefined}>
        <path d="M14 42 q -10 -2 -8 -10 q 2 -6 8 -2" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="50" cy="44" rx="37" ry="26" fill="var(--pink)" stroke={INK} strokeWidth="3" />
        {/* 耳：うれしいときはぴんと立ち、しょんぼりすると前にたれる */}
        {sad ? (
          <path d="M60 23 L75 17 L72 29 Z" fill="#f27f9d" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        ) : (
          <path d="M60 22 L69 7 L76 25 Z" fill="#f27f9d" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        )}
        <path d="M26 30 Q 34 22 46 22" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="4" strokeLinecap="round" />
        <rect x="38" y="17.5" width="20" height="4.6" rx="2.3" fill={INK} />
        <ellipse cx="86" cy="46" rx="9.5" ry="8.5" fill="#f27f9d" stroke={INK} strokeWidth="2.8" />
        <ellipse cx="83.2" cy="46" rx="1.6" ry="2.6" fill={INK} />
        <ellipse cx="88.8" cy="46" rx="1.6" ry="2.6" fill={INK} />
        {happy ? (
          <path d="M60.5 38 Q 65 32.5 69.5 38" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        ) : sad ? (
          <path d="M61 37 Q 65 40 69 37" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        ) : (
          <circle cx="65" cy="36.5" r="2.8" fill={INK} />
        )}
        {sad && <path d="M60 31 L 70 28.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />}
        {happy ? (
          <path d="M70 55 Q 75.5 63 81 55 Z" fill={INK} />
        ) : sad ? (
          <path d="M71 60 Q 75.5 56 80 60" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        ) : (
          <path d="M71.5 57 Q 75.5 59 79.5 57" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        )}
        <circle cx="58" cy="47" r="3.6" fill="#ff7a9a" opacity={sad ? 0.35 : 0.8} />
      </g>
      {sad && <path d="M44 6 Q 39.5 14 44 17.5 Q 48.5 14 44 6 Z" fill="#9fd8f5" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />}
      {mood <= -2 && <path d="M30 10 Q 26.5 16 30 18.5 Q 33.5 16 30 10 Z" fill="#9fd8f5" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  )
}

/* ───────── コイン ───────── */

export function Coin({ size = 44, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="var(--yolk)" stroke={INK} strokeWidth="3" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="var(--yolk-deep)" strokeWidth="2.4" />
      <path d="M17 15 L24 24 L31 15 M24 24 V34 M18.5 25 H29.5 M18.5 29.5 H29.5" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18 A15 15 0 0 1 18 9.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

/* ───────── はんこの絵柄（64×64。currentColor で一色刷り、白ぬきは紙の色） ───────── */

const KO = 'var(--paper)'

export function Motif({ name }: { name: MotifKey }) {
  // 20市を足したときに描いた絵は art20.tsx
  if (isMotif20(name)) return <Stamp20 name={name} />
  const s = { stroke: 'currentColor', strokeWidth: 3.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  switch (name) {
    case 'job':
      return (
        <g>
          <rect x="6" y="12" width="14" height="36" {...s} />
          <rect x="44" y="6" width="14" height="42" {...s} />
          {[18, 26, 34].map((y) => <circle key={y} cx="13" cy={y} r="1.8" fill="currentColor" />)}
          {[13, 21, 29].map((y) => <circle key={y} cx="51" cy={y} r="1.8" fill="currentColor" />)}
          <rect x="15" y="30" width="34" height="24" rx="4" fill="currentColor" />
          <path d="M26 30 V25 Q26 22 29 22 H35 Q38 22 38 25 V30" {...s} />
          <rect x="29" y="38" width="6" height="6" rx="1.2" fill={KO} />
          <path d="M15 40 H29 M35 40 H49" stroke={KO} strokeWidth="2" />
        </g>
      )
    case 'kettle':
      return (
        <g>
          <path d="M16 31 Q32 -2 48 31" {...s} />
          <path d="M13 40 Q13 27 32 27 Q51 27 51 40 Q51 55 32 55 Q13 55 13 40 Z" fill="currentColor" />
          <path d="M50 38 L61 29 L59 35 L51 45 Z" fill="currentColor" />
          <path d="M25 27 Q32 21 39 27" {...s} />
          <circle cx="32" cy="21" r="2.6" fill="currentColor" />
          {[[22, 36], [29, 34], [36, 34], [43, 36], [25, 42], [32, 41], [39, 42], [29, 48], [36, 48]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill={KO} />
          ))}
        </g>
      )
    case 'senbei':
      return (
        <g>
          <circle cx="32" cy="32" r="25" fill="currentColor" />
          <circle cx="32" cy="32" r="19.5" fill="none" stroke={KO} strokeWidth="1.6" strokeDasharray="2.5 4" />
          <path d="M7.8 37 H56.2 M9.6 45 H54.4" stroke={KO} strokeWidth="2.2" />
          {[[22, 22], [32, 18], [42, 23], [26, 29], [38, 29]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={KO} />)}
        </g>
      )
    case 'factory':
      return (
        <g>
          <path d="M5 55 V34 L15 26 V34 L25 26 V34 L35 26 V55 Z" fill="currentColor" />
          <rect x="37" y="30" width="20" height="25" fill="currentColor" />
          <rect x="41" y="10" width="5.5" height="22" fill="currentColor" />
          <rect x="50" y="16" width="4.5" height="16" fill="currentColor" />
          {[[10, 40], [18, 40], [26, 40], [10, 47], [18, 47], [26, 47], [42, 38], [50, 38], [42, 46], [50, 46]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill={KO} />
          ))}
          <circle cx="45" cy="5" r="3" {...s} strokeWidth={2.4} />
          <path d="M10 10 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 Z" fill="currentColor" />
          <path d="M26 6 l1.4 2.6 l2.6 1.4 l-2.6 1.4 l-1.4 2.6 l-1.4 -2.6 l-2.6 -1.4 l2.6 -1.4 Z" fill="currentColor" />
          <path d="M3 59 H61" {...s} />
        </g>
      )
    case 'rocket':
      return (
        <g>
          <path d="M32 4 Q45 17 43 40 H21 Q19 17 32 4 Z" fill="currentColor" />
          <circle cx="32" cy="22" r="5.2" fill={KO} />
          <path d="M21 31 L12 45 L21 42 Z M43 31 L52 45 L43 42 Z" fill="currentColor" />
          <path d="M26 44 Q32 61 38 44" {...s} />
          <path d="M8 12 l1.6 3 l3 1.6 l-3 1.6 l-1.6 3 l-1.6 -3 l-3 -1.6 l3 -1.6 Z" fill="currentColor" />
          <circle cx="54" cy="12" r="5" {...s} strokeWidth={2.6} />
          <path d="M47 15 Q54 10 61 9" {...s} strokeWidth={2.2} />
        </g>
      )
    case 'takoyaki':
      return (
        <g>
          <circle cx="18" cy="36" r="10" fill="currentColor" />
          <circle cx="32" cy="31" r="11" fill="currentColor" />
          <circle cx="46" cy="36" r="10" fill="currentColor" />
          <path d="M11 33 q4 -4 8 0 t8 0 M24 27 q4 -4 8 0 t8 0 M39 33 q4 -4 8 0 t8 0" stroke={KO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M4 42 H60 L53 56 H11 Z" fill="currentColor" />
          <path d="M8 47 H56" stroke={KO} strokeWidth="1.8" />
          <path d="M41 6 L35 26" {...s} strokeWidth={2.6} />
        </g>
      )
    case 'corn':
      return (
        <g>
          <path d="M32 5 Q45 19 41 42 Q37 54 32 54 Q27 54 23 42 Q19 19 32 5 Z" fill="currentColor" />
          {[16, 23, 30, 37, 44].map((y) => [28, 32, 36].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={KO} />))}
          <path d="M25 46 Q10 42 7 24 Q17 35 29 37 M39 46 Q54 42 57 24 Q47 35 35 37" {...s} />
          <path d="M32 54 V61" {...s} />
        </g>
      )
    case 'volcano':
      // 海に浮かぶ桜島。噴煙は火口から右上へたなびく、ひとつながりのもくもく（頭の上に左右対称の丸を置かない）
      return (
        <g>
          <path d="M2 50 Q9 47 14 42 Q19 36 24 34 L28 30 Q31 27 34 29 L37 32 Q40 30 43 33 Q50 38 55 44 Q59 48 62 50 Z" fill="currentColor" />
          <path d="M20 44 L25 38 M31 40 L33 34 M44 42 L41 37" stroke={KO} strokeWidth="2" strokeLinecap="round" />
          <path d="M33 27 C 30 23, 32 18.5, 36.5 19.5 C 38 14.5, 44.5 14, 46.5 18 C 50 15.5, 55.5 17.5, 54.5 22 C 58.5 22.5, 59 27.5, 55 28.5 C 51.5 29.5, 47.5 27.5, 45.5 26.5 C 42 28.5, 37.5 28.5, 33 27 Z" {...s} strokeWidth={2.8} />
          <path d="M57.5 14.5 C 58.5 12, 62 12.3, 62 15 C 62 17.2, 58.5 17.6, 57.5 14.5 Z" {...s} strokeWidth={2.2} />
          <path d="M3 58 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0" {...s} strokeWidth={2.6} />
        </g>
      )
    case 'drop':
      return (
        <g>
          <path d="M32 5 Q49 28 49 39 A17 17 0 0 1 15 39 Q15 28 32 5 Z" fill="currentColor" />
          <path d="M23 39 A9 9 0 0 0 30 48" stroke={KO} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M6 59 q5 -3 10 0 t10 0 M38 59 q5 -3 10 0 t10 0" {...s} strokeWidth={2.4} />
        </g>
      )
    case 'pear':
      // 梨（丸い和梨）。点々の皮と、葉っぱ
      return (
        <g>
          <circle cx="31" cy="37" r="21" fill="currentColor" />
          {[[22, 30], [30, 26], [38, 30], [25, 39], [34, 37], [42, 41], [28, 47], [37, 48], [19, 45]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill={KO} />
          ))}
          <path d="M17 31 A16 16 0 0 1 24 22" stroke={KO} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M31 16 Q32 10 36 6" {...s} />
          <path d="M35 9 Q46 1 55 8 Q46 16 35 9 Z" fill="currentColor" />
          <path d="M38 9 Q46 7 51 8" stroke={KO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'knife':
      // 包丁（堺の刃物）。刃は左下から右上へ
      return (
        <g>
          <path d="M24 38 L57 6 Q60 4 60 8 Q56 22 33 48 Z" fill="currentColor" />
          <path d="M29 41 L55 11" stroke={KO} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22 37 L34 49 L30 53 L18 41 Z" fill="currentColor" />
          <path d="M18 41 L30 53 L13 60 Q7 62 5 57 Q4 52 9 48 Z" fill="currentColor" />
          <circle cx="15" cy="52" r="1.7" fill={KO} />
          <circle cx="20" cy="49" r="1.7" fill={KO} />
        </g>
      )
    case 'house':
    default:
      return (
        <g>
          <path d="M8 30 L32 9 L56 30 V55 H8 Z" fill="currentColor" />
          <rect x="26" y="38" width="12" height="17" rx="2" fill={KO} />
          <path d="M32 20 C 29 15.5, 23.5 18, 26.5 22.5 L 32 28 L 37.5 22.5 C 40.5 18, 35 15.5, 32 20 Z" fill={KO} />
        </g>
      )
  }
}

/* ───────── キーホルダー用の色つきの絵（120×120）。はんこの一色刷りとは別に描いた ───────── */

const ST = { stroke: INK, strokeWidth: 3.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export function CharmArt({ motif, glyph, color }: { motif: MotifKey | null; glyph: string; color: string }) {
  if (isMotif20(motif)) return <Charm20 name={motif} />
  switch (motif) {
    case 'senbei':
      return (
        <g>
          <circle cx="60" cy="58" r="42" fill="#dca85e" {...ST} strokeWidth={3.6} />
          <circle cx="60" cy="58" r="34" fill="#c98a45" opacity="0.55" />
          <path d="M34 42 q10 -12 26 -8 q-6 12 -26 8 Z M66 36 q12 -2 18 8 q-12 4 -18 -8 Z" fill="#a8642a" opacity="0.75" />
          {[[44, 52], [58, 46], [72, 54], [50, 62], [66, 64]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#8a4b2a" />)}
          <path d="M18 70 Q60 82 102 70 L100 88 Q60 100 20 88 Z" fill="#26372b" {...ST} />
          <path d="M28 78 Q60 88 92 78" stroke="#3f5a45" strokeWidth="2.4" fill="none" />
          <path d="M30 36 A34 34 0 0 1 48 22" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )
    case 'kettle':
      return (
        <g>
          <path d="M30 56 Q60 6 90 56" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
          <path d="M30 56 Q60 6 90 56" fill="none" stroke="#6b7783" strokeWidth="4" strokeLinecap="round" />
          <path d="M98 70 L114 56 L113 64 L101 84 Z" fill="#4a5560" {...ST} />
          <path d="M18 78 Q18 54 60 54 Q102 54 102 78 Q102 108 60 108 Q18 108 18 78 Z" fill="#4a5560" {...ST} strokeWidth={3.6} />
          {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => (
            <circle key={`${r}-${c}`} cx={32 + c * 11 + (r % 2) * 5.5} cy={66 + r * 10} r="3" fill="#6b7783" stroke="#2c333a" strokeWidth="1" />
          )))}
          <ellipse cx="60" cy="54" rx="22" ry="7" fill="#3b444d" {...ST} />
          <circle cx="60" cy="47" r="4.5" fill="#6b7783" {...ST} strokeWidth={2.6} />
          <path d="M26 72 Q28 62 38 59" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M104 40 q-6 -6 0 -12 q6 -6 0 -12" stroke="#b9c3cc" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'pear':
      return (
        <g>
          <circle cx="58" cy="66" r="40" fill="#e4d27a" {...ST} strokeWidth={3.6} />
          {[[40, 52], [56, 46], [72, 52], [46, 66], [62, 64], [78, 70], [50, 82], [66, 84], [36, 76], [84, 58]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#b39444" />
          ))}
          <path d="M30 54 A30 30 0 0 1 44 36" stroke="#fff" strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.85" />
          <path d="M58 28 Q60 16 66 10" stroke="#6b4a2a" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M64 16 Q84 0 104 12 Q86 30 64 16 Z" fill="#8fd14f" {...ST} />
          <path d="M70 16 Q86 11 98 12" stroke="#4f8a24" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'factory':
      return (
        <g>
          <rect x="8" y="10" width="104" height="100" rx="20" fill="#24386e" {...ST} strokeWidth={3.6} />
          {[[24, 26], [50, 18], [92, 30], [78, 16]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 5} l1.6 3.4 l3.4 1.6 l-3.4 1.6 l-1.6 3.4 l-1.6 -3.4 l-3.4 -1.6 l3.4 -1.6 Z`} fill="#ffc928" />
          ))}
          <path d="M60 42 q-4 -8 4 -12 q2 -8 12 -6 q8 -6 14 2" fill="#e9edf1" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="62" y="40" width="9" height="40" fill="#5c6a7a" {...ST} strokeWidth={2.6} />
          <rect x="62" y="40" width="9" height="6" fill="#d93a2b" />
          <rect x="80" y="50" width="7" height="30" fill="#5c6a7a" {...ST} strokeWidth={2.6} />
          <path d="M14 96 V66 L28 56 V66 L42 56 V66 L56 56 V96 Z" fill="#3b4a57" {...ST} strokeWidth={2.8} />
          <rect x="56" y="70" width="44" height="26" fill="#3b4a57" {...ST} strokeWidth={2.8} />
          {[[20, 72], [30, 72], [40, 72], [20, 82], [30, 82], [40, 82], [62, 76], [72, 76], [82, 76], [92, 76], [66, 86], [80, 86]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill="#ffc928" />
          ))}
          <path d="M14 101 h10 M30 101 h14 M52 101 h8 M66 101 h16 M88 101 h10" stroke="#ffc928" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )
    case 'rocket':
      return (
        <g>
          <circle cx="92" cy="28" r="13" fill="#ff9fb8" {...ST} />
          <ellipse cx="92" cy="28" rx="21" ry="6" fill="none" stroke={INK} strokeWidth="3" transform="rotate(-18 92 28)" />
          {[[20, 24], [30, 70], [100, 74]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 6} l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 Z`} fill="#ffc928" stroke={INK} strokeWidth="1.4" />
          ))}
          <path d="M52 96 Q60 120 68 96 Z" fill="#ff8a3d" {...ST} strokeWidth={2.8} />
          <path d="M56 96 Q60 110 64 96 Z" fill="#ffc928" />
          <path d="M40 66 L28 92 L42 86 Z M80 66 L92 92 L78 86 Z" fill="#d93a2b" {...ST} />
          <path d="M60 10 Q84 36 78 92 H42 Q36 36 60 10 Z" fill="#fffdf7" {...ST} strokeWidth={3.6} />
          <path d="M60 10 Q70 20 75 32 H45 Q50 20 60 10 Z" fill="#d93a2b" {...ST} />
          <circle cx="60" cy="52" r="10" fill="#4cc3e8" {...ST} />
          <path d="M55 48 A6 6 0 0 1 60 45" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M48 78 H72" stroke={INK} strokeWidth="2.4" />
        </g>
      )
    case 'takoyaki':
      return (
        <g>
          <path d="M8 70 H112 L100 102 H20 Z" fill="#e8c48a" {...ST} strokeWidth={3.4} />
          <path d="M14 80 H106 M18 90 H102" stroke="#c9a46a" strokeWidth="2" />
          {[[34, 64, 19], [60, 56, 21], [86, 64, 19]].map(([x, y, r]) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r} fill="#d39a55" {...ST} />
              <path d={`M${x - r * 0.8} ${y - 2} Q${x} ${y - r * 1.25} ${x + r * 0.8} ${y - 2} Q${x} ${y + 3} ${x - r * 0.8} ${y - 2} Z`} fill="#6b3a1e" />
              <path d={`M${x - r * 0.55} ${y - 6} l${r * 0.25} -5 l${r * 0.25} 5 l${r * 0.25} -5 l${r * 0.25} 5`} stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={x - 4} cy={y - 12} r="1.6" fill="#4f8a24" />
              <circle cx={x + 5} cy={y - 9} r="1.6" fill="#4f8a24" />
            </g>
          ))}
          <path d="M74 20 L64 48" stroke="#e8c48a" strokeWidth="5" strokeLinecap="round" />
          <path d="M74 20 L64 48" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
          <path d="M44 34 q6 -4 10 2 M70 30 q6 -6 12 0" stroke="#e8a07a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'knife':
      return (
        <g>
          <path d="M40 66 L102 10 Q110 4 110 12 Q102 36 58 86 Z" fill="#dfe5ea" {...ST} strokeWidth={3.6} />
          <path d="M48 72 L100 18" stroke="#9aa6b2" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M56 60 L96 22" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />
          <path d="M36 64 L60 88 L54 94 L30 70 Z" fill="#b9c3cc" {...ST} strokeWidth={3} />
          <path d="M30 70 L54 94 L24 110 Q12 116 8 106 Q6 98 14 90 Z" fill="#a8642a" {...ST} strokeWidth={3.4} />
          <circle cx="24" cy="94" r="3" fill="#e8c48a" stroke={INK} strokeWidth="1.6" />
          <circle cx="34" cy="86" r="3" fill="#e8c48a" stroke={INK} strokeWidth="1.6" />
        </g>
      )
    case 'corn':
      return (
        <g>
          <path d="M44 96 Q18 86 14 50 Q32 70 54 74 Z" fill="#8fd14f" {...ST} />
          <path d="M76 96 Q102 86 106 50 Q88 70 66 74 Z" fill="#6fb83a" {...ST} />
          <path d="M60 8 Q84 30 78 78 Q72 102 60 102 Q48 102 42 78 Q36 30 60 8 Z" fill="#ffc928" {...ST} strokeWidth={3.6} />
          {[26, 36, 46, 56, 66, 76, 86].map((y) => [-8, 0, 8].map((dx) => (
            <ellipse key={`${dx}-${y}`} cx={60 + dx} cy={y} rx="3.6" ry="4" fill="#ffde6a" stroke="#e0a800" strokeWidth="1.4" />
          )))}
          <path d="M50 100 Q60 116 70 100" fill="#8fd14f" {...ST} />
        </g>
      )
    case 'volcano':
      // 火口から雲まで、太い煙の筋でつなぐ（山と雲が別々に見えないように）
      return (
        <g>
          <path d="M57 52 C 54 47, 60 45, 58 40" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
          <path d="M57 52 C 54 47, 60 45, 58 40" fill="none" stroke="#d5dbe1" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M58 40 C 50 32, 54 20, 64 22 C 66 12, 80 10, 84 18 C 92 12, 104 16, 102 26 C 110 28, 110 38, 102 40 C 94 42, 86 40, 82 38 C 76 42, 66 44, 58 40 Z" fill="#eef1f4" {...ST} strokeWidth={3} />
          <path d="M106 12 C 108 8, 115 8, 114 13 C 113 17, 107 17, 106 12 Z" fill="#eef1f4" {...ST} strokeWidth={2.4} />
          <path d="M4 92 Q16 86 26 76 Q36 64 46 60 L52 52 Q57 47 62 51 L66 56 Q72 52 78 58 Q92 68 102 80 Q110 88 116 92 Z" fill="#7a8f6e" {...ST} strokeWidth={3.4} />
          <path d="M46 60 L52 52 Q57 47 62 51 L66 56 Q72 52 78 58 Q70 62 62 60 Q54 64 46 60 Z" fill="#8a6a55" />
          <path d="M34 78 L42 68 M58 74 L60 64 M82 76 L76 68" stroke="#5a6e50" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M2 92 H118 V112 Q60 118 2 112 Z" fill="#4cc3e8" {...ST} strokeWidth={3} />
          <path d="M12 101 q6 -4 12 0 t12 0 M48 104 q6 -4 12 0 t12 0 M84 101 q6 -4 12 0 t12 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'drop':
      return (
        <g>
          <path d="M56 8 Q88 50 88 70 A32 32 0 0 1 24 70 Q24 50 56 8 Z" fill="#4cc3e8" {...ST} strokeWidth={3.6} />
          <path d="M38 70 A17 17 0 0 0 52 88" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="90" cy="92" r="16" fill="#ffc928" {...ST} />
          <path d="M84 85 L90 92 L96 85 M90 92 V100 M85.5 93.5 H94.5" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'house':
      return (
        <g>
          <rect x="22" y="48" width="76" height="54" fill="#fffdf7" {...ST} strokeWidth={3.4} />
          <path d="M12 52 L60 14 L108 52 Z" fill="#d93a2b" {...ST} strokeWidth={3.4} />
          <rect x="50" y="70" width="20" height="32" rx="3" fill="#ffc928" {...ST} />
          <path d="M60 30 C 56 24, 48 28, 53 34 L 60 41 L 67 34 C 72 28, 64 24, 60 30 Z" fill="#ff9fb8" {...ST} strokeWidth={2.4} />
          {[[30, 96, 9], [86, 94, 10], [102, 100, 7.5]].map(([x, y, r]) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r} fill="var(--skin)" {...ST} strokeWidth={2.6} />
              <path d={`M${x - r} ${y - 1} Q${x} ${y - r * 1.6} ${x + r} ${y - 1} Q${x} ${y - r * 0.5} ${x - r} ${y - 1} Z`} fill="#3b2a20" />
            </g>
          ))}
        </g>
      )
    case 'job':
      return (
        <g>
          <rect x="14" y="30" width="28" height="72" fill="#4cc3e8" {...ST} />
          <rect x="44" y="10" width="32" height="92" fill="#3d7be0" {...ST} />
          <rect x="78" y="38" width="28" height="64" fill="#9fdcef" {...ST} />
          {[0, 1, 2, 3, 4, 5].map((r) => [0, 1].map((c) => <rect key={`a${r}${c}`} x={19 + c * 11} y={38 + r * 10} width="6" height="5" fill="#fff" />))}
          {[0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2].map((c) => <rect key={`b${r}${c}`} x={49 + c * 9} y={18 + r * 11} width="5" height="6" fill="#ffc928" />))}
          <rect x="30" y="76" width="60" height="36" rx="6" fill="#a8642a" {...ST} strokeWidth={3.4} />
          <path d="M50 76 V70 Q50 66 54 66 H66 Q70 66 70 70 V76" fill="none" {...ST} strokeWidth={3.4} />
          <rect x="55" y="88" width="10" height="8" rx="2" fill="#ffc928" {...ST} strokeWidth={2} />
        </g>
      )
    default: {
      const chars = [...glyph]
      const fs = chars.length <= 1 ? 66 : chars.length === 2 ? 46 : chars.length === 3 ? 34 : 30
      return (
        <g>
          <path d="M60 8 C 92 8, 112 28, 112 60 C 112 92, 92 112, 60 112 C 28 112, 8 92, 8 60 C 8 28, 28 8, 60 8 Z" fill={color} {...ST} strokeWidth={3.6} />
          <circle cx="60" cy="60" r="40" fill="#fffdf7" {...ST} />
          {chars.length === 4 ? (
            <text x="60" y="60" textAnchor="middle" fontSize={fs} fontWeight={900} fill={INK} fontFamily="'Mochiy Pop One', sans-serif">
              <tspan x="60" dy="-4">{chars.slice(0, 2).join('')}</tspan>
              <tspan x="60" dy={fs}>{chars.slice(2).join('')}</tspan>
            </text>
          ) : (
            <text x="60" y={60 + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={900} fill={INK} fontFamily="'Mochiy Pop One', sans-serif">
              {glyph}
            </text>
          )}
          <path d="M26 40 A40 40 0 0 1 42 24" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )
    }
  }
}

/* ───────── 小さな筐体（どの台を回すか選ぶ札に使う） ───────── */

export function MiniMachine({ body, caps, size = 64, className }: { body: string; caps: { color: string; level: DataLevel }[]; size?: number; className?: string }) {
  const spots = [
    [20, 30], [33, 26], [46, 30], [26, 40], [40, 40],
  ]
  return (
    <svg viewBox="0 0 64 84" width={size} height={(size * 84) / 64} className={className} aria-hidden>
      <rect x="8" y="12" width="48" height="38" rx="12" fill="#e9f7f2" stroke={INK} strokeWidth="3" />
      {spots.map(([x, y], i) => {
        const c = caps[i % Math.max(caps.length, 1)] ?? { color: '#ffc928', level: 'detailed' as DataLevel }
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M-6 0 A6 6 0 0 0 6 0 Z" fill={c.level === 'basic' ? '#fff' : c.color} stroke={INK} strokeWidth="1.6" strokeDasharray={c.level === 'basic' ? '2 1.6' : undefined} />
            {c.level === 'pref' && <path d="M-3.5 1.5 L-1 4.5 M0.5 1.5 L3 4.5" stroke="#fff" strokeWidth="1.4" />}
            <path d="M-6 0 A6 6 0 0 1 6 0 Z" fill="rgba(255,255,255,0.85)" stroke={INK} strokeWidth="1.6" />
          </g>
        )
      })}
      <path d="M14 18 V36" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="4" y="48" width="56" height="34" rx="6" fill={body} stroke={INK} strokeWidth="3" />
      <circle cx="44" cy="60" r="7" fill="var(--yolk)" stroke={INK} strokeWidth="2.4" />
      <rect x="38.5" y="58" width="11" height="4" rx="2" fill="var(--red)" stroke={INK} strokeWidth="1.6" transform="rotate(-28 44 60)" />
      <rect x="12" y="68" width="22" height="10" rx="4" fill="#2c3240" stroke={INK} strokeWidth="2.2" />
      <rect x="14" y="55" width="10" height="9" rx="2.5" fill="var(--metal)" stroke={INK} strokeWidth="2" />
      <rect x="2" y="4" width="60" height="10" rx="4" fill="var(--yolk)" stroke={INK} strokeWidth="2.6" />
    </svg>
  )
}

/* ───────── 項目のアイコン（色つき） ───────── */

export function ItemIcon({ name, size = 44 }: { name: string; size?: number }) {
  const st = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      {name === 'nursery' && (
        <g>
          <circle cx="38" cy="10" r="5" fill="var(--yolk)" {...st} />
          <rect x="9" y="22" width="28" height="20" fill="var(--paper)" {...st} />
          <path d="M5 24 L23 9 L41 24 Z" fill="var(--red)" {...st} />
          <path d="M19 42 V33 Q23 29 27 33 V42" fill="var(--yolk)" {...st} />
          <circle cx="15" cy="30" r="2.6" fill="var(--sky)" stroke={INK} strokeWidth="1.8" />
          <circle cx="31" cy="30" r="2.6" fill="var(--sky)" stroke={INK} strokeWidth="1.8" />
        </g>
      )}
      {name === 'cash' && (
        <g>
          <rect x="5" y="12" width="32" height="22" rx="3" fill="var(--paper)" {...st} />
          <path d="M5 14 L21 26 L37 14" fill="none" {...st} />
          <circle cx="34" cy="32" r="10" fill="var(--yolk)" {...st} />
          <path d="M30 27.5 L34 32 L38 27.5 M34 32 V37.5 M30.5 33 H37.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {name === 'lunch' && (
        <g>
          <path d="M14 16 L24 8 L34 16 V42 H14 Z" fill="var(--paper)" {...st} />
          <path d="M14 16 H34" {...st} />
          <rect x="14" y="22" width="20" height="12" fill="var(--sky)" {...st} />
          <path d="M24 25 Q28 29 24 31.5 Q20 29 24 25 Z" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <path d="M24 8 V4" {...st} />
        </g>
      )}
      {name === 'medical' && (
        <g transform="rotate(-30 24 24)">
          <rect x="4" y="16" width="40" height="16" rx="8" fill="#ffd2b0" {...st} />
          <rect x="17" y="16" width="14" height="16" fill="#fff1e4" {...st} />
          {[[20, 20], [24, 20], [28, 20], [20, 24], [24, 24], [28, 24], [20, 28], [24, 28], [28, 28]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill={INK} />
          ))}
        </g>
      )}
      {name === 'iju' && (
        <g>
          <path d="M6 18 L24 12 L42 18 L24 24 Z" fill="#e8b878" {...st} />
          <path d="M6 18 V36 L24 43 V24 Z" fill="#d9a066" {...st} />
          <path d="M42 18 V36 L24 43 V24 Z" fill="#c98c50" {...st} />
          <path d="M15 15 L33 21 V27" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}
      {name === 'unknown' && (
        <g>
          <path d="M5 24 A19 19 0 0 0 43 24 Z" fill="#c9ced6" {...st} />
          <path d="M5 24 A19 19 0 0 1 43 24 Z" fill="rgba(255,255,255,0.85)" {...st} />
          <rect x="3.5" y="22" width="41" height="4.4" rx="2.2" fill="#c9ced6" stroke={INK} strokeWidth="2" />
          <text x="24" y="20" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK} fontFamily="'Mochiy Pop One', sans-serif">?</text>
        </g>
      )}
      {name === 'care' && (
        <g>
          <path d="M24 40 C 10 30, 4 22, 8 14 C 12 7, 21 8, 24 15 C 27 8, 36 7, 40 14 C 44 22, 38 30, 24 40 Z" fill="#9fdcef" {...st} />
          <path d="M15 17 A6 6 0 0 1 20 13" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
