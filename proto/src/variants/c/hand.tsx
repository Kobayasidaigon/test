/**
 * 案C「街カード」— ほかの候補を「手札」にして、横にスワイプして選ぶ。
 *
 * 21st から借りた部品（詳しくは CREDITS.md）
 * - Card Hand Gallery — ruixen.ui
 *   https://21st.dev/@ruixen.ui/components/card-hand-gallery
 *   手札の真ん中からの距離で、角度と沈み込みを決める扇の計算（rotate = ずれ × 角度、y = |rotate| × 1.9）と、
 *   選んだ1枚だけを持ち上げる見せ方、真ん中のカードの説明だけを横（ここでは下）に出す作り、
 *   動きを減らす設定では扇を平らにする扱いを借りた。
 *   変えたもの: 決まった位置の扇ではなく、スナップ付きの横スクロールに乗せ、スクロール位置から毎フレーム
 *   角度・沈み込み・重なり順を計算する。画像のカードを街カード（小）に、
 *   上へはじいて引き抜く操作を「タップで表に出す」に変えた。
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Comparison } from '@/shared'
import { cn } from '@/lib/utils'
import { CardFront } from './card'
import { fmtYen, leanOf } from './lib'

const short = (c: Comparison) => {
  const l = leanOf(c.perYear)
  if (l === 'to') return `年 +${fmtYen(c.perYear)}`
  if (l === 'from') return `${c.from.name}のままが 年${fmtYen(-c.perYear)}お得`
  return 'ほぼ同じ'
}

export function Hand({ cmps, active, onPick }: { cmps: Comparison[]; active: number; onPick: (i: number) => void }) {
  const reduce = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const [center, setCenter] = useState(0)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      let best = 0
      let bestD = Infinity
      items.current.forEach((it, i) => {
        if (!it) return
        const b = it.getBoundingClientRect()
        const raw = (b.left + b.width / 2 - cx) / b.width
        const off = Math.max(-2.6, Math.min(2.6, raw))
        if (Math.abs(raw) < bestD) { bestD = Math.abs(raw); best = i }
        const rot = reduce ? 0 : off * 7
        it.style.setProperty('--fan-r', `${rot.toFixed(2)}deg`)
        it.style.setProperty('--fan-y', `${(Math.abs(rot) * 1.9).toFixed(1)}px`)
        it.style.zIndex = String(100 - Math.round(Math.abs(raw) * 10))
      })
      setCenter(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    el.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      el.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [cmps, reduce])

  const go = (i: number) => {
    const el = scroller.current
    const it = items.current[i]
    if (!el || !it) return
    const r = el.getBoundingClientRect()
    const b = it.getBoundingClientRect()
    el.scrollBy({ left: b.left + b.width / 2 - (r.left + r.width / 2), behavior: reduce ? 'auto' : 'smooth' })
  }

  const c = cmps[center]
  return (
    <div className="vc-hand">
      <div className="vc-hand-scroll" ref={scroller}>
        <ul className="vc-hand-row">
          {cmps.map((x, i) => (
            <li key={x.to.id} ref={(el) => { items.current[i] = el }} className={cn('vc-hand-item', i === active && 'is-active', i === center && 'is-center')}>
              <button type="button" className="vc-hand-btn" aria-pressed={i === active} onClick={() => onPick(i)}
                aria-label={`${i + 1}枚目 ${x.to.pref}${x.to.name}: ${x.headline}。${i === active ? 'いま表に出ているカード' : 'タップで表に出す'}`}>
                <span className="vc-hand-card">
                  <span className="vc-hand-scene"><CardFront city={x.to} cmp={x} role="to" compact /></span>
                </span>
              </button>
              {i === active && <span className="vc-hand-now" aria-hidden>表に出ている</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="vc-hand-info" aria-hidden>
        <AnimatePresence mode="wait" initial={false}>
          {c && (
            <motion.p key={c.to.id} className="vc-hand-cap"
              initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
              <span className="vc-hand-no">{center + 1}/{cmps.length}</span>
              <b>{c.to.name}</b>
              <span>{short(c)}</span>
              {center !== active && <em>タップで表に出す</em>}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="vc-hand-nav">
        <button type="button" className="vc-round" onClick={() => go(Math.max(0, center - 1))} aria-label="手札を左へ送る" disabled={center === 0}><ChevronLeft aria-hidden strokeWidth={2.6} /></button>
        <span className="vc-hand-hint" aria-hidden>指で横にスワイプ</span>
        <button type="button" className="vc-round" onClick={() => go(Math.min(cmps.length - 1, center + 1))} aria-label="手札を右へ送る" disabled={center === cmps.length - 1}><ChevronRight aria-hidden strokeWidth={2.6} /></button>
      </div>
    </div>
  )
}
