// 「どういう道具か」。今のやり方（希望休は紙や LINE、表は印刷して貼る）は変えず、まん中の「組む」だけを肩代わりする、と伝える。
// 絵は、自分で描いた SVG と、勤務のブロック（.blk）。写真や、にせの画面は使っていない。
import { ArrowDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LpHeading, LpSection, Ph } from './section'

const INK = 'var(--ink)'

/** 希望休のメモと、メッセージの吹き出し（中の名前と日付は、美容室のサンプルの希望休と同じ） */
function MemoArt() {
  return (
    <svg viewBox="0 0 220 132" className="h-auto w-full" role="img" aria-label="希望休を書いたメモと、メッセージの吹き出しの絵">
      <rect x="14" y="10" width="112" height="112" rx="7" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M14 34h112" stroke={INK} strokeWidth="2.5" />
      <rect x="15.25" y="11.25" width="109.5" height="21.5" rx="5.5" fill="var(--shift-egg)" />
      <text x="70" y="27" textAnchor="middle" fontSize="12" fontWeight="800" fill={INK}>
        12月の希望休
      </text>
      {[
        ['青木', '12日'],
        ['石川', '3日・4日'],
        ['上田', '18〜20日'],
      ].map(([name, days], i) => (
        <g key={name} transform={`translate(0 ${54 + i * 22})`}>
          <text x="26" y="0" fontSize="11.5" fontWeight="700" fill={INK}>
            {name}
          </text>
          <text x="60" y="0" fontSize="11.5" fontWeight="500" fill={INK}>
            {days}
          </text>
          <path d="M24 6h92" stroke="var(--line)" strokeWidth="1.5" />
        </g>
      ))}
      {/* 吹き出し */}
      <path d="M140 38h62a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8h-34l-12 12v-12h-16a8 8 0 0 1-8-8V46a8 8 0 0 1 8-8z" fill="var(--shift-leaf)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="171" y="56" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
        13日、
      </text>
      <text x="171" y="71" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
        休みたいです
      </text>
    </svg>
  )
}

/** はまっていくブロック。本物のシフト表と同じブロック（.blk）を並べた */
function BlocksArt() {
  // 1行が1人、1列が1日。'' は休み
  const rows = [
    ['egg', 'egg', '', 'sky', 'sky', 'egg', ''],
    ['sky', '', 'egg', 'egg', '', 'sky', 'sky'],
    ['', 'sky', 'sky', '', 'egg', 'egg', 'egg'],
    ['egg', 'egg', '', 'sky', 'sky', '', 'sky'],
  ]
  const symbol = { egg: '早', sky: '遅' } as const
  return (
    <div role="img" aria-label="勤務のブロックが、表のマスにはまっている絵" className="mx-auto grid w-fit grid-cols-7 gap-1 rounded-lg border-2 border-ink bg-card p-2 shadow-hard-sm">
      {rows.flat().map((c, i) =>
        c ? (
          <span key={i} className="blk" data-color={c}>
            {symbol[c as 'egg' | 'sky']}
          </span>
        ) : (
          <span key={i} className="size-7 rounded-[5px] border-[1.5px] border-dashed border-ink/25" />
        ),
      )}
    </div>
  )
}

/** 貼り出したシフト表 */
function PrintArt() {
  const colors = ['var(--shift-egg)', 'var(--shift-sky)']
  return (
    <svg viewBox="0 0 220 132" className="h-auto w-full" role="img" aria-label="壁に貼った、印刷したシフト表の絵">
      <rect x="28" y="22" width="164" height="100" rx="4" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="40" y="33" width="66" height="7" rx="2" fill={INK} />
      {/* 表の線 */}
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <path key={r} d={`M40 ${50 + r * 11}h140`} stroke="var(--line)" strokeWidth="1.5" />
      ))}
      <path d="M66 50v55" stroke={INK} strokeWidth="1.5" />
      {/* マスの中のブロック */}
      {[0, 1, 2, 3, 4].flatMap((r) =>
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => {
          // 見た目だけの並び（ところどころ休み）
          const k = (r * 7 + c * 3) % 5
          if (k === 0) return null
          return <rect key={`${r}-${c}`} x={70 + c * 11} y={52.5 + r * 11} width="8" height="6.5" rx="1.5" fill={colors[(r + c) % 2]} stroke={INK} strokeWidth="1" />
        }),
      )}
      {[0, 1, 2, 3, 4].map((r) => (
        <rect key={r} x="42" y={53.5 + r * 11} width="18" height="4.5" rx="1.5" fill="var(--ink-soft)" />
      ))}
      {/* 画びょう */}
      <circle cx="110" cy="22" r="8" fill="var(--shift-tomato)" stroke={INK} strokeWidth="2.5" />
      <circle cx="107.5" cy="19.5" r="2" fill="#fff" />
    </svg>
  )
}

const STAGES = [
  {
    tag: '今のまま',
    title: '希望休を集める',
    body: '紙に書いてもらう。LINE で送ってもらう。集め方は、変えなくてかまいません。',
    art: <MemoArt />,
    main: false,
  },
  {
    tag: 'ここだけ、この道具',
    title: '表を組む',
    body: '集めた希望休と、曜日ごとに必要な人数を入れて、ボタンを押します。条件を守った、たたき台ができます。',
    art: <BlocksArt />,
    main: true,
  },
  {
    tag: '今のまま',
    title: 'みんなに知らせる',
    body: 'A4 に印刷して、いつもの場所に貼ります。スタッフに、アプリを入れてもらう必要はありません。',
    art: <PrintArt />,
    main: false,
  },
]

export function About() {
  return (
    <LpSection id="about" tone="white">
      <LpHeading
        id="about"
        kicker="どういう道具か"
        color="tomato"
        title={
          <>
            <Ph>変えるのは、</Ph>
            <Ph>「組む」ところだけ。</Ph>
          </>
        }
        lead="シフト管理のサービスではありません。スタッフ用のアプリも、会員登録も、月額の料金もありません。毎月の「組む」作業だけを、肩代わりする道具です。"
      />

      <ol className="mt-10 grid items-stretch gap-3 md:mt-14 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr] lg:gap-4">
        {STAGES.map((s, i) => (
          <li key={s.title} className="contents">
            {i > 0 ? (
              <span aria-hidden className="grid place-items-center text-ink">
                <ArrowRight className="hidden size-7 lg:block" strokeWidth={3} />
                <ArrowDown className="size-6 lg:hidden" strokeWidth={3} />
              </span>
            ) : null}
            <div className={cn('flex flex-col rounded-xl border-2 border-ink p-5 md:p-6', s.main ? 'bg-shift-egg shadow-hard-lg' : 'bg-paper')}>
              <p className={cn('w-fit rounded-md border-2 border-ink px-2 py-0.5 text-[12.5px] font-extrabold leading-snug', s.main ? 'bg-ink text-paper' : 'bg-card text-ink')}>{s.tag}</p>
              <div className="mx-auto mt-4 flex min-h-[9.5rem] w-full max-w-[17rem] items-center">{s.art}</div>
              {/* 番号は付けない（すぐ下の「使い方の3ステップ」の番号と、まぎれないように） */}
              <h3 className="mt-4 text-[1.25rem] md:text-[1.4rem]">{s.title}</h3>
              <p className={cn('mt-2 text-[15px] leading-[1.85]', s.main ? 'text-ink' : 'text-ink-soft')}>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </LpSection>
  )
}
