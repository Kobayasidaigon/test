// ゲームページを #video モードで開き、1コマずつ JPEG に書き出す
// 使い方: node record.js <出力フォルダ>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'frames'));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '#video');
  const fonts = await page.evaluate(() => window.__video.ready());
  console.log('fonts:', fonts.join(' '));
  fs.mkdirSync(out, { recursive: true });
  let i = 0, last = null;
  for (;;) {
    const r = await page.evaluate(() => window.__video.frame());
    fs.writeFileSync(path.join(out, String(i).padStart(5, '0') + '.jpg'), Buffer.from(r.img.split(',')[1], 'base64'));
    if (r.phase !== last) { console.log(`${r.t.toFixed(2)}s ${r.phase}`); last = r.phase; }
    i++;
    if (r.done || i > 1800) break;
  }
  const events = await page.evaluate(() => window.__video.sfx());
  fs.writeFileSync(path.join(out, 'sfx.json'), JSON.stringify({ fps: 30, frames: i, events }));
  console.log('frames:', i);
  await browser.close();
})();
