// 案B「ドット絵の旅」— ガチャの演出（きっぷ → 改札 → 光 → 候補の街に着く）。3.5秒ほど。とばせる。
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Comparison, FamilyInput } from '@/shared'
import { cn } from '@/lib/utils'
import { membersOf } from './pixel'
import { PixelButton } from './parts'
import { Clouds, Gate, Ground, Party, Scene, Sky, StationSign, Town, toneOf } from './scene'

const H = 96, BASE = 66
const T = { ticket: 500, pass: 1250, wipe: 2150, arrive: 2550, done: 3600 }

function Wipe({ mode }: { mode: 'cover' | 'open' | null }) {
  if (!mode) return null
  const cells = []
  for (let r = 0; r < 9; r++) for (let c = 0; c < 13; c++) cells.push(<span key={`${r}-${c}`} style={{ ['--d' as string]: c + r }} />)
  return <div className={cn('vb-wipe', mode === 'cover' ? 'is-cover' : 'is-open')} aria-hidden>{cells}</div>
}

export function Gacha({ input, top, onDone }: { input: FamilyInput; top: Comparison; onDone: () => void }) {
  const members = useMemo(() => membersOf(input), [input])
  const [phase, setPhase] = useState<'walk' | 'ticket' | 'pass' | 'wipe' | 'arrive'>('walk')
  const skipRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const ts = [
      setTimeout(() => setPhase('ticket'), T.ticket),
      setTimeout(() => setPhase('pass'), T.pass),
      setTimeout(() => setPhase('wipe'), T.wipe),
      setTimeout(() => setPhase('arrive'), T.arrive),
      setTimeout(() => doneRef.current(), T.done),
    ]
    return () => ts.forEach(clearTimeout)
  }, [])

  const arrived = phase === 'arrive'
  const city = arrived ? top.to : top.from
  const tone = toneOf(city)
  const groupX = phase === 'walk' || phase === 'ticket' ? 0 : phase === 'pass' || phase === 'wipe' ? 96 : 0
  return (
    <div className="vb-gacha" role="dialog" aria-modal="true" aria-label="ガチャの演出">
      <div className="vb-gacha__top">
        <p className="vb-gacha__say" aria-live="polite">
          {arrived ? `${top.to.name}に着きました` : phase === 'walk' ? 'きっぷを買って、改札へ…' : `${top.to.name}ゆきのきっぷ`}
        </p>
        <PixelButton ref={skipRef} tone="plain" size="sm" onClick={() => doneRef.current()}>とばす</PixelButton>
      </div>
      <div className="vb-gacha__stage">
        <Scene h={H} label={arrived ? `${top.to.name}の街並み` : `${top.from.name}の改札`} className="vb-scene--gacha">
          <Sky base={BASE} tone={tone} />
          <Clouds tone={tone} />
          <Town city={city} base={BASE} />
          <Ground base={BASE} h={H} tone={tone} />
          {!arrived && <Gate x={70} base={BASE + 6} open={phase !== 'walk' && phase !== 'ticket'} glow={phase === 'pass' || phase === 'wipe'} />}
          {arrived && <StationSign x={82} base={BASE + 3} city={top.to} prev={top.from.name} />}
          <motion.g key={arrived ? 'to' : 'from'} initial={{ x: -70 }} animate={{ x: groupX }} transition={{ duration: arrived ? 0.9 : phase === 'pass' || phase === 'wipe' ? 1.0 : 0.5, ease: 'linear' }}>
            <Party members={members} x0={4} base={H - 4} maxW={62} state={phase === 'ticket' ? 'stand' : 'walk'} pigMood="plain" />
          </motion.g>
        </Scene>
        <AnimatePresence>
          {(phase === 'ticket' || phase === 'pass') && (
            <motion.div className="vb-gacha__ticket" initial={{ y: 40, rotate: -8, scale: 0.6, opacity: 0 }} animate={{ y: 0, rotate: -3, scale: 1, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
              <span className="vb-gacha__route">{top.from.name} → {top.to.name}</span>
              <strong>{top.to.name}ゆき</strong>
              <span className="vb-gacha__stamp">計算ずみ</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Wipe mode={phase === 'wipe' ? 'cover' : phase === 'arrive' ? 'open' : null} />
      </div>
      <p className="vb-gacha__note">行き先は、入力した条件の計算で決まっています。</p>
    </div>
  )
}
