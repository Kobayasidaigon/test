// ③ 希望休。スタッフごと・日ごとの「休み希望」（必ず守る）と「この勤務に入りたい」（できるだけ守る）。
// 上で入れるものを選んでから、表のマスを押して入れる。Excel からの貼り付けもできる。
import { useMemo, useState } from 'react'
import { ClipboardPaste, Eraser, Users } from 'lucide-react'
import { applyWishPaste, formatMonth, parseWishPaste, setWish, type PastePreview, type ShiftPlan, type Wish } from '@/core'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label, Select, Textarea } from '@/components/ui/field'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented'
import { OffBlock, ShiftBlock } from '@/components/shift-block'
import { ShiftGrid } from '@/components/shift-grid'
import { StepHeading, useTool } from './tool-context'

/** いま入れるもの。'off' = 休み希望、'erase' = 消す、ほかは勤務の種類の id */
type Brush = string

export function StepWishes() {
  const { plan, update, notifyUndo, goStep } = useTool()
  const [brush, setBrush] = useState<Brush>('off')
  const [pasteOpen, setPasteOpen] = useState(false)

  const activeBrush = brush === 'off' || brush === 'erase' || plan.shiftTypes.some((s) => s.id === brush) ? brush : 'off'
  const options: SegmentedOption<Brush>[] = [
    { value: 'off', label: '休み希望', lead: <OffBlock size="sm" /> },
    ...plan.shiftTypes.map((s) => ({ value: s.id, label: `${s.name || '（名前なし）'}に入りたい`, lead: <ShiftBlock shift={s} size="sm" /> })),
    { value: 'erase', label: '消す', lead: <Eraser aria-hidden className="size-4" /> },
  ]

  const wishCount = Object.values(plan.wishes).reduce((n, row) => n + Object.keys(row).length, 0)

  const press = (staffId: string, day: number) => {
    const now = plan.wishes[staffId]?.[String(day)] ?? null
    let next: Wish | null
    if (activeBrush === 'erase') next = null
    else if (activeBrush === 'off') next = now?.kind === 'off' ? null : { kind: 'off' }
    // 同じものが入っているマスをもう一度押したら、消す
    else next = now?.kind === 'shift' && now.shiftId === activeBrush ? null : { kind: 'shift', shiftId: activeBrush }
    update((p) => setWish(p, staffId, day, next))
  }

  if (plan.staff.length === 0) {
    return (
      <div>
        <StepHeading no={3} title="希望休" lead="スタッフから集めた休みの希望を入れます。" />
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Users />
            </EmptyMedia>
            <EmptyTitle>先に、スタッフを入れてください</EmptyTitle>
            <EmptyDescription>希望休は、スタッフごとに入れます。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => goStep(0)}>①でスタッフを入れる</Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      <StepHeading
        no={3}
        title="希望休"
        lead={
          <>
            紙や LINE で集めた希望を、ここに写します。休み希望は必ず守り、「入りたい」は、できるだけ守ります。希望がなければ、空のままで次へ進めます。
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-sm font-bold" id="brush-label">
            入れるものを選んで、下の表のマスを押します
          </p>
          <SegmentedControl label="入れるもの" variant="chips" options={options} value={activeBrush} onValueChange={setBrush} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste aria-hidden />
            Excel から貼り付ける
          </Button>
          {wishCount > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                update((p) => ({ ...p, wishes: {} }))
                notifyUndo(`希望を${wishCount}件、すべて消しました。`)
              }}
            >
              希望をすべて消す
            </Button>
          ) : null}
        </div>
      </div>

      <ShiftGrid plan={plan} mode="wishes" onCellPress={press} label={`${formatMonth(plan.year, plan.month)}の希望休`} />

      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
        同じマスをもう一度押すと、消えます。斜線の列は、店を開けない日です。いま入っている希望は<span className="font-num font-bold text-ink">{wishCount}</span>件です。
      </p>

      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} />
    </div>
  )
}

/** 貼り付けの見本（いまのスタッフの名前で作る。どう書けば読めるかが、ひと目でわかるように） */
function sampleText(plan: ShiftPlan): string {
  const days = [1, 2, 3, 4, 5, 6, 7]
  const marks = [
    ['', '休', '', '', '', '×', ''],
    ['', '', '希', '', '', '', ''],
    ['休', '', '', '', '休', '', ''],
  ]
  const lines = [['名前', ...days.map(String)].join('\t')]
  plan.staff.slice(0, 3).forEach((st, i) => lines.push([st.name || `スタッフ${i + 1}`, ...marks[i]].join('\t')))
  return lines.join('\n')
}

function PasteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { plan, update, notifyUndo } = useTool()
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [assign, setAssign] = useState<Record<number, string>>({})

  const preview: PastePreview | null = useMemo(() => (text.trim() === '' ? null : parseWishPaste(text, plan)), [text, plan])
  const shiftName = (id: string) => plan.shiftTypes.find((s) => s.id === id)?.name || '（名前なし）'

  // 取り込む数（名前が当てはまらなかった行を、画面で選んだスタッフに当てたぶんもふくめる）
  const counts = useMemo(() => {
    let off = 0
    let shift = 0
    for (const r of preview?.rows ?? []) {
      if ((r.staffId ?? assign[r.line] ?? '') === '') continue
      for (const w of r.wishes) {
        if (w.wish.kind === 'off') off++
        else shift++
      }
    }
    return { off, shift }
  }, [preview, assign])
  const canApply = !!preview && counts.off + counts.shift > 0

  const close = () => {
    onOpenChange(false)
    setText('')
    setAssign({})
    setMode('merge')
  }

  const apply = () => {
    if (!preview) return
    update((p) => applyWishPaste(p, preview, { mode, assign }))
    notifyUndo(`希望を取り込みました（休み希望${counts.off}件、入りたい${counts.shift}件）。`, 'success')
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Excel から、希望を貼り付ける</DialogTitle>
          <DialogDescription>行がスタッフ、列が日の表を、Excel でコピーして、下の欄に貼り付けます。「休」「×」「希」などのマスを、休み希望として読みます。読み取った結果を確かめてから、取り込みます。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 pb-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="paste-text">貼り付ける欄</Label>
                <Button variant="link" className="text-[13px]" onClick={() => setText(sampleText(plan))}>
                  書き方の見本を入れてみる
                </Button>
              </div>
              <Textarea
                id="paste-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'名前\t1\t2\t3 …\n青木\t\t休\t …'}
                spellCheck={false}
                className="h-32 whitespace-pre font-num text-sm"
              />
            </div>

            {preview ? (
              <>
                {preview.notes.length > 0 ? (
                  <Notice variant="info">
                    <NoticeTitle>こう読みました</NoticeTitle>
                    <NoticeBody>
                      <ul className="list-disc pl-4">
                        {preview.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </NoticeBody>
                  </Notice>
                ) : null}
                {preview.problems.length > 0 ? (
                  <Notice variant="warn">
                    <NoticeTitle>確かめてください</NoticeTitle>
                    <NoticeBody>
                      <ul className="list-disc pl-4">
                        {preview.problems.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </NoticeBody>
                  </Notice>
                ) : null}

                {preview.rows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border-2 border-ink">
                    <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                      <caption className="sr-only">読み取った結果</caption>
                      <thead>
                        <tr className="border-b-2 border-ink bg-well text-xs">
                          <th scope="col" className="px-3 py-2">
                            貼り付けた名前
                          </th>
                          <th scope="col" className="px-3 py-2">
                            当てはめるスタッフ
                          </th>
                          <th scope="col" className="px-3 py-2">
                            読み取った希望
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r) => {
                          const off = r.wishes.filter((w) => w.wish.kind === 'off').map((w) => w.day)
                          const shifts = r.wishes.filter((w) => w.wish.kind === 'shift')
                          const matched = plan.staff.find((s) => s.id === r.staffId)
                          return (
                            <tr key={r.line} className="border-b border-line align-top last:border-b-0">
                              <td className="px-3 py-2 font-bold">{r.name || `${r.line}行め`}</td>
                              <td className="px-3 py-2">
                                {matched ? (
                                  <span>{matched.name || '（名前なし）'}さん</span>
                                ) : (
                                  <Select aria-label={`${r.name || `${r.line}行め`}を当てはめるスタッフ`} value={assign[r.line] ?? ''} onChange={(e) => setAssign((a) => ({ ...a, [r.line]: e.target.value }))}>
                                    <option value="">取り込まない</option>
                                    {plan.staff.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name || '（名前なし）'}さん
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              </td>
                              <td className="px-3 py-2 leading-relaxed">
                                {off.length > 0 ? (
                                  <p>
                                    <span className="font-bold">休み希望</span> <span className="font-num">{off.join('・')}</span>日
                                  </p>
                                ) : null}
                                {shifts.length > 0 ? (
                                  <p>
                                    <span className="font-bold">入りたい</span>{' '}
                                    {shifts.map((w) => `${w.day}日（${w.wish.kind === 'shift' ? shiftName(w.wish.shiftId) : ''}）`).join('・')}
                                  </p>
                                ) : null}
                                {r.unknown.length > 0 ? <p className="text-ink-soft">読めなかったマス {r.unknown.map((u) => `${u.day}日「${u.text}」`).join('・')}</p> : null}
                                {r.wishes.length === 0 && r.unknown.length === 0 ? <p className="text-ink-soft">希望なし</p> : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div>
                  <p className="mb-1.5 text-sm font-bold">いま入っている希望のあつかい</p>
                  <SegmentedControl
                    label="いま入っている希望のあつかい"
                    variant="chips"
                    value={mode}
                    onValueChange={setMode}
                    options={[
                      { value: 'merge', label: '残して、足す' },
                      { value: 'replace', label: '貼り付けた人のぶんは、入れかえる' },
                    ]}
                  />
                </div>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-soft">
                1行めに日付（1、2、3 …）、いちばん左の列に名前がある表が、いちばん確かに読めます。勤務の名前や記号（{plan.shiftTypes.map((s) => s.symbol || s.name).filter(Boolean).join('、') || '早、遅 など'}
                ）が入ったマスは、「その勤務に入りたい」として読みます。
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            やめる
          </Button>
          <Button onClick={apply} disabled={!canApply}>
            {canApply ? `取り込む（休み希望${counts.off}件、入りたい${counts.shift}件）` : '取り込む'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
