/**
 * ページの中の、id の付いた場所まで動かして、そこにフォーカスを移す。
 * <a href="#id"> に任せず、こうしているのは、URL の # を書き換えないため
 * （1ファイルのビルドでは、# でページを切り替えているので、書き換えると、読み込み直したときに別のページになる）。
 * 押したときだけ呼ぶこと（document にさわる）。
 */
export function scrollToId(id: string): void {
  // 開く動きなどで高さが変わることがあるので、描き終わってから動かす。
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  })
}
