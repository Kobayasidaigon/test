import type { ReactNode } from 'react'
import { formatWareki, formatYen, type DateString, type Yen } from '@/core'

// 資料の「紙」の共通の部品。見た目は src/styles/paper.css。
// ここの部品は、道具の画面でも、LP の見本（静的HTMLに書き出すページ）でも使えるように、
// window や document には触らない。大きさの調整も CSS だけでしている。

/**
 * 紙を入れる枠。枠の幅に合わせて、紙の全体が縮んで見える。
 * zoom="full" にすると、紙を実物の大きさで出して、枠の中を横に動かして見る（スマホで字を読みたいとき）。
 */
export function PaperFrame({ children, zoom = 'fit', className }: { children: ReactNode; zoom?: 'fit' | 'full'; className?: string }) {
  return (
    <div
      className={`paper-scroll${className ? ` ${className}` : ''}`}
      data-zoom={zoom}
      // 大きく表示しているときは、枠の中を横に動かせる。キーボードでも動かせるように、フォーカスが当たるようにする
      {...(zoom === 'full' ? { tabIndex: 0, role: 'region', 'aria-label': '資料の紙（横に動かして見られます）' } : {})}
    >
      <div className="paper-frame">{children}</div>
    </div>
  )
}

/** 1枚の紙（何ページかに続くこともある）。 */
export function Paper({
  label,
  watermark = false,
  children,
}: {
  /** 読み上げ用の名前（「令和7年度 収支決算書」など） */
  label: string
  /** 「見本」の透かしを入れるか（無料版）。透かしは paper.css が、紙の地にくり返して敷く */
  watermark?: boolean
  children: ReactNode
}) {
  return (
    <section className="paper" aria-label={label} data-watermark={watermark ? '' : undefined}>
      {children}
    </section>
  )
}

/** 金額。マイナスは △ で書く（決算書の書き方）。 */
export function yen(value: Yen): string {
  return formatYen(value)
}

/** 日付。空なら、手で書けるように「令和　年　月　日」と空けて出す。 */
export function PaperDate({ date }: { date: DateString | '' }) {
  if (date !== '') return <>{formatWareki(date)}</>
  return (
    <>
      令和
      <span className="paper-gap" />年<span className="paper-gap" />月<span className="paper-gap" />日
    </>
  )
}

/** 署名欄。名前が空なら、線だけを出して、手で書いてもらう。はんこを押す丸が付く。 */
export function PaperSign({ role, name }: { role: string; name: string }) {
  return (
    <div className="paper-sign">
      <span className="role">{role}</span>
      <span className="name">{name}</span>
      <span className="paper-seal" aria-label="はんこを押すところ">
        印
      </span>
    </div>
  )
}

/** 資料の見出し（題、期間、団体の名前）。 */
export function PaperHeading({ title, period, orgName }: { title: string; period?: string; orgName: string }) {
  return (
    <header>
      <h2 className="paper-title">{title}</h2>
      {period && <p className="paper-period">（{period}）</p>}
      <p className="paper-org">{orgName}</p>
    </header>
  )
}

/** 「収入の部」などの小見出し。右に単位を書ける。 */
export function PaperSection({ title, unit }: { title: string; unit?: string }) {
  return (
    <div className="paper-section">
      <h3>{title}</h3>
      {unit && <span className="paper-unit">{unit}</span>}
    </div>
  )
}
