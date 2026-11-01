// 案C「街カード」— 結果: 表になった街カード、家族の表情、となり町くらべ、確認中、一度きり、名物、手札、次の一歩
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Repeat2, RotateCcw, ArrowLeft } from 'lucide-react'
import type { Breakdown, Comparison, FamilyInput } from '@/shared'
import { DATA_AS_OF, DISCLAIMER, MOOD_TEXT, everyday } from '@/shared'
import { cn } from '@/lib/utils'
import { KindIcon, Person, Piggy, faceFor } from './art'
import { CityCard } from './card'
import { Hand } from './hand'
import { KIND_LABEL, ageText, everydayLine, fmtYen, leanOf, meta, nextSteps } from './lib'
import { Btn, Conf, Sources } from './ui'

// ---------- 家族の表情（カードの下に小さく） ----------
function Faces({ input, c, pristine }: { input: FamilyInput; c: Comparison; pristine: boolean }) {
  const reduce = useReducedMotion()
  const face = faceFor(c.mood)
  const happy = c.mood > 0
  const pop = (i: number) => (reduce ? {} : {
    initial: { y: 16, opacity: 0, scale: 0.7 },
    animate: { y: 0, opacity: 1, scale: 1 },
    transition: { type: 'spring' as const, stiffness: 420, damping: 18, delay: 0.15 + i * 0.07 },
  })
  const people = input.adults + input.children.length
  return (
    <div className={cn('vc-mood', `is-m${c.mood + 2}`)}>
      <div className="vc-mood-row">
        <div className="vc-mood-fam">
          {Array.from({ length: input.adults }, (_, i) => (
            <motion.span key={`a${i}`} className="vc-mood-person" {...pop(i)}>
              <span className={cn('vc-mood-hop', happy && 'is-hop')} style={{ '--d': `${0.6 + i * 0.12}s` } as CSSProperties}>
                <Person kind="adult" seed={i} face={face} className="vc-mood-fig" />
              </span>
            </motion.span>
          ))}
          {input.children.map((k, i) => (
            <motion.span key={k.id} className="vc-mood-person is-kid" {...pop(input.adults + i)}>
              <span className={cn('vc-mood-hop', happy && 'is-hop')} style={{ '--d': `${0.6 + (input.adults + i) * 0.12}s` } as CSSProperties}>
                <Person kind={k.age < 0 ? 'baby' : 'child'} seed={i + 2} face={k.age < 0 ? 'sleep' : face} className="vc-mood-fig" />
              </span>
              <span className="vc-mood-age">{ageText(k.age)}</span>
            </motion.span>
          ))}
        </div>
        <motion.span className="vc-mood-pig" {...(reduce ? {} : {
          initial: { y: -30, opacity: 0, rotate: -12 },
          animate: { y: 0, opacity: 1, rotate: 0 },
          transition: { type: 'spring' as const, stiffness: 300, damping: 12, delay: 0.2 + people * 0.07 },
        })}>
          <Piggy mood={c.mood} className="vc-mood-pigsvg" title={`家の貯金箱: ${MOOD_TEXT[c.mood]}`} />
        </motion.span>
      </div>
      <p className="vc-mood-text">{MOOD_TEXT[c.mood]}</p>
      {pristine && <span className="vc-fam-tag is-sample">入力例の家族</span>}
    </div>
  )
}

// ---------- となり町くらべの1行 ----------
function Row({ item, c, max }: { item: Breakdown; c: Comparison; max: number }) {
  const reduce = useReducedMotion()
  const v = item.perYear ?? 0
  const lean = Math.abs(v) < 1 ? 'even' : v > 0 ? 'to' : 'from'
  const pct = lean === 'even' ? 0 : Math.max(7, (Math.abs(v) / max) * 100)
  const side = lean === 'from' ? c.from : c.to
  const amt = lean === 'even' ? '差はありません' : `${side.name}のほうが 年 約${fmtYen(v)} 得`
  const fill = (city: typeof c.to) => (
    <motion.span className="vc-bar2-fill" style={{ width: `${pct}%`, background: meta(city.id).ink }}
      initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }} />
  )
  return (
    <li className="vc-row">
      <div className="vc-row-head">
        <b>{item.label}</b>
        <span className="vc-row-who">{item.who}</span>
        <Conf c={item.confidence} />
      </div>
      <div className="vc-bar2" role="img" aria-label={`${item.label}: ${amt}`}>
        <div className="vc-bar2-half is-from">{lean === 'from' && fill(c.from)}</div>
        <span className="vc-bar2-axis" />
        <div className="vc-bar2-half is-to">{lean === 'to' && fill(c.to)}</div>
        {lean === 'even' && <span className="vc-bar2-even" />}
      </div>
      <p className={cn('vc-row-amt', `is-${lean}`)}>
        {amt}
        {lean !== 'even' && c.years > 1 && item.total !== null && <small>（{c.years}年で {fmtYen(item.total)}）</small>}
      </p>
      <p className="vc-row-plain">{item.plain}</p>
      <Sources sources={item.sources} detail={item.detail} />
    </li>
  )
}

export function Result({ input, cmps, pristine, onRetry, onHome, entered }: {
  input: FamilyInput
  cmps: Comparison[]
  pristine: boolean
  onRetry: () => void
  onHome: () => void
  /** ガチャから来たときは、カードがもう表になっている */
  entered: 'gacha' | 'direct'
}) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [live, setLive] = useState('')
  const stage = useRef<HTMLDivElement>(null)
  const c = cmps[active]

  useEffect(() => {
    if (!c) return
    const t = setTimeout(() => setLive(`${c.headline}。${MOOD_TEXT[c.mood]}`), 350)
    return () => clearTimeout(t)
  }, [c])

  const pick = (i: number) => {
    if (i === active) return
    setActive(i)
    setFlipped(false)
    stage.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const known = useMemo(() => (c ? c.items.filter((i) => !i.oneTime && i.perYear !== null) : []), [c])
  const max = useMemo(() => Math.max(1, ...known.map((i) => Math.abs(i.perYear ?? 0))), [known])

  if (!c) {
    return (
      <div className="vc-result">
        <header className="vc-bar">
          <button type="button" className="vc-logo" onClick={onHome}>住む街ガチャ</button>
        </header>
        <div className="vc-empty">
          <h1 className="vc-head-title">くらべられる街カードがありません</h1>
          <p>この働き方だと、いまの街から通える街が、試作のデータにまだありません。働き方を「リモートで働く」か「自営・フリーランス」にすると、全国の街とくらべられます。</p>
          <Btn tone="shu" size="lg" onClick={onRetry} icon={<RotateCcw aria-hidden strokeWidth={2.4} />}>条件を変える</Btn>
        </div>
      </div>
    )
  }

  const lean = leanOf(c.perYear)
  const ev = everyday(c.perYear)
  // カードを卓に配る動き（左右から少し回りながら）
  const deal = (side: -1 | 1) => (reduce ? {} : {
    initial: { x: side * 70, y: 30, rotate: side * 14, opacity: 0 },
    whileInView: { x: 0, y: 0, rotate: side * -2, opacity: 1 },
    viewport: { once: true, margin: '-60px' },
    transition: { type: 'spring' as const, stiffness: 160, damping: 17, delay: side > 0 ? 0.12 : 0 },
  })
  // 段が下から浮かぶ
  const rise = reduce ? {} : {
    initial: { y: 26, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
  }
  const once = c.items.filter((i) => i.oneTime)
  const steps = nextSteps(c, input)

  return (
    <div className="vc-result">
      <header className="vc-bar">
        <button type="button" className="vc-logo" onClick={onHome} aria-label="住む街ガチャ（はじめの画面へ）">住む街ガチャ</button>
        <button type="button" className="vc-bar-btn" onClick={onRetry}><ArrowLeft aria-hidden strokeWidth={2.4} />条件を変える</button>
      </header>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>

      <div className="vc-result-grid">
        <div className="vc-result-left">
          <div className="vc-stage" ref={stage}>
            <div className="vc-stage-zone">
              <span className="vc-zone">引いた1枚</span>
              <span className="vc-zone-sub">{c.from.name}からの引っ越し先 {active + 1}/{cmps.length}</span>
            </div>
            <div className="vc-stage-card">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={c.to.id} className="vc-stage-swap"
                  initial={entered === 'direct' && !reduce ? { rotateY: 90, opacity: 0 } : false}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
                  transition={{ duration: reduce ? 0.01 : 0.26, ease: [0.3, 0.6, 0.3, 1] }}>
                  <CityCard city={c.to} cmp={c} input={input} role="to" back="data" flipped={flipped}
                    onTap={() => setFlipped((f) => !f)} className="vc-main-card" />
                </motion.div>
              </AnimatePresence>
            </div>
            <button type="button" className="vc-flipbtn" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
              <Repeat2 aria-hidden strokeWidth={2.4} />
              {flipped ? '表にもどす' : '裏を見る（この街の制度メモ）'}
            </button>
            <p className="vc-tilt-hint" aria-hidden>カードを指でなぞると、光が動きます</p>
          </div>

          <Faces key={c.to.id} input={input} c={c} pristine={pristine} />

          <motion.section className="vc-head" key={`h-${c.to.id}`} {...(reduce ? {} : { initial: { y: 14, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.4, delay: 0.25 } })}>
            <p className="vc-head-kicker">{c.from.name} → {c.to.name}・{c.years}年でくらべると</p>
            <h1 className="vc-head-title">{c.headline}</h1>
            <p className="vc-head-sub">{c.subline}</p>
            <div className="vc-everyday">
              {lean !== 'even' && (
                <div className="vc-coinchips">
                  <span className="vc-coinchip"><small>月</small>{ev.month.replace('月 ', '')}</span>
                  <span className="vc-coinchip"><small>1日</small>{ev.day.replace('1日 ', '')}</span>
                </div>
              )}
              <p>{everydayLine(c, ev.month, ev.day)}</p>
              {lean !== 'even' && c.years > 1 && (
                <p className="vc-total">{c.years}年の合計 約{fmtYen(c.total)}（{c.total > 0 ? `${c.to.name}が得` : `${c.from.name}が得`}・一度きりのお金は別）</p>
              )}
            </div>
          </motion.section>
        </div>

        <div className="vc-result-right">
          {once.length > 0 && (
            <section className="vc-sec vc-once" aria-labelledby="vc-once-h">
              <div className="vc-once-ticket">
                <span className="vc-once-tag">一度きり</span>
                <h2 id="vc-once-h" className="vc-once-title">一度きりのお金 <span className="vc-once-amt">約{fmtYen(c.oneTime)}</span></h2>
                <p className="vc-once-lead">毎年の差（上の数字）には入れていません。家族の表情も、毎年の差だけで決めています。</p>
                {once.map((i) => (
                  <div key={i.key} className="vc-once-item">
                    <div className="vc-row-head"><b>{i.label}</b><span className="vc-row-who">{i.who}</span><Conf c={i.confidence} /></div>
                    <p className="vc-row-plain">{i.plain}</p>
                    <Sources sources={i.sources} detail={i.detail} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="vc-sec vc-cmp" aria-labelledby="vc-cmp-h">
            <h2 id="vc-cmp-h" className="vc-h2">となり町くらべ</h2>
            <p className="vc-h2-sub">いまの街のカードと、引いたカードを並べました。棒は、家計が楽になる街のほうへのびます。</p>
            <div className="vc-cmp-cards">
              <motion.div className="vc-cmp-slot" key={`f-${c.to.id}`} {...deal(-1)}>
                <span className="vc-zone">いまの街</span>
                <CityCard city={c.from} role="from" compact tilt={false} />
              </motion.div>
              <span className="vc-cmp-and" aria-hidden>と</span>
              <motion.div className="vc-cmp-slot" key={`t-${c.to.id}`} {...deal(1)}>
                <span className="vc-zone">引いた街</span>
                <CityCard city={c.to} cmp={c} role="to" compact tilt={false} />
              </motion.div>
            </div>
            {known.length > 0 ? (
              <>
                <div className="vc-legend" aria-hidden>
                  <span style={{ color: meta(c.from.id).ink }}>← {c.from.name}が得</span>
                  <span style={{ color: meta(c.to.id).ink }}>{c.to.name}が得 →</span>
                </div>
                <ul className="vc-rows">
                  {known.map((i) => <Row key={i.key} item={i} c={c} max={max} />)}
                </ul>
              </>
            ) : (
              <p className="vc-note">この家族では、毎年の差になる制度が見つかりませんでした。</p>
            )}
          </section>

          {c.unknown.length > 0 && (
            <section className="vc-sec vc-unk" aria-labelledby="vc-unk-h">
              <h2 id="vc-unk-h" className="vc-h2">確認中</h2>
              <p className="vc-h2-sub">まだ確かめていない項目です。0円にはせず、合計から外しています。</p>
              <ul className="vc-rows">
                {c.unknown.map((u) => (
                  <li key={u.key} className="vc-row vc-unk-row">
                    <div className="vc-row-head"><b>{u.label}</b><span className="vc-row-who">{u.who}</span><span className="vc-unk-tag">確認中</span></div>
                    <div className="vc-bar2 is-unknown" aria-hidden><span className="vc-bar2-q">？</span></div>
                    <p className="vc-row-plain">{u.plain}</p>
                    <Sources sources={u.sources} detail={u.detail} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <motion.section {...rise} className="vc-sec vc-pride" aria-labelledby="vc-pride-h" style={{ '--ink': meta(c.to.id).ink } as CSSProperties}>
            <h2 id="vc-pride-h" className="vc-h2">{c.to.name}の名物・有名なもの</h2>
            <ul className="vc-pride-list">
              {c.to.pride.map((p) => (
                <li key={p.label} className="vc-pride-item">
                  <span className="vc-pride-icon"><KindIcon kind={p.kind} /></span>
                  <div className="vc-pride-body">
                    <div className="vc-pride-head"><small>{KIND_LABEL[p.kind]}</small><b>{p.label}</b><Conf c={p.confidence} /></div>
                    <p>{p.fact}</p>
                    {p.source && <a className="vc-pride-src" href={p.source.url} target="_blank" rel="noopener noreferrer">出典: {p.source.label}<span className="sr-only">（新しいタブで開く）</span></a>}
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section {...rise} className="vc-sec vc-handsec" aria-labelledby="vc-hand-h">
            <h2 id="vc-hand-h" className="vc-h2">ほかの街カード</h2>
            <p className="vc-h2-sub">計算で決まった順に並んでいます。タップすると、上のカードと入れかわります。</p>
            <Hand cmps={cmps} active={active} onPick={pick} />
          </motion.section>

          <motion.section {...rise} className="vc-sec vc-next" aria-labelledby="vc-next-h">
            <h2 id="vc-next-h" className="vc-h2">次の一歩</h2>
            <ol className="vc-next-list">
              {steps.map((s, i) => (
                <li key={s.title} className="vc-next-item">
                  <span className="vc-next-no" aria-hidden>{i + 1}</span>
                  <div><b>{s.title}</b><p>{s.body}</p></div>
                </li>
              ))}
            </ol>
            <aside className="vc-pr" aria-label="広告の枠（PR）">
              <span className="vc-pr-tag">PR（提携後に表示）</span>
              <p>引っ越しの見積もりや、住まいさがしの案内が入る枠です。試作なので、リンクはありません。</p>
            </aside>
          </motion.section>

          <div className="vc-retry">
            <Btn tone="shu" size="lg" onClick={onRetry} icon={<RotateCcw aria-hidden strokeWidth={2.4} />}>条件を変えてもう1回</Btn>
          </div>

          <footer className="vc-foot">
            <p>{DISCLAIMER}</p>
            <p>データは{DATA_AS_OF}時点。入力はこの端末の中だけで使い、どこにも送っていません。</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
