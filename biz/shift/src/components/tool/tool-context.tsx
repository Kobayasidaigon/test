// 道具の画面の中で、どの手順からも使うもの（いまの plan、書きかえる関数、プランの制限）をわたす入れ物と、
// 手順のあいだで共通の小さな部品。
import { createContext, useContext, type ReactNode } from 'react'
import { WEEKDAY_LABELS, type Gate, type ShiftPlan, type Weekday } from '@/core'
import { cn } from '@/lib/utils'
import type { PlanStore } from './use-plan-store'

export type ToolContextValue = {
  plan: ShiftPlan
  update: PlanStore['update']
  replace: PlanStore['replace']
  undo: PlanStore['undo']
  gate: Gate
  isPro: boolean
  /** 買い切り版の案内とキーの入力を開く */
  openLicense: () => void
  /** 手順を移る（0 = ①店とスタッフ … 3 = ④シフト表） */
  goStep: (index: number) => void
}

const ToolContext = createContext<ToolContextValue | null>(null)
export const ToolProvider = ToolContext.Provider

export function useTool(): ToolContextValue {
  const v = useContext(ToolContext)
  if (!v) throw new Error('useTool は、ToolProvider の中で使ってください。')
  return v
}

/** 画面で曜日を並べる順（月曜はじまり）。core の曜日は 0 = 日曜 */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

/** 手順の見出し */
export function StepHeading({ no, title, lead }: { no: number; title: string; lead: ReactNode }) {
  return (
    <header className="mb-5 md:mb-6">
      <h1 className="flex items-center gap-3 text-[1.4rem] md:text-[1.7rem]">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-ink bg-shift-egg font-num text-lg font-bold shadow-hard-sm md:size-10">
          {no}
        </span>
        <span>{title}</span>
      </h1>
      <p className="mt-2 max-w-[40em] text-[15px] leading-[1.8] text-ink-soft">{lead}</p>
    </header>
  )
}

/** 手順の中の、ひとまとまり */
export function Section({ title, lead, aside, children, className, id }: { title: string; lead?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('rounded-xl border-2 border-ink bg-card p-4 md:p-6', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl">{title}</h2>
          {lead ? <p className="mt-1 max-w-[40em] text-sm leading-[1.8] text-ink-soft">{lead}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** 押して入・切を切りかえる札（役割の札、均等にしたい勤務 など） */
export function ToggleChip({ pressed, onPressedChange, children, label, className }: { pressed: boolean; onPressedChange: (v: boolean) => void; children: ReactNode; label?: string; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 px-3 text-sm font-bold leading-tight transition-colors md:min-h-9',
        pressed ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-card text-ink-soft hover:border-ink hover:text-ink',
        className,
      )}
    >
      {/* 色だけに頼らないよう、選んだ札にはチェックの印を付ける */}
      <span aria-hidden className={cn('grid size-4 place-items-center rounded-[3px] border-2 text-[10px] leading-none', pressed ? 'border-paper bg-shift-egg text-ink' : 'border-ink/40')}>
        {pressed ? '✓' : ''}
      </span>
      {children}
    </button>
  )
}

/**
 * 曜日を7つ並べた切りかえ。
 * tone="off" は「休みにする曜日」（選ぶと紺。定休日、固定の休み）。
 */
export function WeekdayToggles({
  selected,
  onToggle,
  labelFor,
  disabled,
  className,
}: {
  selected: Weekday[]
  onToggle: (weekday: Weekday, next: boolean) => void
  /** 読み上げ用の名前を作る（例: (月) => '月曜を定休日にする'） */
  labelFor: (weekdayLabel: string) => string
  disabled?: Weekday[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {WEEK_ORDER.map((w) => {
        const on = selected.includes(w)
        const off = disabled?.includes(w) ?? false
        return (
          <button
            key={w}
            type="button"
            aria-pressed={on}
            aria-label={labelFor(WEEKDAY_LABELS[w])}
            disabled={off}
            onClick={() => onToggle(w, !on)}
            className={cn(
              'relative grid size-11 place-items-center rounded-md border-2 text-sm font-bold transition-colors md:size-9',
              on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-card text-ink hover:border-ink',
              off && 'opacity-40',
            )}
          >
            {WEEKDAY_LABELS[w]}
            {/* 色だけに頼らないよう、選んだ曜日には小さな「休」を重ねる */}
            {on ? <span aria-hidden className="absolute -right-1.5 -top-1.5 rounded-[3px] border border-ink bg-shift-egg px-[2px] text-[9px] font-extrabold leading-[11px] text-ink">休</span> : null}
          </button>
        )
      })}
    </div>
  )
}
