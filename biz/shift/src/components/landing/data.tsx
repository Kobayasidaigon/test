// 「データの扱い」。入れた内容は、店のパソコン（ブラウザ）の中だけにあり、ファイルにして持ち運べる、と伝える。
// 右の図は、自分で組んだもの（HTML と勤務のブロック）。ファイルの名前は、道具が実際に付ける名前を、本物の関数から取っている。
import { ArrowLeftRight, FileJson, HardDrive, X } from 'lucide-react'
import { buildExportFile, makeSample } from '@/core'
import { Link } from '@/router'
import { DEMO_MONTH, DEMO_YEAR } from './demo-data'
import { LpHeading, LpSection, Ph } from './section'

const ITEMS = [
  {
    title: '入れるたびに、ブラウザの中に保存',
    body: '保存のボタンを押さなくても、このブラウザの中に残ります。次に開いたとき、続きから始められます。',
  },
  {
    title: 'ファイルにして、持ち運べる',
    body: '「ファイルに保存する」を押すと、1つのファイルになります。USB メモリやメールで別のパソコンに移して、「ファイルを開く」で読み込めます。合わないファイルは、理由を言って断ります。',
  },
  {
    title: '消えることがあるので、ファイルにも',
    body: 'ブラウザの履歴やサイトのデータを消すと、入れた内容も消えます。運営者の手元には何もないので、元に戻すお手伝いができません。大事な表は、ファイルに保存しておいてください。',
  },
]

export function DataSection() {
  // 道具が付けるファイルの名前（日時は名前に入らないので、決まった日時をわたして、いつ描いても同じ結果にする）
  const filename = buildExportFile(makeSample('salon', DEMO_YEAR, DEMO_MONTH), new Date(0)).filename

  return (
    <LpSection id="data" tone="well">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2 lg:items-center">
        <div>
          <LpHeading
            id="data"
            kicker="データの扱い"
            color="teal"
            title={
              <>
                <Ph>入れた内容は、</Ph>
                <Ph>店のパソコンの中だけ。</Ph>
              </>
            }
            lead="スタッフの名前、希望休、できた表。どれも、このサイトのサーバーには送りません。受け取る仕組みそのものを、作っていません。"
          />
          <ul className="mt-8 grid gap-5">
            {ITEMS.map((it) => (
              <li key={it.title} className="border-l-[6px] border-ink pl-4">
                <h3 className="text-[1.08rem]">{it.title}</h3>
                <p className="lp-prose mt-1 text-[14.5px] text-ink-soft">{it.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14.5px]">
            <Link to="/privacy" className="inline-flex min-h-11 items-center font-bold underline decoration-2 underline-offset-[6px] hover:decoration-shift-tomato">
              プライバシーポリシーを読む
            </Link>
          </p>
        </div>

        {/* 図: パソコンの中 ⇄ ファイル、サーバーへは送らない */}
        <div role="img" aria-label="図。入れた内容は、このパソコンのブラウザの中にあり、ファイルとの間でだけ行き来します。サイトのサーバーには送りません。" className="grid gap-3">
          <div className="rounded-xl border-2 border-ink bg-card p-4 shadow-hard-lg md:p-6">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <HardDrive aria-hidden className="size-[18px]" strokeWidth={2.5} />
              このパソコンのブラウザの中
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {['スタッフの名前', '希望休', '必要な人数と条件', 'できた表'].map((t, i) => (
                <li key={t} className="flex items-center gap-1.5 rounded-md border-2 border-ink bg-paper px-2.5 py-1 text-[13.5px] font-bold">
                  <span aria-hidden className="blk" data-size="sm" data-color={(['egg', 'tomato', 'teal', 'sky'] as const)[i]} />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 border-t-2 border-dashed border-ink/30 pt-4">
              <ArrowLeftRight aria-hidden className="size-5 shrink-0 rotate-90" strokeWidth={2.75} />
              <p className="text-[13px] font-bold leading-snug text-ink-soft">ファイルに保存する／ファイルを開く</p>
            </div>
            <p className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border-2 border-ink bg-shift-egg px-3 py-2 text-[13.5px] font-bold">
              <FileJson aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
              <span className="min-w-0 break-all">{filename}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 pl-7">
            <span className="relative grid h-12 w-7 place-items-center">
              <span aria-hidden className="h-full border-l-[3px] border-dashed border-ink/40" />
              <span className="absolute grid size-7 place-items-center rounded-md border-2 border-ink bg-danger text-white">
                <X aria-hidden className="size-4" strokeWidth={4} />
              </span>
            </span>
            <span className="text-[15px] font-extrabold">ここは、通りません</span>
          </div>

          <div className="rounded-xl border-2 border-dashed border-ink/45 px-4 py-3.5 md:px-6">
            <p className="text-sm font-extrabold text-ink-soft">このサイトのサーバー</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">ページを配るだけです。入れた内容を受け取る仕組みが、ありません。</p>
          </div>
        </div>
      </div>
    </LpSection>
  )
}
