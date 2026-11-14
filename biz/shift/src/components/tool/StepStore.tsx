// ① 店とスタッフ。店の名前、対象の年月、定休日、勤務の種類、役割の札、スタッフ。
import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import {
  addShiftType,
  addStaff,
  addTag,
  applyShiftPreset,
  canWork,
  formatDay,
  formatMinutes,
  formatMonth,
  hasMonthData,
  holidayNotice,
  LIMITS,
  nextId,
  parseTime,
  removeShiftType,
  removeStaff,
  removeTag,
  setCanWork,
  setMonth,
  SHIFT_COLOR_LABELS,
  SHIFT_COLORS,
  SHIFT_PRESETS,
  shiftMinutes,
  toggleClosedDay,
  updateShiftType,
  updateStaff,
  WEEKDAY_LABELS,
  YEAR_MAX,
  YEAR_MIN,
  type ShiftPlan,
  type ShiftType,
  type Staff,
  type Weekday,
} from '@/core'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, Input, Label, Select } from '@/components/ui/field'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { NumberField } from '@/components/ui/number-field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from '@/components/ui/toast'
import { ShiftBlock } from '@/components/shift-block'
import { Section, StepHeading, ToggleChip, useTool, WEEK_ORDER, WeekdayToggles } from './tool-context'

/** 文字数（見た目の1文字ずつ）で切る。保存の検査（core の storage.ts）と同じ数え方にする */
function clip(text: string, max: number): string {
  const chars = [...text]
  return chars.length > max ? chars.slice(0, max).join('') : text
}

const toggleWeekday = (list: Weekday[], w: Weekday, on: boolean): Weekday[] => {
  const set = new Set(list)
  if (on) set.add(w)
  else set.delete(w)
  return [...set].sort((a, b) => a - b)
}

/** そのスタッフの「入れない勤務」を、ひとことにまとめる（たたんだままでも、決めた内容が見えるように） */
function restrictionSummary(staff: Staff, plan: ShiftPlan): string {
  const parts: string[] = []
  for (const s of plan.shiftTypes) {
    const days = (staff.cannotWork[s.id] ?? []).filter((w) => !staff.fixedOffWeekdays.includes(w))
    const open = WEEK_ORDER.filter((w) => !staff.fixedOffWeekdays.includes(w))
    if (days.length === 0) continue
    const name = s.name || s.symbol || '（名前なし）'
    if (days.length >= open.length) parts.push(`${name}には入らない`)
    else parts.push(`${name}は${WEEK_ORDER.filter((w) => days.includes(w)).map((w) => WEEKDAY_LABELS[w]).join('・')}に入らない`)
  }
  return parts.join('、')
}

export function StepStore() {
  const { plan, update, gate, isPro, openLicense, goStep, undo } = useTool()
  const [pendingMonth, setPendingMonth] = useState<{ year: number; month: number } | null>(null)
  const [pendingPreset, setPendingPreset] = useState<string | null>(null)
  const [openStaff, setOpenStaff] = useState<string | null>(null)
  const [focusStaff, setFocusStaff] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')

  // 足したスタッフの名前の欄に、すぐ打てるようにフォーカスを移す
  useEffect(() => {
    if (!focusStaff) return
    document.getElementById(`staff-name-${focusStaff}`)?.focus()
    setFocusStaff(null)
  }, [focusStaff, plan.staff.length])

  const changeMonth = (year: number, month: number) => {
    if (year === plan.year && month === plan.month) return
    if (hasMonthData(plan)) setPendingMonth({ year, month })
    else update((p) => setMonth(p, year, month))
  }

  const nowYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = Math.max(YEAR_MIN, Math.min(nowYear - 1, plan.year)); y <= Math.min(YEAR_MAX, Math.max(nowYear + 3, plan.year)); y++) years.push(y)
  const notice = holidayNotice(plan.year)

  const addOneStaff = () => {
    if (!gate.canAddStaff) return
    const id = nextId('st', plan.staff.map((s) => s.id))
    update((p) => addStaff(p))
    setFocusStaff(id)
  }

  const undoToast = (text: string) => toast.message(text, { label: '元に戻す', onClick: () => undo() })

  const submitTag = () => {
    const name = clip(newTag.trim(), LIMITS.nameLength)
    if (name === '') return
    if (plan.tags.some((t) => t.name === name)) {
      toast.error(`「${name}」の札は、もうあります。`)
      return
    }
    update((p) => addTag(p, name))
    setNewTag('')
  }

  const presetLabel = SHIFT_PRESETS.find((p) => p.id === pendingPreset)?.label

  return (
    <div>
      <StepHeading no={1} title="店とスタッフ" lead="店の休みの日と、勤務の種類、スタッフを入れます。あとからいつでも直せます。" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="店と月">
          <div className="grid gap-4">
            <Field label="店の名前" htmlFor="store-name" hint="印刷する表の上に出ます。空のままでも使えます。">
              <Input
                id="store-name"
                value={plan.storeName}
                placeholder="例: さくら美容室"
                autoComplete="off"
                onChange={(e) => update((p) => ({ ...p, storeName: clip(e.target.value, LIMITS.nameLength) }), { coalesce: 'storeName' })}
              />
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">シフトを組む月</legend>
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="年" value={plan.year} onChange={(e) => changeMonth(Number(e.target.value), plan.month)} className="w-[7.5rem]">
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}年
                    </option>
                  ))}
                </Select>
                <Select aria-label="月" value={plan.month} onChange={(e) => changeMonth(plan.year, Number(e.target.value))} className="w-[6rem]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </Select>
              </div>
              {notice ? <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{notice}</p> : null}
            </fieldset>

            <div>
              <p className="mb-1.5 text-sm font-bold" id="closed-weekdays-label">
                定休日の曜日
              </p>
              <WeekdayToggles
                selected={plan.closed.weekdays}
                labelFor={(w) => `${w}曜日を定休日にする`}
                onToggle={(w, on) => update((p) => ({ ...p, closed: { ...p.closed, weekdays: toggleWeekday(p.closed.weekdays, w, on) } }))}
              />
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">年末年始など、特定の日だけ休みにするときは、②のカレンダーで、その日を押します。</p>
              <Button variant="link" className="text-[13px]" onClick={() => goStep(1)}>
                ②のカレンダーを開く
              </Button>
              {plan.closed.days.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="この月だけの休みの日">
                  {plan.closed.days.map((day) => (
                    <li key={day} className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-well pl-2 text-[13px] font-bold">
                      {formatDay(plan.year, plan.month, day)}は休み
                      <button
                        type="button"
                        aria-label={`${formatDay(plan.year, plan.month, day)}の休みをやめる`}
                        className="grid size-11 place-items-center rounded-r-[4px] hover:bg-[#ece3c8] md:size-9"
                        onClick={() => update((p) => toggleClosedDay(p, day))}
                      >
                        <X aria-hidden className="size-4" strokeWidth={3} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Section>

        <Section title="役割の札" lead="「薬剤師」「鍵を持っている」のように、必ず1人はいてほしい役割があれば、札を作ってスタッフに付けます。なければ、空のままでかまいません。">
          {plan.tags.length > 0 ? (
            <ul className="mb-3 flex flex-wrap gap-2">
              {plan.tags.map((t) => (
                <li key={t.id} className="inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-card pl-3 text-sm font-bold">
                  {t.name}
                  <span className="font-num text-xs font-medium text-ink-soft">{plan.staff.filter((s) => s.tagIds.includes(t.id)).length}人</span>
                  <button
                    type="button"
                    aria-label={`「${t.name}」の札を消す`}
                    className="grid size-11 place-items-center rounded-r-md hover:bg-well md:size-10"
                    onClick={() => {
                      update((p) => removeTag(p, t.id))
                      undoToast(`「${t.name}」の札を消しました。`)
                    }}
                  >
                    <X aria-hidden className="size-4" strokeWidth={3} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {plan.tags.length < LIMITS.tags ? (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                submitTag()
              }}
            >
              <Field label="新しい札の名前" htmlFor="new-tag" className="min-w-0 flex-1 basis-48">
                <Input id="new-tag" value={newTag} placeholder="例: 鍵を持っている" autoComplete="off" onChange={(e) => setNewTag(clip(e.target.value, LIMITS.nameLength))} />
              </Field>
              <Button type="submit" variant="outline" disabled={newTag.trim() === ''}>
                <Plus aria-hidden />
                札を足す
              </Button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft">札は{LIMITS.tags}個までです。</p>
          )}
        </Section>
      </div>

      <Section
        title="勤務の種類"
        lead="表に出す記号は、1〜2文字です。休憩の時間は、勤務時間の合計から引きます。"
        className="mt-5"
        aside={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                ひな形から選び直す
                <ChevronDown aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              <p className="px-2 pb-1 pt-1 text-[13px] leading-relaxed text-ink-soft">いまの勤務の種類を、ひな形と入れかえます。</p>
              {SHIFT_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className="flex min-h-11 w-full flex-col rounded-md px-2 py-2 text-left hover:bg-well" onClick={() => setPendingPreset(preset.id)}>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    {preset.shiftTypes.map((s) => (
                      <ShiftBlock key={s.id} shift={s} size="sm" />
                    ))}
                    {preset.label}
                  </span>
                  <span className="mt-0.5 text-[12.5px] text-ink-soft">{preset.note}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        }
      >
        {plan.shiftTypes.length === 0 ? (
          <p className="mb-3 text-sm font-bold text-danger">勤務の種類が、まだありません。下のボタンで足してください。</p>
        ) : (
          <ul className="grid gap-3">
            {plan.shiftTypes.map((s, i) => (
              <ShiftTypeRow key={s.id} shift={s} index={i} />
            ))}
          </ul>
        )}
        <div className="mt-4">
          {plan.shiftTypes.length < LIMITS.shiftTypes ? (
            <Button variant="outline" onClick={() => update((p) => addShiftType(p))}>
              <Plus aria-hidden />
              勤務の種類を足す
            </Button>
          ) : (
            <p className="text-sm text-ink-soft">勤務の種類は{LIMITS.shiftTypes}つまでです。</p>
          )}
        </div>
      </Section>

      <Section
        title="スタッフ"
        className="mt-5"
        lead="固定の休みの曜日と、月の勤務日数を入れます。日数は、決めないなら空のままにします。"
        aside={
          <p className="rounded-md border-2 border-ink bg-well px-2.5 py-1 text-sm font-bold">
            <span className="font-num">{plan.staff.length}</span>人
            {!isPro ? <span className="font-medium text-ink-soft">（無料版は{gate.staffLimit}人まで）</span> : null}
          </p>
        }
      >
        {plan.staff.length === 0 ? (
          <Empty className="mb-4">
            <EmptyHeader>
              <EmptyMedia>
                <Plus strokeWidth={3} />
              </EmptyMedia>
              <EmptyTitle>スタッフが、まだいません</EmptyTitle>
              <EmptyDescription>名前を入れるところから始めます。名前の欄で Enter キーを押すと、次の人を続けて足せます。</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={addOneStaff}>
                <Plus aria-hidden />
                1人めのスタッフを足す
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {/* 幅の広い画面では、1人を1行にして、見出しを上に1回だけ出す */}
            <div aria-hidden className="mb-1 hidden grid-cols-[11rem_minmax(0,1fr)_17.5rem_17rem_11.5rem] gap-3 px-3 text-xs font-bold text-ink-soft xl:grid">
              <span>名前</span>
              <span>役割の札</span>
              <span>固定の休みの曜日</span>
              <span>月の勤務日数（下限 〜 上限）</span>
              <span>入れない勤務</span>
            </div>
            <ul className="grid gap-4 md:gap-3 xl:gap-2">
              {plan.staff.map((st, i) => (
                <StaffRow
                  key={st.id}
                  staff={st}
                  index={i}
                  open={openStaff === st.id}
                  onOpenChange={(v) => setOpenStaff(v ? st.id : null)}
                  onEnter={i === plan.staff.length - 1 ? addOneStaff : undefined}
                  onRemove={() => {
                    update((p) => removeStaff(p, st.id))
                    undoToast(`${st.name || '（名前なし）'}さんを消しました。`)
                  }}
                />
              ))}
            </ul>
          </>
        )}

        {plan.staff.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={addOneStaff} disabled={!gate.canAddStaff}>
              <Plus aria-hidden />
              スタッフを足す
            </Button>
          </div>
        ) : null}

        {!gate.canAddStaff && !isPro ? (
          <Notice variant="warn" className="mt-4">
            <NoticeTitle>無料版は、スタッフ{gate.staffLimit}人までです。</NoticeTitle>
            <NoticeBody>
              {gate.staffLimit + 1}人以上の店は、{site.plans.pro.name}版（{site.plans.pro.price}。月額の料金はありません）で使えます。
              <Button variant="link" className="ml-1 text-[13.5px]" onClick={openLicense}>
                {site.plans.pro.name}版について見る
              </Button>
            </NoticeBody>
          </Notice>
        ) : null}
        {gate.message && gate.overBy > 0 ? (
          <Notice variant="warn" className="mt-4">
            <NoticeBody>{gate.message}</NoticeBody>
          </Notice>
        ) : null}
        {!gate.canAddStaff && isPro ? <p className="mt-3 text-sm text-ink-soft">スタッフは{LIMITS.staff}人までです。</p> : null}
      </Section>

      {/* 月を変える前の確かめ */}
      <Dialog open={pendingMonth !== null} onOpenChange={(v) => !v && setPendingMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingMonth ? `${formatMonth(pendingMonth.year, pendingMonth.month)}に変えますか` : ''}</DialogTitle>
            <DialogDescription>月を変えると、日付にひもづくものが消えます。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="list-disc space-y-1 pb-3 pl-5 text-sm leading-relaxed">
              <li>消えるもの: {formatMonth(plan.year, plan.month)}の希望休、シフト表、この月だけの休みの日と人数</li>
              <li>残るもの: 店の名前、定休日の曜日、勤務の種類、スタッフ、曜日ごとの必要な人数、条件</li>
            </ul>
            <p className="pb-3 text-sm leading-relaxed text-ink-soft">いまの月を残しておきたいときは、先に、上の「ファイルに保存する」で保存してください。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingMonth(null)}>
              やめる
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingMonth) update((p) => setMonth(p, pendingMonth.year, pendingMonth.month))
                setPendingMonth(null)
              }}
            >
              月を変える
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ひな形に入れかえる前の確かめ */}
      <Dialog open={pendingPreset !== null} onOpenChange={(v) => !v && setPendingPreset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>勤務の種類を「{presetLabel}」に入れかえますか</DialogTitle>
            <DialogDescription>いまの勤務の種類を指しているものは、いっしょに消えます。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="pb-3 text-sm leading-relaxed">消えるもの: いまの勤務の種類、その必要な人数、役割の最低人数、「この勤務に入りたい」の希望、続けて入れない組み合わせ、シフト表に入っている勤務。</p>
            <p className="pb-3 text-sm leading-relaxed text-ink-soft">休み希望と、スタッフは残ります。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingPreset(null)}>
              やめる
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingPreset) update((p) => applyShiftPreset(p, pendingPreset))
                setPendingPreset(null)
              }}
            >
              入れかえる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShiftTypeRow({ shift, index }: { shift: ShiftType; index: number }) {
  const { plan, update, undo } = useTool()
  const [colorOpen, setColorOpen] = useState(false)
  const n = index + 1
  const patch = (p: Partial<Omit<ShiftType, 'id'>>, coalesce?: string) => update((plan) => updateShiftType(plan, shift.id, p), coalesce ? { coalesce: `${coalesce}:${shift.id}` } : undefined)
  const minutes = shiftMinutes(shift)
  const startOk = parseTime(shift.start) !== null
  const overnight = startOk && (parseTime(shift.end) ?? 0) <= (parseTime(shift.start) ?? 0)
  const id = (name: string) => `shift-${shift.id}-${name}`
  const sameSymbol = shift.symbol !== '' && plan.shiftTypes.some((s) => s.id !== shift.id && s.symbol === shift.symbol)

  return (
    <li className="rounded-lg border-2 border-ink/25 bg-paper/60 p-3">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-ink-soft" id={id('color-label')}>
            色
          </span>
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-label={`${n}つめの勤務の色（いまは${SHIFT_COLOR_LABELS[shift.color]}）を変える`} className="grid size-11 place-items-center rounded-lg border-2 border-ink bg-card hover:bg-well">
                <ShiftBlock shift={shift} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[15.5rem]">
              <p className="mb-2 text-sm font-bold">ブロックの色</p>
              <div role="radiogroup" aria-label="ブロックの色" className="grid grid-cols-4 gap-2">
                {SHIFT_COLORS.map((c) => {
                  const used = plan.shiftTypes.some((s) => s.id !== shift.id && s.color === c)
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={shift.color === c}
                      aria-label={`${SHIFT_COLOR_LABELS[c]}${used ? '（ほかの勤務で使っています）' : ''}`}
                      title={SHIFT_COLOR_LABELS[c]}
                      onClick={() => {
                        patch({ color: c })
                        setColorOpen(false)
                      }}
                      className={cn('grid size-12 place-items-center rounded-lg border-2', shift.color === c ? 'border-ink bg-well shadow-hard-sm' : 'border-transparent hover:border-ink/40')}
                    >
                      <span className="blk" data-color={c} aria-hidden>
                        {shift.color === c ? '✓' : used ? '·' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">「·」の付いた色は、ほかの勤務で使っています。</p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1.5">
          <Label htmlFor={id('name')} className="text-xs text-ink-soft">
            名前
          </Label>
          <Input id={id('name')} value={shift.name} placeholder="例: 早番" autoComplete="off" onChange={(e) => patch({ name: clip(e.target.value, LIMITS.nameLength) }, 'shiftName')} />
        </div>

        <div className="flex w-[4.5rem] flex-col gap-1.5">
          <Label htmlFor={id('symbol')} className="text-xs text-ink-soft">
            記号
          </Label>
          <Input
            id={id('symbol')}
            value={shift.symbol}
            placeholder="早"
            autoComplete="off"
            aria-invalid={sameSymbol || undefined}
            className={cn('px-0 text-center font-bold', sameSymbol && 'border-danger')}
            onChange={(e) => patch({ symbol: clip(e.target.value.trim(), LIMITS.symbolLength) }, 'shiftSymbol')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('start')} className="text-xs text-ink-soft">
            開始
          </Label>
          <Input
            id={id('start')}
            type="time"
            value={shift.start}
            className="w-[9.25rem] font-num"
            onChange={(e) => {
              // 消している途中の空の値は、保存できない形なので受け取らない
              if (parseTime(e.target.value) !== null) patch({ start: e.target.value })
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('end')} className="text-xs text-ink-soft">
            終了
          </Label>
          <Input
            id={id('end')}
            type="time"
            value={shift.end}
            className="w-[9.25rem] font-num"
            onChange={(e) => {
              if (parseTime(e.target.value) !== null) patch({ end: e.target.value })
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-ink-soft">休憩</span>
          <NumberField label={`${shift.name || `${n}つめの勤務`}の休憩（分）`} value={shift.breakMinutes} min={0} max={600} step={15} unit="分" onChange={(v) => patch({ breakMinutes: v ?? 0 })} />
        </div>

        <div className="ml-auto flex items-center gap-2 self-end">
          <p className="text-[13px] leading-tight text-ink-soft">
            1回 <span className="font-num font-bold text-ink">{formatMinutes(minutes)}</span>
            {overnight ? <span className="block text-xs">（次の日にまたがる勤務）</span> : null}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${shift.name || `${n}つめの勤務`}を消す`}
            onClick={() => {
              update((p) => removeShiftType(p, shift.id))
              toast.message(`「${shift.name || '名前なし'}」を消しました。この勤務の必要な人数や、表のマスも消えています。`, { label: '元に戻す', onClick: () => undo() })
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      {sameSymbol ? <p className="mt-2 text-[13px] font-bold text-danger">記号「{shift.symbol}」が、ほかの勤務と同じです。表で見分けられないので、別の記号にしてください。</p> : null}
    </li>
  )
}

function StaffRow({
  staff,
  index,
  open,
  onOpenChange,
  onEnter,
  onRemove,
}: {
  staff: Staff
  index: number
  open: boolean
  onOpenChange: (v: boolean) => void
  /** 名前の欄で Enter を押したとき（最後の行だけ。次の人を足す） */
  onEnter?: () => void
  onRemove: () => void
}) {
  const { plan, update } = useTool()
  const n = index + 1
  const who = staff.name ? `${staff.name}さん` : `${n}人めのスタッフ`
  const patch = (p: Partial<Omit<Staff, 'id'>>, coalesce?: string) => update((plan) => updateStaff(plan, staff.id, p), coalesce ? { coalesce: `${coalesce}:${staff.id}` } : undefined)
  const summary = restrictionSummary(staff, plan)
  const badRange = staff.minDays !== null && staff.maxDays !== null && staff.minDays > staff.maxDays
  const label = 'mb-1 block text-xs font-bold text-ink-soft xl:sr-only'

  return (
    <li className="border-t-2 border-ink/20 pt-4 first:border-t-0 first:pt-0 md:rounded-lg md:border-2 md:border-ink/25 md:bg-paper/60 md:p-3 md:first:border-t-2 md:first:pt-3 xl:py-2 xl:first:pt-2">
      <div className="grid gap-3 xl:grid-cols-[11rem_minmax(0,1fr)_17.5rem_17rem_13.5rem] xl:items-center">
        <div className="flex items-end gap-2 xl:block">
          <div className="min-w-0 flex-1">
            <label htmlFor={`staff-name-${staff.id}`} className={label}>
              名前
            </label>
            <Input
              id={`staff-name-${staff.id}`}
              value={staff.name}
              placeholder={`${n}人めの名前`}
              autoComplete="off"
              onChange={(e) => patch({ name: clip(e.target.value, LIMITS.nameLength) }, 'staffName')}
              onKeyDown={(e) => {
                // 変換を決める Enter では、次の人を足さない
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && onEnter && staff.name.trim() !== '') onEnter()
              }}
            />
          </div>
          <Button variant="ghost" size="icon" className="xl:hidden" aria-label={`${who}を消す`} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        </div>

        <div>
          <span className={label}>役割の札</span>
          {plan.tags.length === 0 ? (
            <p className="text-[13px] text-ink-soft">札はまだありません</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {plan.tags.map((t) => (
                <ToggleChip
                  key={t.id}
                  pressed={staff.tagIds.includes(t.id)}
                  label={`${who}に「${t.name}」の札を付ける`}
                  onPressedChange={(on) => patch({ tagIds: on ? [...staff.tagIds, t.id] : staff.tagIds.filter((x) => x !== t.id) })}
                >
                  {t.name}
                </ToggleChip>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className={label}>固定の休みの曜日</span>
          <WeekdayToggles
            selected={staff.fixedOffWeekdays}
            labelFor={(w) => `${who}の${w}曜日を、固定の休みにする`}
            onToggle={(w, on) => patch({ fixedOffWeekdays: toggleWeekday(staff.fixedOffWeekdays, w, on) })}
          />
        </div>

        <div>
          <span className={label}>月の勤務日数（下限 〜 上限）</span>
          <div className="flex items-center gap-1.5">
            <NumberField label={`${who}の月の勤務日数の下限`} value={staff.minDays} min={0} max={31} allowEmpty placeholder="なし" onChange={(v) => patch({ minDays: v })} />
            <span aria-hidden className="text-sm font-bold">
              〜
            </span>
            <NumberField label={`${who}の月の勤務日数の上限`} value={staff.maxDays} min={0} max={31} allowEmpty placeholder="なし" onChange={(v) => patch({ maxDays: v })} />
          </div>
          {badRange ? <p className="mt-1 text-xs font-bold text-danger">下限が、上限より大きくなっています。</p> : null}
        </div>

        <div className="flex items-center gap-1">
          <Button variant={open ? 'secondary' : 'ghost'} size="sm" aria-expanded={open} aria-controls={`staff-detail-${staff.id}`} onClick={() => onOpenChange(!open)} className="min-w-0 flex-1 justify-between border-ink/40 px-2.5">
            <span className="truncate">
              <span className="xl:hidden">入れない勤務を、</span>曜日ごとに決める
            </span>
            <ChevronDown aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
          <Button variant="ghost" size="icon" className="hidden xl:inline-flex" aria-label={`${who}を消す`} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      {summary && !open ? <p className="mt-2 text-[13px] leading-relaxed text-ink-soft xl:mt-1">{summary}</p> : null}

      {open ? (
        <div id={`staff-detail-${staff.id}`} className="mt-3 border-t-2 border-dashed border-ink/40 pt-3 md:rounded-lg md:border-2 md:border-solid md:border-ink md:bg-card md:p-3">
          <p className="text-sm font-bold">{who}が入れる曜日と勤務</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">入れない曜日を押して、外します。色の付いた曜日が「入れる」です。</p>
          {plan.shiftTypes.length === 0 ? <p className="mt-2 text-sm text-ink-soft">勤務の種類が、まだありません。</p> : null}
          <div className="mt-3 grid gap-3">
            {plan.shiftTypes.map((s) => {
              const all = WEEK_ORDER.filter((w) => !staff.fixedOffWeekdays.includes(w))
              const canAny = all.some((w) => canWork(staff, w, s.id))
              return (
                <div key={s.id} className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
                  <div className="flex w-36 shrink-0 items-center gap-2 text-sm font-bold">
                    <ShiftBlock shift={s} size="sm" />
                    <span className="truncate">{s.name || '（名前なし）'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-0.5 md:gap-1">
                    {WEEK_ORDER.map((w) => {
                      const fixedOff = staff.fixedOffWeekdays.includes(w)
                      const can = canWork(staff, w, s.id)
                      return (
                        <button
                          key={w}
                          type="button"
                          aria-pressed={can}
                          disabled={fixedOff}
                          aria-label={`${WEEKDAY_LABELS[w]}曜日の${s.name}: ${fixedOff ? '固定の休み' : can ? '入れる' : '入れない'}`}
                          title={fixedOff ? '固定の休みの曜日です' : undefined}
                          onClick={() => patch({ cannotWork: setCanWork(staff, w, s.id, !can).cannotWork })}
                          className={cn(
                            'relative grid size-11 place-items-center rounded-md border-2 text-sm font-bold md:size-9',
                            fixedOff ? 'border-ink/20 bg-well text-ink/35' : can ? 'blk !h-11 !w-11 border-ink md:!h-9 md:!w-9' : 'border-ink/40 bg-card text-ink-soft line-through decoration-2',
                          )}
                          data-color={can && !fixedOff ? s.color : undefined}
                        >
                          {WEEKDAY_LABELS[w]}
                        </button>
                      )
                    })}
                    <Button
                      variant="link"
                      className="ml-2 text-[13px]"
                      onClick={() => {
                        let next = staff
                        for (const w of all) next = setCanWork(next, w, s.id, !canAny)
                        patch({ cannotWork: next.cannotWork })
                      }}
                    >
                      {canAny ? 'ぜんぶ外す' : 'ぜんぶ入れる'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </li>
  )
}
