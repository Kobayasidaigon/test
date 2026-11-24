// 毎回写真が要る項目（photoEach）に、チェックする前から「写真」の印を出す（2026-11-24 daigoさん）
//  ・やることリストを開いた子項目（シャワーの各ルームの「ルーム全体の写真」）に印が出る
//  ・ふつうの項目・女性のルーム（写真の行が無い）には出ない
//  ・エリアの画面（ルームを直接開く）でも印が出る
//  ・編集中は出さない
//  ・抜き打ちで当たった項目にも印（必ず当たる=1 は出る、なし=0 は出ない）。やることリストの子項目でも同じ
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const S = '枇杷島', STAFF = '試験 太郎';
const TODAY = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const fs = require('fs');
const OUT = process.env.OUT || 'tests/out';
const ROOMS = [['shower_b1', 'シャワー男1', true], ['shower_b2', 'シャワー男2', true], ['shower_b3', 'シャワー女1', false],
  ['shower_b5', 'サウナ男Bのシャワー', true], ['shower_b6', 'サウナ男Cのシャワー', true]];
const plain = (id, title, sec) => ({ id, title, desc: '', section: sec });
const photo = sec => ({ id: 'room_photo', title: 'ルーム全体の写真', desc: '掃除が終わったら最後に1枚',
  section: sec, photoEach: true, photoNote: '入口からルーム全体（床・壁・鏡）が1枚に入るように', addedAt: TODAY });

(async () => {
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  await put('sdef_' + S + '_customAreas', JSON.stringify(ROOMS.map(([k, n]) => ({ key: k, name: n, icon: 'shower-head', hidden: true }))));
  for (const [k, n, men] of ROOMS) {
    const items = [plain('floor', '床全体の洗浄・水切り', n), plain('shower_amenity3', '3点セットの補充', n)];
    if (men) items.push(photo(n));
    await put('sdef_' + S + '_customItems_' + k, JSON.stringify(items));
    await put('sdef_' + S + '_customSections_' + k, JSON.stringify([n]));
  }
  await put('sdef_' + S + '_customItems_routine_asa', JSON.stringify([
    { id: 'routine_asa_v3_05', section: 'やることリスト（上から順に）', title: 'シャワー清掃',
      desc: 'マット・排水溝ネットの交換も。1チェック＝男女両方', link: ROOMS.map(r => r[0]).join(',') }]));

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.evaluate(({ S, STAFF, TODAY }) => {
    localStorage.setItem('currentStore', S);
    localStorage.setItem('storeAuthed_' + S, '1');
    localStorage.setItem('currentStaff', STAFF);
    localStorage.setItem('currentStaffDay', TODAY);
    localStorage.setItem('currentArea', 'routine_asa');
  }, { S, STAFF, TODAY });
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { currentArea = 'routine_asa'; routineExpanded.add('routine_asa_v3_05'); render(); });
  await pg.waitForTimeout(300);

  // 抜き打ちの当たりは日付で変わるので、最初は全部「なし」にしておく
  await pg.evaluate(() => { const m = {}; ['shower_b1','shower_b2','shower_b3','shower_b5','shower_b6'].forEach(k => {
    ['floor','shower_amenity3','room_photo'].forEach(i => { m[k + ':' + i] = 0; }); }); saveProofRates(m); render(); });
  await pg.waitForTimeout(300);
  const tagCount = sel => pg.locator(sel + ' .photo-tag').count();
  check('写真の行4つに印が出る', await tagCount('.rt-child[data-id="room_photo"]') === 4, await tagCount('.rt-child[data-id="room_photo"]'));
  check('ふつうの項目には出ない', await tagCount('.rt-child[data-id="floor"]') === 0);
  check('親の行には出ない', await tagCount('.rt-row') === 0);
  check('印の文字は「写真」', (await pg.locator('.rt-child[data-id="room_photo"] .photo-tag').first().textContent()).trim() === '写真');
  await pg.locator('.rt-child[data-area^="shower_b1"][data-id="room_photo"]').scrollIntoViewIfNeeded();
  await pg.evaluate(() => window.scrollBy(0, 200));
  await pg.screenshot({ path: OUT + '/photo-tag-routine.png' });

  await pg.evaluate(() => { routineEditMode = true; render(); });
  await pg.waitForTimeout(200);
  check('編集中は出さない', await pg.locator('.photo-tag').count() === 0);
  await pg.evaluate(() => { routineEditMode = false; currentArea = 'shower_b1'; render(); });
  await pg.waitForTimeout(400);
  const t = await pg.locator('.item .item-title').allTextContents();
  check('エリアの画面でも写真の項目に印', t.some(x => /ルーム全体の写真/.test(x)) && await pg.locator('.item .photo-tag').count() === 1,
    await pg.locator('.item .photo-tag').count());
  await pg.screenshot({ path: OUT + '/photo-tag-area.png' });

  // 抜き打ち: その日に当たる項目にも印
  await pg.evaluate(() => { const m = loadProofRates(); m['shower_b1:floor'] = 1; saveProofRates(m); render(); });
  await pg.waitForTimeout(300);
  const titles = await pg.evaluate(() => Array.from(document.querySelectorAll('.item')).map(d =>
    [d.querySelector('.item-title').textContent, !!d.querySelector('.photo-tag')]));
  const has = t => (titles.find(x => x[0].indexOf(t) === 0) || [])[1];
  check('抜き打ちで当たった項目に印', has('床全体の洗浄') === true, JSON.stringify(titles));
  check('抜き打ちなしの項目には出ない', has('3点セット') === false);
  await pg.evaluate(() => { currentArea = 'routine_asa'; routineExpanded.add('routine_asa_v3_05'); render(); });
  await pg.waitForTimeout(300);
  check('やることリストの子項目でも抜き打ちに印', await tagCount('.rt-child[data-area^="shower_b1"][data-id="floor"]') === 1);
  check('他のルームの同じ項目は当たっていなければ出ない', await tagCount('.rt-child[data-area^="shower_b3"][data-id="floor"]') === 0);
  // 印どおりに、チェックすると撮影の案内が出る
  await pg.click('.rt-child[data-area^="shower_b1"][data-id="floor"]');
  await pg.waitForTimeout(300);
  check('印の付いた項目は、押すと撮影の案内が出る', await pg.evaluate(() => document.getElementById('proofDialog').open));
  check('画面のエラーなし', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('RESULT pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log("FAIL 例外 " + e); process.exit(1); });
