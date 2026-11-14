import { useId, useState } from 'react'
import { inspectEstimate } from '@/core/inspect'
import { sampleEstimate } from '@/core/sample'
import type { Estimate } from '@/core/types'
import { AmountField } from '@/components/tool/amount-field'
import { cn } from '@/lib/utils'

// 仲介手数料の解説ページに置く、小さな点検。
// 家賃と、見積書の仲介手数料を入れると、道具と同じロジック（core の inspectEstimate）で、その1行だけを点検する。
// 計算や文を、ここで書き直していない（道具の結果と、1文字も違わないようにするため）。
// はじめは、サンプルの見積書の数字を入れてある（静的HTMLの段階でも、結果が出ているように）。

export function BrokerageTry() {
  const sample = sampleEstimate()
  const [rent, setRent] = useState<number | null>(sample.rent)
  const [amount, setAmount] = useState<number | null>(sample.lines.find((l) => l.itemId === 'chukai')?.amount ?? null)
  const rentId = useId()
  const amountId = useId()

  const estimate: Estimate = {
    rent,
    commonFee: null,
    moveInDate: null,
    statedTotal: null,
    lines: [{ id: 'l1', itemId: 'chukai', label: '', amount }],
  }
  const f = inspectEstimate(estimate).findings[0]
  const attention = f.level === 'check' || f.level === 'alert'

  return (
    <div className="border border-rule-strong/70 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={rentId} className="mb-1.5 block text-[13px] font-bold">
            家賃（月額）
          </label>
          <AmountField id={rentId} value={rent} onChange={setRent} placeholder="例: 78,000" />
          <p className="mt-1 text-xs leading-5 text-ink-soft">管理費・共益費を、含めない額</p>
        </div>
        <div>
          <label htmlFor={amountId} className="mb-1.5 block text-[13px] font-bold">
            見積書の仲介手数料（税込）
          </label>
          <AmountField id={amountId} value={amount} onChange={setAmount} placeholder="例: 85,800" />
          <p className="mt-1 text-xs leading-5 text-ink-soft">空のままなら、上限の目安だけを出します</p>
        </div>
      </div>

      <div aria-live="polite" className="mt-4 border-t border-dashed border-rule-strong/60 pt-4">
        <p className={cn(attention ? 'font-pen text-[17px] text-pen' : f.level === 'note' ? 'font-pen text-[16px] text-pencil' : 'text-sm font-bold leading-7')}>{f.headline}</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-7">
          {f.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[0.85em] size-1 shrink-0 rounded-full bg-ink/60" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {f.caveat && <p className="mt-2 text-[13px] leading-6 text-ink-soft">※ {f.caveat}</p>}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-soft">はじめに入っている数字は、サンプルの見積書のものです。入れた数字は、どこにも送信されず、保存もされません。</p>
    </div>
  )
}
