// 「できないこと」。やらないことを先に書いて、合わない店が時間をむだにしないようにする。
//
// 21st.dev の「Comparison Section」（mohammadshehadeh / Hirael、MIT）をもとにしている。
// 借りたところ: 2枚の板を1つの枠の中にとなり合わせ、片方は「−」、もう片方は「✓」の印で並べる組み立てと、
//   下に3つの短い事実を1行で置く形（outcome strip）。
// 変えたところ: 「前と後」の比べ方をやめて、「できないこと／できること」にした。打ち消し線は使わない（読みにくいため）。
//   できないことには、1つずつ説明の文を足した。等幅の英語の小見出しと、見本の文・数字は消した。
// Comparison 3 from Hirael <https://hirael.com/blocks/comparison/comparison-03>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael
import { Check, Minus } from 'lucide-react'
import { site } from '@/site.config'
import { LpHeading, LpSection, Ph } from './section'

const CANNOT = [
  {
    title: 'スタッフ用のアプリは、ありません',
    body: 'スタッフがスマホから希望休を出したり、できた表を見たりする仕組みはありません。希望休は今までどおり集めて、表は印刷して貼ってください。',
  },
  {
    title: '勤怠の打刻や、給与の計算は、ありません',
    body: '出勤・退勤の記録も、時給の計算もしません。表の右に出る勤務時間の合計は、予定の時間です。',
  },
  {
    title: '法令に合っていることの保証は、しません',
    body: '点検するのは、あなたが決めた条件（連勤の上限など）に合っているかだけです。労働基準法などに合っているかは、ご自身で確かめてください。',
  },
  {
    title: '保育・介護の配置基準は、入っていません',
    body: '業種ごとの基準や、法律の数字は内蔵していません。「この勤務に、この役割の人が何人以上」という決まりは、自分で入れられます。',
  },
]

const ALSO = [
  '覚えておけるのは、1つの店の1か月ぶんです。前の月の表は、ファイルに保存して残します。',
  '勤務の時間の重なりは見ません。「1日」の人を、「午前」の人数には数えません。',
  '2台のパソコンで、同時に同じ表を直すことはできません。ファイルを受けわたして使います。',
]

export function Limits() {
  const { free, pro } = site.plans
  // 「できること」は、料金の表と同じ文（site.plans）から出す。無料版でできることと、買い切り版で増えること
  const can = [...free.features.filter((f) => !f.startsWith('スタッフ')), 'Excel にまとめた希望休の貼り付け']
  const more = pro.features.filter((f) => !f.startsWith('無料版'))

  return (
    <LpSection id="limits">
      <LpHeading
        id="limits"
        kicker="できないこと"
        color="gray"
        title={
          <>
            <Ph>できないことも、</Ph>
            <Ph>先に書いておきます。</Ph>
          </>
        }
        lead="この道具がやるのは、シフト表のたたき台づくりだけです。次のことが要る店には、合いません。"
      />

      <div className="mt-10 grid overflow-hidden rounded-xl border-2 border-ink md:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="bg-well p-5 md:p-8">
          <h3 className="flex items-center gap-2 text-[1.15rem]">
            <span aria-hidden className="grid size-7 place-items-center rounded-md border-2 border-ink bg-card">
              <Minus className="size-4" strokeWidth={3.5} />
            </span>
            できないこと
          </h3>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
            {CANNOT.map((c) => (
              <li key={c.title} className="border-t-2 border-ink/20 pt-3">
                <p className="font-display text-[1.02rem] font-extrabold leading-snug">{c.title}</p>
                <p className="mt-1.5 text-[14.5px] leading-[1.85] text-ink-soft">{c.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[13.5px] font-bold">ほかにも、知っておいてほしいこと</p>
          <ul className="mt-2 grid gap-1.5">
            {ALSO.map((t) => (
              <li key={t} className="flex gap-2 text-[14px] leading-[1.8] text-ink-soft">
                <Minus aria-hidden className="mt-1.5 size-3.5 shrink-0" strokeWidth={3} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t-2 border-ink bg-card p-5 md:p-8 lg:border-l-2 lg:border-t-0">
          <h3 className="flex items-center gap-2 text-[1.15rem]">
            <span aria-hidden className="grid size-7 place-items-center rounded-md border-2 border-ink bg-shift-egg">
              <Check className="size-4" strokeWidth={3.5} />
            </span>
            できること
          </h3>
          <ul className="mt-5 grid gap-2.5">
            {can.map((t) => (
              <li key={t} className="flex gap-2.5 text-[15px] font-bold leading-[1.7]">
                <Check aria-hidden className="mt-1 size-4 shrink-0" strokeWidth={3.5} />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t-2 border-ink/15 pt-4 text-[13.5px] font-bold text-ink-soft">{pro.name}版（{pro.price}）で増えること</p>
          <ul className="mt-2 grid gap-2">
            {more.map((t) => (
              <li key={t} className="flex gap-2.5 text-[14.5px] leading-[1.75]">
                <Check aria-hidden className="mt-1 size-4 shrink-0" strokeWidth={3.5} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3つの短い事実 */}
      <dl className="mt-8 flex flex-wrap gap-3">
        {[
          ['会員登録', 'なし'],
          ['月額の料金', 'なし'],
          ['入れた内容の送信', 'なし'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-2.5 rounded-lg border-2 border-ink bg-card py-1.5 pl-3.5 pr-2 shadow-hard-sm">
            <dt className="text-[14.5px] font-bold">{label}</dt>
            <dd className="rounded-md bg-ink px-2 py-0.5 font-display text-[14.5px] font-extrabold text-paper">{value}</dd>
          </div>
        ))}
      </dl>
    </LpSection>
  )
}
