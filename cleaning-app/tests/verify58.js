// スマホには直近15日の記録だけ置き、昔の日は見るときに取りに行く（2026-11-15）。
// 管理者ページから全部の記録を zip で持ち帰れる。
const BASE = 'http://localhost:3999';
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const S = '枇杷島', STAFF = '試験 太郎';
const DAY = 86400000;
const ymd = t => new Date(t + 9 * 3600000).toISOString().slice(0, 10);
const TODAY = ymd(Date.now());
const D30 = ymd(Date.now() - 30 * DAY), D20 = ymd(Date.now() - 20 * DAY), D3 = ymd(Date.now() - 3 * DAY);
const rec = (ids, d) => JSON.stringify(Object.fromEntries(ids.map(i => [i, { staff: STAFF, time: '10:00', ts: d + ' 10:00' }])));

(async () => {
  await put('staffRoster', JSON.stringify({ '枇杷島': [STAFF], '笠寺': [STAFF], '萩野通': [STAFF] }));
  const OLD = 'clean_' + S + '_' + STAFF + '_shower_' + D30;
  const OLD2 = 'clean_笠寺_' + STAFF + '_toilet_' + D20;
  const NEW = 'clean_' + S + '_' + STAFF + '_shower_' + D3;
  await put(OLD, rec(['drain', 'floor'], D30));
  await put(OLD2, rec(['bowl'], D20));
  await put(NEW, rec(['floor'], D3));
  await put('cleanHistory_' + S, '[]');

  // サーバー: lite は古い記録を渡さず、要約だけ
  const lite = await (await fetch(BASE + '/api/state?lite=1')).json();
  check('lite: 15日より前の記録は渡さない', !(OLD in lite.kv) && !(OLD2 in lite.kv), Object.keys(lite.kv).filter(k => k.startsWith('clean_')).join(','));
  check('lite: 直近の記録は渡す', NEW in lite.kv);
  check('lite: 要約に昔の最後の日がある', lite.lite && lite.lite.old[S] && lite.lite.old[S].shower && lite.lite.old[S].shower.drain === D30, JSON.stringify(lite.lite));
  const full = await (await fetch(BASE + '/api/state')).json();
  check('今までの /api/state は全部返す（古い端末のため）', OLD in full.kv);
  const one = await (await fetch(BASE + '/api/records?from=' + D30 + '&to=' + D30)).json();
  check('/api/records でその日のぶんを取れる', OLD in one.kv && !(NEW in one.kv));

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE + '/');
  await pg.evaluate(({ S, STAFF, TODAY }) => {
    localStorage.setItem('currentStore', S);
    localStorage.setItem('storeAuthed_' + S, '1');
    localStorage.setItem('currentStaff', STAFF);
    localStorage.setItem('currentStaffDay', TODAY);
    // 前の版が置いた古い記録が端末に残っている
    localStorage.setItem('clean_枇杷島_試験 太郎_shower_' + '2026-01-01', '{"x":{}}');
  }, { S, STAFF, TODAY });
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => typeof window.render === 'function', null, { timeout: 30000 });
  await pg.waitForTimeout(1500);

  const st = await pg.evaluate(({ OLD, NEW }) => ({
    oldDisk: localStorage.getItem(OLD) !== null, oldAny: LS.getItem(OLD) !== null,
    newDisk: localStorage.getItem(NEW) !== null,
    stale: localStorage.getItem('clean_枇杷島_試験 太郎_shower_2026-01-01') !== null,
    hist: localStorage.getItem('cleanHistory_枇杷島') !== null,
  }), { OLD, NEW });
  check('起動時、15日より前の記録は端末に置かない', !st.oldDisk && !st.oldAny, JSON.stringify(st));
  check('直近の記録は端末にある', st.newDisk, JSON.stringify(st));
  check('前の版が残した古い記録は端末から片づく', !st.stale, JSON.stringify(st));

  // 「前回いつ」: 要約と端末の記録を合わせる
  const last = await pg.evaluate(S => { _lastCheckedCache = null; return lastCheckedByItem(S); }, S);
  check('前回いつ: 昔だけやった項目は要約の日', last['shower:drain'] === D30, last['shower:drain']);
  check('前回いつ: 最近もやった項目は新しい日', last['shower:floor'] === D3, last['shower:floor']);

  // ふりかえり: 昔の記録も「やったことがある」に入る
  const rv = await pg.evaluate(S => reviewRecords(S).filter(r => r.area === 'shower').map(r => r.date + ':' + r.ids.join('+')), S);
  check('ふりかえり: 要約の昔の日も入る', rv.some(x => x.indexOf(D30 + ':drain') === 0), JSON.stringify(rv));

  // 昔の日を開くと取りに行く
  await pg.evaluate(D => { dateInput.value = D; currentArea = 'shower'; render(); }, D30);
  await pg.waitForFunction(k => LS.getItem(k) !== null, OLD, { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(300);
  const od = await pg.evaluate(({ OLD }) => ({ any: LS.getItem(OLD) !== null, disk: localStorage.getItem(OLD) !== null,
    done: areaCompletionToday('shower').done }), { OLD });
  check('昔の日を開くとサーバーから取ってくる', od.any, JSON.stringify(od));
  check('取ってきた昔の記録は端末に置かない', !od.disk, JSON.stringify(od));
  check('昔の日のチェックが画面に出る', od.done >= 2, JSON.stringify(od));

  // 結果の比較（全店舗）で昔の日
  await pg.evaluate(D => { document.getElementById('sumDate').value = D; renderSummary(); }, D20);
  await pg.waitForFunction(k => LS.getItem(k) !== null, OLD2, { timeout: 10000 }).catch(() => {});
  const p2 = await pg.evaluate(D => storeDayProgress('笠寺', D).reduce((n, a) => n + a.done, 0), D20);
  check('結果の比較: 昔の日の他店の記録も取ってくる', p2 >= 1, p2);

  // 今日に戻してチェック
  await pg.evaluate(T => { dateInput.value = T; currentArea = 'shower'; render(); toggleItemIn('shower', 'floor'); }, TODAY);
  await pg.waitForTimeout(800);
  const sv = await (await fetch(BASE + '/api/state/' + encodeURIComponent('clean_' + S + '_' + STAFF + '_shower_' + TODAY))).text();
  check('今日のチェックはふつうに付く', /floor/.test(sv), sv.slice(0, 50));
  check('ページのエラーなし', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();

  // 管理者の zip
  const no = await fetch(BASE + '/view/export');
  check('合言葉なしでは zip を出さない', no.status === 401, no.status);
  const lg = await fetch(BASE + '/view/login', { method: 'POST', body: 'test-admin-pass' });
  const ck = (lg.headers.get('set-cookie') || '').split(';')[0];
  const z = await fetch(BASE + '/view/export', { headers: { Cookie: ck } });
  check('合言葉ありで zip が取れる', z.status === 200 && /zip/.test(z.headers.get('content-type') || ''), z.status);
  const buf = Buffer.from(await z.arrayBuffer());
  require('fs').writeFileSync((process.env.OUT || '/tmp') + '/export.zip', buf);
  const py = require('child_process').spawnSync('python3', ['-I', '-c', `
import zipfile,sys,json
z=zipfile.ZipFile(sys.argv[1]); print('|'.join(z.namelist()))
c=z.read('記録.csv').decode('utf-8-sig'); print(len(c.splitlines())); print(c.splitlines()[0]); print([l for l in c.splitlines() if 'drain' in l][0])
print(len(json.loads(z.read('全データ.json'))['kv']))
`, (process.env.OUT || '/tmp') + '/export.zip'], { encoding: 'utf8' });
  const lines = (py.stdout || '').split('\n');
  check('zip を開ける（記録.csv と 全データ.json）', lines[0] === '記録.csv|全データ.json', (py.stdout || '') + (py.stderr || ''));
  check('CSV に昔の記録も全部ある（見出し＋5行）', lines[1] === '6', lines[1]);
  check('CSV の見出し', /^店舗,日付,時刻,担当者,時間帯,エリア,項目/.test(lines[2] || ''), lines[2]);
  check('CSV の中身は名前で出る', /枇杷島,.*シャワールーム,排水溝/.test(lines[3] || ''), lines[3]);
  check('全データ.json に全部の鍵', Number(lines[4]) >= 5, lines[4]);

  console.log('pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL 例外 : ' + e); process.exit(1); });
