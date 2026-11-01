/*
 * 全国の街さがし（今の街・行きたい街）
 * キーボード操作の考え方を借りた部品: 21st「Combobox」 — 作者 halaska-studio
 *   https://21st.dev/@halaska-studio/components/combobox
 * 借りたところ: 入力欄にフォーカスを置いたまま、aria-activedescendant で候補を指し、
 *   ↓↑ で候補を動かし、Enter で決め、Esc で閉じる流れ。候補の上にマウスを乗せると指す候補も動く。
 * 変えたところ:
 *   - 入力欄をポップアップの中から外に出し、いつも見えている「カプセルに名前を書く」欄にした（role="combobox"）。
 *   - 候補は全国1,741の市区町村から、名前・読みがな（ひらがな・カタカナ）で探す（@/shared の searchCities）。
 *   - 候補の行に、データの細かさが分かるカプセル（しっかり色／しま模様／すけすけ）と札、今の街からの距離を付けた。
 *   - 何件見つかったかを読み上げる。見た目は墨の太線と卵黄色の、この案の筐体の部品に合わせた。
 * 1,741件を一度に描かないよう、検索は20件まで、県の一覧は48件ずつ出す。
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRight, MapPin, Pencil, X } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { citiesInPref, cityById, distanceKm, nearbyCities, searchCities } from '@/shared'
import type { City } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule } from './art'
import { FEATURED, LEVEL_LEGEND, LEVEL_ORDER, REGIONS, kmText, levelTag, levelText, lookOf } from './lib'

/* ───────── 小さな部品 ───────── */

export function LevelTag({ city, className }: { city: City; className?: string }) {
  const style =
    city.level === 'detailed'
      ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
      : city.level === 'pref'
        ? 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]'
        : 'border-dashed border-[var(--ink-soft)] bg-transparent text-[var(--ink-soft)]'
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border-2 px-1.5 py-px text-[12px] font-black leading-tight', style, className)}>{levelTag(city)}</span>
}

export function TownCapsule({ city, size = 28, className }: { city: City; size?: number; className?: string }) {
  return <Capsule color={lookOf(city).capsule} level={city.level} size={size} className={className} />
}

// カプセルの見た目の説明（凡例）
export function LevelLegend({ className, compact = false }: { className?: string; compact?: boolean }) {
  const sample = ['#ffc928', '#4cc3e8', '#3cc8a4']
  return (
    <ul className={cn('space-y-1.5', className)}>
      {LEVEL_ORDER.map((lv, i) => (
        <li key={lv} className="flex items-start gap-2">
          <Capsule color={sample[i]} level={lv} size={compact ? 22 : 26} className="mt-0.5 shrink-0" />
          <span className="text-[12.5px] font-bold leading-snug">
            <span className="font-black">{LEVEL_LEGEND[lv].tag}</span>
            {!compact && <span className="text-[var(--ink-soft)]">：{LEVEL_LEGEND[lv].text}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

// チップ（押すと選ぶ）
export function TownChip({ city, on, onClick, disabled, extra }: { city: City; on?: boolean; onClick: () => void; disabled?: boolean; extra?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={`${city.pref}${city.name}（${levelTag(city)}）${on ? '：えらんでいます' : ''}`}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[2.5px] border-[var(--ink)] py-1 pl-1 pr-3 text-left transition-colors disabled:opacity-40',
        on ? 'bg-[var(--yolk)] shadow-[0_3px_0_var(--ink)]' : 'bg-[var(--paper)] hover:bg-white',
      )}
    >
      <TownCapsule city={city} size={26} />
      <span className="text-[14px] font-black leading-tight">{city.name}</span>
      {extra}
    </button>
  )
}

/* ───────── 名前・読みがなで探す ───────── */

export function TownSearch({ onPick, exclude = [], fromId, label, placeholder = '街の名前か、よみがな（例: はちおうじ）', autoFocus }: {
  onPick: (c: City) => void
  exclude?: string[]
  fromId?: string
  label: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [q, setQ] = useState('')
  const [active, setActive] = useState(-1) // -1 = まだどの候補も指していない（Enter なら1番目を選ぶ）
  const [open, setOpen] = useState(false)
  const from = fromId ? cityById(fromId) : undefined
  const results = useMemo(() => (q.trim() ? searchCities(q, 20) : []), [q])
  const listId = `${uid}-list`
  const isOut = (c: City) => exclude.includes(c.id) || (c.code ? exclude.includes(c.code) : false)
  const pick = (c: City) => {
    if (isOut(c)) return
    onPick(c)
    setQ('')
    setOpen(false)
    setActive(-1)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const target = results[Math.max(active, 0)]
      if (target) {
        e.preventDefault()
        pick(target)
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      if (q) setQ('')
      setOpen(false)
    }
  }
  const showList = open && q.trim().length > 0
  return (
    <div className="relative">
      <label htmlFor={`${uid}-input`} className="mb-1 block text-[13px] font-black">
        {label}
      </label>
      <div className="va-field flex items-center gap-2 rounded-[14px] border-[3px] border-[var(--ink)] bg-white px-2.5 shadow-[3px_4px_0_var(--ink)] focus-within:bg-[#fffbe6]">
        <Pencil className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
        <input
          id={`${uid}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${uid}-opt-${active}` : undefined}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none placeholder:text-[13px] placeholder:font-bold placeholder:text-[#7a808c]"
        />
        {q && (
          <button type="button" aria-label="書いた文字を消す" onClick={() => setQ('')} className="grid h-9 w-9 place-items-center rounded-full">
            <X className="h-4 w-4" strokeWidth={3} aria-hidden />
          </button>
        )}
      </div>
      <p className="va-sr" aria-live="polite">
        {q.trim() ? (results.length ? `${results.length}件の街が見つかりました。下の矢印キーでえらべます。` : '見つかりませんでした') : ''}
      </p>
      {showList && (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label}の候補`}
          className="mt-2 max-h-[300px] overflow-y-auto overscroll-contain rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)] p-1"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[13px] font-bold text-[var(--ink-soft)]">見つかりませんでした。ひらがなでも探せます（例: かごしま）。</p>
          ) : (
            results.map((c, i) => {
              const out = isOut(c)
              const d = from && c.id !== from.id ? distanceKm(from, c) : undefined
              return (
                <div
                  key={c.id}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={out || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c)}
                  className={cn(
                    'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[10px] px-2 py-1.5',
                    i === active ? 'bg-[var(--yolk)]' : '',
                    out && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <TownCapsule city={c} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold leading-tight text-[var(--ink-soft)]">
                      {c.pref}
                      {d !== undefined && `・今の街から ${kmText(d)}`}
                    </span>
                    <span className="block truncate text-[15px] font-black leading-tight">{c.name}</span>
                  </span>
                  {c.care?.level === 'hit' && <span className="rounded-full border-2 border-[var(--stay)] px-1.5 text-[12px] font-black text-[var(--stay)]">地震の配慮</span>}
                  {out ? <span className="text-[12px] font-black text-[var(--ink-soft)]">えらんだ</span> : <LevelTag city={c} />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/* ───────── 地方 → 県 → 街 とたどる ───────── */

const PAGE = 48
export function PrefBrowser({ onPick, isOn, isOut, fromId }: { onPick: (c: City) => void; isOn: (c: City) => boolean; isOut?: (c: City) => boolean; fromId?: string }) {
  const reduce = useReducedMotion()
  const from = fromId ? cityById(fromId) : undefined
  const [region, setRegion] = useState<number | null>(() => (from ? REGIONS.findIndex((r) => r.prefs.includes(from.pref)) : null))
  const [pref, setPref] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const list = useMemo(() => {
    if (!pref) return []
    const order = { detailed: 0, pref: 1, basic: 2 } as const
    const kind = (c: City) => (c.name.endsWith('市') ? 0 : c.name.endsWith('区') ? 1 : c.name.endsWith('町') ? 2 : 3)
    return [...citiesInPref(pref)].sort((a, b) => order[a.level] - order[b.level] || kind(a) - kind(b))
  }, [pref])
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-black text-[var(--ink-soft)]">地方</p>
      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map((r, i) => (
          <button
            key={r.name}
            type="button"
            aria-pressed={region === i}
            onClick={() => {
              setRegion(i)
              setPref(null)
              setShown(PAGE)
            }}
            className={cn('min-h-[40px] rounded-[10px] border-[2.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-black', region === i ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)]')}
          >
            {r.name}
          </button>
        ))}
      </div>
      {region !== null && (
        <>
          <p className="mb-1.5 mt-3 text-[12px] font-black text-[var(--ink-soft)]">都道府県</p>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS[region].prefs.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={pref === p}
                onClick={() => {
                  setPref(p)
                  setShown(PAGE)
                }}
                className={cn('min-h-[40px] rounded-full border-[2.5px] border-[var(--ink)] px-3 py-1 text-[13px] font-black', pref === p ? 'bg-[var(--yolk)] shadow-[0_3px_0_var(--ink)]' : 'bg-[var(--paper)]')}
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}
      <AnimatePresence initial={false}>
        {pref && (
          <motion.div key={pref} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper-2)] p-2">
            <p className="mb-2 px-1 text-[12.5px] font-black">
              {pref}の市区町村（{list.length}）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.slice(0, shown).map((c) => (
                <TownChip key={c.id} city={c} on={isOn(c)} disabled={isOut?.(c)} onClick={() => onPick(c)} />
              ))}
            </div>
            {list.length > shown && (
              <button type="button" onClick={() => setShown((s) => s + PAGE)} className="mt-2 min-h-[40px] w-full rounded-[10px] border-[2.5px] border-dashed border-[var(--ink)] text-[13px] font-black">
                もっと見る（あと{list.length - shown}）
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────── 開け閉めできる枠 ───────── */

export function Drawer({ title, children, defaultOpen = false, icon }: { title: string; children: ReactNode; defaultOpen?: boolean; icon?: ReactNode }) {
  return (
    <details className="group rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)]" open={defaultOpen}>
      <summary className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-[14px] font-black">
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronRight className="va-caret h-4 w-4 transition-transform" strokeWidth={3} aria-hidden />
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  )
}

/* ───────── 今の街（1つえらぶ） ───────── */

export function NowCityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const city = cityById(value)
  const reduce = useReducedMotion()
  return (
    <div className="space-y-3.5">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={city.id}
          initial={reduce ? false : { rotate: -4, y: -10, opacity: 0 }}
          animate={{ rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className="relative rounded-[16px] border-[3px] border-[var(--ink)] px-3 pb-2.5 pt-3 shadow-[3px_4px_0_var(--ink)]"
          style={{ background: `color-mix(in srgb, ${lookOf(city).capsule} 22%, var(--paper))` }}
          aria-live="polite"
        >
          <span aria-hidden className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--bg)]" />
          <div className="flex items-center gap-2.5">
            <TownCapsule city={city} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-[var(--ink-soft)]">いま住んでいる街</p>
              <p className="va-pop text-[22px] leading-tight">
                <span className="mr-1 text-[14px]">{city.pref}</span>
                {city.name}
              </p>
            </div>
            <LevelTag city={city} />
          </div>
          <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-[var(--ink-soft)]">{levelText(city)}</p>
        </motion.div>
      </AnimatePresence>

      <TownSearch label="名前で探す（全国1,741の市区町村）" onPick={(c) => onChange(c.id)} />

      <div>
        <p className="mb-1.5 text-[13px] font-black">くわしく調べた13の街</p>
        <div className="flex flex-wrap gap-1.5">
          {FEATURED.map((c) => (
            <TownChip key={c.id} city={c} on={c.id === city.id} onClick={() => onChange(c.id)} />
          ))}
        </div>
      </div>

      <Drawer title="地方と県からさがす" icon={<MapPin className="h-4 w-4" strokeWidth={3} aria-hidden />}>
        <PrefBrowser fromId={value} isOn={(c) => c.id === city.id} onPick={(c) => onChange(c.id)} />
      </Drawer>
    </div>
  )
}

/* ───────── 行きたい街（2〜5個えらぶ） ───────── */

export const PICK_MAX = 5
export const PICK_MIN = 2

export function PickTray({ picks, onRemove }: { picks: string[]; onRemove: (id: string) => void }) {
  const reduce = useReducedMotion()
  return (
    <div className="rounded-[18px] border-[3px] border-[var(--ink)] bg-[var(--metal)] px-2 pb-2 pt-2.5 shadow-[inset_0_-6px_0_rgba(31,36,48,0.12)]">
      <p className="mb-1.5 px-1 text-[12px] font-black text-[var(--ink-soft)]">
        カプセル置き場（{picks.length} / {PICK_MAX}）{picks.length < PICK_MIN && `・あと${PICK_MIN - picks.length}個えらぶと、筐体に入れられます`}
      </p>
      <ol className="grid grid-cols-5 gap-1">
        {Array.from({ length: PICK_MAX }, (_, i) => {
          const id = picks[i]
          const c = id ? cityById(id) : null
          return (
            <li key={i} className="relative flex min-h-[92px] flex-col items-center justify-start rounded-[12px] border-2 border-dashed border-[var(--ink)]/35 bg-white/50 pb-1 pt-1.5">
              <AnimatePresence>
                {c && (
                  <motion.div
                    key={c.id}
                    className="flex w-full flex-col items-center"
                    initial={reduce ? false : { y: -26, rotate: -24, opacity: 0 }}
                    animate={{ y: 0, rotate: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { y: 20, opacity: 0, rotate: 20, transition: { duration: 0.18 } }}
                    transition={{ type: 'spring', stiffness: 460, damping: 20 }}
                  >
                    <div className="relative">
                      <TownCapsule city={c} size={46} />
                      <span className="absolute left-1/2 top-[9px] max-w-[48px] -translate-x-1/2 -rotate-6 truncate rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-0.5 text-[10px] font-black leading-tight" aria-hidden>
                        {c.name.replace(/(市|区|町|村)$/, '')}
                      </span>
                    </div>
                    <span className="mt-0.5 w-full px-0.5 text-center text-[12px] font-black leading-tight [overflow-wrap:anywhere]">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      aria-label={`${c.name}をカプセル置き場からはずす`}
                      className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={3.4} aria-hidden />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {!c && <span className="mt-6 text-[12px] font-black text-[var(--ink-soft)]">{i + 1}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function TownPicker({ picks, setPicks, fromId }: { picks: string[]; setPicks: (fn: (p: string[]) => string[]) => void; fromId: string }) {
  const from = cityById(fromId)
  const near = useMemo(() => nearbyCities(fromId, 30, 8), [fromId])
  const has = (c: City) => picks.includes(c.id)
  const full = picks.length >= PICK_MAX
  const isOut = (c: City) => c.code === from.code
  const toggle = (c: City) => {
    if (isOut(c)) return
    setPicks((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : p.length >= PICK_MAX ? p : [...p, c.id]))
  }
  const [note, setNote] = useState('')
  const tryAdd = (c: City) => {
    if (isOut(c)) {
      setNote(`${c.name}は今の街です。ほかの街をえらんでね。`)
      return
    }
    if (!has(c) && full) {
      setNote(`カプセル置き場は${PICK_MAX}個でいっぱいです。どれかをはずしてね。`)
      return
    }
    setNote('')
    toggle(c)
  }
  return (
    <div className="space-y-3.5">
      <PickTray picks={picks} onRemove={(id) => setPicks((p) => p.filter((x) => x !== id))} />
      {note && (
        <p role="status" className="rounded-[10px] bg-[var(--stay-bg)] px-3 py-2 text-[13px] font-black text-[var(--stay)]">
          {note}
        </p>
      )}
      <TownSearch label="行きたい街の名前を書く（全国1,741の市区町村）" fromId={fromId} exclude={[from.id, ...picks]} onPick={tryAdd} />
      {near.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-black">{from.name}の近く（30km以内）</p>
          <div className="flex flex-wrap gap-1.5">
            {near.map((c) => (
              <TownChip key={c.id} city={c} on={has(c)} onClick={() => tryAdd(c)} extra={<span className="text-[12px] font-bold text-[var(--ink-soft)]">{kmText(distanceKm(from, c))}</span>} />
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-[13px] font-black">くわしく調べた13の街</p>
        <div className="flex flex-wrap gap-1.5">
          {FEATURED.filter((c) => c.code !== from.code).map((c) => (
            <TownChip key={c.id} city={c} on={has(c)} onClick={() => tryAdd(c)} />
          ))}
        </div>
      </div>
      <Drawer title="地方と県からさがす" icon={<MapPin className="h-4 w-4" strokeWidth={3} aria-hidden />}>
        <PrefBrowser fromId={fromId} isOn={has} isOut={isOut} onPick={tryAdd} />
      </Drawer>
      <Drawer title="カプセルの見た目と、データのくわしさ">
        <LevelLegend />
        <p className="mt-2 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">カプセルの見た目は、どこまで調べたかのちがいです。得か損かとは関係ありません。</p>
      </Drawer>
    </div>
  )
}
