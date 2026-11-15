import { formatDateJa } from '@/core/format'
import { items, listGuideItems, listItemsByCategory } from '@/core/items'
import { RULES_VERIFIED_ON, VERIFY_METHOD_NOTE } from '@/core/sources'
import { DISCLAIMER } from '@/core/texts'
import { CategoryMark } from '@/components/category-mark'
import { PageShell } from '@/components/site/page-shell'
import { Button } from '@/components/ui/button'
import { Link } from '@/router'

// 項目の一覧（/items）。この道具が知っている項目を、区分ごとに全部並べる（core の listItemsByCategory）。
// 解説ページのある項目は、その解説へのリンクにする。ない項目は、ひとことの説明と、見積書での書かれ方だけを出す。

/** 見積書での書かれ方は、多い項目で15個ほどある。一覧では、はじめのいくつかだけを出す。 */
const ALIAS_LIMIT = 5

export default function Items() {
  const groups = listItemsByCategory()
  const guideCount = listGuideItems().length
  return (
    <PageShell
      wide
      title="初期費用の項目の一覧"
      lead={`賃貸の初期費用の見積書に出てくる項目のうち、この道具が知っている${items.length}個を、「何を確かめる項目か」で分けて並べました。${guideCount}個の項目には、くわしい解説があります。`}
      crumbs={[{ label: 'トップ', to: '/' }, { label: '項目の解説' }]}
    >
      <div className="space-y-10">
        {groups.map(({ category, items: list }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`}>
            <div className="border-b-[1.5px] border-ink/70 pb-2">
              <h2 id={`cat-${category.id}`} className="flex items-center gap-2 text-lg font-bold leading-snug">
                <CategoryMark id={category.id} className="text-[14px]" />
                {category.label}
                <span className="text-xs font-normal text-ink-soft">{list.length}項目</span>
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-ink-soft">{category.short}</p>
            </div>
            <ul>
              {list.map((item) => {
                const more = item.aliases.length - ALIAS_LIMIT
                return (
                  <li key={item.id} className="grid gap-x-8 gap-y-1 border-b border-rule py-3.5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                    <h3 className="text-base font-bold leading-snug">
                      {item.guide ? (
                        <Link to={`/items/${item.guide.slug}`} className="inline-flex min-h-11 min-w-11 items-center underline decoration-ink/40 underline-offset-4 hover:decoration-ink md:min-h-0 md:min-w-0">
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </h3>
                    <div className="min-w-0 text-[15px] leading-[1.85]">
                      <p>{item.summary}</p>
                      {item.aliases.length > 0 && (
                        <p className="mt-0.5 text-[13px] leading-6 text-ink-soft">
                          見積書での書かれ方: {item.aliases.slice(0, ALIAS_LIMIT).join('、')}
                          {more > 0 && ' など'}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 space-y-4 border-t border-rule pt-6">
        <p className="text-[15px] leading-[1.85]">
          ここにない項目も、道具の画面では、見積書のとおりの名前で足せます。その行は、「何のお金か、確かめる」項目として扱います。
        </p>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/app">自分の見積書を点検する（無料）</Link>
        </Button>
        <p className="text-[13px] leading-6 text-ink-soft">
          {DISCLAIMER}
          <span className="block">ルールの最終確認日: {formatDateJa(RULES_VERIFIED_ON)}</span>
          {VERIFY_METHOD_NOTE && <span className="block">{VERIFY_METHOD_NOTE}</span>}
        </p>
      </div>
    </PageShell>
  )
}
