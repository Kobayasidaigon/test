/*
 * アキヤマネー 計算エンジン
 * ブラウザ（window.AkiyaCalc）とビルド（require）の両方で同じ関数を使う。
 * ビルド時に市区町村ごとのモデルケースを計算して静的HTMLの表に書き出し、
 * ブラウザでは同じ関数で利用者の入力から計算し直す。
 *
 * 税制の前提（出典は docs/03_site-plan.md と site/src/data/rules.json）
 *  - 固定資産税 標準税率 1.4%、都市計画税 上限 0.3%（市町村の条例で決まる）
 *  - 住宅用地の特例：200㎡以下の部分は 固定資産税1/6・都市計画税1/3、
 *    200㎡を超える部分（床面積の10倍まで）は 1/3・2/3
 *  - 特例が外れた土地（更地・勧告を受けた空き家）の課税標準は評価額の70%が上限
 *  - 免税点：同じ市区町村内の課税標準額の合計が 土地30万円未満・家屋20万円未満なら課税されない
 *  - 相続空き家の3,000万円特別控除（相続人3人以上は1人2,000万円）
 *  - 長期譲渡所得の税率 20.315%、取得費が分からないときは売却額の5%
 */
(function (root) {
  'use strict';

  var RULES = {
    fixedRate: 0.014,
    smallLot: 200,            // 小規模住宅用地の上限（㎡）
    smallFixed: 1 / 6,
    smallPlanning: 1 / 3,
    generalFixed: 1 / 3,
    generalPlanning: 2 / 3,
    nonResidentialCap: 0.7,   // 非住宅用地の課税標準の上限（評価額×70%）
    landToAssessed: 0.7,      // 公示地価 → 固定資産税評価額の目安
    exemptLand: 300000,
    exemptHouse: 200000,
    capitalGainsRate: 0.20315,
    deemedCostRate: 0.05,
    akiyaDeduction: 30000000,
    akiyaDeductionManyHeirs: 20000000,
    akiyaBuiltBefore: '1981-05-31',
    akiyaDeductionUntil: '2027-12-31',
    brokerageVat: 1.1,
  };

  // 解体費の目安（円/坪、税込・付帯工事を除く本体工事）。site/src/data/rules.json の出典を参照。
  var DEMOLITION_PER_TSUBO = { wood: 40000, steel: 55000, rc: 70000 };
  // 築年数が経った家屋の評価額の目安（円/㎡）。課税明細書の値を入れてもらうのが前提の仮置き。
  var HOUSE_ASSESSED_PER_SQM = { wood: 16000, steel: 30000, rc: 45000 };

  var TSUBO = 3.30579;

  function yen(n) { return Math.round(n); }

  /** 住宅用地の特例を適用した課税標準（固定資産税用・都市計画税用） */
  function residentialBase(landAssessed, landSqm, floorSqm) {
    if (landSqm <= 0) return { fixed: 0, planning: 0 };
    var perSqm = landAssessed / landSqm;
    var residentialArea = Math.min(landSqm, floorSqm * 10);
    var small = Math.min(residentialArea, RULES.smallLot);
    var general = Math.max(0, residentialArea - RULES.smallLot);
    var other = Math.max(0, landSqm - residentialArea);
    return {
      fixed: perSqm * (small * RULES.smallFixed + general * RULES.generalFixed + other * RULES.nonResidentialCap),
      planning: perSqm * (small * RULES.smallPlanning + general * RULES.generalPlanning + other * RULES.nonResidentialCap),
    };
  }

  /** 1年分の固定資産税・都市計画税 */
  function annualPropertyTax(o) {
    // o: { landAssessed, houseAssessed, landSqm, floorSqm, residential, fixedRate, planningRate, inUrbanArea, relief }
    var base = o.residential
      ? residentialBase(o.landAssessed, o.landSqm, o.floorSqm)
      : { fixed: o.landAssessed * RULES.nonResidentialCap, planning: o.landAssessed * RULES.nonResidentialCap };
    if (!o.residential && o.relief) {
      // 解体後の減免：特例が続いていた場合との差額を減額する扱い（市の制度により異なる）
      var kept = residentialBase(o.landAssessed, o.landSqm, o.floorSqm);
      base = { fixed: kept.fixed + (base.fixed - kept.fixed) * (1 - o.relief), planning: kept.planning + (base.planning - kept.planning) * (1 - o.relief) };
    }
    var landFixedBase = base.fixed < RULES.exemptLand ? 0 : base.fixed;
    var houseBase = o.houseAssessed < RULES.exemptHouse ? 0 : o.houseAssessed;
    var planningRate = o.inUrbanArea ? o.planningRate : 0;
    var landPlanningBase = landFixedBase === 0 ? 0 : base.planning;
    var landFixed = landFixedBase * o.fixedRate;
    var houseFixed = houseBase * o.fixedRate;
    var landPlanning = landPlanningBase * planningRate;
    var housePlanning = houseBase * planningRate;
    return {
      landFixed: yen(landFixed), houseFixed: yen(houseFixed), landPlanning: yen(landPlanning), housePlanning: yen(housePlanning),
      total: yen(landFixed + houseFixed + landPlanning + housePlanning),
    };
  }

  function brokerageFee(price) {
    if (price <= 0) return 0;
    var fee;
    if (price <= 2000000) fee = price * 0.05;
    else if (price <= 4000000) fee = price * 0.04 + 20000;
    else fee = price * 0.03 + 60000;
    fee = fee * RULES.brokerageVat;
    // 800万円以下の空き家等は、報酬の上限が30万円＋税（33万円）まで認められている（2024年7月〜）。
    // 安い空き家ほど上限いっぱいで請求されることが多いので、上限額で見積もる（売却額は超えない）。
    if (price <= 8000000) fee = Math.min(330000, price);
    return yen(fee);
  }

  function isOldQuakeStandard(builtYear, builtMonth) {
    if (builtYear < 1981) return true;
    if (builtYear > 1981) return false;
    return (builtMonth || 12) <= 5;
  }

  function capitalGainsTax(price, costs, eligible, manyHeirs) {
    var deemedCost = price * RULES.deemedCostRate;
    var gain = Math.max(0, price - deemedCost - costs);
    var deduction = eligible ? (manyHeirs ? RULES.akiyaDeductionManyHeirs : RULES.akiyaDeduction) : 0;
    var taxable = Math.max(0, gain - deduction);
    return { gain: yen(gain), deduction: deduction, tax: yen(taxable * RULES.capitalGainsRate) };
  }

  /**
   * 3つの選び方を10年分計算する。
   * input: {
   *   city: { fixedRate, planningRate, landPricePerSqm, subsidy: { rate, cap, builtBefore }, relief: { years, ratio } },
   *   landSqm, floorSqm, structure: 'wood'|'steel'|'rc', builtYear, builtMonth,
   *   landAssessed (省略可), houseAssessed (省略可), inUrbanArea,
   *   insurance, management, utilities, mowing,
   *   salePrice (省略可), manyHeirs, years
   * }
   */
  function compare(input) {
    var c = input.city;
    var years = input.years || 10;
    var landAssessed = input.landAssessed > 0 ? input.landAssessed : (c.landPricePerSqm || 0) * RULES.landToAssessed * input.landSqm;
    var houseAssessed = input.houseAssessed > 0 ? input.houseAssessed : HOUSE_ASSESSED_PER_SQM[input.structure] * input.floorSqm;
    var common = { landAssessed: landAssessed, landSqm: input.landSqm, floorSqm: input.floorSqm, fixedRate: c.fixedRate || RULES.fixedRate, planningRate: c.planningRate || 0, inUrbanArea: input.inUrbanArea !== false };

    // 持ち続ける
    var keepTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: houseAssessed, residential: true }));
    var keepYear = keepTax.total + input.insurance + input.management + input.utilities + input.mowing;

    // 解体して更地で持つ
    var perTsubo = input.demolitionPerTsubo > 0 ? input.demolitionPerTsubo : DEMOLITION_PER_TSUBO[input.structure];
    var demolitionGross = yen(perTsubo * (input.floorSqm / TSUBO));
    var sub = c.subsidy || null;
    var subsidyEligible = !!sub && (!sub.builtBefore || isBuiltBefore(input.builtYear, input.builtMonth, sub.builtBefore));
    var subsidy = subsidyEligible ? yen(Math.min(demolitionGross * (sub.rate || 1), sub.cap || 0)) : 0;
    var relief = c.relief || null;
    var clearRows = [];
    var clearTotal = 0;
    var keepRows = [];
    var keepTotal = 0;
    for (var y = 1; y <= years; y++) {
      var reliefRatio = relief && y <= (relief.years || 0) ? (relief.ratio || 0) : 0;
      var clearTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: 0, residential: false, relief: reliefRatio }));
      // 1月1日時点の状態で課税されるので、解体した年は家屋つきのまま課税され、翌年から更地として課税される
      var taxThisYear = y === 1 ? keepTax.total : clearTax.total;
      var oneTime = y === 1 ? demolitionGross - subsidy : 0;
      var clearYear = taxThisYear + input.mowing + oneTime;
      clearTotal += clearYear;
      clearRows.push({ year: y, tax: taxThisYear, oneTime: oneTime, mowing: input.mowing, total: clearYear, cumulative: clearTotal });
      keepTotal += keepYear;
      keepRows.push({ year: y, tax: keepTax.total, insurance: input.insurance, management: input.management, utilities: input.utilities, mowing: input.mowing, total: keepYear, cumulative: keepTotal });
    }
    var clearSteadyTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: 0, residential: false, relief: 0 }));

    // 売る（1年目に古家つき土地として売却）。既定値は「地価公示の平均×土地面積−解体費」。
    // 買主が解体する前提の古家つき土地は、土地の値段から解体費を差し引いて値付けされることが多いため。
    var marketLand = (c.landPricePerSqm || 0) * input.landSqm;
    var salePrice = input.salePrice > 0 ? input.salePrice : yen(Math.max(0, marketLand - demolitionGross));
    var fee = brokerageFee(salePrice);
    var deductionEligible = isOldQuakeStandard(input.builtYear, input.builtMonth) && salePrice <= 100000000;
    var cg = capitalGainsTax(salePrice, fee, deductionEligible, input.manyHeirs);
    var saleNet = salePrice - fee - cg.tax - keepTax.total; // 売る年も1月1日時点の所有者に1年分の税がかかる

    // 何年目で更地のほうが安くなるか
    var crossover = null;
    for (var i = 0; i < years; i++) {
      if (clearRows[i].cumulative < keepRows[i].cumulative) { crossover = i + 1; break; }
    }

    return {
      assumptions: { landAssessed: yen(landAssessed), houseAssessed: yen(houseAssessed), estimatedLand: !(input.landAssessed > 0), estimatedHouse: !(input.houseAssessed > 0) },
      keep: { annualTax: keepTax, annual: keepYear, total: keepTotal, rows: keepRows },
      clear: { perTsubo: perTsubo, demolitionGross: demolitionGross, subsidy: subsidy, subsidyEligible: subsidyEligible, steadyTax: clearSteadyTax, total: clearTotal, rows: clearRows, taxJump: keepTax.landFixed + keepTax.landPlanning > 0 ? clearSteadyTax.total / (keepTax.landFixed + keepTax.landPlanning) : null },
      sell: { price: salePrice, fee: fee, deductionEligible: deductionEligible, gain: cg.gain, deduction: cg.deduction, tax: cg.tax, yearOneTax: keepTax.total, net: yen(saleNet) },
      crossover: crossover,
      years: years,
    };
  }

  function isBuiltBefore(year, month, isoDate) {
    var p = isoDate.split('-');
    var y = +p[0], m = +p[1];
    if (year < y) return true;
    if (year > y) return false;
    return (month || 12) <= m;
  }

  var api = { compare: compare, annualPropertyTax: annualPropertyTax, residentialBase: residentialBase, brokerageFee: brokerageFee, capitalGainsTax: capitalGainsTax, isOldQuakeStandard: isOldQuakeStandard, RULES: RULES, DEMOLITION_PER_TSUBO: DEMOLITION_PER_TSUBO, HOUSE_ASSESSED_PER_SQM: HOUSE_ASSESSED_PER_SQM, TSUBO: TSUBO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AkiyaCalc = api;
})(this);
