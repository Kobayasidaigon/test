// 案C「街カード」— 街が1枚ずつのカードになる。トレーディングカードの手触り、でもレア度や当たり外れはない。
// 流れ: スタート → 家族カードを組み立てる（6問） → 山札をまぜて1枚めくる → 表になった街カードと、となり町くらべ
// ?step=result で入力例（SAMPLE_INPUT）の結果へ。&sample=remote で SAMPLE_INPUT_REMOTE。
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { FamilyInput } from '@/shared'
import { SAMPLE_INPUT, SAMPLE_INPUT_REMOTE, rank } from '@/shared'
import './theme.css'
import { Gacha } from './deck'
import { InputFlow } from './input'
import { Result } from './result'
import { Start } from './start'

type Screen = 'start' | 'input' | 'gacha' | 'result'

const copy = (s: FamilyInput): FamilyInput => ({ ...s, children: s.children.map((c) => ({ ...c })) })

function readUrl(): { screen: Screen; input: FamilyInput } {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('step') === 'result') return { screen: 'result', input: copy(q.get('sample') === 'remote' ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT) }
  } catch { /* プレビュー環境など */ }
  return { screen: 'start', input: copy(SAMPLE_INPUT) }
}

export default function VariantC() {
  const reduce = useReducedMotion()
  const init = useMemo(readUrl, [])
  const [screen, setScreen] = useState<Screen>(init.screen)
  const [input, setInput] = useState<FamilyInput>(init.input)
  const [pristine, setPristine] = useState(true)
  const [step, setStep] = useState(0)
  const [entered, setEntered] = useState<'gacha' | 'direct'>('direct')
  const cmps = useMemo(() => rank(input), [input])

  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  const update = (p: Partial<FamilyInput>) => {
    setInput((i) => ({ ...i, ...p }))
    setPristine(false)
  }
  const draw = () => {
    if (!cmps.length) return
    if (reduce) { setEntered('direct'); setScreen('result') } else setScreen('gacha')
  }

  return (
    <div className="vc-root">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={screen} className="vc-screen"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.22 }}>
          {screen === 'start' && (
            <Start
              onStart={() => { setStep(0); setScreen('input') }}
              onSample={() => { setInput(copy(SAMPLE_INPUT)); setPristine(true); setEntered('direct'); setScreen('result') }}
            />
          )}
          {screen === 'input' && (
            <InputFlow input={input} update={update} pristine={pristine} step={step} setStep={setStep}
              onDraw={draw} onHome={() => setScreen('start')} candidates={cmps.length} />
          )}
          {screen === 'gacha' && (
            <Gacha cmps={cmps} input={input} onDone={() => { setEntered('gacha'); setScreen('result') }} />
          )}
          {screen === 'result' && (
            <Result input={input} cmps={cmps} pristine={pristine} entered={entered}
              onRetry={() => { setStep(0); setScreen('input') }}
              onHome={() => setScreen('start')} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


