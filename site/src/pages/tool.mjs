import { html, esc, man, jdate } from '../lib.mjs'
import { fracText, EXAMPLE_INPUT } from './home.mjs'

export function toolPage(ctx, { cities, params, offers }) {
  const h = (to) => ctx.href('/tool/', to)
  const data = {
    cities: cities.map((c) => ({
      slug: c.slug, city: c.city, pref: c.pref, pref_slug: c.pref_slug,
      subsidy: c.subsidy ? { exists: c.subsidy.exists, name: c.subsidy.name, max_yen: c.subsidy.max_yen, rate: c.subsidy.rate, conditions: c.subsidy.conditions, fiscal_year: c.subsidy.fiscal_year, period: c.subsidy.period } : null,
      city_planning_tax: c.city_planning_tax ? { rate_percent: c.city_planning_tax.rate_percent } : null,
      page: h(`/area/${c.pref_slug}/${c.slug}/`),
      estimate_window: c.estimate_window,
    })),
    params,
    offers: Object.fromEntries(Object.entries(offers).map(([k, o]) => [k, { label: o.label, text: o.text, url: o.url || '', advertiser: o.advertiser || '' }])),
    links: { kaitori: h('/guide/kaitori-chuui/'), tax: h('/guide/kaitai-go-zeikin/') },
    example: EXAMPLE_INPUT,
  }
  const ex = EXAMPLE_INPUT
  const radio = (name, items, checked) => html`<div class="choices">${items.map(([v, label]) => html`<label><input type="radio" name="${name}" value="${v}"${v === checked ? ' checked' : ''}> ${label}</label>`)}</div>`
  const num = (id, label, value, hint, unit = '') => html`<div class="field-row">
    <label for="${id}">${label}${unit ? `（${unit}）` : ''}</label>
    <input type="number" id="${id}" name="${id}" inputmode="numeric" min="0" step="any" value="${value}"${hint ? ` aria-describedby="${id}-hint"` : ''}>
    ${hint ? html`<p class="hint" id="${id}-hint">${hint}</p>` : ''}
  </div>`

  const d = params.demolition
  const body = html`
<section class="wrap hero compact">
  <h1>あなたの家で計算する</h1>
  <p class="lead">市町村と家の条件を入れると、4つの選択肢の費用が並び、次にやることが1つに決まります。入力の初期値は入力例です。手元の納税通知書の数字に置き換えてください。</p>

  <div class="tool">
    <form class="form" id="tool-form" novalidate>
      <fieldset>
        <legend>家のある市町村</legend>
        <div class="field-row">
          <label for="city">市町村</label>
          <select id="city" name="city">
            ${cities.map((c) => html`<option value="${c.slug}"${c.slug === 'nagano-shi' ? ' selected' : ''}>${esc(c.pref)} ${esc(c.city)}</option>`)}
            <option value="other">一覧にない市町村</option>
          </select>
          <p class="hint" id="city-note"></p>
        </div>
        <div class="field-row" id="other-sub" hidden>
          <span class="label">補助の上限額と補助率（市町村の要綱を見て入力）</span>
          <input type="number" id="otherCap" name="otherCap" inputmode="numeric" min="0" step="10000" placeholder="上限額（円）" aria-label="補助の上限額（円）">
          <input type="number" id="otherRate" name="otherRate" inputmode="decimal" min="0" max="100" step="1" placeholder="補助率（%）" aria-label="補助率（%）">
          <input type="number" id="otherCityRate" name="otherCityRate" inputmode="decimal" min="0" max="0.3" step="0.01" placeholder="都市計画税率（%）" aria-label="都市計画税率（%）">
        </div>
        <div class="field-row">
          <span class="label" id="elig-label">補助の要件に当てはまりそうか</span>
          ${radio('eligible', [['yes', '当てはまりそう'], ['no', '当てはまらない・わからない']], 'yes')}
          <div class="hint" id="conditions"></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>建物と土地</legend>
        <div class="field-row">
          <span class="label">構造</span>
          ${radio('structure', [['wood', '木造'], ['steel', '鉄骨造'], ['rc', '鉄筋コンクリート造']], ex.structure)}
        </div>
        ${num('floorSqm', '建物の延床面積', ex.floorSqm, '登記事項証明書か、課税明細書の家屋の「床面積」。1坪は約3.3㎡。', '㎡')}
        ${num('landSqm', '土地の面積', ex.landSqm, '課税明細書の土地の「地積」。', '㎡')}
        ${num('assessed', '土地の評価額', ex.assessed, '毎年4〜6月ごろ届く固定資産税の課税明細書の、土地の「評価額」（価格）欄。', '円')}
        ${num('buildingTax', '建物の固定資産税（年額）', ex.buildingTax, '課税明細書の家屋の税額。わからなければ0のままで構いません。', '円')}
        <div class="field-row">
          <span class="label">都市計画税</span>
          ${radio('cityTax', [['yes', 'かかっている'], ['no', 'かかっていない']], 'yes')}
        </div>
      </fieldset>

      <fieldset>
        <legend>今かかっている手間とお金</legend>
        ${num('upkeep', '草刈り・見回りなどの管理費（年額）', ex.upkeep, '業者に頼んでいる金額。自分でやっているなら0。', '円')}
        ${num('tripCost', '実家までの往復の交通費（1回）', ex.tripCost, '', '円')}
        ${num('trips', '1年に通う回数', ex.trips, '', '回')}
        ${num('insurance', '火災保険などの保険料（年額）', ex.insurance, '', '円')}
      </fieldset>

      <fieldset>
        <legend>家の事情</legend>
        <div class="field-row"><span class="label">建て替え（再建築）ができる土地か</span>${radio('rebuild', [['yes', 'できる'], ['no', 'できない'], ['unknown', 'わからない']], 'yes')}</div>
        <div class="field-row"><span class="label">名義</span>${radio('shared', [['no', '自分ひとり'], ['agree', '共有で、意見はまとまっている'], ['disagree', '共有で、まとまっていない']], 'no')}</div>
        <div class="field-row"><span class="label">この家をどうしたいか</span>${radio('plan', [['sell', '手放したい'], ['use', '住む・貸すなど使いたい'], ['undecided', 'まだ決めていない']], 'sell')}</div>
        <div class="field-row"><span class="label">何年分で比べるか</span>${radio('years', [['5', '5年'], ['10', '10年'], ['20', '20年']], '10')}</div>
      </fieldset>
    </form>

    <div class="result" id="result" aria-live="polite">
      <div id="ledger"></div>
      <div class="verdict" id="verdict">
        <h2>入力するとここに結果が出ます</h2>
      </div>
      <div id="offer"></div>
      <p class="notes">計算は目安です。補助の可否と金額は、申請前に必ず市町村の担当課に確かめてください。<button type="button" class="btn quiet" id="print" style="margin-left:8px;min-height:40px;padding:0 14px">結果を印刷する</button></p>
      <noscript><div class="noscript">この計算はブラウザのJavaScriptで動きます。オフにしている場合は、下の「計算のしかた」の式で手計算できます。</div></noscript>
    </div>
  </div>
</section>

<section class="section wrap" id="method">
  <div class="section-head">
    <h2>計算のしかた</h2>
    <p class="lead">画面の数字は、すべて下の式で出しています。式と割合の出典も載せます。</p>
  </div>
  <div class="prose">
    <h3>解体費の目安</h3>
    <p>延床面積（坪）× 構造ごとの単価の幅。木造 ${man(d.wood.min)}〜${man(d.wood.max)}、鉄骨造 ${man(d.steel.min)}〜${man(d.steel.max)}、鉄筋コンクリート造 ${man(d.rc.min)}〜${man(d.rc.max)}（いずれも1坪あたり）。${esc(d.note || '')}</p>
    <h3>補助額</h3>
    <p>解体費 × 補助率 と 上限額 の、少ない方（千円未満は切り捨て）。対象になる経費の範囲や端数の扱いは市町村ごとに違うため、実際の額は要綱で確かめてください。</p>
    <h3>土地の税（家が建っている場合）</h3>
    <p>住宅用地の特例で、200㎡までの部分は課税標準が評価額の${fracText(params.small.fixed)}（都市計画税は${fracText(params.small.city)}）、200㎡を超える部分は${fracText(params.general.fixed)}（都市計画税は${fracText(params.general.city)}）。住宅用地として扱われるのは、建物の床面積の${params.residentialFloorMultiple}倍までです。税率は固定資産税${(params.fixedAssetTaxRate * 100).toFixed(1)}%、都市計画税は市町村の税率（上限${(params.cityPlanningTaxMaxRate * 100).toFixed(1)}%）。</p>
    <h3>土地の税（解体して更地にした場合）</h3>
    <p>課税標準は評価額の${Math.round(params.vacantLandBurdenCap * 100)}%を上限として計算しています（負担調整措置の上限）。実際の課税標準は、前年度の課税標準や市町村の扱いによってこれより低くなることがあるので、この数字は「多めに見た目安」です。</p>
    <h3>持ち続ける費用</h3>
    <p>（土地の税 ＋ 建物の固定資産税 ＋ 管理費 ＋ 交通費×回数 ＋ 保険料）× 年数。</p>
    <h3>次の一歩の決め方</h3>
    <ul>
      <li>再建築ができない、または共有名義で意見がまとまっていない → 業者の買取を第一候補にします。</li>
      <li>住む・貸すなど使う予定がある → 持ち続けて、建物の状態を確かめます。</li>
      <li>それ以外 → まず古家付きのまま査定を取り、更地にした場合の価格も聞きます。更地のほうが「解体の実質負担」より高く売れるときだけ、解体してから売るほうが得です。</li>
    </ul>
    <h3>出典</h3>
    <ul class="sources">
      ${(params.sources || []).map((s) => html`<li>${esc(s.label)}：<a href="${esc(s.url)}" rel="noopener">${esc(s.name || s.url)}</a>${s.confidence && s.confidence !== '確認済' ? `（${esc(s.confidence)}）` : ''}</li>`)}
    </ul>
    <p class="small">割合と税率は ${jdate(params.checked_at)} に確かめた値です。</p>
  </div>
</section>
<a class="jump" id="jump" href="#result">結果を見る</a>
<script type="application/json" id="tool-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
`
  return {
    title: '空き家の判定ツール：解体・売却・買取・維持の費用を比べる',
    description: '市町村の解体補助金、解体費の目安、解体後の固定資産税、持ち続ける費用を計算し、空き家の4つの選択肢を並べて比べます。',
    body,
    scripts: ['tool.js'],
  }
}
