// 枇杷島 男性シャワーの各ルームに「ルーム全体の写真」（2026-11-20）
//  ・朝番「シャワー清掃」を開くと、男性の4ルームの最後に写真の行が出る
//  ・押すと撮影の案内が出て、撮るまで済みにならない（やめれば付かない）
//  ・ルームごとに別の写真が要る（1ルームで撮っても他のルームは済みにならない）
//  ・女性のルームとふつうの項目は今までどおり
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

  const child = ak => '.rt-child[data-area^="' + ak + '"][data-id="room_photo"]';
  check('男性の4ルームに写真の行が出る', await pg.locator('.rt-child[data-id="room_photo"]').count() === 4,
    await pg.locator('.rt-child[data-id="room_photo"]').count());
  check('女性のルームには出ない', await pg.locator(child('shower_b3')).count() === 0);
  await pg.locator(child('shower_b1')).scrollIntoViewIfNeeded();
  await pg.evaluate(() => window.scrollBy(0, -260));
  await pg.screenshot({ path: OUT + '/room-list.png' });

  // ふつうの項目は今までどおり押せば済み
  await pg.click('.rt-child[data-area^="shower_b1"][data-id="floor"]');
  await pg.waitForTimeout(200);
  check('ふつうの項目は写真なしで済み', await pg.evaluate(() => !document.getElementById('proofDialog').open));

  await pg.click(child('shower_b1'));
  await pg.waitForTimeout(300);
  check('写真の行を押すと撮影の案内が開く', await pg.evaluate(() => document.getElementById('proofDialog').open));
  check('案内に撮るものが出る', /ルーム全体/.test(await pg.textContent('#proofDialogSpot')), await pg.textContent('#proofDialogSpot'));
  await pg.screenshot({ path: OUT + '/room-dialog.png' });
  await pg.click('#proofCancel');
  await pg.waitForTimeout(200);
  const sk = await pg.evaluate(() => document.querySelector('.rt-child[data-area^="shower_b1"][data-id="room_photo"]').dataset.area);
  check('やめると済みにならない', !(await pg.evaluate(k => !!loadRecordMerged(k).room_photo, sk)));

  await pg.click(child('shower_b1'));
  await pg.waitForTimeout(300);
  const jpg = OUT + '/room.jpg';
  fs.writeFileSync(jpg, await pg.screenshot({ type: 'jpeg' }));
  const fc = pg.waitForEvent('filechooser');
  await pg.click('#proofShoot');
  (await fc).setFiles(jpg);
  await pg.waitForFunction(k => !!loadRecordMerged(k).room_photo, sk, { timeout: 15000 }).catch(() => {});
  const r = await pg.evaluate(k => loadRecordMerged(k).room_photo, sk);
  check('写真を撮ると済みになる', !!r);
  check('記録に写真の鍵が付く', r && /^proof:枇杷島:shower_b1/.test(r.proof || ''), r && r.proof);
  const sk2 = await pg.evaluate(() => document.querySelector('.rt-child[data-area^="shower_b2"][data-id="room_photo"]').dataset.area);
  check('他のルームは済みにならない', !(await pg.evaluate(k => !!loadRecordMerged(k).room_photo, sk2)));
  await pg.click(child('shower_b2'));
  await pg.waitForTimeout(300);
  check('次のルームでも撮影の案内が開く（使い回さない）', await pg.evaluate(() => document.getElementById('proofDialog').open));
  await pg.click('#proofCancel');
  await pg.waitForTimeout(200);
  await pg.locator(child('shower_b1')).scrollIntoViewIfNeeded();
  await pg.evaluate(() => window.scrollBy(0, -260));
  await pg.screenshot({ path: OUT + '/room-done.png' });
  check('画面のエラーなし', errs.length === 0, errs.join(' / '));
  await b.close();
  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 ' + e); process.exit(1); });
