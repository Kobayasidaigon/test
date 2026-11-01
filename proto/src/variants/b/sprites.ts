// 案B「ドット絵の旅」— ドット絵の元データ。
// すべてこの案のために手で打った文字グリッド（1文字＝1ドット、'.' は透明）。
// 左右対称の絵は左半分だけを書き、mirror() で右半分を作る。
// 色は PAL の文字に対応。キャラクターごとに h（髪）x（服）z（ズボン）などを差し替える。

export type Grid = readonly string[]
export type Pal = Record<string, string>

export const PAL: Pal = {
  k: '#2a1e17', // 輪郭
  s: '#f7c9a0', // はだ
  S: '#d99872', // くち（閉じ）
  q: '#f2938a', // ほっぺ
  m: '#b8463a', // くち（開き）
  w: '#fffdf6',
  c: '#fbf3dc',
  C: '#e3cf9c',
  y: '#ffcc33',
  Y: '#d99a1e',
  r: '#d9452f',
  R: '#9e2f22',
  b: '#3a6fb0',
  B: '#274b7d',
  v: '#2b3a67',
  g: '#6bb34f',
  G: '#3f8a3a',
  t: '#2f8f86',
  T: '#1f645e',
  p: '#f4a3b5',
  P: '#d9748b',
  n: '#9a6338',
  N: '#5e3b22',
  e: '#a7adb3',
  E: '#6b7177',
  o: '#f08a3a',
  O: '#c4622a',
  l: '#a8dcf0',
  L: '#5fb0d6',
  j: '#22301f', // のり
  u: '#d39552', // せんべい
  U: '#a8682f',
  h: '#3b2a20', // 髪（差し替え用）
  x: '#d9452f', // 服（差し替え用）
  X: '#9e2f22',
  z: '#2b3a67', // ズボン（差し替え用）
}

const mirror = (half: string[]): Grid => half.map((r) => r + [...r].reverse().join(''))
const mirrorOdd = (half: string[]): Grid => half.map((r) => r + [...r.slice(0, -1)].reverse().join(''))

// ドットを書き換えたグリッドを返す（表情づくりに使う）
export function patch(grid: Grid, dots: [number, number, string][]): Grid {
  const rows = grid.map((r) => r.split(''))
  for (const [x, y, ch] of dots) if (rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = ch
  return rows.map((r) => r.join(''))
}

/* ───────── 家族 ───────── */

// 大人（短い髪）18×19
const HEAD_SHORT = mirror([
  '......kkk',
  '.....khhh',
  '....khhhh',
  '....khhhh',
  '....khssh',
  '....kssss',
  '....kskss',
  '....kqssm',
  '.....ksss',
  '......kkk',
])
// 大人（ボブ）
const HEAD_BOB = mirror([
  '......kkk',
  '.....khhh',
  '....khhhh',
  '...khhhhh',
  '...khhsss',
  '...khssss',
  '...khskss',
  '...khqssm',
  '...khhsss',
  '....khkkk',
])
const BODY_ADULT = mirror(['.....kxxx', '....kxxxx', '....kxxxx', '....ksxxx', '....kkzzz'])
const LEGS_ADULT = {
  stand: mirror(['.....kzzz', '.....kzzk', '.....kzk.', '.....kkk.']),
  a: mirror(['.....kzzz', '....kzzk.', '....kzk..', '....kkk..']),
  b: mirror(['.....kzzz', '......kzz', '......kzk', '......kkk']),
}
// ばんざい（頭の上半分はそのまま、5行目から下を差し替え）
const CHEER_SHORT = mirror([
  '..kkkssss',
  '..kskskss',
  '..kxkqssm',
  '...kxksss',
  '....kxkkk',
  '.....kxxx',
  '.....kxxx',
  '.....kxxx',
  '.....kxxx',
  '.....kzzz',
])
const CHEER_BOB = mirror([
  '.kkkhssss',
  '.kskhskss',
  '.kxkhqssm',
  '.kxkhhsss',
  '..kxkhkkk',
  '...kxkxxx',
  '....kxxxx',
  '.....kxxx',
  '.....kxxx',
  '.....kzzz',
])

// 中高生 18×18（前髪だけ左右ちがう）
const HEAD_TEEN = patch(HEAD_SHORT, [
  [5, 4, 'h'], [6, 4, 'h'], [7, 4, 'h'], [8, 4, 'h'], [9, 4, 'h'], [10, 4, 's'], [11, 4, 's'], [12, 4, 's'],
])
const BODY_TEEN = mirror(['.....kwwb', '....kwwwb', '....kswwb', '....kkzzz'])

// 小学生くらい 14×15
const HEAD_KID = mirror(['....kkk', '...khhh', '..khhhh', '..khssh', '..kssss', '..kskss', '..kqssm', '...ksss', '....kkk'])
const BODY_KID = mirror(['....kxx', '...kxxx', '...ksxx', '...kkzz'])
const LEGS_KID = {
  stand: mirror(['....ksk', '....kkk']),
  a: mirror(['...ksk.', '...kkk.']),
  b: mirror(['.....ks', '.....kk']),
}
const CHEER_KID = mirror(['kkkssss', 'kskskss', 'kxkqssm', '.kxksss', '..kxkkk', '....kxx', '....kxx', '....kxx', '....kzz'])

// 0〜2歳 12×13
const TODDLER_TOP = mirror([
  '.....k',
  '....kh',
  '..kkhs',
  '.kssss',
  '.kssss',
  '.kskss',
  '.kqssm',
  '..ksss',
  '...kkk',
  '..kxxx',
  '..ksxx',
  '..kkxx',
])
const LEGS_TODDLER = { stand: mirror(['...kk.']), a: mirror(['..kk..']), b: mirror(['....kk']) }

// これから生まれる子（おくるみ）12×10
const BUNDLE = mirror(['....kk', '...kpp', '..kpss', '..kpks', '..kpqs', '.kccpp', '.kcccc', '.kcccc', '..kccc', '...kkk'])

export type Pose = 'stand' | 'a' | 'b' | 'cheer'
export type Who = 'adultA' | 'adultB' | 'teen' | 'kid' | 'toddler' | 'bundle'

const join = (...parts: Grid[]): Grid => parts.flatMap((p) => [...p])
const closeMouth = (g: Grid): Grid => g.map((r) => r.replace(/m/g, 'S'))

export function personGrid(who: Who, pose: Pose): Grid {
  switch (who) {
    case 'adultA':
      return pose === 'cheer' ? join(HEAD_SHORT.slice(0, 5), CHEER_SHORT, LEGS_ADULT.stand) : closeMouth(join(HEAD_SHORT, BODY_ADULT, LEGS_ADULT[pose]))
    case 'adultB':
      return pose === 'cheer' ? join(HEAD_BOB.slice(0, 5), CHEER_BOB, LEGS_ADULT.stand) : closeMouth(join(HEAD_BOB, BODY_ADULT, LEGS_ADULT[pose]))
    case 'teen':
      return pose === 'cheer' ? join(HEAD_TEEN, BODY_TEEN, LEGS_ADULT.stand) : closeMouth(join(HEAD_TEEN, BODY_TEEN, LEGS_ADULT[pose]))
    case 'kid':
      return pose === 'cheer' ? join(HEAD_KID.slice(0, 4), CHEER_KID, LEGS_KID.stand) : closeMouth(join(HEAD_KID, BODY_KID, LEGS_KID[pose]))
    case 'toddler':
      return pose === 'cheer' ? join(TODDLER_TOP, LEGS_TODDLER.stand) : join(TODDLER_TOP, LEGS_TODDLER[pose])
    case 'bundle':
      return BUNDLE
  }
}

export const PERSON_PAL: Record<Who, Pal> = {
  adultA: { h: '#3b2a20', x: '#d9452f', X: '#9e2f22', z: '#2b3a67' },
  adultB: { h: '#8a5230', x: '#2f8f86', X: '#1f645e', z: '#5e3b22' },
  teen: { h: '#2a2320', z: '#2b3a67' },
  kid: { h: '#5e3b22', x: '#ffcc33', X: '#d99a1e', z: '#3a6fb0' },
  toddler: { h: '#9a6338', x: '#a8dcf0', X: '#5fb0d6' },
  bundle: {},
}
// 子どもが何人もいるときに、服の色を少しずつ変える
export const KID_SHIRTS = ['#ffcc33', '#f4a3b5', '#6bb34f', '#f08a3a', '#a8dcf0']

/* ───────── 貯金箱（家族の財布）18×14 ───────── */
const PIG_BASE = mirror([
  '..kkk....',
  '..kPpkkkk',
  '.kpppppkk',
  'kpppppppp',
  'kpppppppp',
  'kpqpppPPP',
  'kpppppPkP',
  'kpppppPPP',
  'kpppppppp',
  'kpppppppp',
  'kpppppppp',
  '.kppppppp',
  '..kPPkkkk',
  '..kkkk...',
])
export type PigMood = 'happy' | 'plain' | 'sad'
export function pigGrid(mood: PigMood): Grid {
  if (mood === 'happy')
    return patch(PIG_BASE, [
      [3, 4, 'k'], [4, 3, 'k'], [5, 4, 'k'],
      [12, 4, 'k'], [13, 3, 'k'], [14, 4, 'k'],
      [7, 8, 'k'], [8, 8, 'm'], [9, 8, 'm'], [10, 8, 'k'], [8, 9, 'k'], [9, 9, 'k'],
    ])
  if (mood === 'sad')
    return patch(PIG_BASE, [
      [4, 4, 'k'], [5, 3, 'k'],
      [13, 4, 'k'], [12, 3, 'k'],
      [8, 8, 'k'], [9, 8, 'k'], [7, 9, 'k'], [10, 9, 'k'],
    ])
  return patch(PIG_BASE, [[4, 4, 'k'], [13, 4, 'k'], [8, 9, 'k'], [9, 9, 'k']])
}

/* ───────── ハト駅長（案内役）16×16・右向き ───────── */
export const PIGEON: Grid = [
  '................',
  '.....kkkkkk.....',
  '....kvvvvvvk....',
  '....kvvyyvvk....',
  '....kkkkkkkkkk..',
  '....keeeeeeek...',
  '...keeeeeokek...',
  '...keeeeeeeewEk.',
  '...keeeeeeeekk..',
  '..keetgteeeek...',
  '..keettgEeeeek..',
  '.keeeeEEeeeeeek.',
  '.keeeeeEEeeeeek.',
  '..keeeeeEEEEek..',
  '...kkkkkkkkkk...',
  '.....ko..ok.....',
]

/* ───────── 小物 ───────── */
export const ITEMS = {
  // 草加せんべい
  senbei: [
    '....kkkk....',
    '..kkuuuukk..',
    '.kuuUuuuuuk.',
    '.kuuuuuuUuk.',
    'kuuUuuuuuuuk',
    'kjjjjjjjjjjk',
    'kjjjjjjjjjjk',
    'kuuuuuUuuuuk',
    '.kuuuuuuuuk.',
    '.kuUuuuuuuk.',
    '..kkuuuukk..',
    '....kkkk....',
  ],
  // 鋳物の鍋
  pot: patch(mirror(['......k', '.....kE', '..kkkkk', '.kEEEEE', 'kkkkkkk', 'kEeEEEE', 'kEeEEEE', '.kEEEEE', '..kEEEE', '...kkkk', '...kk..']), [[11, 5, 'E'], [11, 6, 'E']]),
  // 求人（かばん）
  briefcase: mirror(['....kk', '....k.', '.kkkkk', 'knnnnn', 'knnnnn', 'kNNNNy', 'knnnnn', 'knnnnn', '.kkkkk']),
  // 工場
  factory: [
    '..kk.....kk...',
    '..kEk....kEk..',
    '..kEk....kEk..',
    '.kkkkkkkkkkkk.',
    '.kEEEEEEEEEEk.',
    '.kEyEyEyEyEEk.',
    '.kEEEEEEEEEEk.',
    '.kEyEyEyEyEEk.',
    '.kEEEEEkkEEEk.',
    '.kEEEEEkkEEEk.',
    'kkkkkkkkkkkkkk',
  ],
  // 宇宙のまち（ロケット）
  rocket: mirror(['....k', '...kw', '...kw', '..kww', '..kwl', '..kwl', '..kww', '..kww', '.krww', 'krrww', 'krkkk', 'kk.ko', '...ky', '....k']),
  // 粉もん（たこ焼き）
  takoyaki: [
    '.kkk..kkk..kkk.',
    'knNnkknNnkknNnk',
    'knwNkkNgnkknNwk',
    'kngnkknwnkkgnnk',
    'kkkkkkkkkkkkkkk',
    'kCCCCCCCCCCCCCk',
    '.kCCCCCCCCCCCk.',
    '..kkkkkkkkkkk..',
  ],
  // 水（下水道代）
  drop: ['...kk...', '...kk...', '..kllk..', '..kllk..', '.kllllk.', '.klwllk.', 'kllwlllk', 'kllllllk', 'klllllLk', '.kllLLk.', '..kkkk..'],
  // とうもろこし（北海道の農業）
  corn: [
    '...k..k...',
    '..kGkkGk..',
    '..kGyyGk..',
    '.kGyYyyGk.',
    '.kGyyYyGk.',
    '.kGyYyyGk.',
    '.kGyyYyGk.',
    '.kgGyyYGk.',
    '.kggGyGgk.',
    '..kggGgk..',
    '...kggk...',
    '....kk....',
  ],
  // 桜島
  volcano: [
    '.......eee........',
    '......eeeee.......',
    '.......eee........',
    '........kk........',
    '.......knnk.......',
    '......knNnnk......',
    '.....knnnnNnk.....',
    '....kGnnNnnnGk....',
    '...kGGgnnnnGGgk...',
    '..kGgGGGgGGGgGGk..',
    '.kGGGgGGGGgGGGGGk.',
    'kkkkkkkkkkkkkkkkkk',
  ],
  // 保育園
  nursery: [
    '.....kk.....',
    '....kRRk....',
    '...kRrrRk...',
    '..kRrrrrRk..',
    '.kRrrrrrrRk.',
    'kkkkkkkkkkkk',
    '.kcccccccck.',
    '.kcbbcckcck.',
    '.kcbbckrkck.',
    '.kcccckgkck.',
    '.kccccckcck.',
    'kkkkkkkkkkkk',
  ],
  // 現金の給付（封筒とお金）
  envelope: [
    '....kkkkkk....',
    '..kkyyyyyykk..',
    '.kyyYYyyYYyyk.',
    'kkkkkkkkkkkkkk',
    'kcckcccccckcck',
    'kccckcccckccck',
    'kcccckkkkcccck',
    'kcccccccccccck',
    'kcccccccccccck',
    'kkkkkkkkkkkkkk',
  ],
  // 給食
  lunch: [
    '..........kk..',
    '.........kwwk.',
    '..kkkkk..kbbk.',
    '.kwwwwwk.kwwk.',
    '.kccccck.kbbk.',
    '..kcccck.kwwk.',
    'kkkkkkkkkkkkkk',
    'kCCCCCCCCCCCCk',
    '.kkkkkkkkkkkk.',
  ],
  // 医療費（ばんそうこう）
  bandage: mirror(['...kkkk', '..kssss', '.ksskcc', 'ksssskc', 'ksssskc', '.ksskcc', '..kssss', '...kkkk']),
  // 移住（スーツケース）
  suitcase: mirror(['....kk', '....k.', '.kkkkk', 'krrrrr', 'krRrrr', 'krRryy', 'krRryy', 'krRrrr', 'krrrrr', '.kkkkk', '..k...']),
  coin: mirror(['..kk', '.kyy', 'kyyY', 'kyYy', 'kyYy', 'kyyY', '.kyy', '..kk']),
  // 一度きり（おくりもの）
  gift: mirror(['..kk..', '.kRrkk', '..kkrr', 'kkkkkr', 'kccccr', 'kkkkkr', '.kcccr', '.kcccr', '.kcccr', '.kkkkk']),
  // 確認中（工事中の柵）
  barrier: [
    '..kk......kk..',
    '..ko......ok..',
    'kkkkkkkkkkkkkk',
    'kyykkyykkyykkk',
    'kykkyykkyykkyk',
    'kkkkkkkkkkkkkk',
    '..kk......kk..',
    '..kk......kk..',
    '.kkkk....kkkk.',
  ],
  // 次の一歩（道しるべ）
  signpost: [
    '.....kk.....',
    '.kkkkkkkkkk.',
    '.kyyyyyyyyyk',
    '.kyyyyyyyyyk',
    '.kkkkkkkkkk.',
    '....kNNk....',
    'kkkkkkkkkk..',
    'kccccccccck.',
    'kccccccccck.',
    '.kkkkkkkkkk.',
    '....kNNk....',
    '....kNNk....',
    '...kkkkkk...',
  ],
  heart: mirrorOdd(['.kk.', 'krrk', 'krrr', '.krr', '..kr', '...k']),
  sparkle: mirrorOdd(['..y', '..y', 'yyw', '..y', '..y']),
  sweat: ['.k..', 'klk.', 'kllk', 'kllk', '.kk.'],
  note: ['..kkk', '..kyk', '..k..', 'kkk..', 'kkk..'],
  // 働き方
  train: [
    '.kkkkkkkkkkkkkk.',
    'kggggggggggggggk',
    'kgllgllgllgllggk',
    'kgllgllgllgllggk',
    'kggggggggggggggk',
    'kyyyyyyyyyyyyyyk',
    'kggggggggggggggk',
    '.kkkkkkkkkkkkkk.',
    '..kEk......kEk..',
  ],
  laptop: [
    '..kkkkkkkkkk..',
    '..kEEEEEEEEk..',
    '..kElllllLEk..',
    '..kElllllLEk..',
    '..kElllLLLEk..',
    '..kEEEEEEEEk..',
    'kkkkkkkkkkkkkk',
    'keeeeeeeeeeeek',
    '.kkkkkkkkkkkk.',
  ],
  tools: mirror(['......k', '.....kE', '....kEk', 'kkkkkkk', 'krrrrrr', 'krrrrky', 'kRRRRkk', 'krrrrrr', 'kkkkkkk']),
  clock: ['..kkkkkk..', '.kwwwwwwk.', 'kwwwkwwwwk', 'kwwwkwwwwk', 'kwwwkkkwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', '.kwwwwwwk.', '..kkkkkk..'],
} satisfies Record<string, Grid>

export type ItemKey = keyof typeof ITEMS

// 開発用: すべての絵の行の幅がそろっているか
export function checkGrids(): string[] {
  const bad: string[] = []
  const all: Record<string, Grid> = { ...ITEMS, PIGEON, BUNDLE }
  for (const who of ['adultA', 'adultB', 'teen', 'kid', 'toddler', 'bundle'] as Who[])
    for (const pose of ['stand', 'a', 'b', 'cheer'] as Pose[]) all[`${who}-${pose}`] = personGrid(who, pose)
  for (const m of ['happy', 'plain', 'sad'] as PigMood[]) all[`pig-${m}`] = pigGrid(m)
  for (const [k, g] of Object.entries(all)) {
    const w = g[0].length
    g.forEach((r, i) => r.length !== w && bad.push(`${k} row ${i}: ${r.length} != ${w}`))
  }
  return bad
}
