// 案D「家計レシート」 — 食卓の絵。家族・いす・茶碗・席札・名物の料理や小物・貯金箱を、SVG で手描きした。
// 絵の約束: 家族と子どもはいつも笑顔か穏やか。しょんぼりするのは貯金箱（家族の財布）だけ。
import type { ReactNode } from 'react'
import type { Mood, Pride } from '@/shared/types'
import { splitPop } from './lib'

export type Kind = 'adult' | 'teen' | 'kid' | 'baby'
export type SeatKind = Kind | 'unborn'
export type Face = 'joy' | 'smile' | 'calm'

export const kindOfAge = (age: number): SeatKind => (age < 0 ? 'unborn' : age <= 2 ? 'baby' : age <= 11 ? 'kid' : 'teen')

const SKIN = ['#f7d3b5', '#efc29c', '#f9dcc4', '#f3c9a6']
const SKIN_SHADE = ['#e9bd9a', '#dcab84', '#ecc7ab', '#e3b48e']
const HAIR = ['#3a2a22', '#2a2229', '#5a3b28', '#3d2b20']
const CLOTH_ADULT = ['#3f6f8f', '#d9773b']
const CLOTH_KID = ['#e4b43a', '#5e9e6f', '#d65f6c', '#4e8fa8', '#b98a4a']

const DIM: Record<Kind, { r: number; hy: number; sy: number; w: number }> = {
  adult: { r: 15, hy: -56, sy: -36, w: 19 },
  teen: { r: 14, hy: -51, sy: -32, w: 17 },
  kid: { r: 13.5, hy: -42, sy: -24, w: 14 },
  baby: { r: 12.5, hy: -36, sy: -19, w: 11 },
}

type HairStyle = 'short' | 'bun' | 'bob' | 'pig' | 'tuft'

function hairOf(kind: Kind, idx: number): HairStyle {
  if (kind === 'baby') return 'tuft'
  if (kind === 'adult') return idx === 0 ? 'short' : 'bun'
  if (kind === 'teen') return idx % 2 ? 'bob' : 'short'
  return (['short', 'pig', 'bob'] as const)[idx % 3]
}

function Hair({ style, r, hy, color }: { style: HairStyle; r: number; hy: number; color: string }) {
  const cap = `M${-r - 0.6} ${hy + 2} C${-r - 1.5} ${hy - r * 1.45} ${r + 1.5} ${hy - r * 1.45} ${r + 0.6} ${hy + 2} C${r * 0.7} ${hy - r * 0.35} ${r * 0.1} ${hy - r * 0.65} ${-r * 0.25} ${hy - r * 0.5} C${-r * 0.6} ${hy - r * 0.4} ${-r * 0.85} ${hy - r * 0.15} ${-r - 0.6} ${hy + 2}Z`
  if (style === 'tuft') {
    return <path d={`M${-1.5} ${hy - r + 1.2} q1 -6.5 6.4 -4.6 q-3.4 -0.4 -3.6 2.8`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  }
  return (
    <g fill={color}>
      {style === 'bun' && <circle cx={r * 0.18} cy={hy - r * 1.08} r={r * 0.42} />}
      {style === 'pig' && (
        <>
          <circle cx={-r - 2.6} cy={hy - r * 0.15} r={r * 0.36} />
          <circle cx={r + 2.6} cy={hy - r * 0.15} r={r * 0.36} />
        </>
      )}
      {style === 'bob' && (
        <>
          <path d={`M${-r - 1} ${hy - 3} L${-r - 1.6} ${hy + r * 0.72} Q${-r * 0.72} ${hy + r * 0.86} ${-r * 0.64} ${hy + r * 0.3} L${-r * 0.72} ${hy - 3}Z`} />
          <path d={`M${r + 1} ${hy - 3} L${r + 1.6} ${hy + r * 0.72} Q${r * 0.72} ${hy + r * 0.86} ${r * 0.64} ${hy + r * 0.3} L${r * 0.72} ${hy - 3}Z`} />
        </>
      )}
      <path d={cap} />
    </g>
  )
}

function Eyes({ face, k, hy, glasses }: { face: Face; k: number; hy: number; glasses?: boolean }) {
  const ex = 5.3 * k
  const ey = hy + 1
  return (
    <g>
      {face === 'calm' ? (
        <g className="vd-blink">
          <circle cx={-ex} cy={ey} r={1.75 * k} fill="var(--ink)" />
          <circle cx={ex} cy={ey} r={1.75 * k} fill="var(--ink)" />
        </g>
      ) : (
        <g fill="none" stroke="var(--ink)" strokeWidth={1.7} strokeLinecap="round">
          <path d={`M${-ex - 2.4 * k} ${ey + 1} Q${-ex} ${ey - 2.6 * k} ${-ex + 2.4 * k} ${ey + 1}`} />
          <path d={`M${ex - 2.4 * k} ${ey + 1} Q${ex} ${ey - 2.6 * k} ${ex + 2.4 * k} ${ey + 1}`} />
        </g>
      )}
      {glasses && (
        <g fill="none" stroke="var(--ink)" strokeWidth={1.1}>
          <circle cx={-ex} cy={ey} r={4.3 * k} />
          <circle cx={ex} cy={ey} r={4.3 * k} />
          <path d={`M${-ex + 4.3 * k} ${ey} H${ex - 4.3 * k}`} />
        </g>
      )}
    </g>
  )
}

function Mouth({ face, k, hy }: { face: Face; k: number; hy: number }) {
  if (face === 'joy') {
    return (
      <g>
        <path d={`M${-4.6 * k} ${hy + 5.6 * k} Q0 ${hy + 13 * k} ${4.6 * k} ${hy + 5.6 * k}Z`} fill="#8a3a33" />
        <ellipse cx={0} cy={hy + 8.6 * k} rx={2.2 * k} ry={1.3 * k} fill="#e07a6e" />
      </g>
    )
  }
  const d = face === 'smile' ? `M${-4 * k} ${hy + 6 * k} Q0 ${hy + 10 * k} ${4 * k} ${hy + 6 * k}` : `M${-3 * k} ${hy + 6.6 * k} Q0 ${hy + 8.8 * k} ${3 * k} ${hy + 6.6 * k}`
  return <path d={d} fill="none" stroke="var(--ink)" strokeWidth={1.5} strokeLinecap="round" />
}

/** 席に座っている人（テーブルの奥の辺が y=0）。 */
export function Person({ kind, idx, face, hat }: { kind: Kind; idx: number; face: Face; hat?: boolean }) {
  const { r, hy, sy, w } = DIM[kind]
  const k = r / 15
  const tone = (idx + (kind === 'adult' ? 0 : 2)) % SKIN.length
  const skin = SKIN[tone]
  const shade = SKIN_SHADE[tone]
  const hair = HAIR[(idx + (kind === 'adult' ? 0 : 1)) % HAIR.length]
  const cloth = kind === 'adult' ? CLOTH_ADULT[idx % 2] : CLOTH_KID[idx % CLOTH_KID.length]
  const joy = face === 'joy'
  const ax = w - 3
  return (
    <g className={joy ? 'vd-hop' : 'vd-bob'} style={{ animationDelay: `${-idx * 0.41 - (kind === 'adult' ? 0 : 0.9)}s` }}>
      {joy && (
        <g>
          {[-1, 1].map((s) => (
            <g key={s}>
              <path
                d={`M${s * ax} ${sy + 5} Q${s * (w + 8)} ${sy - 7} ${s * (w + 7)} ${hy - r * 0.5}`}
                fill="none"
                stroke={cloth}
                strokeWidth={6.4 * Math.max(k, 0.8)}
                strokeLinecap="round"
              />
              <circle cx={s * (w + 7)} cy={hy - r * 0.5 - 1.5} r={3.6 * Math.max(k, 0.8)} fill={skin} />
            </g>
          ))}
        </g>
      )}
      <path d={`M${-w} 3 L${-w} ${sy + 9} Q${-w} ${sy} ${-w + 9} ${sy} L${w - 9} ${sy} Q${w} ${sy} ${w} ${sy + 9} L${w} 3Z`} fill={cloth} />
      <path d={`M${-5 * k} ${sy + 0.5} Q0 ${sy + 6 * k} ${5 * k} ${sy + 0.5}`} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={1.6} strokeLinecap="round" />
      {kind === 'baby' && <path d={`M${-6} ${sy + 1} Q0 ${sy + 10} ${6} ${sy + 1}Z`} fill="#fffdf7" />}
      <rect x={-3.5 * k} y={hy + r - 4} width={7 * k} height={sy - (hy + r - 4) + 1} fill={shade} />
      <circle cx={-r + 0.6} cy={hy + 1.5} r={3 * k} fill={skin} />
      <circle cx={r - 0.6} cy={hy + 1.5} r={3 * k} fill={skin} />
      <circle cx={0} cy={hy} r={r} fill={skin} />
      <Hair style={hairOf(kind, idx)} r={r} hy={hy} color={hair} />
      {hat && (
        <g>
          <path d={`M${-r - 1} ${hy - 2} C${-r} ${hy - r * 1.6} ${r} ${hy - r * 1.6} ${r + 1} ${hy - 2}Z`} fill="#f1c232" />
          <path d={`M${-r - 3.5} ${hy - 1} Q0 ${hy + 2.2} ${r + 3.5} ${hy - 1} Q0 ${hy - 4.2} ${-r - 3.5} ${hy - 1}Z`} fill="#dea81a" />
        </g>
      )}
      <ellipse cx={-8.6 * k} cy={hy + 5.4 * k} rx={2.6 * k} ry={1.6 * k} fill="#f09a8a" opacity={0.55} />
      <ellipse cx={8.6 * k} cy={hy + 5.4 * k} rx={2.6 * k} ry={1.6 * k} fill="#f09a8a" opacity={0.55} />
      <Eyes face={face} k={k} hy={hy} glasses={kind === 'adult' && idx === 0} />
      <Mouth face={face} k={k} hy={hy} />
    </g>
  )
}

/** いすの背もたれ（人のうしろに描く）。open は誰も座っていない、すき間のある背もたれ。 */
export function Chair({ kind, open }: { kind: SeatKind; open?: boolean }) {
  const high = kind === 'baby' || kind === 'unborn'
  const hw = kind === 'adult' ? 23 : kind === 'teen' ? 21 : kind === 'kid' ? 18 : 16
  const top = kind === 'adult' ? -50 : kind === 'teen' ? -46 : kind === 'kid' ? -36 : -46
  if (open) {
    const inner = hw * 2 - 9
    return (
      <g>
        <rect x={-hw} y={top + 3} width={4.5} height={-top} rx={2.2} fill="var(--wood-2)" />
        <rect x={hw - 4.5} y={top + 3} width={4.5} height={-top} rx={2.2} fill="var(--wood-2)" />
        {[1, 2, 3].map((i) => (
          <rect key={i} x={-hw + 4.5 + (inner * i) / 4 - 1.5} y={top + 8} width={3} height={-top - 8} rx={1.5} fill="var(--wood-2)" opacity={0.9} />
        ))}
        <rect x={-hw - 2} y={top} width={hw * 2 + 4} height={9} rx={4.5} fill="var(--wood-2)" />
        <rect x={-hw + 1} y={top + 1.6} width={hw * 2 - 2} height={3} rx={1.5} fill="var(--wood-hi)" opacity={0.65} />
        <rect x={-hw + 2} y={top + 20} width={hw * 2 - 4} height={4} rx={2} fill="var(--wood-2)" />
      </g>
    )
  }
  return (
    <g>
      <rect x={-hw} y={top} width={hw * 2} height={-top + 2} rx={high ? 9 : 6} fill="var(--wood-2)" />
      <rect x={-hw + 2.5} y={top + 2.5} width={hw * 2 - 5} height={5} rx={2.5} fill="var(--wood-hi)" opacity={0.55} />
      {high ? (
        <>
          <rect x={-hw - 3} y={top + 14} width={4} height={-top - 12} rx={2} fill="var(--wood-3)" />
          <rect x={hw - 1} y={top + 14} width={4} height={-top - 12} rx={2} fill="var(--wood-3)" />
        </>
      ) : (
        <>
          <rect x={-hw * 0.5 - 1.5} y={top + 10} width={3} height={-top - 10} fill="var(--wood-3)" opacity={0.3} />
          <rect x={hw * 0.5 - 1.5} y={top + 10} width={3} height={-top - 10} fill="var(--wood-3)" opacity={0.3} />
        </>
      )}
      {kind === 'unborn' && (
        <g>
          <path d={`M-7 ${top + 4} q-6 -6 -9 1 q4 4 9 -1Z M7 ${top + 4} q6 -6 9 1 q-4 4 -9 -1Z`} fill="var(--red)" />
          <circle cx={0} cy={top + 4} r={2.6} fill="#a52c23" />
          <path d={`M-3 ${top + 6} l-3 9 M3 ${top + 6} l3 9`} stroke="var(--red)" strokeWidth={2} strokeLinecap="round" />
          <path d={`M0 ${top + 22} l1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5Z`} fill="#f1c232" />
        </g>
      )}
    </g>
  )
}

/** 空いている席（タップで座る）。 */
export function GhostChair({ label }: { label: string }) {
  return (
    <g>
      <rect x={-20} y={-46} width={40} height={48} rx={7} fill="rgba(255,253,247,.55)" stroke="var(--wood-3)" strokeWidth={1.4} strokeDasharray="4 3" />
      <circle cx={0} cy={-26} r={9} fill="var(--paper)" stroke="var(--red)" strokeWidth={1.6} />
      <path d="M-4.5 -26 H4.5 M0 -30.5 V-21.5" stroke="var(--red)" strokeWidth={2} strokeLinecap="round" />
      <text x={0} y={-6} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--wood-3)">
        {label}
      </text>
    </g>
  )
}

/** 茶碗（大人・子ども）と、赤ちゃんのマグ。原点は縁のまんなか。 */
export function Bowl({ kind }: { kind: SeatKind }) {
  if (kind === 'baby' || kind === 'unborn') {
    return (
      <g>
        <rect x={-6} y={-6} width={12} height={13} rx={3.5} fill="#fdf6e9" stroke="#e7dcc6" strokeWidth={0.8} />
        <path d="M-6 -2 q-5 0 -5 4 q0 4 5 4 M6 -2 q5 0 5 4 q0 4 -5 4" fill="none" stroke="#f1c232" strokeWidth={2} />
        <rect x={-4} y={-9} width={8} height={3.5} rx={1.5} fill="#f1c232" />
      </g>
    )
  }
  const s = kind === 'adult' ? 1 : kind === 'teen' ? 0.94 : 0.84
  return (
    <g transform={`scale(${s})`}>
      <g transform="translate(-7 0)">
        <path d="M-10 0 Q-9.4 9.5 0 9.5 Q9.4 9.5 10 0Z" fill="#f7f2e7" />
        <path d="M-9.2 3.4 Q0 6 9.2 3.4" fill="none" stroke="#3f6f8f" strokeWidth={1.3} />
        <ellipse cx={0} cy={0} rx={10} ry={2.6} fill="#ffffff" />
        <path d="M-7.6 0.4 Q-6 -6.8 0 -7.2 Q6 -6.8 7.6 0.4Z" fill="#ffffff" />
        <path d="M-3 -4.6 q2 -1.4 4 -0.6" fill="none" stroke="#efe9dc" strokeWidth={1} />
      </g>
      <g transform="translate(12 1.6)">
        <path d="M-8 0 Q-7.6 7.6 0 7.6 Q7.6 7.6 8 0Z" fill="#8c2f25" />
        <ellipse cx={0} cy={0} rx={8} ry={2.2} fill="#a8552c" />
        <ellipse cx={-1.6} cy={-0.2} rx={2.4} ry={0.8} fill="#6f9b4f" />
      </g>
      <path d="M-17 13.4 H17 M-16 15.6 H18" stroke="#7f4d25" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )
}

/** はじめの画面の「予約席」の札。 */
export function ReservedCard() {
  return (
    <g>
      <path d="M-31 0 L-28 -25 L28 -25 L31 0Z" fill="var(--paper)" stroke="#d9ceb8" strokeWidth={1} />
      <path d="M-28 -25 H28" stroke="var(--red)" strokeWidth={2} />
      <text className="vd-hand" x={0} y={-11.5} textAnchor="middle" fontSize={11} fill="var(--red-ink)">
        予約席
      </text>
      <text x={0} y={-3.6} textAnchor="middle" fontSize={6.4} fontWeight={700} fill="var(--ink-2)">
        ご家族さま
      </text>
    </g>
  )
}

/** 名物に立てる小さな旗（お子さまランチの旗のように）。 */
export function PrideFlag() {
  return (
    <g>
      <path d="M-27 1 V-46" stroke="#8a5a2e" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M-27 -46 H-8 L-10.5 -41.4 L-8 -36.8 H-27Z" fill="var(--red)" />
      <text x={-18.2} y={-39.2} textAnchor="middle" fontSize={6.2} fontWeight={700} fill="#fffdf7">
        名物
      </text>
    </g>
  )
}

/** 年齢の札（席札）。原点は下のまんなか。 */
export function PlaceCard({ text, active }: { text: string; active?: boolean }) {
  return (
    <g>
      <path d="M-15 0 L-13 -13 L13 -13 L15 0Z" fill="var(--paper)" stroke={active ? 'var(--red)' : '#d9ceb8'} strokeWidth={active ? 1.8 : 1} />
      <path d="M-13 -13 L13 -13" stroke={active ? 'var(--red)' : '#e9e0cd'} strokeWidth={1.6} />
      <text x={0} y={-3.4} textAnchor="middle" fontSize={8.4} fontWeight={700} fill="var(--ink)">
        {text}
      </text>
    </g>
  )
}

/* ───────── 名物（city.pride）を料理や小物で ───────── */

function Steam({ x = 0, y = -24 }: { x?: number; y?: number }) {
  return (
    <g fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" opacity={0.85}>
      <path className="vd-steam" d={`M${x - 6} ${y} q-3 -4 0 -7 q3 -3 0 -7`} />
      <path className="vd-steam" style={{ animationDelay: '-1.1s' }} d={`M${x + 4} ${y - 1} q-3 -4 0 -7 q3 -3 0 -7`} />
    </g>
  )
}

function Flyer() {
  return (
    <g transform="rotate(-5)">
      <rect x={-18} y={-27} width={36} height={27} rx={1.5} fill="#fffdf7" stroke="#d8cfbf" strokeWidth={0.8} />
      <rect x={-18} y={-27} width={36} height={8.5} fill="var(--red)" />
      <text x={0} y={-20.4} textAnchor="middle" fontSize={6.4} fontWeight={700} fill="#fffdf7">
        求人
      </text>
      <text x={0} y={-9} textAnchor="middle" fontSize={7.6} fontWeight={700} fill="var(--ink)">
        1.73倍
      </text>
      <path d="M-12 -4 H12" stroke="#cfc6b6" strokeWidth={1} />
      <rect x={-5.5} y={-30} width={11} height={4.4} rx={1} fill="#2a2730" />
    </g>
  )
}

function IronPot() {
  return (
    <g>
      <ellipse cx={0} cy={-1} rx={23} ry={2.6} fill="rgba(60,30,10,.16)" />
      <rect x={-26} y={-18} width={8} height={3.4} rx={1.7} fill="#2e2b2c" />
      <rect x={18} y={-18} width={8} height={3.4} rx={1.7} fill="#2e2b2c" />
      <path d="M-20 -18 Q-21 -1.5 0 -1 Q21 -1.5 20 -18Z" fill="#2e2b2c" />
      <path d="M-15 -12 q4 3 9 3" fill="none" stroke="#4b4647" strokeWidth={1.4} strokeLinecap="round" />
      <ellipse cx={0} cy={-18} rx={20.5} ry={4.4} fill="#3b3738" />
      <ellipse cx={0} cy={-18.3} rx={17.6} ry={3.3} fill="#b5562d" />
      <circle cx={-7} cy={-18.6} r={2.2} fill="#e8892f" />
      <circle cx={3} cy={-19.2} r={2.4} fill="#efd8a6" />
      <circle cx={9} cy={-18} r={1.8} fill="#6fa35a" />
      <circle cx={-1} cy={-17.4} r={1.6} fill="#e8892f" />
      <Steam y={-24} />
    </g>
  )
}

function Pop({ label }: { label: string }) {
  const [a, b] = splitPop(label)
  return (
    <g>
      <path d="M-24 0 L-21.5 -31 L21.5 -31 L24 0Z" fill="#fffdf7" stroke="#e0d6c3" strokeWidth={0.9} />
      <rect x={-21.5} y={-31} width={43} height={6} fill="var(--red)" />
      <text className="vd-hand" x={0} y={b ? -15.5 : -11} textAnchor="middle" fontSize={7.6} fill="var(--ink)">
        {a}
      </text>
      {b && (
        <text className="vd-hand" x={0} y={-6} textAnchor="middle" fontSize={7.6} fill="var(--red-ink)">
          {b}
        </text>
      )}
    </g>
  )
}

function Senbei() {
  return (
    <g>
      <ellipse cx={0} cy={-3} rx={23} ry={5} fill="#f7f2e7" stroke="#3f6f8f" strokeWidth={1.1} />
      <ellipse cx={0} cy={-3.4} rx={17} ry={3.2} fill="#ece4d3" />
      <g stroke="#8f5a26" strokeWidth={0.9}>
        <circle cx={-8.5} cy={-11} r={8.2} fill="#c98b4a" />
        <circle cx={8.5} cy={-11} r={8.2} fill="#b97a3c" />
        <circle cx={0} cy={-16} r={8.6} fill="#d49a55" />
      </g>
      <rect x={-3.2} y={-24.6} width={6.4} height={17.2} fill="#1f2a24" rx={0.6} />
      <g fill="#9a6230">
        <circle cx={-11} cy={-12} r={0.9} />
        <circle cx={-6} cy={-8} r={0.8} />
        <circle cx={10} cy={-13} r={0.9} />
        <circle cx={6} cy={-8.5} r={0.8} />
        <circle cx={4.6} cy={-19} r={0.8} />
      </g>
    </g>
  )
}

function PhotoFrame({ scene }: { scene: 'factory' | 'volcano' }) {
  const id = `vd-ph-${scene}`
  return (
    <g>
      <path d="M8 0 L4 -10" stroke="#6b4423" strokeWidth={2} />
      <rect x={-19} y={-33} width={38} height={32} rx={1.6} fill="#8a5a2e" />
      <rect x={-15.5} y={-29.5} width={31} height={25} fill={scene === 'factory' ? '#1f2a44' : '#bfe3f2'} />
      <clipPath id={id}>
        <rect x={-15.5} y={-29.5} width={31} height={25} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        {scene === 'factory' ? (
          <g>
            <circle cx={9} cy={-24} r={2.6} fill="#ffe7a3" />
            <circle cx={10.3} cy={-25} r={2.3} fill="#1f2a44" />
            <path d="M-16 -4 V-13 H-11 V-21 H-9 V-13 H-4 V-17 L1 -13 V-19 H3 V-11 H8 V-15 H12 V-9 H16 V-4Z" fill="#0f1526" />
            <g fill="#ffd36a">
              <circle cx={-13} cy={-10} r={0.8} />
              <circle cx={-10} cy={-17} r={0.7} />
              <circle cx={-6} cy={-11} r={0.8} />
              <circle cx={2} cy={-16} r={0.7} />
              <circle cx={5} cy={-9} r={0.8} />
              <circle cx={10} cy={-12} r={0.8} />
              <circle cx={14} cy={-7} r={0.7} />
            </g>
            <path d="M-16 -4 H16" stroke="#3d5a8a" strokeWidth={1.4} />
          </g>
        ) : (
          <g>
            <rect x={-16} y={-11} width={32} height={7} fill="#4f8fb8" />
            <path d="M-12 -10 L-4 -20 L-1 -18.4 L2 -20.4 L12 -10Z" fill="#6e5c55" />
            <path d="M-4 -20 L-1 -18.4 L2 -20.4 L1 -16 L-2 -15.6Z" fill="#8a776d" />
            <g fill="#f4f1ec">
              <circle cx={-1} cy={-23} r={2.4} />
              <circle cx={2.4} cy={-25.6} r={2.8} />
              <circle cx={6.4} cy={-27} r={2.2} />
            </g>
            <path d="M-14 -7 q3 -1.2 6 0 M2 -6 q3 -1.2 6 0" fill="none" stroke="#d6ecf6" strokeWidth={0.8} />
          </g>
        )}
      </g>
    </g>
  )
}

function Rocket() {
  return (
    <g>
      <rect x={-10} y={-4.5} width={20} height={4.5} rx={1.2} fill="#7f4d25" />
      <rect x={-1.2} y={-10} width={2.4} height={6} fill="#5c5761" />
      <path d="M-6.5 -16 L-12 -7.5 L-6.5 -9.5Z M6.5 -16 L12 -7.5 L6.5 -9.5Z" fill="var(--red)" />
      <path d="M0 -44 C7.6 -35 7.4 -20 6.5 -9.5 L-6.5 -9.5 C-7.4 -20 -7.6 -35 0 -44Z" fill="#f4f1ea" stroke="#d6cfc2" strokeWidth={0.8} />
      <path d="M0 -44 C4.4 -39.6 5.8 -36.4 6.1 -33 L-6.1 -33 C-5.8 -36.4 -4.4 -39.6 0 -44Z" fill="var(--red)" />
      <circle cx={0} cy={-24} r={3.3} fill="#4e8fa8" stroke="#2a2730" strokeWidth={0.8} />
      <path d="M-1 -25.4 a1.4 1.4 0 0 1 1.8 -0.6" fill="none" stroke="#d6ecf6" strokeWidth={0.7} />
      <g fill="#f1c232">
        <path d="M-16 -36 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1Z" />
        <path d="M15 -28 l.8 1.6 1.6 .8 -1.6 .8 -.8 1.6 -.8 -1.6 -1.6 -.8 1.6 -.8Z" />
      </g>
    </g>
  )
}

function Takoyaki() {
  const balls: [number, number][] = [
    [-14, -9],
    [-3, -9.6],
    [8, -9.2],
    [-8.6, -14.6],
    [2.6, -15],
    [13.6, -13.4],
  ]
  return (
    <g>
      <path d="M-25 -6.5 L25 -6.5 L21 0 L-21 0Z" fill="#e6c48f" />
      <path d="M-25 -6.5 L25 -6.5" stroke="#c9a36a" strokeWidth={1.2} />
      {balls.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5.6} fill="#c47a3a" />
          <path d={`M${x - 4.6} ${y - 1} q2 -4.6 6 -3.6 q3.6 1.2 2.4 4.6 q-3.6 -1 -8.4 -1Z`} fill="#5a2e1e" />
        </g>
      ))}
      <path d="M-16 -13 l4 2 4 -3 4 3 4 -3 4 3 4 -3 4 2" fill="none" stroke="#fff3d6" strokeWidth={1.1} strokeLinecap="round" />
      <g fill="#4f8a3c">
        <circle cx={-12} cy={-12} r={0.7} />
        <circle cx={-2} cy={-17} r={0.7} />
        <circle cx={5} cy={-11.6} r={0.7} />
        <circle cx={11} cy={-16} r={0.7} />
        <circle cx={-6} cy={-8} r={0.7} />
      </g>
      <path d="M17 -15 L23 -27" stroke="#e8d3a8" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )
}

function VeggieBasket() {
  return (
    <g>
      <path d="M-15 -15 Q-14 -27 -4 -26 Q-2 -19 -6 -15Z" fill="#6fa35a" />
      <ellipse cx={-6} cy={-20} rx={4.6} ry={9} transform="rotate(-24 -6 -20)" fill="#f2c232" />
      <g fill="#d9a21b">
        <circle cx={-7.2} cy={-23} r={0.8} />
        <circle cx={-5.2} cy={-20} r={0.8} />
        <circle cx={-7} cy={-18} r={0.8} />
        <circle cx={-4.8} cy={-24.4} r={0.8} />
      </g>
      <ellipse cx={5} cy={-16.5} rx={6.4} ry={4.6} fill="#d9b47c" />
      <ellipse cx={13} cy={-17} rx={5.2} ry={4} fill="#cfa76c" />
      <path d="M11 -20 L18 -31 L19.6 -19.6Z" fill="#e8892f" />
      <path d="M18 -31 q-2 -4 1 -6 M18.4 -31 q2 -4 5 -3" fill="none" stroke="#6fa35a" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M-21 -15 L21 -15 L16.5 0 L-16.5 0Z" fill="#b07a3e" />
      <path d="M-19.6 -10 H19.6 M-18.2 -5 H18.2" stroke="#8e5d2b" strokeWidth={1.1} />
      <path d="M-12 -15 V0 M-4 -15 V0 M4 -15 V0 M12 -15 V0" stroke="#8e5d2b" strokeWidth={0.8} opacity={0.6} />
    </g>
  )
}

/* ごちそう（得するほど増える。どの街でも同じ家庭の料理） */

function Karaage() {
  const pieces: [number, number, number][] = [
    [-11, -9, 6.4],
    [0, -10.5, 7],
    [11, -9, 6.2],
    [-5.4, -15, 6],
    [6, -15.6, 6.2],
  ]
  return (
    <g>
      <ellipse cx={0} cy={-3.4} rx={25} ry={5.6} fill="#fffdf7" stroke="#e0d6c3" strokeWidth={0.9} />
      <path d="M-20 -6 q4 -8 10 -4 q4 -7 10 -2 q6 -6 9 2 q4 -2 7 3Z" fill="#8cc06a" />
      {pieces.map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x - r} ${y} q0 ${-r} ${r} ${-r * 0.9} q${r} 0 ${r * 0.95} ${r * 0.8} q-.4 ${r * 0.9} ${-r} ${r * 0.9} q${-r * 0.9} 0 ${-r * 0.95} ${-r * 0.8}Z`} fill={i % 2 ? '#c27b2c' : '#cf8a35'} />
          <path d={`M${x - r * 0.4} ${y - r * 0.5} q${r * 0.3} -2 ${r * 0.7} -1`} fill="none" stroke="#e8b062" strokeWidth={1.1} strokeLinecap="round" />
        </g>
      ))}
      <path d="M15 -10 L23 -6 L16 -4Z" fill="#f3d34a" />
      <Steam x={0} y={-24} />
    </g>
  )
}

function Cake() {
  return (
    <g>
      <rect x={-1.6} y={-6} width={3.2} height={6} fill="#d6cfc2" />
      <ellipse cx={0} cy={-6} rx={18} ry={3.4} fill="#efe8da" />
      <path d="M-14 -7 V-22 Q-14 -25 -10 -25 H10 Q14 -25 14 -22 V-7Z" fill="#fff8ee" />
      <path d="M-14 -14 H14" stroke="#f2d8a7" strokeWidth={2.2} />
      <path d="M-14 -22 q3.5 3 7 0 q3.5 3 7 0 q3.5 3 7 0 q3.5 3 7 0" fill="#fff8ee" stroke="#f3e6cf" strokeWidth={0.8} />
      {[-8, 0, 8].map((x) => (
        <g key={x}>
          <path d={`M${x} -24.5 q-3.8 -.4 -3.4 -4 q.4 -2.6 3.4 -2.6 q3 0 3.4 2.6 q.4 3.6 -3.4 4Z`} fill="#d93a3a" />
          <path d={`M${x - 1.8} -31 l1.8 1.4 1.8 -1.4`} fill="none" stroke="#6fa35a" strokeWidth={1.1} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function Juice() {
  return (
    <g>
      <path d="M-6 0 V-20 Q-6 -24 -3 -26 V-32 H3 V-26 Q6 -24 6 -20 V0Z" fill="#e9f2ef" stroke="#c9d8d3" strokeWidth={0.8} />
      <path d="M-6 0 V-15 H6 V0Z" fill="#f2a33a" />
      <rect x={-3.4} y={-35} width={6.8} height={3.6} rx={1} fill="var(--red)" />
      <rect x={-5} y={-12} width={10} height={6} fill="#fffdf7" opacity={0.85} />
      <rect x={9} y={-12} width={8} height={12} rx={1.4} fill="#e9f2ef" stroke="#c9d8d3" strokeWidth={0.8} />
      <rect x={9.6} y={-8} width={6.8} height={7.4} fill="#f2a33a" />
    </g>
  )
}

export type DishKey = 'karaage' | 'cake' | 'juice'
export function Feast({ k }: { k: DishKey }) {
  if (k === 'karaage') return <Karaage />
  if (k === 'cake') return <Cake />
  return <Juice />
}

/** 名物をどの絵で出すか。ラベルで決め、なければ種類で決める。 */
export function PrideArt({ pride }: { pride: Pride }): ReactNode {
  const l = pride.label
  if (l.includes('求人')) return <Flyer />
  if (l.includes('鋳物')) return <IronPot />
  if (l.includes('せんべい')) return <Senbei />
  if (l.includes('工場')) return <PhotoFrame scene="factory" />
  if (l.includes('宇宙')) return <Rocket />
  if (l.includes('粉もん')) return <Takoyaki />
  if (l.includes('農業')) return <VeggieBasket />
  if (l.includes('桜島')) return <PhotoFrame scene="volcano" />
  if (pride.kind === 'life' || pride.kind === 'job') return <Pop label={l} />
  if (pride.kind === 'food') return <Karaage />
  if (pride.kind === 'craft') return <IronPot />
  return <Pop label={l} />
}

/* ───────── 貯金箱（家族の財布）。悲しむのは、この子だけ ───────── */

export function Piggy({ mood }: { mood: Mood }) {
  const sad = mood < 0
  const happy = mood > 0
  const squash = mood === -2 ? 0.86 : mood === -1 ? 0.93 : 1
  return (
    <g>
      <ellipse cx={0} cy={-0.8} rx={21} ry={2.6} fill="rgba(60,30,10,.16)" />
      <g className={mood === 2 ? 'vd-pig-hop' : sad ? 'vd-pig-sigh' : 'vd-pig-idle'}>
        <g transform={`scale(1 ${squash})`}>
          {[-14, -6, 4, 11].map((x) => (
            <rect key={x} x={x} y={-9} width={5} height={8.4} rx={1.6} fill="#e79c93" />
          ))}
          <path d="M20 -22 q6 -2.6 5 2 q-1 3.4 -4.6 .4" fill="none" stroke="#e79c93" strokeWidth={1.7} strokeLinecap="round" />
          <path d={sad ? 'M-3 -32 L1 -37 L5 -32Z' : 'M-4 -32 L0 -41 L4.6 -33Z'} fill="#e8978e" />
          <ellipse cx={0} cy={-19} rx={21.5} ry={15} fill="#f6bbb2" />
          <ellipse cx={2} cy={-13} rx={14.5} ry={6.6} fill="#f9cdc5" opacity={0.7} />
          <path d={sad ? 'M-14 -29.6 L-21.4 -33.6 L-9 -32.6Z' : 'M-14.4 -30 L-11.6 -40 L-5.4 -32.6Z'} fill="#efa49b" />
          <rect x={3.6} y={-34.6} width={11} height={2.8} rx={1.4} fill="#8c4b45" />
          <ellipse cx={-21} cy={-18} rx={4.2} ry={5.6} fill="#ee9f96" />
          <ellipse cx={-22.2} cy={-20} rx={0.95} ry={1.2} fill="#b8645c" />
          <ellipse cx={-22.2} cy={-16} rx={0.95} ry={1.2} fill="#b8645c" />
          <ellipse cx={-13} cy={-15.4} rx={2.8} ry={1.7} fill="#f08e86" opacity={0.6} />
          {happy ? (
            <path d="M-14 -22 Q-11.4 -25.6 -8.8 -22" fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" />
          ) : sad ? (
            <g>
              <circle cx={-11.2} cy={-21.4} r={1.6} fill="var(--ink)" />
              <path d="M-14.6 -27.2 L-8.4 -25.6" stroke="var(--ink)" strokeWidth={1.3} strokeLinecap="round" />
            </g>
          ) : (
            <circle className="vd-blink" cx={-11.2} cy={-22.4} r={1.75} fill="var(--ink)" />
          )}
          <path
            d={happy ? 'M-17.6 -11.4 Q-15 -8.4 -12.2 -11.2' : sad ? 'M-17 -10.6 Q-14.8 -12.6 -12.6 -10.6' : 'M-17 -11.2 Q-14.8 -10 -12.6 -11.2'}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <rect x={1} y={-25} width={15} height={9.4} rx={1.6} fill="#fffdf7" opacity={0.95} />
          <text x={8.5} y={-17.8} textAnchor="middle" fontSize={6.4} fontWeight={700} fill="var(--ink)">
            家計
          </text>
        </g>
        {happy && (
          <g>
            {(mood === 2 ? [0, 1, 2] : [0]).map((i) => (
              <g key={i} className="vd-coin" style={{ animationDelay: `${i * 0.45}s` }}>
                <circle cx={9 + (i - 1) * 1.2} cy={-40} r={4.2} fill="#f1c232" stroke="#d29b14" strokeWidth={1} />
                <path d={`M${9 + (i - 1) * 1.2} -42.4 v4.8`} stroke="#d29b14" strokeWidth={0.9} />
              </g>
            ))}
          </g>
        )}
      </g>
      {mood === 2 && (
        <g fill="#f1c232">
          <path d="M-26 -38 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4Z" />
          <path d="M26 -44 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1Z" />
        </g>
      )}
      {mood === -1 && <path d="M-4 -44 q-2.8 3.8 0 5.8 q2.8 -2 0 -5.8Z" fill="#9ccbea" />}
      {mood === -2 && (
        <g>
          <path className="vd-drop" d="M-11 -18 q-1.8 2.6 0 3.8 q1.8 -1.2 0 -3.8Z" fill="#9ccbea" />
          <g className="vd-cloud">
            <ellipse cx={-3} cy={-50} rx={9.5} ry={4.6} fill="#cfcad2" />
            <ellipse cx={4.4} cy={-52.6} rx={6.4} ry={4.4} fill="#cfcad2" />
            <ellipse cx={-9} cy={-51.6} rx={5} ry={3.6} fill="#cfcad2" />
          </g>
          <path className="vd-drop" d="M-4 -45 v3.4" stroke="#9ccbea" strokeWidth={1.4} strokeLinecap="round" />
          <path className="vd-drop" style={{ animationDelay: '-.8s' }} d="M3 -46 v3.4" stroke="#9ccbea" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

/** ほかの候補の行に添える、ちいさな貯金箱の顔。 */
export function PiggyFace({ mood, size = 30 }: { mood: Mood; size?: number }) {
  return (
    <svg viewBox="-30 -52 60 56" width={size} height={size * (56 / 60)} aria-hidden="true">
      <Piggy mood={mood} />
    </svg>
  )
}

/* ───────── 入力で使う小さな絵（24×24） ───────── */

export function WorkIcon({ id }: { id: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden="true">
      {id === 'commute' && (
        <g {...p}>
          <rect x={3} y={8} width={18} height={12} rx={2} />
          <path d="M9 8 V6 Q9 5 10 5 H14 Q15 5 15 6 V8 M3 13 H21" />
        </g>
      )}
      {id === 'remote' && (
        <g {...p}>
          <rect x={5} y={5} width={14} height={10} rx={1.2} />
          <path d="M3 18 H21 L20 20 H4Z" />
        </g>
      )}
      {id === 'self' && (
        <g {...p}>
          <path d="M4 10 L5.4 5 H18.6 L20 10Z M8 5 L7.4 10 M12 5 V10 M16 5 L16.6 10" />
          <path d="M5.5 10 V20 H18.5 V10 M10 20 V14 H14 V20" />
        </g>
      )}
      {id === 'part' && (
        <g {...p}>
          <circle cx={12} cy={12.5} r={8} />
          <path d="M12 12.5 V8 M12 12.5 L15.5 14.5 M9 3 H15" />
        </g>
      )}
    </svg>
  )
}

export function CoinStack({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 26 26" width={26} height={26} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <ellipse cx={13} cy={22 - i * 3.6} rx={8} ry={2.6} fill="#e7b23a" stroke="#9c6b10" strokeWidth={1} />
        </g>
      ))}
    </svg>
  )
}

export function PeriodIcon({ len }: { len: 1 | 5 | 18 }) {
  const h = len === 1 ? 7 : len === 5 ? 12 : 18
  const zig = 'l-1.5 2 l-1.5 -2 '.repeat(4)
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden="true">
      <path d={`M6 2 H18 V${2 + h} ${zig}Z`} fill="#fffdf7" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      {Array.from({ length: Math.max(1, Math.floor(h / 4)) }, (_, i) => (
        <path key={i} d={`M8.5 ${5.4 + i * 4} H${i % 2 ? 13 : 15.5}`} stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      ))}
    </svg>
  )
}
