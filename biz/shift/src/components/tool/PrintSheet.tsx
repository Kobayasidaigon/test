// 印刷用のシフト表（A4 横）。画面では隠してあり、印刷のときだけ出る（.print-only）。
// 店の名前と年月、表、日ごとの人数、スタッフごとの集計、記号の説明を1枚に入れる。
// 人数が多いときは行を低くして1枚に収め、それでも入らなければ、スタッフを同じくらいの人数ずつに分けて2枚以上にする。
// 分けたときも、どの紙にも、店の名前と年月・記号の説明・日ごとの人数を入れる（1枚ずつ別に貼っても読めるように）。
// 見た目は src/index.css の「印刷用のシフト表（.pt）」。
import { memo, useMemo, type CSSProperties } from 'react'
import { buildCalendar, formatMonth, shiftAt, summarize, WEEKDAY_LABELS, type ShiftPlan } from '@/core'
import { symbolOf } from '@/components/shift-block'

/** A4 横の、余白をのぞいた高さ（mm）。用紙 210mm − 上下の余白 8mm × 2 */
const PAGE_HEIGHT_MM = 194
/** A4 横の、余白をのぞいた幅（mm）。用紙 297mm − 左右の余白 8mm × 2 */
const PAGE_WIDTH_MM = 281
/** 1pt は何 mm か */
const PT_MM = 0.3528
/** 名前の列の、左右の余白と線のぶん（mm） */
const NAME_PAD_MM = 3
/** 名前の列は、日の列の何倍まで広げるか（広げすぎると、日の列の記号が読みにくくなる） */
const NAME_MAX_U = 8

/** 名前を1行で書いたときの幅を、字の大きさ（em）で見積もる。全角は 1、半角は 0.6（太字なので少し広めに見る） */
export function nameEm(name: string): number {
  let em = 0
  for (const ch of name) {
    const c = ch.codePointAt(0) ?? 0
    em += c >= 0x2e80 || (c >= 0xff01 && c <= 0xff60) ? 1 : ch === ' ' ? 0.3 : 0.6
  }
  return em * 1.04
}

// memo: 道具の画面は、保存の様子などでもよく描き直される。plan が同じなら、この重い表は描き直さない
export const PrintSheet = memo(function PrintSheet({ plan }: { plan: ShiftPlan }) {
  const calendar = useMemo(() => buildCalendar(plan), [plan])
  const summary = useMemo(() => summarize(plan, plan.schedule, calendar), [plan, calendar])
  const shiftById = new Map(plan.shiftTypes.map((s) => [s.id, s]))
  const T = plan.shiftTypes.length
  const N = plan.staff.length

  // 行の高さ。1枚に収まるように決める。
  // 紙の高さから、題（9mm）、見出しの行（8.2mm）、下の人数の行（4.8mm × 種類の数）、
  // 記号の説明（14mm。種類が多くて2行になるときは +5mm）、線の太さなどの余裕（6mm）を引いた残りを、人数で割る。
  const room = PAGE_HEIGHT_MM - 9 - 8.2 - 4.8 * T - 20 - (T > 5 ? 5 : 0)
  // 4.6mm より低くしないと入らない人数なら、1枚に詰めるのをやめて、紙を分ける。
  // 分けるときは、どの紙も同じくらいの人数にする（28人 + 2人、のようにかたよらせない）
  const perPageMax = Math.max(1, Math.floor(room / 4.6))
  const pages = Math.max(1, Math.ceil(N / perPageMax))
  const perPage = Math.max(1, Math.ceil(N / pages))
  const rowMm = Math.min(11.5, room / perPage)
  // 字の大きさも、行の高さに合わせる（貼り出したときに、少し離れても読めるように）
  const fontPt = Math.min(11, Math.max(7.4, rowMm * 1.05))

  // 名前の列の幅と字の大きさ。いちばん長い名前が「…」で切れないようにする。
  // まず字の大きさはそのままで、名前の列を広げる（日の列を少しずつせばめる。名前の列は、日の列の 4.2〜8 倍）。
  // それでも入らなければ字を小さくし（7pt まで）、それでも入らなければ2行に折る
  const rest = calendar.length + 1.3 * 3 + 1.15 * T + 2.1
  const longest = Math.max(4, ...plan.staff.map((st) => nameEm(st.name || '（名前なし）')))
  const needMm = (pt: number) => longest * pt * PT_MM + NAME_PAD_MM
  // 名前の列の幅が mm になる単位: u × W / (u + rest) = mm より、u = mm × rest / (W − mm)
  const unitsFor = (mm: number) => (mm * rest) / Math.max(1, PAGE_WIDTH_MM - mm)
  let namePt = Math.min(11.5, fontPt + 0.5)
  const nameU = Math.min(NAME_MAX_U, Math.max(4.2, unitsFor(needMm(namePt))))
  const nameMm = (nameU * PAGE_WIDTH_MM) / (nameU + rest)
  if (needMm(namePt) > nameMm) namePt = Math.max(7, (nameMm - NAME_PAD_MM) / (longest * PT_MM))
  const nameWrap = needMm(namePt) > nameMm + 0.1
  const units = nameU + rest
  const w = (u: number): CSSProperties => ({ width: `${((u / units) * 100).toFixed(3)}%` })

  const chunks: Array<{ start: number; staff: ShiftPlan['staff'] }> = []
  for (let i = 0; i < N; i += perPage) chunks.push({ start: i, staff: plan.staff.slice(i, i + perPage) })
  if (chunks.length === 0) chunks.push({ start: 0, staff: [] })

  const today = new Date()
  const printed = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  // 時間は、表の幅を取らないよう「152.5」の形で出す
  const hours = (minutes: number) => String(Math.round((minutes / 60) * 10) / 10)
  const tableStyle = { ['--pr' as string]: `${rowMm.toFixed(2)}mm`, ['--pf' as string]: `${fontPt.toFixed(2)}pt`, ['--pfn' as string]: `${namePt.toFixed(2)}pt` } as CSSProperties

  return (
    <div className="print-only pt-sheet" aria-hidden>
      {chunks.map((chunk, page) => (
        <section key={page} className="pt-page">
          <div className="pt-head">
            <p className="pt-title">
              {plan.storeName ? `${plan.storeName}　` : ''}
              {formatMonth(plan.year, plan.month)}のシフト表
            </p>
            <p className="pt-meta">
              {chunks.length > 1 ? `${page + 1}／${chunks.length}枚め（${chunk.start + 1}〜${chunk.start + chunk.staff.length}人め）　` : ''}
              スタッフ{N}人　印刷した日 {printed}
            </p>
          </div>
          <table className="pt" style={tableStyle}>
            <colgroup>
              <col style={w(nameU)} />
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
              {chunk.staff.map((st, j) => {
                const sum = summary.staff[chunk.start + j]
                return (
                  <tr key={st.id}>
                    <th className="pt-name pt-staff" data-wrap={nameWrap ? '' : undefined}>
                      {st.name || '（名前なし）'}
                    </th>
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
                    // 役割の最低人数が足りない日は、人数のうしろに「役」を付ける（色だけに頼らない）
                    const roleShort = slot.roleShort.length
                    return (
                      <td key={day.day} data-closed={closed ? '' : undefined} className={slot.diff < 0 || roleShort > 0 ? 'pt-short' : undefined}>
                        {/* 足りない日は「入っている人数/必要な人数」の形で、太い赤字にする */}
                        {closed && slot.have === 0 ? '' : slot.diff < 0 ? `${slot.have}/${slot.need}` : slot.need === 0 && slot.have === 0 ? '' : slot.have}
                        {roleShort > 0 ? '役' : ''}
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
            <span>
              空のマスは休み。色の付いた列は、店を開けない日。下の行は、その日に入っている人数（「1/2」は、必要2人に対して1人。「役」は、役割の最低人数が足りない日）
              {chunks.length > 1 ? '。ほかの紙の人もふくめた、店全体の人数です' : ''}。時間は、休憩をのぞいた勤務時間の合計。
            </span>
          </div>
        </section>
      ))}
    </div>
  )
})
