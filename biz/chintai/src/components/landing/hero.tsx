import { useEffect, useRef, useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import { SAMPLE_NOTE } from '@/core/sample'
import type { Inspection } from '@/core/types'
import { InspectedSheet } from '@/components/inspected-sheet'
import { DateStamp, PenArrow, PenCheck } from '@/components/pen'
import { Sheet, SheetTitle } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { prefersReducedMotion } from '@/lib/scroll'
import { Link } from '@/router'
import { site } from '@/site.config'

// LP の一番上。左に見出しと道具への入口、右に「赤ペンが入っていく見積書」。
//
// felipemenezes098 の Hero with Dashboard Mockup（21st.dev）をもとにした。
// もとの部品から残したもの:
// - 左寄せの見出し・説明・ボタン1つ、という静かな組み立てと、「絵は、製品そのものを置く」という考え方。
// 変えたもの:
// - 写真の背景の上に浮かべた見本のダッシュボードをやめて、本物の部品（InspectedSheet）に、
//   本物の判定ロジックの結果（サンプルの見積書を点検したもの）を渡して置いた。
// - 見出しの下に絵を置く縦の並びを、広い画面では横の並びにした（開いてすぐ、赤ペンの入る行が見えるように）。
// - 出てくるときのぼかしと動き（motion）、行を整えるライブラリ（react-wrap-balancer）は使わない。
//   動くのは、赤ペンが入っていく、その1回だけ。

/**
 * 赤ペンが入っていく見積書。
 *
 * - 静的HTMLの段階から、行・金額・書き込みの中身は全部入っている（空の箱にしない）。
 * - 赤ペンの丸と書き込みは、その行が画面に入ったときに描き始める。スマホでは、見積書が見出しの下にあって、
 *   開いたときには下のほうの行が見えていないので、ページを開いたときに全部描いてしまうと、だれも見ないうちに終わるため。
 *   画面に入るまでは、CSS で待たせておく（index.css の [data-pen="hold"]。入った行には data-pen-go を付ける）。
 * - スクリプトが届かないときは、8秒たつと CSS だけで描く。スクリプトを切っている人には、<noscript> の決まりで、すぐに描く。
 * - 動きを減らす設定の人には、はじめから全部出す（CSS の側で、待たせない）。
 */
function HeroSheet({ inspection }: { inspection: Inspection }) {
  const box = useRef<HTMLDivElement>(null)
  // 「もう一度」を押すたびに数を増やして、見積書を作り直す（CSS の動きを、はじめからやり直すため）。
  const [round, setRound] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    // 待たせているもの（赤ペンの丸の SVG と、手書きの書き込み）。
    const targets = el.querySelectorAll<HTMLElement | SVGElement>('.text-pen > .pen-draw, .font-pen.animate-in')
    const release = (target: HTMLElement | SVGElement) => target.setAttribute('data-pen-go', '')
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach(release)
      return
    }
    let first = true
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const target = entry.target as HTMLElement | SVGElement
          // 開いたときに見えていた行は、上から順に描く（行ごとにずらした待ち時間を、そのまま使う）。
          // あとから画面に入ってきた行は、待たせずに、すぐ描く。
          if (!first) {
            target.style.setProperty('--pen-delay', '0ms')
            if (target.classList.contains('animate-in')) target.style.animationDelay = '200ms'
          }
          release(target)
          io.unobserve(target)
        }
        first = false
      },
      // 画面の下の端から少し入ったところで、描き始める。
      { rootMargin: '0px 0px -5% 0px' },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [round])

  return (
    <div className="relative">
      {/* スクリプトを切っている人には、待たせずに描く。React は <style> の中の文字を書きかえてしまうので、そのまま入れている。 */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html:
              '[data-pen=hold] .text-pen>.pen-draw:not([data-pen-go]) .pen-stroke,[data-pen=hold] .font-pen.animate-in:not([data-pen-go]){animation-delay:.3s!important}',
          }}
        />
      </noscript>
      {/* 下に重ねた、もう1枚の紙（飾り）。机の上に、書類が重ねて置いてある感じを出す。 */}
      <div aria-hidden className="sheet absolute inset-0 hidden translate-x-2 translate-y-2.5 rotate-[0.9deg] sm:block" />
      <div ref={box} data-pen="hold" className="relative">
        <Sheet aria-label="サンプルの見積書を、点検した結果">
        <SheetTitle
          title="初期費用の見積書"
          eyebrow="サンプルの見積書を、点検した結果"
          right={
            <DateStamp top="みつもり" date="見本" bottom="点検" label="見本（サンプルの見積書）" className="-mb-1 size-[3.75rem] sm:-mb-9 sm:size-[4.75rem]" />
          }
        />
        <p className="mb-3 text-[13px] leading-6 text-ink-soft">
          赤ペンの丸が付いた行が、確かめる項目です。外せると決まったわけではありません。不動産会社に聞いてみる項目です。
        </p>
        <InspectedSheet key={round} inspection={inspection} draw />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 basis-64 text-xs leading-5 text-ink-soft">{SAMPLE_NOTE}</p>
          <Button variant="ghost" size="sm" className="-my-1 motion-reduce:hidden" onClick={() => setRound((r) => r + 1)}>
            <RotateCcwIcon aria-hidden className="size-3.5" />
            もう一度、赤ペンを入れる
          </Button>
        </div>
        </Sheet>
      </div>
    </div>
  )
}

export function Hero({ inspection }: { inspection: Inspection }) {
  const lines = inspection.findings.length
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[76rem] px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-12 lg:pt-14">
      <div className="grid items-start gap-x-14 gap-y-4 sm:gap-y-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        {/* 右の見積書が長いので、広い画面では、見出しとボタンを画面に残す（画面の高さが足りるときだけ）。 */}
        <div className="lg:pt-6 lg:[@media(min-height:780px)]:sticky lg:[@media(min-height:780px)]:top-24">
          <h1 id="hero-title" className="text-[2rem] font-bold leading-[1.36] tracking-[0.01em] sm:text-[2.6rem] lg:text-[2.45rem] xl:text-[2.8rem]">
            <span className="inline-block">賃貸の初期費用の</span>
            <span className="inline-block">見積書を、</span>
            <span className="inline-block">1行ずつ点検する。</span>
          </h1>
          <p className="text-jp mt-4 text-base text-ink sm:mt-5 sm:text-[17px]">
            「高い気がするけれど、どれが必ずかかるお金なのか、わからない」。もらった見積書の項目と金額を入れると、不動産会社に確かめたほうがよい行に、赤ペンが入ります。聞くときに使える、ていねいな文面も作れます。
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/app">自分の見積書を点検する（無料）</Link>
            </Button>
            {/* スマホでは出さない（開いてすぐの画面に、下の見積書の頭が入るように、縦の長さを詰める）。 */}
            <a href="#wakaru" className="hidden min-h-11 items-center justify-center px-2 text-sm text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink sm:inline-flex">
              何がわかるかを、先に見る
            </a>
          </div>

          <ul className="mt-5 space-y-1 text-sm leading-6 text-ink-soft sm:mt-6 sm:space-y-1.5">
            {[
              site.pricing.toolPriceYen === 0 ? '無料です。有料版はありません。' : null,
              site.pricing.signupRequired ? null : '会員登録はいりません。',
              site.pricing.sendsInputToServer ? null : '入力した内容は、どこにも送信されません。',
            ]
              .filter((t): t is string => t !== null)
              .map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <PenCheck className="mt-[0.15em] text-pencil" />
                  <span>{t}</span>
                </li>
              ))}
          </ul>

          {/* 見積書を指す、赤ペンの書き込み（広い画面では右、せまい画面では下を指す）。数は、本物の点検の結果から出している。 */}
          <p className="mt-6 flex items-center gap-2 font-pen text-[18px] text-pen sm:mt-9 sm:text-[19px]">
            <span>
              {lines}行のうち、{inspection.attentionCount}つに丸が付きました
            </span>
            <PenArrow className="-rotate-90 lg:rotate-0 lg:-scale-x-100" />
          </p>
        </div>

        <HeroSheet inspection={inspection} />
      </div>
    </section>
  )
}
