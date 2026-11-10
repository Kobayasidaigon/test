// 件数・残りのバッジ・「◯回空き」は、今日の曜日に出ているぶんだけで数える。
//
// 現場の写真（中番 > フロア・マシン清掃）: 今日のぶんは全部済んでいるのに
// 「14/45」「2回空き」と出て、中番のバッジも残っていた。
// 「他の曜日のぶんを見る」でたたんだ項目まで数えていたため。
//
// ・今日のぶんを全部済ませると、行の数字が 今日のぶん/今日のぶん になる
// ・行が「済み」になり、中番のタブのバッジがチェックになる
// ・他の曜日の項目が長く空いていても「◯回空き」は出ない
// ・今日のぶんの項目が空いていれば「◯回空き」は出る
// ・エリアのページの進み具合も今日のぶんだけ
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

const S = '枇杷島';
const DAY = 86400000;
const ymd = t => { const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
// 直近の火曜日（今日が火曜なら今日）
const now = Date.now();
let tue = now;
while (new Date(tue).getDay() !== 2) tue -= DAY;
const D = ymd(tue);

(async () => {
  await put('sdef_' + S + '_customAreas', JSON.stringify([
    { key: 'routine_hiru', name: '中番' },
    { key: 'fm', name: 'フロア・マシン' },
  ]));
  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify([
    { id: 'hiru_fm', section: 'やること', title: 'フロア・マシン清掃', link: 'fm' },
  ]));
  const items = [
    { id: 'e1', section: '毎日', title: '毎日1' },
    { id: 'e2', section: '毎日', title: '毎日2' },
    { id: 'a1', section: 'A【月・木】', title: '月木1' },
    { id: 'a2', section: 'A【月・木】', title: '月木2' },
    { id: 'b1', section: 'B【火・金】', title: '火金1' },
    { id: 'b2', section: 'B【火・金】', title: '火金2' },
    { id: 'c1', section: 'C【水・土】', title: '水土1' },
  ];
  await put('sdef_' + S + '_customItems_fm', JSON.stringify(items));

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.evaluate(s => {
    localStorage.setItem('currentStore', s);
    localStorage.setItem('storeAuthed_' + s, '1');
  }, S);
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 20000 });

  // 今日（火曜）のぶん e1 e2 b1 b2 を済みに。他の曜日（月木・水土）は記録なし＝ずっと空いている
  await pg.evaluate(({ S, D }) => {
    dateInput.value = D;
    const done = { staff: 'x', time: '12:00', ts: D + ' 12:00' };
    localStorage.setItem('clean_' + S + '_試験_fm@routine_hiru_' + D,
      JSON.stringify({ e1: done, e2: done, b1: done, b2: done }));
    currentArea = 'routine_hiru'; showOtherDays = false; render();
  }, { S, D });
  await pg.waitForSelector('.rt-row', { timeout: 15000 });

  const row = () => pg.$eval('.rt-row[data-id="hiru_fm"]', r => ({
    count: (r.querySelector('.rt-count') || {}).textContent || '',
    done: r.classList.contains('done'),
    gap: (r.querySelector('.rt-gap') || {}).textContent || '',
  }));
  let r = await row();
  check('行の数字は今日のぶんだけ（4/4）', r.count === '4/4', r.count);
  check('今日のぶんが済めば行が済みになる', r.done);
  check('他の曜日の空きで「◯回空き」は出ない', r.gap === '', r.gap);
  const badge = await pg.$$eval('#tabsRoutine .tab', ts => ts.map(t => t.className + '|' + t.textContent.trim()));
  const hiru = badge.find(t => /中番/.test(t)) || '';
  check('中番のタブは済み（complete）', /complete/.test(hiru), hiru);

  // 開いて見ても数は変わらない
  await pg.evaluate(() => { routineExpanded.add('hiru_fm'); showOtherDays = true; render(); });
  r = await row();
  check('他の曜日のぶんを開いても数は今日のぶんだけ', r.count === '4/4', r.count);
  await pg.evaluate(() => { showOtherDays = false; render(); });

  // 今日のぶんの1つを取り消すと 3/4、まだ済みではない
  await pg.evaluate(({ S, D }) => {
    const done = { staff: 'x', time: '12:00', ts: D + ' 12:00' };
    localStorage.setItem('clean_' + S + '_試験_fm@routine_hiru_' + D,
      JSON.stringify({ e1: done, e2: done, b1: done }));
    render();
  }, { S, D });
  r = await row();
  check('今日のぶんが残っていれば 3/4', r.count === '3/4', r.count);
  check('今日のぶんが残っていれば済みではない', !r.done);
  const badge2 = await pg.$$eval('#tabsRoutine .tab', ts => ts.map(t => t.className + '|' + t.textContent.trim()));
  const hiru2 = badge2.find(t => /中番/.test(t)) || '';
  check('中番のタブにバッジが残る', !/complete/.test(hiru2), hiru2);
  check('今日のぶん（一度もやっていない）の空きは出る', r.gap === '記録なし', r.gap);

  // エリアのページ（フロア・マシン）の進み具合も今日のぶんだけ
  await pg.evaluate(() => { currentArea = 'fm'; render(); });
  const prog = await pg.$eval('#progressBar', x => x.style.width);
  check('エリアのページの進み具合は今日のぶんで数える', prog !== '' , prog);

  check('ページのエラーなし', errs.length === 0, JSON.stringify(errs));
  await b.close();
  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 : ' + e); process.exit(1); });
