// ② 必要な人数と条件。曜日ごとの人数、日ごとの上書き（カレンダー）、役割の最低人数、条件。
import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  addForbiddenPair,
  buildCalendar,
  formatDay,
  formatMonth,
  holidaysClosed,
  LIMITS,
  removeForbiddenPair,
  setDayNeed,
  setRoleMin,
  setWeeklyNeed,
  toggleClosedDay,
  updateRules,
  WEEKDAY_LABELS,
  type DayInfo,
  type HolidayMode,
  type Weekday,
} from '@/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label, Select } from '@/components/ui/field'
import { NumberField } from '@/components/ui/number-field'
import { SegmentedControl } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { ShiftBlock } from '@/components/shift-block'
import { Section, StepHeading, ToggleChip, useTool, WEEK_ORDER } from './tool-context'

const HOLIDAY_OPTIONS: Array<{ value: HolidayMode; label: string }> = [
  { value: 'sunday', label: '日曜と同じ人数' },
  { value: 'weekday', label: 'その曜日のまま' },
  { value: 'closed', label: '休みにする' },
]

export function StepNeeds() {
  const { plan, update, goStep } = useTool()
  const calendar = useMemo(() => buildCalendar(plan), [plan])
  const [editDay, setEditDay] = useState<number | null>(null)
  const [rmShift, setRmShift] = useState('')
  const [rmTag, setRmTag] = useState('')
  const [fpFirst, setFpFirst] = useState('')
  const [fpNext, setFpNext] = useState('')

  const shiftName = (id: string) => plan.shiftTypes.find((s) => s.id === id)?.name || '（名前なし）'
  const tagName = (id: string) => plan.tags.find((t) => t.id === id)?.name || '（名前なし）'
  const noShifts = plan.shiftTypes.length === 0
  // 日曜が定休日のあいだは、「日曜と同じ」＝ 祝日も休み。選ぶ前にわかるよう、選択肢の名前にも書く
  const sundayClosed = plan.closed.weekdays.includes(0)
  const holidayOptions = HOLIDAY_OPTIONS.map((o) => (o.value === 'sunday' && sundayClosed ? { ...o, label: '日曜と同じ（休み）' } : o))

  // 選んでいた勤務や札が消えたときは、先頭のものに合わせる
  const rmShiftId = plan.shiftTypes.some((s) => s.id === rmShift) ? rmShift : (plan.shiftTypes[0]?.id ?? '')
  const rmTagId = plan.tags.some((t) => t.id === rmTag) ? rmTag : (plan.tags[0]?.id ?? '')
  const fpFirstId = plan.shiftTypes.some((s) => s.id === fpFirst) ? fpFirst : (plan.shiftTypes[plan.shiftTypes.length - 1]?.id ?? '')
  const fpNextId = plan.shiftTypes.some((s) => s.id === fpNext) ? fpNext : (plan.shiftTypes[0]?.id ?? '')
  const fpExists = plan.rules.forbiddenPairs.some((p) => p.first === fpFirstId && p.next === fpNextId)

  // カレンダーの1日の前に置く空きマスの数（月曜はじまり）
  const lead = WEEK_ORDER.indexOf(calendar[0].weekday)
  const dayInfo = editDay !== null ? calendar[editDay - 1] : null

  return (
    <div>
      <StepHeading no={2} title="必要な人数と条件" lead="曜日ごとに、どの勤務に何人いてほしいかを入れます。条件は、店の決まりに合わせて変えられます。" />

      {noShifts ? (
        <p className="mb-5 rounded-lg border-2 border-danger bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          勤務の種類が、まだありません。先に、①で勤務の種類を入れてください。
          <Button variant="link" className="ml-2 text-sm text-danger" onClick={() => goStep(0)}>
            ①を開く
          </Button>
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Section title="曜日ごとの必要な人数" lead="足りないときは、足りないまま表を出して、どこが足りないかを知らせます。">
          <div className="overflow-x-auto pb-1">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-[1] w-10 bg-card pb-2 text-left text-xs font-bold text-ink-soft">
                    曜日
                  </th>
                  {plan.shiftTypes.map((s) => (
                    <th key={s.id} scope="col" className="min-w-[10rem] px-1 pb-2 text-left md:min-w-[7.5rem]">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold">
                        <ShiftBlock shift={s} size="sm" />
                        <span className="truncate">{s.name || '（名前なし）'}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEK_ORDER.map((w) => {
                  const closed = plan.closed.weekdays.includes(w)
                  return (
                    <tr key={w}>
                      <th scope="row" className={cn('sticky left-0 z-[1] border-t border-line bg-card py-1.5 pr-2 text-left text-base font-extrabold', w === 0 && 'text-danger', w === 6 && 'text-[#1d4fb8]')}>
                        {WEEKDAY_LABELS[w]}
                      </th>
                      {closed ? (
                        <td colSpan={Math.max(1, plan.shiftTypes.length)} className="border-t border-line px-1 py-1.5">
                          <span className="flex h-11 items-center rounded-lg bg-[repeating-linear-gradient(135deg,var(--well)_0_4px,#ece3c8_4px_8px)] px-3 text-[13px] font-bold text-ink-soft">定休日</span>
                        </td>
                      ) : (
                        plan.shiftTypes.map((s) => (
                          <td key={s.id} className="border-t border-line px-1 py-1.5">
                            <NumberField
                              label={`${WEEKDAY_LABELS[w]}曜日の${s.name}の必要な人数`}
                              value={plan.needs.weekly[s.id]?.[w] ?? 0}
                              min={0}
                              max={LIMITS.needPerShift}
                              unit="人"
                              onChange={(v) => update((p) => setWeeklyNeed(p, s.id, w, v ?? 0))}
                            />
                          </td>
                        ))
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t-2 border-ink/15 pt-4">
            <p className="mb-1.5 text-sm font-bold">祝日の人数</p>
            <SegmentedControl label="祝日の人数" variant="chips" options={holidayOptions} value={plan.holidayMode} onValueChange={(v) => update((p) => ({ ...p, holidayMode: v }))} />
            {sundayClosed && plan.holidayMode === 'sunday' ? (
              <p className="mt-2 text-[13px] font-bold leading-relaxed">
                日曜日が定休日なので、祝日も休みになります。祝日に店を開けるときは、「その曜日のまま」を選ぶか、カレンダーで、その日の人数を入れてください。
              </p>
            ) : null}
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">祝日は、国民の祝日に関する法律の決まりから計算しています。日ごとの人数は、この月のカレンダーで、いつでも変えられます。</p>
          </div>
        </Section>

        <Section title={`${formatMonth(plan.year, plan.month)}のカレンダー`} lead="日を押すと、その日だけ人数を変えたり、休みにしたりできます。">
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-bold text-ink-soft md:gap-1" aria-hidden>
            {WEEK_ORDER.map((w) => (
              <span key={w} className={cn('pb-1', w === 0 && 'text-danger', w === 6 && 'text-[#1d4fb8]')}>
                {WEEKDAY_LABELS[w]}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {Array.from({ length: lead }, (_, i) => (
              <span key={`lead-${i}`} aria-hidden />
            ))}
            {calendar.map((d) => (
              <DayCell key={d.day} d={d} onPress={() => setEditDay(d.day)} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3.5 rounded-[3px] border border-ink/40 bg-[repeating-linear-gradient(135deg,var(--well)_0_3px,#e3d9bb_3px_6px)]" />
              店を開けない日
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2.5 rounded-full bg-ink" />
              この日だけ人数を変えた日
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="font-num font-bold text-danger underline decoration-2 underline-offset-2">
                23
              </span>
              下線は祝日
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="役割ごとの最低人数" lead="「遅番には、鍵を持っている人が1人以上」のような決まりです。">
          {plan.needs.roleMins.length > 0 ? (
            <ul className="mb-4 grid gap-2">
              {plan.needs.roleMins.map((rm) => {
                const s = plan.shiftTypes.find((x) => x.id === rm.shiftId)
                return (
                  <li key={rm.id} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border-2 border-ink/25 bg-paper/60 px-3 py-2 text-sm font-bold">
                    {s ? <ShiftBlock shift={s} size="sm" /> : null}
                    <span>{shiftName(rm.shiftId)}に、「{tagName(rm.tagId)}」の人が</span>
                    <NumberField label={`${shiftName(rm.shiftId)}の「${tagName(rm.tagId)}」の最低人数`} value={rm.count} min={1} max={LIMITS.needPerShift} unit="人" onChange={(v) => update((p) => setRoleMin(p, rm.shiftId, rm.tagId, v ?? 1))} />
                    <span>以上</span>
                    <Button variant="ghost" size="icon" className="ml-auto" aria-label={`「${shiftName(rm.shiftId)}に${tagName(rm.tagId)}」の決まりを消す`} onClick={() => update((p) => setRoleMin(p, rm.shiftId, rm.tagId, 0))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {plan.tags.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              役割の札が、まだありません。使うときは、①で札を作って、スタッフに付けてください。
              <Button variant="link" className="ml-2 text-sm" onClick={() => goStep(0)}>
                ①を開く
              </Button>
            </p>
          ) : noShifts ? null : plan.needs.roleMins.length >= LIMITS.roleMins ? (
            <p className="text-sm text-ink-soft">決まりは{LIMITS.roleMins}個までです。</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rm-shift" className="text-xs text-ink-soft">
                  勤務
                </Label>
                <Select id="rm-shift" value={rmShiftId} onChange={(e) => setRmShift(e.target.value)}>
                  {plan.shiftTypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || '（名前なし）'}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rm-tag" className="text-xs text-ink-soft">
                  役割の札
                </Label>
                <Select id="rm-tag" value={rmTagId} onChange={(e) => setRmTag(e.target.value)}>
                  {plan.tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={plan.needs.roleMins.some((r) => r.shiftId === rmShiftId && r.tagId === rmTagId)}
                onClick={() => update((p) => setRoleMin(p, rmShiftId, rmTagId, 1))}
              >
                <Plus aria-hidden />
                1人以上の決まりを足す
              </Button>
            </div>
          )}
        </Section>

        <Section title="条件">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
              <Switch
                checked={plan.rules.maxConsecutive !== null}
                onChange={(on) => update((p) => updateRules(p, { maxConsecutive: on ? 5 : null }))}
                label="連続勤務に上限を付ける"
                description="上限をこえる勤務は、自動では入れません。"
              />
              {plan.rules.maxConsecutive !== null ? (
                <div className="flex items-center gap-2 text-sm font-bold">
                  <NumberField label="連続勤務の上限（日）" value={plan.rules.maxConsecutive} min={1} max={31} unit="日" onChange={(v) => update((p) => updateRules(p, { maxConsecutive: v ?? 5 }))} />
                  まで
                </div>
              ) : null}
            </div>

            <div className="border-b border-line py-3">
              <p className="text-[15px] font-bold">続けて入れない勤務の組み合わせ</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">「遅番の次の日に、早番を入れない」のような決まりです。</p>
              {plan.rules.forbiddenPairs.length > 0 ? (
                <ul className="mt-2 grid gap-1.5">
                  {plan.rules.forbiddenPairs.map((fp) => {
                    const a = plan.shiftTypes.find((s) => s.id === fp.first)
                    const b = plan.shiftTypes.find((s) => s.id === fp.next)
                    return (
                      <li key={fp.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border-2 border-ink/25 bg-paper/60 py-1 pl-3 pr-1 text-sm font-bold">
                        {a ? <ShiftBlock shift={a} size="sm" /> : null}
                        <span>{shiftName(fp.first)}の次の日に、</span>
                        {b ? <ShiftBlock shift={b} size="sm" /> : null}
                        <span>{shiftName(fp.next)}を入れない</span>
                        <Button variant="ghost" size="icon" className="ml-auto" aria-label={`「${shiftName(fp.first)}の次の日に${shiftName(fp.next)}を入れない」を消す`} onClick={() => update((p) => removeForbiddenPair(p, fp.id))}>
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              {!noShifts && plan.rules.forbiddenPairs.length < LIMITS.forbiddenPairs ? (
                <div className="mt-2 flex flex-wrap items-end gap-2 text-sm font-bold">
                  <Select aria-label="前の日の勤務" value={fpFirstId} onChange={(e) => setFpFirst(e.target.value)}>
                    {plan.shiftTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || '（名前なし）'}
                      </option>
                    ))}
                  </Select>
                  <span className="pb-2.5">の次の日に</span>
                  <Select aria-label="次の日の勤務" value={fpNextId} onChange={(e) => setFpNext(e.target.value)}>
                    {plan.shiftTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || '（名前なし）'}
                      </option>
                    ))}
                  </Select>
                  <span className="pb-2.5">を入れない</span>
                  <Button variant="outline" disabled={fpExists} onClick={() => update((p) => addForbiddenPair(p, fpFirstId, fpNextId))}>
                    <Plus aria-hidden />
                    この決まりを足す
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-2">
              <Switch
                checked={plan.rules.weeklyDayOff}
                onChange={(on) => update((p) => updateRules(p, { weeklyDayOff: on }))}
                label="毎週、少なくとも1日は休みにする"
                description="できるだけ守ります。守れなかった週は、点検で知らせます。"
              />
              {plan.rules.weeklyDayOff ? (
                <label className="flex items-center gap-2 text-sm font-bold">
                  週の始まり
                  <Select value={plan.rules.weekStart} onChange={(e) => update((p) => updateRules(p, { weekStart: Number(e.target.value) as Weekday }))}>
                    {WEEK_ORDER.map((w) => (
                      <option key={w} value={w}>
                        {WEEKDAY_LABELS[w]}曜日
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
            </div>

            <div className="border-b border-line py-2">
              <Switch checked={plan.rules.balanceWeekend} onChange={(on) => update((p) => updateRules(p, { balanceWeekend: on }))} label="土日祝に入る回数を、なるべく均等にする" />
            </div>

            <div className="pt-3">
              <p className="text-[15px] font-bold">回数を、なるべく均等にしたい勤務</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">遅番のように、かたよると不公平になる勤務を選びます。</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {plan.shiftTypes.map((s) => {
                  const on = plan.rules.balanceShiftIds.includes(s.id)
                  return (
                    <ToggleChip
                      key={s.id}
                      pressed={on}
                      label={`${s.name}の回数を均等にする`}
                      onPressedChange={(v) => update((p) => updateRules(p, { balanceShiftIds: v ? [...p.rules.balanceShiftIds, s.id] : p.rules.balanceShiftIds.filter((x) => x !== s.id) }))}
                    >
                      <ShiftBlock shift={s} size="sm" />
                      {s.name || '（名前なし）'}
                    </ToggleChip>
                  )
                })}
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border-2 border-dashed border-ink/40 p-4 text-sm leading-[1.8] md:grid-cols-2 md:p-5">
        <div>
          <h2 className="text-base">必ず守ること</h2>
          <p className="mt-1 text-ink-soft">休み希望、固定の休み、入れない曜日と勤務、定休日、連続勤務の上限、続けて入れない組み合わせ、月の勤務日数の上限、手で固定したマス。</p>
        </div>
        <div>
          <h2 className="text-base">なるべく満たすこと</h2>
          <p className="mt-1 text-ink-soft">必要な人数と役割の最低人数（足りないときは、足りないまま出して知らせます）、月の勤務日数の下限、「入りたい」の希望、回数の公平さ、毎週1日の休み。</p>
        </div>
      </div>

      {/* その日だけの人数と、休み */}
      <Dialog open={dayInfo !== null} onOpenChange={(v) => !v && setEditDay(null)}>
        <DialogContent>
          {dayInfo ? <DayEditor d={dayInfo} onClose={() => setEditDay(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DayCell({ d, onPress }: { d: DayInfo; onPress: () => void }) {
  const { plan } = useTool()
  const dayText = formatDay(plan.year, plan.month, d.day)
  const needs = plan.shiftTypes.filter((s) => (d.needs[s.id] ?? 0) > 0)
  const total = needs.reduce((n, s) => n + (d.needs[s.id] ?? 0), 0)
  const summary = d.closed ? '店を開けない日' : needs.length === 0 ? '必要な人数は0人' : needs.map((s) => `${s.name}${d.needs[s.id]}人`).join('、')
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`${dayText}${d.holiday ? `（${d.holiday}）` : ''}: ${summary}${d.overridden ? '（この日だけの人数）' : ''}。押すと変えられます`}
      className={cn(
        'relative flex min-h-[4.25rem] flex-col items-stretch rounded-md border-2 px-1 py-1 text-left transition-colors md:min-h-[4.75rem] md:px-1.5',
        d.closed ? 'border-ink/25 bg-[repeating-linear-gradient(135deg,var(--well)_0_4px,#ece3c8_4px_8px)]' : 'border-ink/30 bg-card hover:border-ink hover:bg-[#fff8dc]',
      )}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className={cn('font-num text-sm font-bold leading-none', (d.weekday === 0 || d.holiday) && 'text-danger', d.weekday === 6 && !d.holiday && 'text-[#1d4fb8]', d.holiday && 'underline decoration-2 underline-offset-2')}>{d.day}</span>
        {d.overridden ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink" /> : null}
      </span>
      {d.holiday ? <span className="mt-0.5 truncate text-[9.5px] font-bold leading-tight text-danger">{d.holiday}</span> : null}
      {d.closed ? (
        <span className="mt-auto text-[11px] font-bold text-ink-soft">休み</span>
      ) : (
        <span className="mt-auto flex flex-wrap gap-x-1.5 gap-y-0 font-num text-[11px] font-bold leading-[1.35]">
          {/* せまい画面では、勤務ごとの人数が入りきらないので、合計だけにする（くわしくは、押して出る画面で） */}
          <span className="sm:hidden">{total}人</span>
          {needs.map((s) => (
            <span key={s.id} className="hidden items-center gap-0.5 sm:inline-flex">
              <span aria-hidden className="inline-block size-2.5 rounded-[2px] border border-ink" style={{ background: `var(--shift-${s.color})` }} />
              {d.needs[s.id]}
            </span>
          ))}
          {needs.length === 0 ? <span className="hidden text-ink-soft sm:inline">0人</span> : null}
        </span>
      )}
    </button>
  )
}

function DayEditor({ d, onClose }: { d: DayInfo; onClose: () => void }) {
  const { plan, update } = useTool()
  const dayText = formatDay(plan.year, plan.month, d.day)
  const closedByDate = d.closed === 'date'
  const wouldBeClosed = plan.closed.weekdays.includes(d.weekday) || (!!d.holiday && holidaysClosed(plan))
  const hasOverride = !!plan.needs.overrides[String(d.day)]
  const reset = () =>
    update((p) => {
      let next = p
      for (const s of p.shiftTypes) next = setDayNeed(next, d.day, s.id, null)
      return next
    })

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {dayText}
          {d.holiday ? <span className="ml-2 text-sm font-bold text-danger">{d.holiday}</span> : null}
        </DialogTitle>
        <DialogDescription>
          {closedByDate
            ? 'この日は、休みにしてあります。'
            : d.closed === 'weekday'
              ? '定休日の曜日です。この日だけ開けるときは、下に人数を入れてください。'
              : d.closed === 'holiday'
                ? plan.holidayMode === 'closed'
                  ? '祝日は休みにする設定です。この日だけ開けるときは、下に人数を入れてください。'
                  : '祝日は「日曜と同じ」の設定で、日曜日が定休日なので、休みです。この日だけ開けるときは、下に人数を入れてください。'
                : d.overridden
                  ? 'この日だけの人数になっています。'
                  : 'この日だけ、人数を変えたり、休みにしたりできます。'}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-2 pb-4">
          {plan.shiftTypes.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-ink/25 bg-paper/60 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                <ShiftBlock shift={s} size="sm" />
                <span className="truncate">{s.name || '（名前なし）'}</span>
              </span>
              <NumberField
                label={`${dayText}の${s.name}の必要な人数`}
                value={d.needs[s.id] ?? 0}
                min={0}
                max={LIMITS.needPerShift}
                unit="人"
                disabled={closedByDate}
                onChange={(v) => update((p) => setDayNeed(p, d.day, s.id, v ?? 0))}
              />
            </div>
          ))}
          {plan.shiftTypes.length === 0 ? <p className="text-sm text-ink-soft">勤務の種類が、まだありません。</p> : null}
        </div>
        {hasOverride && !closedByDate ? (
          <Button variant="outline" size="sm" className="mb-4" onClick={reset}>
            {wouldBeClosed ? 'この日だけの人数をやめる（休みに戻す）' : '曜日の人数に戻す'}
          </Button>
        ) : null}
        <div className="border-t-2 border-ink/15 pb-3 pt-2">
          <Switch checked={closedByDate} onChange={() => update((p) => toggleClosedDay(p, d.day))} label="この日は、店を開けない" description="だれも入れない日になります。年末年始や、臨時の休みに。" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </DialogFooter>
    </>
  )
}
