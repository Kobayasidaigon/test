/* 10年明細：入力が変わるたびに、ビルド時と同じ計算・描画関数で結果を作り直す */
(function () {
  'use strict';
  var cfgEl = document.getElementById('akiya-data');
  var form = document.getElementById('calc');
  if (!cfgEl || !form || !window.AkiyaCalc || !window.AkiyaRender) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var R = window.AkiyaRender;
  var result = document.getElementById('result');
  var monthField = document.getElementById('builtMonthField');

  // 空欄なら null。全角数字とカンマも受け付ける
  function val(id) {
    var el = form.elements[id];
    if (!el) return null;
    var s = String(el.value).replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xfee0); }).replace(/[,，\s]/g, '');
    if (s === '') return null;
    var v = parseFloat(s);
    return isFinite(v) && v >= 0 ? v : null;
  }
  function pick(id, fallback) { var v = val(id); return v === null || v === 0 ? fallback : v; }

  function currentSlug() { return form.elements.city ? form.elements.city.value : cfg.current; }

  function read() {
    var city = cfg.cities[currentSlug()];
    var c = city.calc;
    var d = cfg.defaults;
    var structure = (form.querySelector('input[name="structure"]:checked') || {}).value || d.structure;
    var landSqm = pick('landSqm', d.landSqm);
    var floorSqm = pick('floorSqm', d.floorSqm);
    var builtYear = pick('builtYear', d.builtYear);
    if (builtYear < 1900 || builtYear > 2100) builtYear = d.builtYear;
    var builtMonth = builtYear === 1981 && form.elements.builtMonth ? +form.elements.builtMonth.value : 12;
    return {
      city: { fixedRate: c.fixedRate, planningRate: c.planningRate, landPricePerSqm: pick('landPrice', c.landPricePerSqm), subsidy: c.subsidy, relief: c.relief },
      landSqm: landSqm, floorSqm: floorSqm, structure: structure, structureLabel: cfg.structures[structure],
      builtYear: builtYear, builtMonth: builtMonth,
      landAssessed: val('landAssessed') || 0, houseAssessed: val('houseAssessed') || 0, salePrice: val('salePrice') || 0, demolitionPerTsubo: val('demolitionPerTsubo') || 0,
      inUrbanArea: form.elements.inUrbanArea ? form.elements.inUrbanArea.checked : true,
      heirs: form.elements.heirs ? +form.elements.heirs.value : 1,
      insurance: val('insurance') === null ? d.insurance : val('insurance'),
      management: val('management') === null ? d.management : val('management'),
      utilities: val('utilities') === null ? c.utilities : val('utilities'),
      mowing: val('mowing') === null ? d.mowing : val('mowing'),
      subsidyNote: c.subsidyNote, years: d.years, startYear: d.startYear,
      cityName: city.name,
      captionText: city.name + '・土地' + landSqm + '㎡・' + cfg.structures[structure] + '延床' + floorSqm + '㎡・' + builtYear + '年築の10年明細',
    };
  }

  function bind(key, text) {
    var els = document.querySelectorAll('[data-bind="' + key + '"]');
    for (var i = 0; i < els.length; i++) els[i].textContent = text;
  }

  function render(animate) {
    var input = read();
    if (monthField) monthField.hidden = input.builtYear !== 1981;
    var r = window.AkiyaCalc.compare(input);
    var chart = R.chart(r);
    if (animate) chart = chart.replace('<svg class="chart"', '<svg class="chart draw"');
    result.innerHTML = '<p class="finding">' + R.finding(r) + '</p>' +
      '<div class="chart-box">' + R.legend() + chart + '</div>' + R.statement(r, input) +
      '<p class="hint result-note">土地の評価額' + R.man(r.assumptions.landAssessed) + (r.assumptions.estimatedLand ? '（地価×0.7で推定）' : '') +
      '、家屋の評価額' + R.man(r.assumptions.houseAssessed) + (r.assumptions.estimatedHouse ? '（築年数が経った家の目安で推定）' : '') +
      'で計算しました。売却額は' + (input.salePrice ? '入力した額です。' : '地価からの推定です。実際の査定額を「売れそうな額」に入れると、3つの比べ方が変わります。') +
      '<a href="#sell">値段の調べ方</a></p>';
    // 「税が上がる」の節と、課税明細書の見本
    var t = r.keep.annualTax;
    bind('keepLand', R.man(r.clear.keepLandTax));
    bind('clearLand', R.man(r.clear.clearLandTax));
    bind('jump', R.jumpText(r));
    bind('slip-city', input.cityName);
    bind('slip-area', input.landSqm.toFixed(2) + '㎡');
    bind('slip-landval', R.yen(r.assumptions.landAssessed));
    bind('slip-small', Math.min(input.landSqm, 200, input.floorSqm * 10).toFixed(2) + '㎡');
    bind('slip-base', R.yen(t.bases.landFixed));
    bind('slip-pbase', R.yen(t.bases.landPlanning));
    bind('slip-structure', input.structureLabel);
    bind('slip-floor', input.floorSqm.toFixed(2) + '㎡');
    bind('slip-houseval', R.yen(r.assumptions.houseAssessed));
    bind('slip-tax', R.yen(t.total));
  }

  // 市を変えたとき：市のページなら、その市のページへ移る。トップでは、その市の地価と基本料金に入れ替える。
  function onCityChange() {
    var slug = currentSlug();
    if (cfg.isCityPage && slug !== cfg.current) {
      location.href = slug === 'other' ? cfg.root + 'index.html#tool' : cfg.root + 'city/' + slug + '.html#tool';
      return false;
    }
    var c = cfg.cities[slug].calc;
    form.elements.landPrice.value = c.landPricePerSqm;
    form.elements.utilities.value = c.utilities;
    return true;
  }

  var timer = null;
  form.addEventListener('input', function (e) {
    if (e.target && e.target.name === 'city') return; // change で処理する
    clearTimeout(timer);
    timer = setTimeout(function () { render(false); }, 120);
  });
  form.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'city') {
      clearTimeout(timer);
      if (onCityChange()) render(true);
    }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });
  if (monthField) monthField.hidden = (val('builtYear') || 0) !== 1981;
})();
