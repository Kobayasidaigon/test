// 共有ページで「他の日」も見られること。
//
// いちばん間違えやすいのは「前回やった日」。見ている日より後の記録を数えてしまうと、
// 昔の日を開いたときに前回が未来の日付になる。そこを重点的に確かめる。
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const d = n => new Date(Date.now() + 9 * 3600000 + n * 86400000).toISOString().slice(0, 10);

(async () => {
  const T = d(0);
  await put('sdef_笠寺_customAreas', JSON.stringify([{ key: 'routine_asa', name: '朝番' }]));
  await put('sdef_笠寺_customItems_routine_asa', JSON.stringify([
    { id: 'x1', section: 'やること', title: 'サウナ電源' },
    { id: 'x2', section: 'やること', title: 'モップの掃除' },
  ]));
  // x1: 今日 と 3日前 / x2: 3日前 と 10日前
  await put('clean_笠寺_山田 花子_routine_asa_' + T, JSON.stringify({ x1: true }));
  await put('clean_笠寺_鈴木 太郎_routine_asa_' + d(-3), JSON.stringify({ x1: true, x2: true }));
  await put('clean_笠寺_佐藤 一郎_routine_asa_' + d(-10), JSON.stringify({ x2: true }));
  await put('periodicTasks', JSON.stringify([
    { id: 'p1', area: '設備', title: 'フィルター清掃', interval: 30 },
  ]));
  await put('periodicDone_笠寺', JSON.stringify({ p1: { date: d(-1), staff: '山田 花子', next: d(+29) } }));

  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const get = async q => {
    const res = await fetch(BASE + '/view/data' + q, { headers: { Cookie: cookie } });
    return { status: res.status, body: await res.text() };
  };
  const asa = data => data.stores.find(s => s.store === '笠寺').routines[0];
  const item = (data, id) => {
    const g = asa(data).groups[0].items;
    return g[id === 'x1' ? 0 : 1];
  };

  // ---- 今日 ----
  let g = await get('');
  let o = JSON.parse(g.body);
  check('日付なしなら今日', o.date === T, o.date);
  check('今日だと分かる印がある', o.isToday === true);
  check('今日は x1 がついている', item(o, 'x1').done === true);
  check('今日は x2 がついていない', item(o, 'x2').done === false);

  // ---- 3日前 ----
  g = await get('?d=' + d(-3));
  o = JSON.parse(g.body);
  check('3日前を出せる', o.date === d(-3), o.date);
  check('3日前は今日ではない', o.isToday === false);
  check('3日前は x1 がついている', item(o, 'x1').done === true);
  check('3日前は x2 もついている', item(o, 'x2').done === true);
  check('3日前につけた人が出る（鈴木 太郎）',
    (item(o, 'x1').by || []).indexOf('鈴木 太郎') >= 0, JSON.stringify(item(o, 'x1').by));
  check('3日前に今日の人（山田）は出ない',
    (item(o, 'x1').by || []).indexOf('山田 花子') < 0, JSON.stringify(item(o, 'x1').by));
  check('3日前の記入者一覧も鈴木だけ',
    JSON.stringify(asa(o).who) === JSON.stringify(['鈴木 太郎']), JSON.stringify(asa(o).who));

  // ---- 5日前：ここが本題 ----
  g = await get('?d=' + d(-5));
  o = JSON.parse(g.body);
  check('5日前を出せる', o.date === d(-5), o.date);
  check('5日前は何もついていない', asa(o).done === 0, String(asa(o).done));
  check('x1 の前回が未来にならない（記録なし）', item(o, 'x1').last === null,
    String(item(o, 'x1').last));
  check('x2 の前回は10日前', item(o, 'x2').last === d(-10), String(item(o, 'x2').last));
  check('x2 の前回の人は佐藤 一郎',
    (item(o, 'x2').lastBy || []).indexOf('佐藤 一郎') >= 0, JSON.stringify(item(o, 'x2').lastBy));
  check('5日前の記入者はいない', (asa(o).who || []).length === 0, JSON.stringify(asa(o).who));

  // ---- 変な日付は今日に戻す ----
  for (const [q, why] of [['?d=2026-02-30', '実在しない日'], ['?d=abc', '日付でない'],
                          ['?d=' + d(+3), '先の日'], ['?d=1999-01-01', '古すぎる日'],
                          ['?d=', '空'], ['?d=2026-1-1', '桁が足りない']]) {
    const x = JSON.parse((await get(q)).body);
    check('変な日付は今日になる（' + why + '）', x.date === T, x.date);
  }

  // ---- 定期清掃は「今の状態」と断る ----
  check('今日なら断り書きなし', JSON.parse((await get('')).body).periodicAsOfToday === false);
  check('他の日なら「今の状態」と断る',
    JSON.parse((await get('?d=' + d(-3))).body).periodicAsOfToday === true);

  // ---- 合言葉なしでは、日付を付けても出ない ----
  const noAuth = await fetch(BASE + '/view/data?d=' + d(-3));
  check('合言葉なしなら日付を付けても出ない', noAuth.status === 401, String(noAuth.status));

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
  check('日付の欄に今日が入っている', await pg.inputValue('#day') === T, await pg.inputValue('#day'));
  check('先の日には行けない（次へが押せない）', await pg.isDisabled('#next'));
  check('今日のときは「今日」が押せない', await pg.isDisabled('#toToday'));

  await pg.click('#prev');
  await pg.waitForFunction(t => document.getElementById('day').value !== t, T);
  check('前の日に動く', await pg.inputValue('#day') === d(-1), await pg.inputValue('#day'));
  check('前の日では「次へ」が押せる', !(await pg.isDisabled('#next')));
  check('前の日では「今日」が押せる', !(await pg.isDisabled('#toToday')));
  let txt = await pg.innerText('body');
  check('その日の記録だと書いてある', /の記録/.test(txt));
  check('定期清掃に「今の状態」と出る', /定期清掃（今の状態）/.test(txt));

  await pg.click('#toToday');
  await pg.waitForFunction(t => document.getElementById('day').value === t, T);
  check('「今日」で戻れる', await pg.inputValue('#day') === T);
  txt = await pg.innerText('body');
  check('今日は途中経過だと書いてある', /途中経過/.test(txt));
  check('今日は「今の状態」と出ない', !/定期清掃（今の状態）/.test(txt));

  // 日付を直接入れる
  await pg.fill('#day', d(-3));
  await pg.dispatchEvent('#day', 'change');
  await pg.waitForFunction(x => document.getElementById('day').value === x, d(-3));
  txt = await pg.innerText('body');
  check('日付を入れるとその日になる', await pg.inputValue('#day') === d(-3));
  check('3日前の記入者が出る', txt.indexOf('鈴木 太郎') >= 0);
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await b.close();

  console.log('verify48 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
