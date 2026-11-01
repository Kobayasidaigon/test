// 案B「ドット絵の旅」— 文字グリッドを SVG に描く小さな道具。
// 同じ色の横並びを1本の path にまとめ、shape-rendering="crispEdges" でにじませずに拡大する。
import type { CSSProperties } from 'react'
import type { FamilyInput } from '@/shared'
import { ITEMS, KID_SHIRTS, PAL, PERSON_PAL, PIGEON, personGrid, pigGrid, type Grid, type ItemKey, type Pal, type PigMood, type Pose, type Who } from './sprites'

type Paths = { w: number; h: number; paths: [string, string][] }
const cache = new WeakMap<Grid, Map<string, Paths>>()

export function toPaths(grid: Grid, pal: Pal): Paths {
  const palKey = Object.keys(pal).sort().map((k) => k + pal[k]).join('')
  let byPal = cache.get(grid)
  if (!byPal) cache.set(grid, (byPal = new Map()))
  const hit = byPal.get(palKey)
  if (hit) return hit
  const byColor = new Map<string, string>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.') { x++; continue }
      let n = 1
      while (x + n < row.length && row[x + n] === ch) n++
      const color = pal[ch] ?? PAL[ch] ?? '#ff00ff'
      byColor.set(color, (byColor.get(color) ?? '') + `M${x} ${y}h${n}v1h-${n}z`)
      x += n
    }
  })
  const out: Paths = { w: grid[0].length, h: grid.length, paths: [...byColor.entries()].map(([c, d]) => [d, c]) }
  byPal.set(palKey, out)
  return out
}

const NO_PAL: Pal = {}

/** HTML の中に置くドット絵（1枚の小さな svg） */
export function PixelArt({ grid, pal = NO_PAL, scale = 3, label, className, style }: {
  grid: Grid; pal?: Pal; scale?: number; label?: string; className?: string; style?: CSSProperties
}) {
  const p = toPaths(grid, pal)
  return (
    <svg width={p.w * scale} height={p.h * scale} viewBox={`0 0 ${p.w} ${p.h}`} shapeRendering="crispEdges"
      className={className} style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      {p.paths.map(([d, fill]) => <path key={fill} d={d} fill={fill} />)}
    </svg>
  )
}

/** svg の場面の中に置くドット絵 */
export function PixelG({ grid, pal = NO_PAL, x = 0, y = 0, className, style }: {
  grid: Grid; pal?: Pal; x?: number; y?: number; className?: string; style?: CSSProperties
}) {
  const p = toPaths(grid, pal)
  const paths = p.paths.map(([d, fill]) => <path key={fill} d={d} fill={fill} />)
  // CSS のアニメーション（transform）が translate を上書きしないよう、動きは内側の g に付ける
  return (
    <g transform={`translate(${x} ${y})`}>
      {className || style ? <g className={className} style={style}>{paths}</g> : paths}
    </g>
  )
}

export const item = (k: ItemKey) => ITEMS[k] as Grid
export const itemSize = (k: ItemKey) => ({ w: ITEMS[k][0].length, h: ITEMS[k].length })

const personCache = new Map<string, Grid>()
export function person(who: Who, pose: Pose): Grid {
  const key = `${who}-${pose}`
  if (!personCache.has(key)) personCache.set(key, personGrid(who, pose))
  return personCache.get(key)!
}
const pigCache = new Map<PigMood, Grid>()
export function pig(m: PigMood): Grid {
  if (!pigCache.has(m)) pigCache.set(m, pigGrid(m))
  return pigCache.get(m)!
}
export { PIGEON }

/* ───────── 家族の並び ───────── */
export type Member = { id: string; who: Who; pal: Pal; label: string; w: number; h: number }

export const whoOfAge = (age: number): Who => (age < 0 ? 'bundle' : age <= 2 ? 'toddler' : age <= 12 ? 'kid' : 'teen')
export const ageText = (age: number) => (age < 0 ? 'これから生まれる子' : `${age}歳の子`)

export function membersOf(input: FamilyInput): Member[] {
  const list: Member[] = []
  const add = (id: string, who: Who, pal: Pal, label: string) => {
    const g = person(who, 'stand')
    list.push({ id, who, pal, label, w: g[0].length, h: g.length })
  }
  add('a1', 'adultA', PERSON_PAL.adultA, '大人')
  if (input.adults === 2) add('a2', 'adultB', PERSON_PAL.adultB, '大人')
  input.children.forEach((c, i) => {
    const who = whoOfAge(c.age)
    const shirt = KID_SHIRTS[i % KID_SHIRTS.length]
    const pal = who === 'kid' ? { ...PERSON_PAL.kid, x: shirt } : who === 'toddler' ? { ...PERSON_PAL.toddler, x: i % 2 ? '#f4a3b5' : '#a8dcf0' } : PERSON_PAL[who]
    add(c.id, who, pal, ageText(c.age))
  })
  return list
}

/** 「1歳の子」「子ども2人」「中学生の子」などから、小さく添える絵を選ぶ */
export function whoSprite(who: string): { who: Who; pal: Pal } {
  const m = who.match(/(\d+)歳/)
  if (m) {
    const w = whoOfAge(Number(m[1]))
    return { who: w, pal: PERSON_PAL[w] }
  }
  if (who.includes('生まれる')) return { who: 'bundle', pal: {} }
  if (who.includes('中学') || who.includes('高校')) return { who: 'teen', pal: PERSON_PAL.teen }
  if (who.includes('子ども')) return { who: 'kid', pal: PERSON_PAL.kid }
  return { who: 'adultA', pal: PERSON_PAL.adultA }
}
