import { useEffect } from 'react'
import { SINGLE } from '@/router'

/** 動きを減らす設定になっているか。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  })
}

/**
 * # 付きの URL（/#faq、/about#soudan など）で開いたときに、行き先がずれないようにする。
 *
 * ブラウザは、ページを読み込むとすぐに # の場所へ動く。そのあとで、書体（Google Fonts）が届いて文字の幅が変わると、
 * 上にある文の折り返しが変わり、ページの高さが変わって、行き先がずれる（スマホの幅で「よくある質問」を開くと、
 * 見出しが画面の 500px ほど上に行ってしまっていた）。
 * そこで、書体の読み込みが終わったときと、ページの読み込みが終わったときに、もう一度、行き先へ動かす。
 * 使う人が画面を動かしたり、どこかを押したりしたあとは、何もしない（読んでいる場所を、勝手に動かさない）。
 * 開いてから6秒たったあとも、何もしない。
 *
 * ページに1つだけ置く（上の帯 site-header.tsx で呼んでいる）。1ファイルのビルドでは、# でページを切り替えているので、使わない。
 */
export function useKeepHashTarget(): void {
  useEffect(() => {
    if (SINGLE) return
    let id = ''
    try {
      id = decodeURIComponent(window.location.hash.slice(1))
    } catch {
      return
    }
    if (id === '') return

    let active = true
    const stop = () => {
      active = false
    }
    const align = () => {
      // 描き終わってから動かす（折り返しが変わった直後は、まだ高さが決まっていないことがある）。
      requestAnimationFrame(() => {
        if (active) document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      })
    }

    const userEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const name of userEvents) window.addEventListener(name, stop, { passive: true })
    const fonts: FontFaceSet | undefined = document.fonts
    fonts?.ready.then(align).catch(() => {})
    fonts?.addEventListener?.('loadingdone', align)
    window.addEventListener('load', align)
    const timer = window.setTimeout(stop, 6000)
    return () => {
      stop()
      window.clearTimeout(timer)
      for (const name of userEvents) window.removeEventListener(name, stop)
      fonts?.removeEventListener?.('loadingdone', align)
      window.removeEventListener('load', align)
    }
  }, [])
}
