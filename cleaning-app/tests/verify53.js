// 本数・個数の記録（ゴルフのクラブなど）を管理者ページに出すこと。
//
// 見たいのは「在庫の動き」なので、いまの数だけでなく
//   ・前回との差
//   ・変わった日とその差
//   ・記録のない日は点を置かない（横は日付のへだたりで置く）
//   ・見ている日より後ろの記録は読まない
// が合っていること。
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

const D = '2026-10-19';          // 見る日
const row = (o, area, title, label) => (o.nums || []).find(
  r => r.area === area && r.title === title && (label === undefined || r.label === label));

(async () => {
  // 本番と同じ形: ゴルフA/B に「レンタルクラブ（男性・女性）」「ボール（個数）」
  await put('sdef_笠寺_customAreas', JSON.stringify([
    { key: 'golf_a', name: 'ゴルフA' },
    { key: 'golf_b', name: 'ゴルフB' },
  ]));
  await put('sdef_笠寺_customItems_golf_a', JSON.stringify([
    { id: 'ga_clubs', section: '備品', title: 'レンタルクラブの本数',
      nums: [{ id: 'm', label: '男性' }, { id: 'w', label: '女性' }] },
    { id: 'ga_balls', section: '備品', title: 'ボールの個数',
      nums: [{ id: 'n', label: '個数' }], numLow: 200, numOut: 100 },
  ]));
  await put('sdef_笠寺_customItems_golf_b', JSON.stringify([
    { id: 'gb_clubs', section: '備品', title: 'レンタルクラブの本数',
      nums: [{ id: 'm', label: '男性' }] },
  ]));

  // 男性: 16 → 16 → 14（13日に2本減）→ 15（19日に1本増）。17日は記録なし
  await put('nums_笠寺_2026-10-10', JSON.stringify({ ga_clubs: { m: '16', w: '9' } }));
  await put('nums_笠寺_2026-10-12', JSON.stringify({ ga_clubs: { m: '16', w: '9' } }));
  await put('nums_笠寺_2026-10-13', JSON.stringify({ ga_clubs: { m: '14', w: '9' } }));
  await put('nums_笠寺_2026-10-19', JSON.stringify({
    ga_clubs: { m: '15', w: '9' }, ga_balls: { n: '80' } }));
  // 見ている日より後ろ（読まないこと）
  await put('nums_笠寺_2026-10-20', JSON.stringify({ ga_clubs: { m: '99', w: '99' } }));
  // 値が空・数でないもの（点にしないこと）
  await put('nums_笠寺_2026-10-14', JSON.stringify({
    ga_clubs: { m: '', w: 'あとで' }, gb_clubs: { m: '7' } }));

  const r = await fetch(BASE + '/view/login', {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const o = JSON.parse(await (await fetch(BASE + '/view/data?d=' + D,
    { headers: { Cookie: cookie } })).text());
  const kasa = (o.stores || []).find(s => s.store === '笠寺') || {};
  const m = row(kasa, 'ゴルフA', 'レンタルクラブの本数', '男性');
  const w = row(kasa, 'ゴルフA', 'レンタルクラブの本数', '女性');
  const ball = row(kasa, 'ゴルフA', 'ボールの個数', '個数');
  const gb = row(kasa, 'ゴルフB', 'レンタルクラブの本数', '男性');

  check('ゴルフAの男性の行が出る', !!m);
  check('ゴルフAの女性の行が出る', !!w);
  check('ゴルフBの行も出る', !!gb);
  check('欄のラベルが付く', m && m.label === '男性', m && m.label);
  check('項目名が付く', m && m.title === 'レンタルクラブの本数', m && m.title);
  check('場所の名前が付く', m && m.area === 'ゴルフA', m && m.area);

  check('いまの数は 15', m && m.last === 15, m && m.last);
  check('いまの数の日付は 10-19', m && m.lastDate === '2026-10-19', m && m.lastDate);
  check('前回は 14（10-13）', m && m.prev === 14 && m.prevDate === '2026-10-13',
    m && (m.prev + '/' + m.prevDate));
  check('前回との差は +1', m && m.diff === 1, m && m.diff);
  check('記録のある日数は 4日', m && m.n === 4, m && m.n);
  check('はじめの日は 10-10', m && m.from === '2026-10-10', m && m.from);
  check('いちばん少ない日は 14', m && m.min === 14, m && m.min);
  check('いちばん多い日は 16', m && m.max === 16, m && m.max);

  check('見ている日より後ろを読まない', m && m.last !== 99, m && m.last);
  check('後ろの日が最大に混ざらない', m && m.max === 16, m && m.max);

  const mv = (m && m.moves) || [];
  check('変わった日は2件', mv.length === 2, mv.length);
  check('新しい順に並ぶ', mv[0] && mv[0].d === '2026-10-19', mv[0] && mv[0].d);
  check('10-19 は 14→15 で +1', mv[0] && mv[0].from === 14 && mv[0].to === 15
    && mv[0].diff === 1, mv[0] && JSON.stringify(mv[0]));
  check('10-13 は 16→14 で -2', mv[1] && mv[1].from === 16 && mv[1].to === 14
    && mv[1].diff === -2, mv[1] && JSON.stringify(mv[1]));
  check('変わらなかった日（10-12）は入らない',
    !mv.some(x => x.d === '2026-10-12'), JSON.stringify(mv.map(x => x.d)));

  check('ずっと同じ値の行は 変わった日が0件', w && (w.moves || []).length === 0,
    w && JSON.stringify(w.moves));
  check('ずっと同じ値でも 最小＝最大', w && w.min === 9 && w.max === 9,
    w && (w.min + '/' + w.max));
  check('ずっと同じなら差は 0', w && w.diff === 0, w && w.diff);

  check('空の値は点にしない', gb && gb.n === 1, gb && gb.n);
  check('1日ぶんだけなら差は null', gb && gb.diff === null, gb && gb.diff);
  check('数でない値は点にしない（女性は10-14を数えない）',
    w && w.n === 4, w && w.n);

  check('下限・交換のめやすが付く', ball && ball.low === 200 && ball.outAt === 100,
    ball && (ball.low + '/' + ball.outAt));

  const other = (o.stores || []).find(s => s.store === '萩野通') || {};
  check('設定していない店舗には行が出ない', (other.nums || []).length === 0,
    (other.nums || []).length);

  // ---- 画面 ----
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/view');
  await pg.fill('#pw', PASS);
  await pg.click('#go');
  await pg.waitForSelector('.nrow', { timeout: 15000 });
  // 画面は URL の ?d= を見ない（日付の欄で動く）。見たい日に合わせてから確かめる。
  await pg.fill('#day', D);
  await pg.dispatchEvent('#day', 'change');
  await pg.waitForFunction(d => {
    const e = document.getElementById('day');
    return e && e.value === d && !!document.querySelector('.nrow');
  }, D, { timeout: 15000 });
  await pg.waitForFunction(() => {
    const t = document.getElementById('main').textContent || '';
    return t.indexOf('10/10〜10/19') >= 0;
  }, null, { timeout: 15000 });
  const txt = await pg.textContent('#main');

  check('見出しが出る', /本数・個数の記録/.test(txt));
  check('いまの数が画面に出る', /レンタルクラブの本数／男性/.test(txt));
  check('差が矢印付きで出る（色だけに頼らない）', /▲\+1/.test(txt), txt.indexOf('▲+1'));
  check('減った日が▼で出る', /▼-2/.test(txt));
  check('いつからいつまでが出る', /10\/10〜10\/19・4日ぶん/.test(txt));
  check('1日ぶんだけの行はそう言う', /10\/19 の1日ぶんだけ/.test(txt));
  check('最小〜最大が出る', /14〜16/.test(txt));
  check('変わった日の表が出せる', /変わった日 2件/.test(txt));
  check('交換のめやす割れが出る', /交換のめやすを下回/.test(txt));

  const sp = await pg.$$('svg.spark');
  // 点が2つ以上あるのは ゴルフAの男性・女性の2行だけ（残りは1日ぶん）
  check('折れ線が描かれる', sp.length === 2, sp.length);
  const none = (await pg.$$('.sp-none')).length;
  check('1日ぶんだけの行は線を描かず断る', none === 2, none);
  // 並びは 場所→項目→欄 なので、先頭は「女性」の行（平らな線）。
  // 確かめたいのは動きのある「男性」の行なので、そこを名指しで取る。
  const pickSpark = async label => {
    const i = await pg.$$eval('.nrow', (rows, lb) => {
      for (let k = 0; k < rows.length; k++) {
        const t = rows[k].querySelector('.nttl');
        if (t && t.textContent.indexOf(lb) >= 0 && rows[k].querySelector('svg.spark')) return k;
      }
      return -1;
    }, label);
    return i;
  };
  const iM = await pickSpark('レンタルクラブの本数／男性');
  check('男性の行に折れ線がある', iM >= 0, iM);
  const flat = await pg.$eval('.nrow svg.spark', e => ({
    hits: e.querySelectorAll('rect[fill="transparent"]').length,
    label: e.getAttribute('aria-label') || '',
  }));
  check('平らな行の触れる点は はじめとおわりの2つ', flat.hits === 2,
    flat.hits + ' / ' + flat.label);
  const one = await pg.$eval('.nrow:has(.nttl:text-matches("男性")) svg.spark', e => ({
    paths: e.querySelectorAll('path').length,
    dots: e.querySelectorAll('circle[r="4"]').length,
    hits: e.querySelectorAll('rect[fill="transparent"]').length,
    label: e.getAttribute('aria-label') || '',
    w: e.getAttribute('width'),
  }));
  check('線は2本（控えめな全体＋直近）', one.paths === 2, one.paths);
  check('終点に点が1つ', one.dots === 1, one.dots);
  check('動きのある行の触れる点は 動いた日2＋はじめ＝3つ', one.hits === 3, one.hits + ' / ' + one.label);
  check('絵に読み上げ用の説明が付く', /の推移/.test(one.label), one.label);
  check('凡例は置かない（1本だけなので）', !/凡例/.test(txt));

  // 横は日付のへだたりで置く（10-13 と 10-19 の間が空くこと）
  const xs = await pg.$eval('svg.spark path', e => {
    return (e.getAttribute('d') || '').match(/-?\d+(\.\d+)?,/g).map(s => parseFloat(s));
  });
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  // 点は 10-10 / 10-12 / 10-13 / 10-19。間は 2日・1日・6日ぶん
  const g = JSON.stringify(gaps.map(x => Math.round(x)));
  check('間は3つ', gaps.length === 3, g);
  check('6日あいた所がいちばん広い',
    gaps[2] > gaps[0] && gaps[2] > gaps[1], g);
  check('6日あいた所は1日ぶんの約6倍',
    Math.abs(gaps[2] / gaps[1] - 6) < 0.2, g + ' 比=' + (gaps[2] / gaps[1]).toFixed(2));
  check('2日あいた所は1日ぶんの約2倍',
    Math.abs(gaps[0] / gaps[1] - 2) < 0.2, g);
  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));

  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/view-nums.png',
    fullPage: true });
  await b.close();

  console.log('verify53 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
