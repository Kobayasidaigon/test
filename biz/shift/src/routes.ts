import type { ComponentType } from 'react'
import { site } from './site.config'

// ページの一覧。ここに足すと、ビルドのときに dist/<path>/index.html ができる。
// ssr: true のページは中身ごと静的HTMLに書き出す（検索エンジンとSNS向け）。
// ssr: false のページ（ブラウザの保存領域を使う道具の画面など）は、枠だけ書き出してブラウザで描く。
export type Route = {
  path: string
  title: string
  description: string
  ssr: boolean
  load: () => Promise<{ default: ComponentType }>
}

// 金額と人数は site.config.ts から取る（料金を変えたとき、検索結果に出る文だけが古いまま残らないように）。
// 目安: title は30字前後、description は80〜120字。
const { free } = site.pricing

export const routes: Route[] = [
  {
    path: '/',
    title: `${site.name}｜希望休と必要人数から、来月のシフト表を自動で作る`,
    description: `希望休と必要な人数を入れてボタンを押すと、来月のシフト表のたたき台ができます。美容室・飲食店・薬局など、スタッフ5〜20人の店向け。登録なしで、スタッフの名前は外に出ません。${free.staffLimit}人まで無料、買い切り版は${site.plans.pro.price}。`,
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: `シフトを組む画面｜${site.name}（登録なしで、すぐ使えます）`,
    description: '希望休と必要な人数を入れて、来月のシフトのたたき台を作る画面です。サンプルの店で、すぐに試せます。登録はいりません。入れた内容は、このブラウザの中だけに保存され、ファイルに書き出して持ち運べます。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    path: '/tokushoho',
    title: `特定商取引法にもとづく表記（${site.plans.pro.name}版の販売条件）｜${site.name}`,
    description: `${site.name}の特定商取引法にもとづく表記です。販売事業者、${site.plans.pro.name}版の販売価格（${site.plans.pro.price}・税込）、支払方法と支払時期、ライセンスキーの引渡し時期、返品・返金の条件、動作環境を記載しています。`,
    ssr: true,
    load: () => import('./pages/Tokushoho'),
  },
  {
    path: '/privacy',
    title: `プライバシーポリシー（データの扱い）｜${site.name}`,
    description: `${site.name}のプライバシーポリシーです。入力したスタッフの名前や希望休は、お使いのブラウザの中だけに保存し、サーバーに送りません。ページを開いたときに伝わる情報と、お支払いのときにお預かりする情報を説明します。`,
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
