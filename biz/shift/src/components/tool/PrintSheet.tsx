// 印刷用のシフト表（A4 横）。画面では隠してあり、印刷のときだけ出る（.print-only）。
// 店の名前と年月、表、日ごとの人数、スタッフごとの集計、記号の説明を1枚に入れる。
// 人数が多いときは行を低くして1枚に収め、それでも入らなければ2枚めに続く（見出しの行は、2枚めにも出る）。
// 見た目は src/index.css の「印刷用のシフト表（.pt）」。
import { memo, useMemo, type CSSProperties } from 'react'
import { buildCalendar, formatMonth, shiftAt, summarize, WEEKDAY_LABELS, type ShiftPlan } from '@/core'
import { symbolOf } from '@/components/shift-block'

/** A4 横の、余白をのぞいた高さ（mm）。用紙 210mm − 上下の余白 8mm × 2 */
const PAGE_HEIGHT_MM = 194

// memo: 道具の画面は、保存の様子などでもよく描き直される。plan が同じなら、この重い表は描き直さない
export const PrintSheet = memo(function PrintSheet({ plan }: { plan: ShiftPlan }) {
  const calendar = useMemo(() => buildCalendar(plan), [plan])
  const summary = useMemo(() => summarize(plan, plan.schedule, calendar), [plan, calendar])
  const shiftById = new Map(plan.shiftTypes.map((s) => [s.id, s]))
  const T = plan.shiftTypes.length
  const N = plan.staff.length

  // 列の幅は、紙の幅いっぱいを分け合う（日の列を 1 として、名前は 4.2、集計は少し広め）
  const units = 4.2 + calendar.length + 1.3 * 3 + 1.15 * T + 2.1
  const w = (u: number): CSSProperties => ({ width: `${((u / units) * 100).toFixed(3)}%` })

  // 行の高さ。1枚に収まるように決める。
  // 紙の高さから、題（9mm）、見出しの行（8.2mm）、下の人数の行（4.8mm × 種類の数）、
  // 記号の説明（14mm。種類が多くて2行になるときは +5mm）、線の太さなどの余裕（6mm）を引いた残りを、人数で割る。
  const room = PAGE_HEIGHT_MM - 9 - 8.2 - 4.8 * T - 20 - (T > 5 ? 5 : 0)
  const fit = room / Math.max(1, N)
  // 4.6mm より低くしないと入らない人数なら、1枚に詰めるのをやめて、読みやすい高さで2枚に分ける
  const rowMm = fit >= 4.6 ? Math.min(11.5, fit) : 5.6
  // 字の大きさも、行の高さに合わせる（貼り出したときに、少し離れても読めるように）
  const fontPt = Math.min(11, Math.max(7.4, rowMm * 1.05))

  const today = new Date()
  const printed = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  // 時間は、表の幅を取らないよう「152.5」の形で出す
  const hours = (minutes: number) => String(Math.round((minutes / 60) * 10) / 10)

  return (
    <div className="print-only pt-sheet" aria-hidden>
      <div className="pt-head">
        <p className="pt-title">
          {plan.storeName ? `${plan.storeName}　` : ''}
          {formatMonth(plan.year, plan.month)}のシフト表
        </p>
        <p className="pt-meta">
          スタッフ{N}人　印刷した日 {printed}
        </p>
      </div>
      <table className="pt" style={{ ['--pr' as string]: `${rowMm.toFixed(2)}mm`, ['--pf' as string]: `${fontPt.toFixed(2)}pt` } as CSSProperties}>
        <colgroup>
          <col style={w(4.2)} />
          {calendar.map((d) => (
            <col key={d.day} style={w(1)} />
          ))}
          <col style={w(1.3)} />
          <col style={w(1.3)} />
          <col style={w(1.3)} />
          {plan.shiftTypes.map((s) => (
            <col key={s.id} style={w(1.15)} />
          ))}
          <col style={w(2.1)} />
        </colgroup>
        <thead>
          <tr>
            <th className="pt-name">名前</th>
            {calendar.map((d) => (
              <th key={d.day} data-dow={d.weekday} data-red={d.weekday === 0 || d.holiday ? '' : undefined} data-closed={d.closed ? '' : undefined}>
                {d.day}
                <span className="pt-dw">
                  {WEEKDAY_LABELS[d.weekday]}
                  {d.holiday ? '祝' : ''}
                </span>
              </th>
            ))}
            <th className="pt-sum pt-sumfirst">勤務</th>
            <th className="pt-sum">休み</th>
            <th className="pt-sum">土日祝</th>
            {plan.shiftTypes.map((s) => (
              <th key={s.id} className="pt-sum">
                {symbolOf(s)}
              </th>
            ))}
            <th className="pt-sum">時間</th>
          </tr>
        </thead>
        <tbody>
          {plan.staff.map((st, i) => {
            const sum = summary.staff[i]
            return (
              <tr key={st.id}>
                <th className="pt-name">{st.name || '（名前なし）'}</th>
                {calendar.map((d) => {
                  const id = shiftAt(plan.schedule, st.id, d.day)
                  const s = id ? shiftById.get(id) : undefined
                  return (
                    <td key={d.day} data-closed={d.closed ? '' : undefined}>
                      {id ? (
                        <span className="pt-blk" data-color={s?.color}>
                          {s ? symbolOf(s) : '？'}
                        </span>
                      ) : null}
                    </td>
                  )
                })}
                <td className="pt-sum pt-sumfirst">{sum.workDays}</td>
                <td className="pt-sum">{sum.offDays}</td>
                <td className="pt-sum">{sum.weekendHolidayDays}</td>
                {plan.shiftTypes.map((s) => (
                  <td key={s.id} className="pt-sum">
                    {sum.byShift[s.id] ?? 0}
                  </td>
                ))}
                <td className="pt-sum">{hours(sum.minutes)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {plan.shiftTypes.map((s, si) => (
            <tr key={s.id}>
              <th className="pt-name">{s.name || symbolOf(s)}の人数</th>
              {summary.days.map((day, c) => {
                const slot = day.slots[si]
                const closed = calendar[c].closed
                return (
                  <td key={day.day} data-closed={closed ? '' : undefined} className={slot.diff < 0 ? 'pt-short' : undefined}>
                    {/* 足りない日は「入っている人数/必要な人数」の形で、太い赤字にする */}
                    {closed && slot.have === 0 ? '' : slot.diff < 0 ? `${slot.have}/${slot.need}` : slot.need === 0 && slot.have === 0 ? '' : slot.have}
                  </td>
                )
              })}
              <td className="pt-sum pt-sumfirst" colSpan={4 + T} style={{ textAlign: 'left', paddingLeft: '1.5mm' }}>
                のべ{summary.staff.reduce((n, x) => n + (x.byShift[s.id] ?? 0), 0)}回
              </td>
            </tr>
          ))}
        </tfoot>
      </table>
      <div className="pt-legend">
        {plan.shiftTypes.map((s) => (
          <span key={s.id}>
            <span className="pt-blk" data-color={s.color}>
              {symbolOf(s)}
            </span>
            {s.name}　{s.start}〜{s.end}
          </span>
        ))}
        <span>空のマスは休み。色の付いた列は、店を開けない日。下の行は、その日に入っている人数（「1/2」は、必要2人に対して1人）。時間は、休憩をのぞいた勤務時間の合計。</span>
      </div>
    </div>
  )
})
