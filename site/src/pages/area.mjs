import { html, esc, man, yen, jdate, domainOf } from '../lib.mjs'
import { compare } from '../assets/calc.js'
import { EXAMPLE_INPUT, fracText } from './home.mjs'

const yesNo = (v) => v === true ? '必要' : v === false ? '不要' : '未確認'

export function areaIndexPage(ctx, { cities, prefs }) {
  const h = (to) => ctx.href('/area/', to)
  const byPref = Object.values(prefs).map((p) => ({ ...p, cities: cities.filter((c) => c.pref_slug === p.slug) })).filter((p) => p.cities.length)
  const body = html`
<section class="wrap hero">
  <h1>市町村の解体補助金</h1>
  <p class="lead">要綱を読んで確かめた市町村だけを載せています。補助制度がない、または確かめられていない市町村は、ページを作らずに県の表の1行で扱います。</p>
</section>
<section class="section wrap">
  ${byPref.map((p) => html`<div class="rise" style="margin-bottom:clamp(48px,6vw,80px)">
    <h2><a href="${h(`/area/${p.slug}/`)}">${esc(p.name)}</a></h2>
    <div class="table-scroll" style="margin-top:20px">
      <table class="data">
        <thead><tr><th scope="col">市町村</th><th scope="col">制度</th><th scope="col" class="r">上限額</th><th scope="col">補助率</th><th scope="col">確認日</th></tr></thead>
        <tbody>${p.cities.map((c) => html`<tr>
          <td><a href="${h(`/area/${c.pref_slug}/${c.slug}/`)}">${esc(c.city)}</a></td>
          <td>${c.subsidy?.exists ? esc(c.subsidy.name || 'あり') : '確認できず'}</td>
          <td class="r">${c.subsidy?.max_yen ? man(c.subsidy.max_yen) : '—'}</td>
          <td>${esc(c.subsidy?.rate || '—')}</td>
          <td class="small">${jdate(c.checked_at)}</td>
        </tr>`)}</tbody>
      </table>
    </div>
  </div>`)}
</section>`
  return { title: '市町村の空き家解体補助金の一覧', description: `空き家の解体・除却の補助制度を、${cities.length}市町の要綱で確かめて一覧にしました。上限額、補助率、受付期間、確認日を載せています。`, body }
}

export function prefPage(ctx, { pref, cities }) {
  const path = `/area/${pref.slug}/`
  const h = (to) => ctx.href(path, to)
  const list = cities.filter((c) => c.pref_slug === pref.slug)
  const rates = list.filter((c) => c.vacancy?.rate_percent != null)
  const body = html`
<nav class="crumbs wrap" aria-label="現在地"><a href="${h('/')}">トップ</a> ／ <a href="${h('/area/')}">市町村の補助金</a> ／ ${esc(pref.name)}</nav>
<section class="wrap hero compact" style="padding-top:clamp(24px,4vw,48px)">
  <h1>${esc(pref.name)}の空き家解体補助金</h1>
  <p class="lead">${esc(pref.name)}内で、要綱を確かめた${list.length}市町の制度を並べています。上限額だけでなく、対象になる建物の条件と受付の期間を見比べてください。</p>
</section>
<section class="section wrap">
  <div class="table-scroll rise">
    <table class="data">
      <thead><tr><th scope="col">市町村</th><th scope="col" class="r">上限額</th><th scope="col">補助率</th><th scope="col">受付</th><th scope="col">契約前の申請</th><th scope="col" class="r">空き家率</th></tr></thead>
      <tbody>${list.map((c) => html`<tr>
        <td><a href="${h(`/area/${pref.slug}/${c.slug}/`)}">${esc(c.city)}</a></td>
        <td class="r">${c.subsidy?.max_yen ? man(c.subsidy.max_yen) : '—'}</td>
        <td>${esc(c.subsidy?.rate || '—')}</td>
        <td class="small">${esc(c.subsidy?.period || '未確認')}</td>
        <td>${yesNo(c.subsidy?.apply_before_contract)}</td>
        <td class="r">${c.vacancy?.rate_percent != null ? `${c.vacancy.rate_percent}%` : '—'}</td>
      </tr>`)}</tbody>
    </table>
  </div>
  ${pref.note ? html`<p class="small" style="margin-top:16px">${esc(pref.note)}</p>` : ''}
  ${rates.length ? html`<p class="small" style="margin-top:16px">空き家率は総務省「令和5年住宅・土地統計調査」。</p>` : ''}
</section>
<section class="section wrap">
  <div class="split">
    <div class="rise"><h2>表にない市町村</h2></div>
    <div class="rise">
      <p class="lead">県内のほかの市町村は、まだ要綱を確かめていません。補助制度があるかは、市町村の建築・住宅の担当課か、空き家対策の担当課に問い合わせると分かります。</p>
      <p><a class="btn" href="${h('/tool/')}">補助額を自分で入れて計算する</a></p>
    </div>
  </div>
</section>`
  return { path, title: `${pref.name}の空き家解体補助金（市町村別）`, description: `${pref.name}の空き家解体補助金を、${list.map((c) => c.city).join('・')}の要綱で比べました。上限額・補助率・受付期間・空き家率。`, body }
}

export function cityPage(ctx, { city: c, params, prefs, log }) {
  const path = `/area/${c.pref_slug}/${c.slug}/`
  const h = (to) => ctx.href(path, to)
  const s = c.subsidy || {}
  const pref = prefs[c.pref_slug]
  const r = compare(params, c, { ...EXAMPLE_INPUT, eligible: Boolean(s.exists) })
  const myLog = (log || []).filter((e) => e.city_slug === c.slug)
  const title = s.exists ? `${c.city}の空き家解体補助金と解体後の税` : `${c.city}の空き家と解体後の税`

  const body = html`
<nav class="crumbs wrap" aria-label="現在地"><a href="${h('/')}">トップ</a> ／ <a href="${h('/area/')}">市町村の補助金</a> ／ <a href="${h(`/area/${c.pref_slug}/`)}">${esc(c.pref)}</a> ／ ${esc(c.city)}</nav>
<section class="wrap hero compact" style="padding-top:clamp(24px,4vw,48px)">
  <h1>${esc(title)}</h1>
  <p class="lead">${s.exists
    ? `${esc(c.city)}の「${esc(s.name || '解体の補助制度')}」は、${s.max_yen ? `上限${man(s.max_yen)}` : '上限額は未確認'}${s.rate ? `、補助率${esc(s.rate)}` : ''}。${esc(s.fiscal_year || '')}の要綱を${jdate(c.checked_at)}に確かめました。`
    : `${esc(c.city)}では、空き家の解体に使える補助制度を確かめられていません（${jdate(c.checked_at)}時点）。`}</p>
  ${s.exists ? html`<dl class="keyrow">
    <div><dt>上限額</dt><dd>${s.max_yen ? man(s.max_yen) : '未確認'}</dd></div>
    <div><dt>補助率</dt><dd class="${(s.rate || '').length > 8 ? 'text' : ''}">${esc(s.rate || '未確認')}</dd></div>
    <div><dt>受付</dt><dd class="text">${esc(s.period || '未確認')}</dd></div>
    <div><dt>工事の契約前の申請</dt><dd class="text">${yesNo(s.apply_before_contract)}</dd></div>
  </dl>` : ''}
</section>

${s.exists ? html`<section class="section wrap">
  <div class="split">
    <div class="rise">
      <h2>対象になる家と人</h2>
      ${s.formula_note ? html`<p style="margin-top:20px">${esc(s.formula_note)}</p>` : ''}
    </div>
    <div class="rise">
      <ul class="plain">${(s.conditions || []).map((x) => html`<li>${esc(x)}</li>`)}</ul>
      ${s.budget_note ? html`<p class="callout">${esc(s.budget_note)}</p>` : ''}
    </div>
  </div>
</section>` : ''}

${(c.pitfalls || []).length ? html`<section class="section wrap">
  <div class="split rev">
    <div class="rise">
      <ul class="plain">${c.pitfalls.map((x) => html`<li>${esc(x)}</li>`)}</ul>
    </div>
    <div class="rise"><h2>申請でつまずきやすいところ</h2><p style="margin-top:20px">要綱から読み取れる注意点です。</p></div>
  </div>
</section>` : ''}

${(s.changes_from_last_year || s.end_note) ? html`<section class="section wrap">
  <div class="section-head rise"><h2>前の年度からの変更と、制度の期限</h2></div>
  <div class="rise prose">
    ${s.changes_from_last_year ? html`<p>${esc(s.changes_from_last_year)}</p>` : ''}
    ${s.end_note ? html`<p>${esc(s.end_note)}</p>` : ''}
  </div>
</section>` : ''}

<section class="field">
  <div class="wrap">
    <div class="split">
      <div class="rise">
        <h2>${esc(c.city)}で解体すると、土地の税はどうなるか</h2>
        <p class="soft" style="margin-top:20px">入力例（土地${EXAMPLE_INPUT.landSqm}㎡、評価額${man(EXAMPLE_INPUT.assessed)}、延床${EXAMPLE_INPUT.floorSqm}㎡）で、${esc(c.city)}の都市計画税率${c.city_planning_tax?.rate_percent != null ? `${c.city_planning_tax.rate_percent}%` : '（未確認のため上限の0.3%）'}を当てはめた年額です。</p>
      </div>
      <div class="rise">
        ${r.tax ? html`<p class="bigfig num">${r.tax.ratio.toFixed(1)}<small>倍</small></p>
        <p class="statement" style="margin-top:16px">年 約${man(r.tax.withHouse.total)} → 約${man(r.tax.vacant.total)}</p>
        <p class="soft">更地の課税標準は評価額の${Math.round(params.vacantLandBurdenCap * 100)}%を上限として計算した、多めの目安です。<a href="${h('/guide/kaitai-go-zeikin/')}">計算の根拠</a></p>` : ''}
      </div>
    </div>
  </div>
</section>

<section class="section wrap">
  <div class="split">
    <div class="rise">
      <h2>自分の家で計算する</h2>
      <p style="margin-top:20px">${esc(c.city)}を選んだ状態で判定ツールを開きます。土地の評価額と延床面積を入れると、解体の実質負担と、持ち続ける費用が並びます。</p>
      <p><a class="btn" href="${h('/tool/')}?city=${esc(c.slug)}">${esc(c.city)}で計算する</a></p>
    </div>
    <div class="rise">
      ${r.net ? html`<p>入力例の木造${EXAMPLE_INPUT.floorSqm}㎡の場合、解体費の目安は${man(r.cost.min)}〜${man(r.cost.max)}。${r.sub ? `補助を引くと、実質負担は${man(Math.max(0, r.net.min))}〜${man(Math.max(0, r.net.max))}です。` : ''}</p>` : ''}
      <dl style="display:grid;gap:12px;margin:0">
        ${c.vacancy?.rate_percent != null ? html`<div><dt class="small">${esc(c.city)}の空き家率</dt><dd style="margin:0;font-weight:700;font-size:1.25rem">${c.vacancy.rate_percent}%${c.vacancy.count ? `（${c.vacancy.count.toLocaleString('ja-JP')}戸）` : ''}　<span class="small" style="font-weight:400">${esc(c.vacancy.survey || '')}</span></dd></div>` : ''}
        <div><dt class="small">空き家バンク</dt><dd style="margin:0">${c.akiya_bank?.exists ? (c.akiya_bank.url ? html`<a href="${esc(c.akiya_bank.url)}" rel="noopener">あり（${esc(domainOf(c.akiya_bank.url))}）</a>` : 'あり') : c.akiya_bank?.exists === false ? '確認できず' : '未確認'}</dd></div>
        <div><dt class="small">市が案内する解体見積もりの窓口</dt><dd style="margin:0">${c.estimate_window?.exists ? html`${esc(c.estimate_window.description || '')}${c.estimate_window.url ? html` <a href="${esc(c.estimate_window.url)}" rel="noopener">${esc(domainOf(c.estimate_window.url))}</a>` : ''}` : '確認できず'}</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="section wrap">
  <div class="split rev">
    <div class="rise prose">
      <h3 style="margin-top:0">出典</h3>
      <ul class="sources">
        ${(s.sources || []).map((u) => html`<li><a href="${esc(u)}" rel="noopener">${esc(u)}</a></li>`)}
        ${c.city_planning_tax?.source ? html`<li>都市計画税率：<a href="${esc(c.city_planning_tax.source)}" rel="noopener">${esc(c.city_planning_tax.source)}</a></li>` : ''}
        ${c.vacancy?.source ? html`<li>空き家率：<a href="${esc(c.vacancy.source)}" rel="noopener">${esc(c.vacancy.source)}</a></li>` : ''}
      </ul>
      ${(c.unverified || []).length ? html`<h3>確かめられていないこと</h3><ul class="plain small">${c.unverified.map((x) => html`<li>${esc(x)}</li>`)}</ul>` : ''}
      <h3>担当課への確認</h3>
      ${myLog.length ? html`<ul class="plain small">${myLog.map((e) => html`<li>${jdate(e.date)}　${esc(e.office)}：${esc(e.summary)}</li>`)}</ul>`
        : html`<p class="small">まだ電話での確認をしていません。${s.office ? `担当は${esc(s.office)}です。` : ''}申請の前に、受付状況と要件を担当課で確かめてください。</p>`}
    </div>
    <div class="rise">
      <h2>この情報について</h2>
      <p style="margin-top:20px">${jdate(c.checked_at)}に、${esc(c.city)}が公開している要綱・案内を読んで作りました。補助制度は年度の途中でも、予算に達すると受付が終わります。</p>
      <p class="small">誤りを見つけたら<a href="${h('/about/')}#contact">運営者</a>にお知らせください。直したら<a href="${h('/log/')}">更新履歴</a>に残します。</p>
    </div>
  </div>
</section>`
  return {
    path, title,
    description: s.exists
      ? `${c.city}の空き家解体補助金（${s.fiscal_year || ''}）：上限${s.max_yen ? man(s.max_yen) : '未確認'}、補助率${s.rate || '未確認'}。要件、申請の注意点、解体後の固定資産税の目安、出典と確認日。`
      : `${c.city}の空き家の解体補助と、解体後の固定資産税の目安。`,
    body,
  }
}
