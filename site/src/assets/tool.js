// 判定ツール（ブラウザ側）。計算は calc.js、表示は view.js をビルド時と共有する。
import { compare, judge, parseRate } from './calc.js'
import { ledgerHtml, esc, man, OPTION_TITLES } from './view.js'

const data = JSON.parse(document.getElementById('tool-data').textContent)
const form = document.getElementById('tool-form')
const $ = (id) => document.getElementById(id)

// ?city=slug で市町村を選んだ状態にする（市町村ページからのリンク用）
const qs = new URLSearchParams(location.search)
if (qs.get('city') && [...form.city.options].some((o) => o.value === qs.get('city'))) form.city.value = qs.get('city')

const val = (name) => {
  const el = form.elements[name]
  if (!el) return undefined
  if (el instanceof RadioNodeList) return el.value
  return el.value
}
const n = (name) => {
  const v = Number(val(name))
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function currentCity() {
  const slug = val('city')
  if (slug !== 'other') return data.cities.find((c) => c.slug === slug)
  const cap = n('otherCap') || null
  const rate = n('otherRate')
  const cityRate = Number(val('otherCityRate'))
  return {
    slug: 'other', city: 'お住まいの市町村',
    subsidy: { exists: Boolean(cap || rate), max_yen: cap, rate: rate ? `${rate}%` : null, conditions: [] },
    city_planning_tax: { rate_percent: Number.isFinite(cityRate) && cityRate > 0 ? cityRate : null },
  }
}

function renderConditions(city) {
  const box = $('conditions')
  const note = $('city-note')
  $('other-sub').hidden = val('city') !== 'other'
  if (!city || val('city') === 'other') { box.innerHTML = ''; note.textContent = ''; return }
  const s = city.subsidy
  if (!s || !s.exists) {
    note.innerHTML = `${esc(city.city)}では、解体の補助制度を確認できていません。<a href="${city.page}">${esc(city.city)}のページ</a>`
    box.innerHTML = ''
    return
  }
  note.innerHTML = `${esc(s.name || '解体の補助制度')}（${esc(s.fiscal_year || '')}）：上限${s.max_yen ? man(s.max_yen) : '未確認'}、${esc(s.rate_label || s.rate || '補助率未確認')}。${esc(s.status || '')} <a href="${city.page}">要件と出典</a>`
  box.innerHTML = (s.conditions || []).length
    ? `<p class="hint">主な要件：</p><ul class="plain hint">${s.conditions.slice(0, 6).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
    : ''
}

function render() {
  const city = currentCity()
  renderConditions(city)
  const input = {
    structure: val('structure'), floorSqm: n('floorSqm'), landSqm: n('landSqm'), assessed: n('assessed'),
    buildingTax: n('buildingTax'), upkeep: n('upkeep'), tripCost: n('tripCost'), trips: n('trips'), insurance: n('insurance'),
    eligible: val('eligible') === 'yes' && Boolean(city?.subsidy?.exists), cityTax: val('cityTax') === 'yes',
    rebuild: val('rebuild'), shared: val('shared'), plan: val('plan'), years: Number(val('years')) || 10, sellMonths: 12,
  }
  const r = compare(data.params, city, input)
  const j = judge(input, r)
  $('ledger').innerHTML = ledgerHtml(r, j, { cityName: city?.city || '市町村' })
  $("jump").innerHTML = `<span>判定：${OPTION_TITLES[j.primary]}</span><span>結果へ ↓</span>`

  const extra = []
  if (input.rebuild === 'unknown') extra.push('再建築ができるかは、市町村の建築指導の窓口で「接道」を確かめると分かります。できない土地なら、判定は「業者の買取」に変わります。')
  if (input.eligible && city?.subsidy?.exists && !city.subsidy.fixed_table && parseRate(city.subsidy.rate) === null && city.subsidy.max_yen) extra.push('補助率が要綱から読み取れなかったため、上限額を補助額として計算しています。')
  if (r.subUnknown) extra.push(`この延床面積の補助額は区分が確かめられていないため、補助なしで計算しています。${r.subUnknown}`)
  if (input.eligible && city?.subsidy?.open === false) extra.push(`${city.city}の補助は、今年度の受付を終えています。来年度の受付開始を待つか、補助なしで比べてください。`)
  if (r.tax && r.tax.ratio) extra.push(`解体すると、土地の税は年 約${man(r.tax.vacant.total - r.tax.withHouse.total)}増えます（約${r.tax.ratio.toFixed(1)}倍）。税額は1月1日時点の状況で決まります。`)
  $('verdict').innerHTML = `<h2>次の一歩：${OPTION_TITLES[j.primary]}</h2>${[...j.reasons, ...extra].map((t) => `<p>${esc(t)}</p>`).join('')}${j.primary === 'kaitori' ? `<p><a href="${data.links.kaitori}">業者に売る前に知っておくこと</a></p>` : ''}`

  // 広告の枠：判定結果ごとに1つだけ。URLが未設定（提携前）なら出さない。持ち続ける場合は出さない。
  const offerKey = { kaitori: 'kaitori', sell: 'satei', demolish: null, keep: input.plan === 'use' ? 'reform' : null }[j.primary]
  const o = offerKey && data.offers[offerKey]
  const win = city?.estimate_window
  let offerHtml = ''
  if (o && o.url) {
    offerHtml = `<div class="offer"><span class="pr">PR（広告）</span><p>${esc(o.text)}</p><p><a class="btn" href="${esc(o.url)}" rel="sponsored noopener" target="_blank">${esc(o.label)}</a></p></div>`
  } else if (j.primary === 'sell' && win && win.exists && win.url) {
    offerHtml = `<div class="offer"><p>${esc(city.city)}が案内している解体の見積もりの窓口：<a href="${esc(win.url)}" rel="noopener">${esc(win.description || win.url)}</a>（広告ではありません）</p></div>`
  }
  $('offer').innerHTML = offerHtml
}

// 結果が画面に入ったら、下の帯を隠す
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => es.forEach((e) => $('jump').classList.toggle('away', e.isIntersecting)), { threshold: 0.15 }).observe($('result'))
}
form.addEventListener('input', render)
form.addEventListener('change', render)
if ($('print')) $('print').addEventListener('click', () => window.print())
render()
