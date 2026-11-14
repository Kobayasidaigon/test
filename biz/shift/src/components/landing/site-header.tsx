// サイトの上のナビ。LP と、そのほかのページ（特商法、プライバシー）で使う。
//
// 21st.dev の「Header 1」（efferd）をもとにしている。
// 借りたところ: 上に固定して、スクロールしたら下の線が出る作り（useScroll）、せまい画面では「開く・閉じる」のボタンで
//   メニューを出す組み立て、線が×に変わる MenuToggleIcon、aria-expanded / aria-controls の付け方。
// 変えたところ: すりガラス（backdrop-blur）をやめて、地の色と紺の線にした。メニューは body に別枠で出す形をやめ、
//   ナビのすぐ下に出る箱にした（静的HTMLに書き出すページなので、document に触らない）。Esc とリンクを押したときに閉じる。
//   見本の印（ロゴ）と英語のリンクは消し、このサービスの印とページ内の見出しへのリンクに入れかえた。
import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import { Link } from '@/router'
import { site } from '@/site.config'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

/** LP の中の見出し。id は Landing.tsx の各セクションと同じにすること */
export const LP_LINKS = [
  { id: 'how', label: '使い方' },
  { id: 'reasons', label: '組めないとき' },
  { id: 'limits', label: 'できないこと' },
  { id: 'pricing', label: '料金' },
  { id: 'faq', label: 'よくある質問' },
] as const

/** スクロールした量が threshold をこえたか（21st の useScroll） */
function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false)
  const onScroll = useCallback(() => setScrolled(window.scrollY > threshold), [threshold])
  useEffect(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])
  return scrolled
}

/** 三本線と×を行き来する絵（21st の MenuToggleIcon） */
function MenuToggleIcon({ open, className, ...props }: ComponentProps<'svg'> & { open: boolean }) {
  return (
    <svg
      strokeWidth={2.75}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 32 32"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('transition-transform duration-300 ease-in-out', open && '-rotate-45', className)}
      {...props}
    >
      <path
        className={cn('transition-all duration-300 ease-in-out', open ? '[stroke-dasharray:20_300] [stroke-dashoffset:-32.42px]' : '[stroke-dasharray:12_63]')}
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
      />
      <path d="M7 16 27 16" />
    </svg>
  )
}

/**
 * @param landing LP の上で使うときは true（ページ内のリンクになる）。ほかのページでは、LP の見出しへ飛ぶリンクになる
 */
export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const [open, setOpen] = useState(false)
  const scrolled = useScroll(8)

  // Esc で閉じる
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = 'inline-flex min-h-11 items-center rounded-md px-3 text-[14.5px] font-bold text-ink underline-offset-[6px] decoration-2 hover:underline hover:decoration-shift-tomato'
  const item = (l: (typeof LP_LINKS)[number], className: string) =>
    landing ? (
      <a key={l.id} href={`#${l.id}`} className={className} onClick={() => setOpen(false)}>
        {l.label}
      </a>
    ) : (
      <Link key={l.id} to={`/#${l.id}`} className={className} onClick={() => setOpen(false)}>
        {l.label}
      </Link>
    )

  return (
    <header className={cn('no-print sticky top-0 z-40 w-full border-b-2 bg-paper transition-colors duration-150', scrolled || open ? 'border-ink' : 'border-transparent')}>
      <nav aria-label="このサイトのページ" className="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-2 px-4 md:px-6">
        <Link to="/" aria-label={`${site.name}のトップページ`} className="mr-auto flex min-h-11 items-center rounded-md lg:mr-6">
          <Logo className="text-[1.1rem] md:text-[1.2rem]" />
        </Link>
        <div className="hidden items-center lg:flex lg:flex-1">{LP_LINKS.map((l) => item(l, linkClass))}</div>
        {/* とてもせまい画面（幅 360px 未満）では、ここに入りきらないので、メニューの中に出す */}
        <Button asChild size="sm" className="shrink-0 max-[359px]:hidden">
          <Link to="/app">道具を開く</Link>
        </Button>
        <Button size="icon" variant="outline" className="shrink-0 lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}>
          <MenuToggleIcon open={open} className="!size-6" />
        </Button>
      </nav>

      {/* せまい画面のメニュー。ナビのすぐ下に出す */}
      <div id="site-menu" hidden={!open} className="absolute inset-x-0 top-full border-b-2 border-ink bg-paper shadow-[0_6px_0_0_rgb(27_36_82/0.12)] lg:hidden">
        <div className="mx-auto grid max-w-[1360px] gap-1 px-4 pb-4 pt-2">
          {LP_LINKS.map((l) => item(l, 'flex min-h-12 items-center rounded-md border-b border-line px-2 text-base font-bold'))}
          <Button asChild className="mt-3 w-full">
            <Link to="/app">道具を開く（無料）</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
