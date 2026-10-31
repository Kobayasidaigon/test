// アキヤマネー 静的サイトのビルド
// 使い方: node site/src/build.mjs
//   site/public/   … 公開用の完成HTML（そのままサーバーに置ける）
//   site/artifact/ … claude.ai のArtifactで試作を見るための版（公開には使わない）
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const Calc = require('./calc.js');
const R = require('./render.js');
const data = JSON.parse(readFileSync(join(here, 'data/cities.json'), 'utf8'));
const commentary = JSON.parse(readFileSync(join(here, 'data/commentary.json'), 'utf8'));
const { esc, man } = R;
// 日本語の見出しを句の切れ目でだけ折り返す
const ph = (...parts) => parts.map((t) => `<span class="ph">${t}</span>`).join('');

const SITE = {
  name: 'アキヤマネー',
  tagline: '実家の空き家の10年明細',
  // 公開するドメインが決まったら書き換える（canonical・OGP・sitemap に使う）
  origin: 'https://akiyamoney.example',
  checkedOn: data.checkedOn,
  startYear: 2027, // 明細の「1年目」
  fonts: 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap',
};
const STRUCTURES = { wood: '木造', steel: '鉄骨造', rc: '鉄筋コンクリート造' };
const DEFAULTS = { landSqm: 165, floorSqm: 99, structure: 'wood', builtYear: 1978, builtMonth: 12, inUrbanArea: true, insurance: 30000, management: 48000, mowing: 30000, heirs: 1, landAssessed: 0, houseAssessed: 0, salePrice: 0, demolitionPerTsubo: 0, years: 10, startYear: SITE.startYear };
const OTHER = { slug: 'other', name: 'ほかの市区町村', pref: '', calc: { fixedRate: 0.014, planningRate: 0.003, landPricePerSqm: 50000, subsidy: null, subsidyNote: '市の制度が分かれば、計算の前提ページの方法で足してください', relief: null, utilities: 36000 } };
const cities = data.cities;
const REQUIRED = ['都市計画税の税率', '住宅地の地価公示の平均', '解体の補助金'];

function jaDate(iso) { const [y, m, d] = iso.split('-').map(Number); return `${y}年${m}月${d}日`; }

/** 市のページを検索エンジンに載せてよいか：計算に使う3項目が公式資料で確認でき、出典つきの事実が5件以上 */
function publishable(city) {
  const ok = (f) => f && f.status !== '未確認';
  const required = REQUIRED.every((label) => ok(city.facts.find((f) => f.label === label)));
  const sourced = city.facts.filter((f) => ok(f) && f.source).length;
  return { ok: required && sourced >= 5, sourced, verified: city.facts.filter((f) => f.status === '確認済み').length, pending: city.facts.filter((f) => f.status !== '確認済み').length };
}

function inputFor(city, overrides = {}) {
  const c = city.calc;
  const i = { ...DEFAULTS, utilities: c.utilities, ...overrides };
  i.city = { fixedRate: c.fixedRate, planningRate: c.planningRate, landPricePerSqm: c.landPricePerSqm, subsidy: c.subsidy, relief: c.relief };
  i.structureLabel = STRUCTURES[i.structure];
  i.subsidyNote = c.subsidyNote;
  i.captionText = `${city.name}・土地${i.landSqm}㎡・${STRUCTURES[i.structure]}延床${i.floorSqm}㎡・${i.builtYear}年築の10年明細`;
  return i;
}

// ---------- 部品 ----------
const houseSvg = (title) => `<svg viewBox="0 40 320 160" role="img" aria-label="${esc(title)}"><rect class="lot-ground" x="0" y="168" width="320" height="32"/><polygon class="lot-house-roof" points="56,74 160,42 264,74"/><rect class="lot-house-wall" x="74" y="74" width="172" height="94"/><rect class="lot-house-shutter" x="92" y="88" width="38" height="28"/><rect class="lot-house-shutter" x="190" y="88" width="38" height="28"/><rect class="lot-house-shutter" x="92" y="128" width="38" height="28"/><rect class="lot-house-door" x="146" y="126" width="28" height="42"/><rect class="lot-house-shutter" x="190" y="128" width="38" height="28"/><path class="lot-grass" d="M20 168 l6 -16 l4 16 z M34 168 l5 -11 l5 11 z M262 168 l6 -18 l5 18 z M280 168 l4 -10 l5 10 z M292 168 l6 -15 l4 15 z"/></svg>`;
const lotSvg = (title) => `<svg viewBox="0 40 320 160" role="img" aria-label="${esc(title)}"><rect class="lot-ground" x="0" y="168" width="320" height="32"/><path class="lot-grass" d="M30 168 l6 -20 l4 20 z M46 168 l5 -13 l5 13 z M88 168 l4 -9 l5 9 z M132 168 l6 -17 l4 17 z M150 168 l5 -11 l4 11 z M206 168 l6 -21 l5 21 z M224 168 l4 -12 l5 12 z M266 168 l6 -16 l4 16 z M284 168 l5 -9 l4 9 z"/><rect class="lot-post" x="252" y="122" width="6" height="46"/><rect class="lot-sign" x="226" y="104" width="58" height="26"/><text class="lot-sign-text" x="255" y="122" text-anchor="middle">更地</text></svg>`;

function nav(root) {
  return `<div class="pr-bar"><div class="wrap">このサイトには広告（PR）が含まれます。広告の有無で計算結果は変わりません。<a href="${root}policy.html#ads">広告について</a></div></div>
<header class="site-head"><div class="wrap">
  <a class="wordmark" href="${root}index.html">${SITE.name}<small>${SITE.tagline}</small></a>
  <nav class="site-nav" aria-label="サイト内">
    <a class="nav-link" href="${root}index.html#cities">市区町村</a>
    <a class="nav-link" href="${root}index.html#dates">期限</a>
    <a class="nav-link" href="${root}method.html">計算の前提</a>
    <a class="btn" href="${root}index.html#tool">10年明細を出す</a>
  </nav>
</div></header>`;
}

function footer(root) {
  return `<footer class="site-foot"><div class="wrap">
  <div class="foot-grid">
    <div><div class="foot-name">${SITE.name}</div>
      <p>実家の空き家を、持ち続ける・解体する・売るの3つで比べるための計算サイトです。税率と補助金は各市の公開資料から集め、ページごとに出典と確認日を載せています。</p></div>
    <div><ul>${cities.map((c) => `<li><a href="${root}city/${c.slug}.html">${esc(c.name)}（${esc(c.pref)}）</a></li>`).join('')}</ul></div>
    <div><ul>
      <li><a href="${root}method.html">計算の前提と出典</a></li>
      <li><a href="${root}about.html">運営者について</a></li>
      <li><a href="${root}policy.html">広告・免責・プライバシー</a></li>
    </ul></div>
  </div>
  <p class="foot-legal">計算結果は目安です。実際の税額は毎年届く課税明細書で、補助金は各市の窓口で確かめてください。© 2026 ${SITE.name}</p>
</div></footer>`;
}

function page({ title, description, root, path, body, scripts = '', noindex = false, jsonld = [], modified = SITE.checkedOn }) {
  const url = SITE.origin + '/' + (path === 'index.html' ? '' : path);
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url, dateModified: modified, inLanguage: 'ja', isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.origin + '/' } }, ...jsonld];
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="claude:viewport-fit-sides" content="cover">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${url}">
<meta property="og:type" content="${path === 'index.html' ? 'website' : 'article'}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f2f3ef">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${SITE.fonts}">
<link rel="stylesheet" href="${root}assets/style.css">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
${nav(root)}
<main id="main">
${body}
</main>
${footer(root)}
${scripts}
</body>
</html>
`;
}

function field(id, label, value, unit, hint, attrs = '', cls = '') {
  return `<div class="field${cls ? ' ' + cls : ''}"><label for="${id}">${label}</label><div class="unit-input"><input id="${id}" name="${id}" type="number" inputmode="numeric" value="${value}" ${attrs}${hint ? ` aria-describedby="${id}-hint"` : ''}><span>${unit}</span></div>${hint ? `<span class="hint" id="${id}-hint">${hint}</span>` : ''}</div>`;
}

function tool(city, input, result, { heading = '10年明細を出す' } = {}) {
  const options = [...cities, OTHER].map((c) => `<option value="${c.slug}"${c.slug === city.slug ? ' selected' : ''}>${esc(c.name)}${c.pref ? `（${esc(c.pref)}）` : '（全国の標準で計算）'}</option>`).join('');
  const structures = Object.entries(STRUCTURES).map(([k, v]) => `<label><input type="radio" name="structure" value="${k}"${k === input.structure ? ' checked' : ''}><span>${v}</span></label>`).join('');
  return `<section class="tool" id="tool" aria-labelledby="tool-h">
  <h2 id="tool-h">${heading}</h2>
  <form id="calc" novalidate>
    <div class="field f-city"><label for="city">市区町村</label><select id="city" name="city" aria-describedby="city-hint">${options}</select><span class="hint" id="city-hint">市を変えると、その市の税率と補助金で計算します</span></div>
    ${field('landPrice', '土地の値段（1㎡あたり）', input.city.landPricePerSqm, '円/㎡', '住宅地の地価公示の平均。空欄なら市の値', 'min="0" step="100"', 'f-price')}
    ${field('landSqm', '土地の広さ', input.landSqm, '㎡', '課税明細書の<b>地積</b>', 'min="1"', 'f-third')}
    ${field('floorSqm', '建物の延床面積', input.floorSqm, '㎡', '課税明細書の<b>床面積</b>', 'min="1"', 'f-third')}
    ${field('builtYear', '建てた年', input.builtYear, '年', '1981年5月以前かで控除と補助金が変わる', 'min="1900" max="2026"', 'f-third f-year')}
    <div class="field f-full" id="builtMonthField" hidden><label for="builtMonth">1981年の何月に建てたか</label><select id="builtMonth" name="builtMonth"><option value="5">5月以前（旧耐震）</option><option value="12" selected>6月以降（新耐震）</option></select></div>
    <div class="field f-full"><fieldset><legend>建物の構造</legend><div class="segmented">${structures}</div></fieldset></div>
    <details class="more">
      <summary>課税明細書の数字・費用を変える</summary>
      <div class="more-grid">
        ${field('landAssessed', '土地の評価額', '', '円', '課税明細書の土地の<b>価格</b>。空欄なら地価×0.7で推定', 'min="0" placeholder="推定"')}
        ${field('houseAssessed', '家屋の評価額', '', '円', '課税明細書の家屋の<b>価格</b>。空欄なら推定', 'min="0" placeholder="推定"')}
        ${field('salePrice', '売れそうな額', '', '円', '査定額が分かれば。空欄なら地価から推定', 'min="0" placeholder="推定"')}
        ${field('insurance', '火災保険', input.insurance, '円/年', '空き家は住宅より高くなりやすい', 'min="0" step="1000"')}
        ${field('management', '見回り・管理', input.management, '円/年', '通う交通費か管理サービス代', 'min="0" step="1000"')}
        ${field('utilities', '水道・電気の基本料金', input.utilities, '円/年', '止めずに契約を続ける場合', 'min="0" step="1000"')}
        ${field('mowing', '草刈り・庭木', input.mowing, '円/年', '更地にしても続く', 'min="0" step="1000"')}
        ${field('demolitionPerTsubo', '解体費の坪単価', '', '円/坪', '見積もりがあれば。空欄なら構造ごとの目安', 'min="0" step="1000" placeholder="目安"')}
        <div class="field"><label for="heirs">家と土地を相続した人数</label><select id="heirs" name="heirs" aria-describedby="heirs-hint"><option value="1" selected>1人</option><option value="2">2人（共有）</option><option value="3">3人以上（共有）</option></select><span class="hint" id="heirs-hint">3人以上なら空き家の控除は1人2,000万円</span></div>
        <label class="check"><input type="checkbox" id="inUrbanArea" name="inUrbanArea"${input.inUrbanArea ? ' checked' : ''}> 市街化区域にある（都市計画税がかかる）</label>
      </div>
    </details>
  </form>
  <div class="result" id="result" aria-live="polite">${resultHtml(input, result)}</div>
</section>`;
}

function resultHtml(input, r) {
  return `<p class="finding">${R.finding(r)}</p>
<div class="chart-box">${R.legend()}${R.chart(r).replace('<svg class="chart"', '<svg class="chart draw"')}</div>
${R.statement(r, input)}
<p class="hint result-note">土地の評価額${man(r.assumptions.landAssessed)}${r.assumptions.estimatedLand ? '（地価×0.7で推定）' : ''}、家屋の評価額${man(r.assumptions.houseAssessed)}${r.assumptions.estimatedHouse ? '（築年数が経った家の目安で推定）' : ''}で計算しました。売却額は地価からの推定です。実際の査定額を「売れそうな額」に入れると、3つの比べ方が変わります。<a href="#sell">値段の調べ方</a></p>`;
}

/** 課税明細書（見本）。入力に合わせて app.js が数字を入れ替える */
function slip(city, input, r) {
  const t = r.keep.annualTax;
  const small = Math.min(input.landSqm, 200, input.floorSqm * 10);
  const row = (label, key, value) => `<tr><th scope="row">${label}</th><td data-bind="${key}">${value}</td></tr>`;
  return `<figure class="slip-fig">
<table class="slip">
  <caption><span class="slip-mark">見本</span>固定資産税・都市計画税 課税明細書</caption>
  <tbody>
    <tr class="slip-sub"><th scope="row" colspan="2">土地　<span data-bind="slip-city">${esc(city.name)}</span>（モデルケース）</th></tr>
    ${row('地積', 'slip-area', `${input.landSqm.toFixed(2)}㎡`)}
    ${row('価格（評価額）', 'slip-landval', R.yen(r.assumptions.landAssessed))}
    ${row('小規模住宅用地', 'slip-small', `${small.toFixed(2)}㎡`)}
    ${row('固定資産税 課税標準額', 'slip-base', R.yen(t.bases.landFixed))}
    ${row('都市計画税 課税標準額', 'slip-pbase', R.yen(t.bases.landPlanning))}
    <tr class="slip-sub"><th scope="row" colspan="2">家屋　<span data-bind="slip-structure">${esc(STRUCTURES[input.structure])}</span></th></tr>
    ${row('床面積', 'slip-floor', `${input.floorSqm.toFixed(2)}㎡`)}
    ${row('価格（評価額）', 'slip-houseval', R.yen(r.assumptions.houseAssessed))}
    <tr class="slip-total"><th scope="row">年税額（相当）</th><td data-bind="slip-tax">${R.yen(t.total)}</td></tr>
  </tbody>
</table>
<figcaption>毎年4〜6月に届く納税通知書に入っている明細の見本です。手元の明細の<b>地積</b>と<b>価格</b>を明細ツールに入れると、計算が実際の税額に近づきます。</figcaption>
</figure>`;
}

function citiesTable(root) {
  const rows = cities.map((c) => {
    const r = Calc.compare(inputFor(c));
    const relief = c.facts.find((f) => f.label === '解体後の固定資産税の減免');
    const rate = c.facts.find((f) => f.label === '空き家率');
    const planning = c.facts.find((f) => f.label === '都市計画税の税率');
    return `<tr><th scope="row"><a href="${root}city/${c.slug}.html">${esc(c.name)}</a><span class="row-note">${esc(c.pref)}・${esc(c.kind)}</span></th>
<td data-label="都市計画税">${esc(planning.value.replace('で計算', ''))}${planning.status !== '確認済み' ? ' <span class="unverified">要確認</span>' : ''}</td>
<td data-label="解体の補助金">${esc(c.calc.subsidyNote.split('。')[0])}</td>
<td data-label="解体後の減免">${esc(relief.value)}</td>
<td data-label="空き家率" class="n">${esc(rate.value.split('（')[0])}<span class="row-note">${rate.asOf ? esc(rate.asOf.slice(0, 5)) : ''}</span></td>
<td data-label="持ち続けて10年" class="n">${man(r.keep.total)}</td><td data-label="解体して10年" class="n">${man(r.clear.total)}</td></tr>`;
  }).join('');
  return `<div class="city-table-wrap"><table class="city-table">
<caption>都市計画税の税率、解体の補助金、解体後の減免、地価。同じ家でも、市が違えば10年の総額が変わります。10年の金額は、土地165㎡・木造延床99㎡・1978年築のモデルケースです。いまは3市で、政令指定都市・中核市・空き家率の高い市から順に増やします。</caption>
<thead><tr><th scope="col">市</th><th scope="col">都市計画税</th><th scope="col">解体の補助金</th><th scope="col">解体後の減免</th><th scope="col">${ph('空き家率')}</th><th scope="col">${ph('持ち続けて', '10年')}</th><th scope="col">${ph('解体して', '10年')}</th></tr></thead>
<tbody>${rows}</tbody></table></div>`;
}

function sellSection(root, city) {
  const where = city ? `${city.name}で` : '';
  const bank = city && city.facts.find((f) => f.label === '空き家バンク' && f.status === '確認済み');
  const desk = city && city.facts.find((f) => f.label === '相談窓口' && f.status === '確認済み');
  const publicOptions = city
    ? `<p>広告ではない選択肢として、${esc(city.name)}${bank ? `の<a href="${esc(bank.source)}" rel="noopener">空き家バンク</a>` : ''}${bank && desk ? 'や' : 'の'}${desk ? `相談窓口（${esc(desk.value)}）` : '空き家の相談窓口'}もあります。相続や登記の相談は、市が専門家団体と連携して受けている場合があります。</p>`
    : '<p>広告ではない選択肢として、市の空き家バンクや空き家の相談窓口もあります。各市のページに窓口を載せています。</p>';
  return `<section class="on-field sell" id="sell" aria-labelledby="sell-h"><div class="wrap sell-grid">
  <div class="prose sell-text">
    <h2 id="sell-h">${ph(where + '売ると決めたら、', '先に値段を知る')}</h2>
    <p class="disclosure"><span class="pr">広告</span>このあとの比較表のボタンは広告です。申し込みがあると、このサイトに紹介料が入ります。紹介料の額で、計算の結果や説明の順番は変えていません。</p>
    <p>10年明細の「1年目に売る」の列は、地価の平均から出した推定です。実際にいくらで売れるかが分かると、持ち続けるか売るかを自分の数字で比べられます。</p>
    <p>不動産の一括査定は、1回の入力で複数の不動産会社に査定を頼めるサービスです。査定を頼んでも、売る義務はありません。ただし複数の会社から電話やメールが来ます。相場より高い査定額で媒介契約を取ろうとする会社もあるので、査定額の根拠を聞いて比べます。</p>
    ${publicOptions}
  </div>
  <div class="offer-wrap">
    <table class="offer-table">
      <caption><span class="pr">PR</span>売り方の比べ方</caption>
      <thead><tr><th scope="col"><span class="sr">項目</span></th><th scope="col">一括査定（仲介で売る）</th><th scope="col">買取</th></tr></thead>
      <tbody>
        <tr><th scope="row">向いている家</th><td>普通に売れそうな家・古家付き土地</td><td>古くて売りにくい家、共有名義、再建築不可</td></tr>
        <tr><th scope="row">値段</th><td>相場どおりを狙える</td><td>仲介より低くなるのが一般的</td></tr>
        <tr><th scope="row">売れるまで</th><td>数か月かかることがある</td><td>早い</td></tr>
        <tr><th scope="row">仲介手数料</th><td>かかる</td><td>かからない</td></tr>
        <tr><th scope="row">連絡</th><td>複数社から電話・メール</td><td>申し込んだ会社から</td></tr>
      </tbody>
      <tfoot><tr><th scope="row"><span class="sr">申し込み</span></th><td><a class="btn" href="${root}policy.html#ad-satei" data-ad="satei">一括査定を申し込む</a></td><td><a class="btn btn-quiet" href="${root}policy.html#ad-kaitori" data-ad="kaitori">買取の査定を申し込む</a></td></tr></tfoot>
    </table>
  </div>
</div></section>`;
}

function datesSection() {
  const items = [
    ['毎年', '1月1日', 'この日の持ち主と土地の状態で、その年度の固定資産税が1年分決まります。2025年12月に解体すると2026年度から、2026年1月2日に解体すると2027年度から土地の税が上がります。数日の違いで1年ずれます。売った年の税は、売買のときに日割りで精算することが多く、精算金は売却額に含めて税を計算します。'],
    ['', '1981年5月31日', 'この日までに建てた家だけが、相続した空き家を売ったときの3,000万円の特別控除の対象です。解体の補助金も、北九州市のようにこの日付で線を引く市があります。'],
    ['相続から', ['3年を過ぎた年の', '12月31日'], '3,000万円控除を使うには、この日までに売る必要があります。例えば2024年3月に相続したなら、2027年12月31日までです。家と土地を3人以上で相続した場合、控除は1人2,000万円です。'],
    ['', '2027年12月31日', '3,000万円控除という制度そのものの期限です。国土交通省は4年延長と要件の緩和を要望していて、2026年12月の税制改正大綱で決まる見込みです。'],
    ['毎年', '4月ごろ', '多くの市で、解体の補助金の受付が始まります。宇都宮市は令和7年度が4月1日〜5月30日の約2か月だけ。北九州市は令和8年度の判定依頼が4月20日〜12月21日で、予算に達し次第終わります。'],
  ];
  return `<section class="section" id="dates" aria-labelledby="dates-h"><div class="wrap">
  <h2 id="dates-h" class="section-title">空き家には締め切りがある</h2>
  <ol class="dates">${items.map(([pre, w, t]) => `<li><p class="when">${pre ? `<span class="when-pre">${pre}</span>` : ''}${Array.isArray(w) ? ph(...w) : ph(w)}</p><p>${t}</p></li>`).join('')}</ol>
</div></section>`;
}

function tokureiSection(r, cityName) {
  return `<section class="section" id="tokurei" aria-labelledby="tokurei-h"><div class="wrap">
  <h2 id="tokurei-h" class="section-title">${ph('家を壊すと、', '土地の税は', '<span data-bind="jump">' + R.jumpText(r) + '</span>になる')}</h2>
  <div class="jump-grid">
    <figure class="lot"><div class="lot-pic">${houseSvg('雨戸を閉めた2階建ての家が建つ土地')}</div><figcaption class="lot-figcap"><span class="lot-tax" data-bind="keepLand">${man(r.clear.keepLandTax)}</span><span class="lot-cap">家が建っている土地の税（1年）</span></figcaption></figure>
    <figure class="lot"><div class="lot-pic">${lotSvg('解体したあとの更地')}</div><figcaption class="lot-figcap"><span class="lot-tax up" data-bind="clearLand">${man(r.clear.clearLandTax)}</span><span class="lot-cap">更地にした後の土地の税（1年）</span></figcaption></figure>
  </div>
  <div class="prose tokurei-text">
    <p>上の明細に入れた条件（最初は${esc(cityName)}・土地165㎡のモデルケース）で計算した、固定資産税と都市計画税の土地の分です。</p>
    <p>家が建っている土地は「住宅用地の特例」で、税の計算のもとになる額が下げられています。200㎡までの部分は、固定資産税が評価額の1/6、都市計画税が1/3です。解体して更地にすると特例がなくなり、評価額の70%で計算されます。固定資産税は0.7÷1/6で約4.2倍、都市計画税は0.7÷1/3で2.1倍。税率0.3%の都市計画税と合わせると、200㎡以下の土地では約3.6倍になります。</p>
    <h3>壊さなくても上がることがある</h3>
    <p>2023年12月13日に改正空家法が施行され、「管理不全空家」ができました。放っておくと危ない空き家になりそうだとして市から勧告を受けると、家が建っていても特例が外れます。1月1日の時点で勧告を受けたままだと、その年度は特例が外れます。修繕などをして、市に勧告を撤回してもらう必要があります。</p>
    <p>勧告がなくても、長く住む見込みがなく、住むための管理もされていない家は「住宅」として扱われず、特例が外れることがあります。明細の「見回り・管理」は、こうした扱いを避けるための費用でもあります。</p>
  </div>
</div></section>`;
}

// ---------- ページ ----------
function home() {
  const city = cities[0];
  const input = inputFor(city);
  const r = Calc.compare(input);
  const body = `
<section class="hero"><div class="wrap">
  <h1 class="rise">${ph('実家の空き家、', '10年でいくら？')}</h1>
  <div class="hero-grid">
  <div class="hero-side">
    <p class="lead rise d1">固定資産税、見回りの交通費、解体費、売ったときの手取り。持ち続ける・解体する・売るの3つを、市の税率と補助金で10年分計算します。</p>
    <p class="asof rise d2">税率・補助金は各市の公開資料から。各市のページに確認日と出典があります。</p>
    ${slip(city, input, r)}
  </div>
  ${tool(city, input, r)}
  </div>
</div></section>
${tokureiSection(r, city.name)}
${datesSection()}
<section class="section" id="cities" aria-labelledby="cities-h"><div class="wrap">
  <h2 id="cities-h" class="section-title">市によって違うところ</h2>
  ${citiesTable('')}
</div></section>
${sellSection('', null)}`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.origin + '/', inLanguage: 'ja' },
  ];
  return page({ title: '実家の空き家の維持費は10年でいくら？固定資産税・解体・売却を比較｜アキヤマネー', description: '実家の空き家を持ち続ける・解体する・売るの3つで、固定資産税・管理費・解体費・売却の手取りを10年分計算。市の税率と補助金を出典つきで反映します。', root: '', path: 'index.html', body, scripts: scripts('', city.slug, false), jsonld: ld });
}

function cityPage(city) {
  const root = '../';
  const input = inputFor(city);
  const r = Calc.compare(input);
  const pub = publishable(city);
  const checked = city.checkedOn || SITE.checkedOn;
  const rows = city.facts.map((f) => `<tr><th scope="row">${esc(f.label)}</th><td><span class="val">${esc(f.value)}</span>${f.status !== '確認済み' ? ` <span class="unverified">${f.status === '一部確認' ? '一部確認' : '要確認'}</span>` : ''}${f.note ? `<span class="fact-note">${esc(f.note)}</span>` : ''}${f.source ? `<span class="src">出典：<a href="${esc(f.source)}" rel="noopener">${esc(f.source.replace(/^https?:\/\//, '').split('/')[0])}</a>${f.asOf ? `（${esc(f.asOf)}）` : ''}</span>` : ''}</td></tr>`).join('');
  const others = cities.filter((c) => c.slug !== city.slug).map((c) => `<a href="${root}city/${c.slug}.html">${esc(c.name)}</a>`).join('・');
  const subsidy = city.facts.find((f) => f.label === '解体の補助金');
  const computed = `土地165㎡・木造延床99㎡・1978年築のモデルケースでは、持ち続けると10年で${man(r.keep.total)}、解体して更地で持つと${man(r.clear.total)}かかります。${R.finding(r).replace(/<[^>]+>/g, '').replace('この条件だと、', '')}`;
  const notice = pub.ok ? '' : `<p class="notice">このページは、計算に使う数字のうち公式資料で確かめきれていないものがあるため、検索エンジンには載せていません（確認済み${pub.verified}件・確認中${pub.pending}件）。</p>`;
  const body = `
<div class="wrap crumbs"><ol><li><a href="${root}index.html">トップ</a></li><li>${esc(city.pref)}</li><li aria-current="page">${esc(city.name)}</li></ol></div>
<section class="hero"><div class="wrap">
  <h1 class="rise">${ph(esc(city.name) + 'の空き家、', '10年でいくら？')}</h1>
  <div class="hero-grid">
  <div class="hero-side">
    <p class="lead rise d1">${esc(city.summary)}</p>
    <p class="asof rise d2">明細は、土地165㎡・木造延床99㎡・1978年築のモデルケースを、${esc(city.name)}の数字で計算したものです。<span class="nw">最終確認日 <time datetime="${checked}">${jaDate(checked)}</time></span></p>
    ${notice}
    ${slip(city, input, r)}
  </div>
  ${tool(city, input, r, { heading: `${city.name}の10年明細` })}
  </div>
</div></section>
<section class="section" id="facts" aria-labelledby="facts-h"><div class="wrap facts-grid">
  <div class="prose city-notes">
    <h2 id="facts-h" class="section-title">${esc(city.name)}の空き家で知っておくこと</h2>
    ${(commentary[city.slug] || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    <p>${esc(computed)}</p>
    <p class="hint">ほかの市と比べる：${others}</p>
  </div>
  <div class="facts-table-wrap">
    <table class="facts-table"><caption>計算に使った数字と出典（確認済み${pub.verified}件・確認中${pub.pending}件）</caption><tbody>${rows}</tbody></table>
  </div>
</div></section>
${sellSection(root, city)}`;
  const capText = subsidy && subsidy.value.includes('上限') ? subsidy.value.replace(/^[^：]*：/, '') : '';
  const description = `${city.name}の空き家を10年持つと約${man(r.keep.total)}、解体して更地で持つと約${man(r.clear.total)}（土地165㎡・木造99㎡の例）。${capText ? `解体の補助金は${capText}、` : ''}都市計画税${city.calc.planningRate * 100}%で計算。出典つき。`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.origin + '/' },
    { '@type': 'ListItem', position: 2, name: city.pref },
    { '@type': 'ListItem', position: 3, name: city.name, item: `${SITE.origin}/city/${city.slug}.html` },
  ] }];
  return { pub, html: page({ title: `${city.name}の空き家の維持費・解体補助金・売却を10年で比較｜${SITE.name}`, description, root, path: `city/${city.slug}.html`, body, scripts: scripts(root, city.slug, true), noindex: !pub.ok, jsonld: ld, modified: checked }) };
}

function methodPage() {
  const nta = (n) => `https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/${n}.htm`;
  const chihozei = 'https://laws.e-gov.go.jp/law/325AC0000000226';
  const rules = [
    ['固定資産税の税率', '課税標準額の1.4%（標準税率）。標準と違う税率の市は、その市のページで変えています。', chihozei, '地方税法350条'],
    ['都市計画税の税率', '市町村の条例で決まり、上限は0.3%。原則として市街化区域内の土地と家屋にかかります。', 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/149767_10.html', '総務省'],
    ['住宅用地の特例', '200㎡以下の部分は、固定資産税の課税標準が評価額の1/6、都市計画税が1/3。200㎡を超える部分（床面積の10倍まで）は1/3と2/3。', 'https://www.mlit.go.jp/jutakukentiku/house/content/002019834.pdf', '国土交通省'],
    ['更地にしたとき', '特例がなくなり、評価額の70%で計算します。200㎡以下の部分は固定資産税が約4.2倍、都市計画税が2.1倍（京丹後市の説明も同じ）。用途が変わった土地は前の年も更地だったとみなして計算されるため、通常は翌年度にまとめて上がります。負担調整措置は2026年度までの時限措置で、2027年度以降は税制改正で決まります。', 'https://www.city.kyotango.lg.jp/material/files/group/35/pamphlet.pdf', '京丹後市'],
    ['管理不全空家と特定空家', '2023年12月13日施行の改正空家法で、管理不全空家にも勧告ができるようになりました。1月1日の時点で勧告を受けたままだと、その年度は特例が外れます。', 'https://www.tax.metro.tokyo.lg.jp/kazei/real_estate/kotei_tosi/tokuteiakiya', '東京都主税局'],
    ['土地の評価額', '宅地は地価公示価格の約7割を目安に評価額が決まります。明細では「地価×0.7×面積」で推定します。評価額は評価替えの年（2024年度、次は2027年度）の地価で決まるので、最新の地価公示とは少しずれます。', 'https://www.city.kitakyushu.lg.jp/contents/26001061.html', '北九州市'],
    ['家屋の評価額', '再建築価格×経年減点補正率。木造専用住宅の補正率は0.20が下限で、その後は据え置き。明細では、築年数が経った家の目安として木造1万6千円/㎡（推定）を使います。課税明細書の「価格」を入れてください。', 'https://www.city.sendai.jp/sisanze-chose/kurashi/tetsuzuki/zekin/kekaku/tebiki/documents/kaoku_hyouka_aramashi_202404.pdf', '仙台市'],
    ['免税点', '同じ市区町村にある課税標準額の合計が、土地30万円未満・家屋20万円未満なら固定資産税はかかりません。明細はこの家と土地だけで判定しています。同じ市にほかの土地や家屋を持っているときは、課税明細書の合計で判定されます。', chihozei, '地方税法351条'],
    ['空き家の3,000万円特別控除', '主な要件：1981年5月31日以前に建てた家（区分所有でないもの）／相続の直前まで亡くなった人が1人で住んでいた（老人ホームの特例あり）／相続後に貸したり住んだりしていない／相続から3年を過ぎた年の12月31日まで、かつ2027年12月31日までに、1億円以下で売る／耐震改修か解体をする（2024年からは買主が売った翌年2月15日までにしてもよい）／市区町村の確認書を取る。家と土地を3人以上で相続した場合は1人2,000万円。明細の「1年目に売る」は、要件を満たして控除を使えた場合の税で、使えない場合の税も注記しています。', nta(3306), '国税庁 No.3306'],
    ['譲渡所得の税', '長期譲渡所得は20.315%（所得税15.315%・住民税5%）。取得費が分からないときは売却額の5%を取得費にできます。', nta(3208), '国税庁 No.3208・No.3258'],
    ['仲介手数料', '売却額×3%＋6万円＋消費税（400万円超の場合の上限）。明細はこの通常の上限で計算しています。800万円以下の空き家などは、事前に説明して合意すれば最大30万円＋消費税まで受け取れる特例があります。', '', '令和6年国土交通省告示第949号'],
    ['解体費', '木造4万円/坪、鉄骨造5.5万円/坪、鉄筋コンクリート造7万円/坪を目安にしています。公的な単価の資料は見つかっていません。見積もりを取ったら「解体費の坪単価」に入れてください。', '', ''],
    ['相続土地国庫帰属制度', '建物がある土地は申請できません。審査手数料は1筆14,000円、負担金は原則20万円（市街化区域の宅地などは面積で計算）。明細には入れていません。', 'https://www.moj.go.jp/MINJI/minji05_00457.html', '法務省'],
  ];
  const body = `<div class="wrap doc">
<h1>計算の前提と出典</h1>
<div class="prose">
<p>アキヤマネーの10年明細は、次の決まりと目安で計算しています。ブラウザで動く計算と、各市のページに書き出した表は、同じ計算の式を使っています。数字や制度の誤りを見つけたら、運営者まで知らせてください。</p>
<p class="asof">このページの最終確認日 <time datetime="${SITE.checkedOn}">${jaDate(SITE.checkedOn)}</time></p>
</div>
<div class="table-wrap method-table"><table><thead><tr><th scope="col">項目</th><th scope="col">明細での扱い</th><th scope="col">出典</th></tr></thead><tbody>
${rules.map(([a, b, s, label]) => `<tr><th scope="row">${a}</th><td>${b}</td><td class="src-cell">${s ? `<a href="${s}" rel="noopener">${esc(label)}</a>` : (label ? esc(label) : '—')}</td></tr>`).join('')}
</tbody></table></div>
<div class="prose">
<h2>明細に入れていないもの</h2>
<p>家の修繕費、雪下ろし、相続登記の費用、遺品の片付け、売れるまでの期間、地価の上がり下がり、売った年の税の日割り精算で買主から戻る分。</p>
<h2>データの更新</h2>
<p>税率と補助金は毎年度変わります。毎年3月から5月に全市を見直し、各市のページに最終確認日を出します。公式資料で確かめきれない値には「要確認」と表示し、補助金は確認できるまで計算に入れません。計算に使う3項目（都市計画税・地価・解体の補助金）が確認できていない市のページは、検索エンジンに載せていません。</p>
<h2>変更履歴</h2>
<ul><li><time datetime="2026-10-31">2026年10月31日</time>　試作版を公開</li></ul>
</div></div>`;
  return page({ title: `計算の前提と出典｜${SITE.name}`, description: '空き家の10年明細で使っている税率・特例・控除・目安の一覧と出典。', root: '', path: 'method.html', body });
}

function aboutPage() {
  const body = `<div class="wrap doc"><h1>運営者について</h1><div class="prose">
<p><strong>〔運営者名〕</strong>が1人で運営しています。車の維持費を車種ごとに計算するサイト「ノリマネー」も運営しています。税理士・司法書士などの資格は持っていません。</p>
<p>〔ここに、実家や親族の家が空き家になった経験と、なぜこのサイトを作ったかを、運営者自身の言葉で3〜5文書いてください。自分で撮った空き家の写真や、自分の課税明細書で試算した結果（金額は伏せてよい）を載せると、このサイトでいちばん代わりのきかない情報になります。〕</p>
<h2>編集の方針</h2>
<p>税率・補助金・地価は、市や県、国の公開資料から集め、ページごとに出典のURLと確認日を書いています。公式資料で確かめきれていない値には「要確認」と表示し、補助金は確かめられるまで計算に入れません。</p>
<p>このサイトは広告（アフィリエイト）で運営しています。広告の有無や紹介料の額で、計算の結果や説明の順番は変えていません。</p>
<h2>連絡先</h2>
<p>〔お問い合わせフォームのURLかメールアドレス〕</p>
</div></div>`;
  return page({ title: `運営者について｜${SITE.name}`, description: 'アキヤマネーの運営者と編集の方針。', root: '', path: 'about.html', body });
}

function policyPage() {
  const body = `<div class="wrap doc"><h1>広告・免責・プライバシー</h1><div class="prose">
<h2 id="ads">広告について</h2>
<p>このサイトは、アフィリエイト・サービス・プロバイダ（ASP）を通じた広告を掲載しています。広告には「PR」または「広告」と表示しています。広告から申し込みがあると、このサイトに紹介料が入ります。</p>
<p id="ad-satei"><strong>不動産一括査定の広告枠：</strong>〔提携後、ASPの広告タグを改変せずに貼る。サービス名と運営会社名を枠に表示する〕</p>
<p id="ad-kaitori"><strong>空き家・訳あり物件買取の広告枠：</strong>〔提携後、ASPの広告タグを改変せずに貼る〕</p>
<h2>免責</h2>
<p>10年明細の金額は、公開資料と目安から出した概算です。実際の固定資産税は毎年届く課税明細書、補助金の対象と金額は各市の窓口、譲渡所得の税は税務署か税理士に確かめてください。このサイトの情報をもとにした判断で生じた損害について、運営者は責任を負いません。</p>
<h2>プライバシー</h2>
<p>計算に入力した数字は、あなたのブラウザの中だけで計算し、送信も保存もしていません。</p>
<p>広告の配信と成果の計測のため、提携するASPや広告主がCookieなどを使うことがあります。Cookieはブラウザの設定で無効にできます。</p>
<p>文字の表示にGoogle Fontsを使っているため、ページを開くとあなたのIPアドレスなどがGoogleに送られます。</p>
<p>〔アクセス解析を入れる場合は、ツール名とCookieの利用をここに書く〕</p>
</div></div>`;
  return page({ title: `広告・免責・プライバシー｜${SITE.name}`, description: 'アキヤマネーの広告の表示、免責、プライバシーについて。', root: '', path: 'policy.html', body });
}

function scripts(root, slug, isCityPage) {
  const cfg = {
    defaults: DEFAULTS,
    structures: STRUCTURES,
    current: slug,
    isCityPage,
    root,
    cities: Object.fromEntries([...cities, OTHER].map((c) => [c.slug, { name: c.name, calc: c.calc }])),
  };
  return `<script type="application/json" id="akiya-data">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
<script src="${root}assets/calc.js"></script>
<script src="${root}assets/render.js"></script>
<script src="${root}assets/app.js"></script>`;
}

// ---------- 書き出し ----------
const out = join(here, '..', 'public');
const art = join(here, '..', 'artifact');
for (const d of [out, art]) { if (existsSync(d)) rmSync(d, { recursive: true }); mkdirSync(join(d, 'assets'), { recursive: true }); mkdirSync(join(d, 'city'), { recursive: true }); }

const pages = { 'index.html': home(), 'method.html': methodPage(), 'about.html': aboutPage(), 'policy.html': policyPage() };
const indexable = ['index.html', 'method.html', 'about.html', 'policy.html'];
for (const c of cities) {
  const { pub, html } = cityPage(c);
  pages[`city/${c.slug}.html`] = html;
  if (pub.ok) indexable.push(`city/${c.slug}.html`);
  console.log(`${c.name}: ${pub.ok ? '公開' : 'noindex'}（出典つき${pub.sourced}件・確認済み${pub.verified}件・確認中${pub.pending}件）`);
}
for (const [p, html] of Object.entries(pages)) {
  writeFileSync(join(out, p), html);
  writeFileSync(join(art, p), html);
}
for (const f of ['calc.js', 'render.js']) { copyFileSync(join(here, f), join(out, 'assets', f)); copyFileSync(join(here, f), join(art, 'assets', f)); }
for (const f of ['style.css', 'app.js']) { copyFileSync(join(here, 'assets', f), join(out, 'assets', f)); copyFileSync(join(here, 'assets', f), join(art, 'assets', f)); }

// sitemap.xml / robots.txt（noindex の市は sitemap に入れない）
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${SITE.origin}/${p === 'index.html' ? '' : p}</loc><lastmod>${SITE.checkedOn}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.origin}/sitemap.xml\n`);

// Artifact版のトップ：doctype/html/head/body を外す（公開時に包まれるため）。名前だけの title にする。
const top = pages['index.html'];
const headInner = top.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\n?/, '').replace(/<meta name="viewport"[^>]*>\n?/, '')
  .replace(/<title>[^<]*<\/title>/, `<title>${SITE.name}</title>`);
const bodyInner = top.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(join(art, 'index.html'), headInner.trim() + '\n' + bodyInner.trim() + '\n');

// 公開前チェック：埋め字（〔…〕）が残っているページを知らせる
const placeholders = Object.entries(pages).filter(([, h]) => h.includes('〔')).map(([p]) => p);
console.log(`built ${Object.keys(pages).length} pages → site/public, site/artifact`);
if (placeholders.length) console.log(`公開前に埋める〔〕が残っているページ: ${placeholders.join(', ')}`);
if (SITE.origin.includes('.example')) console.log('公開前に SITE.origin を本番のドメインに書き換えてください');
