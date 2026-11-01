// 案A「カプセルトイ」 — 演出。筐体の絵の中で起きる：ハンドルが回る → 窓のカプセルが1個落ちる →
// 取り出し口のふたの後ろから転がり出る（はずむのは口の中だけ）→ 取り出して、ぱかっと開く → はんこがポン。約3.5秒。とばせる。
// えらんでくらべるでは、入れたカプセルが順に出てきて、下の「くらべ棚」に並ぶ。
// 動きを減らす設定の人には出さない（index.tsx で切り替える）。
// 舞台は 360×680。はんこの台紙は看板（上から約69px）の下で止め、「ポン！」は台紙の右の、暗くした窓の上に縦に出す。
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Comparison } from '@/shared/types'
import { Capsule, CapsuleBottom, CapsuleTop } from './art'
import { CapsuleConfetti } from './confetti'
import { isHit, isPending, lookOf } from './lib'
import { DOME_W, Dome, Marquee, NamedCapsuleG, Outlet, frontSpots, type Mix } from './machine'
import { GotouchiStamp } from './stamp'

const SW = 360 // 舞台の幅
const SH = 680 // 舞台の高さ
const DOME = { left: 20, top: 92, h: 196 }
const OUT = { left: 80, top: 458, w: 200, h: 100 }
const HANDLE = { cx: 268, cy: 382, size: 104 }

function useStageScale() {
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const f = () => setK(Math.max(0.6, Math.min((window.innerWidth - 16) / SW, (window.innerHeight - 20) / SH, 1.4)))
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return k
}

function NamedCap({ c, size = 56 }: { c: Comparison; size?: number }) {
  const look = lookOf(c.to)
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} aria-hidden overflow="visible">
      <NamedCapsuleG cap={{ id: c.to.id, color: look.capsule, level: c.to.level, name: c.to.name.replace(/(市|区|町|村)$/, '') }} />
    </svg>
  )
}

/* 筐体（窓・ハンドル・コイン口・取り出し口）。動く部品は外から重ねる */
function MachineBody({ turning, mix, children, outlet, dim, plate }: { turning: boolean; mix?: Mix; children?: ReactNode; outlet?: ReactNode; dim?: boolean; plate?: boolean }) {
  return (
    <>
      <div className="va-body absolute inset-x-0 bottom-0 rounded-t-[40px] border-[3px] border-[var(--ink)]" style={{ top: 70 }} />
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <Marquee />
      </div>
      <div className="absolute" style={{ left: DOME.left, top: DOME.top, width: DOME_W }}>
        <Dome height={DOME.h} shaking={turning} mix={mix} dim={dim} />
      </div>
      {/* 窓の中の、動くカプセル（窓のふちで切る） */}
      <div className="absolute overflow-hidden rounded-[28px]" style={{ left: DOME.left + 14, top: DOME.top + 10, width: DOME_W - 28, height: DOME.h - 20 }}>
        <div className="absolute" style={{ left: -14, top: -10, width: DOME_W, height: DOME.h }}>
          {children}
        </div>
      </div>
      {/* コイン口 */}
      <div className="absolute flex flex-col items-center" style={{ left: 30, top: 340 }}>
        <span className="grid h-[58px] w-[70px] place-items-center rounded-[12px] border-[3px] border-[var(--ink)] bg-[var(--metal)]">
          <span className="h-[32px] w-[11px] rounded-full bg-[var(--ink)]" />
        </span>
        <span className="mt-1 text-[12px] font-black text-white">コイン口（0円）</span>
      </div>
      <div className="absolute flex flex-col items-center" style={{ left: 120, top: 352, width: 92 }}>
        <span className="rounded-[8px] border-[3px] border-[var(--ink)] bg-[var(--yolk)] px-2 py-0.5 text-[13px] font-black">1回 0円</span>
      </div>
      {plate && (
        <div className="absolute inset-x-0 flex justify-center" style={{ top: 590 }}>
          <span className="rounded-[10px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[13px] font-black">計算で決まります。くじではありません</span>
        </div>
      )}
      {/* ハンドル（影は回らない台に） */}
      <div className="absolute" style={{ left: HANDLE.cx - HANDLE.size / 2, top: HANDLE.cy - HANDLE.size / 2, width: HANDLE.size, height: HANDLE.size }}>
        <span className="absolute inset-0 rounded-full border-[3px] border-[var(--ink)] bg-[var(--metal)]" />
        <span className="absolute inset-[13px] translate-x-[3px] translate-y-[4px] rounded-full bg-[var(--ink)]" />
        <motion.span
          className="absolute inset-[13px] rounded-full border-[3px] border-[var(--ink)] bg-[var(--yolk)]"
          initial={{ rotate: 0 }}
          animate={turning ? { rotate: 360 } : { rotate: 0 }}
          transition={turning ? { duration: 0.7, ease: [0.5, 0, 0.35, 1] } : { duration: 0 }}
        >
          <span className="absolute left-1/2 top-1/2 h-[18px] w-[70px] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)]" />
          <span className="absolute left-1/2 top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--ink)] bg-[var(--paper)]" />
        </motion.span>
      </div>
      {/* 取り出し口 */}
      <div className="absolute" style={{ left: OUT.left, top: OUT.top }}>
        <Outlet width={OUT.w} height={OUT.h}>
          {outlet}
        </Outlet>
      </div>
    </>
  )
}

/* ───────── 1個（おまかせ） ───────── */

type One = 'turn' | 'fall' | 'roll' | 'lift' | 'open' | 'stamp'
const ONE: One[] = ['turn', 'fall', 'roll', 'lift', 'open', 'stamp']
const T1 = { fall: 720, roll: 1020, lift: 1580, open: 2030, stamp: 2380, done: 3550 }

function ShowOne({ c, finish, note }: { c: Comparison; finish: () => void; note?: string }) {
  const [phase, setPhase] = useState<One>('turn')
  useEffect(() => {
    const t = [
      window.setTimeout(() => setPhase('fall'), T1.fall),
      window.setTimeout(() => setPhase('roll'), T1.roll),
      window.setTimeout(() => setPhase('lift'), T1.lift),
      window.setTimeout(() => setPhase('open'), T1.open),
      window.setTimeout(() => setPhase('stamp'), T1.stamp),
      window.setTimeout(finish, T1.done),
    ]
    return () => t.forEach((x) => window.clearTimeout(x))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const at = (p: One) => ONE.indexOf(phase) >= ONE.indexOf(p)
  const look = lookOf(c.to)
  const spot = frontSpots(1, DOME.h)[0]
  const pending = isPending(c)
  const caption =
    phase === 'turn' ? 'ガチャ ガチャ…' : phase === 'fall' ? 'コロン…' : phase === 'roll' ? 'ゴロン！' : phase === 'stamp' ? (pending ? `${c.to.name}のカプセル` : `${c.to.name}のカプセル！`) : 'ぱかっ！'
  // はんこを押したあとの小さな一言：中身が準備中のときは先に言う。同じ額の街がほかにもあるときは、なぜこの街かを言う
  const sub = phase === 'stamp' ? (pending ? '中身は、まだ準備中' : note) : undefined
  const CAP = 64
  const outletCenter = { x: OUT.left + OUT.w / 2, y: OUT.top + OUT.h - CAP / 2 - 6 }
  // カプセルを開ける位置。台紙（高さ226）は中心から −205 まで上がるので、上端は 286−75+70−200 = 81px（看板の下）
  const center = { x: SW / 2, y: 286 }
  return (
    <>
      <p className="va-sr" aria-live="polite">
        {at('stamp') ? `${c.to.pref}${c.to.name}のカプセルが開きました` : 'カプセルが出てきます'}
      </p>
      <MachineBody
        turning={phase === 'turn'}
        plate={!at('lift')}
        mix={{ [c.to.level]: 1 }}
        outlet={
          phase === 'roll' && (
            <motion.div
              className="absolute"
              style={{ left: OUT.w / 2 - CAP / 2, top: OUT.h - CAP - 6, width: CAP, height: CAP }}
              initial={{ x: -150, rotate: -300, y: 0 }}
              animate={{ x: 0, rotate: 0, y: [0, 0, -12, 0, -5, 0] }}
              transition={{ x: { duration: 0.32, ease: 'easeOut' }, rotate: { duration: 0.32, ease: 'easeOut' }, y: { duration: 0.55, times: [0, 0.55, 0.7, 0.82, 0.92, 1] } }}
            >
              <Capsule color={look.capsule} level={c.to.level} size={CAP} />
            </motion.div>
          )
        }
      >
        {(phase === 'turn' || phase === 'fall') && (
          <motion.div
            className="absolute"
            style={{ left: spot.x - 30, top: spot.y - 30, width: 60, height: 60 }}
            animate={phase === 'fall' ? { y: 110, rotate: 40 } : { y: [0, -6, 0], rotate: [0, -10, 0] }}
            transition={phase === 'fall' ? { duration: 0.28, ease: 'easeIn' } : { duration: 0.35, repeat: 1 }}
          >
            <Capsule color={look.capsule} level={c.to.level} size={60} />
          </motion.div>
        )}
      </MachineBody>

      {/* 取り出したあと：手前に出して、開ける */}
      <AnimatePresence>
        {at('lift') && (
          <motion.div key="veil" className="absolute inset-x-0 bottom-0 top-[70px] z-20 rounded-t-[40px]" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(31,36,48,0.18), rgba(31,36,48,0.6))' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />
        )}
      </AnimatePresence>
      {at('lift') && (
        <motion.div
          className="absolute z-30"
          style={{ left: 0, top: 0, width: 150, height: 150, marginLeft: -75, marginTop: -75 }}
          initial={{ x: outletCenter.x, y: outletCenter.y, scale: CAP / 150 }}
          animate={{ x: center.x, y: center.y, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            className="absolute left-0 top-[4px]"
            animate={at('open') ? { x: -100, y: -60, rotate: -52 } : { x: 0, y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <CapsuleTop size={150} />
          </motion.div>
          <AnimatePresence>
            {at('open') && (
              <motion.div
                className="absolute left-1/2 top-[70px] -ml-[100px] grid h-[226px] w-[200px] place-items-center rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] shadow-[4px_5px_0_var(--ink)]"
                initial={{ y: 40, scale: 0.4, opacity: 0 }}
                animate={{ y: -200, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 21 }}
              >
                <div className="relative grid h-[164px] w-[164px] place-items-center">
                  {!at('stamp') && <span className="absolute inset-[6px] rounded-full border-[3px] border-dashed border-[var(--ink-soft)]/50" />}
                  {at('stamp') && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full border-[6px]"
                        style={{ borderColor: look.ink }}
                        initial={{ scale: 0.7, opacity: 0.7 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                      <motion.div initial={{ scale: 2.3, opacity: 0, rotate: -22 }} animate={{ scale: 1, opacity: 1, rotate: -7 }} transition={{ type: 'spring', stiffness: 540, damping: 19 }}>
                        <GotouchiStamp city={c.to} size={156} />
                      </motion.div>
                      <CapsuleConfetti fireKey={c.mood >= 1 && !isHit(c) ? 1 : 0} />
                    </>
                  )}
                </div>
                <p className="-mt-1 pb-2 text-[15px] font-black">
                  {c.to.pref} {c.to.name}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute left-0 top-[74px]">
            <CapsuleBottom size={150} color={look.capsule} level={c.to.level} />
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {at('stamp') && (
          // 台紙（x 80〜280）の右、暗くした窓の上に縦書きで。台紙・はんこ・器には重ならない
          <motion.p
            aria-hidden
            className="va-pop absolute z-40 text-[36px] leading-none text-[var(--yolk)]"
            style={{ left: 293, top: 112, writingMode: 'vertical-rl', WebkitTextStroke: '7px var(--ink)', paintOrder: 'stroke', letterSpacing: '-0.04em' }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: [0, 6, 4] }}
            transition={{ duration: 0.4, times: [0, 0.6, 1] }}
          >
            ポン！
          </motion.p>
        )}
      </AnimatePresence>
      <Caption text={caption} sub={sub} top={at('lift') ? 584 : 296} />
    </>
  )
}

/* ───────── いくつも（えらんでくらべる） ───────── */

const STEP_MS = 450

function ShowMany({ list, finish }: { list: Comparison[]; finish: () => void }) {
  const n = list.length
  const [phase, setPhase] = useState<number[]>(() => list.map(() => 0)) // 0 窓の中 / 1 落ちる / 2 取り出し口 / 3 棚
  const [turning, setTurning] = useState(true)
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t: number[] = [window.setTimeout(() => setTurning(false), 650)]
    const set = (i: number, v: number) => setPhase((p) => p.map((x, j) => (j === i ? v : x)))
    list.forEach((_, i) => {
      const t0 = 700 + i * STEP_MS
      t.push(window.setTimeout(() => set(i, 1), t0))
      t.push(window.setTimeout(() => set(i, 2), t0 + 240))
      t.push(window.setTimeout(() => set(i, 3), t0 + 520))
    })
    const end = 700 + (n - 1) * STEP_MS + 880
    t.push(window.setTimeout(() => setDone(true), end))
    t.push(window.setTimeout(finish, end + 700))
    return () => t.forEach((x) => window.clearTimeout(x))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const spots = frontSpots(n, DOME.h)
  const shelfY = 600
  const slotX = (i: number) => SW / 2 + (i - (n - 1) / 2) * 66
  const latest = phase.reduce((a, p, i) => (p >= 1 ? i : a), -1)
  // 回し終わってから最初のカプセルが落ちるまでは「ガチャ ガチャ…」のまま（ちらつかせない）
  const caption = done ? 'そろった！ くらべ棚へ' : latest >= 0 ? `${list[latest].to.name}！` : 'ガチャ ガチャ…'
  const CAP = 56
  return (
    <>
      <p className="va-sr" aria-live="polite">
        {done ? `${n}個のカプセルが、くらべ棚にそろいました` : '入れたカプセルが、順に出てきます'}
      </p>
      <MachineBody
        turning={turning}
        dim
        mix={{ detailed: 1, pref: 1, basic: 1 }}
        outlet={list.map((c, i) =>
          phase[i] === 2 ? (
            <motion.div
              key={c.to.id}
              className="absolute"
              style={{ left: OUT.w / 2 - CAP / 2, top: OUT.h - CAP - 6, width: CAP, height: CAP }}
              initial={{ x: -140, rotate: -280 }}
              animate={{ x: 0, rotate: 0, y: [0, -8, 0] }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              <NamedCap c={c} size={CAP} />
            </motion.div>
          ) : null,
        )}
      >
        {list.map((c, i) =>
          phase[i] <= 1 ? (
            <motion.div
              key={c.to.id}
              className="absolute"
              style={{ left: spots[i].x - 30, top: spots[i].y - 30, width: 60, height: 60 }}
              animate={phase[i] === 1 ? { y: 110, rotate: 30 } : turning ? { y: [0, -5, 0], rotate: [0, (i % 2 ? 1 : -1) * 10, 0] } : { y: 0 }}
              transition={phase[i] === 1 ? { duration: 0.24, ease: 'easeIn' } : { duration: 0.32, repeat: turning ? 1 : 0 }}
            >
              <NamedCap c={c} size={60} />
            </motion.div>
          ) : null,
        )}
      </MachineBody>

      {/* くらべ棚 */}
      <div className="absolute inset-x-[10px] z-10" style={{ top: shelfY + 26 }}>
        <div className="h-[16px] rounded-[6px] border-[3px] border-[var(--ink)] bg-[#e8c48a]" />
        <div className="mx-3 h-[10px] rounded-b-[6px] border-[3px] border-t-0 border-[var(--ink)] bg-[#c9a46a]" />
        <p className="absolute left-2 top-[30px] rounded-[6px] border-2 border-[var(--ink)] bg-[var(--paper)] px-1.5 text-[12px] font-black">くらべ棚</p>
      </div>
      {list.map((c, i) =>
        phase[i] === 3 ? (
          <motion.div
            key={c.to.id}
            className="absolute z-30"
            style={{ left: 0, top: 0, width: CAP, height: CAP, marginLeft: -CAP / 2, marginTop: -CAP / 2 }}
            initial={{ x: OUT.left + OUT.w / 2, y: OUT.top + OUT.h - CAP / 2 - 6 }}
            animate={{ x: slotX(i), y: [OUT.top + OUT.h - CAP / 2 - 6, OUT.top - 20, shelfY] }}
            transition={{ x: { duration: 0.36, ease: 'easeOut' }, y: { duration: 0.36, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] } }}
          >
            <NamedCap c={c} size={CAP} />
          </motion.div>
        ) : null,
      )}
      <Caption text={caption} />
    </>
  )
}

// 吹き出し。切りかわるときは古い文字をすぐ消して、新しい文字をポンと出す（2つが重ならないように、退場の動きは付けない）
function Caption({ text, sub, top = 296 }: { text: string; sub?: string; top?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 z-40 flex justify-center" style={{ top }}>
      <motion.div
        key={text}
        className="flex flex-col items-center rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-[var(--ink)] shadow-[3px_4px_0_var(--ink)]"
        initial={{ y: 10, scale: 0.85 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 560, damping: 24 }}
      >
        <span className="va-pop whitespace-nowrap text-[20px] leading-none">{text}</span>
        {sub && <span className="mt-1 whitespace-nowrap text-[13px] font-black leading-none text-[var(--ink-soft)]">{sub}</span>}
      </motion.div>
    </div>
  )
}

/* ───────── 外枠（とばす・読み上げ・大きさ合わせ） ───────── */

export function GachaShow({ list, many = false, onDone, note }: { list: Comparison[]; many?: boolean; onDone: () => void; note?: string }) {
  const k = useStageScale()
  const skipRef = useRef<HTMLButtonElement>(null)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <motion.div
      className="va-dots fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={many ? '入れたカプセルが出てくるところ' : 'カプセルが出てくるところ'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div style={{ width: SW * k, height: SH * k }} className="relative">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: SW, height: SH, transform: `scale(${k})` }}>
          {many ? <ShowMany list={list} finish={finish} /> : <ShowOne c={list[0]} finish={finish} note={note} />}
        </div>
      </div>
      <button
        ref={skipRef}
        type="button"
        onClick={finish}
        className="va-push fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-4 z-[60] px-5 py-2 text-[15px] font-black"
        style={{ background: 'var(--paper)' }}
      >
        とばす
      </button>
    </motion.div>
  )
}
