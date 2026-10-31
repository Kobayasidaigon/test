/*
 * アキヤマネー 計算エンジン
 * ブラウザ（window.AkiyaCalc）とビルド（require）の両方で同じ関数を使う。
 * ビルド時に市区町村ごとのモデルケースを計算して静的HTMLの表に書き出し、
 * ブラウザでは同じ関数で利用者の入力から計算し直す。
 *
 * 前提と出典の一覧は method.html（site/src/build.mjs の methodPage）に載せている。
 *  - 固定資産税 標準税率 1.4%、都市計画税 上限 0.3%（市町村の条例で決まる）
 *  - 住宅用地の特例：200㎡以下の部分は 固定資産税1/6・都市計画税1/3、
 *    200㎡を超える部分（床面積の10倍まで）は 1/3・2/3
 *  - 特例が外れた土地（更地・勧告を受けた空き家）の課税標準は評価額の70%を上限に計算
 *  - 免税点：同じ市区町村内の課税標準額の合計が 土地30万円未満・家屋20万円未満なら課税されない
 *  - 相続空き家の3,000万円特別控除は売った人ごと（家と土地を3人以上で相続したら1人2,000万円）
 *  - 長期譲渡所得の税率 20.315%、取得費が分からないときは売却額の5%
 */
(function (root) {
  'use strict';

  var RULES = {
    fixedRate: 0.014,
    smallLot: 200,
    smallFixed: 1 / 6,
    smallPlanning: 1 / 3,
    generalFixed: 1 / 3,
    generalPlanning: 2 / 3,
    nonResidentialCap: 0.7,
    landToAssessed: 0.7,
    exemptLand: 300000,
    exemptHouse: 200000,
    capitalGainsRate: 0.20315,
    deemedCostRate: 0.05,
    akiyaDeduction: 30000000,
    akiyaDeductionManyHeirs: 20000000,
    akiyaPriceLimit: 100000000,
    akiyaBuiltBefore: '1981-05-31',
    akiyaDeductionLastYear: 2027,
    brokerageVat: 1.1,
    lowCostCap: 330000,       // 800万円以下の空き家等で、事前の説明と合意があれば受け取れる上限（税込）
    lowCostLimit: 8000000,
  };

  // 解体費の目安（円/坪、本体工事）。公的な単価の資料はなく、民間の公表値をもとにした目安。
  var DEMOLITION_PER_TSUBO = { wood: 40000, steel: 55000, rc: 70000 };
  // 築年数が経った家屋の評価額の目安（円/㎡）。課税明細書の値を入れてもらうのが前提の仮置き。
  var HOUSE_ASSESSED_PER_SQM = { wood: 16000, steel: 30000, rc: 45000 };

  var TSUBO = 3.30579;

  function yen(n) { return Math.round(n); }
  function nonNeg(v, fallback) { v = Number(v); return isFinite(v) && v >= 0 ? v : (fallback || 0); }
  // 課税標準額は千円未満を切り捨てる
  function floor1000(n) { return Math.floor(Math.round(n) / 1000) * 1000; }

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
      // 解体後の減免：特例が続いていた場合との差額を、減免の割合だけ減らす（市の制度によって異なる）
      var kept = residentialBase(o.landAssessed, o.landSqm, o.floorSqm);
      base = { fixed: kept.fixed + (base.fixed - kept.fixed) * (1 - o.relief), planning: kept.planning + (base.planning - kept.planning) * (1 - o.relief) };
    }
    var landFixedBase = floor1000(base.fixed);
    if (landFixedBase < RULES.exemptLand) landFixedBase = 0;
    var houseBase = floor1000(o.houseAssessed);
    if (houseBase < RULES.exemptHouse) houseBase = 0;
    var planningRate = o.inUrbanArea ? o.planningRate : 0;
    var landPlanningBase = landFixedBase === 0 ? 0 : floor1000(base.planning);
    var landFixed = landFixedBase * o.fixedRate;
    var houseFixed = houseBase * o.fixedRate;
    var landPlanning = landPlanningBase * planningRate;
    var housePlanning = houseBase * planningRate;
    return {
      landFixed: yen(landFixed), houseFixed: yen(houseFixed), landPlanning: yen(landPlanning), housePlanning: yen(housePlanning),
      land: yen(landFixed + landPlanning),
      total: yen(landFixed + houseFixed + landPlanning + housePlanning),
      bases: { landFixed: landFixedBase, landPlanning: landPlanningBase, house: houseBase },
    };
  }

  /** 仲介手数料（売主が払う上限。税込） */
  function brokerageFee(price) {
    if (price <= 0) return 0;
    var fee;
    if (price <= 2000000) fee = price * 0.05;
    else if (price <= 4000000) fee = price * 0.04 + 20000;
    else fee = price * 0.03 + 60000;
    return yen(fee * RULES.brokerageVat);
  }

  function isOldQuakeStandard(builtYear, builtMonth) {
    if (builtYear < 1981) return true;
    if (builtYear > 1981) return false;
    return (builtMonth || 12) <= 5;
  }

  /** 譲渡所得の税。控除は売った人ごとに、それぞれの持分の利益から引く（持分は均等と仮定） */
  function capitalGainsTax(price, costs, eligible, heirs) {
    heirs = Math.max(1, Math.floor(heirs || 1));
    var deemedCost = price * RULES.deemedCostRate;
    var gain = Math.max(0, price - deemedCost - costs);
    var perPerson = eligible ? (heirs >= 3 ? RULES.akiyaDeductionManyHeirs : RULES.akiyaDeduction) : 0;
    var perGain = gain / heirs;
    var taxable = Math.max(0, perGain - perPerson) * heirs;
    return { gain: yen(gain), deduction: perPerson * heirs, tax: yen(taxable * RULES.capitalGainsRate), taxWithout: yen(gain * RULES.capitalGainsRate) };
  }

  function isBuiltBefore(year, month, isoDate) {
    var p = isoDate.split('-');
    var y = +p[0], m = +p[1];
    if (year < y) return true;
    if (year > y) return false;
    return (month || 12) <= m;
  }

  /**
   * 3つの選び方を10年分計算する。
   * input: {
   *   city: { fixedRate, planningRate, landPricePerSqm, subsidy: { rate, cap, builtBefore } | null, relief: { years, ratio } | null },
   *   landSqm, floorSqm, structure: 'wood'|'steel'|'rc', builtYear, builtMonth,
   *   landAssessed, houseAssessed, salePrice, demolitionPerTsubo（0なら推定・目安）, inUrbanArea,
   *   insurance, management, utilities, mowing, heirs, startYear, years
   * }
   */
  function compare(input) {
    var c = input.city || {};
    var years = Math.max(1, Math.floor(Number(input.years)) || 10);
    var structure = DEMOLITION_PER_TSUBO[input.structure] ? input.structure : 'wood';
    var landSqm = nonNeg(input.landSqm), floorSqm = nonNeg(input.floorSqm);
    var landPrice = nonNeg(c.landPricePerSqm);
    var insurance = nonNeg(input.insurance), management = nonNeg(input.management), utilities = nonNeg(input.utilities), mowing = nonNeg(input.mowing);
    var heirs = Math.max(1, Math.floor(nonNeg(input.heirs, 1)) || (input.manyHeirs ? 3 : 1));
    var startYear = Math.floor(nonNeg(input.startYear)) || 2027;
    var builtYear = Math.floor(nonNeg(input.builtYear)) || 1978;
    var builtMonth = Math.min(12, Math.max(1, Math.floor(nonNeg(input.builtMonth)) || 12));

    var landAssessed = input.landAssessed > 0 ? input.landAssessed : landPrice * RULES.landToAssessed * landSqm;
    var houseAssessed = input.houseAssessed > 0 ? input.houseAssessed : HOUSE_ASSESSED_PER_SQM[structure] * floorSqm;
    var common = { landAssessed: landAssessed, landSqm: landSqm, floorSqm: floorSqm, fixedRate: c.fixedRate > 0 ? c.fixedRate : RULES.fixedRate, planningRate: nonNeg(c.planningRate), inUrbanArea: input.inUrbanArea !== false };

    // 持ち続ける
    var keepTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: houseAssessed, residential: true }));
    var keepYear = keepTax.total + insurance + management + utilities + mowing;

    // 解体して更地で持つ
    var perTsubo = input.demolitionPerTsubo > 0 ? input.demolitionPerTsubo : DEMOLITION_PER_TSUBO[structure];
    var demolitionGross = yen(perTsubo * (floorSqm / TSUBO));
    var sub = c.subsidy || null;
    var subsidyEligible = !!sub && (!sub.builtBefore || isBuiltBefore(builtYear, builtMonth, sub.builtBefore));
    var subsidy = 0;
    if (subsidyEligible) {
      var rate = sub.rate == null ? 1 : Math.min(1, Math.max(0, sub.rate));
      var cap = sub.cap == null ? Infinity : Math.max(0, sub.cap);
      subsidy = yen(Math.min(demolitionGross * rate, cap, demolitionGross));
    }
    var relief = c.relief || null;
    var clearRows = [], keepRows = [];
    var clearTotal = 0, keepTotal = 0;
    for (var y = 1; y <= years; y++) {
      // 1月1日時点の状態で課税されるので、解体した年は家つきのまま課税され、2年目から更地として課税される。
      // 解体後の減免も、更地として課税される年（2年目）から数える。
      var reliefRatio = relief && y >= 2 && (y - 1) <= (relief.years || 0) ? (relief.ratio || 0) : 0;
      var clearTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: 0, residential: false, relief: reliefRatio }));
      var taxThisYear = y === 1 ? keepTax.total : clearTax.total;
      var oneTime = y === 1 ? demolitionGross - subsidy : 0;
      var clearYear = taxThisYear + mowing + oneTime;
      clearTotal += clearYear;
      clearRows.push({ year: y, tax: taxThisYear, oneTime: oneTime, mowing: mowing, total: clearYear, cumulative: clearTotal });
      keepTotal += keepYear;
      keepRows.push({ year: y, tax: keepTax.total, total: keepYear, cumulative: keepTotal });
    }
    var clearSteadyTax = annualPropertyTax(Object.assign({}, common, { houseAssessed: 0, residential: false, relief: 0 }));

    // 売る（1年目に古家つき土地として売却）。既定値は「地価×土地面積−解体費」。
    // 買主が解体する前提の古家つき土地は、土地の値段から解体費を差し引いて値付けされることが多いため。
    var marketLand = landPrice * landSqm;
    var salePrice = input.salePrice > 0 ? input.salePrice : yen(Math.max(0, marketLand - demolitionGross));
    var fee = brokerageFee(salePrice);
    var ineligibleReason = null;
    if (!isOldQuakeStandard(builtYear, builtMonth)) ineligibleReason = 'built';
    else if (salePrice > RULES.akiyaPriceLimit) ineligibleReason = 'price';
    else if (startYear > RULES.akiyaDeductionLastYear) ineligibleReason = 'expired';
    var cg = capitalGainsTax(salePrice, fee, !ineligibleReason, heirs);
    // 売る年の固定資産税は1月1日の持ち主に1年分かかる。日割り精算で一部が戻ることが多いが、ここでは精算前の額で見る。
    var saleNet = salePrice - fee - cg.tax - keepTax.total;

    // 何年目から更地のほうが安いか：その年から最後の年まで、ずっと更地の累計のほうが少ない最初の年
    var crossover = null;
    for (var i = years - 1; i >= 0; i--) {
      if (clearRows[i].cumulative < keepRows[i].cumulative) crossover = i + 1; else break;
    }
    var everCheaper = clearRows.some(function (r, k) { return r.cumulative < keepRows[k].cumulative; });

    return {
      assumptions: { landAssessed: yen(landAssessed), houseAssessed: yen(houseAssessed), estimatedLand: !(input.landAssessed > 0), estimatedHouse: !(input.houseAssessed > 0) },
      keep: { annualTax: keepTax, annual: keepYear, total: keepTotal, rows: keepRows },
      clear: {
        perTsubo: perTsubo, demolitionGross: demolitionGross, subsidy: subsidy, subsidyEligible: subsidyEligible,
        steadyTax: clearSteadyTax, total: clearTotal, rows: clearRows,
        keepLandTax: keepTax.land, clearLandTax: clearSteadyTax.land,
        taxJump: keepTax.land > 0 ? clearSteadyTax.land / keepTax.land : (clearSteadyTax.land > 0 ? Infinity : null),
      },
      sell: { price: salePrice, fee: fee, lowCost: salePrice > 0 && salePrice <= RULES.lowCostLimit, deductionEligible: !ineligibleReason, ineligibleReason: ineligibleReason, heirs: heirs, gain: cg.gain, deduction: cg.deduction, tax: cg.tax, taxWithout: cg.taxWithout, yearOneTax: keepTax.total, net: yen(saleNet) },
      crossover: crossover,
      reversal: crossover === null && everCheaper,
      years: years,
    };
  }

  var api = { compare: compare, annualPropertyTax: annualPropertyTax, residentialBase: residentialBase, brokerageFee: brokerageFee, capitalGainsTax: capitalGainsTax, isOldQuakeStandard: isOldQuakeStandard, RULES: RULES, DEMOLITION_PER_TSUBO: DEMOLITION_PER_TSUBO, HOUSE_ASSESSED_PER_SQM: HOUSE_ASSESSED_PER_SQM, TSUBO: TSUBO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AkiyaCalc = api;
})(this);
