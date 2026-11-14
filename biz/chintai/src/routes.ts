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
    title: 'みつもり点検 — 賃貸の初期費用の見積書を、項目ごとに点検する',
    description: 'ページの説明（検索結果に出る文）。',
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: 'ツール | みつもり点検',
    description: 'ツールの画面。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    // 有料版がないので、特定商取引法にもとづく表記（/tokushoho）のかわりに、このページを置く。
    path: '/about',
    title: 'このサイトについて | みつもり点検',
    description: 'みつもり点検の運営者、広告で運営していること、免責、相談先について。',
    ssr: true,
    load: () => import('./pages/About'),
  },
  {
    path: '/privacy',
    title: 'プライバシーポリシー | みつもり点検',
    description: 'プライバシーポリシー。',
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
