// 案C「街カード」— スタート画面
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cityById } from '@/shared'
import { CityCard } from './card'
import { Btn } from './ui'

const FAN = [
  { id: 'soka', r: -11, x: -58, y: 18 },
  { id: 'kagoshima', r: 10, x: 58, y: 16 },
  { id: 'osaka', r: -1.5, x: 0, y: 0 },
]

export function Start({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  const reduce = useReducedMotion()
  const [flip, setFlip] = useState(false)
  return (
    <div className="vc-start">
      <header className="vc-start-head">
        <p className="vc-start-kicker">家族の数字で引く、引っ越し先のカード</p>
        <h1 className="vc-start-title">住む街<span>ガチャ</span></h1>
      </header>

      <div className="vc-start-fan" aria-hidden>
        {FAN.map((f, i) => (
          <motion.div key={f.id} className={i === 2 ? 'vc-start-card is-center' : 'vc-start-card'}
            initial={reduce ? false : { y: 160, rotate: 0, opacity: 0 }}
            animate={{ x: f.x * (i === 2 ? 0 : 1), y: f.y, rotate: f.r, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 17, delay: reduce ? 0 : 0.1 + i * 0.12 }}
            style={{ zIndex: i === 2 ? 3 : 1 }}>
            <CityCard city={cityById(f.id)} role="preview" compact={i !== 2} tilt={i === 2} back="deck"
              flipped={i === 2 && flip} onTap={i === 2 ? () => setFlip((v) => !v) : undefined} />
          </motion.div>
        ))}
      </div>

      <div className="vc-start-body">
        <p className="vc-start-lead">家族と年収を入れると、引っ越し先の候補が1枚ずつ<b>街カード</b>になって出てきます。保育料や給付で、年にいくら変わるかが分かります。</p>
        <ul className="vc-start-notes">
          <li>どのカードが出るかは、入力した家族の数字で決まります。運ではありません。</li>
          <li>入力はこの端末の中だけで使い、どこにも送りません。</li>
        </ul>
        <div className="vc-start-cta">
          <Btn tone="shu" size="lg" onClick={onStart} className="vc-start-go">はじめる</Btn>
          <button type="button" className="vc-link" onClick={onSample}>入力例の結果だけ見る</button>
        </div>
      </div>
    </div>
  )
}
