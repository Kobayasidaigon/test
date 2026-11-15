import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  LIMITS,
  ORG_KINDS,
  categoryTemplate,
  createBook,
  defaultFiscalPeriod,
  fiscalYearLabel,
  formatWareki,
  formatYen,
  parseYen,
  type Book,
  type DateString,
  type OrgKind,
} from '@/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Steps } from '@/components/ui/steps'
import { Alert } from '@/components/ui/alert'
import { MoneyInput } from './fields'

// 「新しく始める」の3つの段。
//   1. 団体の種類（科目のひな形が決まる）
//   2. 団体の名前と、会計年度
//   3. 年度はじめの残高（現金と、預金口座）
// どれも、あとから「科目と予算」の画面や「団体の設定」で変えられる。入力は、作るボタンを押すまで帳簿にならない。

const STEPS = [{ title: '団体の種類' }, { title: '名前と年度' }, { title: 'はじめの残高' }]

type BankRow = { key: number; name: string; amount: string }

export function NewBookWizard({
  open,
  onOpenChange,
  today,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  today: DateString
  onCreate: (book: Book) => void
}) {
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<OrgKind>('chonaikai')
  const [orgName, setOrgName] = useState('')
  const [startMonth, setStartMonth] = useState(4)
  // 0 = 今日を含む年度、-1 = その1つ前の年度（年度が終わってから、決算のために入力を始める人のため）
  const [yearOffset, setYearOffset] = useState(0)
  const [cash, setCash] = useState('0')
  const [banks, setBanks] = useState<BankRow[]>([{ key: 1, name: '普通預金', amount: '0' }])
  const nextKey = useRef(2)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const periods = useMemo(() => {
    const current = defaultFiscalPeriod(today, startMonth)
    const prevStart = `${Number(current.startDate.slice(0, 4)) - 1}${current.startDate.slice(4)}`
    const previous = defaultFiscalPeriod(prevStart, startMonth)
    return { current, previous }
  }, [today, startMonth])
  const period = yearOffset === 0 ? periods.current : periods.previous

  const cashParsed = parseYen(cash.trim() === '' ? '0' : cash)
  const bankParsed = banks.map((b) => parseYen(b.amount.trim() === '' ? '0' : b.amount))
  const total = (cashParsed.ok ? cashParsed.value : 0) + bankParsed.reduce((s, p) => s + (p.ok ? p.value : 0), 0)

  const goNext = () => {
    if (step === 1) {
      if (orgName.trim() === '') {
        setErrors({ orgName: '団体の名前を入れてください。' })
        return
      }
      setErrors({})
    }
    setStep((s) => Math.min(2, s + 1))
  }

  const create = () => {
    const next: Record<string, string> = {}
    if (!cashParsed.ok) next.cash = cashParsed.message
    banks.forEach((b, i) => {
      const p = bankParsed[i]
      if (!p.ok) next[`bank-${b.key}`] = p.message
      if (b.name.trim() === '') next[`bankname-${b.key}`] = '口座の名前を入れてください。'
    })
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const result = createBook({
      orgName,
      orgKind: kind,
      startDate: period.startDate,
      endDate: period.endDate,
      cashOpening: cashParsed.ok ? cashParsed.value : 0,
      bankAccounts: banks.map((b, i) => {
        const p = bankParsed[i]
        return { name: b.name, openingBalance: p.ok ? p.value : 0 }
      }),
    })
    if (!result.ok) {
      if (result.field === 'orgName') {
        // 名前のまちがいは、名前の段に戻って、その欄の下に出す（残高の段に出しても、どこを直すのかわからないため）
        setErrors({ orgName: result.message })
        setFormError(null)
        setStep(1)
      } else {
        setFormError(result.message)
      }
      return
    }
    setFormError(null)
    onCreate(result.value)
    onOpenChange(false)
    // 次に開いたときのために、最初の段に戻しておく
    setStep(0)
  }

  const template = categoryTemplate(kind)
  const kindInfo = ORG_KINDS.find((k) => k.kind === kind)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新しく始める</DialogTitle>
          <DialogDescription>3つのことを決めると、帳簿ができます。どれも、あとから変えられます。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Steps items={STEPS} current={step} onStepChange={setStep} label="新しく始める手順" className="mb-6" />

          {step === 0 && (
            <fieldset>
              <legend className="mb-2 font-bold">どんな団体ですか</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ORG_KINDS.map((k) => (
                  <label
                    key={k.kind}
                    className={cn(
                      'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] bg-paper px-3.5 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                      kind === k.kind ? 'border-rule-ink bg-rule-soft' : 'border-input/70 hover:bg-muted',
                    )}
                  >
                    <input type="radio" name="org-kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="size-5 shrink-0 accent-[var(--rule-ink)] outline-none" />
                    <span className="grid">
                      <span className="font-bold leading-snug">{k.label}</span>
                      <span className="text-[0.84rem] leading-snug text-muted-foreground">{k.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background/60 px-4 py-3 text-[0.9rem] leading-relaxed">
                <p className="font-bold">「{kindInfo?.label}」で始めると、次の科目が入ります。</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-bold text-rule-ink">収入</span>
                  ：{template.filter((c) => c.side === 'income').map((c) => c.name).join('、')}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-bold text-shu-ink">支出</span>
                  ：{template.filter((c) => c.side === 'expense').map((c) => c.name).join('、')}
                </p>
                <p className="mt-1.5 text-[0.84rem] text-muted-foreground">よくある名前の一例です。前の年の資料に合わせて、あとから自由に変えられます。</p>
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-5">
              <Field label="団体の名前" hint="資料の右上に出ます。例: みどり町内会、ひまわり子ども会" error={errors.orgName}>
                {(p) => <Input {...p} value={orgName} maxLength={LIMITS.nameLength} autoComplete="organization" onChange={(e) => setOrgName(e.target.value)} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
                <Field label="会計年度が始まる月" hint="団体の規約で決まっています。">
                  {(p) => (
                    <NativeSelect {...p} value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m}月
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
                <Field label="どの年度から入力しますか">
                  {(p) => (
                    <NativeSelect {...p} value={yearOffset} onChange={(e) => setYearOffset(Number(e.target.value))}>
                      {/* 選ぶ欄の字は短くする（スマホの幅で、終わりが切れて読めなくなるため）。期間は、すぐ下の枠に出ている */}
                      <option value={0}>{fiscalYearLabel(periods.current.startDate)}（いまの年度）</option>
                      <option value={-1}>{fiscalYearLabel(periods.previous.startDate)}（1つ前の年度）</option>
                    </NativeSelect>
                  )}
                </Field>
              </div>
              <p className="rounded-lg border border-rule/40 bg-rule-soft/50 px-4 py-3 leading-relaxed">
                <span className="font-bold">{fiscalYearLabel(period.startDate)}</span>
                <span className="ml-2">
                  {formatWareki(period.startDate)} から {formatWareki(period.endDate)} まで
                </span>
                <span className="mt-1 block text-[0.86rem] text-muted-foreground">年度の呼び名と、終わりの日は、あとで「団体の設定」から変えられます。</span>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-5">
              <p className="leading-relaxed">
                {formatWareki(period.startDate)}（年度はじめ）に、いくらありましたか。前の年度の決算書の「次年度繰越金」の内訳を、そのまま入れます。
                <span className="mt-1 block text-[0.9rem] text-muted-foreground">わからなければ 0 のままで始めて、あとから「科目と予算」の画面で直せます。</span>
              </p>
              <Field label="現金（手元のお金）" error={errors.cash} className="max-w-xs">
                {(p) => <MoneyInput {...p} value={cash} onValueChange={setCash} onFocus={(e) => e.target.select()} />}
              </Field>
              <div className="grid gap-3">
                <p className="font-bold">預金口座（通帳ごとに1つ。3つまで）</p>
                {banks.length === 0 && <p className="text-[0.94rem] text-muted-foreground">口座は使わない（現金だけ）で始めます。</p>}
                {banks.map((b, i) => (
                  <div key={b.key} className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-2 rounded-lg border border-border bg-background/50 p-3 sm:grid-cols-[1fr_11rem_auto]">
                    <Field label={`口座${i + 1}の名前`} error={errors[`bankname-${b.key}`]} className="col-span-2 sm:col-span-1">
                      {(p) => (
                        <Input
                          {...p}
                          value={b.name}
                          maxLength={LIMITS.nameLength}
                          placeholder="例: 普通預金、ゆうちょ"
                          onChange={(e) => setBanks((list) => list.map((x) => (x.key === b.key ? { ...x, name: e.target.value } : x)))}
                        />
                      )}
                    </Field>
                    <Field label="年度はじめの残高" error={errors[`bank-${b.key}`]}>
                      {(p) => (
                        <MoneyInput
                          {...p}
                          value={b.amount}
                          onFocus={(e) => e.target.select()}
                          onValueChange={(text) => setBanks((list) => list.map((x) => (x.key === b.key ? { ...x, amount: text } : x)))}
                        />
                      )}
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-[1.65rem]"
                      aria-label={`口座${i + 1}（${b.name || '名前なし'}）を外す`}
                      onClick={() => setBanks((list) => list.filter((x) => x.key !== b.key))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {banks.length < LIMITS.maxBankAccounts && (
                  <Button
                    variant="soft"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setBanks((list) => [...list, { key: nextKey.current++, name: list.length === 0 ? '普通預金' : '', amount: '0' }])}
                  >
                    <Plus />
                    口座を足す
                  </Button>
                )}
              </div>
              <p className="rule-double flex items-baseline justify-between gap-3 pb-2 font-bold">
                <span>合計（前年度繰越金）</span>
                <span className="num text-xl">{formatYen(total)} 円</span>
              </p>
              {formError && (
                <Alert variant="error" role="alert">
                  {formError}
                </Alert>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? 'やめる' : '前にもどる'}
          </Button>
          {step < 2 ? <Button onClick={goNext}>次へ進む</Button> : <Button onClick={create}>この内容で帳簿を作る</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
