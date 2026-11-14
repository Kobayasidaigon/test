// 共有画像（public/og.png、1200×630）を撮る。
// scripts/og.html を Playwright（Chromium）で開いて、画面をそのまま画像にする。
// 使い方: node scripts/og.cjs   （Playwright が入っている環境で。書体は Google Fonts から読むので、ネットワークがいる）
const { chromium } = require('playwright')
const { resolve } = require('node:path')
const { pathToFileURL } = require('node:url')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(resolve(__dirname, 'og.html')).href)
  await page.waitForLoadState('networkidle')
  // 書体を読み終えてから撮る（読む前に撮ると、別の書体で出てしまう）
  await page.evaluate(() => document.fonts.ready)
  const out = resolve(__dirname, '..', 'public', 'og.png')
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } })
  await browser.close()
  console.log('書き出しました:', out)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
