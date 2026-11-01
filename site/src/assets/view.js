// 4つの選択肢の帳票を組み立てる。ビルド時（トップの例）とブラウザ（判定ツール）で同じものを使う。

export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const man = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${(Math.round(n / 1000) / 10).toLocaleString('ja-JP')}万円`

// 帳票の大きな数字用。100万円以上は整数、それ未満は小数1桁。単位は小さく組む。
const fig = (n) => {
  const v = Math.max(0, n) / 10000
  return v >= 100 ? Math.round(v).toLocaleString('ja-JP') : (Math.round(v * 10) / 10).toLocaleString('ja-JP')
}
const unit = '<small>万円</small>'

export const OPTION_TITLES = {
  demolish: '解体してから売る',
  sell: '古家付きのまま売る',
  kaitori: '業者の買取に出す',
  keep: '持ち続ける',
}

export function ledgerHtml(r, j, { caption = '', cityName = '市町村' } = {}) {
  const cols = [
    {
      key: 'demolish',
      fig: r.net ? `<span style="white-space:nowrap">${Math.round(Math.max(0, r.net.min) / 10000)}〜${Math.round(Math.max(0, r.net.max) / 10000)}${unit}</span>` : '—',
      lines: [
        r.cost ? `解体費 ${man(r.cost.min)}〜${man(r.cost.max)}${r.sub ? `から、${cityName}の補助 ${man(r.sub.min)}〜${man(r.sub.max)}を引いた額` : '（補助なしで計算）'}` : '延床面積と構造を入れると解体費を出します',
        r.tax ? `解体後の土地の税は年 約${man(r.tax.vacant.total)}（今は約${man(r.tax.withHouse.total)}）` : '土地の評価額を入れると、解体後の税を出します',
      ],
    },
    {
      key: 'sell',
      fig: `${fig(r.sellHolding)}${unit}`,
      lines: [`売れるまで${r.sellMonths}か月かかった場合に、それまでに払う税と管理の費用`, '解体費はかからない。価格は査定で決まる'],
    },
    {
      key: 'kaitori',
      fig: '査定次第',
      lines: ['再建築ができない、共有名義でまとまらない家の選択肢', '業者への売却はクーリング・オフができない。複数社で比べる'],
    },
    {
      key: 'keep',
      fig: `${fig(r.keep.total)}${unit}<small>（${r.keep.years}年）</small>`,
      lines: [`年 約${man(r.keep.yearly)}（土地と建物の税、草刈り、交通費、保険）`, '管理不全空家として勧告を受けると、土地の税の特例が外れる'],
    },
  ]
  return `<div class="ledger" role="group" aria-label="4つの選択肢の比較">
  ${caption ? `<p class="ledger-caption">${caption}</p>` : ''}
  <div class="ledger-grid">
    ${cols.map((c) => {
      const primary = j && j.primary === c.key
      return `<div class="ledger-col${primary ? ' is-primary' : ''}">
      <h3>${OPTION_TITLES[c.key]}</h3>
      ${primary ? '<p class="pick">判定：まずここから</p>' : ''}
      <div class="fig">${c.fig}</div>
      ${c.lines.filter(Boolean).map((l) => `<p${primary ? ' class="soft"' : ''}>${esc(l)}</p>`).join('')}
    </div>`
    }).join('')}
  </div>
</div>`
}
