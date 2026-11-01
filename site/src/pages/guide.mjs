import { html, esc, jdate } from '../lib.mjs'
import { fracText } from './home.mjs'

const src = (params, key) => (params.sources || []).find((s) => s.key === key)
const cite = (params, key) => {
  const s = src(params, key)
  return s ? html`（出典：<a href="${esc(s.url)}" rel="noopener">${esc(s.name || s.url)}</a>）` : ''
}

export const GUIDES = [
  { slug: 'kaitai-go-zeikin', title: '空き家を解体すると、土地の税はいくら上がるか', summary: '住宅用地の特例が外れる仕組みと、「6倍」にならない理由。' },
  { slug: 'kaitori-chuui', title: '業者に家を売る前に知っておくこと', summary: 'クーリング・オフがないこと、複数社で比べること、共有名義のこと。' },
]

export function guideIndexPage(ctx) {
  const h = (to) => ctx.href('/guide/', to)
  const body = html`
<section class="wrap hero">
  <h1>解説</h1>
  <p class="lead">判定ツールの数字の裏にある制度を、一次資料に沿って説明します。個別の税額や法律の判断はしません。</p>
</section>
<section class="section wrap">
  ${GUIDES.map((g) => html`<div class="split rise" style="margin-bottom:clamp(40px,5vw,72px)">
    <h2><a href="${h(`/guide/${g.slug}/`)}">${esc(g.title)}</a></h2>
    <p class="lead">${esc(g.summary)}</p>
  </div>`)}
</section>`
  return { title: '解説', description: '空き家の解体後の固定資産税、業者に売る前の注意など、判断に必要な制度の解説。', body }
}

export function taxGuidePage(ctx, { params }) {
  const path = '/guide/kaitai-go-zeikin/'
  const h = (to) => ctx.href(path, to)
  const p = params
  const cap = Math.round(p.vacantLandBurdenCap * 100)
  const tk = src(p, 'tokubetsu_kojo')
  const body = html`
<nav class="crumbs wrap" aria-label="現在地"><a href="${h('/')}">トップ</a> ／ <a href="${h('/guide/')}">解説</a> ／ 解体後の土地の税</nav>
<section class="wrap hero compact" style="padding-top:clamp(24px,4vw,48px)">
  <h1>解体すると、土地の税はいくら上がるか</h1>
  <p class="lead">家が建っている土地は、住宅用地の特例で税が軽くなっています。解体すると特例が外れて税が上がりますが、よく言われる「6倍」にはなりません。</p>
</section>
<section class="section wrap">
  <div class="prose">
    <h2 style="margin-top:0">住宅用地の特例の割合</h2>
    <div class="table-scroll">
      <table class="data" style="min-width:520px">
        <thead><tr><th scope="col">土地の部分</th><th scope="col">固定資産税の課税標準</th><th scope="col">都市計画税の課税標準</th></tr></thead>
        <tbody>
          <tr><td>200㎡までの部分（小規模住宅用地）</td><td>評価額の${fracText(p.small.fixed)}</td><td>評価額の${fracText(p.small.city)}</td></tr>
          <tr><td>200㎡を超える部分（一般住宅用地）</td><td>評価額の${fracText(p.general.fixed)}</td><td>評価額の${fracText(p.general.city)}</td></tr>
          <tr><td>更地（住宅用地でない宅地）</td><td>評価額の${cap}%が上限</td><td>評価額の${cap}%が上限</td></tr>
        </tbody>
      </table>
    </div>
    <p class="small">${cite(p, 'jutaku_tokurei')}</p>
    <p>住宅用地として扱われるのは、建物の床面積の${p.residentialFloorMultiple}倍までの面積です。税率は、固定資産税が${(p.fixedAssetTaxRate * 100).toFixed(1)}%（標準税率）、都市計画税が市町村の決めた率（上限${(p.cityPlanningTaxMaxRate * 100).toFixed(1)}%）です。${cite(p, 'zeiritsu')}</p>

    <h2>「6倍」にならない理由</h2>
    <p>200㎡までの部分は、家があると課税標準が評価額の${fracText(p.small.fixed)}です。特例が外れると6倍になりそうですが、更地のような住宅用地でない宅地には負担調整の仕組みがあり、課税標準は評価額の${cap}%までに抑えられます。${cite(p, 'futan_chosei')}</p>
    <div class="callout">
      <p><strong>200㎡以下の土地の固定資産税</strong>：${cap}% ÷ ${fracText(p.small.fixed)} ＝ 約${(p.vacantLandBurdenCap / p.small.fixed).toFixed(1)}倍</p>
      <p><strong>都市計画税</strong>：${cap}% ÷ ${fracText(p.small.city)} ＝ 約${(p.vacantLandBurdenCap / p.small.city).toFixed(1)}倍</p>
    </div>
    <p>この${cap}%の上限は、${esc(p.burdenAdjustmentUntil)}まで適用される負担調整措置によるものです。${esc(p.burdenAdjustmentUntil)}より後の扱いは、その年の税制改正で決まります。</p>
    <p>これは上限で計算した目安です。実際の課税標準は、前の年度の課税標準や市町村の扱いで決まるので、これより低くなることがあります。正確な額は、市町村の資産税の担当課で「解体した場合の税額」を尋ねると教えてもらえます。</p>

    <h2>いつから上がるか</h2>
    <p>固定資産税は、その年の1月1日の状況で決まります${cite(p, 'fuka_kijitsu')}。12月に解体すると、翌年度から更地の税額になります。1月2日以降に解体すれば、その年度は住宅用地のままです。</p>

    <h2>解体しなくても特例が外れる場合</h2>
    <p>放置された空き家が「管理不全空家」や「特定空家」として市町村から勧告を受けると、家が建っていても住宅用地の特例が外れます${cite(p, 'kanri_fuzen')}。持ち続けるなら、草刈りや見回りを続けることが税の面でも意味を持ちます。</p>

    ${tk ? html`<h2>売るときの税の特例</h2>
    <p>相続した空き家を売ったときは、一定の条件で譲渡所得から最大3,000万円を差し引ける特例があります。${esc(tk.explanation || '')}（出典：<a href="${esc(tk.url)}" rel="noopener">${esc(tk.name || tk.url)}</a>）。条件は細かいので、使えるかどうかは税務署か税理士に確かめてください。</p>` : ''}

    <h2>自分の家で確かめる</h2>
    <p><a href="${h('/tool/')}">判定ツール</a>に、課税明細書の土地の評価額と面積を入れると、家がある場合と更地の場合の年税額が並びます。</p>
    <p class="small">この解説の割合と税率は${jdate(p.checked_at)}に確かめました。</p>
  </div>
</section>`
  return { path, title: '空き家を解体すると土地の固定資産税はいくら上がるか（6倍にならない理由）', description: `住宅用地の特例（${fracText(p.small.fixed)}・${fracText(p.small.city)}）が外れる仕組みと、負担調整で更地の課税標準が評価額の${cap}%までに抑えられるため約${(p.vacantLandBurdenCap / p.small.fixed).toFixed(1)}倍にとどまる理由。`, body }
}

export function kaitoriGuidePage(ctx, { params }) {
  const path = '/guide/kaitori-chuui/'
  const h = (to) => ctx.href(path, to)
  const p = params
  const body = html`
<nav class="crumbs wrap" aria-label="現在地"><a href="${h('/')}">トップ</a> ／ <a href="${h('/guide/')}">解説</a> ／ 業者に売る前に</nav>
<section class="wrap hero compact" style="padding-top:clamp(24px,4vw,48px)">
  <h1>業者に家を売る前に知っておくこと</h1>
  <p class="lead">再建築ができない家や、共有名義でまとまらない家は、不動産業者の買取が現実的な選択肢になります。ただ、契約してから後悔する相談も出ています。</p>
</section>
<section class="section wrap">
  <div class="prose">
    <h2 style="margin-top:0">クーリング・オフはできない</h2>
    <p>自宅や実家を業者に売る契約には、クーリング・オフの制度がありません。国民生活センターは、強引な勧誘で自宅を相場より安く売らされた相談について注意を呼びかけています${cite(p, 'kokusen_baikyaku')}。家を売ったあとも住み続けられる「リースバック」の契約でも、同じような注意が出ています${cite(p, 'leaseback')}。2026年8月には、リースバックの後に家賃を上げられたり退去を求められたりした相談についても注意が出ました${cite(p, 'leaseback2026')}。</p>

    <h2>その場で決めない</h2>
    <ul>
      <li>査定は複数の業者から取ります。1社の金額だけでは、高いか安いかが分かりません。</li>
      <li>契約書は持ち帰り、家族に見せてから署名します。「今日だけの価格」と急かされたら、いったん断ります。</li>
      <li>手付金を受け取ったあとに契約をやめると、手付金の倍額を返すなどの負担が生じることがあります。契約前に、解約の条件を書面で確かめます。</li>
    </ul>

    <h2>共有名義の家</h2>
    <p>親から兄弟姉妹で相続した家は、共有名義になっていることがあります。家全体を売るには、共有している全員の同意が必要です。相続登記がまだなら、先に名義を整えます${cite(p, 'sozoku_toki')}。</p>

    <h2>買取が向く家、向かない家</h2>
    <p>買取は、買い手を探す期間がなく、早く手放せるのが利点です。一方で、仲介で買い手を探せる家なら、仲介のほうが高く売れることが多いと言われます。<a href="${h('/tool/')}">判定ツール</a>では、再建築ができない家と、共有名義で意見がまとまらない家のときだけ、買取を第一候補にしています。</p>

    <div class="callout">
      <p><strong>このサイトの広告について。</strong>判定ツールで「業者の買取」と判定された場合に、買取業者の広告（PR）を1つだけ表示することがあります。広告を出す業者は、対応できる物件と地域を確かめたうえで選びます。広告の有無は、判定の結果に影響しません。</p>
    </div>
  </div>
</section>`
  return { path, title: '業者に家を売る前に知っておくこと（空き家・実家の買取）', description: '業者への自宅売却にはクーリング・オフがありません。複数社の査定、契約書の持ち帰り、共有名義の扱いなど、買取の前に確かめること。', body }
}
