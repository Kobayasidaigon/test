// 案B「ドット絵の旅」— 場面（空・街並み・道・駅名標・改札・家族）。
// 座標は横130ドットの小さな画面で考え、svg をそのまま拡大して使う。
import { memo, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { City, Region } from '@/shared'
import { cn } from '@/lib/utils'
import { PixelG, item, itemSize, person, pig, type Member } from './pixel'
import type { ItemKey, PigMood } from './sprites'

export const SW = 130
const K = '#2a1e17'

type RP = { x: number; y: number; w: number; h: number; f: string; className?: string }
const R = ({ x, y, w, h, f, className }: RP) => <rect x={x} y={y} width={w} height={h} fill={f} className={className} />

/* ───────── 外枠 ───────── */
export function Scene({ h, label, children, overlay, className }: { h: number; label: string; children: ReactNode; overlay?: ReactNode; className?: string }) {
  return (
    <div className={cn('vb-scene', className)}>
      <svg viewBox={`0 0 ${SW} ${h}`} shapeRendering="crispEdges" role="img" aria-label={label} focusable="false">
        {children}
      </svg>
      {overlay}
    </div>
  )
}

/* ───────── 空と雲 ───────── */
export type Tone = 'day' | 'dusk'
const SKY: Record<Tone, string[]> = {
  day: ['#86cbe8', '#94d2ec', '#a4d9ef', '#b6e1f2', '#c9e9f4'],
  dusk: ['#1d2847', '#243358', '#2d3f68', '#45597f', '#d98b55'],
}
export const Sky = memo(function Sky({ base, tone = 'day', sun = true }: { base: number; tone?: Tone; sun?: boolean }) {
  const bands = SKY[tone]
  const bh = Math.ceil(base / bands.length)
  return (
    <g>
      {bands.map((c, i) => <R key={c} x={0} y={i * bh} w={SW} h={i === bands.length - 1 ? base - i * bh + 2 : bh} f={c} />)}
      {tone === 'day' && sun && (
        <g className="vb-sun">
          {[[2, 4], [1, 6], [0, 8], [0, 8], [0, 8], [0, 8], [1, 6], [2, 4]].map(([sx, len], i) => (
            <R key={i} x={110 + sx} y={6 + i} w={len} h={1} f={i < 2 ? '#fff1a8' : '#ffd84d'} />
          ))}
        </g>
      )}
      {tone === 'dusk' && [[12, 6], [30, 14], [52, 4], [76, 10], [98, 5], [120, 12], [64, 18]].map(([x, y]) => <R key={`${x}-${y}`} x={x} y={y} w={1} h={1} f="#fff7c9" />)}
    </g>
  )
})

function Cloud({ x, y, cls }: { x: number; y: number; cls: string }) {
  const rows: [number, number][] = [[3, 5], [1, 10], [0, 14], [1, 12]]
  return (
    <g className={cls}>
      {rows.map(([sx, len], i) => <R key={i} x={x + sx} y={y + i} w={len} h={1} f={i === rows.length - 1 ? '#d9eef6' : '#fffdf6'} />)}
    </g>
  )
}
export const Clouds = memo(function Clouds({ tone = 'day' }: { tone?: Tone }) {
  if (tone === 'dusk') return null
  return (
    <g>
      <Cloud x={8} y={9} cls="vb-drift vb-drift--1" />
      <Cloud x={58} y={4} cls="vb-drift vb-drift--2" />
      <Cloud x={84} y={18} cls="vb-drift vb-drift--3" />
    </g>
  )
})

/* ───────── 遠くの山・丘 ───────── */
function Hills({ base, color = '#9ccaa5', amp = 6, off = 0, seed = 1 }: { base: number; color?: string; amp?: number; off?: number; seed?: number }) {
  const cols: ReactNode[] = []
  for (let x = 0; x < SW; x += 2) {
    const hgt = Math.max(1, Math.round(off + amp * 1.6 + amp * Math.sin((x + seed * 13) / 15) + (amp / 2) * Math.sin((x + seed * 7) / 6)))
    cols.push(<R key={x} x={x} y={base - hgt} w={2} h={hgt} f={color} />)
  }
  return <g>{cols}</g>
}
function Mountain({ cx, base, h, color, snow }: { cx: number; base: number; h: number; color: string; snow?: string }) {
  const rows: ReactNode[] = []
  for (let i = 0; i < h; i++) {
    const half = Math.round(i * 1.6) + 1
    rows.push(<R key={i} x={cx - half} y={base - h + i} w={half * 2} h={1} f={snow && i < h * 0.28 ? snow : color} />)
  }
  return <g>{rows}</g>
}

/* ───────── 建物の部品 ───────── */
function Bldg({ x, base, w, h, body, edge = K, win, winOff }: { x: number; base: number; w: number; h: number; body: string; edge?: string; win?: string; winOff?: string }) {
  const y = base - h
  const out: ReactNode[] = [<R key="e" x={x} y={y} w={w} h={h} f={edge} />, <R key="b" x={x + 1} y={y + 1} w={w - 2} h={h - 1} f={body} />]
  if (win) {
    let r = 0
    for (let wy = y + 3; wy <= base - 5; wy += 4, r++) {
      let c = 0
      for (let wx = x + 2; wx + 2 <= x + w - 2; wx += 4, c++) out.push(<R key={`w${r}-${c}`} x={wx} y={wy} w={2} h={2} f={winOff && (r * 3 + c) % 4 === 1 ? winOff : win} />)
    }
  }
  return <g>{out}</g>
}
function House({ x, base, w = 14, wall, roof }: { x: number; base: number; w?: number; wall: string; roof: string }) {
  const wallH = 8
  const out: ReactNode[] = [<R key="o" x={x} y={base - wallH} w={w} h={wallH} f={K} />, <R key="w" x={x + 1} y={base - wallH + 1} w={w - 2} h={wallH - 1} f={wall} />]
  for (let i = 0; ; i++) {
    const rw = w + 2 - 2 * i
    if (rw < 2) break
    out.push(<R key={`r${i}`} x={x - 1 + i} y={base - wallH - 1 - i} w={rw} h={1} f={i === 0 ? K : roof} />)
  }
  out.push(<R key="d" x={x + w - 5} y={base - 5} w={3} h={5} f="#5e3b22" />, <R key="g" x={x + 2} y={base - 6} w={3} h={3} f="#a8dcf0" />)
  return <g>{out}</g>
}
function Tree({ x, base, c1 = '#4f9a45', hi = '#86c766' }: { x: number; base: number; c1?: string; hi?: string }) {
  const rows: [number, number][] = [[2, 4], [1, 6], [0, 8], [0, 8], [1, 6]]
  return (
    <g>
      <R x={x + 3} y={base - 4} w={2} h={4} f="#7a4a2a" />
      {rows.map(([sx, len], i) => <R key={i} x={x + sx} y={base - 9 + i} w={len} h={1} f={c1} />)}
      <R x={x + 2} y={base - 8} w={2} h={1} f={hi} />
    </g>
  )
}
function Puffs({ x, y, color = '#eef2f4' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <g className="vb-puff vb-puff--1"><R x={x} y={y} w={3} h={2} f={color} /></g>
      <g className="vb-puff vb-puff--2"><R x={x + 1} y={y - 4} w={4} h={3} f={color} /></g>
      <g className="vb-puff vb-puff--3"><R x={x + 2} y={y - 9} w={3} h={2} f={color} /></g>
    </g>
  )
}

/* ───────── 街ごとの並び（名物を小物として入れる） ───────── */
const seedOf = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0)

function TokyoTown({ base, id }: { base: number; id: string }) {
  const s = seedOf(id)
  const cols = ['#c9d4dd', '#e6dcc4', '#a9bccd', '#d8c9a8', '#b7c4cf', '#e9e2cf']
  const spec = [[0, 12, 26], [13, 11, 20], [25, 15, 38], [41, 12, 25], [54, 18, 44], [73, 10, 22], [84, 14, 32], [99, 12, 24], [112, 18, 36]]
  return (
    <g>
      <Hills base={base - 10} color="#b3d8c2" amp={4} seed={s % 5} />
      {spec.map(([x, w, h], i) => (
        <Bldg key={i} x={x} base={base} w={w} h={h + ((s + i * 7) % 9) - 4} body={cols[(i + s) % cols.length]} edge="#6f7f8c" win="#f6f1d8" winOff="#8fb2cc" />
      ))}
    </g>
  )
}
function Cupola({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <R x={x} y={base - 34} w={7} h={34} f={K} />
      <R x={x + 1} y={base - 33} w={5} h={33} f="#a8492f" />
      <R x={x - 1} y={base - 22} w={9} h={8} f={K} />
      <R x={x} y={base - 21} w={7} h={6} f="#8a3a26" />
      <R x={x - 1} y={base - 36} w={9} h={3} f={K} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <R key={i} x={x + 1 + (i % 2) * 3} y={base - 31 + i * 4} w={2} h={1} f="#c4644a" />)}
      <Puffs x={x + 1} y={base - 39} />
    </g>
  )
}
function KawaguchiTown({ base }: { base: number }) {
  return (
    <g>
      <Hills base={base - 8} color="#a9d3b0" amp={4} seed={2} />
      <House x={2} base={base} w={14} wall="#f1e4bf" roof="#6b4a3a" />
      <Bldg x={19} base={base} w={22} h={22} body="#e6dcc4" edge="#8a7a62" win="#a8dcf0" />
      <Bldg x={44} base={base} w={26} h={12} body="#9aa3ab" edge="#5d6670" win="#ffcc33" />
      <Cupola x={56} base={base - 12} />
      <House x={76} base={base} w={14} wall="#fbf3dc" roof="#3a6fb0" />
      <Bldg x={94} base={base} w={16} h={28} body="#d9c7a6" edge="#8a7a62" win="#a8dcf0" />
      <Tree x={114} base={base} />
    </g>
  )
}
function SenbeiShop({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <R x={x} y={base - 14} w={30} h={14} f={K} />
      <R x={x + 1} y={base - 13} w={28} h={13} f="#b07a46" />
      {[0, 1, 2].map((i) => <R key={i} x={x - 2 + i} y={base - 16 - i} w={34 - i * 2} h={1} f={i === 0 ? K : '#3d3a4a'} />)}
      <R x={x + 1} y={base - 18} w={28} h={1} f="#3d3a4a" />
      <R x={x + 3} y={base - 12} w={24} h={6} f="#2f4f8f" />
      {[0, 1, 2, 3, 4].map((i) => <R key={i} x={x + 5 + i * 5} y={base - 12} w={1} h={6} f="#274b7d" />)}
      <R x={x + 4} y={base - 5} w={22} h={5} f="#7a4a2a" />
      <PixelG grid={item('senbei')} x={x + 9} y={base - 32} className="vb-bob" />
    </g>
  )
}
function SokaTown({ base }: { base: number }) {
  return (
    <g>
      <Hills base={base - 8} color="#a9d3b0" amp={5} seed={3} />
      <House x={1} base={base} w={14} wall="#f1e4bf" roof="#7a4a2a" />
      <Tree x={17} base={base} />
      <SenbeiShop x={30} base={base} />
      <House x={66} base={base} w={14} wall="#fbf3dc" roof="#3a6fb0" />
      <Bldg x={84} base={base} w={18} h={24} body="#e6dcc4" edge="#8a7a62" win="#a8dcf0" />
      <Tree x={104} base={base} c1="#3f8a3a" />
      <House x={114} base={base} w={14} wall="#f1e4bf" roof="#9e2f22" />
    </g>
  )
}
function FactoryBlock({ x, base, w, h }: { x: number; base: number; w: number; h: number }) {
  return (
    <g>
      <Bldg x={x} base={base} w={w} h={h} body="#505a66" edge="#1a2233" win="#ffcc33" winOff="#3a4452" />
      {Array.from({ length: Math.floor(w / 6) }, (_, i) => (
        <g key={i}>
          <R x={x + i * 6} y={base - h - 3} w={1} h={3} f="#1a2233" />
          <R x={x + i * 6 + 1} y={base - h - 2} w={2} h={2} f="#505a66" />
          <R x={x + i * 6 + 3} y={base - h - 1} w={2} h={1} f="#505a66" />
        </g>
      ))}
    </g>
  )
}
function Chimney({ x, base, h }: { x: number; base: number; h: number }) {
  return (
    <g>
      <R x={x} y={base - h} w={4} h={h} f="#1a2233" />
      {Array.from({ length: Math.floor(h / 4) }, (_, i) => <R key={i} x={x + 1} y={base - h + 1 + i * 4} w={2} h={2} f={i % 2 ? '#e9e2cf' : '#d9452f'} />)}
      <R x={x + 1} y={base - h - 1} w={2} h={1} f="#ffcc33" className="vb-blink" />
      <Puffs x={x} y={base - h - 4} color="#8792a3" />
    </g>
  )
}
function KawasakiTown({ base }: { base: number }) {
  return (
    <g>
      <R x={0} y={base - 6} w={SW} h={6} f="#1a2233" />
      <FactoryBlock x={2} base={base} w={30} h={16} />
      <Chimney x={20} base={base - 16} h={22} />
      <R x={36} y={base - 18} w={14} h={18} f="#1a2233" />
      <R x={37} y={base - 17} w={12} h={17} f="#6b7480" />
      <R x={37} y={base - 12} w={12} h={1} f="#ffcc33" />
      <R x={37} y={base - 6} w={12} h={1} f="#ffcc33" />
      <FactoryBlock x={54} base={base} w={36} h={20} />
      <Chimney x={76} base={base - 20} h={26} />
      <R x={92} y={base - 10} w={36} h={2} f="#8792a3" />
      <R x={92} y={base - 4} w={36} h={2} f="#8792a3" />
      <FactoryBlock x={96} base={base} w={24} h={14} />
      <Chimney x={114} base={base - 14} h={18} />
    </g>
  )
}
function SagamiharaTown({ base }: { base: number }) {
  return (
    <g>
      <Mountain cx={30} base={base - 4} h={26} color="#7fae9a" />
      <Mountain cx={58} base={base - 4} h={20} color="#8cbba6" />
      <Hills base={base - 4} color="#a9d3b0" amp={3} seed={4} />
      <House x={2} base={base} w={14} wall="#fbf3dc" roof="#2f8f86" />
      <Tree x={18} base={base} />
      <Bldg x={28} base={base} w={20} h={18} body="#e6dcc4" edge="#8a7a62" win="#a8dcf0" />
      <g>
        <R x={60} y={base - 4} w={20} h={4} f="#6b7177" />
        <R x={61} y={base - 3} w={18} h={2} f="#a7adb3" />
        <g transform={`translate(60 ${base - 32}) scale(2)`}><PixelG grid={item('rocket')} /></g>
      </g>
      <House x={86} base={base} w={14} wall="#f1e4bf" roof="#3a6fb0" />
      <Tree x={102} base={base} c1="#3f8a3a" />
      <House x={112} base={base} w={14} wall="#fbf3dc" roof="#9e2f22" />
    </g>
  )
}
function Stall({ x, base }: { x: number; base: number }) {
  return (
    <g>
      {Array.from({ length: 13 }, (_, i) => <R key={i} x={x + i * 2} y={base - 22} w={2} h={4} f={i % 2 ? '#fffdf6' : '#d9452f'} />)}
      <R x={x} y={base - 23} w={26} h={1} f={K} />
      <R x={x + 1} y={base - 18} w={1} h={18} f={K} />
      <R x={x + 24} y={base - 18} w={1} h={18} f={K} />
      <R x={x} y={base - 8} w={26} h={8} f={K} />
      <R x={x + 1} y={base - 7} w={24} h={7} f="#c98a4b" />
      <PixelG grid={item('takoyaki')} x={x + 5} y={base - 15} />
      <g className="vb-sway"><R x={x + 27} y={base - 20} w={4} h={6} f="#d9452f" /><R x={x + 28} y={base - 21} w={2} h={1} f={K} /></g>
    </g>
  )
}
function OsakaTown({ base }: { base: number }) {
  const cols = ['#e6dcc4', '#c9d4dd', '#d8c9a8', '#b7c4cf', '#e9e2cf']
  return (
    <g>
      {[[0, 14, 30], [15, 12, 40], [28, 14, 24], [92, 12, 34], [105, 10, 26], [116, 14, 42]].map(([x, w, h], i) => (
        <Bldg key={i} x={x} base={base} w={w} h={h} body={cols[i % cols.length]} edge="#6f7f8c" win="#f6f1d8" winOff="#8fb2cc" />
      ))}
      <Bldg x={46} base={base} w={14} h={18} body="#f1e4bf" edge="#8a7a62" win="#a8dcf0" />
      <Stall x={60} base={base} />
    </g>
  )
}
function SapporoTown({ base }: { base: number }) {
  return (
    <g>
      <Mountain cx={26} base={base - 6} h={24} color="#7f9fb3" snow="#fffdf6" />
      <Mountain cx={54} base={base - 6} h={18} color="#8fb0c2" snow="#fffdf6" />
      <Mountain cx={110} base={base - 6} h={20} color="#7f9fb3" snow="#fffdf6" />
      <R x={0} y={base - 8} w={SW} h={8} f="#8ec36a" />
      {[0, 1, 2, 3].map((i) => <R key={i} x={0} y={base - 7 + i * 2} w={SW} h={1} f={i % 2 ? '#d9c25a' : '#5aa04a'} />)}
      <g>
        <R x={10} y={base - 18} w={22} h={18} f={K} />
        <R x={11} y={base - 17} w={20} h={17} f="#c2412d" />
        {[0, 1, 2, 3].map((i) => <R key={i} x={9 + i} y={base - 19 - i} w={24 - i * 2} h={1} f={i === 0 ? K : '#7a2a1e'} />)}
        <R x={16} y={base - 10} w={10} h={10} f="#fffdf6" />
        <R x={17} y={base - 9} w={8} h={9} f="#c2412d" />
        <R x={20} y={base - 9} w={2} h={9} f="#fffdf6" />
      </g>
      <g>
        <R x={34} y={base - 26} w={9} h={26} f={K} />
        <R x={35} y={base - 25} w={7} h={25} f="#e9e2cf" />
        <R x={35} y={base - 28} w={7} h={3} f="#a7adb3" />
      </g>
      <g transform={`translate(52 ${base - 24}) scale(2)`}><PixelG grid={item('corn')} className="vb-bob" /></g>
      <House x={84} base={base} w={14} wall="#fbf3dc" roof="#2b3a67" />
      <Tree x={102} base={base} c1="#2f6b3a" />
      <House x={113} base={base} w={14} wall="#f1e4bf" roof="#2f8f86" />
    </g>
  )
}
function KagoshimaTown({ base }: { base: number }) {
  const v: ReactNode[] = []
  for (let i = 0; i < 26; i++) {
    const half = 4 + Math.round(i * 1.9)
    v.push(<R key={i} x={66 - half} y={base - 40 + i} w={half * 2} h={1} f={i < 9 ? '#8a6a52' : i < 15 ? '#6f7a52' : '#4f8a4a'} />)
  }
  return (
    <g>
      {v}
      <R x={62} y={base - 41} w={8} h={1} f="#5e4a3a" />
      <g className="vb-puff vb-puff--1"><R x={62} y={base - 46} w={6} h={3} f="#e4e7ea" /></g>
      <g className="vb-puff vb-puff--2"><R x={64} y={base - 52} w={8} h={4} f="#eef1f3" /></g>
      <g className="vb-puff vb-puff--3"><R x={60} y={base - 58} w={7} h={3} f="#f4f6f7" /></g>
      <R x={0} y={base - 14} w={SW} h={14} f="#3f8fc4" />
      {[0, 1, 2].map((i) => <R key={i} x={0} y={base - 12 + i * 4} w={SW} h={1} f="#5fb0d6" />)}
      {[[14, 3], [40, 7], [88, 5], [110, 9]].map(([x, y]) => <R key={x} x={x} y={base - 14 + y} w={3} h={1} f="#fffdf6" className="vb-blink" />)}
      <g>
        <R x={8} y={base - 20} w={2} h={20} f="#7a4a2a" />
        <R x={3} y={base - 22} w={12} h={2} f="#3f8a3a" />
        <R x={1} y={base - 20} w={4} h={2} f="#3f8a3a" />
        <R x={13} y={base - 20} w={4} h={2} f="#3f8a3a" />
      </g>
      <Bldg x={100} base={base} w={14} h={20} body="#e6dcc4" edge="#8a7a62" win="#a8dcf0" />
      <Bldg x={115} base={base} w={14} h={14} body="#fbf3dc" edge="#8a7a62" win="#a8dcf0" />
    </g>
  )
}

export const toneOf = (city: City): Tone => (city.id === 'kawasaki' ? 'dusk' : 'day')

export const Town = memo(function Town({ city, base }: { city: City; base: number }) {
  switch (city.id) {
    case 'kawaguchi': return <KawaguchiTown base={base} />
    case 'soka': return <SokaTown base={base} />
    case 'kawasaki': return <KawasakiTown base={base} />
    case 'sagamihara': return <SagamiharaTown base={base} />
    case 'osaka': return <OsakaTown base={base} />
    case 'sapporo': return <SapporoTown base={base} />
    case 'kagoshima': return <KagoshimaTown base={base} />
    default: return <TokyoTown base={base} id={city.id} />
  }
})

/* ───────── 地面と道 ───────── */
export const Ground = memo(function Ground({ base, h, tone = 'day', roll = false }: { base: number; h: number; tone?: Tone; roll?: boolean }) {
  const grass = tone === 'dusk' ? '#2f5a3a' : '#6bb34f'
  const road = tone === 'dusk' ? '#8a7356' : '#d8b27a'
  const pebbles: ReactNode[] = []
  for (let i = 0; i < 26; i++) pebbles.push(<R key={i} x={(i * 37 + 11) % SW} y={base + 6 + ((i * 13) % (h - base - 8))} w={i % 3 ? 1 : 2} h={1} f={tone === 'dusk' ? '#6f5c44' : '#b88a52'} />)
  return (
    <g>
      <R x={0} y={base} w={SW} h={4} f={grass} />
      <R x={0} y={base} w={SW} h={1} f={tone === 'dusk' ? '#3f6e48' : '#8fcf6a'} />
      {Array.from({ length: 16 }, (_, i) => <R key={i} x={i * 8 + 3} y={base - 1} w={1} h={1} f={grass} />)}
      <R x={0} y={base + 4} w={SW} h={h - base - 4} f={road} />
      <R x={0} y={base + 4} w={SW} h={1} f={tone === 'dusk' ? '#6f5c44' : '#c49a5e'} />
      {pebbles}
      {roll && (
        <g className="vb-roll">
          {Array.from({ length: 18 }, (_, i) => <R key={i} x={i * 8} y={base + 12} w={4} h={1} f="#c49a5e" />)}
        </g>
      )}
    </g>
  )
})

/* ───────── 駅名標（今の街から候補の街へ） ───────── */
export const REGION_COLOR: Record<Region, string> = {
  tokyo23: '#3f8a3a', saitama: '#d97a2b', kanagawa: '#3a6fb0', chiba: '#c9a227', osaka: '#d9452f', chiho: '#2f8f86',
}
export function StationSign({ x, base, city, prev }: { x: number; base: number; city: City; prev?: string }) {
  const w = 44, h = 24, y = base - 34
  const bar = REGION_COLOR[city.region]
  return (
    <g>
      <R x={x + 6} y={y + h} w={2} h={base - y - h} f="#6b7177" />
      <R x={x + w - 8} y={y + h} w={2} h={base - y - h} f="#6b7177" />
      <R x={x} y={y} w={w} h={h} f={K} />
      <R x={x + 1} y={y + 1} w={w - 2} h={h - 2} f="#fffdf6" />
      <text x={x + w / 2} y={y + 10.5} fontSize={city.name.length >= 4 ? 7.5 : 8.5} textAnchor="middle" fill={K} className="vb-svgtext">{city.name}</text>
      <text x={x + w / 2} y={y + 15.5} fontSize={4} textAnchor="middle" fill="#5b4636" className="vb-svgtext">{city.pref}</text>
      <R x={x + 1} y={y + h - 7} w={w - 2} h={6} f={bar} />
      {prev && (
        <g>
          <R x={x + 3} y={y + h - 5} w={1} h={3} f="#fffdf6" />
          <R x={x + 2} y={y + h - 4} w={1} h={1} f="#fffdf6" />
          <text x={x + 6} y={y + h - 2.3} fontSize={4} fill="#fffdf6" className="vb-svgtext">{prev}</text>
        </g>
      )}
    </g>
  )
}

/* ───────── 名物の台 ───────── */
export function ItemStand({ k, x, base }: { k: ItemKey; x: number; base: number }) {
  const { w, h } = itemSize(k)
  return (
    <g>
      <R x={x} y={base - 6} w={w + 6} h={6} f={K} />
      <R x={x + 1} y={base - 5} w={w + 4} h={5} f="#c98a4b" />
      <R x={x + 1} y={base - 5} w={w + 4} h={1} f="#e0ad6e" />
      <PixelG grid={item(k)} x={x + 3} y={base - 7 - h} className="vb-bob" />
      <g className="vb-twinkle"><PixelG grid={item('sparkle')} x={x + w + 2} y={base - 11 - h} /></g>
    </g>
  )
}

/* ───────── 改札と券売機 ───────── */
export function Gate({ x, base, open = false, glow = false }: { x: number; base: number; open?: boolean; glow?: boolean }) {
  return (
    <g>
      {glow && <g className="vb-glow"><R x={x + 5} y={base - 40} w={12} h={40} f="#fff1a8" /><R x={x + 8} y={base - 40} w={6} h={40} f="#fffdf6" /></g>}
      {[x, x + 17].map((px, i) => (
        <g key={i}>
          <R x={px} y={base - 16} w={5} h={16} f={K} />
          <R x={px + 1} y={base - 15} w={3} h={15} f="#c9d4dd" />
          <R x={px + 1} y={base - 15} w={3} h={2} f="#3a6fb0" />
          <R x={px + 2} y={base - 12} w={1} h={1} f={open ? '#6bb34f' : '#ffcc33'} />
        </g>
      ))}
      <g style={{ opacity: open ? 0 : 1 }}>
        <R x={x + 5} y={base - 9} w={5} h={3} f="#ffcc33" />
        <R x={x + 12} y={base - 9} w={5} h={3} f="#ffcc33" />
        <R x={x + 5} y={base - 9} w={5} h={1} f={K} />
        <R x={x + 12} y={base - 9} w={5} h={1} f={K} />
      </g>
    </g>
  )
}
export function TicketMachine({ x, base, blink = true }: { x: number; base: number; blink?: boolean }) {
  return (
    <g>
      <R x={x} y={base - 30} w={22} h={30} f={K} />
      <R x={x + 1} y={base - 29} w={20} h={29} f="#fbf3dc" />
      <R x={x + 1} y={base - 29} w={20} h={6} f="#d9452f" />
      <text x={x + 11} y={base - 24.6} fontSize={4.4} textAnchor="middle" fill="#fffdf6" className="vb-svgtext">きっぷ</text>
      <R x={x + 3} y={base - 21} w={16} h={7} f={K} />
      <R x={x + 4} y={base - 20} w={14} h={5} f="#a8dcf0" />
      {blink && <R x={x + 5} y={base - 19} w={2} h={3} f="#2a1e17" className="vb-blink" />}
      {[0, 1, 2].map((i) => <R key={i} x={x + 3 + i * 6} y={base - 12} w={4} h={3} f="#ffcc33" />)}
      <R x={x + 7} y={base - 6} w={8} h={2} f={K} />
    </g>
  )
}

/* ───────── 家族の並び（貯金箱つき） ───────── */
export type PartyState = 'walk' | 'stand' | 'cheer'

function Walker({ m, x, base, state, delay, entering }: { m: Member; x: number; base: number; state: PartyState; delay: number; entering: boolean }) {
  const reduce = useReducedMotion()
  const y = base - m.h
  const walking = state === 'walk' && !reduce
  const jump = state === 'cheer' && !reduce
  return (
    <motion.g
      initial={entering && !reduce ? { x: -70 } : false}
      animate={{ x: 0 }}
      transition={{ duration: 1.0, ease: 'linear', delay: delay * 0.06 }}
    >
      <motion.g
        animate={jump ? { y: [0, -7, 0, 0] } : { y: 0 }}
        transition={jump ? { duration: 0.9, times: [0, 0.3, 0.6, 1], repeat: Infinity, repeatDelay: 0.5, delay: 0.1 + delay * 0.12, ease: 'easeOut' } : { duration: 0.2 }}
      >
        {walking ? (
          <g className="vb-walk">
            <PixelG grid={person(m.who, 'a')} pal={m.pal} x={x} y={y} className="vb-f-a" />
            <PixelG grid={person(m.who, 'b')} pal={m.pal} x={x} y={y} className="vb-f-b" />
          </g>
        ) : (
          <PixelG grid={person(m.who, state === 'cheer' ? 'cheer' : 'stand')} pal={m.pal} x={x} y={y} className={state === 'stand' ? 'vb-idle' : undefined} style={{ animationDelay: `${delay * 0.17}s` }} />
        )}
      </motion.g>
    </motion.g>
  )
}

export function PigBank({ x, base, mood, entering = false, coins = 0 }: { x: number; base: number; mood: PigMood; entering?: boolean; coins?: number }) {
  const reduce = useReducedMotion()
  const g = pig(mood)
  const y = base - g.length
  return (
    <motion.g initial={entering && !reduce ? { x: -70 } : false} animate={{ x: 0 }} transition={{ duration: 1.0, ease: 'linear', delay: 0.3 }}>
      <g className={mood === 'sad' ? 'vb-droop' : mood === 'happy' ? 'vb-hop' : undefined}>
        <PixelG grid={g} x={x} y={y} />
        {mood === 'sad' && <g className="vb-sweat"><PixelG grid={item('sweat')} x={x + 17} y={y - 4} /></g>}
      </g>
      {mood === 'happy' && [0, 1, 2].map((i) => (
        <g key={i} className={`vb-coinpop vb-coinpop--${i + 1}`}><PixelG grid={item('coin')} x={x + 2 + i * 5} y={y - 10} /></g>
      ))}
      {coins > 0 && Array.from({ length: coins }, (_, i) => <PixelG key={i} grid={item('coin')} x={x + 5} y={y - 9 - i * 3} />)}
    </motion.g>
  )
}

/** 家族を左から並べる。入りきらないときは、小さい子を前の列に出して2列にする */
export function layoutParty(members: Member[], x0: number, maxW: number, pigW = 18) {
  const row = (list: Member[], start: number, room: number) => {
    const natural = list.reduce((a, m) => a + m.w - 2, 0)
    const squeeze = natural > room ? (natural - room) / Math.max(1, list.length - 1) : 0
    let x = start
    return list.map((m) => {
      const at = x
      x += m.w - 2 - squeeze
      return { id: m.id, x: Math.round(at), end: Math.round(at + m.w) }
    })
  }
  const natural = members.reduce((a, m) => a + m.w - 2, 0) + pigW + 2
  if (natural <= maxW + 4) {
    const r = row(members, x0, maxW)
    const end = r.length ? r[r.length - 1].end : x0
    return { xs: r.map((p) => p.x), dys: members.map(() => 0), pigX: end }
  }
  const back = members.filter((m) => m.who === 'adultA' || m.who === 'adultB' || m.who === 'teen')
  const front = members.filter((m) => !back.includes(m))
  const room = maxW - pigW - 2
  const rb = row(back, x0, room)
  const rf = row(front, x0 + 7, room - 7)
  const pos = new Map([...rb, ...rf].map((p) => [p.id, p]))
  const end = Math.max(...[...rb, ...rf].map((p) => p.end), x0)
  return { xs: members.map((m) => pos.get(m.id)!.x), dys: members.map((m) => (front.includes(m) ? 3 : -3)), pigX: Math.min(end, x0 + maxW - pigW) }
}

export function Party({ members, x0, base, maxW, state, pigMood, entering = false, coins = 0 }: {
  members: Member[]; x0: number; base: number; maxW: number; state: PartyState; pigMood: PigMood; entering?: boolean; coins?: number
}) {
  const { xs, dys, pigX } = layoutParty(members, x0, maxW)
  // 後ろの列から描く（前の列の子が手前に来る）
  const order = members.map((m, i) => i).sort((a, b) => dys[a] - dys[b])
  return (
    <g>
      {order.map((i) => (
        <Walker key={members[i].id} m={members[i]} x={xs[i]} base={base + dys[i]} state={state} delay={i} entering={entering} />
      ))}
      <PigBank x={pigX} base={base} mood={pigMood} entering={entering} coins={coins} />
    </g>
  )
}
