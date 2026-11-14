import { formatDateJa } from '@/core/format'
import { items } from '@/core/items'
import { listSources, RULES_VERIFIED_ON, sourceKindLabel, type Source, type SourceKind } from '@/core/sources'
import { Sheet, SheetTitle } from '@/components/sheet'

// 根拠にしている資料の一覧。core の sources.ts にある出典を、種類ごとに全部出す。
// あわせて、「決まりが見つからなかった項目」と「確かめられなかったこと」も、項目のデータから出す
// （都合のよいことだけを見せないため）。

const KIND_ORDER: SourceKind[] = ['law', 'notice', 'guideline', 'gov-page', 'consumer-center', 'public-corp']

function SourceRow({ s }: { s: Source }) {
  return (
    <li className="grid gap-x-6 gap-y-0.5 border-b border-rule py-2.5 text-sm leading-6 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
      <div className="min-w-0">
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words text-ink underline decoration-ink/35 underline-offset-[3px] hover:decoration-ink">
          {s.title}
        </a>
        {/* 版と、文書の中の場所。せまい画面では、一覧が長くなりすぎるので出さない（リンク先で確かめられる）。 */}
        {(s.edition || s.place) && (
          <p className="hidden text-[13px] leading-6 text-ink-soft md:block">
            {s.edition}
            {s.edition && s.place && '　'}
            {s.place}
          </p>
        )}
      </div>
      <p className="text-[13px] leading-6 text-ink-soft">
        {s.publisher}
        <span className="whitespace-nowrap md:block">
          <span className="md:hidden">　</span>
          {formatDateJa(s.verifiedOn)}に確認
        </span>
      </p>
    </li>
  )
}

export function Sources() {
  const all = listSources()
  const groups = KIND_ORDER.map((kind) => ({ kind, list: all.filter((s) => s.kind === kind) })).filter((g) => g.list.length > 0)
  const noRule = items.filter((i) => i.basisStatus === 'none-found')
  const limits = items.flatMap((i) => i.limits.map((text) => ({ name: i.name, text })))

  return (
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Sheet aria-label="資料の一覧">
        <SheetTitle as="h3" title="資料の一覧" eyebrow={`全${all.length}件`} right={`ルールの最終確認日　${formatDateJa(RULES_VERIFIED_ON)}`} />
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.kind} aria-label={sourceKindLabel[g.kind]}>
              <h4 className="border-b-[1.5px] border-ink/70 pb-1.5 text-[15px] font-bold leading-snug">
                {sourceKindLabel[g.kind]}
                <span className="ml-2 text-xs font-normal text-ink-soft">{g.list.length}件</span>
              </h4>
              <ul>
                {g.list.map((s) => (
                  <SourceRow key={s.id} s={s} />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-6 text-ink-soft">リンクは、それぞれの公式のサイトを、別のタブで開きます。</p>
      </Sheet>

      <div className="space-y-8 text-[15px] leading-[1.85]">
        <div>
          <h3 className="border-b-[1.5px] border-ink/70 pb-1.5 text-base font-bold">根拠にしないもの</h3>
          <p className="mt-3">まとめサイトや、不動産会社の記事は、根拠にしていません。信頼できる公的な相場のデータを確かめられていないので、金額の高い安いも判定しません。</p>
        </div>
        <div>
          <h3 className="border-b-[1.5px] border-ink/70 pb-1.5 text-base font-bold">決まりが見つからなかった項目</h3>
          <p className="mt-3">
            次の{noRule.length}個の項目は、もとにできる国の決まりや資料を、見つけられませんでした。道具は、「この項目についての、国の決まりや資料は、見つかりませんでした」と、そのまま伝えます。
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{noRule.map((i) => i.name).join('、')}</p>
        </div>
        {limits.length > 0 && (
          <div>
            <h3 className="border-b-[1.5px] border-ink/70 pb-1.5 text-base font-bold">この道具が、確かめられなかったこと</h3>
            <ul className="mt-3 space-y-3 text-sm leading-7">
              {limits.map((l, i) => (
                <li key={i}>
                  <span className="font-bold">{l.name}</span>
                  <span className="block text-ink-soft">{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
