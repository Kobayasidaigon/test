// 萩野通のホワイトニング備品補充（2026-11-16）
//  ・やることリストの行に「補充前の残り」「補充後の数」を入れ、写真を撮って初めて済みになる
//  ・ふりかえりで「前の番の補充後 − 次の番の補充前」＝減った数を番ごとに並べる
//  ・stock/photoEach の無い店舗・項目は今までどおり
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const S = '萩野通', STAFF = '試験 太郎';
const day = n => new Date(Date.now() + 9 * 3600000 - n * 86400000).toISOString().slice(0, 10);
const TODAY = day(0), Y = day(1), Y2 = day(2);
const NUMS = [{ id: 'before', label: '補充前の数' }];
const W = (id, title) => ({ id, section: 'やることリスト（上から順に）', title, desc: '', link: '',
  nums: NUMS, stock: 'ホワイトニング備品', photoEach: true, photoNote: '補充したあとのホワイトニング備品' });
const fs = require('fs');

(async () => {
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  await put('sdef_' + S + '_customItems_routine_asa', JSON.stringify([
    { id: 'a_plain', section: 'やることリスト（上から順に）', title: 'ふつうの行', desc: '', link: '' },
    W('routine_asa_v3_11', 'ホワイトニング備品補充')]));
  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify([W('routine_hiru_v3_10', 'ホワイトニング・エステ備品補充')]));
  await put('sdef_' + S + '_customItems_routine_ban', JSON.stringify([W('routine_ban_v3_13', 'ホワイトニング・エステ備品補充')]));
  // 笠寺は同じ id でも stock なし（今までどおり）
  await put('sdef_笠寺_customItems_routine_ban', JSON.stringify([
    { id: 'routine_ban_v3_13', section: 'やることリスト（上から順に）', title: 'ホワイトニング・エステ備品補充', desc: '', link: '' }]));
  // 過去の記録: おととい 朝(10→20) 中(15→20) 遅(14→20) / きのう 朝(18→20) 中(12→20) 遅(19→20)
  const n = (b, a, st) => ({ before: String(b), _staff: st || '山田', _time: '10:00' });
  await put('nums_' + S + '_' + Y2, JSON.stringify({ routine_asa_v3_11: n(10, 20), routine_hiru_v3_10: n(15, 20), routine_ban_v3_13: n(14, 20) }));
  await put('nums_' + S + '_' + Y, JSON.stringify({ routine_asa_v3_11: n(18, 20), routine_hiru_v3_10: n(12, 20, '佐藤'), routine_ban_v3_13: n(19, 20) }));

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
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
  await pg.evaluate(() => { currentArea = 'routine_asa'; render(); });

  const row = '.rt-row[data-id="routine_asa_v3_11"]';
  check('ホワイトニングの行に数の欄が1つ出る', await pg.locator(row + ' input[data-field]').count() === 1);
  check('写真が要ると書いてある', /数を入れるとカメラが開きます/.test(await pg.textContent(row)), await pg.textContent(row));
  check('前の番（きのう遅番 19）が出る', /前の番 .*遅番: 19/.test(await pg.textContent(row)), await pg.textContent(row + ' .num-prev'));
  check('ふつうの行には数の欄が出ない', await pg.locator('.rt-row[data-id="a_plain"] input').count() === 0);

  await pg.fill(row + ' input[data-field="before"]', '13');
  await pg.locator(row + ' input[data-field="before"]').dispatchEvent('change');
  await pg.waitForTimeout(300);
  check('数を入れると写真の案内が開く', await pg.evaluate(() => document.getElementById('proofDialog').open));
  check('案内に撮るものが出る', /補充したあと/.test(await pg.textContent('#proofDialogSpot')));
  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/w-dialog.png' });
  check('写真の前はまだ済みにならない', !(await pg.evaluate(() => !!loadRecord('routine_asa').routine_asa_v3_11)));
  await pg.click('#proofCancel');
  await pg.waitForTimeout(200);
  check('やめると済みにならない', !(await pg.evaluate(() => !!loadRecord('routine_asa').routine_asa_v3_11)));
  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/w-row.png' });
  await pg.click(row + ' .rt-title');
  await pg.waitForTimeout(200);
  check('行を押すともう一度写真の案内が開く', await pg.evaluate(() => document.getElementById('proofDialog').open));
  const jpg = (process.env.OUT || 'tests/out') + '/w.jpg';
  fs.writeFileSync(jpg, await pg.screenshot({ type: 'jpeg' }));
  const fc = pg.waitForEvent('filechooser');
  await pg.click('#proofShoot');
  (await fc).setFiles(jpg);
  await pg.waitForFunction(() => !!loadRecord('routine_asa').routine_asa_v3_11, null, { timeout: 15000 }).catch(() => {});
  const r = await pg.evaluate(() => loadRecord('routine_asa').routine_asa_v3_11);
  check('写真を撮ると済みになる', !!r);
  check('記録に写真の鍵が付く', r && /^proof:萩野通:routine_asa:routine_asa_v3_11:/.test(r.proof || ''), r && r.proof);
  const nv = await pg.evaluate(() => loadNums().routine_asa_v3_11);
  check('数に担当者と写真が付く', nv && nv._staff === '試験 太郎' && nv._photo === (r && r.proof), JSON.stringify(nv));
  await pg.waitForTimeout(300);
  check('済みの行は「写真あり」', /写真あり/.test(await pg.textContent(row)));
  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/w-done.png' });

  const list = await pg.evaluate(d => stockEntries('萩野通', 'ホワイトニング備品', d), [Y2, Y, TODAY]);
  check('並びは 朝→中→遅 を日ごとに', list.map(e => e.slotName).join() === '朝番,中番,遅番,朝番,中番,遅番,朝番', list.map(e => e.slotName).join());
  check('補充前の数が並ぶ', list.map(e => e.before).join() === '10,15,14,18,12,19,13', list.map(e => e.before).join());
  check('補充後が決まっていなければ減った数は出さない', list.every(e => e.gone === null));
  await pg.evaluate(() => setMode('review'));
  await pg.waitForSelector('.rv-stock', { timeout: 20000 });
  const txt = await pg.textContent('.rv-stock');
  check('ふりかえりに表が出る', /ホワイトニング備品の補充前の数/.test(txt), txt.slice(0, 80));
  check('写真のリンクがある', await pg.locator('.rv-stock a[href*="proof"]').count() === 1);
  check('数の記録（ふつうの表）には重ねて出さない', await pg.evaluate(() => rvNums('萩野通').length === 0));
  await pg.evaluate(() => { document.querySelector('.rv-stock').scrollIntoView(); window.scrollBy(0, -170); });
  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/w-review.png' });
  // stockFull を入れると減った数が出る
  const g2 = await pg.evaluate(d => {
    const k = 'sdef_萩野通_customItems_routine_hiru';
    const l = JSON.parse(localStorage.getItem(k)); l[0].stockFull = 20; localStorage.setItem(k, JSON.stringify(l));
    return stockEntries('萩野通', 'ホワイトニング備品', d).map(e => e.gone);
  }, [Y2, Y]);
  check('stockFull があれば その番の減った数が出る', JSON.stringify(g2) === JSON.stringify([null, 5, null, null, 8, null]), JSON.stringify(g2));

  // 笠寺は今までどおり（数の欄なし・写真なし）
  await pg.evaluate(() => { currentStore = '笠寺'; localStorage.setItem('currentStore', '笠寺'); setMode('check'); currentArea = 'routine_ban'; render(); });
  await pg.waitForTimeout(500);
  const kr = '.rt-row[data-id="routine_ban_v3_13"]';
  check('笠寺の行に数の欄は出ない', await pg.locator(kr + ' input').count() === 0);
  check('笠寺は写真なしで済みにできる', await pg.evaluate(() => { toggleItem('routine_ban_v3_13'); return !!loadRecord('routine_ban').routine_ban_v3_13 && !document.getElementById('proofDialog').open; }));
  check('画面のエラーなし', errs.length === 0, errs.join(' / '));
  await b.close();
  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 ' + e); process.exit(1); });
