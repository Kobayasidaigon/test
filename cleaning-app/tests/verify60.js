// やることリストの1行を決まった曜日だけ出す（days）（2026-11-20）
//  ・枇杷島 中番「ジムエリア マシンメンテ」を月・火・水だけ
//  ・当たらない日は一覧に出さず、残り・進み具合・管理者ページ（/view/data）でも数えない
//  ・編集中は全部出る／days の無い行と他の店舗は今までどおり
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const S = '枇杷島', STAFF = '試験 太郎';
const MON = '2026-11-16', THU = '2026-11-19', SUN = '2026-11-22';
const SEC = 'やることリスト（上から順に）';
const ROWS = (days) => [
  { id: 'h_plain', section: SEC, title: 'ふつうの行', desc: '', link: '' },
  Object.assign({ id: 'routine_hiru_mmente', section: SEC, title: 'ジムエリア マシンメンテ', desc: '', link: 'machine_mente', linkAny: true }, days ? { days } : {}),
];

(async () => {
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify(ROWS([1, 2, 3])));
  await put('sdef_笠寺_customItems_routine_hiru', JSON.stringify(ROWS(null)));

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.evaluate(({ S, STAFF }) => {
    localStorage.setItem('currentStore', S);
    localStorage.setItem('storeAuthed_' + S, '1');
    localStorage.setItem('currentStaff', STAFF);
    localStorage.setItem('currentArea', 'routine_hiru');
  }, { S, STAFF });
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
  await pg.waitForTimeout(1500);
  const show = async (d) => pg.evaluate((d) => {
    dateInput.value = d; currentArea = 'routine_hiru'; routineEditMode = false; render();
    return { mm: !!document.querySelector('.rt-row[data-id="routine_hiru_mmente"]'),
             plain: !!document.querySelector('.rt-row[data-id="h_plain"]'),
             n: todayAreaItems('routine_hiru').length };
  }, d);
  let r = await show(MON);
  check('月曜はマシンメンテが出る', r.mm && r.plain, JSON.stringify(r));
  check('月曜は2行を数える', r.n === 2, r.n);
  r = await show(THU);
  check('木曜はマシンメンテが出ない', !r.mm && r.plain, JSON.stringify(r));
  check('木曜は1行だけ数える', r.n === 1, r.n);
  r = await show(SUN);
  check('日曜もマシンメンテが出ない', !r.mm, JSON.stringify(r));
  const ed = await pg.evaluate((d) => {
    dateInput.value = d; routineEditMode = true; render();
    const x = !!document.querySelector('.rt-row[data-id="routine_hiru_mmente"]');
    routineEditMode = false; render(); return x;
  }, THU);
  check('編集中は木曜でもマシンメンテが見える', ed);
  // 他の店舗（days なし）は木曜でも出る
  const k = await pg.evaluate(({ d }) => {
    currentStore = '笠寺'; dateInput.value = d; currentArea = 'routine_hiru'; render();
    const x = !!document.querySelector('.rt-row[data-id="routine_hiru_mmente"]');
    currentStore = '枇杷島'; render(); return x;
  }, { d: THU });
  check('笠寺（days なし）は木曜でも出る', k);
  check('画面のエラーなし', errs.length === 0, errs.join(' | '));
  await b.close();

  // 管理者ページのデータ
  const lr = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'test-admin-pass' });
  const cookie = (lr.headers.get('set-cookie') || '').split(';')[0];
  const titles = async (d, st) => {
    const o = JSON.parse(await (await fetch(BASE + '/view/data?d=' + d, { headers: { Cookie: cookie } })).text());
    const s = o.stores.find(x => x.store === st);
    const a = (s.routines || []).find(x => x.name === '中番');
    return a ? a.groups.flatMap(g => g.items.map(i => i.title)) : [];
  };
  let t = await titles(MON, S);
  check('管理者ページ 月曜は出る', t.includes('ジムエリア マシンメンテ'), t.join(','));
  t = await titles(THU, S);
  check('管理者ページ 木曜は出ない', !t.includes('ジムエリア マシンメンテ') && t.includes('ふつうの行'), t.join(','));
  t = await titles(THU, '笠寺');
  check('管理者ページ 笠寺は木曜でも出る', t.includes('ジムエリア マシンメンテ'), t.join(','));

  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 ' + e.stack); process.exit(1); });
