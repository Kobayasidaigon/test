/**
 * 案C「街カード」— ガチャの演出: 山札をまぜて、1枚が飛び出して裏返る（約3.5秒・とばせる）。
 * 結果は計算で決まっている。まぜるのは演出だけで、出てくる1枚は rank() のいちばん上。
 *
 * 21st から借りた部品（詳しくは CREDITS.md）
 * - Card stack — motiondotdev（Motion 公式の例）
 *   https://21st.dev/@motiondotdev/components/motion-card-stack
 *   山札の1枚ずつに sin(index) で決まる「置いたときの小さな傾き」を持たせ、
 *   重なり順で少しずつずらす考え方。指で1枚ずつ送る代わりに、山を左右に割ってまぜる動き（リフル）を
 *   motion の useAnimate のシーケンスで組んだ。
 * - Tilt Flip Card — cesaroeduardo（https://21st.dev/@cesaroeduardo/components/flip-card）
 *   表と裏を backface-visibility で重ねて rotateY で返す構成（card.tsx と同じ考え方）。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, stagger, useAnimate } from 'motion/react'
import { FastForward } from 'lucide-react'
import type { Comparison, FamilyInput } from '@/shared'
import { cityById } from '@/shared'
import { CardFront, DeckBack } from './card'
import { meta, yearsShort } from './lib'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Gacha({ cmps, input, onDone }: { cmps: Comparison[]; input: FamilyInput; onDone: () => void }) {
  const [scope, animate] = useAnimate()
  const [phase, setPhase] = useState<'mix' | 'rise' | 'open'>('mix')
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  const top = cmps[0]
  const n = Math.min(Math.max(cmps.length, 1), 9)
  const under = Array.from({ length: n - 1 }, (_, i) => i)
  const ink = meta(top.to.id).ink

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await animate('.vc-dk', { opacity: [0, 1], y: [36, 0] }, { duration: 0.26, delay: stagger(0.025) })
        if (!alive) return
        for (let k = 0; k < 2; k++) {
          await Promise.all([
            animate('.vc-dk.is-l', { x: [0, -88, 0], rotate: [0, -10, 0], y: [0, -8, 0] }, { duration: 0.46, delay: stagger(0.03), ease: 'easeInOut' }),
            animate('.vc-dk.is-r', { x: [0, 88, 0], rotate: [0, 10, 0], y: [0, -8, 0] }, { duration: 0.46, delay: stagger(0.03, { from: 'last' }), ease: 'easeInOut' }),
          ])
          if (!alive) return
        }
        setPhase('rise')
        await animate('.vc-pick', { y: -118, scale: 1.14, rotate: [0, -5, 0] }, { duration: 0.5, ease: [0.2, 0.9, 0.3, 1.15] })
        if (!alive) return
        await animate('.vc-pick-flip', { rotateY: [180, 0] }, { duration: 0.62, ease: [0.3, 0.6, 0.25, 1] })
        if (!alive) return
        setPhase('open')
        await wait(700)
        if (alive) finish()
      } catch {
        if (alive) finish()
      }
    })()
    return () => { alive = false }
    // 一度だけ流す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const from = cityById(input.fromCityId)
  const caption = phase === 'mix' ? `街カード ${n}枚を まぜています` : phase === 'rise' ? '1枚、出てきました' : `${top.to.name}のカード`

  return (
    <div className="vc-gacha" ref={scope}>
      <div className="vc-gacha-top">
        <p className="vc-gacha-ctx">{from.name}から・大人{input.adults}人・子ども{input.children.length}人・{yearsShort(input)}</p>
        <h1 className="vc-gacha-cap" aria-live="polite">{caption}</h1>
        <p className="vc-gacha-sub">どのカードが出るかは、入力した家族の数字で決まっています。まぜるのは演出です。</p>
      </div>

      <div className="vc-deck" aria-hidden>
        <div className="vc-deck-mat"><span>山札 {n}枚</span></div>
        {under.map((i) => (
          <div key={i} className={`vc-dk ${i % 2 ? 'is-l' : 'is-r'}`} style={{ zIndex: i + 1, opacity: 0, '--i': i } as CSSProperties}>
            <div className="vc-dk-in" style={{ transform: `translate(${Math.sin(i * 2.1) * 3}px, ${-i * 1.6}px) rotate(${Math.sin(i + 1) * 4}deg)` }}>
              <div className="vc-dk-face"><DeckBack /></div>
            </div>
          </div>
        ))}
        <div className={`vc-dk vc-pick is-r ${phase === 'open' ? 'is-open' : ''}`} style={{ zIndex: 50, opacity: 0, '--ink': ink } as CSSProperties}>
          <div className="vc-dk-in" style={{ transform: `translate(0, ${-(n - 1) * 1.6}px)` }}>
            <div className="vc-pick-flip" style={{ transform: 'rotateY(180deg)' }}>
              <div className="vc-pick-face vc-pick-front">
                <div className="vc-pick-scene"><CardFront city={top.to} cmp={top} role="to" /></div>
                <span className="vc-pick-sweep" />
              </div>
              <div className="vc-pick-face vc-pick-back"><DeckBack /></div>
            </div>
          </div>
          {phase === 'open' && (
            <div className="vc-burst">
              {Array.from({ length: 14 }, (_, k) => {
                // カードの縁から外へ、小さな紙片が散る（色はこの街のインク・金・生成り）
                const a = (k / 14) * Math.PI * 2 + 0.2
                const far = 1.9 + (k % 3) * 0.35
                return (
                  <motion.span key={k} className="vc-burst-bit"
                    style={{ background: k % 3 === 0 ? '#D9A21B' : k % 3 === 1 ? ink : '#FFFCF4' }}
                    initial={{ x: Math.cos(a) * 100, y: Math.sin(a) * 135, opacity: 0, rotate: 0, scale: 0.4 }}
                    animate={{ x: Math.cos(a) * 100 * far, y: Math.sin(a) * 135 * far, opacity: [0, 1, 1, 0], rotate: k * 53, scale: 1 }}
                    transition={{ duration: 0.9, ease: [0.15, 0.8, 0.3, 1], opacity: { duration: 0.9, times: [0, 0.15, 0.7, 1] } }} />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="vc-gacha-foot">
        <button type="button" className="vc-skip" onClick={finish}>
          <FastForward aria-hidden strokeWidth={2.4} />
          とばして結果へ
        </button>
      </div>
    </div>
  )
}
