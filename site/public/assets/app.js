/* 10年明細：入力が変わるたびに、ビルド時と同じ計算・描画関数で結果を作り直す */
(function () {
  'use strict';
  var cfgEl = document.getElementById('akiya-data');
  var form = document.getElementById('calc');
  if (!cfgEl || !form || !window.AkiyaCalc || !window.AkiyaRender) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var result = document.getElementById('result');
  var touched = {};

  function num(id) {
    var el = form.elements[id];
    if (!el) return 0;
    var v = parseFloat(String(el.value).replace(/,/g, ''));
    return isFinite(v) && v > 0 ? v : 0;
  }

  function currentCity() {
    var sel = form.elements.city;
    return cfg.cities[sel ? sel.value : cfg.current];
  }

  function read() {
    var city = currentCity();
    var c = city.calc;
    var structure = (form.querySelector('input[name="structure"]:checked') || {}).value || 'wood';
    var landSqm = num('landSqm') || cfg.defaults.landSqm;
    var floorSqm = num('floorSqm') || cfg.defaults.floorSqm;
    var builtYear = num('builtYear') || cfg.defaults.builtYear;
    return {
      city: { fixedRate: c.fixedRate, planningRate: c.planningRate, landPricePerSqm: num('landPrice'), subsidy: c.subsidy, relief: c.relief },
      landSqm: landSqm, floorSqm: floorSqm, structure: structure, structureLabel: cfg.structures[structure],
      builtYear: builtYear, builtMonth: 12,
      landAssessed: num('landAssessed'), houseAssessed: num('houseAssessed'), salePrice: num('salePrice'), demolitionPerTsubo: num('demolitionPerTsubo'),
      inUrbanArea: form.elements.inUrbanArea ? form.elements.inUrbanArea.checked : true,
      manyHeirs: form.elements.manyHeirs ? form.elements.manyHeirs.checked : false,
      insurance: num('insurance'), management: num('management'), utilities: num('utilities'), mowing: num('mowing'),
      subsidyNote: c.subsidyNote, years: 10,
      captionText: city.name + '・土地' + landSqm + '㎡・' + cfg.structures[structure] + '延床' + floorSqm + '㎡・' + builtYear + '年築の10年明細',
    };
  }

  function render(animate) {
    var input = read();
    var r = window.AkiyaCalc.compare(input);
    var R = window.AkiyaRender;
    var chart = R.chart(r);
    if (animate) chart = chart.replace('<svg class="chart"', '<svg class="chart draw"');
    result.innerHTML = '<p class="finding">' + R.finding(r) + '</p>' +
      '<div class="chart-box">' + R.legend() + chart + '</div>' + R.statement(r, input) +
      '<p class="hint">土地の評価額' + R.man(r.assumptions.landAssessed) + (r.assumptions.estimatedLand ? '（地価×0.7で推定）' : '') +
      '、家屋の評価額' + R.man(r.assumptions.houseAssessed) + (r.assumptions.estimatedHouse ? '（築年数が経った家の目安で推定）' : '') +
      'で計算しました。課税明細書の「価格」を入れると、今払っている税額に近づきます。</p>';
    bind('keepLand', R.man(r.keep.annualTax.landFixed + r.keep.annualTax.landPlanning));
    bind('clearLand', R.man(r.clear.steadyTax.total));
    bind('jump', r.clear.taxJump ? r.clear.taxJump.toFixed(1) + '倍' : '—');
  }

  function bind(key, text) {
    var els = document.querySelectorAll('[data-bind="' + key + '"]');
    for (var i = 0; i < els.length; i++) els[i].textContent = text;
  }

  // 市を変えたら、利用者がまだ触っていない「地価」「基本料金」をその市の値に入れ替える
  function onCityChange() {
    var c = currentCity().calc;
    if (!touched.landPrice) form.elements.landPrice.value = c.landPricePerSqm;
    if (!touched.utilities) form.elements.utilities.value = c.utilities;
  }

  var timer = null;
  form.addEventListener('input', function (e) {
    if (e.target && e.target.name) touched[e.target.name] = true;
    if (e.target && e.target.name === 'city') { touched.city = true; onCityChange(); }
    clearTimeout(timer);
    timer = setTimeout(function () { render(false); }, 120);
  });
  form.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'city') { onCityChange(); render(true); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
})();
