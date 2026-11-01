/*
MIT License

Copyright (c) 2025 kokonutUI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*
 * 案D「家計レシート」 — ガチャの演出: レジのプリンターから、レシートがジジジと1行ずつ出てくる。
 *
 * 21st「Kokonut UI Receipt Printer」（kokonutd / @dorianbaffier, MIT）
 *   https://21st.dev/@kokonutd/components/kokonut-receipt-printer
 *   借りたもの: 1行送っては止まる送り方（LINE・FEED_RATE・LINE_PAUSE・LINE_JITTER と、目標へ寄せていく式）、
 *   紙を送っている間だけ本体がぶるっと震えるしかけ、ちぎるときの小さな振動。
 *   変えたもの: 紙は下に垂れるのではなく、本物のレジのように上へ出てくる（先に印字した見出しが上に来る）。
 *   物理で揺らす・引っぱってちぎる部分はやめ、印字が終わったら「チリッ」と自動で切れて結果へ。
 * 21st「Checkout Till」（aadilghani1） https://21st.dev/@aadilghani1/components/checkout-till
 *   考え方だけ借りた（react-isokit が要るので作り直し）: 合計キーで信号が届くとプリンターのランプが点き、
 *   紙のロールが回って紙が出る。ここでは「ガチャン！」で始まり、表示窓・ランプ・ロールの窓を平面の絵で描いた。
 */
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Comparison, FamilyInput } from '@/shared/types'
import { MiniReceipt } from './receipt'

const FEED_RATE = 30
const LINE_PAUSE = 0.05
const LINE_JITTER = 0.045

type Phase = 'clunk' | 'printing' | 'tear' | 'fly'

function haptic(ms = 10) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
  } catch {
    /* 振動できない端末は何もしない */
  }
}

function PrinterArt({ phase, rollRef }: { phase: Phase; rollRef: RefObject<SVGGElement> }) {
  const teeth = 'l4 4 l4 -4 '.repeat(35)
  const lcd = phase === 'clunk' ? '計算中…' : phase === 'printing' ? '印字中' : 'できた'
  return (
    <svg viewBox="0 0 360 150" width="100%" aria-hidden="true" style={{ display: 'block' }}>
      <rect x={8} y={4} width={344} height={140} rx={20} fill="#ece6da" />
      <rect x={8} y={118} width={344} height={26} rx={18} fill="#ddd4c4" />
      <rect x={8} y={118} width={344} height={10} fill="#ddd4c4" />
      <path d="M8 118 H352" stroke="#cfc5b3" strokeWidth={1.4} />
      <rect x={8} y={4} width={344} height={36} rx={20} fill="#f5f0e7" />
      <rect x={8} y={24} width={344} height={16} fill="#f5f0e7" />
      <rect x={36} y={7} width={288} height={10} rx={5} fill="#2a2730" />
      <path d={`M40 17 ${teeth}`} fill="#a7acb1" />
      <rect x={28} y={52} width={132} height={40} rx={7} fill="#26302a" />
      <text x={94} y={78} textAnchor="middle" fontSize={15} fontWeight={700} fill="#bfe8a0" letterSpacing={1}>
        {lcd}
      </text>
      <circle cx={180} cy={63} r={5.4} fill={phase === 'clunk' ? '#f1c232' : '#6cd06c'} className={phase === 'printing' ? 'vd-led-on' : undefined} />
      <rect x={194} y={54} width={50} height={19} rx={9.5} fill="#ddd4c4" />
      <text x={219} y={67.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#8a8178" letterSpacing={1}>
        FEED
      </text>
      <text x={30} y={109} fontSize={11.5} fontWeight={700} fill="#9a9184" letterSpacing={2}>
        住む街ガチャ
      </text>
      <circle cx={298} cy={88} r={27} fill="#3a3540" />
      <g transform="translate(298 88)">
        <g ref={rollRef}>
          <circle r={20.5} fill="#fffdf7" />
          <circle r={14.5} fill="none" stroke="#efe8da" strokeWidth={1.4} />
          <path d="M0 -7 V-18.5 M6 3.5 L16 9.3 M-6 3.5 L-16 9.3" stroke="#d9cfbd" strokeWidth={2} strokeLinecap="round" />
          <circle r={7} fill="#c8bfae" />
        </g>
      </g>
    </svg>
  )
}

export function GachaShow({ c, input, onDone }: { c: Comparison; input: FamilyInput; onDone: () => void }) {
  const paperRef = useRef<HTMLDivElement>(null)
  const printerRef = useRef<HTMLDivElement>(null)
  const rollRef = useRef<SVGGElement>(null)
  const [phase, setPhase] = useState<Phase>('clunk')
  const done = useRef(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const skipRef = useRef<HTMLButtonElement>(null)
  // 親が描き直しても演出が最初からにならないよう、終わりの合図は ref から呼ぶ
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    doneRef.current()
  }, [])

  // 開いたら「とばす」にフォーカス。Esc でもとばせる
  useLayoutEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  // 最初の描画の前に紙をプリンターの中へ隠す（一瞬見えてしまわないように）
  useLayoutEffect(() => {
    const paper = paperRef.current
    if (!paper) return
    const H = paper.offsetHeight
    const LINE = Math.max(16, H / 22)
    const s = { hidden: H, target: H, pause: 0, last: 0, raf: 0, angle: 0 }
    paper.style.transform = `translate3d(0, ${H}px, 0)`
    const timers: number[] = []

    const tick = (now: number) => {
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 1 / 60
      s.last = now
      // サーマルプリンターは少しずつ送る: 1行送って、止まって、また送る
      if (s.pause > 0) s.pause -= dt
      else if (s.target > 0) {
        s.target = Math.max(0, s.target - LINE)
        s.pause = LINE_PAUSE + Math.random() * LINE_JITTER
      }
      s.hidden += (s.target - s.hidden) * Math.min(1, FEED_RATE * dt)
      if (Math.abs(s.hidden - s.target) < 0.05) s.hidden = s.target
      paper.style.transform = `translate3d(0, ${s.hidden.toFixed(2)}px, 0)`
      const moving = s.hidden - s.target > 0.3
      const printer = printerRef.current
      if (printer) printer.style.transform = moving ? `translate3d(${(Math.sin(now / 9) * 0.6).toFixed(2)}px, 0, 0)` : ''
      if (moving) {
        s.angle = (s.angle + dt * 620) % 360
        rollRef.current?.setAttribute('transform', `rotate(${s.angle.toFixed(1)})`)
      }
      if (s.hidden === 0 && s.target === 0) {
        if (printer) printer.style.transform = ''
        haptic(14)
        setPhase('tear')
        timers.push(window.setTimeout(() => setPhase('fly'), 420))
        timers.push(window.setTimeout(finish, 420 + 460))
        return
      }
      s.raf = requestAnimationFrame(tick)
    }

    haptic(8)
    timers.push(
      window.setTimeout(() => {
        setPhase('printing')
        s.raf = requestAnimationFrame(tick)
      }, 560),
    )
    return () => {
      cancelAnimationFrame(s.raf)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [finish])

  const word = phase === 'clunk' ? 'ガチャン！' : phase === 'printing' ? 'ジジジ…' : 'チリッ'
  const vertical = phase !== 'clunk'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="ガチャの演出。レシートを印字しています"
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: 'var(--wall)', backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 26px, var(--wall-line) 26px 28px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <svg aria-hidden="true" viewBox="0 0 60 44" width={60} height={44} className="absolute left-1/2 top-0 -ml-[30px]">
        <line x1={30} y1={0} x2={30} y2={18} stroke="#5a4636" strokeWidth={1.6} />
        <path d="M15 34 L22 18 H38 L45 34Z" fill="#e7b65a" />
        <ellipse cx={30} cy={34} rx={15} ry={2.6} fill="#c9902f" />
        <circle cx={30} cy={37} r={4} fill="var(--lamp)" />
      </svg>
      <div className="relative mx-auto flex h-full w-full max-w-[400px] flex-col px-4">
        <div className="flex flex-none items-center justify-between pb-2 pt-3">
          <p className="text-[13px] font-bold tracking-[0.2em] text-[var(--ink-2)]">お会計中</p>
          <button ref={skipRef} type="button" className="vd-btn vd-btn--paper !min-h-[44px] !px-4 !text-[15px]" onClick={finish} aria-label="演出をとばして結果を見る">
            とばす
          </button>
        </div>
        <div className="min-h-[6px] flex-1" />
        <div className={`relative flex min-h-0 flex-col justify-end ${phase === 'printing' || phase === 'clunk' ? 'overflow-hidden' : 'overflow-visible'}`} style={{ flex: '0 1 auto' }}>
          <motion.div
            className="mx-auto w-[74%] pt-3"
            animate={phase === 'tear' ? { y: -10 } : phase === 'fly' ? { y: '-120%', rotate: -5, opacity: 0 } : { y: 0 }}
            transition={phase === 'fly' ? { duration: 0.45, ease: [0.5, 0, 0.75, 0] } : { type: 'spring', stiffness: 500, damping: 18 }}
          >
            <div className="vd-paper-wrap">
              <div ref={paperRef} className="vd-paper" style={{ willChange: 'transform' }}>
                <MiniReceipt c={c} input={input} />
              </div>
            </div>
          </motion.div>
        </div>
        <motion.div
          className="relative z-10 -mt-[3px] flex-none"
          animate={phase === 'clunk' ? { y: [0, 6, -2, 0] } : { y: 0 }}
          transition={{ duration: 0.36, ease: 'easeOut' }}
        >
          <div ref={printerRef}>
            <PrinterArt phase={phase} rollRef={rollRef} />
          </div>
          <AnimatePresence mode="popLayout">
            <motion.p
              key={word}
              className={`vd-hand pointer-events-none absolute bottom-[calc(100%+6px)] text-[var(--red-ink)] ${
                vertical ? `whitespace-nowrap text-[clamp(18px,6vw,23px)] [writing-mode:vertical-rl] ${phase === 'printing' ? 'right-[2%]' : 'left-[2%]'}` : 'left-1 whitespace-nowrap text-[28px]'
              }`}
              initial={{ scale: 0.6, opacity: 0, rotate: vertical ? 0 : -8 }}
              animate={{ scale: 1, opacity: 1, rotate: vertical ? 4 : -6 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 20 }}
              aria-hidden="true"
            >
              <span className={phase === 'printing' ? 'vd-jiji inline-block' : 'inline-block'}>{word}</span>
            </motion.p>
          </AnimatePresence>
        </motion.div>
        <div aria-hidden="true" className="-mx-4 min-h-[34px] flex-1 border-t-[6px] border-[var(--wood-2)] bg-[var(--wood)]" style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 18px, rgba(127,77,37,.12) 18px 19px)' }} />
      </div>
      <p className="vd-sr" aria-live="polite">
        {phase === 'printing' ? 'レシートを印字しています' : phase === 'clunk' ? '計算しています' : '印字が終わりました'}
      </p>
    </motion.div>
  )
}
