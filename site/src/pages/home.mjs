import { html, esc, yen, man, jdate } from '../lib.mjs'
import { compare, judge, parseRate } from '../assets/calc.js'
import { houseSvg } from '../layout.mjs'
import { ledgerHtml } from '../assets/view.js'

// トップの例に使う入力。数字はすべて「入力例」として画面に明記する。
export const EXAMPLE_INPUT = {
  structure: 'wood', floorSqm: 99, landSqm: 165, assessed: 8_000_000, buildingTax: 28_000,
  upkeep: 60_000, tripCost: 10_000, trips: 6, insurance: 30_000, eligible: true, cityTax: true,
  rebuild: 'yes', shared: 'no', plan: 'sell', years: 10, sellMonths: 12,
}

export function pickExampleCity(cities) {
  // 例には、今年度受付中で、都市計画税率まで確かめられた市を使う
  return cities.find((c) => c.subsidy?.open === true && c.subsidy.max_yen && c.city_planning_tax?.rate_percent != null)
    || cities.find((c) => c.subsidy?.exists && c.subsidy.max_yen && parseRate(c.subsidy.rate) !== null)
    || cities[0]
}

export function homePage(ctx, { cities, params, prefs }) {
  const h = (to) => ctx.href('/', to)
  const city = pickExampleCity(cities)
  const r = compare(params, city, EXAMPLE_INPUT)
  const j = judge(EXAMPLE_INPUT, r)
  const ratioFixed = params.vacantLandBurdenCap / params.small.fixed
  const withSub = cities.filter((c) => c.subsidy?.exists)
  const sorted = [...withSub].sort((a, b) => (b.subsidy.max_yen || 0) - (a.subsidy.max_yen || 0))
  const closed = withSub.filter((c) => c.subsidy.open === false).length
  const asOf = cities.map((c) => c.checked_at).sort().pop()

  const body = html`
<section class="hero wrap">
  <div class="hero-grid">
    <div>
      <h1>解体か、売るか、<br>持ち続けるか。</h1>
      <p class="lead">${esc(ctx.site.name)}は、相続した空き家の4つの選択肢を、市町村の補助金と固定資産税の数字で並べて比べるサイトです。</p>
      <div class="hero-actions">
        <a class="btn" href="${h('/tool/')}">自分の家で計算する</a>
        <a href="${h('/area/')}">市町村の補助金を見る</a>
      </div>
    </div>
    ${houseSvg()}
  </div>
  ${ledgerHtml(r, j, { cityName: city.city, caption: `入力例：${esc(city.city)}、木造2階建て（延床${EXAMPLE_INPUT.floorSqm}㎡）、土地${EXAMPLE_INPUT.landSqm}㎡、土地の評価額${man(EXAMPLE_INPUT.assessed)}。補助は${esc(city.subsidy?.fiscal_year || '')}の要綱で計算。` })}
</section>

<section class="section wrap">
  <div class="split">
    <div class="rise">
      <h2>更地の固定資産税は、最大で約${ratioFixed.toFixed(1)}倍</h2>
      <p class="lead" style="margin-top:20px">「更地にすると6倍」とよく言われますが、6倍になるのは軽減の割合の話です。更地の土地には負担調整の上限があり、課税標準は評価額の${Math.round(params.vacantLandBurdenCap * 100)}%までに抑えられます。</p>
      <p>200㎡までの住宅用地は課税標準が評価額の${fracText(params.small.fixed)}、更地は最大で${Math.round(params.vacantLandBurdenCap * 100)}%。${Math.round(params.vacantLandBurdenCap * 100)}% ÷ ${fracText(params.small.fixed)} で約${ratioFixed.toFixed(1)}倍です。都市計画税は軽減が${fracText(params.small.city)}なので、上がり方は約${(params.vacantLandBurdenCap / params.small.city).toFixed(1)}倍にとどまります。この上限は、${esc(params.burdenAdjustmentUntil)}までの負担調整措置によるものです。</p>
      <p><a href="${h('/guide/kaitai-go-zeikin/')}">解体後の税の計算を詳しく読む</a></p>
    </div>
    <div class="rise">
      ${r.tax ? html`<div class="notice">
        <table>
          <caption class="small" style="text-align:left;padding-bottom:12px">入力例の土地（${EXAMPLE_INPUT.landSqm}㎡、評価額${man(EXAMPLE_INPUT.assessed)}、${esc(city.city)}の都市計画税率${city.city_planning_tax?.rate_percent ?? '—'}%）の年税額</caption>
          <thead><tr><th scope="col">税目</th><th scope="col">家が建っている</th><th scope="col">解体して更地</th></tr></thead>
          <tbody>
            <tr><td>固定資産税</td><td>${yen(r.tax.withHouse.fixed)}</td><td>${yen(r.tax.vacant.fixed)}</td></tr>
            <tr><td>都市計画税</td><td>${yen(r.tax.withHouse.city)}</td><td>${yen(r.tax.vacant.city)}</td></tr>
          </tbody>
          <tfoot><tr><td>合計</td><td>${yen(r.tax.withHouse.total)}</td><td>${yen(r.tax.vacant.total)}</td></tr></tfoot>
        </table>
        <p class="small" style="margin:16px 0 0">税額は1月1日時点の状況で決まります。年内に解体すると、翌年度から更地の税額になります。</p>
      </div>` : ''}
    </div>
  </div>
</section>

<section class="section wrap">
  <div class="section-head rise">
    <h2>補助金は、市町村によってこれだけ違う</h2>
    <p class="lead">同じ県の隣の市でも、上限額も補助率も対象の建物も違います。確かめた${withSub.length}市町のうち${closed}市は、${jdate(asOf)}の時点で今年度の受付を終えていました。予算の枠は、春の受付開始から埋まっていきます。</p>
  </div>
  <div class="table-scroll rise">
    <table class="data">
      <thead><tr><th scope="col">市町村</th><th scope="col" class="r">上限額</th><th scope="col">補助率</th><th scope="col">${jdate(asOf)}の受付状況</th></tr></thead>
      <tbody>
        ${sorted.map((c) => html`<tr>
          <td><a href="${h(`/area/${c.pref_slug}/${c.slug}/`)}">${esc(c.city)}</a><br><span class="small">${esc(c.pref)}</span></td>
          <td class="r">${c.subsidy.max_yen ? man(c.subsidy.max_yen) : '—'}</td>
          <td>${esc(c.subsidy.rate_label || c.subsidy.rate || '—')}</td>
          <td class="small">${esc(c.subsidy.status || '未確認')}</td>
        </tr>`)}
      </tbody>
    </table>
  </div>
  <p class="small" style="margin-top:16px">一覧は<a href="${h('/data/kaitai-hojo/')}">補助制度の一覧データ</a>（CSVあり）にまとめています。</p>
</section>

<section class="field">
  <div class="wrap">
    <p class="statement rise">業者に家を売る契約には、クーリング・オフがありません。急かされても、その場で決めないでください。</p>
    <div class="facts">
      <p class="rise"><strong>複数の業者で比べる</strong>買取の価格は業者ごとに違います。1社だけの査定で決めると、相場より安く手放すことがあります。</p>
      <p class="rise"><strong>家族と相談してから</strong>相続した家は、兄弟姉妹の共有になっていることがあります。全員の同意がないと売れません。</p>
      <p class="rise"><strong>注意喚起が出ています</strong>国民生活センターは、強引な勧誘で自宅を安く売らされた相談について注意を呼びかけています。<a href="${h('/guide/kaitori-chuui/')}">詳しく読む</a></p>
    </div>
  </div>
</section>

<section class="section wrap">
  <div class="split rev">
    <div class="rise">
      <h2>数字の出どころ</h2>
      <p class="lead" style="margin-top:20px">補助金は市町村の要綱、空き家の数は総務省の住宅・土地統計調査、税の計算は地方税法の特例の割合から出しています。</p>
      <ul class="plain">
        <li>どのページにも、出典のリンクと確かめた日付を載せます。</li>
        <li>確かめられなかった数字は載せず、「未確認」と書きます。</li>
        <li>担当課に電話で確かめた内容は、<a href="${h('/log/')}">確認記録</a>に日付つきで残します。</li>
        <li>計算の式は<a href="${h('/tool/')}#method">判定ツールのページ</a>にすべて書いています。</li>
      </ul>
    </div>
    <div class="rise">
      <p class="bigfig num">${withSub.length}<small>市町</small></p>
      <p class="lead" style="margin-top:12px">要綱を確かめて載せている市町村の数。最新の年度の要綱が見つからない市町村は、確かめられるまで載せません。</p>
    </div>
  </div>
</section>
`
  return {
    title: '空き家の算段',
    description: `相続した空き家を、解体するか・古家付きで売るか・買取に出すか・持ち続けるか。${withSub.length}市町の解体補助金と固定資産税の数字で比べられます。`,
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: ctx.site.name, url: ctx.site.baseUrl },
  }
}

export function fracText(x) {
  const map = { [1 / 6]: '6分の1', [1 / 3]: '3分の1', [2 / 3]: '3分の2', [1 / 2]: '2分の1' }
  for (const [k, v] of Object.entries(map)) if (Math.abs(Number(k) - x) < 1e-9) return v
  return `${Math.round(x * 1000) / 10}%`
}
