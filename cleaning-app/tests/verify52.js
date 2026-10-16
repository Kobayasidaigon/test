// 時間帯の切り替わりに少しだけ重なる人を、その時間帯の担当者にしないこと。
//
// 朝番 10:00-14:00 / 中番 14:00-19:00 / 遅番 19:00-23:00。
// 13:00-18:00 の人は朝番に1時間しか居ないのに、以前は朝番の担当者になり、
// その名前で朝番ぜんぶの記録が残っていた。
const { chromium } = require('playwright');
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });

(async () => {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  await put('staffRoster', JSON.stringify({
    笠寺: ['朝 ぜんぶ', '昼 また', '夜 ぜんぶ', '通し さん', '短い ひと'] }));
  // 朝ぜんぶ 10-14（朝番4h）/ 昼また 13-18（朝番1h・中番4h）
  // 夜ぜんぶ 19-23（遅番4h）/ 通しさん 10-23（全部）
  await put('shiftSchedule_笠寺', JSON.stringify({ [today]: [
    { n: '朝 ぜんぶ', s: '10:00', e: '14:00' },
    { n: '昼 また', s: '13:00', e: '18:00' },
    { n: '夜 ぜんぶ', s: '19:00', e: '23:00' },
    { n: '通し さん', s: '10:00', e: '23:00' },
  ] }));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.shiftStaffInWindow === 'function', { timeout: 15000 })
    .catch(() => {});
  // 画面の関数をそのまま呼んで確かめる
  const who = (from, to) => pg.evaluate(([f, t]) => {
    try {
      return shiftStaffInWindow('笠寺', f, t).map(x => x.n);
    } catch (e) { return ['ERR:' + e.message]; }
  }, [from, to]);

  const asa = await who('10:00', '14:00');
  check('朝番に「昼また」(1時間だけ)は入らない', asa.indexOf('昼 また') < 0, JSON.stringify(asa));
  check('朝番に「朝ぜんぶ」は入る', asa.indexOf('朝 ぜんぶ') >= 0, JSON.stringify(asa));
  check('朝番に「通しさん」は入る', asa.indexOf('通し さん') >= 0, JSON.stringify(asa));

  const hiru = await who('14:00', '19:00');
  check('中番に「昼また」(4時間)は入る', hiru.indexOf('昼 また') >= 0, JSON.stringify(hiru));
  check('中番に「朝ぜんぶ」は入らない', hiru.indexOf('朝 ぜんぶ') < 0, JSON.stringify(hiru));

  const ban = await who('19:00', '23:00');
  check('遅番に「夜ぜんぶ」は入る', ban.indexOf('夜 ぜんぶ') >= 0, JSON.stringify(ban));
  check('遅番に「昼また」は入らない', ban.indexOf('昼 また') < 0, JSON.stringify(ban));
  check('通しの人は3つとも入る',
    asa.indexOf('通し さん') >= 0 && hiru.indexOf('通し さん') >= 0 && ban.indexOf('通し さん') >= 0);

  // ちょうど2時間は入る
  await put('shiftSchedule_笠寺', JSON.stringify({ [today]: [
    { n: '朝 ぜんぶ', s: '12:00', e: '14:00' },   // 朝番にちょうど2時間
  ] }));
  await pg.reload();
  await pg.waitForTimeout(600);
  const just2 = await who('10:00', '14:00');
  check('ちょうど2時間の人は入る', just2.indexOf('朝 ぜんぶ') >= 0, JSON.stringify(just2));

  // 短い人しか居ない時間帯は、その人を返す（空にしない）
  await put('shiftSchedule_笠寺', JSON.stringify({ [today]: [
    { n: '短い ひと', s: '13:00', e: '14:00' },   // 朝番に1時間だけ、他に誰も居ない
    { n: '夜 ぜんぶ', s: '19:00', e: '23:00' },
  ] }));
  await pg.reload();
  await pg.waitForTimeout(600);
  const only = await who('10:00', '14:00');
  check('その時間帯に短い人しか居なければ、その人を担当者にする',
    only.length === 1 && only[0] === '短い ひと', JSON.stringify(only));

  // 誰も居ない時間帯は空
  const none = await who('02:00', '05:00');
  check('誰も居ない時間帯は空', none.length === 0, JSON.stringify(none));

  check('画面で例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));
  await b.close();
  console.log('verify52 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
