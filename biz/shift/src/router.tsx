import { createContext, useContext, type AnchorHTMLAttributes } from 'react'

// ページ間のリンク。ふつうのビルドでは /app のような本物のURL、
// 1ファイルのビルド（確認用）では #/app のようなハッシュで切り替える。
export const SINGLE: boolean = typeof __SINGLE__ !== 'undefined' && __SINGLE__

export const RouteContext = createContext<string>('/')

/** いま表示しているページのパス（'/' や '/app'） */
export function useRoutePath(): string {
  return useContext(RouteContext)
}

/** ページのパス（'/app' や '/#pricing'）を、ビルドの種類に合ったリンク先に変える */
export function href(to: string): string {
  if (!SINGLE) return to
  const [path, hash] = to.split('#')
  return '#' + (path || '/') + (hash ? '#' + hash : '')
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }

/** サイト内のページへのリンク。to は '/app'、'/#pricing' のように書く。外部サイトへはふつうの <a> を使う。 */
export function Link({ to, ...rest }: LinkProps) {
  return <a href={href(to)} {...rest} />
}

/** 1ファイルのビルドで、location.hash からページのパスとページ内の移動先を取り出す */
export function parseHash(hash: string): { path: string; anchor: string | null } | null {
  if (!hash.startsWith('#/')) return null
  const [path, anchor] = hash.slice(1).split('#')
  return { path: path || '/', anchor: anchor || null }
}
