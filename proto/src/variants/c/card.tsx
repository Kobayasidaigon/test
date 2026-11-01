/**
 * 案C「街カード」— 街カード（表・裏）と、指で傾けると光る仕組み。
 *
 * 21st から借りた部品（そのまま貼らず、この案に合わせて作り変えた。詳しくは CREDITS.md）
 * - Holographic Foil Card — daiwiikharihar
 *   https://21st.dev/@daiwiikharihar/components/holographic-foil-card
 *   ポインタの位置を motion value にして、ばね（useSpring）で追わせ、rotateX / rotateY と光の位置に変える仕組み。
 *   虹色の箔（特別なカードに見える）をやめ、どのカードにも同じ「ニスの光」と、
 *   光が当たったところだけ浮かぶ街路の地紋にした。指を離すと水平にもどる。
 * - Tilt Flip Card — cesaroeduardo
 *   https://21st.dev/@cesaroeduardo/components/flip-card
 *   表と裏を backface-visibility で重ね、外から渡す flipped で回す構成。
 *   回転を motion のばねに置き換え、裏面をダムカードのような「この街の制度メモ」にした。
 */
import { useRef, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionStyle } from 'motion/react'
import NumberFlow from '@number-flow/react'
import type { City, Comparison, Confidence, FamilyInput } from '@/shared'
import { DATA_AS_OF, yenMan } from '@/shared'
import { cn } from '@/lib/utils'
import { BackPattern, CityArt, KindIcon } from './art'
import { KIND_LABEL, fmtYen, incomeLabel, man1, meta, pickPride, statOf } from './lib'
import { Conf } from './ui'

// ---------- 傾けると光る ----------
function useTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const spring = { stiffness: 170, damping: 17, mass: 0.6 }
  const sx = useSpring(mx, spring)
  const sy = useSpring(my, spring)
  const rotateY = useTransform(sx, [-0.5, 0.5], [-16, 16])
  const rotateX = useTransform(sy, [-0.5, 0.5], [13, -13])
  const lx = useTransform(sx, [-0.5, 0.5], ['0%', '100%'])
  const ly = useTransform(sy, [-0.5, 0.5], ['0%', '100%'])
  const glow = useTransform([sx, sy], ([x, y]) => Math.min(1, Math.hypot(Number(x), Number(y)) * 2.4))
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    mx.set(Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)))
    my.set(Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5)))
  }
  const reset = () => { mx.set(0); my.set(0) }
  return {
    ref, move, reset,
    tiltStyle: (enabled ? { rotateX, rotateY } : {}) as MotionStyle,
    lightStyle: { '--lx': lx, '--ly': ly, '--glow': glow } as unknown as MotionStyle,
  }
}

function Shine({ style }: { style: MotionStyle }) {
  return (
    <>
      <motion.span className="vc-shine" style={style} aria-hidden />
      <span className="vc-sweep" aria-hidden />
    </>
  )
}

// ---------- カードの中身 ----------
type Role = 'to' | 'from' | 'preview'

function Stat({ cmp, role, compact }: { cmp?: Comparison | null; role: Role; compact?: boolean }) {
  if (role === 'from') {
    return (
      <div className="vc-cf-stat is-from">
        <span className="vc-cf-stat-lead">くらべる もと</span>
        <span className="vc-cf-stat-num">いまの街</span>
      </div>
    )
  }
  if (role === 'preview' || !cmp) {
    return (
      <div className="vc-cf-stat is-preview">
        <span className="vc-cf-stat-lead">毎年の差</span>
        <span className="vc-cf-stat-num">家族で決まる</span>
      </div>
    )
  }
  const s = statOf(cmp)
  return (
    <div className={cn('vc-cf-stat', `is-${s.lean}`)}>
      <div className="vc-cf-stat-main">
        <span className="vc-cf-stat-lead">{s.lead}</span>
        {s.lean === 'even' ? (
          <span className="vc-cf-stat-num">ほぼ同じ</span>
        ) : (
          <span className="vc-cf-stat-num">
            {s.lean === 'to' ? '+' : ''}
            <NumberFlow value={man1(s.value)} locales="ja-JP" format={{ maximumFractionDigits: 1 }} />
            <span className="vc-cf-stat-unit">万円</span>
            <small>{s.tail}</small>
          </span>
        )}
      </div>
      {!compact && cmp.oneTime > 0 && (
        <div className="vc-cf-once">
          <span>一度きり</span>
          <b>{fmtYen(cmp.oneTime)}</b>
        </div>
      )}
    </div>
  )
}

/** 表: 都道府県・番号（自治体コード）・街の名前・絵・名物・毎年の差 */
export function CardFront({ city, cmp, role = 'to', compact }: { city: City; cmp?: Comparison | null; role?: Role; compact?: boolean }) {
  const m = meta(city.id)
  const pride = pickPride(city)
  return (
    <div className={cn('vc-cf', compact && 'is-compact')} style={{ '--ink': m.ink } as CSSProperties}>
      <div className="vc-cf-frame">
        <div className="vc-cf-strip">
          <span>{city.pref}</span>
          <span className="vc-cf-code" aria-label={`自治体コード ${m.code}`}>No.{m.code}</span>
        </div>
        <div className="vc-cf-name">{city.name}</div>
        <div className="vc-cf-art">
          <CityArt id={city.id} label={!compact} />
        </div>
        {!compact && pride && (
          <div className="vc-cf-pride">
            <div className="vc-cf-pride-head">
              <span className="vc-cf-kind"><KindIcon kind={pride.kind} className="vc-cf-kicon" />{KIND_LABEL[pride.kind]}</span>
              <b>{pride.label}</b>
            </div>
            <p>{pride.fact}</p>
          </div>
        )}
        <Stat cmp={cmp} role={role} compact={compact} />
      </div>
    </div>
  )
}

/** 裏: この街の制度メモ（ダムカードの裏のような、データ面） */
export function CardData({ city, input }: { city: City; input: FamilyInput }) {
  const m = meta(city.id)
  const n = city.nursery
  const band = n.monthly[input.income]
  const fee = n.firstChildFree ? '0円' : band ? (band[0] === band[1] ? `約${yenMan(band[0])}` : `${(band[0] / 10000).toFixed(1)}〜${yenMan(band[1])}`) : '確認中'
  const rows: { k: string; v: string; c?: Confidence; muted?: boolean }[] = [
    { k: '0〜2歳の保育料（第1子・月）', v: fee, c: n.firstChildFree || band ? n.confidence : undefined, muted: fee === '確認中' },
    { k: 'きょうだいの保育料', v: `2人目 ${n.secondChild === 'free' ? '0円' : '半額'}・3人目 ${n.thirdChild === 'free' ? '0円' : '半額'}`, c: n.confidence },
    { k: '018サポート（現金）', v: city.cash ? `子1人 年${yenMan(city.cash.perChildYearly, 0)}` : '対象外（東京都の制度）', c: city.cash?.confidence, muted: !city.cash },
    { k: '子ども医療費（通院）', v: city.medical.coversTo != null ? `${city.medical.coversTo}歳の年度末まで` : '確認中', c: city.medical.coversTo != null ? city.medical.confidence : undefined, muted: city.medical.coversTo == null },
    { k: '中学校の給食費', v: city.lunch.juniorHighFree === true ? '無料' : city.lunch.juniorHighFree === false ? '有料' : '確認中', c: city.lunch.juniorHighFree != null ? city.lunch.confidence : undefined, muted: city.lunch.juniorHighFree == null },
    { k: '移住支援金（一度きり）', v: city.iju ? `世帯${yenMan(city.iju.family, 0)}＋子1人${yenMan(city.iju.perChild, 0)}` : '試作では未登録', c: city.iju?.confidence, muted: !city.iju },
  ]
  return (
    <div className="vc-cd" style={{ '--ink': m.ink } as CSSProperties}>
      <div className="vc-cd-head">
        <b>{city.name}の制度メモ</b>
        <span>世帯年収 {incomeLabel(input.income)} のとき</span>
      </div>
      <dl className="vc-cd-list">
        {rows.map((r) => (
          <div key={r.k} className={cn('vc-cd-row', r.muted && 'is-muted')}>
            <dt>{r.k}</dt>
            <dd>
              <span>{r.v}</span>
              {r.c && <Conf c={r.c} tiny />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="vc-cd-foot">保育料は{n.fiscalYear}。{DATA_AS_OF}時点の調べ。</p>
    </div>
  )
}

/** 山札の裏。どのカードも同じ柄で、見分けはつかない */
export function DeckBack() {
  return (
    <div className="vc-deckback">
      <BackPattern className="vc-deckback-svg" />
      <span className="vc-deckback-mark">住む街ガチャ</span>
    </div>
  )
}

// ---------- カード ----------
export interface CityCardProps {
  city: City
  cmp?: Comparison | null
  input?: FamilyInput
  role?: Role
  flipped?: boolean
  back?: 'data' | 'deck'
  compact?: boolean
  tilt?: boolean
  className?: string
  style?: CSSProperties
  /** 指で傾けたあとの「タップ」だけを拾う */
  onTap?: () => void
}

export function CityCard({ city, cmp, input, role = 'to', flipped = false, back = 'data', compact, tilt = true, className, style, onTap }: CityCardProps) {
  const reduce = useReducedMotion()
  const t = useTilt(tilt && !reduce)
  const down = useRef<{ x: number; y: number } | null>(null)
  return (
    <div className={cn('vc-scene', className)} style={style}>
      <motion.div
        ref={t.ref}
        className={cn('vc-tilt', tilt && 'is-tiltable')}
        style={t.tiltStyle}
        onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; t.move(e) }}
        onPointerMove={t.move}
        onPointerLeave={t.reset}
        onPointerUp={t.reset}
        onPointerCancel={t.reset}
        onClick={(e) => {
          if (!onTap) return
          const d = down.current
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return
          onTap()
        }}
      >
        <motion.div
          className="vc-flip"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 130, damping: 17 }}
        >
          <div className="vc-face" aria-hidden={flipped || undefined}>
            <CardFront city={city} cmp={cmp} role={role} compact={compact} />
            <Shine style={t.lightStyle} />
          </div>
          <div className="vc-face vc-face--back" aria-hidden={!flipped || undefined}>
            {back === 'data' && input ? <CardData city={city} input={input} /> : <DeckBack />}
            <Shine style={t.lightStyle} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
