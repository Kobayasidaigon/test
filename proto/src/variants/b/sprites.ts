// 案B「ドット絵の旅」— ドット絵の元データ。
// すべてこの案のために手で打った文字グリッド（1文字＝1ドット、'.' は透明）。
// 色は PAL の文字に対応。キャラクターごとに h（髪）x（服）z（ズボン）などを差し替える。

export type Grid = readonly string[]
export type Pal = Record<string, string>

export const COLOR = {
  ink: '#2a1e17',
  ink2: '#5b4636',
  paper: '#fbf3dc',
  paper2: '#f1e4bf',
  paper3: '#e3cf9c',
  white: '#fffdf6',
  gold: '#ffcc33',
  gold2: '#d99a1e',
  red: '#d9452f',
  red2: '#9e2f22',
  green: '#6bb34f',
  green2: '#3f8a3a',
  deepGreen: '#2c6b35',
  blue: '#3a6fb0',
  blue2: '#274b7d',
  calm: '#2f5f9e',
  teal: '#2f8f86',
  sky: '#9fd9ef',
  night: '#23304f',
  pink: '#f4a3b5',
} as const

export const PAL: Pal = {
  k: '#2a1e17', // 輪郭
  s: '#f7c9a0', // はだ
  S: '#e2a77c',
  q: '#f2938a', // ほっぺ
  m: '#b8463a', // くち
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
  u: '#c98a4b', // せんべい
  U: '#a8682f',
  h: '#3b2a20', // 髪（差し替え用）
  x: '#d9452f', // 服（差し替え用）
  X: '#9e2f22',
  z: '#2b3a67', // ズボン（差し替え用）
}

// 1ドットだけ書き換えたグリッドを返す（表情づくりに使う）
export function patch(grid: Grid, dots: [number, number, string][]): Grid {
  const rows = grid.map((r) => r.split(''))
  for (const [x, y, ch] of dots) if (rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = ch
  return rows.map((r) => r.join(''))
}

/* ───────── 家族 ───────── */

// 大人（短い髪）18×19
const HEAD_SHORT: Grid = [
  '......kkkkkk......',
  '.....khhhhhhk.....',
  '....khhhhhhhhk....',
  '....khhhhhhhhk....',
  '....khsshhsshk....',
  '....kssssssssk....',
  '....kskssssksk....',
  '....kqssssssqk....',
  '.....kssmmssk.....',
  '......kkkkkk......',
]
// 大人（ボブ）18×19
const HEAD_BOB: Grid = [
  '......kkkkkk......',
  '.....khhhhhhk.....',
  '....khhhhhhhhk....',
  '...khhhhhhhhhhk...',
  '...khhsssssshhk...',
  '...khsssssssshk...',
  '...khsksssskshk...',
  '...khqssssssqhk...',
  '...khhssmmsshhk...',
  '....khkkkkkkhk....',
]
const BODY_ADULT: Grid = [
  '.....kxxxxxxk.....',
  '....kxxxxxxxxk....',
  '....kxxxxxxxxk....',
  '....ksxxxxxxsk....',
  '....kkzzzzzzkk....',
]
const LEGS_ADULT = {
  stand: ['.....kzzzzzzk.....', '.....kzzkkzzk.....', '.....kzk..kzk.....', '.....kkk..kkk.....'],
  a: ['.....kzzzzzzk.....', '....kzzk..kzzk....', '....kzk....kzk....', '....kkk....kkk....'],
  b: ['.....kzzzzzzk.....', '......kzzzzk......', '......kzkkzk......', '......kkkkkk......'],
} as const

const CHEER_SHORT: Grid = [
  '..kkkssssssssskk..',
  '..kskskssssksksk..',
  '..kxkqssssssqkxk..',
  '...kxkssmmsskxk...',
  '....kxkkkkkkxk....',
  '.....kxxxxxxk.....',
  '.....kxxxxxxk.....',
  '.....kxxxxxxk.....',
  '.....kxxxxxxk.....',
  '.....kzzzzzzk.....',
]
const CHEER_BOB: Grid = [
  '.kkkhsssssssshkkk.',
  '.kskhsksssskshksk.',
  '.kxkhqssssssqhkxk.',
  '.kxkhhssmmsshhkxk.',
  '..kxkhkkkkkkhkxk..',
  '...kxkxxxxxxkxk...',
  '....kxxxxxxxxk....',
  '.....kxxxxxxk.....',
  '.....kxxxxxxk.....',
  '.....kzzzzzzk.....',
]

// 中高生 18×18
const HEAD_TEEN: Grid = [
  '......kkkkkk......',
  '.....khhhhhhk.....',
  '....khhhhhhhhk....',
  '....khhhhhhhhk....',
  '....khhhhhssshk...',
  '....kssssssssk....',
  '....kskssssksk....',
  '....kqssssssqk....',
  '.....kssmmssk.....',
  '......kkkkkk......',
].map((r) => r.slice(0, 18))
const BODY_TEEN: Grid = [
  '.....kwwbbwwk.....',
  '....kwwwbbwwwk....',
  '....kswwbbwwsk....',
  '....kkzzzzzzkk....',
]

// 小学生くらい 14×15
const HEAD_KID: Grid = [
  '....kkkkkk....',
  '...khhhhhhk...',
  '..khhhhhhhhk..',
  '..khsshhsshk..',
  '..kssssssssk..',
  '..kskssssksk..',
  '..kqssssssqk..',
  '...kssmmssk...',
  '....kkkkkk....',
]
const BODY_KID: Grid = ['....kxxxxk....', '...kxxxxxxk...', '...ksxxxxsk...', '...kkzzzzkk...']
const LEGS_KID = {
  stand: ['....kskksk....', '....kkkkkk....'],
  a: ['...ksk..ksk...', '...kkk..kkk...'],
  b: ['.....kssk.....', '.....kkkk.....'],
} as const
const CHEER_KID: Grid = [
  'kkkssssssssskk',
  'kskskssssksksk',
  'kxkqssssssqkxk',
  '.kxkssmmsskxk.',
  '..kxkkkkkkxk..',
  '....kxxxxk....',
  '....kxxxxk....',
  '....kxxxxk....',
  '....kzzzzk....',
]

// 0〜2歳 12×13
const TODDLER_TOP: Grid = [
  '.....kk.....',
  '....khhk....',
  '..kkhsshkk..',
  '.kssssssssk.',
  '.kssssssssk.',
  '.kskssssksk.',
  '.kqssmmssqk.',
  '..kssssssk..',
  '...kkkkkk...',
  '..kxxxxxxk..',
  '..ksxxxxsk..',
  '..kkxxxxkk..',
]
const LEGS_TODDLER = { stand: ['...kk..kk...'], a: ['..kk....kk..'], b: ['....kkkk....'] } as const

// これから生まれる子（おくるみ）12×10
export const BUNDLE: Grid = [
  '....kkkk....',
  '...kppppk...',
  '..kpsssspk..',
  '..kpksskpk..',
  '..kpqssqpk..',
  '.kccppppcck.',
  '.kcccccccck.',
  '.kcccccccck.',
  '..kcccccck..',
  '...kkkkkk...',
]

export type Pose = 'stand' | 'a' | 'b' | 'cheer'
export type Face = 'smile' | 'calm' | 'open'
export type Who = 'adultA' | 'adultB' | 'teen' | 'kid' | 'toddler' | 'bundle'

const join = (...parts: Grid[]) => parts.flatMap((p) => [...p])

function face(grid: Grid, f: Face): Grid {
  // くちの 'm' を表情で塗りかえる
  if (f === 'open') return grid
  return grid.map((r) => r.replace(/m/g, f === 'calm' ? 'S' : 'S'))
}

export function personGrid(who: Who, pose: Pose, f: Face = 'smile'): Grid {
  let g: Grid
  switch (who) {
    case 'adultA':
      g = pose === 'cheer' ? join(HEAD_SHORT.slice(0, 5), CHEER_SHORT, LEGS_ADULT.stand) : join(HEAD_SHORT, BODY_ADULT, LEGS_ADULT[pose])
      break
    case 'adultB':
      g = pose === 'cheer' ? join(HEAD_BOB.slice(0, 5), CHEER_BOB, LEGS_ADULT.stand) : join(HEAD_BOB, BODY_ADULT, LEGS_ADULT[pose])
      break
    case 'teen':
      g = join(HEAD_TEEN, BODY_TEEN, LEGS_ADULT[pose === 'cheer' ? 'stand' : pose])
      break
    case 'kid':
      g = pose === 'cheer' ? join(HEAD_KID.slice(0, 4), CHEER_KID, LEGS_KID.stand) : join(HEAD_KID, BODY_KID, LEGS_KID[pose])
      break
    case 'toddler':
      g = join(TODDLER_TOP, LEGS_TODDLER[pose === 'cheer' ? 'stand' : pose])
      break
    case 'bundle':
      g = BUNDLE
      break
  }
  return face(g, pose === 'cheer' ? 'open' : f)
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
const PIG_BASE: Grid = [
  '..kkk........kkk..',
  '..kPpkkkkkkkkpPk..',
  '.kpppppkkkkpppppk.',
  'kppppppppppppppppk',
  'kppppppppppppppppk',
  'kpqpppPPPPPPpppqpk',
  'kpppppPkPPkPpppppk',
  'kpppppPPPPPPpppppk',
  'kppppppppppppppppk',
  'kppppppppppppppppk',
  'kppppppppppppppppk',
  '.kppppppppppppppk.',
  '..kPPkkkkkkkkPPk..',
  '..kkkk......kkkk..',
]
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

/* ───────── ハト駅長（案内役）16×16 ───────── */
export const PIGEON: Grid = [
  '................',
  '.....kkkkkk.....',
  '....kvvvvvvk....',
  '....kvvyyvvk....',
  '....kkkkkkkkkk..',
  '....keeeeeeek...',
  '...keeeeeowkek..',
  '...keeeeeeeewCk.',
  '...kttteeeeekk..',
  '..kttgtteeeek...',
  '..ktgttEeeeeek..',
  '.keeeeEEeeeeeek.',
  '.keeeeeEEeeeeek.',
  '..keeeeeEEEEek..',
  '...kkkkkkkkkk...',
  '.....ko..ok.....',
]

/* ───────── 小物 ───────── */
export const ITEMS = {
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
  pot: [
    '......kk......',
    '.....kEEk.....',
    '..kkkkkkkkkk..',
    '.kEEEEEEEEEEk.',
    'kkkkkkkkkkkkkk',
    'kEeEEEEEEEEEEk',
    'kEeEEEEEEEEEEk',
    '.kEEEEEEEEEEk.',
    '..kEEEEEEEEk..',
    '...kkkkkkkk...',
    '...kk....kk...',
  ],
  briefcase: [
    '....kkkk....',
    '....k..k....',
    '.kkkkkkkkkk.',
    'knnnnnnnnnnk',
    'knnnnnnnnnnk',
    'kNNNNyyNNNNk',
    'knnnnnnnnnnk',
    'knnnnnnnnnnk',
    '.kkkkkkkkkk.',
  ],
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
  rocket: [
    '....kk....',
    '...kwwk...',
    '...kwwk...',
    '..kwwwwk..',
    '..kwllwk..',
    '..kwllwk..',
    '..kwwwwk..',
    '..kwwwwk..',
    '.krwwwwrk.',
    'krrwwwwrrk',
    'krkkkkkkrk',
    'kk.kook.kk',
    '...kyyk...',
    '....kk....',
  ],
  takoyaki: [
    '...kkk....kkk...',
    '..knNnk..knNnk..',
    '.knwNNnkknNwNnk.',
    '.knNgNnkknNNgnk.',
    '..knnnk..knnnk..',
    'kkkkkkkkkkkkkkkk',
    'kCCCCCCCCCCCCCCk',
    '.kCCCCCCCCCCCCk.',
    '..kkkkkkkkkkkk..',
  ],
  drop: [
    '...kk...',
    '...kk...',
    '..kllk..',
    '..kllk..',
    '.kllllk.',
    '.klwllk.',
    'kllwlllk',
    'kllllllk',
    'klllllLk',
    '.kllLLk.',
    '..kkkk..',
  ],
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
  volcano: [
    '......eee.......',
    '.....eeeee......',
    '......eee.......',
    '......kkkk......',
    '.....kNnnNk.....',
    '....knnNnnnk....',
    '...knnnnnNnnk...',
    '..knNnnnnnnnnk..',
    '.knnnnnNnnnnNnk.',
    'kkkkkkkkkkkkkkkk',
  ],
  nursery: [
    '.....kk.....',
    '....kRRk....',
    '...kRrrRk...',
    '..kRrrrrRk..',
    '.kRrrrrrrRk.',
    'kkkkkkkkkkkk',
    '.kccccccck..',
    '.kcbbcckcck.',
    '.kcbbckrkck.',
    '.kcccckgkck.',
    '.kccccckcck.',
    'kkkkkkkkkkkk',
  ],
  envelope: [
    '....kkkkkk....',
    '..kkyyyyyykk..',
    '.kyyYYyyYYyyk.',
    'kkkkkkkkkkkkkk',
    'kcckcccccckcck',
    'kccckcccckccck',
    'kcccckkkkcccck',
    'kccccccccccccc',
    'kccccccccccccc',
    'kkkkkkkkkkkkkk',
  ].map((r) => (r.endsWith('cc') && r.length === 14 ? r.slice(0, 13) + 'k' : r)),
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
  bandage: [
    '...kkkkkkkk...',
    '..kssssssssk..',
    '.ksskccccksk..',
    'ksssskcCkcsssk',
    'ksssskcCkcsssk',
    '.ksskccccksk..',
    '..kssssssssk..',
    '...kkkkkkkk...',
  ].map((r) => r.padEnd(14, '.').slice(0, 14)),
  suitcase: [
    '....kkkk....',
    '....k..k....',
    '.kkkkkkkkkk.',
    'krrrrrrrrrrk',
    'krRrrrrrrRrk',
    'krRryyyyrRrk',
    'krRryyyyrRrk',
    'krRrrrrrrRrk',
    'krrrrrrrrrrk',
    '.kkkkkkkkkk.',
    '..k......k..',
  ],
  coin: ['..kkkk..', '.kyyyyk.', 'kyyYYyyk', 'kyYyyYyk', 'kyYyyYyk', 'kyyYYyyk', '.kyyyyk.', '..kkkk..'],
  gift: [
    '..kk..kk....',
    '.kRrkkrRk...',
    '..kkrrkk....',
    'kkkkrrkkkkk.',
    'kcccrrccccck',
    'kkkkrrkkkkkk',
    '.kcccrrcccck',
    '.kcccrrcccck',
    '.kcccrrcccck',
    '.kkkkkkkkkkk',
  ].map((r) => r.padEnd(12, '.').slice(0, 12)),
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
  heart: ['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
  sparkle: ['..y..', '..y..', 'yywyy', '..y..', '..y..'],
  sweat: ['.k..', 'klk.', 'kllk', 'kllk', '.kk.'],
  note: ['..kkk', '..kyk', '..k..', 'kkk..', 'kkk..'],
  train: [
    '..kkkkkkkkkk..',
    '.kggggggggggk.',
    '.kgllkgglllgk.',
    '.kgllkgglllgk.',
    '.kggggggggggk.',
    '.kwwggggggwwk.',
    '.kggggggggggk.',
    '..kkkkkkkkkk..',
    '...kEk..kEk...',
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
  tools: [
    '......kkk.....',
    '.....kEeEk....',
    '....kEk.kEk...',
    'kkkkkkkkkkkkkk',
    'krrrrrrrrrrrrk',
    'krrrrkyykrrrrk',
    'kRRRRkkkkRRRRk',
    'krrrrrrrrrrrrk',
    'kkkkkkkkkkkkkk',
  ],
  clock: [
    '..kkkkkk..',
    '.kwwwwwwk.',
    'kwwwkwwwwk',
    'kwwwkwwwwk',
    'kwwwkkkwwk',
    'kwwwwwwwwk',
    'kwwwwwwwwk',
    '.kwwwwwwk.',
    '..kkkkkk..',
  ],
  ticket: [
    'kkkkkkkkkkkkkkkkkk',
    'kcccccccccccccccck',
    'kcCCCCCCccccccccck',
    '.cccccccccccccccck',
    'kcCCCCCCCCCCCcccck',
    'kccccccccccccccccc',
    'kcCCCCCcccccccccck',
    'kcccccccccccccccck',
    'kkkkkkkkkkkkkkkkkk',
  ],
} satisfies Record<string, Grid>

export type ItemKey = keyof typeof ITEMS
