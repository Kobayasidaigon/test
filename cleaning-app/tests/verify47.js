// 共有ページ（/view）に、やることリストと定期清掃が載っているかを確かめる。
//
// いちばん大事なのは「定期清掃の日付の計算が、アプリ本体と食い違わないこと」。
// server.js に同じ計算を書き写しているので、片方だけ直すと画面と数が合わなくなる。
// index.html の関数と server.js の関数を、その場で取り出して総当たりで比べる。
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const APP = path.join(__dirname, '..');
const BASE = 'http://localhost:3999';
const PASS = 'test-admin-pass';

// 出力の形は runv.sh が数えている（行頭の PASS / FAIL）。他の試験とそろえる。
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' : ' + extra : ''));
  if (ok) pass++; else fail++;
};
const put = (k, v) => fetch(BASE + '/api/state/' + encodeURIComponent(k), {
  method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: v });
const d = n => new Date(Date.now() + 9 * 3600000 + n * 86400000).toISOString().slice(0, 10);

// ---- その1: 日付の計算が本体と同じか ----
function grab(src, names) {
  // 「function 名(」から、次の行頭の「function 」/「const 」/「// ===」までを切り出す
  let out = '';
  names.forEach(n => {
    const re = new RegExp('^(?:function ' + n + '\\s*\\(|const ' + n + '\\s*=)', 'm');
    const m = re.exec(src);
    if (!m) throw new Error('見つからない: ' + n);
    const from = m.index;
    const rest = src.slice(from + 1);
    const nx = /^(?:function |const |\/\/ =)/m.exec(rest);
    out += src.slice(from, nx ? from + 1 + nx.index : from + 4000) + '\n';
  });
  return out;
}

function driftCheck() {
  const appSrc = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');
  const srvSrc = fs.readFileSync(path.join(APP, 'server.js'), 'utf8');
  const appCtx = vm.createContext({});
  vm.runInContext(grab(appSrc, ['INTERVAL_PRESETS', 'intervalLabel', 'DOW_LABELS',
    'taskRepeat', 'repeatLabel', 'repeatDays', 'daysInMonth', 'nextFromRepeat', 'shiftDate']), appCtx);
  const srvCtx = vm.createContext({});
  vm.runInContext(grab(srvSrc, ['vDaysInMonth', 'vFmt', 'vTaskRepeat', 'vRepeatDays',
    'vShiftDate', 'vNextFromRepeat', 'vRepeatLabel']), srvCtx);

  const tasks = [];
  [7, 14, 30, 60, 90, 180, 365, 3, 45].forEach(n => tasks.push({ id: 'i' + n, interval: n }));
  [1, 2, 3].forEach(e => [0, 1, 3, 5, 6].forEach(dow =>
    tasks.push({ id: 'w' + e + dow, repeat: { kind: 'week', every: e, dow: dow } })));
  [1, 2, 3].forEach(e => [1, 15, 28, 29, 31].forEach(day =>
    tasks.push({ id: 'm' + e + day, repeat: { kind: 'month', every: e, day: day } })));
  [1, 2].forEach(e => [0, 1, 5, 27].forEach(b =>
    tasks.push({ id: 'e' + e + b, repeat: { kind: 'monthEnd', every: e, before: b } })));
  tasks.push({ id: 'none' });                             // 決め方なし（既定30日）
  tasks.push({ id: 'bad', repeat: { kind: 'week', every: 0, dow: 99 } });   // 変な値

  // うるう年・月末・年またぎを含む日で試す
  const froms = ['2026-01-31', '2026-02-27', '2026-02-28', '2026-03-01', '2026-04-30',
                 '2026-12-31', '2027-02-28', '2028-02-28', '2028-02-29', '2026-06-15'];
  let ngNext = [], ngDays = [], ngLabel = [];
  tasks.forEach(t => {
    if (appCtx.repeatDays(t) !== srvCtx.vRepeatDays(t)) ngDays.push(t.id);
    if (appCtx.repeatLabel(t) !== srvCtx.vRepeatLabel(t)) {
      ngLabel.push(t.id + ': ' + appCtx.repeatLabel(t) + ' / ' + srvCtx.vRepeatLabel(t));
    }
    froms.forEach(f => {
      const a = appCtx.nextFromRepeat(t, f), b = srvCtx.vNextFromRepeat(t, f);
      if (a !== b) ngNext.push(t.id + '@' + f + ': ' + a + ' / ' + b);
    });
  });
  console.log('  突き合わせ: 決め方' + tasks.length + '通り x 日付' + froms.length + '通り = '
    + (tasks.length * froms.length) + '件');
  check('次にやる日が本体と同じ', !ngNext.length, ngNext.slice(0, 3).join(' | '));
  check('間隔の日数が本体と同じ', !ngDays.length, ngDays.slice(0, 5).join(','));
  check('決め方の言い方が本体と同じ', !ngLabel.length, ngLabel.slice(0, 3).join(' | '));
}

(async () => {
  driftCheck();

  // ---- その2: 画面に出るか ----
  const today = d(0);
  await put('sdef_笠寺_customAreas', JSON.stringify([
    { key: 'routine_asa', name: '朝番' }, { key: 'routine_ban', name: '遅番' },
  ]));
  await put('sdef_笠寺_customItems_routine_asa', JSON.stringify([
    { id: 'ra1', section: 'やること', title: 'サウナ電源' },
    { id: 'ra2', section: 'やること', title: '掃除機のゴミ捨て' },
  ]));
  await put('sdef_笠寺_customItems_routine_ban', JSON.stringify([
    { id: 'rb1', section: 'やること', title: '閉め作業' },
  ]));
  // 朝番の1つだけ今日やった
  await put('clean_笠寺_山田 花子_routine_asa_' + today, JSON.stringify({ ra1: true }));
  // 定期清掃: 過ぎている / そろそろ / まだ / 日付未設定 の4通り
  await put('periodicTasks', JSON.stringify([
    { id: 'p_over', area: '設備', title: '過ぎているもの', interval: 30 },
    { id: 'p_ok', area: '共用', title: 'まだ先のもの', interval: 30 },
    { id: 'p_unset', area: '安全', title: '日付未設定のもの', interval: 30 },
    { id: 'p_other', area: '酸素', title: 'よその店舗だけのもの', interval: 30, stores: ['萩野通'] },
  ]));
  await put('periodicDone_笠寺', JSON.stringify({
    p_over: { date: d(-40), staff: '山田 花子', next: d(-5) },
    p_ok: { date: d(-2), staff: '山田 花子', next: d(+25) },
  }));

  const r = await fetch(BASE + '/view/login', { method: 'POST', body: PASS });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const res = await fetch(BASE + '/view/data', { headers: { Cookie: cookie } });
  const body = await res.text();
  const data = JSON.parse(body);
  const kasa = data.stores.find(s => s.store === '笠寺');

  check('やることリストが入っている', (kasa.routines || []).length === 2,
    JSON.stringify((kasa.routines || []).map(a => a.name)));
  check('やることリストは朝番→遅番の順', kasa.routines.map(a => a.name).join(',') === '朝番,遅番');
  check('朝番は2件中1件', kasa.routines[0].done === 1 && kasa.routines[0].total === 2,
    kasa.routines[0].done + '/' + kasa.routines[0].total);
  check('遅番はまだ0件', kasa.routines[1].done === 0 && kasa.routines[1].total === 1);
  check('清掃エリアは別で入っている', Array.isArray(kasa.areas) && kasa.areas.length > 0);
  check('清掃エリアにやることリストが混ざらない',
    !kasa.areas.some(a => a.name === '朝番' || a.name === '遅番'));

  const per = kasa.periodic || [];
  check('定期清掃が3件（よその店舗のものは出ない）', per.length === 3,
    JSON.stringify(per.map(t => t.title)));
  check('よその店舗だけのものは出ない', !per.some(t => t.title.indexOf('よその') === 0));
  check('過ぎているものが先頭', per[0] && per[0].state === 'due', per[0] && per[0].state);
  check('過ぎた日数が出る', per[0] && per[0].left === -5, per[0] && String(per[0].left));
  check('日付未設定が分かる',
    per.some(t => t.title === '日付未設定のもの' && t.state === 'unset' && t.next === null));
  check('まだ先のものは ok', per.some(t => t.title === 'まだ先のもの' && t.state === 'ok'));
  check('前回やった日が出る', per[0] && per[0].last === d(-40), per[0] && per[0].last);
  // 定期清掃は「次にやる日」で見るもので、誰がやったかは毎日の分で見る。
  // periodicDone_ の staff はそのまま渡さない（生の鍵ごと渡さないため）。
  check('定期清掃に staff の生データが入っていない', body.indexOf('staff') < 0);
  check('やることリストの記入者は出る', (kasa.routines[0].who || []).indexOf('山田 花子') >= 0,
    JSON.stringify(kasa.routines[0].who));
  check('項目ごとに誰がつけたか出る',
    kasa.routines[0].groups[0].items.some(it => it.done && (it.by || []).indexOf('山田 花子') >= 0));
  check('つけていない項目には人が付かない',
    kasa.routines[0].groups[0].items.every(it => it.done || !it.by));

  // ---- その3: 画面に描けるか ----
  const { chromium } = require('playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error' && !/401 \(Unauthorized\)/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE + '/view');
  await pg.fill('#pw', PASS);
  await pg.click('#go');
  await pg.waitForTimeout(800);
  const txt = await pg.innerText('body');
  check('画面に出る: やることリスト', txt.indexOf('やることリスト') >= 0);
  check('画面に出る: 清掃エリア', txt.indexOf('清掃エリア') >= 0);
  check('画面に出る: 定期清掃', txt.indexOf('定期清掃') >= 0);
  check('画面に出る: 朝番', txt.indexOf('朝番') >= 0);
  check('画面に出る: 実施時期の件数', /\d+件が実施時期です/.test(txt));
  check('定期清掃を分数で出さない（やった数に見えるため）', !/定期清掃の一覧[\s\S]{0,20}\d+\/\d+/.test(txt));
  check('定期清掃は件数で出す', /全\d+件/.test(txt));
  check('画面に記入者が出る', txt.indexOf('山田 花子') >= 0);
  check('画面の読み込みで例外が出ない', !errs.length, errs.slice(0, 2).join(' | '));

  // 定期清掃の一覧を開くと中身が出る
  const btns = await pg.$$('.area > button');
  for (const bt of btns) {
    if ((await bt.innerText()).indexOf('定期清掃の一覧') >= 0) { await bt.click(); break; }
  }
  await pg.waitForTimeout(250);
  const txt2 = await pg.innerText('body');
  check('開くと定期清掃の中身が出る', txt2.indexOf('過ぎているもの') >= 0);
  check('5日過ぎていると出る', txt2.indexOf('5日過ぎています') >= 0,
    (txt2.match(/.{0,12}過ぎています/) || [''])[0]);
  check('日付未設定が出る', txt2.indexOf('日付未設定') >= 0);
  await b.close();

  console.log('verify47 pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})();
