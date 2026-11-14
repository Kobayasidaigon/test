// シフト表。行がスタッフ、列が日。道具の画面（④シフト表、③希望休）と、LP の見本で、同じ部品を使う。
//
// - mode="schedule": 入っている勤務をブロックで見せる。右にスタッフごとの集計、下に日ごとの過不足。
// - mode="wishes":   希望（休み希望、入りたい勤務）を見せる。下に、日ごとの休み希望の人数。
// - onCellPress をわたすと、マスが押せるボタンになる。わたさなければ、読むだけの表（LP 向け）。
// - animateKey の数を変えると、ブロックが左から順に「カチカチ」とはまる動きを1回流す。
//
// 描くときに window や document に触らないので、静的HTMLに書き出すページでも使える。
// 見た目は src/index.css の「シフト表（.sg）」にまとめてある。
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  buildCalendar,
  formatDay,
  formatMinutes,
  isLocked,
  shiftAt,
  summarize,
  violationsByCell,
  WEEKDAY_LABELS,
  type CheckReport,
  type DayInfo,
  type Schedule,
  type ShiftPlan,
  type ShiftType,
} from '@/core'
import { cn } from '@/lib/utils'
import { OffBlock, ShiftBlock } from './shift-block'

export type ShiftGridProps = {
  plan: ShiftPlan
  mode?: 'schedule' | 'wishes'
  /** 見せる表。省くと plan.schedule */
  schedule?: Schedule
  /** 点検の結果。わたすと、条件に合わないマスに印が付く */
  report?: CheckReport
  /** マスを押したとき。el は押したマス（吹き出しを出す位置に使う） */
  onCellPress?: (staffId: string, day: number, el: HTMLElement) => void
  /** 右の集計を出すか（初期値は true） */
  showSummary?: boolean
  /** 下の過不足（wishes では、休み希望の人数）を出すか（初期値は true） */
  showFooter?: boolean
  /** この数が変わるたびに、ブロックがはまる動きを流す（0 のあいだは流さない） */
  animateKey?: number
  /** 少しのあいだ光らせるマス（`${staffId}:${day}`） */
  flashCell?: string | null
  /** 読み上げ用の、表の名前 */
  label?: string
  className?: string
}

const cssVars = (vars: Record<string, number>): CSSProperties => vars as CSSProperties

/** 日の見出しに付ける説明（マウスを乗せたとき・読み上げ用） */
function dayNote(d: DayInfo): string {
  const notes: string[] = []
  if (d.holiday) notes.push(`祝日（${d.holiday}${d.holidayProvisional ? '。見込み' : ''}）`)
  if (d.closed) notes.push('店を開けない日')
  else if (d.overridden) notes.push('この日だけの人数')
  return notes.join('、')
}

export function ShiftGrid({
  plan,
  mode = 'schedule',
  schedule = plan.schedule,
  report,
  onCellPress,
  showSummary = true,
  showFooter = true,
  animateKey = 0,
  flashCell = null,
  label,
  className,
}: ShiftGridProps) {
  const calendar = useMemo(() => buildCalendar(plan), [plan])
  const summary = useMemo(() => (mode === 'schedule' ? summarize(plan, schedule, calendar) : null), [mode, plan, schedule, calendar])
  const marks = useMemo(() => (report ? violationsByCell(report) : new Map<string, string[]>()), [report])
  const shiftById = useMemo(() => new Map<string, ShiftType>(plan.shiftTypes.map((s) => [s.id, s])), [plan.shiftTypes])

  // はまる動き。開いたときの animateKey では流さない（ほかの手順から戻ってきただけで、動かないように）
  const firstKey = useRef(animateKey)
  const [anim, setAnim] = useState(false)
  const animLength = 460 + calendar.length * 13 + plan.staff.length * 8
  useEffect(() => {
    if (animateKey === firstKey.current) return
    firstKey.current = -1
    setAnim(true)
    const t = setTimeout(() => setAnim(false), animLength)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey])

  // キーボード: Tab で表に入るのは1マスだけにして、矢印キーでマスを動く（約1000マスを Tab で1つずつ通らせないため）
  const tableRef = useRef<HTMLTableElement>(null)
  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const t = e.target as HTMLElement
    if (t.dataset.r === undefined) return
    let r = Number(t.dataset.r)
    let c = Number(t.dataset.c)
    if (e.key === 'ArrowRight') c++
    else if (e.key === 'ArrowLeft') c--
    else if (e.key === 'ArrowDown') r++
    else if (e.key === 'ArrowUp') r--
    else if (e.key === 'Home') c = 0
    else if (e.key === 'End') c = calendar.length - 1
    else return
    const next = e.currentTarget.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)
    if (!next) return
    e.preventDefault()
    next.focus()
  }
  const onFocus = (e: React.FocusEvent<HTMLTableElement>) => {
    const t = e.target as HTMLElement
    if (t.dataset.r === undefined) return
    // Tab で止まるマスを、いまのマスに移す
    tableRef.current?.querySelectorAll<HTMLElement>('button[data-r][tabindex="0"]').forEach((el) => {
      if (el !== t) el.tabIndex = -1
    })
    t.tabIndex = 0
  }

  const interactive = !!onCellPress
  const wishCountByDay = useMemo(() => {
    if (mode !== 'wishes') return []
    return calendar.map((d) => plan.staff.filter((st) => plan.wishes[st.id]?.[String(d.day)]?.kind === 'off').length)
  }, [mode, calendar, plan.staff, plan.wishes])

  const sumCols = mode === 'schedule' ? 4 + plan.shiftTypes.length : 2
  const lastDay = calendar.length - 1

  return (
    <div className={cn('sg-wrap', className)}>
      <table ref={tableRef} className="sg" data-anim={anim ? '' : undefined} aria-label={label} onKeyDown={interactive ? onKeyDown : undefined} onFocus={interactive ? onFocus : undefined}>
        {interactive ? <caption className="sr-only">矢印キーでマスを移動できます。Enter キーか、押すと、そのマスを変えられます。</caption> : null}
        <thead>
          <tr>
            <th scope="col" className="sg-name">
              名前
            </th>
            {calendar.map((d, i) => {
              const note = dayNote(d)
              return (
                <th
                  key={d.day}
                  scope="col"
                  className={cn('sg-dayh', i === lastDay && showSummary && 'sg-lastday')}
                  data-dow={d.weekday}
                  data-red={d.weekday === 0 || d.holiday ? '' : undefined}
                  data-holiday={d.holiday ? '' : undefined}
                  data-closed={d.closed ? '' : undefined}
                  title={note || undefined}
                >
                  <span className="sg-dnum">{d.day}</span>
                  <span className="sg-dw">{WEEKDAY_LABELS[d.weekday]}</span>
                  {note ? <span className="sr-only">{note}</span> : null}
                </th>
              )
            })}
            {showSummary && mode === 'schedule' ? (
              <>
                <th scope="col" className="sg-sum sg-sum-first" title="勤務の日数">
                  勤務
                </th>
                <th scope="col" className="sg-sum" title="休みの日数（定休日もふくむ）">
                  休み
                </th>
                <th scope="col" className="sg-sum" title="土曜・日曜・祝日に入った回数">
                  土日祝
                </th>
                {plan.shiftTypes.map((s) => (
                  <th key={s.id} scope="col" className="sg-sum" title={`${s.name}の回数`}>
                    <ShiftBlock shift={s} size="sm" label={`${s.name}の回数`} />
                  </th>
                ))}
                <th scope="col" className="sg-sum" title="勤務時間の合計（休憩をのぞく）">
                  時間
                </th>
              </>
            ) : null}
            {showSummary && mode === 'wishes' ? (
              <>
                <th scope="col" className="sg-sum sg-sum-first">
                  休み希望
                </th>
                <th scope="col" className="sg-sum">
                  入りたい
                </th>
              </>
            ) : null}
          </tr>
        </thead>
        {/* key を変えて行を作り直すと、はまる動きが最初から流れ直す */}
        <tbody key={animateKey}>
          {plan.staff.map((st, r) => {
            const who = `${st.name || '（名前なし）'}さん`
            const wishes = plan.wishes[st.id] ?? {}
            const sum = summary?.staff[r]
            let offWishes = 0
            let shiftWishes = 0
            return (
              <tr key={st.id}>
                <th scope="row" className="sg-name" title={st.name || undefined}>
                  {st.name || '（名前なし）'}
                </th>
                {calendar.map((d, c) => {
                  const wish = wishes[String(d.day)] ?? null
                  if (wish?.kind === 'off') offWishes++
                  else if (wish) shiftWishes++
                  const key = `${st.id}:${d.day}`
                  const dayText = formatDay(plan.year, plan.month, d.day)
                  let content: React.ReactNode = null
                  let text: string
                  let locked = false
                  let bad: string[] | undefined

                  if (mode === 'wishes') {
                    if (wish?.kind === 'off') {
                      content = <OffBlock />
                      text = '休み希望'
                    } else if (wish) {
                      const s = shiftById.get(wish.shiftId)
                      content = s ? <ShiftBlock shift={s} /> : null
                      text = `${s?.name ?? '（消した勤務）'}に入りたい`
                    } else text = d.closed ? '店を開けない日' : '希望なし'
                  } else {
                    const id = shiftAt(schedule, st.id, d.day)
                    const s = id ? shiftById.get(id) : undefined
                    locked = isLocked(schedule, st.id, d.day)
                    bad = marks.get(key)
                    if (id) content = s ? <ShiftBlock shift={s} /> : <span className="blk">？</span>
                    else if (wish?.kind === 'off') content = <span className="sg-wishmark">希</span>
                    text = id ? (s?.name ?? '（消した勤務）') : d.closed ? '休み（店を開けない日）' : wish?.kind === 'off' ? '休み（休み希望）' : '休み'
                    if (locked) text += '、手で固定'
                    if (bad) text += `。条件に合いません: ${bad.join(' ')}`
                  }

                  const cellProps = {
                    className: 'sg-cellbtn',
                    'data-locked': locked ? '' : undefined,
                    'data-bad': bad ? '' : undefined,
                    'data-flash': flashCell === key ? '' : undefined,
                    title: bad ? bad.join('\n') : undefined,
                  }
                  return (
                    <td key={d.day} className={cn('sg-cell', c === lastDay && showSummary && 'sg-lastday')} data-closed={d.closed ? '' : undefined} style={cssVars({ '--d': c, '--r': r })}>
                      {interactive ? (
                        <button
                          type="button"
                          {...cellProps}
                          data-r={r}
                          data-c={c}
                          data-cell={key}
                          tabIndex={r === 0 && c === 0 ? 0 : -1}
                          aria-label={`${who} ${dayText} ${text}`}
                          onClick={(e) => onCellPress?.(st.id, d.day, e.currentTarget)}
                        >
                          {content}
                        </button>
                      ) : (
                        <span {...cellProps} role="img" aria-label={`${who} ${dayText} ${text}`}>
                          {content}
                        </span>
                      )}
                    </td>
                  )
                })}
                {showSummary && sum ? (
                  <>
                    <td className="sg-sum sg-sum-first">{sum.workDays}</td>
                    <td className="sg-sum">{sum.offDays}</td>
                    <td className="sg-sum">{sum.weekendHolidayDays}</td>
                    {plan.shiftTypes.map((s) => (
                      <td key={s.id} className="sg-sum">
                        {sum.byShift[s.id] ?? 0}
                      </td>
                    ))}
                    <td className="sg-sum">{formatMinutes(sum.minutes)}</td>
                  </>
                ) : null}
                {showSummary && mode === 'wishes' ? (
                  <>
                    <td className="sg-sum sg-sum-first">{offWishes}</td>
                    <td className="sg-sum">{shiftWishes}</td>
                  </>
                ) : null}
              </tr>
            )
          })}
        </tbody>
        {showFooter && mode === 'schedule' && summary ? (
          <tfoot>
            {plan.shiftTypes.map((s, si) => (
              <tr key={s.id}>
                <th scope="row" className="sg-name" title={`${s.name}に入っている人数`}>
                  <span className="sg-footlabel">
                    <ShiftBlock shift={s} size="sm" />
                    <span className="truncate">{s.name}</span>
                  </span>
                </th>
                {summary.days.map((day, c) => {
                  const slot = day.slots[si]
                  const d = calendar[c]
                  const none = slot.need === 0 && slot.have === 0
                  const diffText = slot.diff < 0 ? `${-slot.diff}人足りません` : slot.diff > 0 ? `${slot.diff}人多い` : 'ちょうど'
                  return (
                    <td
                      key={day.day}
                      className={cn('sg-need', c === lastDay && showSummary && 'sg-lastday')}
                      data-closed={d.closed ? '' : undefined}
                      data-none={none ? '' : undefined}
                      title={d.closed ? '店を開けない日' : `必要${slot.need}人、入っている${slot.have}人（${diffText}）`}
                    >
                      {d.closed && none ? null : (
                        <>
                          <span aria-hidden>{none ? '–' : slot.have}</span>
                          {slot.diff !== 0 ? (
                            <span aria-hidden className="sg-diff" data-kind={slot.diff < 0 ? 'short' : 'over'}>
                              {slot.diff < 0 ? `−${-slot.diff}` : `+${slot.diff}`}
                            </span>
                          ) : null}
                          <span className="sr-only">{`必要${slot.need}人、入っている${slot.have}人（${diffText}）`}</span>
                        </>
                      )}
                    </td>
                  )
                })}
                {showSummary ? (
                  <td className="sg-sum sg-sum-first" colSpan={sumCols} style={{ textAlign: 'left' }}>
                    のべ{summary.staff.reduce((n, x) => n + (x.byShift[s.id] ?? 0), 0)}回
                  </td>
                ) : null}
              </tr>
            ))}
          </tfoot>
        ) : null}
        {showFooter && mode === 'wishes' ? (
          <tfoot>
            <tr>
              <th scope="row" className="sg-name" title="その日に休み希望を出している人数">
                休み希望
              </th>
              {wishCountByDay.map((n, c) => (
                <td key={c} className={cn('sg-need', c === lastDay && showSummary && 'sg-lastday')} data-closed={calendar[c].closed ? '' : undefined} data-none={n === 0 ? '' : undefined}>
                  {calendar[c].closed ? null : n === 0 ? <span aria-hidden>–</span> : `${n}`}
                  {n > 0 ? <span className="sr-only">人</span> : null}
                </td>
              ))}
              {showSummary ? (
                <td className="sg-sum sg-sum-first" colSpan={sumCols} style={{ textAlign: 'left' }}>
                  のべ{wishCountByDay.reduce((a, b) => a + b, 0)}件
                </td>
              ) : null}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

export default ShiftGrid
