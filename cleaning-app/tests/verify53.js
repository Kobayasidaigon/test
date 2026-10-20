// 数の記録（ゴルフのクラブ本数など）を、スタッフが見る「ふりかえり」に出すこと。
//
// 見たいのは在庫の動きなので、いまの数だけでなく
//   ・前回との差
//   ・日付ごとの横棒（棒は0から伸ばす）
//   ・記録のない日は点にしない／数でない値も点にしない
// が合っていること。管理者ページ（/view）には出さないこと。
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

const S = '笠寺';
const day = n => new Date(Date.now() + 9 * 3600000 - n * 86400000)
  .toISOString().slice(0, 10);

(async () => {
  await put('sdef_' + S + '_customAreas', JSON.stringify([
    { key: 'golf_a', name: 'ゴルフA' },
  ]));
  await put('sdef_' + S + '_customItems_golf_a', JSON.stringify([
    { id: 'ga_clubs', section: '備品', title: 'レンタルクラブの本数',
      nums: [{ id: 'm', label: '男性' }, { id: 'w', label: '女性' }] },
    { id: 'ga_balls', section: '備品', title: 'ボールの個数',
      nums: [{ id: 'n', label: '個数' }], numLow: 200, numOut: 100 },
  ]));

  // 男性: 16 →(9日前) 16 →(8日前) 14 →(今日) 15。間の日は記録なし
  await put('nums_' + S + '_' + day(10), JSON.stringify({ ga_clubs: { m: '16', w: '9' } }));
  await put('nums_' + S + '_' + day(9), JSON.stringify({ ga_clubs: { m: '16', w: '9' } }));
  await put('nums_' + S + '_' + day(8), JSON.stringify({ ga_clubs: { m: '14', w: '9' } }));
  await put('nums_' + S + '_' + day(0), JSON.stringify({
    ga_clubs: { m: '15', w: '9' }, ga_balls: { n: '80' } }));
  // 空・数でない値（点にしないこと）
  await put('nums_' + S + '_' + day(7), JSON.stringify({
    ga_clubs: { m: '', w: 'あとで' } }));
  // 60日より前（さかのぼる範囲の外）
  await put('nums_' + S + '_' + day(80), JSON.stringify({ ga_clubs: { m: '99', w: '99' } }));

  // ---- 管理者ページには出ないこと ----
  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const vd = await (await fetch(BASE + '/view/data', { headers: { Cookie: cookie } })).text();
  const o = JSON.parse(vd);
  const kasa = (o.stores || []).find(s => s.store === S) || {};
  check('管理者ページのデータに数の記録は入らない', kasa.nums === undefined,
    JSON.stringify(kasa.nums));
  check('管理者ページの本文にも出ない', !/本数・個数の記録/.test(vd));

  // ---- スタッフの「ふりかえり」 ----
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
  await pg.waitForFunction(() => typeof window.rvNums === 'function', null, { timeout: 20000 });

  const rows = await pg.evaluate(() => rvNums(localStorage.getItem('currentStore')));
  const m = rows.find(x => x.label === '男性');
  const w = rows.find(x => x.label === '女性');
  const ball = rows.find(x => x.label === '個数');

  check('男性の行が出る', !!m);
  check('女性の行が出る', !!w);
  check('ボールの行が出る', !!ball);
  check('場所と項目名が付く', m && m.area === 'ゴルフA' && m.title === 'レンタルクラブの本数',
    m && (m.area + '/' + m.title));
  check('いまの数は 15', m && m.last === 15, m && m.last);
  check('前回は 14', m && m.prev === 14, m && m.prev);
  check('前回との差は +1', m && m.diff === 1, m && m.diff);
  check('記録のある日数は 4日', m && m.n === 4, m && m.n);
  check('いちばん少ない日は 14', m && m.min === 14, m && m.min);
  check('いちばん多い日は 16', m && m.max === 16, m && m.max);
  check('60日より前は入らない', m && m.max !== 99, m && m.max);
  check('数でない値は点にしない', w && w.n === 4, w && w.n);
  check('下限・交換のめやすが付く', ball && ball.low === 200 && ball.outAt === 100,
    ball && (ball.low + '/' + ball.outAt));

  const dys = (m && m.days) || [];
  check('日付ごとの値は4件', dys.length === 4, dys.length);
  check('新しい順に並ぶ', dys[0] && dys[0].v === 15, dys[0] && dys[0].v);
  check('いちばん新しい日の差は +1', dys[0] && dys[0].diff === 1, dys[0] && dys[0].diff);
  check('その前は -2', dys[1] && dys[1].v === 14 && dys[1].diff === -2,
    dys[1] && JSON.stringify(dys[1]));
  check('変わらなかった日は 0', dys[2] && dys[2].diff === 0, dys[2] && dys[2].diff);
  check('いちばん古い日の差は null', dys[3] && dys[3].diff === null, dys[3] && dys[3].diff);

  // ---- 画面 ----
  // renderReview は変数 currentStore を見る。localStorage だけでは足りない
  const store0 = await pg.evaluate(() => currentStore);
  check('店舗が決まっている', !!store0, JSON.stringify(store0));
  if (!store0) await pg.evaluate(s => { currentStore = s; }, S);
  await pg.evaluate(() => setMode('review'));
  await pg.waitForSelector('.rv-nums', { timeout: 20000 });
  const txt = await pg.textContent('.rv-nums');
  check('ふりかえりに数の記録が出る', /数の記録/.test(txt));
  check('項目名が出る', /レンタルクラブの本数/.test(txt));
  check('場所と欄が出る', /ゴルフA・男性/.test(txt), txt.slice(0, 80));
  check('差が矢印付きで出る（色だけに頼らない）', /▲\+1/.test(txt));
  check('最小〜最大が出る', /14〜16/.test(txt));
  check('交換のめやす割れが出る', /交換のめやすを下回/.test(txt));
  check('日付ごとが出せる', /日付ごと 4日ぶん/.test(txt));

  await pg.$$eval('details.nm-mv', ds => ds.forEach(d => { d.open = true; }));
  await pg.waitForSelector('table.nm-t .nm-bb', { timeout: 15000 });
  const tbl = await pg.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.nm-row'));
    const me = cards.find(c => c.querySelector('.nm-sub')
      && c.querySelector('.nm-sub').textContent.indexOf('男性') >= 0);
    const t = me && me.nextElementSibling && me.nextElementSibling.querySelector('table.nm-t');
    if (!t) return null;
    return {
      caption: (t.querySelector('caption') || {}).textContent || '',
      head: Array.from(t.querySelectorAll('th')).map(x => x.textContent),
      rows: Array.from(t.querySelectorAll('tr')).slice(1).map(tr => ({
        d: tr.querySelector('td.d').textContent,
        w: tr.querySelector('.nm-bb').style.width,
        v: tr.querySelector('td.v').textContent,
        dif: tr.children[3].textContent,
        now: tr.classList.contains('now'),
      })),
    };
  });
  check('男性の行に日付ごとの表が付く', !!tbl, tbl === null ? 'ない' : 'ある');
  check('表の見出し', tbl && tbl.head.join('/') === '日付/数/値/前の記録との差',
    tbl && tbl.head.join('/'));
  check('棒は4日ぶん', tbl && tbl.rows.length === 4, tbl && tbl.rows.length);
  check('いちばん新しい日に印が付く', tbl && tbl.rows[0].now && !tbl.rows[1].now,
    tbl && tbl.rows.map(x => x.now).join(','));
  check('色だけでなく字でも分かる', tbl && /最新/.test(tbl.rows[0].d), tbl && tbl.rows[0].d);
  check('どの行にも数が出る', tbl && tbl.rows.map(x => x.v).join(',') === '15,14,16,16',
    tbl && tbl.rows.map(x => x.v).join(','));
  check('差が出る', tbl && tbl.rows.map(x => x.dif).join(',') === '▲+1,▼-2,±0,―',
    tbl && tbl.rows.map(x => x.dif).join(','));
  // 棒は0から。いちばん多い16で100%、14なら87.5%
  const wOf = s => parseFloat(s);
  check('いちばん多い日の棒が100%', tbl && wOf(tbl.rows[2].w) === 100, tbl && tbl.rows[2].w);
  check('14の棒は 14/16 の長さ（0から伸ばしている）',
    tbl && Math.abs(wOf(tbl.rows[1].w) - 87.5) < 0.2, tbl && tbl.rows[1].w);
  check('15の棒は 15/16 の長さ',
    tbl && Math.abs(wOf(tbl.rows[0].w) - 93.8) < 0.2, tbl && tbl.rows[0].w);
  check('どこから伸ばしているか書いてある',
    tbl && /0からの数/.test(tbl.caption), tbl && tbl.caption);
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));

  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/review-nums.png',
    fullPage: true });
  await b.close();

  console.log('verify53 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
