import { useEffect, useState } from 'react'
import {
  LIMITS,
  formatWareki,
  parseDateInput,
  previousYear,
  updateOfficers,
  updateOrg,
  updateYear,
  type Book,
  type Result,
} from '@/core'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, Label } from '@/components/ui/input'
import { DateField, shortDate } from './fields'
import { chain, useWorkspace } from './store'

// 団体の設定。団体の名前、年度の呼び名と期間、役員の名前、役の呼び名。
// まとめて書きかえて、「保存する」で反映する（変えたところだけを帳簿に入れる）。

export function OrgSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { book, year, locked, apply } = useWorkspace()
  const firstYear = previousYear(book, year.id) === undefined
  const [orgName, setOrgName] = useState(book.orgName)
  const [label, setLabel] = useState(year.label)
  const [startText, setStartText] = useState(shortDate(year.startDate))
  const [endText, setEndText] = useState(shortDate(year.endDate))
  const [president, setPresident] = useState(year.officers.president)
  const [treasurer, setTreasurer] = useState(year.officers.treasurer)
  const [auditors, setAuditors] = useState(year.officers.auditors)
  const [roles, setRoles] = useState(book.roleNames)
  const [error, setError] = useState<string | null>(null)

  // 開くたびに、いまの帳簿の中身から始める
  useEffect(() => {
    if (!open) return
    setOrgName(book.orgName)
    setLabel(year.label)
    setStartText(shortDate(year.startDate))
    setEndText(shortDate(year.endDate))
    setPresident(year.officers.president)
    setTreasurer(year.officers.treasurer)
    setAuditors(year.officers.auditors)
    setRoles(book.roleNames)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = () => {
    const steps: ((b: Book) => Result<Book>)[] = []
    if (orgName.trim() !== book.orgName) steps.push((b) => updateOrg(b, { orgName }))
    if (roles.president.trim() !== book.roleNames.president || roles.treasurer.trim() !== book.roleNames.treasurer || roles.auditor.trim() !== book.roleNames.auditor) {
      steps.push((b) => updateOrg(b, { roleNames: roles }))
    }
    if (!locked) {
      const start = parseDateInput(startText)
      const end = parseDateInput(endText)
      if (!start.ok) return setError(`年度の始まりの日: ${start.message}`)
      if (!end.ok) return setError(`年度の終わりの日: ${end.message}`)
      if (label.trim() !== year.label || start.value !== year.startDate || end.value !== year.endDate) {
        steps.push((b) => updateYear(b, year.id, { label, startDate: start.value, endDate: end.value }))
      }
      const o = year.officers
      if (president.trim() !== o.president || treasurer.trim() !== o.treasurer || auditors.some((a, i) => a.trim() !== o.auditors[i])) {
        steps.push((b) => updateOfficers(b, year.id, { president, treasurer, auditors }))
      }
    }
    if (steps.length === 0) {
      onOpenChange(false)
      return
    }
    const result = chain(book, steps)
    if (!result.ok) {
      setError(result.message)
      return
    }
    apply(result, { done: '団体の設定を保存しました。' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>団体の設定</DialogTitle>
          <DialogDescription>資料に出る、団体の名前・年度・役員の名前を決めます。役員の名前は、空のままでもかまいません（署名欄には、線だけが出ます）。</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid grid-cols-1 gap-6">
          <Field label="団体の名前">{(p) => <Input {...p} value={orgName} maxLength={LIMITS.nameLength} onChange={(e) => setOrgName(e.target.value)} />}</Field>

          <fieldset className="grid gap-3" disabled={locked}>
            <legend className="rule-double mb-3 w-full pb-1 font-serif text-lg font-bold">
              {year.label}の、年度と役員
              {locked && <span className="ml-2 font-sans text-[0.84rem] font-normal text-muted-foreground">（読むだけの年度なので、変えられません）</span>}
            </legend>
            <Field label="年度の呼び名" hint="例: 令和8年度、2026年度、第12期" className="max-w-xs">
              {(p) => <Input {...p} value={label} maxLength={LIMITS.nameLength} onChange={(e) => setLabel(e.target.value)} />}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                {firstYear && !locked ? (
                  <>
                    <Label htmlFor="org-start">始まりの日</Label>
                    <DateField id="org-start" className="mt-1.5" text={startText} onTextChange={setStartText} placeholder="例: 2026/4/1" />
                  </>
                ) : (
                  <>
                    {/* 変えられないときは入力欄がないので、ラベルではなく、ただの見出しにする */}
                    <p className="text-[0.94rem] font-bold leading-snug">始まりの日</p>
                    <p className="mt-1.5 flex min-h-12 items-center rounded-lg border border-border bg-muted px-3">{formatWareki(year.startDate)}</p>
                  </>
                )}
                {!firstYear && !locked && <p className="mt-1 text-[0.84rem] leading-snug text-muted-foreground">前の年度の終わりの次の日に、決まっています。</p>}
              </div>
              <div>
                <Label htmlFor="org-end">終わりの日</Label>
                <DateField id="org-end" className="mt-1.5" text={endText} onTextChange={setEndText} placeholder="例: 2027/3/31" disabled={locked} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${roles.president || '会長'}の名前`}>{(p) => <Input {...p} value={president} maxLength={LIMITS.nameLength} onChange={(e) => setPresident(e.target.value)} />}</Field>
              <Field label={`${roles.treasurer || '会計'}の名前`}>{(p) => <Input {...p} value={treasurer} maxLength={LIMITS.nameLength} onChange={(e) => setTreasurer(e.target.value)} />}</Field>
              {auditors.map((name, i) => (
                <Field key={i} label={`${roles.auditor || '監査'}の名前${auditors.length > 1 ? `（${i + 1}人め）` : ''}`}>
                  {(p) => <Input {...p} value={name} maxLength={LIMITS.nameLength} onChange={(e) => setAuditors((list) => list.map((a, k) => (k === i ? e.target.value : a)))} />}
                </Field>
              ))}
            </div>
            <p className="text-[0.84rem] leading-snug text-muted-foreground">監査をする人の数は、「資料」の画面の「会計監査報告書」で変えられます。</p>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="rule-double mb-3 w-full pb-1 font-serif text-lg font-bold">役の呼び名</legend>
            <p className="text-[0.9rem] leading-relaxed text-muted-foreground">団体での呼び方に合わせます（「会長」を「代表」に、「監事」を「会計監査」に、など）。資料の署名欄に出ます。</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="代表する人">{(p) => <Input {...p} value={roles.president} maxLength={LIMITS.nameLength} onChange={(e) => setRoles((r) => ({ ...r, president: e.target.value }))} />}</Field>
              <Field label="会計の担当">{(p) => <Input {...p} value={roles.treasurer} maxLength={LIMITS.nameLength} onChange={(e) => setRoles((r) => ({ ...r, treasurer: e.target.value }))} />}</Field>
              <Field label="監査をする人">{(p) => <Input {...p} value={roles.auditor} maxLength={LIMITS.nameLength} onChange={(e) => setRoles((r) => ({ ...r, auditor: e.target.value }))} />}</Field>
            </div>
          </fieldset>

          {error && (
            <Alert variant="error" role="alert">
              {error}
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            やめる
          </Button>
          <Button onClick={save}>保存する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
