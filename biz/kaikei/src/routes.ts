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

// title は30字前後、description は80〜120字（検索結果に出て、それだけで意味が通る文にする）。
// 料金の数字は、site.config.ts から入れる（ここに直に書くと、料金を変えたときに食いちがうため）。
const pro = site.pricing.pro
const price = `${pro.unit}${pro.priceText}`
const tax = pro.taxIncluded ? '税込' : '税別'

export const routes: Route[] = [
  {
    path: '/',
    title: 'ひきつぎ会計｜町内会・PTAの会計係のための、総会資料づくり',
    description:
      '町内会・自治会、子ども会、PTA、サークルの会計係のための道具です。収入と支出を入れるだけで、収支決算書、出納帳、会計監査報告書、予算案、引き継ぎ書がそろいます。登録なし。入力と確認は無料、透かしのない印刷は' + price + '（' + tax + '）。',
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: '帳簿をつける｜ひきつぎ会計',
    description:
      '収入と支出を入力して、総会の資料（収支決算書、出納帳、会計監査報告書、次年度の予算案、引き継ぎ書）を作る画面です。登録はいりません。入力した内容は、どこにも送られません。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    path: '/tokushoho',
    title: '特定商取引法にもとづく表記｜ひきつぎ会計',
    description:
      'ひきつぎ会計の、特定商取引法にもとづく表記です。販売事業者、販売価格（' + price + '・' + tax + '）、支払方法、ライセンスキーをお送りする時期、返品とキャンセルの条件、動作環境を記載しています。',
    ssr: true,
    load: () => import('./pages/Tokushoho'),
  },
  {
    path: '/privacy',
    title: 'プライバシーポリシー｜ひきつぎ会計',
    description:
      'ひきつぎ会計のプライバシーポリシーです。入力した帳簿の内容は、お使いのブラウザの中と、ご自分で保存したファイルにだけ置かれ、運営者のサーバーには送られません。お支払いのときにお預かりする情報と、その使いみちも記載しています。',
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
