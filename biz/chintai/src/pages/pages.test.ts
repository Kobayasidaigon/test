import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { listGuideItems } from '../core/items'
import { sampleEstimate } from '../core/sample'
import { inspectEstimate } from '../core/inspect'
import { NOT_DOING } from '../core/texts'
import { findBannedPhrase } from '../core/wording'
import { formatYen } from '../core/format'
import { RouteContext } from '../router'
import { routes, type Route } from '../routes'

// 静的HTMLに書き出すページ（ssr: true）を、ビルドと同じやり方（window のない場所で renderToString）で描いて確かめる。
// - 描くときに window・document・localStorage にさわっていない（さわっていれば、ここで落ちる）。
// - ページの中に、言ってはいけない言い方（断定、あおり、相場での判定）が出ていない。
//   部品にじかに書いた文は wording.test.ts が、データの文は core のテストが見ているが、
//   ここでは、組み合わさって実際に出る文（書き出された HTML）を、まるごと見る。
// - LP の一番上の見積書が、本物の点検の結果と同じ数字を出している（手で書いた見本になっていない）。

async function renderRoute(route: Route): Promise<string> {
  const Page = (await route.load()).default
  return renderToString(createElement(RouteContext.Provider, { value: route.path }, createElement(Page)))
}

/** HTML から、目に見える文だけを取り出す（タグと、<style>・<script> の中身を取りのぞく）。 */
function visibleText(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

const ssrRoutes = routes.filter((r) => r.ssr)

describe('静的HTMLに書き出すページ', () => {
  it('ページの一覧に、仕様書のページがそろっている', () => {
    const paths = routes.map((r) => r.path)
    for (const path of ['/', '/app', '/about', '/privacy', '/items']) expect(paths).toContain(path)
    for (const item of listGuideItems()) expect(paths).toContain(`/items/${item.guide.slug}`)
    // 有料版がないので、特定商取引法にもとづく表記のページは置かない。
    expect(paths).not.toContain('/tokushoho')
    // 道具の画面だけが、ブラウザで描くページ。
    expect(routes.filter((r) => !r.ssr).map((r) => r.path)).toEqual(['/app'])
    // 同じパスが、2つない。
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('題と説明文が、検索結果に出て意味が通る長さになっている', () => {
    for (const r of routes) {
      const title = [...r.title].length
      const description = [...r.description].length
      expect(title, `${r.path} の題（${title}字）`).toBeGreaterThanOrEqual(15)
      expect(title, `${r.path} の題（${title}字）`).toBeLessThanOrEqual(45)
      expect(description, `${r.path} の説明文（${description}字）`).toBeGreaterThanOrEqual(80)
      expect(description, `${r.path} の説明文（${description}字）`).toBeLessThanOrEqual(120)
      expect(r.title).toContain('みつもり点検')
    }
    // 説明文の使い回しがない。
    expect(new Set(routes.map((r) => r.description)).size).toBe(routes.length)
  })

  it.each(ssrRoutes.map((r) => [r.path, r] as const))('%s を、window なしで描ける。言ってはいけない言い方が出ていない', async (_path, route) => {
    expect(typeof window).toBe('undefined')
    const html = await renderRoute(route)
    const text = visibleText(html)
    expect(html).toContain('<h1')
    expect(text.length).toBeGreaterThan(400)
    // 「この道具がしないこと」の題（「必ず下がる、とは言いません」など）は、言わないと約束している文そのものなので、調べる前に取りのぞく。
    const checked = NOT_DOING.reduce((t, n) => t.split(n.title).join(''), text)
    const found = findBannedPhrase(checked)
    expect(found, `${route.path} に「${found}」があります`).toBeNull()
    // どのページからも、道具へ行ける。
    expect(html).toContain('href="/app"')
  })

  it('LP の一番上の見積書は、サンプルを本物のロジックで点検した結果を出している', async () => {
    const html = await renderRoute(routes.find((r) => r.path === '/')!)
    const inspection = inspectEstimate(sampleEstimate())
    expect(html).toContain(formatYen(inspection.total))
    // 行の名前は、終わりのかっこ書きを折れないまとまり（<span>）にしているので、タグを取りのぞいた文で確かめる。
    const text = visibleText(html)
    for (const f of inspection.findings) {
      expect(text).toContain(f.label)
      expect(html).toContain(f.headline)
    }
    // 静的HTMLの段階では、赤ペンを描く動きを止めてある（画面に入ったら、ブラウザで動かす）。
    expect(html).toContain('data-pen="hold"')
    // 仕様書の「LP に入れるもの」の欄が、全部ある。
    for (const id of ['wakaru', 'tsukaikata', 'bunmen', 'shinaikoto', 'konkyo', 'kaisetsu', 'unei', 'faq']) expect(html).toContain(`id="${id}"`)
  })

  it('解説ページは、ページごとに中身が違う', async () => {
    const pages = await Promise.all(routes.filter((r) => r.path.startsWith('/items/')).map(renderRoute))
    const leads = pages.map((html) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '')
    expect(new Set(leads).size).toBe(pages.length)
    for (const item of listGuideItems()) {
      const html = pages.find((p) => p.includes(item.guide.lead))
      expect(html, `${item.name} の解説ページ`).toBeDefined()
      for (const point of item.guide.points) expect(html).toContain(point.title)
      expect(html).toContain(item.howToAsk)
    }
  })
})
