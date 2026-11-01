// 案C「街カード」— 小さな部品（確からしさの札、出典の開け閉め、ボタン）
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import type { Confidence, Source } from '@/shared'
import { cn } from '@/lib/utils'
import { CONF_HELP } from './lib'

const CONF_CLASS: Record<Confidence, string> = { 確認済: 'is-ok', 推定: 'is-est', 仮置き: 'is-tmp' }

/** 数字の確からしさ（確認済／推定／仮置き） */
export function Conf({ c, tiny, className }: { c: Confidence; tiny?: boolean; className?: string }) {
  return (
    <span className={cn('vc-conf', CONF_CLASS[c], tiny && 'is-tiny', className)} title={CONF_HELP[c]}>
      <span className="vc-conf-dot" aria-hidden />
      {c}
    </span>
  )
}

/** 計算の中身と出典（タップで開く） */
export function Sources({ sources, detail, label = '計算の中身と出典' }: { sources: Source[]; detail?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const id = useId()
  return (
    <div className="vc-src">
      <button type="button" className="vc-src-btn" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        <span>{label}{sources.length ? `（出典 ${sources.length}件）` : ''}</span>
        <ChevronDown className={cn('vc-src-chev', open && 'is-open')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="vc-src-body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22 }}
          >
            <div className="vc-src-inner">
              {detail && <p className="vc-src-detail">{detail}</p>}
              {sources.length ? (
                <ul>
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.label}
                        <ExternalLink aria-hidden className="vc-src-ext" />
                        <span className="sr-only">（新しいタブで開く）</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="vc-src-none">出典はまだありません。推定の値として見てください。</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'paper' | 'shu' | 'ink' | 'ghost'; size?: 'md' | 'lg'; icon?: ReactNode }
/** カードの枠と同じ「二重の縁」を持つボタン */
export function Btn({ tone = 'paper', size = 'md', icon, className, children, type = 'button', ...rest }: BtnProps) {
  return (
    <button type={type} className={cn('vc-btn', `vc-btn--${tone}`, size === 'lg' && 'vc-btn--lg', className)} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  )
}
