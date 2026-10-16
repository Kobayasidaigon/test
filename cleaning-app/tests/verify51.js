// やることリストの行を「開く先の進み具合」で数えること。
//
// 「シャワー清掃」1行を1点にすると、7部屋85項目のうち83件できていても
// 1点落とすだけで実際より低く出る。開く先の項目数ぶんの重みを持たせる。
// あわせて、同じ項目を やることリスト と 清掃エリア で二重に数えないこと。
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
  await put('sdef_笠寺_customAreas', JSON.stringify([
    { key: 'r1', name: '部屋1', hidden: true },
    { key: 'r2', name: '部屋2', hidden: true },
    { key: 'solo', name: 'どこからも開かない設備' },
  ]));
  const room = (sec, n) => JSON.stringify(
    Array.from({ length: n }, (_, i) => ({ id: 'i' + (i + 1), section: sec, title: sec + (i + 1) })));
  await put('sdef_笠寺_customItems_r1', room('部屋1', 10));
  await put('sdef_笠寺_customItems_r2', room('部屋2', 10));
  await put('sdef_笠寺_customItems_solo', room('設備', 5));
  await put('sdef_笠寺_customItems_routine_asa', JSON.stringify([
    { id: 'a_rooms', section: 'やること', title: '部屋の清掃', link: 'r1,r2' },
    { id: 'a_plain1', section: 'やること', title: 'ふつう1' },
    { id: 'a_plain2', section: 'やること', title: 'ふつう2' },
  ]));
  // 20項目中19件できている（部屋2の最後だけ未）＋ ふつう1だけ済み
  await put('clean_笠寺_山田 花子_r1@routine_asa_' + D, JSON.stringify(
    Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['i' + (i + 1), 1]))));
  await put('clean_笠寺_山田 花子_r2@routine_asa_' + D, JSON.stringify(
    Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['i' + (i + 1), 1]))));
  await put('clean_笠寺_山田 花子_routine_asa_' + D, JSON.stringify({ a_plain1: 1 }));
  await put('clean_笠寺_山田 花子_solo_' + D, JSON.stringify({ i1: 1, i2: 1 }));

  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const o = JSON.parse(await (await fetch(BASE + '/view/data?d=' + D,
    { headers: { Cookie: cookie } })).text());
  const st = o.stores.find(s => s.store === '笠寺');
  const asa = (st.routines || []).find(a => a.name === '朝番');
  const area = n => (st.areas || []).find(a => a.name === n);

  // 朝番: 部屋20件(19済) + ふつう2件(1済) = 22件中20
  check('朝番の分母は開く先の項目を含む（20+2=22）', asa.total === 22, String(asa.total));
  check('朝番の済みは20（19+1）', asa.done === 20, String(asa.done));
  check('1行1点なら 1/3 だったものが 20/22 になる',
    asa.done / asa.total > 0.9, (asa.done + '/' + asa.total));

  // 親項目そのものは「未完了」のまま（部屋2が埋まっていないため）
  const parent = asa.groups[0].items.find(x => x.title === '部屋の清掃');
  check('親項目の完了判定は全部そろって初めて○', parent.done === false);
  check('親項目に進み具合が付く（2か所 19/20）',
    parent.linked.areas === 2 && parent.linked.done === 19 && parent.linked.total === 20,
    JSON.stringify(parent.linked));

  // 二重に数えないこと
  check('開く先の部屋には「やることリスト経由」の印',
    area('部屋1').viaRoutine === true && area('部屋2').viaRoutine === true);
  check('どこからも開かない設備には印が付かない',
    area('どこからも開かない設備').viaRoutine === false);
  // 上の数 = 朝番22 + どこからも開かない設備5 = 27（部屋20は重ねて数えない）
  const sum = (st.routines || []).reduce((n, a) => n + a.total, 0)
    + (st.areas || []).filter(a => !a.viaRoutine && a.last).reduce((n, a) => n + a.total, 0);
  check('上の数の分母は27（部屋を二重に数えない）', sum === 27, String(sum));
  check('部屋の行の数字自体はそのまま出る',
    area('部屋1').total === 10 && area('部屋1').done === 10,
    area('部屋1').done + '/' + area('部屋1').total);

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
  const head = await pg.innerText('.store > h2');
  check('画面の上の数も27が分母', /\/\s*27/.test(head.replace(/\s+/g, ' ')), head.replace(/\n/g, ' '));
  const txt = await pg.innerText('body');
  check('画面に朝番 20/22 が出る', /20\/22/.test(txt));
  check('断り書きに数え方が書いてある', /開く先の項目を含む/.test(txt));
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await b.close();

  console.log('verify51 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
