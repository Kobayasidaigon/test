// シフト表。行がスタッフ、列が日。道具の画面（④シフト表、③希望休）と、LP の見本で、同じ部品を使う。
//
// - mode="schedule": 入っている勤務をブロックで見せる。右にスタッフごとの集計、下に日ごとの過不足。
// - mode="wishes":   希望（休み希望、入りたい勤務）を見せる。下に、日ごとの休み希望の人数。
// - onCellPress をわたすと、マスが押せるボタンになる。わたさなければ、読むだけの表（LP 向け）。
// - animateKey の数を変えると、ブロックが左から順に「カチカチ」とはまる動きを1回流す。
//
// 描くときに window や document に触らないので、静的HTMLに書き出すページでも使える。
// 見た目は src/index.css の「シフト表（.sg）」にまとめてある。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import {
  buildCalendar,
  formatDay,
  formatMinutes,
  isScheduleEmpty,
  summarize,
  violationsByCell,
  WEEKDAY_LABELS,
  type CheckReport,
  type DayInfo,
  type Schedule,
  type ShiftPlan,
  type ShiftType,
  type Staff,
  type StaffSummary,
  type Wish,
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
  /**
   * 見せる日の範囲（LP の見本用。省くと、その月のぜんぶの日）。
   * 列を切り出すだけで、計算はその月ぜんぶでしている。右の集計は月ぜんぶの数なので、範囲を決めるときは showSummary を false にすること。
   */
  days?: { from: number; to: number }
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

type RowProps = {
  staff: Staff
  r: number
  year: number
  month: number
  calendar: DayInfo[]
  shiftById: Map<string, ShiftType>
  shiftTypes: ShiftType[]
  mode: 'schedule' | 'wishes'
  /** その人の希望（日 → 希望） */
  wishes: Record<string, Wish> | undefined
  /** その人の勤務（日 → 勤務の種類の id） */
  work: Record<string, string> | undefined
  /** その人の、手で固定した日 */
  locked: number[] | undefined
  /** その人の、条件に合わない日（日 → 違反の文）。badKey は、中身が同じかを比べるための文字 */
  bad: Map<number, string[]> | undefined
  badKey: string
  sum: StaffSummary | undefined
  sumKey: string
  showSummary: boolean
  /** この行で光らせる日 */
  flashDay: number | null
  onPress: ((staffId: string, day: number, el: HTMLElement) => void) | undefined
}

/**
 * スタッフ1人ぶんの行。
 * 30人 × 31日 だと約1000マスあるので、変わっていない行は描き直さない（memo）。
 * マスを1つ変えたとき・希望を1つ入れたときに描き直すのは、その人の行と、下の過不足の行だけになる。
 */
const Row = memo(
  function Row({ staff: st, r, year, month, calendar, shiftById, shiftTypes, mode, wishes, work, locked, bad, sum, showSummary, flashDay, onPress }: RowProps) {
    const who = `${st.name || '（名前なし）'}さん`
    const lastDay = calendar.length - 1
    let offWishes = 0
    let shiftWishes = 0
    return (
      <tr>
        <th scope="row" className="sg-name" title={st.name || undefined}>
          {/* スマホの幅では2行まで折り返す（index.css の .sg-nametext）。同じ名字の人を、下の名前で見分けられるように */}
          <span className="sg-nametext">{st.name || '（名前なし）'}</span>
        </th>
        {calendar.map((d, c) => {
          const wish = wishes?.[String(d.day)] ?? null
          if (wish?.kind === 'off') offWishes++
          else if (wish) shiftWishes++
          const dayText = formatDay(year, month, d.day)
          let content: ReactNode = null
          let text: string
          let isLocked = false
          let badHere: string[] | undefined

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
            const id = work?.[String(d.day)] ?? null
            const s = id ? shiftById.get(id) : undefined
            isLocked = locked?.includes(d.day) ?? false
            badHere = bad?.get(d.day)
            if (id) content = s ? <ShiftBlock shift={s} /> : <span className="blk">？</span>
            else if (wish?.kind === 'off') content = <span className="sg-wishmark">希</span>
            text = id ? (s?.name ?? '（消した勤務）') : d.closed ? '休み（店を開けない日）' : wish?.kind === 'off' ? '休み（休み希望）' : '休み'
            if (isLocked) text += '、手で固定'
            if (badHere) text += `。条件に合いません: ${badHere.join(' ')}`
          }

          const cellProps = {
            className: 'sg-cellbtn',
            'data-locked': isLocked ? '' : undefined,
            'data-bad': badHere ? '' : undefined,
            'data-flash': flashDay === d.day ? '' : undefined,
            title: badHere ? badHere.join('\n') : undefined,
          }
          return (
            <td key={d.day} className={cn('sg-cell', c === lastDay && showSummary && 'sg-lastday')} data-closed={d.closed ? '' : undefined} style={cssVars({ '--d': c, '--r': r })}>
              {onPress ? (
                <button
                  type="button"
                  {...cellProps}
                  data-r={r}
                  data-c={c}
                  data-cell={`${st.id}:${d.day}`}
                  tabIndex={r === 0 && c === 0 ? 0 : -1}
                  aria-label={`${who} ${dayText} ${text}`}
                  onClick={(e) => onPress(st.id, d.day, e.currentTarget)}
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
        {showSummary && mode === 'schedule' && sum ? (
          <>
            <td className="sg-sum sg-sum-first">{sum.workDays}</td>
            <td className="sg-sum">{sum.offDays}</td>
            <td className="sg-sum">{sum.weekendHolidayDays}</td>
            {shiftTypes.map((s) => (
              <td key={s.id} className="sg-sum">
                {sum.byShift[s.id] ?? 0}
              </td>
            ))}
            {/* 幅を取らないよう「152.5時間」の形で出す（分まで見たいときは、マウスを乗せる） */}
            <td className="sg-sum" title={formatMinutes(sum.minutes)}>
              {Math.round(sum.minutes / 6) / 10}時間
            </td>
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
  },
  // bad と sum は、点検や集計のたびに作り直されるので、中身（badKey / sumKey）で比べる
  (a, b) =>
    a.staff === b.staff &&
    a.r === b.r &&
    a.year === b.year &&
    a.month === b.month &&
    a.calendar === b.calendar &&
    a.shiftById === b.shiftById &&
    a.mode === b.mode &&
    a.wishes === b.wishes &&
    a.work === b.work &&
    a.locked === b.locked &&
    a.badKey === b.badKey &&
    a.sumKey === b.sumKey &&
    a.showSummary === b.showSummary &&
    a.flashDay === b.flashDay &&
    a.onPress === b.onPress,
)

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
  days,
  className,
}: ShiftGridProps) {
  const freshCalendar = useMemo(() => buildCalendar(plan), [plan])
  // 日ごとの情報は、plan が変わるたびに作り直されるが、中身が同じなら前のものを使い続ける
  // （行の memo が効くように。マスを1つ変えただけなら、カレンダーは変わらない）
  const calendarKey = JSON.stringify(freshCalendar)
  const calendarRef = useRef({ key: calendarKey, value: freshCalendar })
  if (calendarRef.current.key !== calendarKey) calendarRef.current = { key: calendarKey, value: freshCalendar }
  const fullCalendar = calendarRef.current.value
  // 見せる列。days があるときだけ切り出す（集計と点検は、月ぜんぶの fullCalendar で計算する）
  const dayFrom = days?.from ?? 1
  const dayTo = days?.to ?? fullCalendar.length
  const calendar = useMemo(() => (dayFrom <= 1 && dayTo >= fullCalendar.length ? fullCalendar : fullCalendar.filter((d) => d.day >= dayFrom && d.day <= dayTo)), [fullCalendar, dayFrom, dayTo])

  const summary = useMemo(() => (mode === 'schedule' ? summarize(plan, schedule, fullCalendar) : null), [mode, plan, schedule, fullCalendar])
  const shiftById = useMemo(() => new Map<string, ShiftType>(plan.shiftTypes.map((s) => [s.id, s])), [plan.shiftTypes])
  // スタッフごとの、条件に合わない日
  const badByStaff = useMemo(() => {
    const out = new Map<string, { map: Map<number, string[]>; key: string }>()
    if (!report) return out
    for (const [cell, messages] of violationsByCell(report)) {
      const i = cell.lastIndexOf(':')
      const staffId = cell.slice(0, i)
      const day = Number(cell.slice(i + 1))
      const entry = out.get(staffId) ?? { map: new Map<number, string[]>(), key: '' }
      entry.map.set(day, messages)
      entry.key += `${day}:${messages.join('|')};`
      out.set(staffId, entry)
    }
    return out
  }, [report])

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

  // 押したときの関数は、親が描き直すたびに新しくなることが多い。行の memo を保つため、入口だけ同じものにしておく
  const pressRef = useRef(onCellPress)
  pressRef.current = onCellPress
  const press = useCallback((staffId: string, day: number, el: HTMLElement) => pressRef.current?.(staffId, day, el), [])
  const interactive = !!onCellPress

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

  const wishCountByDay = useMemo(() => {
    if (mode !== 'wishes') return []
    return calendar.map((d) => plan.staff.filter((st) => plan.wishes[st.id]?.[String(d.day)]?.kind === 'off').length)
  }, [mode, calendar, plan.staff, plan.wishes])

  // まだ何も入っていない表では、下の行に「足りない」を並べず、必要な人数だけを見せる（組む前から赤い印だらけにしない）
  const blank = mode === 'schedule' && isScheduleEmpty(schedule)
  const sumCols = mode === 'schedule' ? 4 + plan.shiftTypes.length : 2
  const lastDay = calendar.length - 1
  const flashStaff = flashCell ? flashCell.slice(0, flashCell.lastIndexOf(':')) : null
  const flashDay = flashCell ? Number(flashCell.slice(flashCell.lastIndexOf(':') + 1)) : null

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
                  // 「この日を見る」で、どの日の話かを列の見出しでも見せる
                  data-flash={flashDay === d.day ? '' : undefined}
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
            const sum = summary?.staff[r]
            const bad = badByStaff.get(st.id)
            return (
              <Row
                key={st.id}
                staff={st}
                r={r}
                year={plan.year}
                month={plan.month}
                calendar={calendar}
                shiftById={shiftById}
                shiftTypes={plan.shiftTypes}
                mode={mode}
                wishes={plan.wishes[st.id]}
                work={mode === 'schedule' ? schedule.work[st.id] : undefined}
                locked={mode === 'schedule' ? schedule.locked[st.id] : undefined}
                bad={bad?.map}
                badKey={bad?.key ?? ''}
                sum={sum}
                sumKey={sum ? `${sum.workDays},${sum.offDays},${sum.weekendHolidayDays},${sum.minutes},${plan.shiftTypes.map((s) => sum.byShift[s.id] ?? 0).join(',')}` : ''}
                showSummary={showSummary}
                flashDay={flashStaff === st.id ? flashDay : null}
                onPress={interactive ? press : undefined}
              />
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
                {calendar.map((d, c) => {
                  const day = summary.days[d.day - 1]
                  const slot = day.slots[si]
                  const none = slot.need === 0 && slot.have === 0
                  const diffText = slot.diff < 0 ? `${-slot.diff}人足りません` : slot.diff > 0 ? `${slot.diff}人多い` : 'ちょうど'
                  // 人数がそろっていても、役割の最低人数が足りないことがある。人数の不足と同じように、印と文で出す
                  const roleText = slot.roleShort.map((x) => `「${plan.tags.find((t) => t.id === x.tagId)?.name || '（名前なし）'}」の人が、必要${x.need}人に対して${x.have}人`).join('、')
                  if (blank) {
                    return (
                      <td key={day.day} className={cn('sg-need', c === lastDay && showSummary && 'sg-lastday')} data-closed={d.closed ? '' : undefined} data-none={none ? '' : undefined} data-blank="" title={d.closed ? '店を開けない日' : `必要${slot.need}人`}>
                        {d.closed ? null : (
                          <>
                            <span aria-hidden>{none ? '–' : slot.need}</span>
                            <span className="sr-only">{`必要${slot.need}人`}</span>
                          </>
                        )}
                      </td>
                    )
                  }
                  return (
                    <td
                      key={day.day}
                      className={cn('sg-need', c === lastDay && showSummary && 'sg-lastday')}
                      data-closed={d.closed ? '' : undefined}
                      data-none={none ? '' : undefined}
                      data-flash={flashDay === d.day ? '' : undefined}
                      title={d.closed ? '店を開けない日' : `必要${slot.need}人、入っている${slot.have}人（${diffText}）${roleText ? `。役割: ${roleText}` : ''}`}
                    >
                      {d.closed && none ? null : (
                        <>
                          <span aria-hidden>{none ? '–' : slot.have}</span>
                          {slot.diff !== 0 ? (
                            <span aria-hidden className="sg-diff" data-kind={slot.diff < 0 ? 'short' : 'over'}>
                              {slot.diff < 0 ? `−${-slot.diff}` : `+${slot.diff}`}
                            </span>
                          ) : null}
                          {roleText ? (
                            <span aria-hidden className="sg-diff" data-kind="role">
                              役
                            </span>
                          ) : null}
                          <span className="sr-only">{`必要${slot.need}人、入っている${slot.have}人（${diffText}）${roleText ? `。役割が足りません: ${roleText}` : ''}`}</span>
                        </>
                      )}
                    </td>
                  )
                })}
                {showSummary ? (
                  <td className="sg-sum sg-sum-first" colSpan={sumCols} style={{ textAlign: 'left' }}>
                    {blank ? '必要な人数' : `のべ${summary.staff.reduce((n, x) => n + (x.byShift[s.id] ?? 0), 0)}回`}
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
