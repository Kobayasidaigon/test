// 案A「カプセルトイ」 — カプセルが落ちて、はずんで、ぱかっと開いて、はんこがポン。約2.9秒。とばせる。
// 動きを減らす設定の人には出さない（index.tsx で切り替える）。
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Comparison } from '@/shared/types'
import { CapsuleBottom, CapsuleTop } from './art'
import { CapsuleConfetti } from './confetti'
import { lookOf } from './lib'
import { GotouchiStamp } from './stamp'

type Phase = 'drop' | 'land' | 'open' | 'stamp'
const ORDER: Phase[] = ['drop', 'land', 'open', 'stamp']
const T = { land: 900, open: 1300, stamp: 1650, done: 2900 }

export function GachaShow({ c, onDone }: { c: Comparison; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('drop')
  const skipRef = useRef<HTMLButtonElement>(null)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const t = [
      window.setTimeout(() => setPhase('land'), T.land),
      window.setTimeout(() => setPhase('open'), T.open),
      window.setTimeout(() => setPhase('stamp'), T.stamp),
      window.setTimeout(finish, T.done),
    ]
    return () => t.forEach((x) => window.clearTimeout(x))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const at = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p)
  const look = lookOf(c.to)
  const S = 150
  const caption = phase === 'drop' ? 'ガチャ ガチャ…' : phase === 'land' ? 'ゴロン！' : phase === 'open' ? 'ぱかっ！' : `${c.to.name}のカプセル！`

  return (
    <motion.div
      className="va-dots fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="カプセルが出てくるところ"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <p className="va-sr" aria-live="polite">
        {at('stamp') ? `${c.to.pref}${c.to.name}のカプセルが開きました` : 'カプセルが出てきます'}
      </p>
      <div className="relative h-[460px] w-[340px] max-w-[94vw]">
        {/* いまの場面のひとこと */}
        <div aria-hidden className="absolute inset-x-0 -top-[64px] flex justify-center">
          <AnimatePresence mode="popLayout">
            <motion.p
              key={caption}
              className="va-pop whitespace-nowrap text-[30px] leading-none text-[var(--ink)]"
              initial={{ y: 14, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* 筐体の下半分と、取り出し口 */}
        <div aria-hidden className="va-body absolute -inset-x-6 top-[318px] h-[100vh] rounded-t-[32px] border-[3px] border-[var(--ink)]" />
        <div aria-hidden className="absolute left-1/2 top-[340px] h-[104px] w-[250px] -translate-x-1/2 rounded-[24px] border-[3px] border-[var(--ink)] bg-[#2c3240]">
          <div className="absolute inset-x-4 top-3 h-2.5 rounded-full bg-[#4a5266]" />
        </div>

        {/* カプセル */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[284px] z-10 -ml-[75px]"
          style={{ width: S, height: 146 }}
          initial={{ y: -620, rotate: -40 }}
          animate={
            at('land')
              ? { y: 0, rotate: at('open') ? 0 : [0, -10, 9, -5, 0] }
              : { y: [-620, 0, -80, 0, -24, 0], rotate: [-40, 0, 12, 0, -4, 0] }
          }
          transition={
            at('land')
              ? { duration: 0.4, ease: 'easeInOut' }
              : { duration: 0.9, times: [0, 0.38, 0.58, 0.74, 0.88, 1], ease: ['easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'] }
          }
        >
          <motion.div
            className="absolute left-0 top-0"
            animate={at('open') ? { x: -112, y: -54, rotate: -52 } : { x: 0, y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <CapsuleTop size={S} />
          </motion.div>
          {/* 中から出てくる紙とはんこ */}
          <AnimatePresence>
            {at('open') && (
              <motion.div
                className="absolute left-1/2 top-[70px] -ml-[95px] grid h-[214px] w-[190px] place-items-center rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] shadow-[4px_5px_0_var(--ink)]"
                initial={{ y: 40, scale: 0.4, opacity: 0 }}
                animate={{ y: -236, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 21 }}
              >
                <div className="relative grid h-[160px] w-[160px] place-items-center">
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
                        <GotouchiStamp city={c.to} size={150} />
                      </motion.div>
                      <CapsuleConfetti fireKey={c.mood >= 1 ? 1 : 0} />
                    </>
                  )}
                </div>
                <p className="-mt-1 pb-2 text-[15px] font-black">
                  {c.to.pref} {c.to.name}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute left-0 top-[68px]">
            <CapsuleBottom size={S} color={look.capsule} />
          </div>
        </motion.div>

        {/* 取り出し口のふた（カプセルの下側をかくす） */}
        <div aria-hidden className="absolute left-1/2 top-[402px] z-20 h-[50px] w-[266px] -translate-x-1/2 rounded-[16px] border-[3px] border-[var(--ink)] bg-[var(--metal)]">
          <div className="absolute inset-x-5 top-2 h-2 rounded-full bg-white/80" />
          <p className="absolute inset-x-0 bottom-1.5 text-center text-[11px] font-black text-[var(--ink-soft)]">とりだしぐち</p>
        </div>

        {/* ポン！ */}
        <AnimatePresence>
          {at('stamp') && (
            <motion.p
              aria-hidden
              className="va-pop absolute -right-1 top-[86px] z-30 rotate-[10deg] text-[38px] leading-none text-[var(--red)]"
              style={{ WebkitTextStroke: '2px var(--ink)', paintOrder: 'stroke' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1], opacity: 1 }}
              transition={{ duration: 0.4, times: [0, 0.6, 1] }}
            >
              ポン！
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        ref={skipRef}
        type="button"
        onClick={finish}
        className="va-push fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-4 z-40 px-5 py-2 text-[15px] font-black"
        style={{ background: 'var(--paper)' }}
      >
        とばす
      </button>
    </motion.div>
  )
}
