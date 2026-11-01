// 案B「ドット絵の旅」— 画面をまたいで使う部品（メッセージウィンドウ・道のり・札）
import { useState, type ReactNode } from 'react'
import type { Confidence } from '@/shared'
import { cn } from '@/lib/utils'
import { PixelArt, PIGEON, person } from './pixel'
import { PixelArrow, Tag, TypeText } from './parts'
import { FIELDS, STOP_LABEL, confTone, type Field } from './copy'
import { PERSON_PAL } from './sprites'

/** ハト駅長のメッセージウィンドウ。タップすると全文が出る */
export function Window({ text, instant, onDone, children, className, big }: {
  text: string; instant?: boolean; onDone?: () => void; children?: ReactNode; className?: string; big?: boolean
}) {
  const [skip, setSkip] = useState(0)
  return (
    <div className={cn('vb-window', big && 'vb-window--big', className)} onClick={() => setSkip((s) => s + 1)}>
      <div className="vb-window__name">
        <PixelArt grid={PIGEON} scale={2} />
        <span>ハト駅長</span>
      </div>
      <p className="vb-window__text">
        <TypeText key={text} text={text} instant={instant} skip={skip} onDone={onDone} />
      </p>
      {children}
    </div>
  )
}

/** 旅の道のり（どの質問まで来たか）。済んだところはタップで戻れる */
export function Road({ at, reached, onJump }: { at: number; reached: number; onJump: (i: number) => void }) {
  return (
    <nav className="vb-road" aria-label="質問の道のり">
      <ol>
        {FIELDS.map((f: Field, i) => {
          const done = i < reached || i < at
          const here = i === at
          return (
            <li key={f} className={cn(here && 'is-here', done && 'is-done')}>
              <button type="button" onClick={() => onJump(i)} disabled={!done && !here} aria-current={here ? 'step' : undefined}
                aria-label={`${i + 1}. ${STOP_LABEL[f]}${here ? '（いまここ）' : done ? '（済み・もどる）' : ''}`}>
                {here && <PixelArt grid={person('adultA', 'stand')} pal={PERSON_PAL.adultA} scale={1} className="vb-road__me" />}
                <span className="vb-road__flag" aria-hidden />
                <span className="vb-road__label">{STOP_LABEL[f]}</span>
              </button>
            </li>
          )
        })}
        <li className={cn('vb-road__goal', at >= FIELDS.length && 'is-here')} aria-hidden>
          <span className="vb-road__flag" />
          <span className="vb-road__label">出発</span>
        </li>
      </ol>
    </nav>
  )
}

/** 確からしさの札（確認済・推定・仮置き）。形でも区別する */
export function ConfTag({ c }: { c: Confidence }) {
  const tone = confTone(c)
  const d = tone === 'ok' ? 'M0 3h1v1H0zM1 4h1v1H1zM2 3h1v1H2zM3 2h1v1H3zM4 1h1v1H4z' : tone === 'guess' ? 'M0 1h2v1H0zM2 2h1v1H2zM3 1h2v1H3zM0 3h2v1H0zM2 4h1v1H2zM3 3h2v1H3z' : 'M1 0h3v1H1zM4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM2 5h1v1H2z'
  return (
    <Tag tone={tone}>
      <svg viewBox="0 0 5 6" width="10" height="12" shapeRendering="crispEdges" aria-hidden focusable="false"><path d={d} fill="currentColor" /></svg>
      {c}
    </Tag>
  )
}

export function SecHead({ icon, children, sub }: { icon?: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="vb-sec__head">
      <div className="vb-sec__row">
        {icon && <span className="vb-sec__icon" aria-hidden>{icon}</span>}
        <h2>{children}</h2>
      </div>
      {sub && <p className="vb-sec__sub">{sub}</p>}
    </header>
  )
}

export function Choice({ pressed, onClick, children, className, label }: { pressed: boolean; onClick: () => void; children: ReactNode; className?: string; label?: string }) {
  return (
    <button type="button" className={cn('vb-choice', className)} aria-pressed={pressed} onClick={onClick} aria-label={label}>
      <PixelArrow className="vb-cursor" />
      {children}
    </button>
  )
}
