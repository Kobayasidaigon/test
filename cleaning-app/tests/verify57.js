// 端末の保存容量が一杯でも、チェックが付き・見え・残る（2026-11-15 枇杷島の iPhone）。
//
// 本番のデータは端末換算で 9.5MB、起動時に端末へ入れようとする量が 8.6MB あり、
// iPhone の Safari（5MB ほど）では必ずあふれていた。あふれると
//   ・付けたチェックが端末に入らず、画面に出ない（＝チェックできない）
//   ・他の端末の変更の取り込みが例外で止まる
// ここでは Safari と同じく 250万文字（5MB）で setItem が失敗する端末をまねて、
// 3店舗×60日ぶんの記録（約400万文字）をサーバーに置いて確かめる。
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const getS = k => fetch(BASE + '/api/state/' + encodeURIComponent(k)).then(r => r.text());

const S = '枇杷島';
const STAFF = '試験 太郎';
const DAY = 86400000;
const ymd = t => { const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const TODAY = ymd(Date.now());
const QUOTA = 2500000;   // 文字数（UTF-16 で 5MB）

(async () => {
  // 3店舗 × 59日 × 16鍵 × 約1500文字 ≒ 420万文字
  const jobs = [];
  const filler = 'x'.repeat(60);
  for (const st of ['笠寺', '枇杷島', '萩野通']) {
    for (let d = 1; d < (+process.env.DAYS || 60); d++) {
      const date = ymd(Date.now() - d * DAY);
      for (let a = 0; a < (+process.env.AREAS || 16); a++) {
        const rec = {};
        for (let i = 0; i < 18; i++) rec['it' + i] = { staff: '過去の人', time: '10:00', ts: date + ' 10:00', note: filler };
        jobs.push(['clean_' + st + '_過去の人_area' + a + '_' + date, JSON.stringify(rec)]);
      }
    }
  }
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  for (let i = 0; i < jobs.length; i += 50) await Promise.all(jobs.slice(i, i + 50).map(j => put(j[0], j[1])));
  const total = jobs.reduce((n, j) => n + j[0].length + j[1].length, 0);
  console.log('サーバーに置いた記録: ' + jobs.length + '件 / ' + total + '文字');

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const ctx = await b.newContext();
  // Safari と同じく、合計が QUOTA 文字を超える setItem は QuotaExceededError
  await ctx.addInitScript(q => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      let n = 0;
      for (let i = 0; i < this.length; i++) { const kk = this.key(i); if (kk !== k) n += kk.length + (this.getItem(kk) || '').length; }
      if (n + String(k).length + String(v).length > q) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return orig.call(this, k, v);
    };
  }, QUOTA);
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.evaluate(({ S, STAFF, TODAY }) => {
    localStorage.setItem('currentStore', S);
    localStorage.setItem('storeAuthed_' + S, '1');
    localStorage.setItem('currentStaff', STAFF);
    localStorage.setItem('currentStaffDay', TODAY);
  }, { S, STAFF, TODAY });
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
  await pg.waitForTimeout(1500);

  const diskChars = () => pg.evaluate(() => {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + localStorage.getItem(k).length; }
    return n;
  });
  const bar = () => pg.$eval('#storageBar', e => e.style.display === 'none' ? '' : e.textContent).catch(() => '');
  console.log('端末に入った量: ' + await diskChars() + '文字');
  check('起動直後に「保存容量が一杯」を出さない', (await bar()) === '', await bar());

  // チェックを付ける（シャワールームの床）
  await pg.evaluate(() => { currentStaff = staffSelect.value || currentStaff; currentArea = 'shower'; render(); });
  const staffNow = await pg.evaluate(() => currentStaff);
  check('担当者が選ばれている', staffNow === STAFF, staffNow);
  await pg.evaluate(() => toggleItemIn('shower', 'floor'));
  await pg.waitForTimeout(800);
  const key = 'clean_' + S + '_' + STAFF + '_shower_' + TODAY;
  const st = await pg.evaluate(k => {
    const L = typeof LS !== 'undefined' ? LS : localStorage;
    let rec = {}; try { rec = JSON.parse(L.getItem(k)) || {}; } catch (e) {}
    return { has: !!rec.floor, onDisk: localStorage.getItem(k) !== null, done: areaCompletionToday('shower').done };
  }, key);
  check('付けたチェックが記録に入る', st.has, JSON.stringify(st));
  check('今日のチェックは端末にも入る（圏外でも消えない）', st.onDisk, JSON.stringify(st));
  check('画面の済み数に出る', st.done >= 1, st.done);
  const sv = await getS(key);
  check('サーバーにも届く', /floor/.test(sv), sv.slice(0, 60));
  check('チェック後も「一杯」を出さない', (await bar()) === '', await bar());

  // 端末をほぼ満杯にしてから、さらに付ける
  await pg.evaluate(q => {
    let i = 0;
    try { while (i < 1000) { localStorage.setItem('junk_' + i, 'j'.repeat(20000)); i++; } } catch (e) {}
  }, QUOTA);
  await pg.evaluate(() => toggleItemIn('shower', 'drain'));
  await pg.waitForTimeout(800);
  const st2 = await pg.evaluate(k => {
    const L = typeof LS !== 'undefined' ? LS : localStorage;
    let rec = {}; try { rec = JSON.parse(L.getItem(k)) || {}; } catch (e) {}
    return { floor: !!rec.floor, drain: !!rec.drain, onDisk: localStorage.getItem(k) !== null };
  }, key);
  check('満杯の端末でも2つ目のチェックが付く', st2.floor && st2.drain, JSON.stringify(st2));
  check('満杯でも古い控えをどけて、今日のぶんは端末に入る', st2.onDisk, JSON.stringify(st2));
  check('サーバーにも2つとも届く', /drain/.test(await getS(key)));

  // 他の端末の変更が取り込まれる（前は取り込みの途中で例外になり止まっていた）
  const other = 'clean_' + S + '_別の人_toilet_' + TODAY;
  await put(other, JSON.stringify({ t1: { staff: '別の人', time: '13:00', ts: TODAY + ' 13:00' } }));
  await pg.evaluate(() => pullChanges(true, false));
  const got = await pg.evaluate(k => (typeof LS !== 'undefined' ? LS : localStorage).getItem(k), other);
  check('他の端末の変更を取り込める', /別の人/.test(got || ''), got);

  // 端末に入りきらなかった古い記録も、画面からは読める（空き日数・ふりかえり用）
  const old = 'clean_笠寺_過去の人_area3_' + ymd(Date.now() - 10 * DAY);
  const oldV = await pg.evaluate(k => (typeof LS !== 'undefined' ? LS : localStorage).getItem(k), old);
  check('端末に入らなかった古い記録もこの画面では読める', !!oldV && /過去の人/.test(oldV), old + ' ' + String(oldV).slice(0,40) + ' srv=' + (await getS(old)).slice(0,20) + ' mem=' + await pg.evaluate(() => typeof LS !== 'undefined' && LS.memCount()));

  // 開き直しても今日のチェックが見える
  await pg.reload();
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
  await pg.waitForTimeout(1500);
  const st3 = await pg.evaluate(k => { let r = {}; try { r = JSON.parse((typeof LS !== 'undefined' ? LS : localStorage).getItem(k)) || {}; } catch (e) {} return !!(r.floor && r.drain); }, key);
  check('開き直してもチェックが残っている', st3);
  check('開き直しても「一杯」を出さない', (await bar()) === '', await bar());
  const disk = await diskChars();
  check('端末の使用量は上限内', disk <= QUOTA, disk);

  check('ページのエラーなし', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();
  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 : ' + e); process.exit(1); });
