// アキヤマネー 静的サイトのビルド
// 使い方: node site/src/build.mjs
//   site/public/   … 公開用の完成HTML（そのままサーバーに置ける）
//   site/artifact/ … claude.ai のArtifactで見るための版（トップだけ head/body なし）
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const Calc = require('./calc.js');
const R = require('./render.js');
const data = JSON.parse(readFileSync(join(here, 'data/cities.json'), 'utf8'));
const { esc, man } = R;
// 日本語の見出しを句の切れ目でだけ折り返す
const ph = (...parts) => parts.map((t) => `<span class="ph">${t}</span>`).join('');

const SITE = {
  name: 'アキヤマネー',
  tagline: '実家の空き家の10年明細',
  checkedOn: data.checkedOn,
  fonts: 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap',
};
const STRUCTURES = { wood: '木造', steel: '鉄骨造', rc: '鉄筋コンクリート造' };
const DEFAULTS = { landSqm: 165, floorSqm: 99, structure: 'wood', builtYear: 1978, builtMonth: 12, inUrbanArea: true, insurance: 30000, management: 48000, mowing: 30000, manyHeirs: false, landAssessed: 0, houseAssessed: 0, salePrice: 0, demolitionPerTsubo: 0, years: 10 };
const OTHER = { slug: 'other', name: 'ほかの市区町村', pref: '', calc: { fixedRate: 0.014, planningRate: 0.003, landPricePerSqm: 50000, subsidy: null, subsidyNote: '市の制度を調べて「解体の補助金」に入れてください', relief: null, utilities: 36000 } };
const cities = data.cities;

function jaDate(iso) { const [y, m, d] = iso.split('-').map(Number); return `${y}年${m}月${d}日`; }

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
const houseSvg = (title) => `<svg viewBox="0 0 320 200" role="img" aria-label="${esc(title)}"><rect class="lot-ground" x="0" y="168" width="320" height="32"/><polygon class="lot-house-roof" points="56,74 160,30 264,74"/><rect class="lot-house-wall" x="74" y="74" width="172" height="94"/><rect class="lot-house-shutter" x="92" y="88" width="38" height="28"/><rect class="lot-house-shutter" x="190" y="88" width="38" height="28"/><rect class="lot-house-shutter" x="92" y="128" width="38" height="28"/><rect class="lot-house-roof" x="146" y="126" width="28" height="42"/><rect class="lot-house-shutter" x="190" y="128" width="38" height="28"/><path class="lot-grass" d="M20 168 l6 -16 l4 16 z M34 168 l5 -11 l5 11 z M262 168 l6 -18 l5 18 z M280 168 l4 -10 l5 10 z M292 168 l6 -15 l4 15 z"/></svg>`;
const lotSvg = (title) => `<svg viewBox="0 0 320 200" role="img" aria-label="${esc(title)}"><rect class="lot-ground" x="0" y="168" width="320" height="32"/><path class="lot-grass" d="M30 168 l6 -20 l4 20 z M46 168 l5 -13 l5 13 z M88 168 l4 -9 l5 9 z M132 168 l6 -17 l4 17 z M150 168 l5 -11 l4 11 z M206 168 l6 -21 l5 21 z M224 168 l4 -12 l5 12 z M266 168 l6 -16 l4 16 z M284 168 l5 -9 l4 9 z"/><rect class="lot-house-roof" x="252" y="118" width="6" height="50"/><rect class="lot-house-shutter" x="232" y="106" width="46" height="22"/></svg>`;

function nav(root) {
  return `<div class="pr-bar"><div class="wrap">このサイトには広告（PR）を含みます。広告の有無で計算結果は変わりません。<a href="${root}policy.html">広告について</a></div></div>
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
  <p class="foot-legal">計算結果は目安です。実際の税額は毎年届く課税明細書で、補助金は各市の窓口で確かめてください。データの確認日：${jaDate(SITE.checkedOn)}　© 2026 ${SITE.name}</p>
</div></footer>`;
}

function page({ title, description, root, body, scripts = '' }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${SITE.fonts}">
<link rel="stylesheet" href="${root}assets/style.css">
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

function tool(city, input, result, { heading = '10年明細を出す', citySelectable = true } = {}) {
  const options = [...cities, OTHER].map((c) => `<option value="${c.slug}"${c.slug === city.slug ? ' selected' : ''}>${esc(c.name)}${c.pref ? `（${esc(c.pref)}）` : '（全国の標準で計算）'}</option>`).join('');
  const structures = Object.entries(STRUCTURES).map(([k, v]) => `<label><input type="radio" name="structure" value="${k}"${k === input.structure ? ' checked' : ''}><span>${v}</span></label>`).join('');
  return `<section class="tool" id="tool" aria-labelledby="tool-h">
  <h2 id="tool-h">${heading}</h2>
  <form id="calc" novalidate>
    <div class="field f-city"><label for="city">市区町村</label><select id="city" name="city"${citySelectable ? '' : ' disabled'}>${options}</select></div>
    ${field('landPrice', '土地の値段（1㎡あたり）', input.city.landPricePerSqm, '円/㎡', '住宅地の地価公示の平均', 'min="0" step="100"', 'f-price')}
    ${field('landSqm', '土地の広さ', input.landSqm, '㎡', '課税明細書の「地積」', 'min="1"', 'f-third')}
    ${field('floorSqm', '建物の延床面積', input.floorSqm, '㎡', '課税明細書の「床面積」', 'min="1"', 'f-third')}
    ${field('builtYear', '建てた年', input.builtYear, '年', '1981年5月以前かで控除が変わる', 'min="1900" max="2026"', 'f-third f-year')}
    <div class="field f-full"><fieldset><legend>建物の構造</legend><div class="segmented">${structures}</div></fieldset></div>
    <details class="more">
      <summary>課税明細書の数字・費用を変える</summary>
      <div class="more-grid">
        ${field('landAssessed', '土地の評価額', '', '円', '課税明細書の「価格」。空欄なら地価から推定', 'min="0" placeholder="推定"')}
        ${field('houseAssessed', '家屋の評価額', '', '円', '課税明細書の「価格」。空欄なら推定', 'min="0" placeholder="推定"')}
        ${field('salePrice', '売れそうな額', '', '円', '査定額が分かれば。空欄なら地価から推定', 'min="0" placeholder="推定"')}
        ${field('insurance', '火災保険', input.insurance, '円/年', '空き家は住宅より高くなりやすい', 'min="0" step="1000"')}
        ${field('management', '見回り・管理', input.management, '円/年', '通う交通費か管理サービス代', 'min="0" step="1000"')}
        ${field('utilities', '水道・電気の基本料金', input.utilities, '円/年', '止めずに契約を続ける場合', 'min="0" step="1000"')}
        ${field('mowing', '草刈り・庭木', input.mowing, '円/年', '更地にしても続く', 'min="0" step="1000"')}
        ${field('demolitionPerTsubo', '解体費の坪単価', '', '円/坪', `空欄なら${STRUCTURES[input.structure]}の目安`, 'min="0" step="1000" placeholder="目安"')}
        <label class="check"><input type="checkbox" id="inUrbanArea" name="inUrbanArea"${input.inUrbanArea ? ' checked' : ''}> 市街化区域にある（都市計画税がかかる）</label>
        <label class="check"><input type="checkbox" id="manyHeirs" name="manyHeirs"${input.manyHeirs ? ' checked' : ''}> 相続人が3人以上いる（控除が1人2,000万円）</label>
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
<p class="hint">土地の評価額${man(r.assumptions.landAssessed)}${r.assumptions.estimatedLand ? '（地価×0.7で推定）' : ''}、家屋の評価額${man(r.assumptions.houseAssessed)}${r.assumptions.estimatedHouse ? '（築年数が経った家の目安で推定）' : ''}で計算しました。課税明細書の「価格」を入れると、今払っている税額に近づきます。</p>`;
}

function citiesTable(root) {
  const rows = cities.map((c) => {
    const r = Calc.compare(inputFor(c));
    const sub = c.facts.find((f) => f.label === '解体の補助金');
    const relief = c.facts.find((f) => f.label === '解体後の固定資産税の減免');
    const rate = c.facts.find((f) => f.label === '空き家率');
    const planning = c.facts.find((f) => f.label === '都市計画税の税率');
    return `<tr><th scope="row"><a href="${root}city/${c.slug}.html">${esc(c.name)}</a><span class="row-note">${esc(c.pref)}・${esc(c.kind)}</span></th>
<td class="nw">${esc(planning.value)}${planning.status !== '確認済み' ? ' <span class="unverified">要確認</span>' : ''}</td>
<td>${esc(c.calc.subsidyNote.split('。')[0])}</td>
<td>${esc(relief.value)}</td>
<td class="n">${esc(rate.value.split('（')[0])}</td>
<td class="n">${man(r.keep.total)}</td><td class="n">${man(r.clear.total)}</td></tr>`;
  }).join('');
  return `<div class="city-table-wrap"><table class="city-table">
<caption class="hint" style="caption-side:bottom;text-align:left;padding-top:10px">10年の金額は、土地165㎡・木造延床99㎡・1978年築のモデルケースで計算しています。</caption>
<thead><tr><th scope="col">市</th><th scope="col">都市計画税</th><th scope="col">解体の補助金</th><th scope="col">解体後の減免</th><th scope="col">空き家率</th><th scope="col">持ち続けて10年</th><th scope="col">解体して10年</th></tr></thead>
<tbody>${rows}</tbody></table></div>`;
}

function sellSection(root, cityName) {
  const where = cityName ? `${cityName}で` : '';
  return `<section class="on-field sell" id="sell" aria-labelledby="sell-h"><div class="wrap sell-grid">
  <div class="prose">
    <h2 id="sell-h">${ph(where + '売ると決めたら、', '先に値段を知る')}</h2>
    <p>10年明細の「1年目に売る」の列は、地価の平均から出した仮の数字です。実際にいくらで売れるかが分かると、持ち続けるか売るかを自分の数字で比べられます。</p>
    <p>不動産の一括査定は、1回の入力で複数の不動産会社に査定を頼めるサービスです。査定を頼んでも、売る義務はありません。ただし、複数の会社から電話やメールが来ます。古い家でも「古家付き土地」として査定を頼めます。</p>
    <p class="muted">「PR」と書いた枠は広告です。申し込みがあると、このサイトに紹介料が入ります。紹介料の額で、計算の結果や説明の順番は変えていません。</p>
  </div>
  <div style="display:grid;gap:20px;align-content:start">
    <div class="offer"><span class="pr">PR</span><h3>家が建ったまま、いくらで売れるか知りたい</h3>
      <ul><li>不動産の一括査定（無料）</li><li>複数社の査定額を比べられる</li><li>空き家・古家付き土地も査定の対象</li></ul>
      <div class="actions"><a class="btn" href="${root}policy.html#ad-satei" rel="sponsored nofollow">一括査定を申し込む</a></div></div>
    <div class="offer"><span class="pr">PR</span><h3>古くて売りにくい・事情がある家を手放したい</h3>
      <ul><li>空き家・訳あり物件の買取（査定は無料）</li><li>共有名義や再建築不可の家も相談できる</li><li>買取の価格は、仲介で売るより低くなるのが一般的</li></ul>
      <div class="actions"><a class="btn btn-quiet" href="${root}policy.html#ad-kaitori" rel="sponsored nofollow">買取の査定を申し込む</a></div></div>
  </div>
</div></section>`;
}

function datesSection() {
  const items = [
    ['毎年1月1日', 'その日の持ち主と土地の状態で、その年度の固定資産税が1年分決まります。12月に解体すると翌年の1月1日には更地なので、翌年度から土地の税が上がります。1月2日以降に解体すれば、上がるのは翌々年度からです。売った年の税は、売買の時に日割りで精算するのが一般的です。'],
    ['1981年5月31日', 'この日までに建てた家だけが、相続した空き家を売ったときの3,000万円の特別控除の対象です。解体の補助金も、北九州市のようにこの日付で線を引く市があります。明細の「建てた年」に入れると、控除の有無が切り替わります。'],
    ['相続から3年目の12月31日', '3,000万円控除を使うには、相続した日から3年を経過する日が属する年の12月31日までに売る必要があります。2024年1月以降は、相続人が3人以上だと控除は1人2,000万円です。'],
    ['2027年12月31日', '3,000万円控除という制度そのものの期限です。延長されるかはまだ決まっていません。'],
    ['毎年4月ごろ', '多くの市で、解体の補助金の受付が始まります。宇都宮市は令和7年度が4月1日〜5月30日の2か月だけ。北九州市は令和8年度の判定依頼が4月20日〜12月21日で、予算に達し次第終わります。'],
  ];
  return `<section class="section" id="dates" aria-labelledby="dates-h"><div class="wrap">
  <div class="section-head"><h2 id="dates-h">空き家には締め切りがある</h2><p>税金と控除と補助金は、日付で決まります。売るにしても解体するにしても、この5つの日付を先に押さえておくと損をしにくくなります。</p></div>
  <ol class="dates">${items.map(([w, t]) => `<li><span class="when">${w}</span><p>${t}</p></li>`).join('')}</ol>
</div></section>`;
}

function tokureiSection(r) {
  const keepLand = r.keep.annualTax.landFixed + r.keep.annualTax.landPlanning;
  const clearLand = r.clear.steadyTax.total;
  return `<section class="section" id="tokurei" aria-labelledby="tokurei-h"><div class="wrap">
  <div class="section-head"><h2 id="tokurei-h">${ph('家を壊すと、', '土地の税は約4倍になる')}</h2>
  <p>家が建っている土地は「住宅用地の特例」で、税の計算のもとになる額が200㎡までの部分は1/6に下げられています。解体して更地にすると特例がなくなり、評価額の70%が上限になります。0.7÷1/6で、約4.2倍です。</p></div>
  <div class="jump-grid">
    <figure class="lot" style="margin:0">${houseSvg('雨戸を閉めた2階建ての家が建つ土地')}<figcaption class="lot-figcap"><span class="lot-tax" data-bind="keepLand">${man(keepLand)}</span><span class="lot-cap">家が建っている土地の税（1年）</span></figcaption></figure>
    <figure class="lot" style="margin:0">${lotSvg('解体したあとの更地')}<figcaption class="lot-figcap"><span class="lot-tax up" data-bind="clearLand">${man(clearLand)}</span><span class="lot-cap">更地にした後の土地の税（1年）</span></figcaption></figure>
    <div class="jump-note"><span class="big" data-bind="jump">${r.clear.taxJump ? r.clear.taxJump.toFixed(1) + '倍' : '—'}</span>
      <p>上の明細の条件（北九州市、土地165㎡）での倍率です。京丹後市の資料では、200㎡以下の部分は約4.2倍、200㎡を超える部分は約2.1倍と説明しています。</p></div>
  </div>
  <div class="prose" style="margin-top:48px">
    <h3 style="font-size:var(--t-m)">壊さなくても上がることがある</h3>
    <p>2023年12月13日に改正空家法が施行され、「管理不全空家」が新しくできました。放っておくと危ない空き家になりそうな家として市から勧告を受けると、家が建っていても特例が外れます。勧告に対して1月1日までに手当てをしないと、その年度から税が上がります。明細の「見回り・管理」は、この勧告を避けるための費用でもあります。</p>
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
    <p class="asof rise d2">税率・補助金は各市の公開資料から。<span class="nw">確認日 ${jaDate(SITE.checkedOn)}</span></p>
    <figure class="lot hero-pic rise d2">${houseSvg('雨戸を閉めた実家')}</figure>
  </div>
  ${tool(city, input, r)}
  </div>
</div></section>
${tokureiSection(r)}
${datesSection()}
<section class="section" id="cities" aria-labelledby="cities-h"><div class="wrap">
  <div class="section-head"><h2 id="cities-h">市によって違うところ</h2><p>都市計画税の税率、解体の補助金、解体後の減免、地価。同じ家でも、市が違えば10年の総額が変わります。いまは3市です。政令指定都市・中核市・空き家率の高い市から順に増やします。</p></div>
  ${citiesTable('')}
</div></section>
${sellSection('')}`;
  return page({ title: `${SITE.name}｜実家の空き家、10年でいくら？`, description: '実家の空き家を持ち続ける・解体する・売るの3つで、固定資産税・管理費・解体費・売却の手取りを10年分計算。市の税率と補助金を出典つきで反映します。', root: '', body, scripts: scripts('', city.slug) });
}

function cityPage(city) {
  const root = '../';
  const input = inputFor(city);
  const r = Calc.compare(input);
  const facts = city.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd><span class="val">${esc(f.value)}</span>${f.status !== '確認済み' ? `<span class="unverified">${f.status === '一部確認' ? '一部確認' : '要確認'}</span>` : ''}${f.note ? `<span>${esc(f.note)}</span>` : ''}${f.source ? `<span class="src">出典：<a href="${esc(f.source)}" rel="noopener">${esc(f.source.replace(/^https?:\/\//, '').slice(0, 70))}${f.source.length > 78 ? '…' : ''}</a>${f.asOf ? `（${esc(f.asOf)}）` : ''}</span>` : ''}</dd></div>`).join('');
  const others = cities.filter((c) => c.slug !== city.slug).map((c) => `<li><a href="${root}city/${c.slug}.html">${esc(c.name)}の10年明細</a></li>`).join('');
  const body = `
<div class="wrap crumbs"><ol><li><a href="${root}index.html">トップ</a></li><li>${esc(city.pref)}</li><li aria-current="page">${esc(city.name)}</li></ol></div>
<section class="hero"><div class="wrap">
  <h1 class="rise">${ph(esc(city.name) + 'の空き家、', '10年でいくら？')}</h1>
  <div class="hero-grid">
  <div class="hero-side">
    <p class="lead rise d1">${esc(city.summary)}</p>
    <p class="asof rise d2">明細は、土地165㎡・木造延床99㎡・1978年築のモデルケースを、${esc(city.name)}の数字で計算したものです。<span class="nw">確認日 ${jaDate(SITE.checkedOn)}</span></p>
    <figure class="lot hero-pic rise d2">${houseSvg('雨戸を閉めた空き家')}</figure>
  </div>
  ${tool(city, input, r, { heading: `${city.name}の10年明細` })}
  </div>
</div></section>
<section class="section" id="facts" aria-labelledby="facts-h"><div class="wrap">
  <div class="section-head"><h2 id="facts-h">${esc(city.name)}の数字と出典</h2><p>計算に使った数字と、空き家に関わる市の制度です。「要確認」は、公式資料で値を確かめきれていないものです。</p></div>
  <dl class="facts">${facts}</dl>
</div></section>
${sellSection(root, city.name)}
<section class="section" style="padding-top:var(--section)"><div class="wrap prose"><h2 style="font-size:var(--t-m)">ほかの市と比べる</h2><ul>${others}</ul></div></section>`;
  return page({ title: `${city.name}の空き家の維持費・解体・売却を10年で比べる｜${SITE.name}`, description: `${city.name}（${city.pref}）の空き家を持ち続ける・解体する・売るの3つで10年分計算。都市計画税・地価・解体の補助金を出典つきで反映。`, root, body, scripts: scripts(root, city.slug) });
}

function methodPage() {
  const root = '';
  const rules = [
    ['固定資産税の税率', '課税標準額の1.4%（標準税率）。超過課税の市は、その市のページで税率を変えています。', 'https://smtrc.jp/useful/glossary/detail/n/306'],
    ['都市計画税の税率', '市町村の条例で決まり、上限は0.3%。市街化区域内の土地と家屋にかかります。', 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/149767_10.html'],
    ['住宅用地の特例', '200㎡以下の部分は、固定資産税の課税標準が評価額の1/6、都市計画税が1/3。200㎡を超える部分（床面積の10倍まで）は1/3と2/3。', 'https://www.mlit.go.jp/jutakukentiku/house/content/002019834.pdf'],
    ['更地にしたとき', '特例がなくなり、課税標準は評価額の70%が上限。200㎡以下の部分は約4.2倍、200㎡を超える部分は約2.1倍（京丹後市の説明）。', 'https://www.city.kyotango.lg.jp/material/files/group/35/pamphlet.pdf'],
    ['管理不全空家と特定空家', '2023年12月13日施行の改正空家法で、管理不全空家にも勧告ができるようになりました。勧告を受け、1月1日までに措置をしないと、その年度から特例が外れます。', 'https://www.tax.metro.tokyo.lg.jp/kazei/real_estate/kotei_tosi/tokuteiakiya'],
    ['土地の評価額', '宅地は地価公示価格の約7割を目安に評価額が決まります。明細では「地価×0.7×面積」で推定しています。', 'https://www.city.kitakyushu.lg.jp/contents/26001061.html'],
    ['家屋の評価額', '再建築価格×経年減点補正率。木造専用住宅の補正率は0.20が下限で、その後は据え置き。明細では、築年数が経った家の目安として木造1万6千円/㎡（推定）を使います。課税明細書の「価格」を入れてください。', 'https://www.city.sendai.jp/sisanze-chose/kurashi/tetsuzuki/zekin/kekaku/tebiki/documents/kaoku_hyouka_aramashi_202404.pdf'],
    ['免税点', '同じ市区町村にある課税標準額の合計が、土地30万円未満・家屋20万円未満なら固定資産税はかかりません。', ''],
    ['3,000万円の特別控除', '1981年5月31日以前に建てた家で、相続から3年を経過する日の属する年の12月31日まで、2027年12月31日までに、1億円以下で売ること。2024年1月以降は相続人3人以上なら1人2,000万円。売った翌年2月15日までに買主が耐震改修か解体をしても対象。', 'https://www.city.chiba.jp/toshi/toshi/anzen/documents/3000.pdf'],
    ['譲渡所得の税', '長期譲渡所得は20.315%。取得費が分からないときは売却額の5%を取得費にできます。', 'https://toushi.homes.co.jp/column/?p=18075'],
    ['仲介手数料', '売却額×3%＋6万円＋消費税（400万円超）。800万円以下の空き家などは、上限が30万円＋消費税まで認められているため、明細では33万円で見積もっています。', ''],
    ['解体費', '木造4万円/坪、鉄骨造5.5万円/坪、鉄筋コンクリート造7万円/坪を目安にしています。公的な単価の資料は見つかっていません。見積もりを取ったら「解体費の坪単価」に入れてください。', ''],
    ['相続土地国庫帰属制度', '建物がある土地は申請できません。審査手数料は1筆14,000円、負担金は原則20万円（市街化区域の宅地などは面積で計算）。明細には入れていません。', 'https://www.moj.go.jp/MINJI/minji05_00457.html'],
  ];
  const body = `<div class="wrap doc"><h1>計算の前提と出典</h1>
<div class="prose">
<p>アキヤマネーの10年明細は、次の決まりと目安で計算しています。計算の式はブラウザで動く計算と、各市のページに書き出した表で同じものを使っています。数字や制度の誤りを見つけたら、運営者まで知らせてください。</p>
<div class="table-wrap"><table><thead><tr><th scope="col">項目</th><th scope="col">明細での扱い</th><th scope="col">出典</th></tr></thead><tbody>
${rules.map(([a, b, s]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${s ? `<a href="${s}" rel="noopener">${esc(s.replace(/^https?:\/\//, '').split('/')[0])}</a>` : '—'}</td></tr>`).join('')}
</tbody></table></div>
<h2>明細に入れていないもの</h2>
<p>家の修繕費、雪下ろし、相続登記の費用、遺品の片付け、売るまでの期間、地価の上がり下がり、負担調整措置による税の段階的な変化。とくに更地の税は、負担調整措置で実際には数年かけて上がることがあります。</p>
<h2>データの更新</h2>
<p>税率と補助金は毎年度変わります。毎年3月から5月に全市を見直し、各市のページに確認日を出します。</p>
</div></div>`;
  return page({ title: `計算の前提と出典｜${SITE.name}`, description: '空き家の10年明細で使っている税率・特例・控除・目安の一覧と出典。', root, body });
}

function aboutPage() {
  const body = `<div class="wrap doc"><h1>運営者について</h1><div class="prose">
<p><strong>〔運営者名〕</strong>が1人で運営しています。車の維持費を車種ごとに計算するサイト「ノリマネー」も運営しています。</p>
<p>〔ここに、実家や親族の家が空き家になった経験、なぜこのサイトを作ったかを、運営者自身の言葉で3〜5文書いてください。実体験は、このサイトでいちばん代わりのきかない情報です。〕</p>
<h2>編集の方針</h2>
<p>税率・補助金・地価は、市や県、国の公開資料から集め、ページごとに出典のURLと確認日を書いています。公式資料で確かめきれていない値には「要確認」と表示し、補助金は確かめられるまで計算に入れません。</p>
<p>このサイトは広告（アフィリエイト）で運営しています。広告の有無や紹介料の額で、計算の結果や説明の順番は変えていません。</p>
<h2>連絡先</h2>
<p>〔お問い合わせフォームのURLかメールアドレス〕</p>
</div></div>`;
  return page({ title: `運営者について｜${SITE.name}`, description: 'アキヤマネーの運営者と編集の方針。', root: '', body });
}

function policyPage() {
  const body = `<div class="wrap doc"><h1>広告・免責・プライバシー</h1><div class="prose">
<h2 id="ads">広告について</h2>
<p>このサイトは、アフィリエイト・サービス・プロバイダ（ASP）を通じた広告を掲載しています。広告には「PR」と表示しています。広告から申し込みがあると、このサイトに紹介料が入ります。</p>
<p id="ad-satei"><strong>不動産一括査定の広告枠：</strong>〔提携後、ASPの広告リンクに差し替え〕</p>
<p id="ad-kaitori"><strong>空き家・訳あり物件買取の広告枠：</strong>〔提携後、ASPの広告リンクに差し替え〕</p>
<h2>免責</h2>
<p>10年明細の金額は、公開資料と目安から出した概算です。実際の固定資産税は毎年届く課税明細書、補助金の対象と金額は各市の窓口、譲渡所得の税は税務署か税理士に確かめてください。このサイトの情報をもとにした判断で生じた損害について、運営者は責任を負いません。</p>
<h2>プライバシー</h2>
<p>計算に入力した数字は、あなたのブラウザの中だけで計算し、送信も保存もしていません。〔アクセス解析を入れる場合は、ツール名と、Cookieを使うことをここに書く〕</p>
</div></div>`;
  return page({ title: `広告・免責・プライバシー｜${SITE.name}`, description: 'アキヤマネーの広告の表示、免責、プライバシーについて。', root: '', body });
}

function scripts(root, slug) {
  const cfg = {
    defaults: DEFAULTS,
    structures: STRUCTURES,
    current: slug,
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
for (const c of cities) pages[`city/${c.slug}.html`] = cityPage(c);
for (const [p, html] of Object.entries(pages)) {
  writeFileSync(join(out, p), html);
  writeFileSync(join(art, p), html);
}
for (const f of ['calc.js', 'render.js']) { copyFileSync(join(here, f), join(out, 'assets', f)); copyFileSync(join(here, f), join(art, 'assets', f)); }
for (const f of ['style.css', 'app.js']) { copyFileSync(join(here, 'assets', f), join(out, 'assets', f)); copyFileSync(join(here, 'assets', f), join(art, 'assets', f)); }

// Artifact版のトップ：doctype/html/head/body を外す（公開時に包まれるため）
const top = pages['index.html'];
const headInner = top.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\n?/, '').replace(/<meta name="viewport"[^>]*>\n?/, '');
const bodyInner = top.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(join(art, 'index.html'), headInner.trim() + '\n' + bodyInner.trim() + '\n');

console.log(`built ${Object.keys(pages).length} pages → site/public, site/artifact`);
