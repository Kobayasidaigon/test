import { Link } from '@/router'
import { site } from '@/site.config'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/ui/seal'
import { Container, LedgerRule } from './Section'

// サイトの見出し（LP と、そのほかのページで共通）。
// 21st.dev の Centered Nav Header（olewandowski1）をもとにした。
// もとのまま使っているところ: 左にしるし、まん中にページ内の案内、右にだいじなボタン、という3つの並び。
// 変えたところ: スマホで開くメニュー（Sheet）をやめた。押さないと中身が見えないメニューは、
// パソコンに慣れていない人が気づきにくいので、案内は、見出しの下にいつも並べておく。
// 見本の「Sign In」と、4つの四角のロゴは外した（登録もログインもないサービスのため）。

const NAV = [
  { to: '/#documents', label: '資料の見本', short: '資料' },
  { to: '/#handover', label: '引き継ぎ', short: '引き継ぎ' },
  { to: '/#fit', label: '向いている団体', short: '向き不向き' },
  { to: '/#pricing', label: '料金', short: '料金' },
  { to: '/#faq', label: 'よくある質問', short: '質問' },
]

export function SiteHeader() {
  return (
    <header className="no-print">
      {/* 幅 320px の画面でも、しるしとボタンが1行に収まるように、せまい画面では字と間を少し詰める */}
      <Container className="flex min-h-[4.5rem] items-center gap-x-2.5 py-2 sm:gap-x-6">
        <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg pr-1 min-[360px]:gap-2.5" aria-label={`${site.name} のトップページへ`}>
          <LogoMark className="max-[359px]:size-7" />
          <span className="font-serif text-[1.1rem] font-bold tracking-wide min-[360px]:text-[1.3rem]">{site.name}</span>
        </Link>

        <nav aria-label="ページの案内" className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex min-h-11 items-center rounded-lg px-3.5 text-[0.94rem] font-bold text-foreground/85 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto shrink-0">
          <Button asChild size="sm" className="max-[359px]:px-3">
            <Link to="/app">無料で始める</Link>
          </Button>
        </div>
      </Container>

      {/* スマホとタブレット: 案内を、見出しの下に並べる */}
      <nav aria-label="ページの案内" className="border-t border-border lg:hidden">
        <Container className="flex flex-wrap items-center justify-center gap-x-0.5 px-2 sm:px-6">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-[0.92rem] font-bold text-foreground/85 hover:bg-muted">
              <span className="sm:hidden">{item.short}</span>
              <span className="max-sm:hidden">{item.label}</span>
            </Link>
          ))}
        </Container>
      </nav>
      <LedgerRule />
    </header>
  )
}
