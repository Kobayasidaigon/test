import { DISCLAIMER } from '@/core'
import { Link } from '@/router'
import { site } from '@/site.config'
import { LogoMark } from '@/components/ui/seal'
import { Container, LedgerRule } from './Section'

// サイトのいちばん下（LP と、そのほかのページで共通）。
// 21st.dev の Minimal Two-Column Footer（ln-dev7）をもとにした。
// もとのまま使っているところ: 左にしるしと、ひとことの説明、右に縦に並べた案内、いちばん下に細い線と小さな文、という割りつけ。
// 変えたところ: 見本のロゴ・文・地名は外した。年の数字は出さない（静的HTMLを作った年と、見ている年が食いちがうため）。
// ことわり書き（道具は補助であること）を、ここにも短く出す。

const LINKS = [
  { to: '/app', label: '帳簿をつける（無料で始める）' },
  { to: '/#pricing', label: '料金' },
  { to: '/#faq', label: 'よくある質問' },
  { to: '/tokushoho', label: '特定商取引法にもとづく表記' },
  { to: '/privacy', label: 'プライバシーポリシー' },
]

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto bg-kinari-deep/60">
      <LedgerRule />
      <Container className="py-10 sm:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[30em]">
            <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-1">
              <LogoMark />
              <span className="font-serif text-xl font-bold tracking-wide">{site.name}</span>
            </Link>
            <p className="mt-2 text-[0.94rem] leading-[1.8]">{site.tagline}</p>
          </div>

          <nav aria-label="サイトの案内">
            <ul className="grid gap-x-8 sm:grid-cols-2 md:grid-cols-1">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="inline-flex min-h-11 min-w-11 items-center text-[0.94rem] underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-rule/40 pt-5 text-[0.84rem] leading-[1.8] text-muted-foreground">
          <p>{DISCLAIMER}</p>
          {site.operator.name && <p className="mt-1">運営: {site.operator.name}</p>}
        </div>
      </Container>
    </footer>
  )
}
