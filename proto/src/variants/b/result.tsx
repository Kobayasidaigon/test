// 案B「ドット絵の旅」— 結果（到着した街・家族の表情・家計の記録）
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { DATA_AS_OF, DISCLAIMER, MOOD_TEXT, cityById, yenMan, type Breakdown, type Comparison, type FamilyInput } from '@/shared'
import { cn } from '@/lib/utils'
import { PixelArt, item, membersOf, person, pig, whoSprite } from './pixel'
import { PixelArrow, PixelButton, PixelConfetti, PixelGauge, Tag, TypeText } from './parts'
import { ConfTag, SecHead } from './common'
import { ICON_OF, dayWords, itemAmount, mainPride, nextSteps, perYearWord, prideItem } from './copy'
import { Clouds, Ground, ItemStand, Party, Scene, Sky, StationSign, Town, toneOf, REGION_COLOR, type PartyState } from './scene'
import { PIGEON, type PigMood } from './sprites'

const pigMoodOf = (mood: number): PigMood => (mood >= 1 ? 'happy' : mood <= -1 ? 'sad' : 'plain')
// 天びんは表情ではなく「量」の絵なので、毎年の差の額で傾ける
const tiltOf = (perYear: number) => {
  const a = Math.abs(perYear)
  const t = a < 10000 ? 0 : a < 100000 ? 0.6 : a < 300000 ? 1.2 : 2
  return Math.sign(perYear) * t
}

/* ───────── 到着の場面 ───────── */
function Arrival({ c, input, note, arrived }: { c: Comparison; input: FamilyInput; note: string | null; arrived: boolean }) {
  const reduce = useReducedMotion()
  const still = !!reduce || arrived
  const members = useMemo(() => membersOf(input), [input])
  const [state, setState] = useState<PartyState>(still ? (c.mood >= 1 ? 'cheer' : 'stand') : 'walk')
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => {
      setState(c.mood >= 1 ? 'cheer' : 'stand')
      if (c.mood >= 1) setBurst((b) => b + 1)
    }, arrived ? 250 : 1150)
    return () => clearTimeout(t)
  }, [c, reduce, arrived])
  const H = 100, BASE = 70
  const tone = toneOf(c.to)
  const k = mainPride(c)
  const pm = pigMoodOf(c.mood)
  const pride = c.to.pride.find((p) => !p.label.includes('保育料')) ?? c.to.pride[0]
  const label = `${c.to.name}に着いた家族。${c.mood >= 1 ? '家族はとびはねて喜んでいる' : '家族はいつもどおり'}。貯金箱は${pm === 'happy' ? 'うれしそう' : pm === 'sad' ? '少ししょんぼり' : 'いつもどおり'}。${pride ? `名物の「${pride.label}」が飾ってある` : ''}`
  return (
    <Scene h={H} label={label} className="vb-scene--arrive" overlay={<>
      <PixelConfetti burst={burst} count={c.mood >= 2 ? 60 : 34} power={c.mood >= 2 ? 30 : 24} />
      {note && <div className="vb-scene__note"><Tag tone="sample">{note}</Tag></div>}
    </>}>
      <Sky base={BASE} tone={tone} />
      <Clouds tone={tone} />
      <Town city={c.to} base={BASE} />
      <Ground base={BASE} h={H} tone={tone} />
      <ItemStand k={k} x={62} base={BASE + 3} />
      <StationSign x={84} base={BASE + 3} city={c.to} prev={c.from.name} />
      <Party members={members} x0={4} base={H - 4} maxW={78} state={state} pigMood={pm} entering={!still} />
    </Scene>
  )
}


/* ───────── 天びん（重いほうが、手厚い街） ───────── */
function Balance({ tilt, left, right }: { tilt: number; left: string; right: string }) {
  const reduce = useReducedMotion()
  const [t, setT] = useState(reduce ? tilt : 0)
  useEffect(() => {
    if (reduce) { setT(tilt); return }
    const over = tilt === 0 ? [0.6, -0.6, 0] : [tilt + Math.sign(tilt) * 0.8, tilt - Math.sign(tilt) * 0.4, tilt]
    const ts = over.map((v, i) => setTimeout(() => setT(v), 700 + i * 180))
    return () => ts.forEach(clearTimeout)
  }, [tilt, reduce])
  const W = 48
  const yAt = (x: number) => 7 + Math.round((x - 24) * t * 0.1)
  const beam: JSX.Element[] = []
  for (let x = 4; x < 44; x += 2) beam.push(<rect key={x} x={x} y={yAt(x)} width={2} height={2} fill="#2a1e17" />)
  const pan = (cx: number, color: string, coins: number, key: string) => {
    const top = yAt(cx) + 8
    return (
      <g key={key}>
        <rect x={cx - 5} y={yAt(cx) + 2} width={1} height={7} fill="#6b7177" />
        <rect x={cx + 4} y={yAt(cx) + 2} width={1} height={7} fill="#6b7177" />
        {Array.from({ length: coins }, (_, i) => <rect key={i} x={cx - 3 + (i % 2) * 3} y={top - 3 - Math.floor(i / 2) * 3} width={3} height={3} fill={i % 2 ? '#d99a1e' : '#ffcc33'} />)}
        <rect x={cx - 7} y={top} width={14} height={2} fill="#2a1e17" />
        <rect x={cx - 6} y={top + 2} width={12} height={1} fill={color} />
      </g>
    )
  }
  const heavy = tilt > 0 ? 'r' : tilt < 0 ? 'l' : 'e'
  return (
    <svg viewBox={`0 0 ${W} 30`} width={W * 2} height={60} shapeRendering="crispEdges" className="vb-balance" aria-hidden focusable="false">
      <rect x={16} y={26} width={16} height={3} fill="#2a1e17" />
      <rect x={23} y={8} width={2} height={18} fill="#5e3b22" />
      {beam}
      <rect x={21} y={4} width={6} height={5} fill="#2a1e17" />
      <rect x={22} y={5} width={4} height={3} fill="#ffcc33" />
      {pan(6, left, heavy === 'l' ? 5 : heavy === 'e' ? 2 : 1, 'l')}
      {pan(42, right, heavy === 'r' ? 5 : heavy === 'e' ? 2 : 1, 'r')}
    </svg>
  )
}

/* ───────── 見出し（ハト駅長が読み上げる） ───────── */
function Headline({ c, years }: { c: Comparison; years: number }) {
  const reduce = useReducedMotion()
  const word = perYearWord(c.perYear, c.from.name, c.to.name)
  const abs = Math.abs(c.perYear)
  const man = abs >= 1000000 ? Math.round(abs / 10000) : Math.round(abs / 1000) / 10
  const [shown, setShown] = useState(reduce ? man : 0)
  const [skip, setSkip] = useState(0)
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setShown(man), reduce ? 0 : 900)
    const a = setTimeout(() => setAnnounce(`${c.headline}。${c.subline}。${MOOD_TEXT[c.mood]}`), 300)
    return () => { clearTimeout(t); clearTimeout(a) }
  }, [man, reduce, c])
  const pm = pigMoodOf(c.mood)
  const total = Math.abs(c.total)
  return (
    <section className="vb-window vb-window--result" aria-labelledby="vb-headline" onClick={() => setSkip((s) => s + 1)}>
      <div className="vb-window__name"><PixelArt grid={PIGEON} scale={2} /><span>ハト駅長</span></div>
      <p className="vb-sr" aria-live="polite">{announce}</p>
      <p className="vb-result__kicker">
        いちばん上の候補
        <span className="vb-result__pair"><span style={{ background: REGION_COLOR[c.from.region] }} />{c.from.name}<PixelArrow className="vb-result__to" />{c.to.name}<span style={{ background: REGION_COLOR[c.to.region] }} /></span>
      </p>
      <h1 id="vb-headline" className="vb-result__headline">
        <TypeText key={c.headline} text={c.headline} speed={40} skip={skip} arrow={false} />
      </h1>
      <div className={cn('vb-amount', `vb-amount--${word.tone}`)}>
        <Balance tilt={tiltOf(c.perYear)} left={REGION_COLOR[c.from.region]} right={REGION_COLOR[c.to.region]} />
        <div className="vb-amount__body">
          {word.tone === 'even' ? (
            <>
              <span className="vb-amount__pre">毎年の差は</span>
              <span className="vb-amount__num vb-amount__num--word">1万円未満</span>
              <span className="vb-amount__post">制度では、ほぼ差がつかない</span>
            </>
          ) : (
            <>
              <span className="vb-amount__pre">{years > 1 ? `1年あたり（${years}年の平均）` : '1年で'}</span>
              <span className="vb-amount__num">
                <small>約</small>
                <NumberFlow value={shown} locales="ja-JP" format={{ maximumFractionDigits: 1 }} className="vb-flow" />
                <small>万円</small>
              </span>
              <span className="vb-amount__post">{word.tone === 'plus' ? `${c.to.name}に引っ越すと得` : `${c.from.name}のままのほうがお得`}</span>
            </>
          )}
        </div>
      </div>
      {word.tone !== 'even' && (
        <p className="vb-everyday">
          <span>{dayWords(c.perYear)}</span>
          {years > 1 && total >= 10000 && <span>{years}年で 約{yenMan(total)}</span>}
        </p>
      )}
      <p className="vb-result__sub">{c.subline}</p>
      <p className={cn('vb-mood', `vb-mood--${pm}`)}>
        <PixelArt grid={pig(pm)} scale={2} />
        <span>{MOOD_TEXT[c.mood]}</span>
      </p>
    </section>
  )
}

/* ───────── 家計の記録（項目ごと） ───────── */
function Record({ b, c, scale, i }: { b: Breakdown; c: Comparison; scale: number; i: number }) {
  const amt = itemAmount(b, c.from.name, c.to.name)
  const ws = whoSprite(b.who)
  const v = b.perYear ?? 0
  const gaugeLabel = amt.tone === 'even' ? `${b.label}: 差はほぼなし` : `${b.label}: ${amt.text}`
  return (
    <motion.article className="vb-rec vb-box" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.25 }}>
      <header className="vb-rec__head">
        <span className="vb-rec__icon"><PixelArt grid={item(ICON_OF[b.icon] ?? 'coin')} scale={3} /></span>
        <div className="vb-rec__title">
          <h3>{b.label}</h3>
          <p className="vb-rec__who"><PixelArt grid={person(ws.who, 'stand')} pal={ws.pal} scale={1} />{b.who}</p>
        </div>
        <ConfTag c={b.confidence} />
      </header>
      <p className={cn('vb-rec__amount', `is-${amt.tone}`)}>{amt.text}{amt.tone !== 'even' && c.years > 1 && <small>（{c.years}年の平均）</small>}</p>
      <PixelGauge value={v} scale={scale} leftLabel={`${c.from.name}（今）`} rightLabel={c.to.name} label={gaugeLabel} delay={i * 180} />
      <p className="vb-bubble">{b.plain}</p>
      {Math.abs(v) >= 10000 && <p className="vb-rec__day">言いかえると {dayWords(v)}</p>}
      <details className="vb-more">
        <summary>計算の中身と出典</summary>
        <p>{b.detail}</p>
        {b.sources.length ? (
          <ul>{b.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></li>)}</ul>
        ) : <p className="vb-more__none">出典はまだ付いていません（公開前に確認します）。</p>}
      </details>
    </motion.article>
  )
}

function Unknowns({ c }: { c: Comparison }) {
  if (!c.unknown.length) return null
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-unknown">
      <SecHead icon={<PixelArt grid={item('barrier')} scale={2} />} sub="まだ確かめられていないので、0円としては数えていません。">
        <span id="vb-sec-unknown">確認中のこと</span>
      </SecHead>
      {c.unknown.map((u) => (
        <article key={u.key} className="vb-rec vb-rec--wip vb-box">
          <header className="vb-rec__head">
            <span className="vb-rec__icon"><PixelArt grid={item(ICON_OF[u.icon] ?? 'coin')} scale={3} /></span>
            <div className="vb-rec__title"><h3>{u.label}</h3><p className="vb-rec__who">{u.who}</p></div>
            <Tag tone="temp">確認中</Tag>
          </header>
          <p className="vb-bubble">{u.plain}</p>
          <details className="vb-more">
            <summary>いまわかっていること</summary>
            <p>{u.detail}</p>
            {!!u.sources.length && <ul>{u.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></li>)}</ul>}
          </details>
        </article>
      ))}
    </section>
  )
}

function OneTime({ c }: { c: Comparison }) {
  const list = c.items.filter((i) => i.oneTime)
  if (!list.length) return null
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-once">
      <SecHead icon={<PixelArt grid={item('gift')} scale={2} />} sub="毎年の差とは別に数えています。表情にも入れていません。">
        <span id="vb-sec-once">一度きりのお金</span>
      </SecHead>
      {list.map((b) => (
        <article key={b.key} className="vb-rec vb-rec--once vb-box">
          <header className="vb-rec__head">
            <span className="vb-rec__icon"><PixelArt grid={item('suitcase')} scale={3} /></span>
            <div className="vb-rec__title"><h3>{b.label}</h3><p className="vb-rec__who">{b.who}</p></div>
            <ConfTag c={b.confidence} />
          </header>
          <p className="vb-once__amount"><small>一度だけ</small> 約{yenMan(b.total ?? 0, 0)}</p>
          <p className="vb-bubble">{b.plain}</p>
          <details className="vb-more">
            <summary>条件と出典</summary>
            <p>{b.detail}</p>
            {!!b.sources.length && <ul>{b.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></li>)}</ul>}
          </details>
        </article>
      ))}
    </section>
  )
}

function Pride({ c }: { c: Comparison }) {
  if (!c.to.pride.length) return null
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-pride">
      <SecHead icon={<PixelArt grid={item('sparkle')} scale={3} />} sub={`${c.to.name}で知られていること`}>
        <span id="vb-sec-pride">この街の名物</span>
      </SecHead>
      <ul className="vb-pride">
        {c.to.pride.map((p) => (
          <li key={p.label} className="vb-box">
            <span className="vb-pride__art"><PixelArt grid={item(prideItem(c.to.id, p.label, p.kind))} scale={3} /></span>
            <div>
              <p className="vb-pride__label">{p.label} <ConfTag c={p.confidence} /></p>
              <p className="vb-pride__fact">{p.fact}</p>
              {p.source && <a className="vb-pride__src" href={p.source.url} target="_blank" rel="noreferrer noopener">出典: {p.source.label}</a>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RouteMap({ results, pick, onPick }: { results: Comparison[]; pick: number; onPick: (i: number) => void }) {
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-route">
      <SecHead icon={<PixelArt grid={item('train')} scale={2} />} sub="毎年の差が大きい順。タップすると、その街の結果に切り替わります。">
        <span id="vb-sec-route">ほかの候補の街</span>
      </SecHead>
      <ol className="vb-route">
        {results.map((r, i) => {
          const w = perYearWord(r.perYear, r.from.name, r.to.name)
          return (
            <li key={r.to.id}>
              <button type="button" className={cn('vb-stop', i === pick && 'is-here')} aria-current={i === pick ? 'true' : undefined} onClick={() => onPick(i)}>
                <span className="vb-stop__dot" style={{ background: REGION_COLOR[r.to.region] }} aria-hidden />
                <span className="vb-stop__name">{r.to.name}<small>{r.to.pref}</small></span>
                <span className={cn('vb-stop__val', `is-${w.tone}`)}>
                  {w.short}
                  {(r.unknown.length > 0 || r.oneTime > 0) && (
                    <span className="vb-stop__tags">
                      {r.unknown.length > 0 && <Tag tone="temp">確認中あり</Tag>}
                      {r.oneTime > 0 && <Tag tone="guess">一度きり 約{yenMan(r.oneTime, 0)}</Tag>}
                    </span>
                  )}
                </span>
                {i === pick && <span className="vb-stop__here">表示中</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function NextStep({ c, onRetry }: { c: Comparison; onRetry: () => void }) {
  const steps = nextSteps(c)
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-next">
      <SecHead icon={<PixelArt grid={item('signpost')} scale={2} />}>
        <span id="vb-sec-next">次の一歩</span>
      </SecHead>
      <ol className="vb-steps">
        {steps.map((s, i) => (
          <li key={s.title} className="vb-box">
            <span className="vb-steps__no" aria-hidden>{i + 1}</span>
            <div><p className="vb-steps__t">{s.title}</p><p className="vb-steps__b">{s.body}</p></div>
          </li>
        ))}
      </ol>
      <aside className="vb-pr" aria-label="広告の枠">
        <Tag tone="pr">PR</Tag>
        <p className="vb-pr__t">PR（提携後に表示）</p>
        <p className="vb-pr__b">{c.perYear <= -10000 ? `${c.from.name}` : c.to.name}の住まい探しのサービスが入る予定の枠です。試作なので、リンクはまだありません。</p>
      </aside>
      <PixelButton size="lg" block onClick={onRetry} className="vb-retry">
        <PixelArrow dir="left" className="vb-btn__arrow" /> 条件を変えてもう1回
      </PixelButton>
    </section>
  )
}

function Records({ c }: { c: Comparison }) {
  const known = c.items.filter((i) => !i.oneTime && i.total !== null)
  const scale = Math.max(300000, ...known.map((k) => Math.abs(k.perYear ?? 0)))
  return (
    <section className="vb-sec" aria-labelledby="vb-sec-rec">
      <SecHead icon={<PixelArt grid={item('envelope')} scale={2} />} sub={`ゲージは真ん中から、手厚い街の側にのびます（1年あたり、${c.years}年の平均）。`}>
        <span id="vb-sec-rec">家計の記録</span>
      </SecHead>
      {known.length ? known.map((b, i) => <Record key={b.key} b={b} c={c} scale={scale} i={i} />) : (
        <p className="vb-box vb-empty">この家族では、金額で比べられる項目がまだありません。</p>
      )}
    </section>
  )
}

/** 広い画面（2列）かどうか */
function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/* ───────── 結果の画面 ───────── */
export function Result({ input, results, pick, setPick, onRetry, sampleNote, onRemote, afterGacha }: {
  input: FamilyInput; results: Comparison[]; pick: number; setPick: (i: number) => void; onRetry: () => void; sampleNote: string | null; onRemote: () => void; afterGacha: boolean
}) {
  const [moved, setMoved] = useState(false)
  const reduce = useReducedMotion()
  const wide = useWide()
  const topRef = useRef<HTMLDivElement>(null)
  const choose = (i: number) => {
    setMoved(true)
    setPick(i)
    topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  if (!results.length) return <EmptyResult input={input} onRetry={onRetry} onRemote={onRemote} />
  const c = results[Math.min(pick, results.length - 1)]
  return (
    <main className="vb-screen vb-result" ref={topRef}>
      <div className="vb-result__bar">
        <p className="vb-result__logo">住む街ガチャ</p>
        <button type="button" className="vb-link" onClick={onRetry}>条件を変える</button>
      </div>
      <div className="vb-result__grid">
        <div className="vb-result__left">
          <Arrival key={c.to.id} c={c} input={input} note={sampleNote} arrived={afterGacha && !moved} />
          <Headline key={`h-${c.to.id}`} c={c} years={c.years} />
          {wide && <Pride c={c} />}
          {wide && <RouteMap results={results} pick={pick} onPick={choose} />}
        </div>
        <div className="vb-result__right" key={`r-${c.to.id}`}>
          <Records c={c} />
          <Unknowns c={c} />
          <OneTime c={c} />
          {!wide && <Pride c={c} />}
          {!wide && <RouteMap results={results} pick={pick} onPick={choose} />}
          <NextStep c={c} onRetry={onRetry} />
          <footer className="vb-foot">
            <p>{DISCLAIMER}</p>
            <p>データは{DATA_AS_OF}時点。入力した内容は、この端末の中だけで使っています。</p>
          </footer>
        </div>
      </div>
    </main>
  )
}

function EmptyResult({ input, onRetry, onRemote }: { input: FamilyInput; onRetry: () => void; onRemote: () => void }) {
  const members = useMemo(() => membersOf(input), [input])
  const from = cityById(input.fromCityId)
  return (
    <main className="vb-screen vb-result vb-result--empty">
      <div className="vb-col">
        <Scene h={84} label={`${from.name}にいる家族`}>
          <Sky base={60} tone={toneOf(from)} />
          <Clouds tone={toneOf(from)} />
          <Town city={from} base={60} />
          <Ground base={60} h={84} tone={toneOf(from)} />
          <StationSign x={84} base={63} city={from} />
          <Party members={members} x0={6} base={80} maxW={74} state="stand" pigMood="plain" />
        </Scene>
        <section className="vb-window" aria-live="polite">
          <div className="vb-window__name"><PixelArt grid={PIGEON} scale={2} /><span>ハト駅長</span></div>
          <h1 className="vb-window__text">{from.name}から通える範囲の候補が、まだこの試作のデータにありません。</h1>
          <p className="vb-hint">リモートで働く場合なら、全国の街と比べられます。</p>
        </section>
        <div className="vb-stack">
          <PixelButton size="lg" block onClick={onRemote}>リモートで働く場合で探す</PixelButton>
          <PixelButton tone="plain" block onClick={onRetry}>条件を変える</PixelButton>
        </div>
        <footer className="vb-foot"><p>{DISCLAIMER}</p></footer>
      </div>
    </main>
  )
}
