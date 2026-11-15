// 自動作成。希望休と必要人数から、1か月ぶんの表を組む。
//
// 作り方（仕様書の目安どおり）:
//   1. 手で固定したマスを置く。
//   2. 埋めにくいところ（入れられる人が少ない日・勤務）から順に、いちばん負担の少ない人を置いていく（貪欲法）。
//   3. 入れ替えをたくさん試して、良くなったものを残す（局所探索）。少し悪くなる入れ替えも、はじめのうちは受け入れて、
//      行き止まりから抜けられるようにする。
//   4. 最後に、1マスの変更と同じ日の入れ替えを全部試し、良くなるものがなくなるまで直す。
//
// 必ず守る条件は、置く前に必ず確かめる（canPut）。守れない置き方は、点数の良し悪しに関係なく、しない。
// なるべく満たす条件は、点数（小さいほど良い）にして足し合わせる。
//
// 同じ入力・同じ種なら、どの端末でも同じ結果になるようにしている:
//   - 乱数は種から作る（Math.random を使わない）。
//   - 時間で打ち切らない（回数で打ち切る）。速い端末でも遅い端末でも、同じだけ試す。
//   - 受け入れの判定に Math.exp を使わない（ブラウザによって最後の桁が違うことがあるため、四則演算だけにした）。
import { buildCalendar } from './calendar'
import { checkPlan, type CheckReport } from './check'
import type { Schedule, ShiftPlan } from './types'

export type SolveProgress = {
  /** greedy = 順に置いている、improve = 入れ替えで良くしている、finish = 仕上げ */
  phase: 'greedy' | 'improve' | 'finish'
  /** 0〜1 */
  ratio: number
}

export type SolveOptions = {
  /** 乱数の種。同じ種なら同じ結果。「別の案を作る」では、この数を変える。初期値は 1 */
  seed?: number
  /** 入れ替えを試す回数の倍率。1 がふつう。小さくすると速いが、仕上がりが少し落ちる */
  effort?: number
  /** 途中経過を受け取る（画面の進み具合の表示用。結果には影響しない） */
  onProgress?: (p: SolveProgress) => void
}

export type SolveResult = {
  /** できた表。plan.schedule で固定されていたマスは、そのまま残る */
  schedule: Schedule
  /** 点検結果（check.ts で、自動作成とは別の計算で調べたもの） */
  check: CheckReport
  /** 使った種 */
  seed: number
  /** 入れ替えを試した回数 */
  iterations: number
  /** なるべく満たす条件の点数（小さいほど良い）。同じ入力で作った別の案どうしを比べる目安 */
  score: number
}

/**
 * 点数の重み（小さいほど良い）。「人数の不足」がいちばん重く、公平さがいちばん軽い。
 * 不足1人ぶん（1000）は、1人を置くことで増えうるほかの点数を全部足した最大より大きくしてある
 * （公平さは回数の2乗なので、31日ぜんぶ働いた人に足すときがいちばん大きい。その場合でも 600 に届かない。
 * solver.test.ts で確かめている）。
 * だから、公平さや希望のために、人数の不足をわざと残すことはない。
 */
export const WEIGHTS = {
  /** 必要な人数に1人足りない */
  short: 1000,
  /** 役割の最低人数に1人足りない */
  role: 700,
  /** 月の勤務日数の下限に1日足りない */
  minDays: 300,
  /** 必要な人数より1人多い（下限を満たすためなら、多く入れてよい。だから minDays より軽い） */
  surplus: 150,
  /** 休みが1日もない週 */
  weekNoOff: 150,
  /** 「この勤務に入りたい」がかなわない（人を余らせてまで、かなえはしない。だから surplus より軽い） */
  wish: 100,
  /** 土日祝の回数のかたより（回数の2乗に掛ける） */
  fairWeekend: 4,
  /** 均等にしたい勤務の回数のかたより（回数の2乗に掛ける） */
  fairShift: 4,
  /** 勤務日数のかたより（日数の2乗に掛ける）。上限・下限を決めていない人どうしを、だいたい同じ日数にする */
  fairDays: 1,
} as const

/** 種から乱数を作る（mulberry32）。整数の計算だけなので、どのブラウザでも同じ列になる */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 「別の案を作る」ときの、次の種。いまの種（まだ組んでいなければ null）から決める */
export function nextSeed(current: number | null): number {
  return ((current ?? 0) % 0xfffffff0) + 1
}

const NO_LIMIT = 9999
const UNLOCKED = -2
const OFF = -1

/** 表を組む。plan は書き換えない */
export function solve(plan: ShiftPlan, options: SolveOptions = {}): SolveResult {
  // 種は 0〜4294967295 の整数にそろえる（画面から時刻などの大きな数をわたされても、保存の検査を通る値にする）
  const seed = (options.seed ?? 1) >>> 0
  const effort = Number.isFinite(options.effort) ? Math.max(0, options.effort as number) : 1
  const onProgress = options.onProgress
  const rng = makeRng(seed)
  const calendar = buildCalendar(plan)

  const D = calendar.length
  const S = plan.staff.length
  const T = plan.shiftTypes.length
  const TT = T + 1 // 前の月の「種類のわからない勤務」を T 番として持つので、1つ多い
  const shiftIndex = new Map(plan.shiftTypes.map((s, i) => [s.id, i]))
  const rint = (n: number) => Math.floor(rng() * n)

  // ---- 問題の下ごしらえ ----
  const closed = new Uint8Array(D)
  const special = new Uint8Array(D)
  const need = new Int16Array(D * T)
  for (const d of calendar) {
    closed[d.day - 1] = d.closed ? 1 : 0
    special[d.day - 1] = d.isWeekendOrHoliday ? 1 : 0
    for (let t = 0; t < T; t++) need[(d.day - 1) * T + t] = d.needs[plan.shiftTypes[t].id] ?? 0
  }

  // 役割の最低人数
  const roleRules = plan.needs.roleMins.filter((r) => shiftIndex.has(r.shiftId))
  const R = roleRules.length
  const roleShift = roleRules.map((r) => shiftIndex.get(r.shiftId)!)
  const roleCount = roleRules.map((r) => r.count)
  const rulesOfShift: number[][] = Array.from({ length: T }, () => [])
  roleShift.forEach((t, r) => rulesOfShift[t].push(r))
  const hasTag = new Uint8Array(S * Math.max(1, R))

  const maxC = plan.rules.maxConsecutive ?? NO_LIMIT
  const forb = new Uint8Array(TT * TT)
  let anyPairs = false
  for (const p of plan.rules.forbiddenPairs) {
    const a = shiftIndex.get(p.first)
    const b = shiftIndex.get(p.next)
    if (a === undefined || b === undefined) continue
    forb[a * TT + b] = 1
    anyPairs = true
  }
  const balShift = new Uint8Array(T)
  for (const id of plan.rules.balanceShiftIds) {
    const t = shiftIndex.get(id)
    if (t !== undefined) balShift[t] = 1
  }
  const balanceWeekend = plan.rules.balanceWeekend
  const weeklyDayOff = plan.rules.weeklyDayOff

  // 週の区切り。1日をふくむ週は、前の月にはみ出していることがある
  const back = D > 0 ? (calendar[0].weekday - plan.rules.weekStart + 7) % 7 : 0
  const W = Math.ceil((D + back) / 7)
  const weekOf = new Int16Array(D)
  for (let d = 0; d < D; d++) weekOf[d] = Math.floor((d + back) / 7)

  // スタッフごとの、動かない条件
  const ok = new Uint8Array(S * D * T) // そのマスにその勤務を置いてよいか（日と人だけで決まる条件）
  const lock = new Int8Array(S * D).fill(UNLOCKED)
  const wish = new Int8Array(S * D).fill(-1)
  const minD = new Int16Array(S)
  const maxD = new Int16Array(S)
  const tailRun = new Int16Array(S)
  const tailLast = new Int8Array(S).fill(OFF)
  const weekFull = new Uint8Array(S * W)
  const weekWork = new Int16Array(S * W)

  plan.staff.forEach((staff, s) => {
    minD[s] = staff.minDays ?? 0
    maxD[s] = staff.maxDays ?? NO_LIMIT
    roleRules.forEach((r, ri) => {
      if (staff.tagIds.includes(r.tagId)) hasTag[s * R + ri] = 1
    })
    const wishes = plan.wishes[staff.id] ?? {}
    for (let d = 0; d < D; d++) {
      const info = calendar[d]
      const w = wishes[String(info.day)]
      if (w?.kind === 'shift') {
        const t = shiftIndex.get(w.shiftId)
        if (t !== undefined) wish[s * D + d] = t
      }
      if (info.closed || w?.kind === 'off' || staff.fixedOffWeekdays.includes(info.weekday)) continue
      for (let t = 0; t < T; t++) {
        // 人が要らない勤務には、自動では置かない（余分な人件費を勝手に作らない）
        if (need[d * T + t] <= 0) continue
        if (staff.cannotWork[plan.shiftTypes[t].id]?.includes(info.weekday)) continue
        ok[(s * D + d) * T + t] = 1
      }
    }
    // 手で固定したマス
    for (const day of plan.schedule.locked[staff.id] ?? []) {
      if (day < 1 || day > D) continue
      const id = plan.schedule.work[staff.id]?.[String(day)]
      const t = id === undefined ? OFF : shiftIndex.get(id)
      lock[s * D + day - 1] = t === undefined ? OFF : t
    }
    // 前の月の終わり
    const tail = plan.carry?.tail[staff.id] ?? []
    let run = 0
    for (let i = tail.length - 1; i >= 0 && tail[i] !== null; i--) run++
    tailRun[s] = run
    if (tail.length > 0) {
      const last = tail[tail.length - 1]
      tailLast[s] = last === null ? OFF : (shiftIndex.get(last) ?? T)
    }
    for (let w = 0; w < W; w++) {
      const start = w * 7 - back // 1日を 0 とした通し番号
      const end = start + 6
      const known = end < D && (start >= 0 || tail.length >= -start)
      weekFull[s * W + w] = known ? 1 : 0
      if (known && start < 0) {
        let c = 0
        for (let o = start; o < 0; o++) if (tail[tail.length + o] !== null) c++
        weekWork[s * W + w] = c
      }
    }
  })

  // ---- いまの状態 ----
  const x = new Int8Array(S * D).fill(OFF)
  const cover = new Int16Array(D * T)
  const roleCover = new Int16Array(D * Math.max(1, R))
  const workdays = new Int16Array(S)
  const specialCount = new Int16Array(S)
  const shiftCount = new Int16Array(S * T)

  /** 何も置いていないときの点数 */
  let cost = 0
  for (let d = 0; d < D; d++) {
    for (let t = 0; t < T; t++) {
      const n = need[d * T + t]
      cost += n * WEIGHTS.short
      if (n > 0) for (const r of rulesOfShift[t]) cost += roleCount[r] * WEIGHTS.role
    }
  }
  for (let s = 0; s < S; s++) {
    cost += minD[s] * WEIGHTS.minDays
    if (weeklyDayOff) for (let w = 0; w < W; w++) if (weekFull[s * W + w] && weekWork[s * W + w] === 7) cost += WEIGHTS.weekNoOff
  }

  /** マスを書き換えて、点数を差分で直す。b は勤務の番号、休みは OFF */
  function set(s: number, d: number, b: number): void {
    const i = s * D + d
    const a = x[i]
    if (a === b) return
    if (a >= 0) {
      const k = d * T + a
      const c = cover[k]
      const n = need[k]
      cost += c <= n ? WEIGHTS.short : -WEIGHTS.surplus
      cover[k] = c - 1
      if (n > 0) {
        for (const r of rulesOfShift[a]) {
          if (!hasTag[s * R + r]) continue
          const rc = roleCover[d * R + r]
          if (rc <= roleCount[r]) cost += WEIGHTS.role
          roleCover[d * R + r] = rc - 1
        }
      }
      const bc = shiftCount[s * T + a]
      if (balShift[a]) cost += WEIGHTS.fairShift * (1 - 2 * bc)
      shiftCount[s * T + a] = bc - 1
    }
    if (b >= 0) {
      const k = d * T + b
      const c = cover[k]
      const n = need[k]
      cost += c < n ? -WEIGHTS.short : WEIGHTS.surplus
      cover[k] = c + 1
      if (n > 0) {
        for (const r of rulesOfShift[b]) {
          if (!hasTag[s * R + r]) continue
          const rc = roleCover[d * R + r]
          if (rc < roleCount[r]) cost -= WEIGHTS.role
          roleCover[d * R + r] = rc + 1
        }
      }
      const bc = shiftCount[s * T + b]
      if (balShift[b]) cost += WEIGHTS.fairShift * (2 * bc + 1)
      shiftCount[s * T + b] = bc + 1
    }
    if (a >= 0 !== b >= 0) {
      const dir = b >= 0 ? 1 : -1
      const w = workdays[s]
      const w2 = w + dir
      cost += WEIGHTS.minDays * (Math.max(0, minD[s] - w2) - Math.max(0, minD[s] - w))
      cost += WEIGHTS.fairDays * (w2 * w2 - w * w)
      workdays[s] = w2
      if (special[d]) {
        const c = specialCount[s]
        if (balanceWeekend) cost += WEIGHTS.fairWeekend * (dir > 0 ? 2 * c + 1 : 1 - 2 * c)
        specialCount[s] = c + dir
      }
      const wk = s * W + weekOf[d]
      const wc = weekWork[wk]
      if (weeklyDayOff && weekFull[wk]) {
        if (wc === 7) cost -= WEIGHTS.weekNoOff
        if (wc + dir === 7) cost += WEIGHTS.weekNoOff
      }
      weekWork[wk] = wc + dir
    }
    const wt = wish[i]
    if (wt >= 0) {
      // かなった希望を「引く」形で数える（かなわないぶんを足すのと、差は同じ）
      if (a === wt) cost += WEIGHTS.wish
      if (b === wt) cost -= WEIGHTS.wish
    }
    x[i] = b
  }

  /** 必ず守る条件に照らして、そのマスに勤務 b を置けるか（固定されていないマスについて） */
  function canPut(s: number, d: number, b: number): boolean {
    const i = s * D + d
    if (!ok[i * T + b]) return false
    if (x[i] < 0) {
      if (workdays[s] + 1 > maxD[s]) return false
      if (maxC !== NO_LIMIT) {
        let run = 1
        let j = d - 1
        while (j >= 0 && x[s * D + j] >= 0) {
          run++
          j--
        }
        if (j < 0) run += tailRun[s]
        if (run > maxC) return false
        j = d + 1
        while (j < D && x[s * D + j] >= 0) {
          run++
          j++
        }
        if (run > maxC) return false
      }
    }
    if (anyPairs) {
      const p = d > 0 ? x[i - 1] : tailLast[s]
      if (p >= 0 && forb[p * TT + b]) return false
      if (d + 1 < D) {
        const n = x[i + 1]
        if (n >= 0 && forb[b * TT + n]) return false
      }
    }
    return true
  }

  // ---- 1. 手で固定したマスを置く ----
  for (let i = 0; i < S * D; i++) {
    if (lock[i] >= 0) set(Math.floor(i / D), i % D, lock[i])
  }

  // 動かしてよいマスの一覧（固定されておらず、置ける勤務が1つはあるマス）
  const freeCells: number[] = []
  const freeByDay: number[][] = Array.from({ length: D }, () => [])
  const okShifts: number[][] = new Array(S * D)
  for (let s = 0; s < S; s++) {
    for (let d = 0; d < D; d++) {
      const i = s * D + d
      const list: number[] = []
      if (lock[i] === UNLOCKED) for (let t = 0; t < T; t++) if (ok[i * T + t]) list.push(t)
      okShifts[i] = list
      if (list.length > 0) {
        freeCells.push(i)
        freeByDay[d].push(s)
      }
    }
  }
  /** その日その勤務に、条件のうえでは置ける人（固定されていないマスの人） */
  const okStaff: number[][] = new Array(D * T)
  for (let d = 0; d < D; d++) {
    for (let t = 0; t < T; t++) okStaff[d * T + t] = freeByDay[d].filter((s) => ok[(s * D + d) * T + t])
  }

  // ---- 2. 埋めにくいところから順に置く ----
  onProgress?.({ phase: 'greedy', ratio: 0 })

  /** いま休みの人のうち、(d, t) に置ける人。role が 0 以上なら、その役割の札を持つ人だけ */
  function candidates(d: number, t: number, role: number): number[] {
    const out: number[] = []
    for (const s of okStaff[d * T + t]) {
      if (x[s * D + d] !== OFF) continue
      if (role >= 0 && !hasTag[s * R + role]) continue
      if (canPut(s, d, t)) out.push(s)
    }
    return out
  }

  /** 候補のうち、置いたときの点数がいちばん小さい人を置く */
  function placeBest(d: number, t: number, cands: number[]): void {
    let best = -1
    let bestScore = Infinity
    for (const s of cands) {
      const before = cost
      set(s, d, t)
      // 同じ点数の人が並んだときに、いつも名簿の上の人になるのを避けるため、ごく小さい乱数を足す
      const score = cost - before + rng() * 0.5
      set(s, d, OFF)
      if (score < bestScore) {
        bestScore = score
        best = s
      }
    }
    if (best >= 0) set(best, d, t)
  }

  // 役割の最低人数を先に置く（札を持つ人は少ないことが多いので、先に席を取っておく）
  for (;;) {
    let pick: { d: number; t: number; r: number; cands: number[] } | null = null
    let pickSlack = Infinity
    for (let d = 0; d < D; d++) {
      for (let r = 0; r < R; r++) {
        const t = roleShift[r]
        if (need[d * T + t] <= 0) continue
        const remain = roleCount[r] - roleCover[d * R + r]
        if (remain <= 0) continue
        const cands = candidates(d, t, r)
        if (cands.length === 0) continue
        const slack = cands.length - remain
        if (slack < pickSlack) {
          pickSlack = slack
          pick = { d, t, r, cands }
        }
      }
    }
    if (!pick) break
    placeBest(pick.d, pick.t, pick.cands)
  }

  // 残りの必要人数を置く
  for (;;) {
    let pick: { d: number; t: number; cands: number[] } | null = null
    let pickSlack = Infinity
    for (let d = 0; d < D; d++) {
      for (let t = 0; t < T; t++) {
        const remain = need[d * T + t] - cover[d * T + t]
        if (remain <= 0) continue
        const cands = candidates(d, t, -1)
        if (cands.length === 0) continue
        const slack = cands.length - remain
        if (slack < pickSlack) {
          pickSlack = slack
          pick = { d, t, cands }
        }
      }
    }
    if (!pick) break
    placeBest(pick.d, pick.t, pick.cands)
  }

  // ---- 3. 入れ替えで良くする ----
  const cells = S * D
  // 試す回数は、表の大きさ（人数 × 日数）で決める。時間では決めない（同じ入力なら同じ結果にするため）。
  // 20人 × 31日 までは 60万回、30人 × 31日 で 90万回。手元の計測では 0.2〜0.4 秒ほど。
  // 小さい店でも回数を減らさないのは、回数が少ないと「本当は埋まるのに1人足りない」案で止まることがあったため
  // （サンプルの飲食店で確かめた。25万回では 5% ほど、60万回では 1% 未満）。
  const iterations = freeCells.length === 0 ? 0 : Math.round(effort * Math.min(900_000, Math.max(600_000, cells * 1000)))
  const undoI: number[] = []
  const undoV: number[] = []
  function put(s: number, d: number, b: number): void {
    undoI.push(s * D + d)
    undoV.push(x[s * D + d])
    set(s, d, b)
  }
  function rollback(): void {
    for (let k = undoI.length - 1; k >= 0; k--) set(Math.floor(undoI[k] / D), undoI[k] % D, undoV[k])
    undoI.length = 0
    undoV.length = 0
  }

  let best = cost
  const bestX = x.slice()
  // 受け入れる悪化の幅の、はじめの値。いくつかの値で比べて決めた（0 だと行き止まりに残りやすく、大きすぎると仕上がりが粗くなる）
  const START_THRESHOLD = 300
  let shortSlots: number[] = [] // d * T + t
  let shortRoles: number[] = [] // d * R + r
  const openDays: number[] = []
  for (let d = 0; d < D; d++) if (freeByDay[d].length >= 2) openDays.push(d)

  function refreshShort(): void {
    shortSlots = []
    shortRoles = []
    for (let d = 0; d < D; d++) {
      for (let t = 0; t < T; t++) {
        if (cover[d * T + t] < need[d * T + t]) shortSlots.push(d * T + t)
        if (need[d * T + t] > 0) for (const r of rulesOfShift[t]) if (roleCover[d * R + r] < roleCount[r]) shortRoles.push(d * R + r)
      }
    }
  }

  /** 1回ぶんの入れ替えを組み立てる。組み立てられたら true（そのあと、受け入れるかどうかを決める） */
  function proposeMove(): boolean {
    const kind = rng()

    // (A) 足りないところを狙って埋める
    if (kind < 0.3 && shortSlots.length + shortRoles.length > 0) {
      const pickRole = shortRoles.length > 0 && (shortSlots.length === 0 || rng() < 0.4)
      if (pickRole) {
        const key = shortRoles[rint(shortRoles.length)]
        const d = Math.floor(key / R)
        const r = key % R
        const t = roleShift[r]
        const pool = okStaff[d * T + t]
        if (pool.length === 0) return false
        const s = pool[rint(pool.length)]
        if (!hasTag[s * R + r] || x[s * D + d] === t) return false
        const mine = x[s * D + d]
        // 札を持たない人がその勤務にいれば、その人と入れ替える（人数は変えずに、役割だけ満たす）
        const others = pool.filter((u) => u !== s && x[u * D + d] === t && !hasTag[u * R + r])
        if (others.length > 0) {
          const u = others[rint(others.length)]
          put(u, d, OFF)
          if (!canPut(s, d, t)) return false
          put(s, d, t)
          if (mine >= 0 && canPut(u, d, mine)) put(u, d, mine)
          return true
        }
        if (!canPut(s, d, t)) return false
        put(s, d, t)
        return true
      }
      const key = shortSlots[rint(shortSlots.length)]
      const d = Math.floor(key / T)
      const t = key % T
      const pool = okStaff[key]
      if (pool.length === 0) return false
      const s = pool[rint(pool.length)]
      const mine = x[s * D + d]
      if (mine === t) return false
      if (mine === OFF) {
        if (canPut(s, d, t)) {
          put(s, d, t)
          return true
        }
        // そのままでは置けない（日数の上限や連勤）。ほかの日の勤務を1つ外して、ここへ回す。
        // 連勤が理由のときは近くの日を外さないと効かないので、半分は近くの日から選ぶ
        const near = maxC !== NO_LIMIT && rng() < 0.5
        const d2 = near ? d - maxC + rint(2 * maxC + 1) : rint(D)
        if (d2 < 0 || d2 >= D || d2 === d || x[s * D + d2] < 0 || lock[s * D + d2] !== UNLOCKED) return false
        put(s, d2, OFF)
        if (!canPut(s, d, t)) return false
        put(s, d, t)
        return true
      }
      // 同じ日の別の勤務に入っている人を回す。空いた席は、休みの人で埋められれば埋める
      if (!canPut(s, d, t)) return false
      put(s, d, t)
      const fill = okStaff[d * T + mine]
      if (fill.length > 0) {
        const u = fill[rint(fill.length)]
        if (u !== s && x[u * D + d] === OFF && canPut(u, d, mine)) put(u, d, mine)
      }
      return true
    }

    // (B) 1マスを変える
    if (kind < 0.5) {
      const i = freeCells[rint(freeCells.length)]
      const s = Math.floor(i / D)
      const d = i % D
      const a = x[i]
      const list = okShifts[i]
      if (a >= 0 && (list.length === 1 || rng() < 0.5)) {
        put(s, d, OFF)
        return true
      }
      const b = list[rint(list.length)]
      if (b === a || !canPut(s, d, b)) return false
      put(s, d, b)
      return true
    }

    // (C) 同じ日の2人を入れ替える
    if (kind < 0.75) {
      if (openDays.length === 0) return false
      const d = openDays[rint(openDays.length)]
      const pool = freeByDay[d]
      const s1 = pool[rint(pool.length)]
      const s2 = pool[rint(pool.length)]
      if (s1 === s2) return false
      const a1 = x[s1 * D + d]
      const a2 = x[s2 * D + d]
      if (a1 === a2) return false
      // 先に両方を休みにしてから置く（日数の上限に引っかからないように）
      put(s1, d, OFF)
      put(s2, d, OFF)
      if (a2 >= 0) {
        if (!canPut(s1, d, a2)) return false
        put(s1, d, a2)
      }
      if (a1 >= 0) {
        if (!canPut(s2, d, a1)) return false
        put(s2, d, a1)
      }
      return true
    }

    // (D) 2人の、2つの日の勤務を取りかえる（それぞれの勤務日数は変わらない）
    if (kind < 0.87) {
      const i = freeCells[rint(freeCells.length)]
      const s1 = Math.floor(i / D)
      const d1 = i % D
      const a = x[i]
      if (a < 0) return false
      const pool = freeByDay[d1]
      const s2 = pool[rint(pool.length)]
      if (s2 === s1 || x[s2 * D + d1] !== OFF) return false
      const d2 = rint(D)
      if (d2 === d1) return false
      const b = x[s2 * D + d2]
      if (b < 0 || lock[s2 * D + d2] !== UNLOCKED || x[s1 * D + d2] !== OFF || lock[s1 * D + d2] !== UNLOCKED) return false
      put(s1, d1, OFF)
      put(s2, d2, OFF)
      if (!canPut(s1, d2, b)) return false
      put(s1, d2, b)
      if (!canPut(s2, d1, a)) return false
      put(s2, d1, a)
      return true
    }

    // (E) 1人の勤務を、別の日へ動かす
    {
      const i = freeCells[rint(freeCells.length)]
      const s = Math.floor(i / D)
      const d1 = i % D
      if (x[i] < 0) return false
      const d2 = rint(D)
      const j = s * D + d2
      if (d2 === d1 || x[j] !== OFF) return false
      const list = okShifts[j]
      if (list.length === 0) return false
      const b = list[rint(list.length)]
      put(s, d1, OFF)
      if (!canPut(s, d2, b)) return false
      put(s, d2, b)
      return true
    }
  }

  onProgress?.({ phase: 'improve', ratio: 0 })
  /** 入れ替えを count 回ためす。progressFrom〜progressTo は、進み具合の表示に使う割合 */
  function anneal(count: number, progressFrom: number, progressTo: number, startThreshold: number = START_THRESHOLD): void {
    const reportEvery = Math.max(1, Math.floor(count / 20))
    for (let k = 0; k < count; k++) {
      if (k % 64 === 0) refreshShort()
      if (onProgress && k % reportEvery === 0) onProgress({ phase: 'improve', ratio: progressFrom + ((progressTo - progressFrom) * k) / count })
      // 受け入れる「悪化の幅」を、はじめは広く、終わりに向けて 0 まで狭める
      const left = 1 - k / count
      const threshold = startThreshold * left * left
      const before = cost
      if (!proposeMove()) {
        rollback()
        continue
      }
      const delta = cost - before
      if (delta <= 0 || delta < threshold * rng()) {
        undoI.length = 0
        undoV.length = 0
        if (cost < best) {
          best = cost
          bestX.set(x)
        }
      } else {
        rollback()
      }
    }
    // いちばん良かった状態に戻す
    if (cost !== best) {
      for (let i = 0; i < S * D; i++) if (x[i] !== bestX[i]) set(Math.floor(i / D), i % D, bestX[i])
    }
  }

  let tried = iterations
  anneal(iterations, 0, 0.7)
  refreshShort()
  if (iterations > 0 && shortSlots.length + shortRoles.length > 0) {
    // 足りないところが残ったときだけ、もう一度ゆるめてから探し直す（半分の回数）。
    // 「本当は埋まるのに足りない」案で止まることを減らすため。足りないところがなければ、ここは通らない
    const EXP = (globalThis as any).__exp ?? { rounds: 1, th: START_THRESHOLD }
    const extra = Math.round(iterations / 2)
    tried += extra
    const per = Math.round(extra / EXP.rounds)
    for (let round = 0; round < EXP.rounds; round++) {
      anneal(per, 0.7, 1, EXP.th)
      refreshShort()
      if (shortSlots.length + shortRoles.length === 0) break
    }
  }

  // ---- 4. 仕上げ: 1マスの変更と、同じ日の入れ替えを全部試す ----
  // これが終わると、「あと1人置けば埋まるのに置いていない」マスは残らない。
  // 組めない理由の説明（explain.ts）は、この性質をあてにしている。
  onProgress?.({ phase: 'finish', ratio: 0 })
  for (let round = 0; round < 20; round++) {
    let improved = false
    for (const i of freeCells) {
      const s = Math.floor(i / D)
      const d = i % D
      for (let b = OFF; b < T; b++) {
        const a = x[i]
        if (b === a) continue
        if (b >= 0 && !ok[i * T + b]) continue
        const before = cost
        if (a >= 0 && b >= 0) {
          // 勤務の種類を変えるときは、いったん休みにしてから置けるかを見る
          put(s, d, OFF)
        }
        if (b >= 0 && !canPut(s, d, b)) {
          rollback()
          continue
        }
        put(s, d, b)
        if (cost < before) {
          undoI.length = 0
          undoV.length = 0
          improved = true
        } else {
          rollback()
        }
      }
    }
    for (const d of openDays) {
      const pool = freeByDay[d]
      for (let p = 0; p < pool.length; p++) {
        for (let q = p + 1; q < pool.length; q++) {
          const s1 = pool[p]
          const s2 = pool[q]
          const a1 = x[s1 * D + d]
          const a2 = x[s2 * D + d]
          if (a1 === a2) continue
          const before = cost
          put(s1, d, OFF)
          put(s2, d, OFF)
          let fine = true
          if (a2 >= 0) {
            if (canPut(s1, d, a2)) put(s1, d, a2)
            else fine = false
          }
          if (fine && a1 >= 0) {
            if (canPut(s2, d, a1)) put(s2, d, a1)
            else fine = false
          }
          if (fine && cost < before) {
            undoI.length = 0
            undoV.length = 0
            improved = true
          } else {
            rollback()
          }
        }
      }
    }
    if (!improved) break
  }
  onProgress?.({ phase: 'finish', ratio: 1 })

  // ---- 結果を表の形に戻す ----
  const work: Schedule['work'] = {}
  for (let s = 0; s < S; s++) {
    const staffId = plan.staff[s].id
    for (let d = 0; d < D; d++) {
      const t = x[s * D + d]
      if (t >= 0) (work[staffId] ??= {})[String(d + 1)] = plan.shiftTypes[t].id
    }
    // 固定したマスに、消した勤務などの読めない値が入っていたら、もとの値を残す（勝手に消さない）
    for (const day of plan.schedule.locked[staffId] ?? []) {
      const id = plan.schedule.work[staffId]?.[String(day)]
      if (id !== undefined && !shiftIndex.has(id)) (work[staffId] ??= {})[String(day)] = id
    }
  }
  const locked: Schedule['locked'] = {}
  for (const [staffId, days] of Object.entries(plan.schedule.locked)) if (days.length > 0) locked[staffId] = [...days]
  const schedule: Schedule = { work, locked, seed }

  return { schedule, check: checkPlan(plan, schedule), seed, iterations: tried, score: cost }
}
