// 共有画像のもとになるページ（scripts/og.html）を作り直す。
// サンプルの帳簿の、本物の収支決算書（src/components/papers）を HTML にして、og.html の中に埋めこむ。
// サンプルの数字や、紙の形（src/styles/paper.css）を変えたときに使う。
// 使い方: node scripts/og-build.mjs   → そのあと node scripts/og.cjs で public/og.png を撮る
import { createServer } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
process.chdir(root)
const server = await createServer({ root, configFile: root + '/vite.config.ts', server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
try {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const core = await server.ssrLoadModule('/src/core/index.ts')
  const papers = await server.ssrLoadModule('/src/components/papers/index.ts')
  const book = core.createSampleBook()
  const reports = core.buildReports(book, book.years[0].id)
  const paper = renderToStaticMarkup(React.createElement(papers.SettlementPaper, { report: reports.settlement, today: '2026-04-05' }))
  // 紙の見た目（画面用のところだけ。印刷の決まりと、透かしはいらない）
  let css = readFileSync(root + '/src/styles/paper.css', 'utf8')
  css = css.slice(css.indexOf('.paper {'), css.indexOf('/* ---- 「見本」の透かし'))
  css = css.replace(/@supports \(width: 1cqw\) \{[^}]*\{[^}]*\}\s*\}/, '')
  const html = `<!doctype html>
<html lang="ja">
<!--
  共有画像（public/og.png、1200×630）のもとになるページ。
  これをブラウザで 1200×630 の大きさで開いて、画面を撮ると、og.png になる（node scripts/og.cjs）。
  右の紙は、サンプルの帳簿（あおぞら町内会・令和7年度）の、本物の収支決算書。
  道具の紙の部品（src/components/papers/SettlementPaper.tsx）が出した HTML と、src/styles/paper.css を、そのまま写してある。
  このファイルは node scripts/og-build.mjs が書き出す。サンプルや紙の形を変えたときは、作り直すこと。
  見出しの文や割りつけを変えるときは、scripts/og-build.mjs の中のひな形を直す（ここを直に直すと、作り直したときに消える）。
-->
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1200" />
<title>ひきつぎ会計 共有画像</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=Shippori+Mincho+B1:wght@600;700;800&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&text=0123456789&display=swap" rel="stylesheet" />
<style>
:root {
  --font-sans: "BIZ UDPGothic", "Hiragino Sans", "Yu Gothic UI", "Meiryo", system-ui, sans-serif;
  --font-serif: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif;
  --font-num: "BIZ UDGothic", "BIZ UDPGothic", "Hiragino Sans", "Yu Gothic UI", "Meiryo", sans-serif;
  --shadow-paper: 0 1px 0 rgb(74 60 30 / 0.06), 0 18px 40px -18px rgb(74 60 30 / 0.5);
  --kinari: #f4eee0; --sumi: #211e19; --shu: #c5361b; --rule: #3a8f88; --rule-ink: #1c625d; --sub: #5a5347;
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; background: var(--kinari); color: var(--sumi); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
.og { position: relative; width: 1200px; height: 630px; overflow: hidden; }
/* 上と下の、帳簿の二重線 */
.og::before, .og::after { content: ""; position: absolute; z-index: 0; left: 0; right: 0; height: 5px; border-top: 1.5px solid var(--rule); border-bottom: 1.5px solid var(--rule); }
.og::before { top: 22px; }
.og::after { bottom: 22px; }
.text { position: absolute; left: 76px; top: 70px; width: 640px; }
.brand { display: flex; align-items: center; gap: 16px; font-family: var(--font-serif); font-weight: 700; font-size: 38px; letter-spacing: 0.06em; }
.brand svg { width: 52px; height: 52px; }
h1 { margin: 34px 0 0; font-family: var(--font-serif); font-weight: 800; font-size: 58px; line-height: 1.4; letter-spacing: 0.03em; }
h1 span { display: block; white-space: nowrap; }
.sub { margin: 22px 0 0; font-size: 29px; font-weight: 700; line-height: 1.6; }
.who { position: absolute; left: 76px; bottom: 62px; display: flex; align-items: center; gap: 18px; font-size: 23px; color: var(--sub); }
.chip { border: 2.5px solid var(--shu); color: #a52c14; font-family: var(--font-serif); font-weight: 700; padding: 5px 14px 6px; border-radius: 4px; font-size: 23px; line-height: 1; letter-spacing: 0.08em; }
/* 右の紙。少しかたむけて、下は画面の外へ切る */
.sheet { position: absolute; z-index: 1; left: 724px; top: 70px; width: 440px; transform: rotate(2.2deg); transform-origin: 20% 0; }
.seal { position: absolute; right: -30px; top: -40px; width: 100px; height: 100px; transform: rotate(-8deg); }
${css}
/* 紙の幅を、この画像の中の大きさに合わせる（paper.css の決まりより、あとに書く） */
.sheet .paper { --u: calc(440px / 210); }
</style>
</head>
<body>
<div class="og">
  <div class="text">
    <div class="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="none" stroke="#c5361b" stroke-width="2.6"/><path d="M9 10.5h14M9 16h14M9 21.5h8.5" stroke="#c5361b" stroke-width="2.6" stroke-linecap="round"/></svg>
      ひきつぎ会計
    </div>
    <h1><span>収入と支出を</span><span>入れるだけで、</span><span>総会の資料がそろう。</span></h1>
    <p class="sub">次の担当には、ファイルを1つ渡すだけ。</p>
  </div>
  <div class="who"><span class="chip">登録なし</span>町内会・子ども会・PTA・サークルの会計係に</div>
  <div class="sheet">
    ${paper}
    <svg class="seal" viewBox="0 0 64 64" aria-hidden="true">
      <defs><filter id="k" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></defs>
      <circle cx="32" cy="32" r="28.5" fill="#fffefb" opacity="0.9"/>
      <g filter="url(#k)" fill="none" stroke="#c5361b"><circle cx="32" cy="32" r="27" stroke-width="3.4"/><circle cx="32" cy="32" r="22.5" stroke-width="1" opacity="0.7"/></g>
      <text x="32" y="39" text-anchor="middle" font-family="Shippori Mincho B1, serif" font-weight="800" font-size="19" fill="#c5361b" filter="url(#k)">見本</text>
    </svg>
  </div>
</div>
</body>
</html>
`
  writeFileSync(root + '/scripts/og.html', html)
  console.log('scripts/og.html を書きました', html.length, 'bytes')
} finally {
  await server.close()
}
