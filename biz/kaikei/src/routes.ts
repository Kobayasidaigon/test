import type { ComponentType } from 'react'

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

export const routes: Route[] = [
  {
    path: '/',
    title: 'ひきつぎ会計 — 収入と支出を入れるだけで、総会の資料がそろう。引き継ぎはファイル1つ',
    description: 'ページの説明（検索結果に出る文）。',
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: 'ツール | ひきつぎ会計',
    description: 'ツールの画面。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    path: '/tokushoho',
    title: '特定商取引法にもとづく表記 | ひきつぎ会計',
    description: '特定商取引法にもとづく表記。',
    ssr: true,
    load: () => import('./pages/Tokushoho'),
  },
  {
    path: '/privacy',
    title: 'プライバシーポリシー | ひきつぎ会計',
    description: 'プライバシーポリシー。',
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
