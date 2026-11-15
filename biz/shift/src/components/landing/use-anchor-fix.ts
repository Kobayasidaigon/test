// ほかのページから「/#pricing」のように見出しを指して開いたとき、行き先がずれるのを直す。
//
// なぜ要るか: ブラウザは、ページを読み込んだ直後に見出しの位置へ動く。そのあとで Web フォントが届くと、
// 文字の幅が変わって行の折り返しが変わり、上にある文の高さが変わる。その結果、見出しが画面のまん中あたりにずれてしまう。
// そこで、フォントが届いたあとに、もう一度だけ見出しの位置へ動かす。
// 読み込みのあいだに利用者が自分でスクロールしていたら、何もしない（勝手に引き戻さない）。
import { useEffect } from 'react'
import { parseHash, SINGLE } from '@/router'

export function useAnchorFix(): void {
  useEffect(() => {
    // 1ファイルのビルドでは「#/#pricing」の形になる
    const anchor = SINGLE ? (parseHash(location.hash)?.anchor ?? null) : location.hash.slice(1) || null
    if (!anchor || !document.fonts) return
    let moved = false
    const mark = () => {
      moved = true
    }
    const events = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const
    for (const e of events) window.addEventListener(e, mark, { passive: true, once: true })
    let alive = true
    void document.fonts.ready.then(() => {
      if (!alive || moved) return
      // 動きは付けない（もう一度すべるように動くと、かえって目ざわりなため）
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
    })
    return () => {
      alive = false
      for (const e of events) window.removeEventListener(e, mark)
    }
  }, [])
}
