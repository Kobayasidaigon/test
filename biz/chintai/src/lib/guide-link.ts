import { routes } from '@/routes'

/**
 * 項目ごとの解説ページ（/items/<slug>）のパスを返す。ページがまだなければ null。
 * ページの一覧（routes.ts）を見て決めるので、解説ページが足されたら、道具の画面からのリンクも、そのまま出るようになる。
 * 行き先のないリンクを出さないための関数。
 */
export function guidePath(slug: string | null): string | null {
  if (!slug) return null
  const path = `/items/${slug}`
  return routes.some((r) => r.path === path) ? path : null
}
