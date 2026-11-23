// やることリストの1行に区分（pri）を書けるようにする（2026-11-23）
//  ・萩野通 中番「ラウンジ・入口・階段の清掃」を「必須」に入れる（pri:'must' と並びの移動）
//  ・pri の行は並べ替え（空いている順）に入らない／pri の無い行と他の店舗は今までどおり
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const S = '萩野通', STAFF = '試験 太郎';
const SEC = 'やることリスト（上から順に）';
const R = (id, title, link, x) => Object.assign({ id, section: SEC, title, desc: '', link }, x || {});
const BEFORE = [
  R('routine_hiru_v3_01', 'サウナ電源チェック', ''),
  R('routine_hiru_v3_02', '引継ぎ事項・レッスン確認', ''),
  R('routine_hiru_saunamat', 'サウナ オレンジマット適宜確認', 'saunamat'),
  R('routine_hiru_v3_07', 'シャワー清掃', 'shower'),
  R('routine_hiru_v3_11', 'シャンプー類・ハンドソープ補充', ''),
  R('routine_hiru_v3_06', '水素水サーバー本体の拭き上げ', 'hydrogen'),
  R('routine_hiru_floor_machine', 'フロア・マシン清掃', 'floor,machine'),
  R('routine_hiru_v3_05', 'ラウンジ・入口・階段の清掃', 'entrance', { desc: '受付机・椅子・フロアベンチの拭き上げも' }),
  R('routine_hiru_studio', 'スタジオの清掃（床・鏡・備品の片付け）', 'studio'),
  R('routine_hiru_v3_03', '茶色タオル交換', ''),
];
// 本番の段取りと同じ：pri を付けて、シャンプー類の下（必須の最後）へ動かす
function apply(rows) {
  const out = rows.filter(r => r.id !== 'routine_hiru_v3_05');
  const row = Object.assign({}, rows.find(r => r.id === 'routine_hiru_v3_05'), { pri: 'must' });
  const at = out.findIndex(r => r.id === 'routine_hiru_v3_11') + 1;
  out.splice(at, 0, row);
  return out;
}
(async () => {
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  const heads = () => pg.evaluate(() => {
    dateInput.value = todayStr(); currentArea = 'routine_hiru'; routineEditMode = false; render();
    const out = []; let cur = null;
    document.querySelectorAll('#checklist .pri-head, #checklist .rt-row').forEach(el => {
      if (el.classList.contains('pri-head')) cur = el.childNodes[0].textContent;
      else out.push(cur + '｜' + el.querySelector('.rt-title').textContent);
    });
    return out;
  });
  const open = async () => {
    await pg.goto(BASE + '/');
    await pg.evaluate(({ S, STAFF }) => {
      localStorage.setItem('currentStore', S); localStorage.setItem('storeAuthed_' + S, '1');
      localStorage.setItem('currentStaff', STAFF); localStorage.setItem('currentArea', 'routine_hiru');
    }, { S, STAFF });
    await pg.goto(BASE + '/');
    await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
    await pg.waitForTimeout(1200);
  };
  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify(BEFORE));
  await open();
  const before = await heads();
  console.log('前:\n  ' + before.join('\n  '));
  check('前はラウンジが日替わり', before.indexOf('日替わり｜ラウンジ・入口・階段の清掃') >= 0);
  await pg.screenshot({ path: process.env.SHOT_DIR + '/before.png', fullPage: true });

  await put('sdef_' + S + '_customItems_routine_hiru', JSON.stringify(apply(BEFORE)));
  await open();
  const after = await heads();
  console.log('後:\n  ' + after.join('\n  '));
  check('後はラウンジが必須', after.indexOf('必須｜ラウンジ・入口・階段の清掃') >= 0);
  check('必須はシャワー・シャンプーの次にラウンジ', after.join(',').indexOf('必須｜シャンプー類・ハンドソープ補充,必須｜ラウンジ・入口・階段の清掃,日替わり｜') >= 0);
  check('必須の見出しは1つだけ', (await pg.$$eval('#checklist .pri-must', x => x.length)) === 1);
  check('水素水・フロアは日替わりのまま', after.indexOf('日替わり｜水素水サーバー本体の拭き上げ') >= 0 && after.indexOf('日替わり｜フロア・マシン清掃') >= 0);
  const rot = await pg.evaluate(() => ({ lounge: isRotateRow({ link: 'entrance', pri: 'must' }), plain: isRotateRow({ link: 'entrance' }) }));
  check('pri:must の行は並べ替えに入らない／無い行は今までどおり', !rot.lounge && rot.plain, JSON.stringify(rot));
  await pg.screenshot({ path: process.env.SHOT_DIR + '/after.png', fullPage: true });
  check('画面のエラーなし', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
