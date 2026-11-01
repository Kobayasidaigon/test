// 共有画像とアイコンを作る: node scripts/make-og.cjs
//   site/public/og.png（1200×630）、apple-touch-icon.png（180）、icon-512.png、favicon.ico（16・32・48）
// 絵の元は scripts/og/og.html と scripts/og/icon.html。文字は Google Fonts から読み込む。
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const here = __dirname
const out = path.resolve(here, '../site/public')
const url = (f, q = '') => 'file://' + path.join(here, 'og', f) + q

// PNG を並べて .ico を作る（PNG をそのまま入れる形式。今のブラウザはすべて読める）
function toIco(pngs) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2)
    dir.writeUInt8(0, o + 3)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  return Buffer.concat([head, dir, ...pngs.map((p) => p.buf)])
}

;(async () => {
  const browser = await chromium.launch()

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.goto(url('og.html'))
  await og.waitForSelector('body[data-ready="1"]', { timeout: 30000 })
  await og.screenshot({ path: path.join(out, 'og.png') })

  const icon = async (size, bg) => {
    const p = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 })
    await p.goto(url('icon.html', bg ? '?bg=1' : ''))
    const buf = await p.screenshot({ omitBackground: !bg, clip: { x: 0, y: 0, width: 512, height: 512 } })
    await p.close()
    return buf
  }
  fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), await icon(180, true))
  fs.writeFileSync(path.join(out, 'icon-512.png'), await icon(512, true))
  const ico = []
  for (const size of [16, 32, 48]) ico.push({ size, buf: await icon(size, false) })
  fs.writeFileSync(path.join(out, 'favicon.ico'), toIco(ico))

  await browser.close()
  console.log('wrote og.png, apple-touch-icon.png, icon-512.png, favicon.ico to', out)
})()
