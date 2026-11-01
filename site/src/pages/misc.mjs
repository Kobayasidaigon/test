import { html, esc, man, jdate } from '../lib.mjs'

const CSV_COLUMNS = [
  ['都道府県', (c) => c.pref], ['市町村', (c) => c.city], ['制度名', (c) => c.subsidy?.name],
  ['上限額（円）', (c) => c.subsidy?.max_yen], ['補助率', (c) => c.subsidy?.rate], ['受付期間', (c) => c.subsidy?.period],
  ['契約前の申請', (c) => c.subsidy?.apply_before_contract === true ? '必要' : c.subsidy?.apply_before_contract === false ? '不要' : ''],
  ['年度', (c) => c.subsidy?.fiscal_year], ['都市計画税率（%）', (c) => c.city_planning_tax?.rate_percent],
  ['空き家率（%）', (c) => c.vacancy?.rate_percent], ['確認日', (c) => c.checked_at], ['出典', (c) => (c.subsidy?.sources || []).join(' ')],
]

export function hojoCsv(cities) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + [CSV_COLUMNS.map(([k]) => q(k)).join(','), ...cities.map((c) => CSV_COLUMNS.map(([, f]) => q(f(c))).join(','))].join('\r\n') + '\r\n'
}

export function dataPage(ctx, { cities }) {
  const path = '/data/kaitai-hojo/'
  const h = (to) => ctx.href(path, to)
  const body = html`
<section class="wrap hero">
  <h1>空き家解体補助の一覧データ</h1>
  <p class="lead">確かめた${cities.length}市町の補助制度を1つの表にまとめ、CSVでも配っています。出典と確認日をつけていれば、引用や転載は自由です。</p>
  <div class="hero-actions"><a class="btn" href="${h('/data/kaitai-hojo.csv')}" download>CSVをダウンロード</a></div>
</section>
<section class="section wrap">
  <div class="table-scroll">
    <table class="data">
      <thead><tr>${CSV_COLUMNS.slice(0, 10).map(([k]) => html`<th scope="col">${esc(k)}</th>`)}</tr></thead>
      <tbody>${cities.map((c) => html`<tr>
        <td>${esc(c.pref)}</td><td><a href="${h(`/area/${c.pref_slug}/${c.slug}/`)}">${esc(c.city)}</a></td><td>${esc(c.subsidy?.name || '—')}</td>
        <td class="r">${c.subsidy?.max_yen ? man(c.subsidy.max_yen) : '—'}</td><td>${esc(c.subsidy?.rate || '—')}</td><td class="small">${esc(c.subsidy?.period || '—')}</td>
        <td>${c.subsidy?.apply_before_contract === true ? '必要' : c.subsidy?.apply_before_contract === false ? '不要' : '—'}</td>
        <td class="small">${esc(c.subsidy?.fiscal_year || '')}</td><td class="r">${c.city_planning_tax?.rate_percent ?? '—'}</td><td class="r">${c.vacancy?.rate_percent ?? '—'}</td>
      </tr>`)}</tbody>
    </table>
  </div>
  <div class="prose" style="margin-top:40px">
    <h2 style="margin-top:0">集め方</h2>
    <p>各市町村が公開している要綱・手引き・案内ページを読み、上限額、補助率、受付期間、契約前申請の要否を書き写しました。別の担当が同じ項目を別の検索で照合し、一致しなかった値は「未確認」にしています。都市計画税率は各市町村の税のページ、空き家率は総務省「令和5年住宅・土地統計調査」です。</p>
    <p>補助制度は年度ごとに改定されます。確認日より後の変更は反映されていないことがあります。</p>
  </div>
</section>`
  return { path, title: '空き家解体補助の一覧データ（CSV）', description: `空き家の解体補助制度を${cities.length}市町分、上限額・補助率・受付期間・都市計画税率・空き家率・出典つきで一覧にしたデータ。CSVあり。`, body }
}

export function aboutPage(ctx) {
  const path = '/about/'
  const h = (to) => ctx.href(path, to)
  const op = ctx.site.operator
  const filled = op.name && op.story
  const body = html`
<section class="wrap hero">
  <h1>運営者と編集方針</h1>
  <p class="lead">${esc(ctx.site.name)}は、相続した空き家をどうするか迷っている人のために、市町村ごとの数字を集めて計算できるようにしたサイトです。</p>
</section>
<section class="section wrap">
  <div class="split">
    <div class="rise"><h2>運営者</h2></div>
    <div class="rise">
      ${filled ? html`
        ${op.photo ? html`<img src="${esc(op.photo)}" alt="${esc(op.name)}" width="320" height="320" style="margin-bottom:24px">` : ''}
        <p class="lead"><strong>${esc(op.name)}</strong>　${esc(op.role)}</p>
        <p>${esc(op.story)}</p>`
        : html`<p class="missing">公開前に記入する欄です（src/config.mjs の operator）。名前、空き家との関わり、連絡先を、運営者自身の言葉で書いてください。</p>`}
      <p id="contact">誤りのご指摘や、掲載している市町村の制度変更の情報は、${op.contact ? html`<a href="${esc(op.contact)}">こちら</a>` : '問い合わせ先（公開前に記入）'}にお寄せください。</p>
    </div>
  </div>
</section>
<section class="section wrap">
  <div class="split">
    <div class="rise"><h2>数字の扱い</h2></div>
    <div class="rise">
      <ul class="plain">
        <li>補助制度は、市町村が公開している要綱・手引きで確かめます。確かめた日付をページに書きます。</li>
        <li>確かめられなかった数字は載せず、「未確認」と書きます。</li>
        <li>担当課に電話で確かめた内容は、<a href="${h('/log/')}">確認記録</a>に日付と担当課名をつけて残します。</li>
        <li>計算の式と割合は、<a href="${h('/tool/')}#method">判定ツールのページ</a>にすべて公開します。</li>
        <li>税額や法律について、個別の判断はしません。税務署・法務局・専門家への相談をおすすめします。</li>
      </ul>
    </div>
  </div>
</section>
<section class="section wrap">
  <div class="split">
    <div class="rise"><h2>広告について</h2></div>
    <div class="rise">
      <p>${esc(ctx.site.adPolicy)}</p>
      <p>広告は、判定ツールの結果に応じて1つだけ出します。「持ち続ける」と判定された場合と、解体の補助について調べている場面では、広告を出しません。広告主から、記事の内容や判定の結果について指示を受けることはありません。</p>
    </div>
  </div>
</section>`
  return { path, title: '運営者と編集方針', description: `${ctx.site.name}の運営者、数字の集め方と確かめ方、広告の方針。`, body }
}

export function logPage(ctx, { log, cities }) {
  const path = '/log/'
  const entries = [...(log || [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const body = html`
<section class="wrap hero">
  <h1>確認記録と更新履歴</h1>
  <p class="lead">担当課への問い合わせ、データの更新、誤りの訂正を日付順に残しています。</p>
</section>
<section class="section wrap">
  <div class="table-scroll">
    <table class="data">
      <thead><tr><th scope="col">日付</th><th scope="col">種類</th><th scope="col">対象</th><th scope="col">内容</th></tr></thead>
      <tbody>${entries.map((e) => html`<tr><td class="small">${jdate(e.date)}</td><td>${esc(e.kind)}</td><td>${esc(e.target)}</td><td>${esc(e.summary)}</td></tr>`)}</tbody>
    </table>
  </div>
</section>`
  return { path, title: '確認記録と更新履歴', description: '担当課への確認、データの更新、訂正の記録。', body }
}

export function privacyPage(ctx) {
  const path = '/privacy/'
  const body = html`
<section class="wrap hero">
  <h1>プライバシーポリシー</h1>
</section>
<section class="section wrap">
  <div class="prose">
    <p>判定ツールに入力した数字は、お使いのブラウザの中だけで計算に使い、運営者のサーバーには送りません。</p>
    <p>このサイトには、アフィリエイト広告のリンクがあります。広告をクリックすると、広告配信事業者がCookieを使って成果を計測することがあります。</p>
    <p>アクセス解析ツールを導入した場合は、このページに名称と、データの扱いを追記します。</p>
  </div>
</section>`
  return { path, title: 'プライバシーポリシー', description: `${ctx.site.name}のプライバシーポリシー。`, body }
}

export function notFoundPage(ctx) {
  const path = '/404.html'
  const h = (to) => ctx.href('/', to)
  const body = html`
<section class="wrap hero">
  <h1>ページが見つかりません</h1>
  <p class="lead">移動したか、制度の終了にあわせて統合したページかもしれません。</p>
  <div class="hero-actions"><a class="btn" href="${h('/area/')}">市町村の一覧へ</a><a href="${h('/')}">トップへ</a></div>
</section>`
  return { path, title: 'ページが見つかりません', description: 'ページが見つかりません。', body }
}
