import { useMemo, useState, type Ref } from 'react'
import { CheckIcon, PlusIcon } from 'lucide-react'
import { LIMITS, listItemsByCategory, searchItems, type ItemMatch } from '@/core'
import { CategoryMark } from '@/components/category-mark'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

// 項目を選ぶ部品。2つの選び方がある。
// - ItemSearch … 見積書の言葉を打って探す（「抗菌」と打つと「室内の消毒・抗菌」が出る）。
// - ItemChips … 区分ごとの一覧から、押して選ぶ。
// 行を足すとき（見積書の画面）と、行の種類を変えるとき（重ねる画面）の、両方で使う。

export type ItemSearchProps = {
  labelledBy?: string
  label?: string
  placeholder?: string
  /** 候補を選んだとき。query は、そのとき打っていた言葉。 */
  onPick: (match: ItemMatch, query: string) => void
  /** 「この名前のまま、一覧にない項目として足す」を選んだとき。渡さなければ、その選び方は出さない。 */
  onPickOther?: (label: string) => void
  inputRef?: Ref<HTMLInputElement>
}

export function ItemSearch({ labelledBy, label, placeholder, onPick, onPickOther, inputRef }: ItemSearchProps) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => searchItems(query, 6), [query])
  const options: ComboOption[] = matches.map((m) => ({
    id: m.item.id,
    label: m.item.name,
    hint: m.matched !== m.item.name ? `「${m.matched}」` : undefined,
    leading: <CategoryMark id={m.item.category} className="text-[13px]" />,
  }))
  const typed = query.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxLabel)

  return (
    <Combobox
      labelledBy={labelledBy}
      label={label}
      placeholder={placeholder}
      query={query}
      onQueryChange={setQuery}
      options={options}
      inputRef={inputRef}
      onSelect={(option) => {
        const match = matches.find((m) => m.item.id === option.id)
        if (!match) return
        onPick(match, query)
        setQuery('')
      }}
      extra={
        onPickOther && typed !== ''
          ? {
              label: matches.length > 0 ? `どれでもない。「${typed}」のまま、一覧にない項目として足す` : `「${typed}」を、一覧にない項目として足す`,
              onSelect: () => {
                onPickOther(typed)
                setQuery('')
              },
            }
          : null
      }
      emptyText="合う項目が、見つかりませんでした。別の言葉でも探せます。"
    />
  )
}

export type ItemChipsProps = {
  /** 押したとき。 */
  onPick: (itemId: string) => void
  /** もう見積書に入っている項目（印を付ける）。 */
  usedItemIds?: ReadonlySet<string>
  /** いま選ばれている項目（種類を変える画面で、印を付ける）。 */
  currentItemId?: string
  /** 押すと何が起きるか（読み上げ用）。'add' ＝ 行を足す、'choose' ＝ この種類にする。 */
  mode?: 'add' | 'choose'
  className?: string
}

export function ItemChips({ onPick, usedItemIds, currentItemId, mode = 'add', className }: ItemChipsProps) {
  const groups = useMemo(() => listItemsByCategory(), [])
  return (
    <div className={cn('space-y-3', className)}>
      {groups.map(({ category, items }) => (
        <div key={category.id} role="group" aria-label={category.label}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] leading-5 text-ink-soft">
            <CategoryMark id={category.id} className="text-[12px]" />
            <span>{category.label}</span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {items.map((item) => {
              const used = usedItemIds?.has(item.id) ?? false
              const current = currentItemId === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item.id)}
                    aria-pressed={mode === 'choose' ? current : undefined}
                    title={item.summary}
                    className={cn(
                      'inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm border px-2.5 text-sm leading-none transition-colors sm:min-h-9',
                      current
                        ? 'border-ink bg-ink font-bold text-white'
                        : used
                          ? 'border-rule bg-muted text-ink-soft hover:border-ink/60 hover:text-ink'
                          : 'border-ink/40 bg-paper text-ink hover:border-ink hover:bg-marker-soft',
                    )}
                  >
                    {mode === 'add' &&
                      (used ? <CheckIcon aria-hidden className="size-3.5" strokeWidth={2.5} /> : <PlusIcon aria-hidden className="size-3.5 text-ink-soft" strokeWidth={2.5} />)}
                    <span>{item.name}</span>
                    {mode === 'add' && <span className="sr-only">{used ? '（もう入っています。もう1行足す）' : 'を足す'}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
