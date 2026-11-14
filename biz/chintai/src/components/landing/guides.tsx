import { getCategory } from '@/core/categories'
import { listGuideItems } from '@/core/items'
import { CategoryMark } from '@/components/category-mark'
import { Link } from '@/router'

// 項目ごとの解説への入口。解説ページのある項目（core の listGuideItems）を、全部並べる。
// 箱を並べるのではなく、書類の「目次」のように、罫線で区切った行にする。

export function Guides() {
  const guides = listGuideItems()
  return (
    <div>
      <ul className="grid gap-x-12 border-t-[1.5px] border-ink/70 md:grid-cols-2">
        {guides.map((item, i) => {
          // 解説ページの題は「項目の名前 — 何を確かめるか」の形。入口では、後ろの半分を、ひとことの説明として使う。
          const [, point] = item.guide.title.split(' — ')
          return (
            <li key={item.id} className="border-b border-ink/20">
              <Link to={`/items/${item.guide.slug}`} className="group flex min-h-[4.5rem] items-center gap-3 py-3 no-underline">
                <CategoryMark id={item.category} variant={i} className="text-[14px]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-snug underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-ink">{item.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-6 text-ink-soft">
                    {point ?? item.summary}
                    <span className="sr-only">（区分: {getCategory(item.category).label}）</span>
                  </span>
                </span>
                <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
                  <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-6 text-sm">
        <Link to="/items" className="inline-flex min-h-11 items-center underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
          この道具が知っている項目を、全部見る
        </Link>
      </p>
    </div>
  )
}
