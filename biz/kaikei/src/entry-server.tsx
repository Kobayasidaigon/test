import { renderToString } from 'react-dom/server'
import { routes, type Route } from './routes'
import { RouteContext } from './router'
import { site } from './site.config'

export { routes, site }

/** ビルドのとき（scripts/prerender.mjs）に、1ページ分のHTMLを作る */
export async function render(route: Route): Promise<string> {
  if (!route.ssr) return ''
  const Page = (await route.load()).default
  return renderToString(
    <RouteContext.Provider value={route.path}>
      <Page />
    </RouteContext.Provider>,
  )
}
