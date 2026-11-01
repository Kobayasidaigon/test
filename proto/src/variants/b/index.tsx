/*
 * 案B「ドット絵の旅」— 住む街ガチャ
 * 家族はドット絵のパーティ。ハト駅長との会話で答え、きっぷを買って改札を抜けると、候補の街に着く。
 * 21st.dev から借りた部品は parts.tsx の先頭と CREDITS.md に、作者・URL・変えたところを書いている。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { CITIES, INCOME_BANDS, SAMPLE_INPUT, SAMPLE_INPUT_REMOTE, WORK_STYLES, rank, type FamilyInput } from '@/shared'
import { FIELDS, sameAsSample, type Field } from './copy'
import { Title } from './title'
import { Ask, Confirm } from './ask'
import { Gacha } from './gacha'
import { Result } from './result'
import './style.css'

type Screen = 'title' | 'ask' | 'confirm' | 'gacha' | 'result'

// 見た目の確認用: ?from=soka&income=800_1000&work=remote&kids=0,4&adults=1&years=18 で入力例を差し替えられる
function tweak(base: FamilyInput, p: URLSearchParams): FamilyInput {
  const input: FamilyInput = { ...base, children: base.children.map((c) => ({ ...c })) }
  const from = p.get('from')
  if (from && CITIES.some((c) => c.id === from)) input.fromCityId = from
  const income = p.get('income')
  if (income && INCOME_BANDS.some((b) => b.id === income)) input.income = income as FamilyInput['income']
  const work = p.get('work')
  if (work && WORK_STYLES.some((w) => w.id === work)) input.work = work as FamilyInput['work']
  const adults = p.get('adults')
  if (adults === '1' || adults === '2') input.adults = Number(adults) as 1 | 2
  const years = p.get('years')
  if (years === '1' || years === '5' || years === '18') input.years = Number(years) as 1 | 5 | 18
  const kids = p.get('kids')
  if (kids !== null) {
    input.children = kids.split(',').filter(Boolean).slice(0, 5).map((t, i) => {
      const age = Math.max(-1, Math.min(18, parseInt(t, 10) || 0))
      return { id: `u${i}`, age, nursery: age <= 2 && !t.endsWith('h') }
    })
  }
  return input
}

function readStart(): { screen: Screen; input: FamilyInput; q: number; fromUrl: boolean; tweaked: boolean } {
  const p = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const input = tweak(p.get('sample') === 'remote' ? SAMPLE_INPUT_REMOTE : SAMPLE_INPUT, p)
  const step = p.get('step')
  const tweaked = ['from', 'income', 'work', 'adults', 'years', 'kids'].some((k) => p.has(k))
  // ?step=result は入力例の結果へ直接（スクリーンショット用）。ask/confirm/gacha は見た目の確認用。
  if (step === 'result') return { screen: 'result', input, q: 0, fromUrl: true, tweaked }
  if (step === 'ask') return { screen: 'ask', input, q: Math.min(FIELDS.length - 1, Math.max(0, Number(p.get('q') ?? 0) || 0)), fromUrl: true, tweaked }
  if (step === 'confirm') return { screen: 'confirm', input, q: 0, fromUrl: true, tweaked }
  if (step === 'gacha') return { screen: 'gacha', input, q: 0, fromUrl: true, tweaked }
  return { screen: 'title', input, q: 0, fromUrl: false, tweaked }
}

export default function VariantB() {
  const start = useMemo(readStart, [])
  const reduce = useReducedMotion()
  const [screen, setScreen] = useState<Screen>(start.screen)
  const [input, setInput] = useState<FamilyInput>(start.input)
  const [q, setQRaw] = useState(start.q)
  const [reached, setReached] = useState(start.fromUrl ? FIELDS.length : 0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set())
  const [touched, setTouched] = useState<Set<Field>>(() => new Set())
  const [pick, setPick] = useState(0)
  const [afterGacha, setAfterGacha] = useState(false)
  const results = useMemo(() => rank(input), [input])

  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }, [])

  const setQ = (i: number) => {
    setVisited((v) => new Set(v).add(q))
    setQRaw(i)
    setReached((r) => Math.max(r, i))
    if (screen !== 'ask') go('ask')
  }
  const touch = (f: Field) => setTouched((t) => (t.has(f) ? t : new Set(t).add(f)))

  // 質問が変わったら、読み上げ用に見出しへフォーカスを移す
  useEffect(() => {
    if (screen !== 'ask') return
    const h = document.querySelector<HTMLElement>('.vb-window')
    h?.setAttribute('tabindex', '-1')
    h?.focus({ preventScroll: true })
  }, [q, screen])

  const finishAsk = () => {
    setVisited((v) => new Set(v).add(q))
    setReached(FIELDS.length)
    go('confirm')
  }
  const startGacha = () => {
    setPick(0)
    setAfterGacha(false)
    // 動きを減らす設定の人には演出を出さない
    go(reduce || !results.length ? 'result' : 'gacha')
  }
  const untouchedSample = FIELDS.some((f) => !touched.has(f) && sameAsSample(input, f))
  const sampleNote = start.fromUrl && touched.size === 0 ? (start.tweaked ? '入力例をもとにした条件です' : '入力例の家族で計算しています') : untouchedSample ? '入力例の項目をふくみます' : null

  return (
    <MotionConfig reducedMotion="user">
      <div className="vb">
        {screen === 'title' && <Title onStart={() => { setQRaw(0); go('ask') }} />}
        {screen === 'ask' && (
          <Ask input={input} setInput={setInput} q={q} setQ={setQ} reached={reached} visited={visited}
            onBack={() => go('title')} onFinish={finishAsk} touched={touched} touch={touch} />
        )}
        {screen === 'confirm' && <Confirm input={input} touched={touched} onEdit={(i) => setQ(i)} onGo={startGacha} />}
        {screen === 'gacha' && results[0] && <Gacha input={input} top={results[0]} onDone={() => { setAfterGacha(true); go('result') }} />}
        {screen === 'result' && (
          <Result input={input} results={results} pick={pick} setPick={setPick} sampleNote={sampleNote} afterGacha={afterGacha}
            onRetry={() => go('confirm')}
            onRemote={() => { setInput({ ...input, work: 'remote' }); touch('work'); setPick(0) }} />
        )}
      </div>
    </MotionConfig>
  )
}
