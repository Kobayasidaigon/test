// やることリストの親項目（「シャワー清掃」のようにリンク先をまとめて見る行）を、
// リンク先の埋まり具合で完了と数えること。
//
// アプリは itemEffectiveDone / linkedStatus でそう判定している。共有ページが
// 親項目自身の記録を探すと、部屋が全部12/12でも「未実施」になり、
// やることリストが実際より低く出る（これが「やってるのに出来てないことになる」の正体）。
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const D = '2026-10-12';   // 月曜

(async () => {
  // 2部屋 + 朝番/中番。シャワーは持ち越しあり、サウナはなし
  await put('sdef_笠寺_customAreas', JSON.stringify([
    { key: 'shower_b1', name: 'シャワー男1', hidden: true, carryForward: true },
    { key: 'shower_b2', name: 'シャワー男2', hidden: true, carryForward: true },
    { key: 'sauna_b1', name: 'サウナ男A', hidden: true },
  ]));
  const room = (sec, n) => JSON.stringify(
    Array.from({ length: n }, (_, i) => ({ id: 'i' + (i + 1), section: sec, title: sec + (i + 1) })));
  await put('sdef_笠寺_customItems_shower_b1', room('シャワー男1', 3));
  await put('sdef_笠寺_customItems_shower_b2', room('シャワー男2', 3));
  await put('sdef_笠寺_customItems_sauna_b1', room('サウナ男A', 2));
  await put('sdef_笠寺_customItems_routine_asa', JSON.stringify([
    { id: 'a_shower', section: 'やること', title: 'シャワー清掃', link: 'shower_b1,shower_b2' },
    { id: 'a_sauna', section: 'やること', title: 'サウナ清掃', link: 'sauna_b1' },
    { id: 'a_plain', section: 'やること', title: 'ふつうの項目' },
  ]));
  await put('sdef_笠寺_customItems_routine_hiru', JSON.stringify([
    { id: 'h_shower', section: 'やること', title: 'シャワー清掃', link: 'shower_b1,shower_b2' },
    { id: 'h_sauna', section: 'やること', title: 'サウナ清掃', link: 'sauna_b1' },
  ]));

  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const get = async () => JSON.parse(await (await fetch(BASE + '/view/data?d=' + D,
    { headers: { Cookie: cookie } })).text());
  const slot = (o, name) => (o.stores.find(s => s.store === '笠寺').routines || [])
    .find(a => a.name === name);
  const item = (o, slotName, title) => {
    const a = slot(o, slotName);
    for (const g of (a ? a.groups : [])) {
      for (const it of g.items) if (it.title === title) return it;
    }
    return null;
  };

  // ---- 何もついていない ----
  let o = await get();
  check('最初は親項目は未完了', item(o, '朝番', 'シャワー清掃').done === false);
  check('リンク先の進み具合が付く（0/6）',
    JSON.stringify(item(o, '朝番', 'シャワー清掃').linked) === JSON.stringify({ done: 0, total: 6, areas: 2 }),
    JSON.stringify(item(o, '朝番', 'シャワー清掃').linked));
  check('ふつうの項目に linked は付かない', item(o, '朝番', 'ふつうの項目').linked === null);
  check('朝番は0/3', slot(o, '朝番').done === 0 && slot(o, '朝番').total === 3);

  // ---- 片方の部屋だけ全部つけた ----
  await put('clean_笠寺_山田 花子_shower_b1@routine_asa_' + D, JSON.stringify({ i1: 1, i2: 1, i3: 1 }));
  o = await get();
  check('片方だけでは親項目は未完了', item(o, '朝番', 'シャワー清掃').done === false);
  check('進み具合は3/6', item(o, '朝番', 'シャワー清掃').linked.done === 3,
    String(item(o, '朝番', 'シャワー清掃').linked.done));

  // ---- 両方の部屋を全部つけた ----
  await put('clean_笠寺_山田 花子_shower_b2@routine_asa_' + D, JSON.stringify({ i1: 1, i2: 1, i3: 1 }));
  o = await get();
  check('両方そろうと親項目が完了になる', item(o, '朝番', 'シャワー清掃').done === true);
  check('進み具合は6/6', item(o, '朝番', 'シャワー清掃').linked.done === 6);
  check('朝番は1/3に上がる', slot(o, '朝番').done === 1, String(slot(o, '朝番').done));

  // ---- 持ち越し：朝のチェックが中番にも効く ----
  o = await get();
  check('持ち越しあり：中番のシャワー清掃も完了', item(o, '中番', 'シャワー清掃').done === true);

  // ---- 持ち越しなし：サウナは朝のぶんが中番に流れない ----
  await put('clean_笠寺_山田 花子_sauna_b1@routine_asa_' + D, JSON.stringify({ i1: 1, i2: 1 }));
  o = await get();
  check('持ち越しなし：朝番のサウナ清掃は完了', item(o, '朝番', 'サウナ清掃').done === true);
  check('持ち越しなし：中番のサウナ清掃は未完了', item(o, '中番', 'サウナ清掃').done === false);
  check('中番は1/2（シャワーだけ）', slot(o, '中番').done === 1 && slot(o, '中番').total === 2,
    slot(o, '中番').done + '/' + slot(o, '中番').total);

  // ---- 素の鍵（時間帯なし）でも拾う ----
  await put('clean_笠寺_鈴木 太郎_sauna_b1_' + D, JSON.stringify({ i1: 1, i2: 1 }));
  o = await get();
  check('素の鍵でも中番のサウナ清掃が完了になる', item(o, '中番', 'サウナ清掃').done === true);

  // ---- linkAny：どれか1つで完了 ----
  await put('sdef_笠寺_customItems_routine_ban', JSON.stringify([
    { id: 'b_any', section: 'やること', title: 'マシンメンテ風',
      link: 'shower_b1,shower_b2', linkAny: true },
  ]));
  o = await get();
  check('linkAny はどれか1つ以上で完了', item(o, '遅番', 'マシンメンテ風').done === true);

  // ---- 別の日には流れない ----
  const other = JSON.parse(await (await fetch(BASE + '/view/data?d=2026-10-13',
    { headers: { Cookie: cookie } })).text());
  const oi = (() => {
    const a = (other.stores.find(s => s.store === '笠寺').routines || [])
      .find(x => x.name === '朝番');
    for (const g of (a ? a.groups : [])) for (const it of g.items)
      if (it.title === 'シャワー清掃') return it;
    return null;
  })();
  check('次の日は親項目が未完了に戻る', oi && oi.done === false, oi ? String(oi.done) : 'なし');

  // ---- 画面 ----
  const { chromium } = require('playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/view');
  await pg.fill('#pw', PASS);
  await pg.click('#go');
  await pg.waitForSelector('.store');
  await pg.fill('#day', D);
  await pg.dispatchEvent('#day', 'change');
  await pg.waitForFunction(x => document.getElementById('day').value === x, D);
  for (const bt of await pg.$$('.area > button')) {
    if ((await bt.innerText()).indexOf('朝番') >= 0) { await bt.click(); break; }
  }
  await pg.waitForTimeout(250);
  const txt = await pg.innerText('body');
  check('画面: リンク先の進み具合が出る', /2か所 6\/6/.test(txt), (txt.match(/\d+か所 \d+\/\d+/) || [''])[0]);
  check('画面: 親項目に「記録なし」が出ない',
    !/シャワー清掃[\s\S]{0,20}記録なし/.test(txt));
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await b.close();

  console.log('verify50 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
