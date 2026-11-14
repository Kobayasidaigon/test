import { formatDateJa } from '@/core/format'
import { listGuideItems } from '@/core/items'
import { RULES_VERIFIED_ON } from '@/core/sources'
import { BrandMark } from '@/components/brand'
import { Link } from '@/router'
import { site } from '@/site.config'

// efferd の Minimal Footer（21st.dev）をもとにした、サイトのいちばん下。
//
// もとの部品から残したもの:
// - 左に印とひとことの説明、右にリンクの列、いちばん下に細い線と小さな文、という組み立て。
//
// 変えたもの:
// - 見本の会社の説明、SNS のアイコンの列、「All rights reserved」は取った（このサイトに SNS はない）。
// - ぼんやり光る背景（radial-gradient）と等幅の書体をやめ、机の上の濃い罫線だけにした。
// - リンクの列は、「道具と解説」「項目ごとの解説（データから作る）」「このサイト」の3つ。
// - いちばん下には、この道具の立て付け（法律の助言ではないこと）と、ルールの最終確認日を書く。

const linkClass = 'inline-flex min-h-11 items-center text-sm text-ink no-underline hover:underline hover:underline-offset-4 sm:min-h-8'

export function SiteFooter() {
  const guides = listGuideItems()
  return (
    <footer className="no-print mt-auto border-t-[1.5px] border-ink/70">
      <div className="mx-auto grid max-w-[76rem] gap-x-10 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <p className="flex items-center gap-2">
            <BrandMark />
            <span className="text-[17px] font-bold tracking-[0.04em]">{site.name}</span>
          </p>
          <p className="mt-3 max-w-[22em] text-sm leading-7 text-ink-soft">{site.tagline}ための、無料の道具です。</p>
          <p className="mt-4">
            <Link to="/app" className={linkClass + ' font-bold underline underline-offset-4'}>
              見積書を点検する
            </Link>
          </p>
        </div>

        <nav aria-label="項目ごとの解説">
          <p className="mb-1 text-xs text-ink-soft">項目ごとの解説</p>
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {guides.map((item) => (
              <li key={item.id}>
                <Link to={`/items/${item.guide.slug}`} className={linkClass}>
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/items" className={linkClass + ' underline underline-offset-4'}>
                項目の一覧
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="このサイト">
          <p className="mb-1 text-xs text-ink-soft">このサイト</p>
          <ul>
            <li>
              <Link to="/" className={linkClass}>
                トップ
              </Link>
            </li>
            <li>
              <Link to="/#konkyo" className={linkClass}>
                根拠にしている資料
              </Link>
            </li>
            <li>
              <Link to="/#faq" className={linkClass}>
                よくある質問
              </Link>
            </li>
            <li>
              <Link to="/about" className={linkClass}>
                このサイトについて
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

      <div className="border-t border-ink/15">
        <p className="mx-auto max-w-[76rem] px-4 py-4 text-xs leading-6 text-ink-soft sm:px-6">
          この道具は、見積書を自分で確かめるための補助です。法律の助言ではありません。
          <span className="whitespace-nowrap">　ルールの最終確認日: {formatDateJa(RULES_VERIFIED_ON)}</span>
        </p>
      </div>
    </footer>
  )
}
