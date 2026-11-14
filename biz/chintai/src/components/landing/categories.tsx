// Feature 11 from Hirael <https://hirael.com/blocks/features/feature-11>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
//
// mohammadshehadeh の Feature Tab Switcher（21st.dev）をもとにした、「何がわかるか」の欄。
//
// もとの部品から残したもの:
// - 左に縦に並んだ見出し（題と、ひとことの説明）、右にその中身、という2つの並び。
// - タブとしてのふるまい（矢印キーで見出しを動かすと、右の中身もついてくる。選んだ見出しだけ Tab で止まる）。
//
// 変えたもの:
// - 見本の中身（共有の受信箱の例、人の頭文字の丸）は、すべて捨てた。
//   右に出すのは、本物の判定ロジック（core の inspectEstimate）が出した、その区分の行の点検の結果。
// - 見出しは、紙のファイルの「見出しの耳」にした（道具の画面の、手順の耳と同じ考え方）。
//   選んだ耳は白くなって、右の紙とつながる。アイコンのかわりに、区分の印（赤ペンの丸の中の1文字）を置いた。
// - Radix の Tabs は入れず、ふるまいを自分で書いた（この欄のためだけに、依存を増やさない）。
// - せまい画面では、見出しを2列に並べて、その下に中身を出す。

import { useEffect, useId, useRef, useState } from 'react'
import { categories } from '@/core/categories'
import { formatYen } from '@/core/format'
import type { CategoryId, Finding, Inspection } from '@/core/types'
import { CategoryMark, FindingMark } from '@/components/category-mark'
import { FindingDetails } from '@/components/finding-card'
import { DisclosureChevron, DisclosurePanel } from '@/components/ui/disclosure'
import { cn } from '@/lib/utils'

/** 区分ごとに、例として見せる項目（見本の見積書の中の行）。なければ、その区分のはじめの行。 */
const EXAMPLE_ITEM: Record<CategoryId, string> = {
  usual: 'hiwari',
  capped: 'chukai',
  optional: 'shodoku',
  choosable: 'kasaihoken',
  'who-pays': 'kagi',
  overlap: 'cleaning',
  contract: 'koshin',
  other: 'other',
}

function exampleOf(inspection: Inspection, id: CategoryId): Finding | null {
  const inCategory = inspection.findings.filter((f) => f.category === id)
  return inCategory.find((f) => f.itemId === EXAMPLE_ITEM[id]) ?? inCategory[0] ?? null
}

/**
 * 1行の点検の結果。道具の「項目ごとの点検」と同じ中身（FindingDetails）を出す。
 * 「理由と根拠」は、道具と同じように、開いたり閉じたりできる。
 */
function ExampleFinding({ f, open, onToggle }: { f: Finding; open: boolean; onToggle: () => void }) {
  const base = useId()
  const attention = f.level === 'check' || f.level === 'alert'
  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <FindingMark f={f} className="mt-0.5 text-[15px]" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <h3 className="text-base font-bold leading-snug">{f.label}</h3>
            {f.amount !== null && <span className="num text-base font-bold">{formatYen(f.amount)}</span>}
          </div>
          <p className={cn('mt-1.5', attention ? 'font-pen text-[17px] text-pen' : 'text-sm leading-7 text-ink')}>{f.headline}</p>
          {attention && f.caveat && <p className="mt-1 text-[13px] leading-6 text-ink-soft">※ {f.caveat}</p>}
        </div>
      </div>
      <button
        type="button"
        id={`${base}-button`}
        aria-expanded={open}
        aria-controls={`${base}-details`}
        onClick={onToggle}
        className="-ml-2 mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm text-ink underline decoration-ink/30 underline-offset-4 hover:bg-ink/[0.05] hover:decoration-ink"
      >
        <span>{open ? '理由と根拠を閉じる' : '理由と根拠を見る'}</span>
        <span className="sr-only">（{f.label}）</span>
        <DisclosureChevron open={open} />
      </button>
      <DisclosurePanel id={`${base}-details`} role="region" aria-labelledby={`${base}-button`} open={open}>
        <FindingDetails f={f} className="mt-1 border-t border-dashed border-rule-strong/60 pb-1 pt-4" />
      </DisclosurePanel>
    </div>
  )
}

export function Categories({ inspection }: { inspection: Inspection }) {
  const base = useId()
  const [current, setCurrent] = useState<CategoryId>('capped')
  const tabs = useRef(new Map<CategoryId, HTMLButtonElement>())
  // 「理由と根拠」を開いておくか。静的HTMLと広い画面では、はじめから開いて、根拠まで見せる。
  // せまい画面では、1つの区分の中身だけで画面3つ分ほどの長さになるので、はじめは閉じておく（押せば開く）。
  const [details, setDetails] = useState(true)
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setDetails(false)
  }, [])

  const move = (from: number, to: number) => {
    const next = categories[(to + categories.length) % categories.length]
    if (!next || from === to) return
    setCurrent(next.id)
    tabs.current.get(next.id)?.focus()
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,21.5rem)_minmax(0,1fr)] lg:items-start">
      {/* 右の中身が長いので、広い画面では、見出しの耳を画面に残しておく（耳が全部入るだけの、画面の高さがあるときだけ）。 */}
      <div role="tablist" aria-label="区分" aria-orientation="vertical" className="z-10 grid grid-cols-2 gap-1 lg:block lg:space-y-1 lg:py-3 lg:[@media(min-height:780px)]:sticky lg:[@media(min-height:780px)]:top-20">
        {categories.map((c, i) => {
          const selected = c.id === current
          return (
            <button
              key={c.id}
              ref={(node) => {
                if (node) tabs.current.set(c.id, node)
                else tabs.current.delete(c.id)
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${c.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${c.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setCurrent(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  move(i, i + 1)
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  move(i, i - 1)
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  move(i, 0)
                } else if (e.key === 'End') {
                  e.preventDefault()
                  move(i, categories.length - 1)
                }
              }}
              className={cn(
                'relative flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors lg:min-h-0 lg:rounded-r-none lg:border-r-0 lg:px-4 lg:py-3',
                selected
                  ? 'z-10 border-ink/20 bg-paper text-ink lg:-mr-px lg:w-[calc(100%+1px)]'
                  : 'border-transparent bg-ink/[0.07] text-ink-soft hover:bg-ink/[0.12] hover:text-ink',
              )}
            >
              <CategoryMark id={c.id} variant={i} className="text-[13px] lg:text-[15px]" />
              <span className="min-w-0">
                <span className={cn('block text-[13px] leading-snug text-ink lg:text-[15px]', selected && 'font-bold')}>{c.label}</span>
                <span className="mt-0.5 hidden text-[13px] leading-5 lg:block">{c.short}</span>
              </span>
            </button>
          )
        })}
      </div>

      {categories.map((c) => {
        const f = exampleOf(inspection, c.id)
        return (
          <div
            key={c.id}
            role="tabpanel"
            id={`${base}-panel-${c.id}`}
            aria-labelledby={`${base}-tab-${c.id}`}
            hidden={c.id !== current}
            tabIndex={0}
            className="sheet mt-3 px-4 py-6 sm:px-8 sm:py-8 lg:mt-0"
          >
            <p className="flex items-center gap-2 text-lg font-bold leading-snug">
              <CategoryMark id={c.id} className="text-[15px]" />
              {c.label}
            </p>
            <p className="text-jp mt-3 text-[15px]">{c.description}</p>
            {f && (
              <div className="mt-6">
                <p className="mb-4 border-b-[1.5px] border-ink/70 pb-1.5 text-[13px] text-ink-soft">この区分の行は、道具でこう点検されます（見本の見積書の1行）</p>
                <ExampleFinding f={f} open={details} onToggle={() => setDetails((d) => !d)} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
