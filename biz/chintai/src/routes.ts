import type { ComponentType } from 'react'
import { items, listGuideItems } from './core/items'

// ページの一覧。ここに足すと、ビルドのときに dist/<path>/index.html ができる。
// ssr: true のページは中身ごと静的HTMLに書き出す（検索エンジンとSNS向け）。
// ssr: false のページ（ブラウザの保存領域を使う道具の画面など）は、枠だけ書き出してブラウザで描く。
//
// title は30字前後、description は80〜120字（検索結果に出て、意味が通る文にする）。
// 項目ごとの解説（/items/<slug>）は、項目のデータ（core/items.ts の guide）から作る。
// 解説のある項目を足したり消したりすると、ページも、一覧や道具の画面からのリンクも、一緒に変わる。
export type Route = {
  path: string
  title: string
  description: string
  ssr: boolean
  load: () => Promise<{ default: ComponentType }>
}

const guides = listGuideItems()

/**
 * 解説ページの説明文。項目のデータの説明文（guide.description）が短いときは、
 * どの解説ページにもある中身（聞き方の文例）のことを足して、80字より長くする。
 */
function guideDescription(text: string): string {
  return [...text].length >= 85 ? text : `${text}不動産会社への聞き方の文例も、載せています。`
}

export const routes: Route[] = [
  {
    path: '/',
    title: 'みつもり点検 | 賃貸の初期費用の見積書を、項目ごとに点検する',
    description:
      '賃貸の初期費用の見積書を、項目ごとに点検する無料の道具です。必須か任意かを確かめたほうがよい項目に赤ペンが入り、根拠にした国の資料へのリンクと、不動産会社に聞くための文面が出ます。登録はいりません。入力した内容は、送信されません。',
    ssr: true,
    load: () => import('./pages/Landing'),
  },
  {
    path: '/app',
    title: '初期費用の見積書を点検する（無料・登録なし） | みつもり点検',
    description:
      '賃貸の初期費用の見積書を、項目ごとに点検する道具です。確かめたほうがよい項目と、不動産会社に送る確認の文面が出ます。無料で、登録はいりません。入力した内容は、送信されません。',
    ssr: false,
    load: () => import('./pages/Tool'),
  },
  {
    path: '/items',
    title: '賃貸の初期費用の項目の一覧と解説 | みつもり点検',
    description: `敷金、礼金、仲介手数料、火災保険料、鍵の交換費用、室内の消毒・抗菌など、賃貸の初期費用の見積書に出てくる${items.length}個の項目を、何を確かめる項目かで分けて並べました。${guides.length}個の項目には、確かめることと聞き方の解説があります。`,
    ssr: true,
    load: () => import('./pages/Items'),
  },
  ...guides.map((item) => ({
    path: `/items/${item.guide.slug}`,
    title: `${item.guide.title} | みつもり点検`,
    description: guideDescription(item.guide.description),
    ssr: true,
    load: () => import('./pages/ItemGuide'),
  })),
  {
    // 有料版がないので、特定商取引法にもとづく表記（/tokushoho）のかわりに、このページを置く。
    path: '/about',
    title: 'このサイトについて（運営者・広告・相談先） | みつもり点検',
    description:
      'みつもり点検は、賃貸の初期費用の見積書を点検する、無料の道具です。運営者、広告の収入で運営していること、この道具の立て付け（法律の助言ではないこと）、困ったときの相談先（消費者ホットライン 188 など）をまとめています。',
    ssr: true,
    load: () => import('./pages/About'),
  },
  {
    path: '/privacy',
    title: 'プライバシーポリシー | みつもり点検',
    description:
      'みつもり点検のプライバシーポリシーです。入力した見積書の内容は、お使いのブラウザの中だけに保存され、運営者のサーバーには送られません。会員登録はなく、アクセス解析や広告配信のためのタグも入れていません。',
    ssr: true,
    load: () => import('./pages/Privacy'),
  },
]

export function findRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  return routes.find((r) => r.path === clean) ?? routes[0]
}
