// node scripts/shoot.cjs <a|b|c|d> <出力フォルダ>
// dist-<v>/<v>.html を開いて、入力画面と結果画面（?step=result）を 390px と 1440px で撮る。
// 動きを減らす設定（reduced motion）での結果画面も 390px で撮る。
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const v = process.argv[2]
const out = process.argv[3] || path.join(__dirname, '..', `shots-${v}`)
fs.mkdirSync(out, { recursive: true })
const file = 'file://' + path.join(__dirname, '..', `dist-${v}`, `${v}.html`)
;(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined })
  const shots = []
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    for (const step of ['', 'result']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(e.message))
      page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
      await page.goto(file + (step ? `?step=${step}` : ''), { waitUntil: 'networkidle' })
      await page.waitForTimeout(step ? 4500 : 1500)
      const name = `${v}_${step || 'start'}_${w}.png`
      await page.screenshot({ path: path.join(out, name), fullPage: false })
      await page.screenshot({ path: path.join(out, name.replace('.png', '_full.png')), fullPage: true })
      const m = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, height: document.documentElement.scrollHeight, fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))] }))
      shots.push({ name, ...m, errors: errs })
      await ctx.close()
    }
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(file + '?step=result', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(out, `${v}_result_390_reduced.png`) })
  await browser.close()
  console.log(JSON.stringify(shots, null, 1))
})()
