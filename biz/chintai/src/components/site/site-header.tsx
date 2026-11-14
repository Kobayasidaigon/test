import { useEffect, useId, useRef, useState } from 'react'
import { MenuIcon, XIcon } from 'lucide-react'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Link } from '@/router'

// olewandowski1 の Centered Nav Header（21st.dev）をもとにした、サイトの上の帯。
//
// もとの部品から残したもの:
// - 左に印、真ん中にページの中の行き先、右にいちばん大事なボタン、という3つの並び。
// - せまい画面では、行き先をメニューのボタンの中にしまうこと。
//
// 変えたもの:
// - 見本の「Sign In」と区切り線は取った（会員登録がない）。右のボタンは、道具を開く「見積書を点検する」の1つだけ。
// - せまい画面のメニューを、横から出る別の画面（Radix の Sheet）ではなく、帯のすぐ下に開く紙にした。
//   ページの中の行き先（#faq など）を押したときに、ふつうのリンクとして動かしたいため
//   （別の画面を重ねると、うしろのページが動かせなくなり、閉じたあとでフォーカスが上へ戻ってしまう）。
// - 帯は、机の色のベタ。すりガラスにはしない。ページを動かしても、上に残る（道具を開くボタンを、いつも押せるように）。
//
// 描くときに window などにさわらないので、静的HTMLの書き出し（ssr: true）でも使える。

/** ページの中の行き先（hash。同じページの id）か、ほかのページ（to）。 */
export type NavItem = { label: string; hash: string } | { label: string; to: string }

function NavAnchor({ item, className, onClick }: { item: NavItem; className?: string; onClick?: () => void }) {
  if ('hash' in item) {
    return (
      <a href={`#${item.hash}`} className={className} onClick={onClick}>
        {item.label}
      </a>
    )
  }
  return (
    <Link to={item.to} className={className} onClick={onClick}>
      {item.label}
    </Link>
  )
}

export function SiteHeader({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // 開いているあいだだけ、Esc と、帯の外を押したときに閉じる。
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    const onPointer = (e: PointerEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header ref={root} className="no-print sticky top-0 z-40 border-b border-ink/15 bg-desk">
      <div className="mx-auto flex h-14 max-w-[76rem] items-center gap-2 px-3 sm:h-16 sm:px-6">
        <Brand className="shrink-0" />

        <nav aria-label="ページの中の行き先" className="mx-auto hidden items-center lg:flex">
          {items.map((item) => (
            <NavAnchor
              key={item.label}
              item={item}
              className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm text-ink-soft no-underline transition-colors hover:text-ink"
            />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <Button asChild size="sm">
            <Link to="/app">見積書を点検する</Link>
          </Button>
          <Button
            ref={toggle}
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <XIcon aria-hidden className="size-5" /> : <MenuIcon aria-hidden className="size-5" />}
          </Button>
        </div>
      </div>

      {/* せまい画面のメニュー。帯のすぐ下に、1枚の紙として開く。 */}
      <nav
        id={menuId}
        aria-label="メニュー"
        hidden={!open}
        className={cn('absolute inset-x-0 top-full border-t border-ink/15 bg-paper shadow-lift lg:hidden')}
      >
        <ul className="mx-auto max-w-[76rem] px-3 py-1 sm:px-6">
          {items.map((item) => (
            <li key={item.label} className="border-b border-rule last:border-b-0">
              <NavAnchor item={item} className="flex min-h-12 items-center px-1 text-[15px] text-ink no-underline" onClick={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
