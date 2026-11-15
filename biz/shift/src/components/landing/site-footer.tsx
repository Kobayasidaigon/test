// サイトの下のフッター。LP と、そのほかのページで使う。
//
// 21st.dev の「Minimal Footer」（efferd）をもとにしている。
// 借りたところ: 6列の格子で、左に印とひとこと、右にリンクの列を2つ置く組み立てと、下に細い線をはさんで1行を置く形。
// 変えたところ: SNS の絵のリンク（このサービスには SNS がない）と、光のグラデーションをやめた。
//   紺の地に、地の色の文字。リンクは、このサイトに本当にあるページだけ。下の1行は、法令についての断り書きにした。
import { Link } from '@/router'
import { site } from '@/site.config'
import { LogoMark } from '@/components/logo'
import { LP_LINKS } from './site-header'

export function SiteFooter({ landing = false }: { landing?: boolean }) {
  const linkClass = 'inline-flex min-h-11 w-max min-w-11 items-center text-[14.5px] font-medium text-paper underline-offset-4 hover:underline md:min-h-8'
  return (
    <footer className="lp-dark no-print border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-[1360px] grid-cols-6 gap-x-6 gap-y-8 px-4 py-10 md:px-6 md:py-14">
        <div className="col-span-6 flex flex-col gap-4 md:col-span-3">
          <Link to="/" className="flex min-h-11 w-max items-center gap-2.5 rounded-md" aria-label={`${site.name}のトップページ`}>
            {/* 紺の地の上では、印の輪郭線が見えなくなるので、地の色の板にのせる */}
            <span className="grid size-10 place-items-center rounded-lg bg-paper">
              <LogoMark className="size-7" />
            </span>
            <span className="font-display text-xl font-extrabold">{site.name}</span>
          </Link>
          <p className="max-w-[26em] text-[14.5px] leading-[1.85] text-paper/85">{site.tagline}。登録はいりません。入れた内容は、お使いのブラウザの中だけに保存されます。</p>
        </div>

        <nav aria-label="このページの見出し" className="col-span-6 sm:col-span-2 md:col-span-1 md:col-start-4">
          <p className="mb-1 text-xs font-bold text-paper/70">このサイト</p>
          <ul className="flex flex-col">
            {LP_LINKS.filter((l) => l.id !== 'limits' && l.id !== 'reasons').map((l) => (
              <li key={l.id}>
                {landing ? (
                  <a href={`#${l.id}`} className={linkClass}>
                    {l.label}
                  </a>
                ) : (
                  <Link to={`/#${l.id}`} className={linkClass}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <Link to="/app" className={linkClass}>
                道具を開く
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="きまりごとのページ" className="col-span-6 sm:col-span-4 md:col-span-2">
          <p className="mb-1 text-xs font-bold text-paper/70">きまりごと</p>
          <ul className="flex flex-col">
            <li>
              <Link to="/tokushoho" className={linkClass}>
                特定商取引法にもとづく表記
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>
                プライバシーポリシー
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-paper/25">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-5 text-[12.5px] leading-relaxed text-paper/80 md:flex-row md:items-start md:justify-between md:gap-8 md:px-6">
          <p className="max-w-[46em]">この道具は、決めた条件に合っているかを点検するだけです。労働基準法などの法令に合っていることを保証するものではありません。</p>
          <p className="shrink-0">© {site.operator.name || site.name}</p>
        </div>
      </div>
    </footer>
  )
}
