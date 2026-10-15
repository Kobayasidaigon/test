// 曜日わけの区分（【月・木】など）を、その曜日の日しか数えないこと。
//
// アプリ本体は今日の曜日でない区分をたたんで見せない。共有ページがぜんぶ数えると
// 「何をやっても低い」数字になる。消さずに出しつつ、数からは外すのが狙い。
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

// 曜日が決まっている日を使う（今日に左右されない）
const MON = '2026-10-12', TUE = '2026-10-13', SUN = '2026-10-11';

(async () => {
  // 1エリアに4区分：月木 / 火金 / 水土 / 曜日わけなし
  await put('sdef_笠寺_customAreas', JSON.stringify([{ key: 'zz_test', name: '試験エリア' }]));
  await put('sdef_笠寺_customItems_zz_test', JSON.stringify([
    { id: 'z1', section: 'A 床・鏡まわり【月・木】', title: '月木のしごと1' },
    { id: 'z2', section: 'A 床・鏡まわり【月・木】', title: '月木のしごと2' },
    { id: 'z3', section: 'B 有酸素・マシン【火・金】', title: '火金のしごと' },
    { id: 'z4', section: 'C フリーウェイト・整頓【水・土】', title: '水土のしごと' },
    { id: 'z5', section: '毎日やること', title: '毎日のしごと' },
  ]));
  // 月曜に z1 と z5 をつけた
  await put('clean_笠寺_山田 花子_zz_test_' + MON, JSON.stringify({ z1: true, z5: true }));
  // 曜日わけだけで出来たエリア（火金のみ）
  await put('sdef_枇杷島_customAreas', JSON.stringify([{ key: 'zz_only', name: '火金だけのエリア' }]));
  await put('sdef_枇杷島_customItems_zz_only', JSON.stringify([
    { id: 'y1', section: 'B 有酸素・マシン【火・金】', title: '火金だけ' },
  ]));
  await put('clean_枇杷島_山田 花子_zz_only_' + TUE, JSON.stringify({ y1: true }));

  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const get = async q => JSON.parse(await (await fetch(BASE + '/view/data' + q,
    { headers: { Cookie: cookie } })).text());
  const area = (o, store, name) =>
    (o.stores.find(s => s.store === store).areas || []).find(a => a.name === name);

  // ---- 月曜 ----
  let o = await get('?d=' + MON);
  let a = area(o, '笠寺', '試験エリア');
  check('月曜: 対象は月木2件＋毎日1件＝3件', a.total === 3, String(a.total));
  check('月曜: 済みは2件', a.done === 2, String(a.done));
  check('月曜: 火金の区分は対象外の印',
    a.groups.find(g => g.section.indexOf('火・金') >= 0).offDay === true);
  check('月曜: 月木の区分は対象の印',
    a.groups.find(g => g.section.indexOf('月・木') >= 0).offDay === false);
  check('月曜: 曜日わけなしは対象の印',
    a.groups.find(g => g.section === '毎日やること').offDay === false);
  check('月曜: 対象外の項目も消さずに出す',
    a.groups.find(g => g.section.indexOf('水・土') >= 0).items.length === 1);
  check('月曜: エリアごと対象外ではない', a.allOff === false);

  // ---- 火曜 ----
  o = await get('?d=' + TUE);
  a = area(o, '笠寺', '試験エリア');
  check('火曜: 対象は火金1件＋毎日1件＝2件', a.total === 2, String(a.total));
  check('火曜: 済みは0件（月曜の分は数えない）', a.done === 0, String(a.done));
  check('火曜: 月木の区分が対象外になる',
    a.groups.find(g => g.section.indexOf('月・木') >= 0).offDay === true);

  // ---- 日曜：どの枠にも当たらない ----
  o = await get('?d=' + SUN);
  a = area(o, '笠寺', '試験エリア');
  check('日曜: 対象は毎日の1件だけ', a.total === 1, String(a.total));
  check('日曜: 曜日わけは3区分とも対象外',
    a.groups.filter(g => g.offDay).length === 3,
    String(a.groups.filter(g => g.offDay).length));

  // ---- 曜日わけだけのエリア ----
  o = await get('?d=' + TUE);
  let b = area(o, '枇杷島', '火金だけのエリア');
  check('火曜: 火金だけのエリアは対象（1件）', b && b.total === 1 && b.allOff === false,
    b ? String(b.total) + '/' + b.allOff : 'なし');
  o = await get('?d=' + MON);
  b = area(o, '枇杷島', '火金だけのエリア');
  check('月曜: 火金だけのエリアはエリアごと対象外', b && b.allOff === true,
    b ? String(b.allOff) : 'なし');
  check('月曜: そのエリアの分母は0', b && b.total === 0, b ? String(b.total) : 'なし');

  // ---- 店舗の合計にも効いているか ----
  const mon = await get('?d=' + MON), tue = await get('?d=' + TUE);
  const sum = (o, store) => (o.stores.find(s => s.store === store).areas || [])
    .concat(o.stores.find(s => s.store === store).routines || [])
    .reduce((n, x) => n + x.total, 0);
  check('店舗の合計も曜日で変わる', sum(mon, '笠寺') !== sum(tue, '笠寺'),
    sum(mon, '笠寺') + ' / ' + sum(tue, '笠寺'));

  // ---- 画面 ----
  const { chromium } = require('playwright');
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await br.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/view');
  await pg.fill('#pw', PASS);
  await pg.click('#go');
  await pg.waitForSelector('.store');
  await pg.fill('#day', MON);
  await pg.dispatchEvent('#day', 'change');
  await pg.waitForFunction(x => document.getElementById('day').value === x, MON);
  for (const bt of await pg.$$('.area > button')) {
    if ((await bt.innerText()).indexOf('試験エリア') >= 0) { await bt.click(); break; }
  }
  await pg.waitForTimeout(250);
  const txt = await pg.innerText('body');
  check('画面: 対象外と断ってある', /今日は対象外（数に入れていません）/.test(txt));
  check('画面: 対象外の項目も見える', txt.indexOf('水土のしごと') >= 0);
  check('画面: 断り書きに曜日のことが書いてある', /その曜日の日だけ数えています/.test(txt));
  check('画面: エリアごと対象外の行が出る', /今日は対象外/.test(txt));
  check('画面: 薄くする印が付いている', (await pg.$$('.sec.off')).length > 0,
    String((await pg.$$('.sec.off')).length));
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await br.close();

  console.log('verify49 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
