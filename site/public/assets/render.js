/*
 * 明細の表・累計グラフ・ひとことの結論を HTML 文字列で作る。
 * ビルド時（静的HTMLへの書き出し）とブラウザ（入力の変更時）で同じ関数を使う。
 */
(function (root) {
  'use strict';

  function man(n) {
    // 円 → 「188.0万円」。1万円未満は円で出す。
    if (!isFinite(n)) return '—';
    var sign = n < 0 ? '−' : '';
    var a = Math.abs(n);
    if (a < 10000) return sign + Math.round(a).toLocaleString('ja-JP') + '円';
    return sign + (a / 10000).toFixed(1) + '万円';
  }
  // 明細の表用：常に万円単位。スマホでは単位を表の説明にまとめて数字だけ見せる
  function manT(n) {
    var sign = n < 0 ? '−' : '';
    return sign + (Math.abs(n) / 10000).toFixed(1) + '<span class="u">万円</span>';
  }
  function yen(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ja-JP') + '円'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var NIL = '<span class="nil" aria-label="なし">—</span>';
  function note(t) { return t ? '<span class="row-note">' + t + '</span>' : ''; }

  function taxNote(s) {
    if (s.ineligibleReason === 'built') return '1981年6月以降の建築なので控除なし';
    if (s.ineligibleReason === 'price') return '売却額が1億円を超えるので控除なし';
    if (s.ineligibleReason === 'expired') return '控除の期限（2027年12月31日）を過ぎるので控除なし';
    var who = s.heirs >= 3 ? '1人2,000万円×' + s.heirs + '人' : (s.heirs > 1 ? '1人3,000万円×' + s.heirs + '人' : '3,000万円');
    return '空き家の特別控除（' + who + '）を使えた場合。使えなければ' + man(s.taxWithout);
  }

  function statement(r, input) {
    var k = r.keep, c = r.clear, s = r.sell;
    var rows = [
      { label: '固定資産税・都市計画税', note: '家が建っている土地は住宅用地の特例で安い', keepN: k.annualTax.total, clearN: c.steadyTax.total, clearNote: '2年目から（特例なし）', sellN: s.yearOneTax, sellNote: '売る年の分（日割り精算の前）' },
      { label: '火災保険', keepN: input.insurance },
      { label: '見回り・管理', note: '通う交通費か管理サービス', keepN: input.management },
      { label: '水道・電気の基本料金', keepN: input.utilities },
      { label: '草刈り・庭木', keepN: input.mowing, clearN: input.mowing },
    ];
    var body = rows.map(function (row) {
      return '<tr><th scope="row">' + esc(row.label) + note(row.note) + '</th>' +
        '<td>' + (row.keepN ? manT(row.keepN) + '<span class="per">/年</span>' : NIL) + '</td>' +
        '<td>' + (row.clearN ? manT(row.clearN) + '<span class="per">/年</span>' : NIL) + note(row.clearNote) + '</td>' +
        '<td>' + (row.sellN ? manT(row.sellN) : NIL) + note(row.sellNote) + '</td></tr>';
    }).join('');
    body += '<tr><th scope="row">解体費' + note(esc(input.structureLabel || '') + ' 延床' + Math.round(input.floorSqm / 3.30579) + '坪×坪' + (c.perTsubo / 10000).toFixed(1) + '万円') + '</th><td>' + NIL + '</td><td>' + manT(c.demolitionGross) + '</td><td>' + NIL + '</td></tr>';
    body += '<tr><th scope="row">解体の補助金' + note(esc(input.subsidyNote || (c.subsidyEligible ? '補助率と上限で計算' : '対象外か制度なし'))) + '</th><td>' + NIL + '</td><td class="plus">' + (c.subsidy ? '−' + manT(c.subsidy) : NIL) + '</td><td>' + NIL + '</td></tr>';
    body += '<tr><th scope="row">売却額' + note(input.salePrice > 0 ? '入力した額' : '地価×土地面積−解体費の推定。査定額を入れると正確に') + '</th><td>' + NIL + '</td><td>' + NIL + '</td><td class="plus">' + manT(s.price) + '</td></tr>';
    body += '<tr><th scope="row">仲介手数料' + note('通常の上限で計算' + (s.lowCost ? '。800万円以下は、事前の説明と合意があれば最大33万円' : '')) + '</th><td>' + NIL + '</td><td>' + NIL + '</td><td>' + manT(s.fee) + '</td></tr>';
    body += '<tr><th scope="row">譲渡所得の税' + note(taxNote(s)) + '</th><td>' + NIL + '</td><td>' + NIL + '</td><td>' + (s.tax ? manT(s.tax) : '0<span class="u">円</span>') + '</td></tr>';

    var foot = '<tr class="sum"><th scope="row">' + r.years + '年の合計</th>' +
      '<td><span class="sum-label">出ていくお金</span>' + manT(k.total) + '</td>' +
      '<td><span class="sum-label">出ていくお金</span>' + manT(c.total) + '</td>' +
      '<td><span class="sum-label">手元に残るお金</span>' + manT(s.net) + '</td></tr>';

    return '<div class="ledger-wrap"><table class="ledger">' +
      '<caption>' + esc(input.captionText || '10年明細') + '。金額は1年あたり（解体費・補助金・売却は1回だけ）<span class="u-note">。単位は万円</span></caption>' +
      '<thead><tr><th scope="col">費目</th><th scope="col"><span class="ph">持ち</span><span class="ph">続ける</span></th><th scope="col"><span class="ph">解体して</span><span class="ph">更地で持つ</span></th><th scope="col"><span class="ph">1年目に</span><span class="ph">売る</span></th></tr></thead>' +
      '<tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
  }

  function finding(r) {
    var diff = r.clear.total - r.keep.total;
    if (r.crossover === 1) return 'この条件だと、最初の年から最後まで、解体して更地で持つほうが出ていくお金は少なくなります。' + r.years + '年で<strong>' + man(-diff) + '</strong>の差です。';
    if (r.crossover) return 'この条件だと、解体して更地で持つほうが<strong>' + r.crossover + '年目</strong>から安くなります。それまでは、家を残したほうが出ていくお金は少なめです。';
    if (diff === 0) return 'この条件だと、' + r.years + '年の合計は、持ち続けても更地にしても同じです。';
    if (r.reversal) return 'この条件だと、途中で一度は更地のほうが安くなりますが、' + r.years + '年の合計では家を残したほうが<strong>' + man(diff) + '</strong>少なくなります。';
    return 'この条件だと、' + r.years + '年のうちは更地にしても安くなりません。解体費と、特例が外れて上がる土地の税が、家の維持費より重いためです。差は<strong>' + man(diff) + '</strong>です。';
  }

  function legend() {
    return '<ul class="legend" aria-hidden="true"><li><i></i>持ち続ける</li><li class="clear"><i></i>解体して更地で持つ</li></ul>';
  }

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
    var f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  function chart(r) {
    // 累計の折れ線。x=年、y=累計の支出。持ち続ける（墨）と更地（緑）。
    var W = 640, H = 320, L = 86, R = 34, T = 28, B = 50;
    var n = r.years;
    var maxV = Math.max(r.keep.total, r.clear.total, 1);
    var step = Math.max(niceStep(maxV / 4), 10000);
    var top = Math.max(Math.ceil(maxV / step) * step, step);
    function x(i) { return L + (W - L - R) * (i / n); }
    function y(v) { return T + (H - T - B) * (1 - v / top); }
    var grid = '';
    for (var g = 0; g <= top + 1; g += step) {
      var label = g === 0 ? '0' : (step % 10000 === 0 ? Math.round(g / 10000) : (g / 10000).toFixed(1)) + '万';
      grid += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>' +
        '<text class="tick" x="' + (L - 10) + '" y="' + (y(g) + 5) + '" text-anchor="end">' + label + '</text>';
    }
    var xt = '';
    for (var i = 1; i <= n; i++) xt += '<text class="tick' + (i % 2 === 0 && i !== n ? ' even' : '') + '" x="' + x(i) + '" y="' + (H - B + 26) + '" text-anchor="middle">' + i + '年</text>';
    function path(rows) {
      var d = 'M' + x(0) + ',' + y(0);
      rows.forEach(function (row, idx) { d += ' L' + x(idx + 1) + ',' + y(row.cumulative); });
      return d;
    }
    var mark = '';
    if (r.crossover) {
      var cx = x(r.crossover), cy = y(r.clear.rows[r.crossover - 1].cumulative);
      var nearEnd = r.crossover >= n - 1;
      var text = r.crossover === 1 ? '1年目から安い' : r.crossover + '年目で逆転';
      mark = '<circle class="cross" cx="' + cx + '" cy="' + cy + '" r="6"/>' +
        '<text class="cross-label" x="' + (nearEnd ? cx + 4 : cx) + '" y="' + (cy - 16) + '" text-anchor="' + (nearEnd ? 'end' : 'middle') + '">' + text + '</text>';
    }
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="出ていくお金の累計（' + n + '年）。持ち続けると' + man(r.keep.total) + '、解体して更地で持つと' + man(r.clear.total) + '">' +
      grid + xt +
      '<path class="line keep" d="' + path(r.keep.rows) + '"/>' +
      '<path class="line clear" d="' + path(r.clear.rows) + '"/>' + mark + '</svg>';
  }

  function jumpText(r) {
    var j = r.clear.taxJump;
    if (j === null) return '—';
    if (!isFinite(j)) return '0円→' + man(r.clear.clearLandTax);
    return j.toFixed(1) + '倍';
  }

  var api = { statement: statement, finding: finding, chart: chart, legend: legend, jumpText: jumpText, man: man, yen: yen, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AkiyaRender = api;
})(this);
