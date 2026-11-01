import { html, esc, jdate } from './lib.mjs'
import { site } from './config.mjs'

// ctx: { path, href(to), asset(name), builtAt }
export function layout(ctx, { title, description, body, jsonld = null, scripts = [] }) {
  const h = (to) => ctx.href(ctx.path, to)
  const fullTitle = ctx.path === '/' ? `${site.name}｜${site.tagline}` : `${title}｜${site.name}`
  const canonical = site.baseUrl.replace(/\/$/, '') + ctx.path
  const nav = [
    ['/tool/', '計算する'],
    ['/area/', '市町村の補助金'],
    ['/guide/', '解説'],
    ['/about/', '運営者'],
  ]
  return html`<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ctx.path === '/' ? 'website' : 'article'}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta name="theme-color" content="#1c3a2b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap">
<link rel="stylesheet" href="${ctx.asset('style.css')}">
<link rel="icon" href="${ctx.asset('favicon.svg')}" type="image/svg+xml">
<script>document.documentElement.classList.add('js')</script>
${jsonld ? html`<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">本文へ</a>
<header class="bar">
  <div class="wrap">
    <a class="wordmark" href="${h('/')}">${esc(site.name)}</a>
    <nav aria-label="サイト内">
      ${nav.map(([to, label]) => html`<a href="${h(to)}"${ctx.path.startsWith(to) ? ' aria-current="page"' : ''}>${label}</a>`)}
      <a class="btn" href="${h('/tool/')}">自分の家で計算する</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <p class="closing">決めるのは家族です。<br>数字はここで揃えます。</p>
    <div class="cols">
      <div>
        <p><strong>広告について。</strong>${esc(site.adPolicy)}</p>
        <p>補助制度は年度ごとに変わり、予算に達すると受付が終わります。申請の前に、必ず市町村の担当課に確かめてください。税と法律の個別の判断は、税務署・法務局・専門家にご相談ください。</p>
      </div>
      <ul>
        <li><a href="${h('/tool/')}">判定ツール</a></li>
        <li><a href="${h('/area/')}">市町村の補助金</a></li>
        <li><a href="${h('/data/kaitai-hojo/')}">補助制度の一覧データ</a></li>
        <li><a href="${h('/guide/')}">解説</a></li>
      </ul>
      <ul>
        <li><a href="${h('/about/')}">運営者と編集方針</a></li>
        <li><a href="${h('/log/')}">確認記録と更新履歴</a></li>
        <li><a href="${h('/privacy/')}">プライバシーポリシー</a></li>
      </ul>
    </div>
    <p class="base">最終更新 ${jdate(ctx.builtAt)}　© ${esc(site.name)}</p>
  </div>
</footer>
<script>
(function(){
  var h=window.innerHeight,i=0;
  document.querySelectorAll('.hero h1, .hero .lead, .hero-actions, .hero .ledger, .rise').forEach(function(e){
    if(e.getBoundingClientRect().top<h){e.classList.add('rise','enter');e.style.animationDelay=(Math.min(i++,5)*75)+'ms'}
  });
})();
</script>
${scripts.map((s) => html`<script type="module" src="${ctx.asset(s)}"></script>`)}
</body>
</html>
`
}

// 家の立面図。データから描く: 階数・雨戸の数。装飾ではなく「この題材の絵」として使う。
export function houseSvg({ floors = 2, label = '雨戸を閉めた木造2階建ての空き家の立面図' } = {}) {
  const w = 560, h = floors === 2 ? 420 : 320
  const wallTop = floors === 2 ? 150 : 150
  const wallBottom = h - 60
  return html`<svg class="house" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <rect class="ground" x="0" y="${wallBottom}" width="${w}" height="60"/>
  <polygon class="roof" points="40,${wallTop} 280,40 520,${wallTop}"/>
  <rect class="wall" x="80" y="${wallTop}" width="400" height="${wallBottom - wallTop}"/>
  ${floors === 2 ? html`<rect class="roof" x="60" y="${wallTop + 105}" width="440" height="14"/>
  <rect class="shutter" x="120" y="${wallTop + 25}" width="110" height="64"/>
  <rect class="shutter" x="330" y="${wallTop + 25}" width="110" height="64"/>` : ''}
  <rect class="shutter" x="120" y="${wallBottom - 110}" width="150" height="88"/>
  <rect class="door" x="350" y="${wallBottom - 120}" width="70" height="120"/>
  <path class="weed" d="M0 ${wallBottom} q12 -34 20 0 q10 -44 22 0 q8 -30 16 0 q14 -40 24 0 z"/>
  <path class="weed" d="M470 ${wallBottom} q10 -38 18 0 q12 -50 22 0 q8 -30 18 0 q10 -36 22 0 q8 -26 10 0 z"/>
</svg>`
}
