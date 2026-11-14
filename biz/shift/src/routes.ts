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
    title: 'たたき台シフト — 希望休と必要人数を入れると、来月のシフトのたたき台ができる',
    description: 'ページの説明（検索結果に出る文）。',
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: 'シフトを組む | たたき台シフト',
    description: '希望休と必要な人数を入れて、来月のシフトのたたき台を作る画面です。登録はいりません。入れた内容は、このブラウザの中だけに保存されます。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    path: '/tokushoho',
    title: '特定商取引法にもとづく表記 | たたき台シフト',
    description: '特定商取引法にもとづく表記。',
    ssr: true,
    load: () => import('./pages/Tokushoho'),
  },
  {
    path: '/privacy',
    title: 'プライバシーポリシー | たたき台シフト',
    description: 'プライバシーポリシー。',
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
