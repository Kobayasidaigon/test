// 上に共有する「見るだけ」のページ。
//
// 大事なのは2つ。
//   1. 管理者の合言葉を知らない人には中身が出ないこと
//   2. 出る中身に、渡してはいけないもの（担当者名など）が混ざっていないこと
const { chromium } = require('playwright');
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';          // runv.sh が ADMIN_PASS に入れている値
const errors = [];
function check(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (!cond) process.exitCode = 1;
}
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const login = (pw) => fetch(BASE + '/view/login', {
  method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: pw });

(async () => {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const d = n => new Date(Date.now() + (9 + n * 24) * 3600000).toISOString().slice(0, 10);

  // ---- 種（個人情報を含むものも、わざと入れておく）----
  await put('sdef_笠寺_customAreas', JSON.stringify([{ key: 'sauna_b1', name: 'サウナ男A' }]));
  await put('sdef_笠寺_customItems_sauna_b1', JSON.stringify([
    { id: 'bench', section: 'サウナ男A', title: 'ベンチの清掃' },
    { id: 'vent', section: 'サウナ男A', title: 'においの対応' }]));
  await put('sdef_笠寺_customSections_floor', JSON.stringify(['A 床・鏡まわり【月・木】']));
  await put('sdef_笠寺_itemEdits_floor', JSON.stringify({ sweep: { section: 'A 床・鏡まわり【月・木】' } }));
  // 記録（担当者名が鍵に入っている）
  await put('clean_笠寺_山田 花子_sauna_b1_' + today, JSON.stringify({ bench: true }));
  await put('clean_笠寺_鈴木 太郎_floor@routine_asa_' + d(-6), JSON.stringify({ sweep: true }));
  // 渡ってはいけないもの
  await put('staffRoster', JSON.stringify({ 笠寺: ['山田 花子', '鈴木 太郎'] }));
  await put('shiftSchedule_笠寺', JSON.stringify({ [today]: [{ n: '山田 花子', s: '09:00', e: '18:00' }] }));
  await put('rosterPinned', JSON.stringify({ 笠寺: ['店長 社員'] }));

  // ---- 合言葉なしでは中身が出ない ----
  const noAuth = await fetch(BASE + '/view/data');
  check('合言葉なしでは中身が出ない', noAuth.status === 401, String(noAuth.status));
  const bad = await login('ちがう合言葉');
  check('違う合言葉は断られる', bad.status === 401, String(bad.status));
  const empty = await login('');
  check('空の合言葉も断られる', empty.status === 401, String(empty.status));
  // ページ自体は開ける（中身は出ない。合言葉を聞く画面になる）
  const page = await fetch(BASE + '/view');
  check('ページ自体は開ける（中身は出ない）', page.ok, String(page.status));
  check('ページのHTMLに中身が埋まっていない',
        !(await page.text()).includes('山田'));

  // ---- 正しい合言葉 ----
  const ok = await login(PASS);
  check('正しい合言葉なら通る', ok.ok, String(ok.status));
  const cookie = (ok.headers.get('set-cookie') || '').split(';')[0];
  check('見るだけのクッキーが出る', /^vauth=[0-9a-f]{64}$/.test(cookie), cookie);
  check('クッキーは /view にしか効かない',
        /Path=\/view/.test(ok.headers.get('set-cookie') || ''));

  const r = await fetch(BASE + '/view/data', { headers: { Cookie: cookie } });
  check('クッキーがあれば中身が出る', r.ok, String(r.status));
  const body = await r.text();
  const data = JSON.parse(body);

  // ---- 本題：渡ってはいけないものが入っていないか ----
  check('担当者名が入っていない（山田 花子）', body.indexOf('山田') < 0);
  check('担当者名が入っていない（鈴木 太郎）', body.indexOf('鈴木') < 0);
  check('固定枠の社員名が入っていない', body.indexOf('店長') < 0);
  check('記録の生の鍵が入っていない', body.indexOf('clean_') < 0);
  check('名簿・シフト表が入っていない',
        body.indexOf('staffRoster') < 0 && body.indexOf('shiftSchedule') < 0);
  check('定義の鍵がそのまま入っていない', body.indexOf('sdef_') < 0);

  // ---- 中身が正しいか ----
  const kasa = data.stores.find(s => s.store === '笠寺');
  check('3店舗ぶん返る', data.stores.length === 3, String(data.stores.length));
  const sauna = kasa.areas.find(a => a.name === 'サウナ男A');
  check('追加エリアが出る', !!sauna);
  check('今日やったものに印が付く',
        sauna && sauna.groups[0].items.find(i => i.title === 'ベンチの清掃').done === true);
  check('やっていないものは印なし',
        sauna && sauna.groups[0].items.find(i => i.title === 'においの対応').done === false);
  check('件数が合う', sauna && sauna.done === 1 && sauna.total === 2,
        sauna && (sauna.done + '/' + sauna.total));
  const floor = kasa.areas.find(a => a.name === 'トレーニングフロア');
  const mt = floor && floor.groups.find(g => g.section.indexOf('月・木') >= 0);
  check('【月・木】の区分がそのまま出る', !!mt, mt && mt.section);
  check('前回やった日が入っている', !!(mt && mt.items[0].last), mt && mt.items[0].last);
  check('エリアごとに最後の記録日が入っている', kasa.areas.some(a => a.last));
  check('やることリストは出さない（二重に数えないため）',
        !kasa.areas.some(a => /朝番|中番|遅番/.test(a.name)),
        kasa.areas.map(a => a.name).join(','));

  // ---- 画面 ----
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1200 }, timezoneId: 'Asia/Tokyo' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // 合言葉を入れる前の取得と、わざと間違えた分は 401 が返る。設計どおりなので数えない。
  pg.on('console', m => {
    if (m.type() !== 'error') return;
    if (/401 \(Unauthorized\)/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });

  await pg.goto(BASE + '/view');
  await pg.waitForSelector('#login', { state: 'visible', timeout: 15000 });
  check('最初は合言葉を聞かれる', await pg.isVisible('#login'));
  check('中身は隠れている', !(await pg.isVisible('#content')));

  await pg.fill('#pw', 'ちがう');
  await pg.click('#go');
  await pg.waitForTimeout(400);
  check('違う合言葉だと知らせが出る', /合言葉が違います/.test(await pg.textContent('#ng')));
  check('中身はまだ隠れている', !(await pg.isVisible('#content')));

  await pg.fill('#pw', PASS);
  await pg.click('#go');
  await pg.waitForSelector('.store', { timeout: 15000 });
  const txt = await pg.textContent('body');
  check('合言葉が合うと中身が出る', (await pg.$$('.store')).length === 3);
  check('「見るだけ」と書いてある', /見るだけ/.test(txt));
  check('途中経過だと断ってある', /途中経過/.test(txt));
  check('画面にも担当者名は出ない', txt.indexOf('山田') < 0 && txt.indexOf('店長') < 0);
  check('チェックを付ける部品が無い', (await pg.$$('input[type=checkbox]')).length === 0);
  await pg.click('.area > button');
  await pg.waitForTimeout(200);
  check('エリアを開くと中身が見える', (await pg.$$('.area.open .it')).length > 0);
  check('使われていない設備は1行にたたんである', /しばらく記録がない設備/.test(txt));
  check('たたんである中身は最初は見えない',
        await pg.evaluate(() => {
          const b = document.querySelector('.idle-body');
          return !b || getComputedStyle(b).display === 'none';
        }));
  const idleBtn = await pg.$('[data-idle]');
  if (idleBtn) {
    await idleBtn.click(); await pg.waitForTimeout(150);
    check('押すと開く',
          await pg.evaluate(() => getComputedStyle(document.querySelector('.idle-body')).display === 'block'));
  }
  const liveCnt = await pg.textContent('.store h2 .n');
  check('店舗の合計は「使っている所」だけで出す（分母が膨らまない）',
        parseInt(liveCnt.split('/')[1].trim(), 10) < 100, liveCnt);
  await pg.screenshot({ path: (process.env.OUT || '.') + '/view.png' });
  await browser.close();
  check('画面のエラーなし', errors.length === 0, errors.join(' | '));
})().catch(e => { console.error(e); process.exit(1); });
