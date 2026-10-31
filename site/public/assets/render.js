/*
 * 明細の表・累計グラフ・ひとことの結論を HTML 文字列で作る。
 * ビルド時（静的HTMLへの書き出し）とブラウザ（入力の変更時）で同じ関数を使う。
 */
(function (root) {
  'use strict';

  function man(n) {
    // 円 → 「188.0万円」。1万円未満は円で出す。
    var sign = n < 0 ? '−' : '';
    var a = Math.abs(n);
    if (a < 10000) return sign + a.toLocaleString('ja-JP') + '円';
    return sign + (a / 10000).toFixed(1) + '万円';
  }
  // 明細の表用：常に万円単位。スマホでは単位を表の説明にまとめて数字だけ見せる
  function manT(n) {
    var sign = n < 0 ? '−' : '';
    return sign + (Math.abs(n) / 10000).toFixed(1) + '<span class="u">万円</span>';
  }
  function yen(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ja-JP') + '円'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function statement(r, input) {
    var k = r.keep, c = r.clear, s = r.sell;
    var rows = [
      { label: '固定資産税・都市計画税', note: '家が建っている土地は住宅用地の特例で安い', keepN: k.annualTax.total, clearN: c.steadyTax.total, clearNote: '2年目から（特例なし）', sellN: s.yearOneTax, sellNote: '売る年の分' },
      { label: '火災保険', keepN: input.insurance, clearN: 0, sellN: 0 },
      { label: '見回り・管理', note: '通う交通費か管理サービス', keepN: input.management, clearN: 0, sellN: 0 },
      { label: '水道・電気の基本料金', keepN: input.utilities, clearN: 0, sellN: 0 },
      { label: '草刈り・庭木', keepN: input.mowing, clearN: input.mowing, sellN: 0 },
    ];
    var body = rows.map(function (row) {
      return '<tr><th scope="row">' + esc(row.label) + (row.note ? '<span class="row-note">' + esc(row.note) + '</span>' : '') + '</th>' +
        '<td>' + manT(row.keepN) + '<span class="per">/年</span></td>' +
        '<td>' + (row.clearN ? manT(row.clearN) + '<span class="per">/年</span>' : '<span class="nil">なし</span>') + (row.clearNote ? '<span class="row-note">' + esc(row.clearNote) + '</span>' : '') + '</td>' +
        '<td>' + (row.sellN ? manT(row.sellN) : '<span class="nil">なし</span>') + (row.sellNote ? '<span class="row-note">' + esc(row.sellNote) + '</span>' : '') + '</td></tr>';
    }).join('');
    body += '<tr><th scope="row">解体費<span class="row-note">' + (input.structureLabel || '') + ' 延床' + Math.round(input.floorSqm / 3.30579) + '坪の目安</span></th><td><span class="nil">なし</span></td><td>' + manT(c.demolitionGross) + '</td><td><span class="nil">なし</span></td></tr>';
    body += '<tr><th scope="row">解体補助金<span class="row-note">' + (input.subsidyNote || (c.subsidyEligible ? '補助率と上限で計算' : '対象外か制度なし')) + '</span></th><td><span class="nil">なし</span></td><td class="plus">' + (c.subsidy ? '−' + manT(c.subsidy) : '<span class="nil">0円</span>') + '</td><td><span class="nil">なし</span></td></tr>';
    body += '<tr><th scope="row">売却額<span class="row-note">' + (input.salePrice > 0 ? '入力した額' : '地価×土地面積−解体費') + '</span></th><td><span class="nil">なし</span></td><td><span class="nil">なし</span></td><td class="plus">' + manT(s.price) + '</td></tr>';
    body += '<tr><th scope="row">仲介手数料</th><td><span class="nil">なし</span></td><td><span class="nil">なし</span></td><td>' + manT(s.fee) + '</td></tr>';
    body += '<tr><th scope="row">譲渡所得税<span class="row-note">' + (s.deductionEligible ? '3,000万円控除を使った場合' : '1981年6月以降の建築で控除なし') + '</span></th><td><span class="nil">なし</span></td><td><span class="nil">なし</span></td><td>' + manT(s.tax) + '</td></tr>';

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
    if (r.crossover) {
      return 'この条件だと、解体して更地で持つほうが<strong>' + r.crossover + '年目</strong>から安くなります。それまでは、家を残したほうが出ていくお金は少なめです。';
    }
    var diff = r.clear.total - r.keep.total;
    if (diff > 0) return 'この条件だと、' + r.years + '年のうちは更地にしても安くなりません。解体費と、特例が外れて上がる土地の税が、家の維持費より重いためです。差は<strong>' + man(diff) + '</strong>です。';
    return 'この条件だと、最初の年から更地のほうが安くなります。';
  }

  function legend() {
    return '<ul class="legend" aria-hidden="true"><li><i></i>持ち続ける</li><li class="clear"><i></i>解体して更地で持つ</li></ul>';
  }

  function chart(r) {
    // 累計の折れ線。x=年、y=累計の支出。持ち続ける（墨）と更地（緑）。
    var W = 640, H = 320, L = 86, R = 34, T = 28, B = 50;
    var n = r.years;
    var maxV = Math.max(r.keep.total, r.clear.total);
    var step = niceStep(maxV / 4);
    var top = Math.ceil(maxV / step) * step;
    function x(i) { return L + (W - L - R) * (i / n); }
    function y(v) { return T + (H - T - B) * (1 - v / top); }
    var grid = '';
    for (var g = 0; g <= top + 1; g += step) {
      grid += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>' +
        '<text class="tick" x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + (g === 0 ? '0' : Math.round(g / 10000) + '万') + '</text>';
    }
    var xt = '';
    for (var i = 1; i <= n; i++) xt += '<text class="tick" x="' + x(i) + '" y="' + (H - B + 22) + '" text-anchor="middle">' + i + '年</text>';
    function path(rows) {
      var d = 'M' + x(0) + ',' + y(0);
      rows.forEach(function (row, idx) { d += ' L' + x(idx + 1) + ',' + y(row.cumulative); });
      return d;
    }
    var mark = '';
    if (r.crossover) {
      var cx = x(r.crossover), cy = y(r.clear.rows[r.crossover - 1].cumulative);
      mark = '<circle class="cross" cx="' + cx + '" cy="' + cy + '" r="6"/>' +
        '<text class="cross-label" x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle">' + r.crossover + '年目で逆転</text>';
    }
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="chart-title">' +
      '<title id="chart-title">出ていくお金の累計（' + n + '年）。持ち続けると' + man(r.keep.total) + '、解体して更地で持つと' + man(r.clear.total) + '</title>' +
      grid + xt +
      '<path class="line keep" d="' + path(r.keep.rows) + '"/>' +
      '<path class="line clear" d="' + path(r.clear.rows) + '"/>' + mark + '</svg>';
  }

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
    var f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  var api = { statement: statement, finding: finding, chart: chart, legend: legend, man: man, yen: yen, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AkiyaRender = api;
})(this);
