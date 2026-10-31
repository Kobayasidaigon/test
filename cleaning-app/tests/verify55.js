// 追加してから1週間の項目に「新」の印。
//
// ・addedAt（追加した日）が今日〜6日前なら出る、7日以上前なら出ない
// ・addedAt が無くても、画面で足した項目（id が 'c' + 時刻）は id から読む
// ・どちらも無い項目（もとからある項目）には出ない
// ・エリアのカードでは「追加」の代わりに「新」が出る
// ・「項目を編集」中は出さない
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
const now = Date.now();

(async () => {
  await put('sdef_' + S + '_customAreas', JSON.stringify([
    { key: 'routine_ban', name: '遅番' },
    { key: 'toilet_m', name: '男性トイレ' },
  ]));
  await put('sdef_' + S + '_customItems_routine_ban', JSON.stringify([
    { id: 'old_item', section: 'やること', title: 'もとからある' },
    { id: 'ban_today', section: 'やること', title: '今日足した', addedAt: ymd(now) },
    { id: 'ban_6', section: 'やること', title: '6日前に足した', addedAt: ymd(now - 6 * DAY) },
    { id: 'ban_7', section: 'やること', title: '7日前に足した', addedAt: ymd(now - 7 * DAY) },
    { id: 'c' + (now - 2 * DAY) + '123', section: 'やること', title: '画面で2日前に足した' },
    { id: 'c' + (now - 9 * DAY) + '45', section: 'やること', title: '画面で9日前に足した' },
  ]));
  await put('sdef_' + S + '_customItems_toilet_m', JSON.stringify([
    { id: 'tm_old', section: '清掃', title: 'トイレもとから' },
    { id: 'tm_new', section: '清掃', title: 'トイレ新しい', addedAt: ymd(now - DAY) },
  ]));

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
  await pg.evaluate(() => { currentArea = 'routine_ban'; localStorage.setItem('currentArea', 'routine_ban'); render(); });
  await pg.waitForSelector('.rt-row', { timeout: 15000 });

  const rows = await pg.$$eval('.rt-row', rs => rs.map(r => ({
    t: r.querySelector('.rt-title').textContent, n: !!r.querySelector('.new-tag') })));
  const tagged = rows.filter(r => r.n).map(r => r.t);
  check('今日足した項目に出る', tagged.includes('今日足した'), JSON.stringify(tagged));
  check('6日前に足した項目に出る', tagged.includes('6日前に足した'));
  check('7日前に足した項目には出ない', !tagged.includes('7日前に足した'));
  check('画面で2日前に足した項目に出る（idから読む）', tagged.includes('画面で2日前に足した'));
  check('画面で9日前に足した項目には出ない', !tagged.includes('画面で9日前に足した'));
  check('もとからある項目には出ない', !tagged.includes('もとからある'));
  check('印は3つだけ', tagged.length === 3, tagged.length);
  const framed = await pg.$$eval('.rt-row.rt-new .rt-title', xs => xs.map(x => x.textContent));
  check('枠で囲むのも同じ3行', JSON.stringify(framed) === JSON.stringify(tagged), JSON.stringify(framed));

  await pg.evaluate(() => { routineEditMode = true; render(); });
  const inEdit = await pg.$$eval('.rt-row .new-tag', x => x.length);
  check('項目を編集中は出さない', inEdit === 0, inEdit);
  await pg.evaluate(() => { routineEditMode = false; currentArea = 'toilet_m'; render(); });
  await pg.waitForSelector('.item .item-title', { timeout: 15000 });
  const cards = await pg.$$eval('.item .item-title', xs => xs.map(x => x.textContent));
  const nw = cards.find(t => /トイレ新しい/.test(t)) || '';
  const od = cards.find(t => /トイレもとから/.test(t)) || '';
  check('カード: 新しい項目は「新」で「追加」は出ない', /新/.test(nw) && !/追加/.test(nw), nw);
  const framedCards = await pg.$$eval('.item.item-new .item-title', xs => xs.map(x => x.textContent));
  check('カード: 新しい項目だけ枠で囲む', framedCards.length === 1 && /トイレ新しい/.test(framedCards[0]), JSON.stringify(framedCards));
  check('カード: もとからの項目に「新」は出ない', !/新/.test(od.replace('トイレもとから', '')), od);

  // 画面から足すと、追加した日が入る
  const added = await pg.evaluate(() => {
    openAddDialog('清掃');
    document.getElementById('addTitle').value = 'いま足した';
    document.getElementById('addSave').click();
    const ci = loadCustomItems('toilet_m').find(x => x.title === 'いま足した');
    return ci ? ci.addedAt : null;
  });
  check('画面から足すと追加した日が入る', added === ymd(Date.now()), added);

  check('画面のエラーなし', errs.length === 0, errs.join(' / '));
  await b.close();
  console.log(`\n${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
