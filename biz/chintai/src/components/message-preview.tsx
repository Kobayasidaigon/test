import type { ReactNode } from 'react'
import type { BuiltMessage } from '@/core/message'
import { cn } from '@/lib/utils'

// 確認の文面の見た目。便せんのように、うすい罫線の上に文を置く。
// 道具の手順3と、LP の「確認の文面の見本」で、同じ部品を使う（どちらも、本物の出力を渡す）。

export function MessagePreview({
  message,
  subjectAction,
  className,
}: {
  message: BuiltMessage
  /** 件名の右に置くもの（コピーのボタン）。 */
  subjectAction?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('border border-rule-strong/70 bg-paper', className)}>
      {message.subject !== null && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-rule-strong/70 px-4 py-2">
          <p className="min-w-0 text-sm leading-7 wrap-anywhere">
            <span className="mr-2 text-xs text-ink-soft">件名</span>
            <span className="font-bold">{message.subject}</span>
          </p>
          {subjectAction}
        </div>
      )}
      {/* 行の高さ（1.9em）に合わせて、便せんの罫線を引く。 */}
      <p
        className="whitespace-pre-wrap wrap-anywhere px-4 py-3 text-[15px]"
        style={{
          lineHeight: '1.9em',
          backgroundImage: 'linear-gradient(to bottom, transparent calc(1.9em - 1px), var(--rule) calc(1.9em - 1px))',
          backgroundSize: '100% 1.9em',
          backgroundPosition: '0 0.75rem',
          backgroundOrigin: 'border-box',
        }}
      >
        {message.body}
      </p>
    </div>
  )
}
