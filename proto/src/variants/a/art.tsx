// 案A「カプセルトイ」 — 手描きの絵（カプセル・家族のフィギュア・貯金箱・はんこの絵柄・項目のアイコン）。すべてSVGで自前。
import type { CSSProperties } from 'react'
import type { Mood } from '@/shared/types'
import type { MotifKey } from './lib'

const INK = 'var(--ink)'

/* ───────── カプセル ───────── */

export function Capsule({ color, size = 64, className, style, label }: { color: string; size?: number; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M6 50 A44 44 0 0 0 94 50 Z" fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M6 50 A44 44 0 0 1 94 50 Z" fill="rgba(255,255,255,0.78)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 36 A30 30 0 0 1 42 18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M24 66 A28 28 0 0 0 38 80" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="5" strokeLinecap="round" />
      <rect x="3" y="46" width="94" height="8" rx="4" fill={color} stroke={INK} strokeWidth="3.5" />
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

export function CapsuleBottom({ color, size = 100, className, style }: { color: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 52" width={size} height={size * 0.52} className={className} style={style} aria-hidden>
      <path d="M6 4 A44 44 0 0 0 94 4 Z" fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 18 A30 30 0 0 0 40 36" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="5" strokeLinecap="round" />
      <rect x="3" y="1" width="94" height="8" rx="4" fill={color} stroke={INK} strokeWidth="3.5" />
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

/* ───────── 貯金箱（家族の財布）。しょんぼりするのはこの子だけ ───────── */

export function Piggy({ mood, width = 96, className, style }: { mood: Mood; width?: number; className?: string; style?: CSSProperties }) {
  const happy = mood > 0
  const sad = mood < 0
  return (
    <svg viewBox="0 0 100 84" width={width} height={(width * 84) / 100} className={className} style={style} aria-hidden overflow="visible">
      {[22, 34, 58, 70].map((x) => (
        <rect key={x} x={x} y="58" width="9" height="15" rx="3" fill="#f27f9d" stroke={INK} strokeWidth="2.6" />
      ))}
      <path d="M14 42 q -10 -2 -8 -10 q 2 -6 8 -2" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="50" cy="44" rx="37" ry="26" fill="var(--pink)" stroke={INK} strokeWidth="3" />
      <path d="M60 22 L69 7 L76 25 Z" fill="#f27f9d" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M26 30 Q 34 22 46 22" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="4" strokeLinecap="round" />
      <rect x="38" y="17.5" width="20" height="4.6" rx="2.3" fill={INK} />
      <ellipse cx="86" cy="46" rx="9.5" ry="8.5" fill="#f27f9d" stroke={INK} strokeWidth="2.8" />
      <ellipse cx="83.2" cy="46" rx="1.6" ry="2.6" fill={INK} />
      <ellipse cx="88.8" cy="46" rx="1.6" ry="2.6" fill={INK} />
      {happy ? (
        <path d="M60.5 38 Q 65 32.5 69.5 38" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <circle cx="65" cy="36.5" r="2.8" fill={INK} />
      )}
      {sad && <path d="M60 29.5 L 70 26.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />}
      {happy ? (
        <path d="M70 55 Q 75.5 63 81 55 Z" fill={INK} />
      ) : sad ? (
        <path d="M71 59 Q 75.5 55.5 80 59" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M71.5 57 Q 75.5 59 79.5 57" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      )}
      <circle cx="58" cy="47" r="3.6" fill="#ff7a9a" opacity={sad ? 0.35 : 0.8} />
      {mood <= -2 && <path d="M78 14 Q 74 21 78 24 Q 82 21 78 14 Z" fill="#9fd8f5" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />}
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
          {[16, 23, 30, 37, 44].map((y) => [28, 32, 36].map((x) => <circle key={`${x}-${y}`} cx={x + (y % 2 ? 0 : 0)} cy={y} r="1.6" fill={KO} />))}
          <path d="M25 46 Q10 42 7 24 Q17 35 29 37 M39 46 Q54 42 57 24 Q47 35 35 37" {...s} />
          <path d="M32 54 V61" {...s} />
        </g>
      )
    case 'volcano':
      return (
        <g>
          <path d="M3 52 L21 24 H43 L61 52 Z" fill="currentColor" />
          <path d="M23 26 Q32 31 41 26" stroke={KO} strokeWidth="2.4" fill="none" />
          <path d="M17 38 L23 34 M41 34 L47 38 M27 44 L31 40" stroke={KO} strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="15" r="6" {...s} strokeWidth={2.8} />
          <circle cx="39" cy="9" r="5" {...s} strokeWidth={2.8} />
          <circle cx="24" cy="6" r="3.6" {...s} strokeWidth={2.6} />
          <path d="M3 59 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0" {...s} strokeWidth={2.6} />
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

export function MotifBadge({ name, size = 56, ink, className }: { name: MotifKey; size?: number; ink: string; className?: string }) {
  return (
    <svg viewBox="-6 -6 76 76" width={size} height={size} className={className} style={{ color: ink }} aria-hidden>
      <circle cx="32" cy="32" r="36" fill="var(--paper)" stroke={INK} strokeWidth="3" />
      <g transform="translate(6 6) scale(0.8125)">
        <Motif name={name} />
      </g>
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
    </svg>
  )
}
