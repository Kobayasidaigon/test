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
import { ChevronRight, ExternalLink, MapPin, Pencil, X } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { citiesInPref, cityById, distanceKm, nationalFacts, nearbyCities, searchCities } from '@/shared'
import type { City } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Capsule } from './art'
import { ALL_COUNT, FEATURED, FEATURED_GROUPS, LEVEL_LEGEND, LEVEL_ORDER, REGIONS, groupOf, kmText, levelTag, levelText, lookOf, prefsFor, type TownGroup } from './lib'

const SEARCH_LIMIT = 20

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

// チップ（押すと選ぶ）。くわしい街以外には、文字の札（一部わかる・国の調査だけ）も小さく付ける
export function TownChip({ city, on, onClick, disabled, extra, showTag = true }: { city: City; on?: boolean; onClick: () => void; disabled?: boolean; extra?: ReactNode; showTag?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={`${city.pref}${city.name}（${levelTag(city)}）${city.care?.level === 'hit' ? '・地震の配慮' : ''}${on ? '：えらんでいます' : ''}`}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[2.5px] border-[var(--ink)] py-1 pl-1 pr-2.5 text-left transition-colors disabled:opacity-40',
        on ? 'bg-[var(--yolk)] shadow-[0_3px_0_var(--ink)] [--ink-soft:var(--ink)]' : 'bg-[var(--paper)] hover:bg-white',
      )}
    >
      <TownCapsule city={city} size={26} />
      <span className="text-[14px] font-black leading-tight">{city.name}</span>
      {showTag && city.level !== 'detailed' && <span className="text-[12px] font-bold leading-tight text-[var(--ink-soft)]">{levelTag(city)}</span>}
      {extra}
    </button>
  )
}

// カプセルの見た目の凡例を1行で（スマホでも、えらぶ場所のすぐそばに）
export function LevelLegendRow({ className }: { className?: string }) {
  const sample = ['#ffc928', '#4cc3e8', '#3cc8a4']
  return (
    <ul aria-label="カプセルの見た目と、データのくわしさ" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {LEVEL_ORDER.map((lv, i) => (
        <li key={lv} className="inline-flex items-center gap-1 text-[12.5px] font-black">
          <Capsule color={sample[i]} level={lv} size={20} />
          {LEVEL_LEGEND[lv].tag}
        </li>
      ))}
    </ul>
  )
}

/* ───────── 名前・読みがなで探す ───────── */

export function TownSearch({ onPick, exclude = [], fromId, label, placeholder = '街の名前か、よみがな（例: はちおうじ）', autoFocus, onBrowse }: {
  onPick: (c: City) => void
  exclude?: string[]
  fromId?: string
  label: string
  placeholder?: string
  autoFocus?: boolean
  onBrowse?: (pref: string | null) => void // 「地方と県からさがす」を開く（県を指定できる）
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [q, setQ] = useState('')
  const [active, setActive] = useState(-1) // -1 = まだどの候補も指していない（Enter なら1番目を選ぶ）
  const [open, setOpen] = useState(false)
  const from = fromId ? cityById(fromId) : undefined
  // 1件多く探して、20件で切れたかどうかを知る
  const found = useMemo(() => (q.trim() ? searchCities(q, SEARCH_LIMIT + 1) : []), [q])
  const results = found.slice(0, SEARCH_LIMIT)
  const more = found.length > SEARCH_LIMIT
  const prefs = useMemo(() => prefsFor(q), [q])
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
  // 見つからないときは、候補の箱は出さず、下の案内（県の一覧へ）だけにする
  const showList = open && q.trim().length > 0 && (results.length > 0 || !onBrowse)
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
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none placeholder:text-[13px] placeholder:font-bold placeholder:text-[var(--ink-soft)]"
        />
        {q && (
          <button type="button" aria-label="書いた文字を消す" onClick={() => setQ('')} className="grid h-9 w-9 place-items-center rounded-full">
            <X className="h-4 w-4" strokeWidth={3} aria-hidden />
          </button>
        )}
      </div>
      <p className="va-sr" aria-live="polite">
        {q.trim()
          ? results.length
            ? `${more ? `${SEARCH_LIMIT}件より多く見つかりました。上の${SEARCH_LIMIT}件を出しています` : `${results.length}件の街が見つかりました`}。下の矢印キーでえらべます。`
            : `見つかりませんでした。${prefs.length ? `${prefs.join('・')}の一覧を開けます` : ''}`
          : ''}
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
                    i === active ? 'bg-[var(--yolk)] [--ink-soft:var(--ink)]' : '',
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
      {/* 20件で切れたとき・見つからないとき：県の一覧へ（候補の外に置くので、入力欄を離れても消えない） */}
      {q.trim() && onBrowse && (more || results.length === 0) && (
        <div className="mt-2 rounded-[12px] bg-[var(--paper-2)] px-3 py-2">
          <p className="text-[12.5px] font-bold leading-snug">
            {more ? `ほかにもあります（上の${SEARCH_LIMIT}件を出しています）。` : '名前では見つかりませんでした。'}
            {prefs.length ? '県の一覧なら全部見られます。' : '「地方と県からさがす」なら全部見られます。'}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(prefs.length ? prefs : [null]).map((p) => (
              <button
                key={p ?? 'all'}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onBrowse(p)
                  setOpen(false)
                }}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--paper)] px-3 text-[13px] font-black"
              >
                <MapPin className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                {p ? `${p}の市区町村を見る` : '地方と県からさがす'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── 地方 → 県 → 街 とたどる ───────── */

const PAGE = 48
export function PrefBrowser({ onPick, isOn, isOut, fromId, startPref }: { onPick: (c: City) => void; isOn: (c: City) => boolean; isOut?: (c: City) => boolean; fromId?: string; startPref?: string | null }) {
  const reduce = useReducedMotion()
  const from = fromId ? cityById(fromId) : undefined
  const [region, setRegion] = useState<number | null>(() => {
    const p = startPref ?? from?.pref
    return p ? REGIONS.findIndex((r) => r.prefs.includes(p)) : null
  })
  const [pref, setPref] = useState<string | null>(startPref ?? null)
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
            <p className="px-1 text-[12.5px] font-black">
              {pref}の市区町村（{list.length}）
            </p>
            {/* チップには札を付けず（一覧が長くならないように）、くわしさの内訳をここに書く */}
            <p className="mb-2 px-1 text-[12px] font-bold text-[var(--ink-soft)]">
              {LEVEL_ORDER.map((lv) => [lv, list.filter((c) => c.level === lv)] as const)
                .filter(([, l]) => l.length)
                .map(([, l]) => `${levelTag(l[0])} ${l.length}`)
                .join('・')}
              （カプセルの見た目でも分かります）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.slice(0, shown).map((c) => (
                <TownChip key={c.id} city={c} on={isOn(c)} disabled={isOut?.(c)} onClick={() => onPick(c)} showTag={false} />
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

/* ───────── くわしく調べた街（地域の札で切りかえる） ─────────
   33個のチップを一度に並べると、スマホで長くなる。地域の札（東京23区・埼玉…）を押して、その地域の街だけを出す。
   行きたい街では、札も街も、今の街から近い順にする（はじめに開くのは、いちばん近い地域）。 */

export function FeaturedPicker({ isOn, isOut, onPick, nearFrom, startCode, label, single = false }: {
  isOn: (c: City) => boolean
  isOut?: (c: City) => boolean
  onPick: (c: City) => void
  nearFrom?: string // 近い順に並べる基準の街（行きたい街をえらぶとき）
  startCode?: string // はじめに開く地域を決める街（今の街をえらぶとき）
  label?: string
  single?: boolean // 1つだけえらぶとき（今の街）。札には数ではなく点を付ける
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // 近い順は、開いたときの今の街で決める（えらぶたびに札が動かないように）
  const groups = useMemo<TownGroup[]>(() => {
    const from = nearFrom ? cityById(nearFrom) : undefined
    if (!from) return FEATURED_GROUPS
    // 今の街は、行きたい街にはえらべないので、札の数にも、チップにも入れない
    const d = (c: City) => distanceKm(from, c) ?? 1e9
    return FEATURED_GROUPS.map((g) => ({ ...g, cities: g.cities.filter((c) => c.code !== from.code).sort((a, b) => d(a) - d(b)) }))
      .filter((g) => g.cities.length > 0)
      .sort((a, b) => d(a.cities[0]) - d(b.cities[0]))
  }, [nearFrom])
  const [open, setOpen] = useState(() => {
    const start = startCode ? cityById(startCode) : undefined
    if (!start) return 0
    // 今の街がくわしい街ならその地域、ちがえば、いちばん近い街のある地域
    const near = (g: TownGroup) => Math.min(...g.cities.map((c) => distanceKm(start, c) ?? 1e9))
    const g = groupOf(start) ?? [...groups].sort((a, b) => near(a) - near(b))[0]
    return Math.max(0, groups.findIndex((x) => x.key === g?.key))
  })
  const group = groups[Math.min(open, groups.length - 1)]
  const from = nearFrom ? cityById(nearFrom) : undefined
  return (
    <div>
      <p id={`${uid}-h`} className="mb-1.5 text-[13px] font-black">
        {label ?? `くわしく調べた${FEATURED.length}の街`}
        <span className="ml-1 whitespace-nowrap text-[12px] font-bold text-[var(--ink-soft)]">（札で地域を切りかえ）</span>
      </p>
      <div role="group" aria-labelledby={`${uid}-h`} className="flex flex-wrap gap-1.5">
        {groups.map((g, i) => {
          const on = g === group
          const picked = g.cities.filter(isOn).length
          return (
            <button
              key={g.key}
              type="button"
              aria-pressed={on}
              aria-label={`${g.name}（${g.cities.length}の街${picked ? (single ? '、えらんでいる街があります' : `、${picked}個えらんでいます`) : ''}）`}
              onClick={() => setOpen(i)}
              className={cn(
                'relative inline-flex min-h-[40px] items-center gap-1 rounded-[10px] border-[2.5px] border-[var(--ink)] px-2.5 py-1 text-[13px] font-black',
                on ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper)]',
              )}
            >
              {g.name}
              <span className={cn('text-[12px] font-bold', on ? 'text-white/80' : 'text-[var(--ink-soft)]')}>{g.cities.length}</span>
              {picked > 0 &&
                (single ? (
                  <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--ink)] bg-[var(--yolk)]" />
                ) : (
                  <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--yolk)] px-0.5 text-[11px] font-black leading-none text-[var(--ink)]">{picked}</span>
                ))}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 rounded-[14px] border-[2.5px] border-dashed border-[var(--ink)]/30 bg-[var(--paper-2)] p-1.5">
        {group.cities.map((c) => {
          const out = isOut?.(c)
          if (out && from) return null
          const d = from && c.code !== from.code ? distanceKm(from, c) : undefined
          return (
            <TownChip
              key={c.id}
              city={c}
              on={isOn(c)}
              disabled={out}
              onClick={() => onPick(c)}
              extra={d !== undefined ? <span className="text-[12px] font-bold text-[var(--ink-soft)]">{kmText(d)}</span> : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 開け閉めできる枠 ───────── */

export function Drawer({ title, children, open, onOpenChange, icon, id }: { title: string; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; icon?: ReactNode; id?: string }) {
  return (
    <details
      id={id}
      className="group scroll-mt-4 rounded-[14px] border-[3px] border-[var(--ink)] bg-[var(--paper)]"
      open={open}
      onToggle={(e) => onOpenChange?.((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-[14px] font-black">
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronRight className="va-caret h-4 w-4 transition-transform" strokeWidth={3} aria-hidden />
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  )
}

// 「地方と県からさがす」の引き出しを、検索の案内から開けるようにする
function useBrowse() {
  const reduce = useReducedMotion()
  const id = `va-browse-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [state, setState] = useState<{ open: boolean; pref: string | null; n: number }>({ open: false, pref: null, n: 0 })
  const openAt = (pref: string | null) => {
    setState((s) => ({ open: true, pref, n: s.n + 1 }))
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }), 80)
  }
  const setOpen = (open: boolean) => setState((s) => (s.open === open ? s : { ...s, open }))
  return { id, state, openAt, setOpen }
}

/* ───────── 今の街（1つえらぶ） ───────── */

export function NowCityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const city = cityById(value)
  const reduce = useReducedMotion()
  const browse = useBrowse()
  return (
    <div className="space-y-3.5">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={city.id}
          initial={reduce ? false : { rotate: -4, y: -10, opacity: 0 }}
          animate={{ rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22, opacity: { duration: 0.15 } }}
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
          {/* 被災した街・その県では、配慮の文と公式の情報を出す */}
          {city.care && (
            <div className={cn('mt-2 rounded-[10px] border-2 px-2.5 py-1.5', city.care.level === 'hit' ? 'border-[var(--stay)] bg-[var(--stay-bg)]' : 'border-[var(--ink)]/30 bg-white/70')}>
              <p className="text-[12.5px] font-black leading-snug">{city.care.note}</p>
              <ul className="mt-0.5">
                {city.care.sources.map((s) => (
                  <li key={s.url} className="flex min-h-[36px] items-center">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-[12.5px] font-bold text-[var(--stay)] underline underline-offset-2">
                      <ExternalLink className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <TownSearch label={`名前で探す（全国${ALL_COUNT}の市区町村）`} onPick={(c) => onChange(c.id)} onBrowse={browse.openAt} />

      <FeaturedPicker single startCode={value} isOn={(c) => c.code === city.code} onPick={(c) => onChange(c.id)} />

      <Drawer id={browse.id} title="地方と県からさがす" open={browse.state.open} onOpenChange={browse.setOpen} icon={<MapPin className="h-4 w-4" strokeWidth={3} aria-hidden />}>
        <PrefBrowser key={browse.state.n} startPref={browse.state.pref} fromId={value} isOn={(c) => c.id === city.id} onPick={(c) => onChange(c.id)} />
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
            <li key={i} className="relative flex min-h-[96px] flex-col items-center justify-start rounded-[12px] border-2 border-dashed border-[var(--ink)]/35 bg-white/50 pb-1 pt-3">
              <AnimatePresence>
                {c && (
                  <motion.div
                    key={c.id}
                    className="flex w-full flex-col items-center"
                    initial={reduce ? false : { y: -26, rotate: -24, opacity: 0 }}
                    animate={{ y: 0, rotate: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { y: 20, opacity: 0, rotate: 20, transition: { duration: 0.18 } }}
                    transition={{ type: 'spring', stiffness: 460, damping: 20, opacity: { duration: 0.15 } }}
                  >
                    <div className="relative">
                      <TownCapsule city={c} size={46} />
                      {/* カプセルの名札（飾り。名前は下に書く）。4文字以上は字を小さくして、札に収める */}
                      <span
                        className={cn(
                          'absolute left-1/2 top-[9px] max-w-[48px] -translate-x-1/2 -rotate-6 truncate rounded-[4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-0.5 font-black leading-tight',
                          [...c.name.replace(/(市|区|町|村)$/, '')].length >= 4 ? 'text-[9px]' : 'text-[10px]',
                        )}
                        aria-hidden
                      >
                        {c.name.replace(/(市|区|町|村)$/, '')}
                      </span>
                    </div>
                    {/* 名前は「市・区・町・村」の前でだけ折る（「さいた／ま市」にしない）。5文字以上は字を少し小さく */}
                    <span className={cn('mt-0.5 w-full text-center font-black leading-tight [word-break:keep-all] [overflow-wrap:anywhere]', [...c.name].length >= 5 ? 'text-[11px]' : 'text-[12px]')}>
                      {c.name.replace(/(市|区|町|村)$/, '')}
                      <wbr />
                      {c.name.match(/(市|区|町|村)$/)?.[0] ?? ''}
                    </span>
                    {/* はずすボタンは、スロットの角（カプセルの名札の上）に小さく置く。押せる範囲は after で広げる */}
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      aria-label={`${c.name}をカプセル置き場からはずす`}
                      className="absolute -right-2 -top-2 z-10 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] after:absolute after:-inset-2.5 after:content-['']"
                    >
                      <X className="h-3 w-3" strokeWidth={3.6} aria-hidden />
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

// 置き場に入れた街のうち、くわしくない街・被災した街について、結果でどうなるかを先に言う
function PickNotes({ picks }: { picks: string[] }) {
  const cities = picks.map((id) => cityById(id))
  const names = (list: City[]) => list.map((c) => c.name).join('・')
  const hit = cities.filter((c) => c.care?.level === 'hit')
  const basic = cities.filter((c) => c.level === 'basic' && c.care?.level !== 'hit')
  const pref = cities.filter((c) => c.level === 'pref')
  if (!hit.length && !basic.length && !pref.length) return null
  return (
    <ul className="space-y-1 rounded-[12px] bg-[var(--paper-2)] px-3 py-2 text-[12.5px] font-bold leading-snug">
      {basic.length > 0 && (
        <li>
          ・{names(basic)}は、国の全国調査だけ分かる街（{[...new Set(basic.flatMap(nationalFacts))].join('・')}。家賃の統計がない町村もあります）。保育料などは「確認中」になります。
        </li>
      )}
      {pref.length > 0 && <li>・{names(pref)}は、制度が一部だけ分かる街。分からない項目は「確認中」になります。</li>}
      {hit.length > 0 && <li>・{names(hit)}は地震で被害を受けた街。得・損は出さず、制度の中身だけ見せます。</li>}
    </ul>
  )
}

export function TownPicker({ picks, setPicks, fromId }: { picks: string[]; setPicks: (fn: (p: string[]) => string[]) => void; fromId: string }) {
  const from = cityById(fromId)
  const browse = useBrowse()
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
      <div className="space-y-2">
        <PickTray picks={picks} onRemove={(id) => setPicks((p) => p.filter((x) => x !== id))} />
        <LevelLegendRow className="px-1" />
        <PickNotes picks={picks} />
      </div>
      {note && (
        <p role="status" className="rounded-[10px] bg-[var(--stay-bg)] px-3 py-2 text-[13px] font-black text-[var(--stay)]">
          {note}
        </p>
      )}
      <TownSearch label={`行きたい街の名前を書く（全国${ALL_COUNT}の市区町村）`} fromId={fromId} exclude={[from.id, ...picks]} onPick={tryAdd} onBrowse={browse.openAt} />
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
      <FeaturedPicker nearFrom={fromId} isOn={has} isOut={isOut} onPick={tryAdd} />
      <Drawer id={browse.id} title="地方と県からさがす" open={browse.state.open} onOpenChange={browse.setOpen} icon={<MapPin className="h-4 w-4" strokeWidth={3} aria-hidden />}>
        <PrefBrowser key={browse.state.n} startPref={browse.state.pref} fromId={fromId} isOn={has} isOut={isOut} onPick={tryAdd} />
      </Drawer>
      <Drawer title="カプセルの見た目と、データのくわしさ">
        <LevelLegend />
        <p className="mt-2 text-[12.5px] font-bold leading-relaxed text-[var(--ink-soft)]">カプセルの見た目は、どこまで調べたかのちがいです。得か損かとは関係ありません。</p>
      </Drawer>
    </div>
  )
}
