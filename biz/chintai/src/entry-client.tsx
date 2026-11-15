import { StrictMode, useEffect, useState, type ComponentType } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { findRoute, type Route } from './routes'
import { RouteContext, SINGLE, parseHash } from './router'

const el = document.getElementById('root')!

function Shell({ route, Page }: { route: Route; Page: ComponentType }) {
  return (
    <StrictMode>
      <RouteContext.Provider value={route.path}>
        <Page />
      </RouteContext.Provider>
    </StrictMode>
  )
}

async function startPages() {
  // ふつうのビルド: URLのパスでページが決まる。静的HTMLがあればそれを引き継ぐ。
  const route = findRoute(location.pathname)
  const Page = (await route.load()).default
  if (route.ssr && el.dataset.ssr === route.path) {
    hydrateRoot(el, <Shell route={route} Page={Page} />)
  } else {
    el.replaceChildren()
    createRoot(el).render(<Shell route={route} Page={Page} />)
  }
}

function SingleApp() {
  // 1ファイルのビルド: ハッシュ（#/app）でページを切り替える。
  const [state, setState] = useState<{ route: Route; Page: ComponentType } | null>(null)
  useEffect(() => {
    let alive = true
    const go = async () => {
      const parsed = parseHash(location.hash)
      // #pricing のようなページ内の移動では、ページを切り替えない。
      // ただし、ハッシュが空のとき（index.html をハッシュなしで開いたあと、別のページへ行って「戻る」を押したとき）は、
      // ページ内の移動ではなく、最初のページ（/）へ戻る動きなので、切り替える（ここを飛ばすと、URL だけ戻って画面が前のページのまま残った）
      const empty = location.hash === '' || location.hash === '#'
      if (!parsed && !empty && state) return
      const route = findRoute(parsed?.path ?? '/')
      const Page = (await route.load()).default
      if (!alive) return
      document.title = route.title
      setState({ route, Page })
      requestAnimationFrame(() => {
        if (parsed?.anchor) document.getElementById(parsed.anchor)?.scrollIntoView()
        else window.scrollTo(0, 0)
      })
    }
    go()
    window.addEventListener('hashchange', go)
    return () => {
      alive = false
      window.removeEventListener('hashchange', go)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === null])
  if (!state) return null
  return (
    <RouteContext.Provider value={state.route.path}>
      <state.Page />
    </RouteContext.Provider>
  )
}

if (SINGLE) createRoot(el).render(<SingleApp />)
else startPages()
