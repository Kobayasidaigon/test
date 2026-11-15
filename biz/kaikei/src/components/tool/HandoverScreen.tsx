import { useRef, useState, type ReactNode } from 'react'
import { ArrowRightLeft, Download, FolderOpen, KeyRound, Plus, Trash2 } from 'lucide-react'
import {
  DATA_NOTE,
  LIMITS,
  SHARE_NOTE,
  carryForward,
  checkCarryForward,
  formatWareki,
  formatYen,
  latestYear,
  parseDateInput,
  randomId,
  setLicenseKey,
  undoCarryForward,
  updateHandover,
  type EquipmentItem,
  type Handover,
  type PendingItem,
} from '@/core'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, Label, Textarea } from '@/components/ui/input'
import { Seal } from '@/components/ui/seal'
import { toast } from '@/components/ui/toast'
import { CommitDate, CommitMoney, CommitText, DateField, shortDate } from './fields'
import { storedLicenseKey, useWorkspace } from './store'

// ⑤ 引き継ぎ。
//   1. ひきつぎファイル（保存する、別のファイルを開く）
//   2. 次の年度へ繰り越す（有料版）
//   3. 引き継ぎ書に書くこと
//   4. 有料版（ライセンスキー）
//   5. はじめからやり直す

function Card({ id, title, lead, children, tone = 'rule' }: { id: string; title: ReactNode; lead?: ReactNode; children: ReactNode; tone?: 'rule' | 'shu' | 'plain' }) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-xl border border-border bg-paper px-4 py-5 shadow-lift sm:px-6',
        tone === 'rule' && 'border-t-[3px] border-t-rule',
        tone === 'shu' && 'border-t-[3px] border-t-shu',
      )}
    >
      <h2 id={id} className="text-xl">
        {title}
      </h2>
      {lead && <p className="mt-1.5 text-[0.94rem] leading-relaxed text-muted-foreground">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function savedAtText(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}時${String(d.getMinutes()).padStart(2, '0')}分`
}

/** 1. ひきつぎファイル */
function FileCard({ onOpenFile }: { onOpenFile: (file: File) => void }) {
  const { state, unsaved, dirty, saveFile } = useWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Card
      id="handover-file"
      tone="shu"
      title="ひきつぎファイル"
      lead="帳簿のすべて（過去の年度も）が、1つのファイルに入ります。作業のあとは、ファイルに保存してください。次の担当の方には、このファイルを渡します。"
    >
      <div className={cn('rounded-lg border px-4 py-3', dirty ? 'border-shu/45 bg-shu-soft' : 'border-rule/50 bg-rule-soft/40')} role="status">
        <p className="font-bold leading-snug">
          {dirty ? unsaved.message : unsaved.neverSaved ? 'サンプルの帳簿です。まだ何も変えていないので、保存しなくてもかまいません。' : 'ファイルに保存してあります。そのあとの変更は、ありません。'}
        </p>
        {state.savedAt && <p className="mt-0.5 text-[0.86rem] text-muted-foreground">最後に保存した（開いた）ファイル: {savedAtText(state.savedAt)} のもの</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button size="lg" onClick={saveFile}>
          <Download />
          ファイルに保存する
        </Button>
        <Button variant="outline" size="lg" onClick={() => inputRef.current?.click()}>
          <FolderOpen />
          別のファイルを開く
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-label="開くひきつぎファイルを選ぶ"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onOpenFile(file)
          }}
        />
      </div>
      <ol className="mt-5 grid gap-3 border-t border-rule/40 pt-4 text-[0.94rem] leading-relaxed sm:grid-cols-3">
        {[
          ['渡す', '保存したファイルを、メールや USB メモリで、次の担当の方に渡します。'],
          ['開く', '次の担当の方は、このページで「ひきつぎファイルを開く」を選びます。'],
          ['続きから', '同じ画面で、続きから入力できます。過去の年度も見られます。'],
        ].map(([head, body], i) => (
          <li key={head} className="flex gap-3">
            <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-rule-ink font-serif font-bold leading-none text-rule-ink">
              {i + 1}
            </span>
            <span>
              <span className="block font-bold">{head}</span>
              {body}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[0.86rem] leading-relaxed text-muted-foreground">{SHARE_NOTE}</p>
      <p className="mt-1 text-[0.86rem] leading-relaxed text-muted-foreground">{DATA_NOTE}</p>
    </Card>
  )
}

/** 2. 次の年度へ繰り越す */
function CarryCard({ onNavigate }: { onNavigate: (tab: 'reconcile') => void }) {
  const { book, today, isPro, apply, setYearId } = useWorkspace()
  const latest = latestYear(book)
  const check = checkCarryForward(book, { today })
  const [open, setOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [label, setLabel] = useState(check.preview.label)
  const [endText, setEndText] = useState(shortDate(check.preview.endDate))
  const [error, setError] = useState<string | null>(null)
  const canUndo = book.years.length >= 2
  const pro = site.pricing.pro

  const openDialog = () => {
    setLabel(check.preview.label)
    setEndText(shortDate(check.preview.endDate))
    setError(null)
    setOpen(true)
  }

  const run = () => {
    const end = parseDateInput(endText)
    if (!end.ok) {
      setError(`終わりの日: ${end.message}`)
      return
    }
    const result = carryForward(book, { label, endDate: end.value })
    if (!result.ok) {
      setError(result.message)
      return
    }
    apply(result, { done: `「${latestYear(result.value).label}」を作りました。前の年度は、読むだけで残っています。` })
    setYearId(latestYear(result.value).id)
    setOpen(false)
  }

  return (
    <Card
      id="handover-carry"
      title={
        <>
          次の年度へ繰り越す
          {!isPro && <span className="ml-2 rounded-sm border border-shu/50 bg-shu-soft px-1.5 py-0.5 align-middle font-sans text-[0.76rem] font-bold text-shu-ink">有料版</span>}
        </>
      }
      lead={`「${latest.label}」を締めて、新しい年度を作ります。科目と予算（予算案を入れていれば、その金額）を引き継ぎ、年度末の残高が、新しい年度のはじめの残高になります。`}
    >
      {/* grid-cols-1 を書いておく（書かないと、長い口座の名前が欄を押し広げて、スマホで画面が横にはみ出す） */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-rule/50 bg-rule-soft/40 px-4 py-3">
          <p className="text-[0.86rem] font-bold text-rule-ink">できる年度</p>
          <p className="mt-0.5 font-serif text-lg font-bold">{check.preview.label}</p>
          <p className="text-[0.9rem] text-muted-foreground">
            {formatWareki(check.preview.startDate)} 〜 {formatWareki(check.preview.endDate)}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-0.5 border-t border-rule/40 pt-2 text-[0.94rem]">
            {check.preview.accounts.map((a) => (
              <div key={a.accountId} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate">{a.name}</dt>
                <dd className={cn('num shrink-0', a.opening < 0 && 'font-bold text-destructive')}>{formatYen(a.opening)} 円</dd>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-rule/40 pt-1 font-bold">
              <dt>はじめの残高の合計</dt>
              <dd className="num">{formatYen(check.preview.openingTotal)} 円</dd>
            </div>
          </dl>
        </div>
        <div className="grid content-start gap-3">
          {check.blockers.length > 0 && (
            <Alert variant="error">
              <AlertTitle>このままでは、繰り越せません</AlertTitle>
              <AlertDescription>
                <ul className="grid gap-1">
                  {check.blockers.map((b, i) => (
                    <li key={i}>{b.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {check.warnings.length > 0 && (
            <Alert variant="warn">
              <AlertTitle>繰り越す前に、確かめてください</AlertTitle>
              <AlertDescription>
                <ul className="grid gap-1">
                  {check.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
                {check.warnings.some((w) => w.code.startsWith('reconcile')) && (
                  <Button variant="link" size="sm" className="justify-start px-0 text-left" onClick={() => onNavigate('reconcile')}>
                    「残高の照合」の画面へ
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          {check.blockers.length === 0 && check.warnings.length === 0 && <Alert variant="ok">繰り越す準備が、できています。</Alert>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button variant="secondary" size="lg" disabled={!isPro || !check.ok} onClick={openDialog}>
          <ArrowRightLeft />
          次の年度へ繰り越す
        </Button>
        {canUndo && (
          <Button variant="ghost" onClick={() => setUndoOpen(true)}>
            前の繰り越しを取り消す
          </Button>
        )}
      </div>
      {!isPro && (
        <p className="mt-3 text-[0.9rem] leading-relaxed">
          繰り越しは、有料版（{pro.unit} {pro.priceText}・税込）のはたらきです。下の「有料版」のところで、ライセンスキーを入れると使えます。
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>次の年度へ繰り越す</DialogTitle>
            <DialogDescription>
              繰り越すと、「{latest.label}」は読むだけになり、取引を足したり直したりできなくなります。先に、ファイルに保存しておくと安心です。
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field label="新しい年度の呼び名">{(p) => <Input {...p} value={label} maxLength={LIMITS.nameLength} onChange={(e) => setLabel(e.target.value)} />}</Field>
            <div className="grid gap-1.5">
              <p className="text-[0.94rem] font-bold">期間</p>
              <p>{formatWareki(check.preview.startDate)} から</p>
              <Label htmlFor="carry-end" className="sr-only">
                新しい年度の終わりの日
              </Label>
              <div className="flex items-start gap-2">
                <DateField id="carry-end" text={endText} onTextChange={setEndText} placeholder="例: 2028/3/31" className="w-44" />
                <span className="mt-2.5">まで</span>
              </div>
            </div>
            {error && (
              <Alert variant="error" role="alert">
                {error}
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              やめる
            </Button>
            <Button variant="secondary" onClick={run}>
              繰り越す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={undoOpen} onOpenChange={setUndoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>繰り越しを取り消しますか</DialogTitle>
            <DialogDescription>
              「{latest.label}」を消して、1つ前の年度を、もう一度書きかえられるようにします。「{latest.label}」で変えた予算や役員の名前は、消えます。取引が1件でも入っていると、取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUndoOpen(false)}>
              取り消さない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const result = undoCarryForward(book)
                if (apply(result, { done: '繰り越しを取り消しました。' }) && result.ok) setYearId(latestYear(result.value).id)
                setUndoOpen(false)
              }}
            >
              繰り越しを取り消す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/** 引き継ぎ書の、行を足したり消したりできる一覧（まだ払っていないもの、備品）。 */
function ListEditor<T extends { id: string }>({
  title,
  items,
  empty,
  addLabel,
  disabled,
  onAdd,
  onRemove,
  describe,
  children,
}: {
  title: string
  items: T[]
  empty: string
  addLabel: string
  disabled: boolean
  onAdd: () => void
  onRemove: (id: string) => void
  describe: (item: T) => string
  children: (item: T) => ReactNode
}) {
  return (
    <div>
      <h3 className="text-[1.05rem]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1.5 text-[0.94rem] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => (
            <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border border-border bg-background/50 p-2.5">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">{children(item)}</div>
              {!disabled && (
                <Button variant="ghost" size="icon" aria-label={`「${describe(item) || '名前なし'}」の行を消す`} onClick={() => onRemove(item.id)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && items.length < LIMITS.maxListItems && (
        <Button variant="soft" size="sm" className="mt-2" onClick={onAdd}>
          <Plus />
          {addLabel}
        </Button>
      )}
    </div>
  )
}

/** 3. 引き継ぎ書に書くこと */
function HandoverFormCard({ onNavigate }: { onNavigate: (tab: 'reports') => void }) {
  const { book, year, locked, apply } = useWorkspace()
  const h = year.handover
  const patch = (p: Partial<Handover>): string | null => {
    const r = updateHandover(book, year.id, p)
    return apply(r, { quiet: true }) ? null : r.ok ? null : r.message
  }
  const patchOrToast = (p: Partial<Handover>) => {
    const message = patch(p)
    if (message) toast.error(message)
  }

  const pendingRows = (key: 'unpaid' | 'unreceived') => (item: PendingItem) => (
    <>
      <CommitText
        label="内容"
        value={item.description}
        maxLength={LIMITS.noteLength}
        placeholder="内容（例: 集会所の鍵の複製代）"
        disabled={locked}
        onCommit={(v) => patch({ [key]: h[key].map((x) => (x.id === item.id ? { ...x, description: v } : x)) })}
      />
      <CommitMoney
        className="sm:w-36"
        label="金額（まだ決まっていなければ、空のまま）"
        value={item.amount}
        allowEmpty
        placeholder="金額（円）"
        disabled={locked}
        onCommit={(v) => patch({ [key]: h[key].map((x) => (x.id === item.id ? { ...x, amount: v } : x)) })}
      />
    </>
  )

  return (
    <Card
      id="handover-form"
      title="引き継ぎ書に書くこと"
      lead={`「${year.label}」の引き継ぎ書の中身です。残高と、照合の結果は、自動で入ります。`}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor="handover-date">引き継ぎをする日</Label>
            <CommitDate id="handover-date" value={h.date} disabled={locked} emptyHint="空のままなら、紙に手で書けるように、空けて出します。" onCommit={(v) => patch({ date: v })} />
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor="handover-successor">次の担当の方の名前</Label>
            <CommitText id="handover-successor" value={h.successor} maxLength={LIMITS.nameLength} disabled={locked} onCommit={(v) => patch({ successor: v })} />
            <p className="text-[0.84rem] leading-snug text-muted-foreground">空のままなら、線だけを出します（手で書けます）。</p>
          </div>
        </div>

        <div>
          <h3 className="text-[1.05rem]">通帳・はんこ・帳簿などの保管場所</h3>
          <p className="mt-1 text-[0.9rem] leading-relaxed text-muted-foreground">どこに置いてあるかを書いて、渡したら、しるしを付けます。いらない行は消せます。</p>
          <ul className="mt-2 grid gap-0 overflow-hidden rounded-lg border border-rule/50">
            {h.custody.map((c, i) => (
              <li key={c.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto_auto]', i > 0 && 'border-t border-rule/35')}>
                <CommitText
                  label={`引き継ぐもの（いまは「${c.label}」）`}
                  value={c.label}
                  maxLength={LIMITS.nameLength}
                  disabled={locked}
                  inputClassName="font-bold"
                  className="max-md:col-span-2"
                  onCommit={(v) => patch({ custody: h.custody.map((x) => (x.id === c.id ? { ...x, label: v } : x)) })}
                />
                <CommitText
                  label={`「${c.label}」の保管場所`}
                  value={c.place}
                  maxLength={LIMITS.noteLength}
                  placeholder="保管場所（例: 会計の自宅）"
                  disabled={locked}
                  className="max-md:col-span-2"
                  onCommit={(v) => patch({ custody: h.custody.map((x) => (x.id === c.id ? { ...x, place: v } : x)) })}
                />
                <label className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-[0.94rem] font-bold', locked && 'cursor-not-allowed opacity-60')}>
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--rule-ink)]"
                    checked={c.handedOver}
                    disabled={locked}
                    onChange={(e) => patchOrToast({ custody: h.custody.map((x) => (x.id === c.id ? { ...x, handedOver: e.target.checked } : x)) })}
                  />
                  渡した
                </label>
                {!locked && (
                  <Button variant="ghost" size="icon" className="justify-self-end" aria-label={`「${c.label}」の行を消す`} onClick={() => patchOrToast({ custody: h.custody.filter((x) => x.id !== c.id) })}>
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!locked && h.custody.length < LIMITS.maxListItems && (
            <Button variant="soft" size="sm" className="mt-2" onClick={() => patchOrToast({ custody: [...h.custody, { id: randomId(), label: '引き継ぐもの', place: '', handedOver: false }] })}>
              <Plus />
              行を足す
            </Button>
          )}
        </div>

        <ListEditor
          title="まだ払っていないもの"
          items={h.unpaid}
          empty="書いてあるものは、ありません。"
          addLabel="まだ払っていないものを足す"
          disabled={locked}
          describe={(i) => i.description}
          onAdd={() => patchOrToast({ unpaid: [...h.unpaid, { id: randomId(), description: '', amount: null }] })}
          onRemove={(id) => patchOrToast({ unpaid: h.unpaid.filter((x) => x.id !== id) })}
        >
          {pendingRows('unpaid')}
        </ListEditor>

        <ListEditor
          title="まだもらっていないもの"
          items={h.unreceived}
          empty="書いてあるものは、ありません。"
          addLabel="まだもらっていないものを足す"
          disabled={locked}
          describe={(i) => i.description}
          onAdd={() => patchOrToast({ unreceived: [...h.unreceived, { id: randomId(), description: '', amount: null }] })}
          onRemove={(id) => patchOrToast({ unreceived: h.unreceived.filter((x) => x.id !== id) })}
        >
          {pendingRows('unreceived')}
        </ListEditor>

        <ListEditor<EquipmentItem>
          title="備品"
          items={h.equipment}
          empty="書いてあるものは、ありません。"
          addLabel="備品を足す"
          disabled={locked}
          describe={(i) => i.name}
          onAdd={() => patchOrToast({ equipment: [...h.equipment, { id: randomId(), name: '', quantity: '', place: '' }] })}
          onRemove={(id) => patchOrToast({ equipment: h.equipment.filter((x) => x.id !== id) })}
        >
          {(item) => (
            <>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem]">
                <CommitText
                  label="備品の名前"
                  value={item.name}
                  maxLength={LIMITS.nameLength}
                  placeholder="名前（例: テント）"
                  disabled={locked}
                  onCommit={(v) => patch({ equipment: h.equipment.map((x) => (x.id === item.id ? { ...x, name: v } : x)) })}
                />
                <CommitText
                  label="数"
                  value={item.quantity}
                  maxLength={20}
                  placeholder="数（例: 2張）"
                  disabled={locked}
                  onCommit={(v) => patch({ equipment: h.equipment.map((x) => (x.id === item.id ? { ...x, quantity: v } : x)) })}
                />
              </div>
              <CommitText
                className="sm:w-52"
                label="保管場所"
                value={item.place}
                maxLength={LIMITS.noteLength}
                placeholder="保管場所"
                disabled={locked}
                onCommit={(v) => patch({ equipment: h.equipment.map((x) => (x.id === item.id ? { ...x, place: v } : x)) })}
              />
            </>
          )}
        </ListEditor>

        <div className="grid gap-1.5">
          <Label htmlFor="handover-memo" className="font-serif text-[1.05rem]">
            次の担当の方へのメモ
          </Label>
          <p className="text-[0.9rem] leading-relaxed text-muted-foreground">会費を集める時期、引き落としの日、補助金の申請の時期など、知っておくと助かることを書きます。</p>
          <CommitText id="handover-memo" multiline rows={7} value={h.memo} maxLength={LIMITS.textLength} disabled={locked} onCommit={(v) => patch({ memo: v })} />
        </div>

        <div>
          <Button variant="outline" onClick={() => onNavigate('reports')}>
            引き継ぎ書を、紙の形で見る
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** 4. 有料版（ライセンスキー） */
function LicenseCard() {
  const { book, license, isSample, apply } = useWorkspace()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pro = site.pricing.pro
  const inFile = book.licenseKey !== ''

  const activate = async () => {
    const trimmed = key.trim()
    if (trimmed === '') {
      setError('ライセンスキーを貼り付けてください。')
      return
    }
    setBusy(true)
    const reason = await license.activate(trimmed)
    setBusy(false)
    if (reason !== null) {
      setError(reason)
      return
    }
    setError(null)
    setKey('')
    // キーは団体のものなので、ひきつぎファイルにも入れる（見本の帳簿には入れない）
    if (!isSample) apply(setLicenseKey(book, trimmed))
    toast.success(isSample ? '有料版になりました。' : '有料版になりました。キーは、ひきつぎファイルにも入れました。ファイルを保存し直してください。')
  }

  return (
    <Card
      id="handover-license"
      title="有料版"
      lead={`${pro.unit} ${pro.priceText}（税込）。透かしなしで資料を印刷できて、次の年度への繰り越しができます。入力と、画面での確認は、ずっと無料です。`}
    >
      {license.prelaunch ? (
        <Alert variant="info">
          <AlertTitle>いまは公開前のため、有料版のはたらきを、すべて試せます</AlertTitle>
          <AlertDescription>販売を始めたあとは、ライセンスキーを入れると、有料版になります。無料版の見え方は、画面のいちばん上の切り替えで確かめられます。</AlertDescription>
        </Alert>
      ) : license.license ? (
        <div className="grid gap-3">
          <div className="flex items-center gap-4 rounded-lg border border-rule/50 bg-rule-soft/40 px-4 py-3">
            <Seal text="済" size={56} title="有料版です" />
            <div className="min-w-0">
              <p className="font-bold">有料版です{license.license.name ? `（${license.license.name} 様）` : ''}</p>
              <p className="text-[0.9rem] text-muted-foreground">
                {license.license.expiresAt ? `${formatWareki(license.license.expiresAt)}まで使えます。` : '期限はありません。'}
              </p>
            </div>
          </div>
          {isSample ? null : inFile ? (
            <p className="text-[0.9rem] leading-relaxed">
              {pro.note}
              <span className="mt-1 block text-[0.84rem] text-muted-foreground">キーは、この帳簿のひきつぎファイルにも入っています。ブラウザから外しても、このファイルを開くと、また有料版になります。</span>
            </p>
          ) : (
            <Alert variant="warn">
              <AlertDescription>
                このキーは、まだひきつぎファイルに入っていません。入れておくと、次の担当の方も、期限まで有料版を使えます。
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const stored = storedLicenseKey()
                    if (stored) apply(setLicenseKey(book, stored), { done: 'キーを、ひきつぎファイルに入れました。ファイルを保存し直してください。' })
                    else toast.error('このブラウザに、キーが残っていませんでした。もう一度、キーを入れてください。')
                  }}
                >
                  キーを、ひきつぎファイルに入れる
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Button variant="ghost" size="sm" onClick={() => license.deactivate()}>
              このブラウザから、キーを外す
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              activate()
            }}
          >
            <Field label="ライセンスキー" hint="購入のあとに届くメールのキーを、最初から最後までコピーして、貼り付けてください。" error={error}>
              {(p) => (
                <Textarea
                  {...p}
                  value={key}
                  rows={3}
                  spellCheck={false}
                  autoComplete="off"
                  className="min-h-20 break-all font-mono text-[0.86rem]"
                  onChange={(e) => setKey(e.target.value)}
                />
              )}
            </Field>
            <div>
              <Button type="submit" variant="secondary" disabled={busy}>
                <KeyRound />
                {busy ? '確かめています…' : 'キーを確かめて、有料版にする'}
              </Button>
            </div>
          </form>
          <div className="border-t border-rule/40 pt-3">
            {site.checkoutUrl ? (
              <Button asChild variant="outline">
                <a href={site.checkoutUrl} target="_blank" rel="noreferrer">
                  有料版を申しこむ（{pro.priceText}・決済ページが開きます）
                </a>
              </Button>
            ) : (
              <p className="inline-flex min-h-11 items-center rounded-lg border border-dashed border-input/70 bg-muted px-4 font-bold text-muted-foreground">販売準備中です（{pro.priceText}・税込）</p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

/** 5. はじめからやり直す */
function ResetCard() {
  const { book, unsaved, dirty, isSample, reset, saveFile } = useWorkspace()
  const [open, setOpen] = useState(false)
  return (
    <Card id="handover-reset" tone="plain" title="このブラウザのデータを消す" lead="別の団体の帳簿を始めるときや、共用のパソコンを使い終わったときに使います。保存したひきつぎファイルは、消えません。">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        データを消して、はじめにもどる
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>このブラウザから、帳簿を消しますか</DialogTitle>
            <DialogDescription>「{book.orgName}」の帳簿を、このブラウザから消します。元に戻せません。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {dirty ? (
              <Alert variant="warn" role="alert">
                <AlertTitle>{unsaved.neverSaved ? 'まだ、ファイルに保存していません' : `ファイルに保存していない変更が、${unsaved.count}件あります`}</AlertTitle>
                <AlertDescription>
                  消す前に、ファイルに保存してください。保存しないと、入力した内容がなくなります。
                  <Button variant="secondary" size="sm" className="mt-2" onClick={saveFile}>
                    <Download />
                    いま、ファイルに保存する
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="leading-relaxed">
                {isSample && unsaved.neverSaved
                  ? 'サンプルの帳簿は、はじめの画面の「サンプルを見る」から、いつでも入れ直せます。'
                  : 'ひきつぎファイルに保存してあるので、あとでそのファイルを開けば、続きから始められます。'}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              消さない
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              {dirty ? '保存せずに消す' : '消す'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function HandoverScreen({ onOpenFile, onNavigate }: { onOpenFile: (file: File) => void; onNavigate: (tab: 'reconcile' | 'reports') => void }) {
  const { locked, year, book } = useWorkspace()
  return (
    <div className="grid grid-cols-1 gap-6">
      <FileCard onOpenFile={onOpenFile} />
      <CarryCard onNavigate={onNavigate} />
      {locked && <Alert variant="info">いま見ている「{year.label}」は読むだけなので、引き継ぎ書の中身は変えられません。いまの年度は「{latestYear(book).label}」です。</Alert>}
      <HandoverFormCard onNavigate={onNavigate} />
      <LicenseCard />
      <ResetCard />
    </div>
  )
}
