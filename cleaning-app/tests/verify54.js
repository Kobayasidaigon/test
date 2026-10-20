// 分担（その時間帯を何人かで分ける）。
//
// ・決めてある店舗・時間帯だけ、選ぶ画面が出ること
// ・選ぶと自分のぶんだけに絞られ、連動項目は自分のエリアだけになること
// ・名前を選ぶと、その人の名前で記録が残ること（シフトの連名で上書きされない）
// ・どの分担にも入っていない行を取りこぼさないこと
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

const S = '枇杷島';
const room = (n, pre) => JSON.stringify(
  Array.from({ length: n }, (_, i) => ({ id: pre + (i + 1), section: '清掃', title: pre + (i + 1) })));

(async () => {
  await put('sdef_' + S + '_customAreas', JSON.stringify([
    { key: 'sauna_b1', name: 'サウナ男A', hidden: true },
    { key: 'sauna_b4', name: 'サウナ女A', hidden: true },
    { key: 'toilet_m', name: '男性トイレ' },
    { key: 'toilet_w', name: '女性トイレ' },
    { key: 'golf_a', name: 'ゴルフA' },
    { key: 'floor', name: 'フロア' },
  ]));
  await put('sdef_' + S + '_customItems_sauna_b1', room(11, 'ma'));
  await put('sdef_' + S + '_customItems_sauna_b4', room(11, 'wa'));
  await put('sdef_' + S + '_customItems_toilet_m', room(9, 'tm'));
  await put('sdef_' + S + '_customItems_toilet_w', room(10, 'tw'));
  await put('sdef_' + S + '_customItems_golf_a', room(22, 'g'));
  await put('sdef_' + S + '_customItems_floor', room(3, 'f'));

  await put('sdef_' + S + '_customItems_routine_asa', JSON.stringify([
    { id: 'a_power', section: 'やること', title: 'サウナ電源・開錠' },
    { id: 'a_sauna', section: 'やること', title: 'サウナ清掃', link: 'sauna_b1,sauna_b4' },
    { id: 'a_toilet', section: 'やること', title: 'トイレ清掃', link: 'toilet_m,toilet_w' },
    { id: 'a_golf', section: 'やること', title: 'ゴルフブースA清掃', link: 'golf_a' },
    { id: 'a_floor', section: 'やること', title: 'フロアのモップがけ', link: 'floor' },
    { id: 'a_towel', section: 'やること', title: '茶色タオル交換' },
    { id: 'a_orphan', section: 'やること', title: 'どの分担にも入れていない行' },
  ]));
  await put('sdef_' + S + '_shares_routine_asa', JSON.stringify([
    { id: 'm', name: '男性側', areas: ['sauna_b1', 'toilet_m'], items: ['a_power'] },
    { id: 'w', name: '女性側', areas: ['sauna_b4', 'toilet_w'], items: ['a_towel'] },
    { id: 'x', name: '共用・ゴルフ', areas: ['golf_a', 'floor'], items: [] },
  ]));
  // 中番には分担を入れない（入れていない時間帯はそのまま出ること）
  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify([
    { id: 'h1', section: 'やること', title: '引継ぎ' },
    { id: 'h2', section: 'やること', title: '紙コップ補充' },
  ]));

  const D = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  await put('shiftSchedule_' + S, JSON.stringify({
    [D]: [{ n: '相田 一郎', s: '10:00', e: '19:00' },
          { n: '石川 二郎', s: '10:00', e: '19:00' },
          { n: '上田 三郎', s: '10:00', e: '19:00' }],
  }));
  await put('staffRoster', JSON.stringify({ [S]: ['相田 一郎', '石川 二郎', '上田 三郎'] }));

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
  await pg.waitForFunction(() => typeof window.render === 'function'
    || document.querySelectorAll('.tab, .rt-row').length > 0, null, { timeout: 20000 });
  // 朝番を開く
  await pg.evaluate(() => {
    currentArea = 'routine_asa';
    localStorage.setItem('currentArea', 'routine_asa');
    render();
  });
  await pg.waitForSelector('.sh-panel', { timeout: 15000 });

  // ---- 選ぶ画面 ----
  const panel = await pg.textContent('.sh-panel');
  check('選ぶ画面が出る', /今日はどこを担当しますか/.test(panel));
  check('シフトの3人が名前に出る',
    /相田 一郎/.test(panel) && /石川 二郎/.test(panel) && /上田 三郎/.test(panel));
  const picks = await pg.$$eval('.sh-pick', bs => bs.map(x => x.textContent));
  check('分担が3つ＋ぜんぶ見る', picks.length === 4, JSON.stringify(picks));
  check('男性側の行数が出る', /男性側/.test(picks[0]) && /3行/.test(picks[0]), picks[0]);
  check('ぜんぶ見るは全行', /7行/.test(picks[3]), picks[3]);
  check('取りこぼしを知らせる', /どの分担にも入っていない行が 1件/.test(panel), panel.slice(-60));

  // 選ぶ前は全部出ている
  const before = await pg.$$eval('.rt-row', rs => rs.length);
  check('選ぶ前は全部出ている', before === 7, before);

  // ---- 名前と分担を選ぶ ----
  await pg.click('[data-sh-name="石川 二郎"]');
  await pg.waitForSelector('.sh-panel', { timeout: 15000 });
  const on = await pg.$$eval('.sh-name.on', bs => bs.map(x => x.textContent));
  check('選んだ名前に印が付く', on.length === 1 && /石川 二郎/.test(on[0]), JSON.stringify(on));
  const staff1 = await pg.evaluate(() => currentStaff);
  check('担当者がその人になる', staff1 === '石川 二郎', staff1);

  await pg.click('[data-sh-id="m"]');
  await pg.waitForSelector('.sh-bar', { timeout: 15000 });
  const bar = await pg.textContent('.sh-bar');
  check('選んだあとは1行に畳まれる', /男性側/.test(bar), bar);
  check('畳んだ行に自分の名前が出る', /石川 二郎/.test(bar), bar);

  const rows = await pg.$$eval('.rt-row', rs => rs.map(r => ({
    t: r.querySelector('.rt-title').textContent,
    c: (r.querySelector('.rt-count') || {}).textContent || '',
  })));
  check('男性側の3行だけになる', rows.length === 3, JSON.stringify(rows.map(r => r.t)));
  check('サウナ清掃が残る', rows.some(r => r.t === 'サウナ清掃'));
  check('トイレ清掃が残る', rows.some(r => r.t === 'トイレ清掃'));
  check('サウナ電源が残る', rows.some(r => r.t === 'サウナ電源・開錠'));
  check('女性側の行は出ない', !rows.some(r => r.t === '茶色タオル交換'));
  check('共用の行は出ない', !rows.some(r => r.t === 'ゴルフブースA清掃'));

  // 連動項目は自分のエリアだけ: サウナは男A(11)のみ、トイレは男(9)のみ
  const sauna = rows.find(r => r.t === 'サウナ清掃');
  const toilet = rows.find(r => r.t === 'トイレ清掃');
  check('サウナ清掃は男Aの11項目だけ', sauna && /0\/11/.test(sauna.c), sauna && sauna.c);
  check('トイレ清掃は男性の9項目だけ', toilet && /0\/9/.test(toilet.c), toilet && toilet.c);

  // ---- シフトの連名で上書きされない ----
  const staff2 = await pg.evaluate(() => {
    autoSelectShiftStaff();
    applyShiftStaffForArea();
    return currentStaff;
  });
  check('シフトの連名で上書きされない', staff2 === '石川 二郎', staff2);

  // ---- 選び直せる ----
  await pg.click('.sh-change');
  await pg.waitForSelector('.sh-panel', { timeout: 15000 });
  const back = await pg.$$eval('.rt-row', rs => rs.length);
  check('選び直すと全部に戻る', back === 7, back);
  await pg.click('[data-sh-id="_all"]');
  await pg.waitForSelector('.sh-bar', { timeout: 15000 });
  const allRows = await pg.$$eval('.rt-row', rs => rs.length);
  check('ぜんぶ見るは全行出る', allRows === 7, allRows);
  const allBar = await pg.textContent('.sh-bar');
  check('ぜんぶ見ると分かる', /ぜんぶ/.test(allBar), allBar);

  // ---- 分担を入れていない時間帯 ----
  await pg.evaluate(() => { currentArea = 'routine_hiru'; render(); });
  await pg.waitForSelector('.rt-row', { timeout: 15000 });
  const hiruPanel = await pg.$$('.sh-panel');
  const hiruBar = await pg.$$('.sh-bar');
  check('入れていない時間帯には選ぶ画面を出さない',
    hiruPanel.length === 0 && hiruBar.length === 0,
    hiruPanel.length + '/' + hiruBar.length);
  const hiruRows = await pg.$$eval('.rt-row', rs => rs.length);
  check('入れていない時間帯はそのまま全部出る', hiruRows === 2, hiruRows);

  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.evaluate(() => { currentArea = 'routine_asa'; shareSet('routine_asa', 'm'); render(); });
  await pg.waitForSelector('.sh-bar', { timeout: 15000 });
  await pg.screenshot({ path: (process.env.OUT || 'tests/out') + '/share.png', fullPage: true });
  await b.close();

  console.log('verify54 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
