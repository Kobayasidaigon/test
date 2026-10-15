// ジム清掃チェックシート — データ保存サーバー
// データは DATA_DIR（fly.ioの永続ボリューム /data）に保存され、
// 全端末・全スタッフで共有される。時間が経っても消えない。
const express = require('express');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
fs.mkdirSync(MEDIA_DIR, { recursive: true });

// 状態: { kv: { key: value(文字列) }, media: { id: mimeType } }
let state = { kv: {}, media: {} };
try {
  const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  state.kv = loaded.kv || {};
  state.media = loaded.media || {};
} catch (e) { /* 初回は空で開始 */ }

function saveState() {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, STATE_FILE); // 原子的に置き換え（破損防止）
}

// ---- 変更の通し番号（端末間の同期用）----
// 端末は /api/changes?since=<番号> を軽く叩いて、変わったキーだけ取りに来る。
// ログはメモリ内・上限つき。再起動やログから溢れた場合は full:true を返して全部取り直させる。
let stateRev = 0;
const CHANGE_LOG_MAX = 800;
const changeLog = [];   // [{ r: 通し番号, k: キー, del: 削除か }]
// 変化を待っている端末（ロングポーリング）。変わった瞬間に返してあげる
const waiters = new Set();
function bumpRev(key, del) {
  stateRev++;
  changeLog.push({ r: stateRev, k: key, del: !!del });
  if (changeLog.length > CHANGE_LOG_MAX) changeLog.shift();
  const now = Array.from(waiters);
  waiters.clear();
  now.forEach(fn => { try { fn(); } catch (e) {} });
}

function mediaPath(id) {
  return path.join(MEDIA_DIR, encodeURIComponent(id));
}

const app = express();
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ---- バージョンAPI（認証不要）----
// index.html の内容ハッシュ。デプロイで変わるため、開きっぱなしの古い画面が
// これを定期チェックして変化を検知したら自動リロードする。
const crypto = require('crypto');
const APP_VERSION = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(__dirname, 'public', 'index.html')))
  .digest('hex').slice(0, 16);
app.get('/api/version', (req, res) => res.json({ v: APP_VERSION }));

// ---- 見るだけのページ（上に共有する用・署名付きリンク）----
//
// 合言葉は渡さない。渡すと相手の端末がスタッフ用の画面に入れてしまい、
// チェックも項目の編集もできてしまう。合言葉を変えると全端末が再ログインに
// なるので、漏れたときの後始末も現場に出る。
//
// ここでは「現場が見ている画面と同じ中身」を、押せない形で出す。
// 渡すものはサーバーが絞る。ページ側で絞ると、絞り忘れがそのまま漏れになる。
//   出す   : エリア・区分・項目名・今日チェックが付いているか・前回やった日
//            ＋ 誰が付けたか（今日の記入者と、前回やった人）
//   出さない: 記録の生データ、名簿そのもの、シフト表、在庫連携の設定、写真
//
// 担当者名について:
//   最初は名前を落としていた（署名付きリンクで広く配る前提だったため）。
//   いまは管理者合言葉を知っている人しか開けないページで、
//   「誰がやっているか分からないと困る」という話があったので出すようにした。
//   合言葉を知らない人には、名前を含めて中身が1つも出ないことは変わらない。
//
// 見るのは管理者だけ。管理者合言葉（ADMIN_PASS）で開ける。
//
// 署名付きリンクをやめて合言葉にした理由:
//   リンクは一度LINEに貼ると転送でどこまでも広がり、取り消すには合言葉を
//   変えるしかない。合言葉なら、知っている人だけが開ける。
//   リンク自体は貼っても構わない（開いても合言葉を聞かれるだけ）。
//
// ADMIN_PASS はスタッフ合言葉とは別物で、これだけでは本体のアプリには入れない
// （本体の管理者画面は、スタッフ合言葉を通ったうえで更にこれを聞く）。
// なので上に渡しても、チェックを付けられる画面には届かない。
// ADMIN_PASS が未設定なら、この機能ごと止まる。
function viewCookie() {
  return crypto.createHash('sha256').update('view-v1:' + ADMIN_PASS).digest('hex');
}
function viewOk(req) {
  if (!ADMIN_PASS) return false;
  const m = (req.get('Cookie') || '').match(/(?:^|;\s*)vauth=([0-9a-f]{64})\s*(?:;|$)/);
  if (!m) return false;
  return crypto.timingSafeEqual(Buffer.from(m[1]), Buffer.from(viewCookie()));
}

// 合言葉を総当たりされないよう、間違いが続いたら待たせる。
// 外に出ている入口なので、ここだけは数えておく。
const viewTries = new Map();   // IP -> { n, until }
function viewThrottle(req) {
  const ip = String(req.ip || req.get('fly-client-ip') || '');
  const e = viewTries.get(ip);
  if (e && e.until > Date.now()) return Math.ceil((e.until - Date.now()) / 1000);
  return 0;
}
function viewFailed(req) {
  const ip = String(req.ip || req.get('fly-client-ip') || '');
  const e = viewTries.get(ip) || { n: 0, until: 0 };
  e.n++;
  if (e.n >= 5) e.until = Date.now() + Math.min(10 * 60, 30 * (e.n - 4)) * 1000;
  viewTries.set(ip, e);
  if (viewTries.size > 500) viewTries.clear();   // 増えっぱなしにしない
}

// 組み込みのエリア・区分・項目を index.html から読む（起動時に1回だけ）。
// 項目の定義はアプリ本体が持っているので、サーバーが別に持つと必ずズレる。
function parseBuiltinAreas() {
  const src = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const out = [];
  const re = /key: "([a-z0-9_]+)", name: "([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const blk = src.slice(m.index, src.indexOf('\n  {\n    key: "', m.index) + 1 || m.index + 12000);
    const groups = [];
    const gre = /\{ section: "([^"]+)", items: \[([\s\S]*?)\n      \]\}/g;
    let g;
    while ((g = gre.exec(blk)) !== null) {
      const items = [];
      const ire = /\{ id: "([^"]+)", title: "([^"]+)"/g;
      let i;
      while ((i = ire.exec(g[2])) !== null) items.push({ id: i[1], title: i[2] });
      groups.push({ section: g[1], items: items });
    }
    out.push({ key: m[1], name: m[2], groups: groups });
  }
  return out;
}
let BUILTIN_AREAS = [];
try { BUILTIN_AREAS = parseBuiltinAreas(); }
catch (e) { console.log('組み込みエリアの読み取りに失敗: ' + e.message); }

const VIEW_STORES = ['笠寺', '枇杷島', '萩野通'];
function vDefRead(store, base) {
  const v = state.kv['sdef_' + store + '_' + base];
  return v === undefined ? state.kv[base] : v;
}
function vJson(raw, fb) {
  if (typeof raw !== 'string') return fb;
  try { const v = JSON.parse(raw); return v === null ? fb : v; } catch (e) { return fb; }
}
function vBaseArea(key) {
  let s = String(key || '');
  const h = s.indexOf('#'); if (h >= 0) s = s.slice(0, h);
  const at = s.indexOf('@'); return at < 0 ? s : s.slice(0, at);
}
function vToday() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}
// 外から来た日付。形だけでなく、実在する日かも見る（2026-02-30 を弾く）。
// おかしければ今日にする（画面を壊さない）。
function vPickDate(raw) {
  const s = String(raw || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return vToday();
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime()) || vFmtDate(d) !== s) return vToday();
  if (s < '2025-01-01' || s > vToday()) return vToday();   // 先の日は記録がない
  return s;
}
function vFmtDate(d) {
  const p2 = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

// その店舗で画面に出ている項目を、アプリの getGroups と同じ順で組み立てる
function viewGroups(store, areaKey) {
  const hidden = vJson(vDefRead(store, 'hiddenItems_' + areaKey), []) || [];
  const edits = vJson(vDefRead(store, 'itemEdits_' + areaKey), {}) || {};
  const custom = vJson(vDefRead(store, 'customItems_' + areaKey), []) || [];
  const builtin = (BUILTIN_AREAS.find(a => a.key === areaKey) || {}).groups || [];
  const secOf = (id, fallback) => {
    const ed = edits[id];
    return (ed && ed.section != null && String(ed.section).trim()) ? ed.section : fallback;
  };
  const order = [];
  const bag = {};
  const push = (sec, item) => {
    if (!bag[sec]) { bag[sec] = []; order.push(sec); }
    bag[sec].push(item);
  };
  builtin.forEach(g => g.items.forEach(it => {
    if (hidden.indexOf(it.id) >= 0) return;
    const ed = edits[it.id] || {};
    push(secOf(it.id, g.section), { id: it.id, title: ed.title != null ? ed.title : it.title });
  }));
  (Array.isArray(custom) ? custom : []).forEach(ci => {
    if (!ci || !ci.id || hidden.indexOf(ci.id) >= 0) return;
    push(ci.section || '', { id: ci.id, title: ci.title || '' });
  });
  const secOrder = vJson(vDefRead(store, 'sectionOrder_' + areaKey), []) || [];
  if (Array.isArray(secOrder) && secOrder.length) {
    order.sort((a, b) => {
      const ra = secOrder.indexOf(a), rb = secOrder.indexOf(b);
      return (ra < 0 ? 1e9 : ra) - (rb < 0 ? 1e9 : rb);
    });
  }
  return order.map(sec => ({ section: sec, items: bag[sec] }));
}

// その店舗の記録を、エリアと項目ごとにまとめる。誰が付けたかも持つ。
// 同じ項目を同じ日に2人が付けることがある（担当者ごとに別の記録になるため）ので、
// 名前は配列で持って、重なりを取り除いてから返す。
function viewRecords(store, day) {
  const doneToday = {};   // エリア -> { 項目id: [その日つけた人…] }
  const lastDone = {};    // "エリア:項目id" -> { date, by: [その日につけた人…] }
  const todayBy = {};     // エリア -> { その日その場所を記入した人: true }
  // 見ている日より後の記録は数えない。数えると、昔の日を見たときに
  // 「前回やった日」が未来になってしまう。
  const today = day || vToday();
  const pre = 'clean_' + store + '_';
  const addTo = (arr, name) => { if (name && arr.indexOf(name) < 0) arr.push(name); };
  Object.keys(state.kv).forEach(k => {
    if (k.indexOf(pre) !== 0) return;
    const date = k.slice(-10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (date > today) return;                 // 見ている日より後は無視する
    const mid = k.slice(pre.length, k.length - 11);
    const us = mid.indexOf('_');
    if (us < 0) return;
    const staff = mid.slice(0, us);
    const area = vBaseArea(mid.slice(us + 1));
    const rec = vJson(state.kv[k], {}) || {};
    Object.keys(rec).forEach(id => {
      if (!rec[id]) return;
      const key = area + ':' + id;
      const cur = lastDone[key];
      if (!cur || date > cur.date) lastDone[key] = { date: date, by: staff ? [staff] : [] };
      else if (date === cur.date) addTo(cur.by, staff);
      if (date === today) {
        if (!doneToday[area]) doneToday[area] = {};
        if (!doneToday[area][id]) doneToday[area][id] = [];
        addTo(doneToday[area][id], staff);
        if (!todayBy[area]) todayBy[area] = {};
        if (staff) todayBy[area][staff] = true;
      }
    });
  });
  return { doneToday: doneToday, lastDone: lastDone, todayBy: todayBy };
}

// ===== 定期清掃（たまにやる仕事）=====
// 決め方（repeat）と次にやる日の出し方は index.html と同じ。
// 食い違うと「遅れている」の数が画面と合わなくなるので、試験で突き合わせている
// （tests/verify47.js が index.html の関数と総当たりで比べる）。
function vDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function vFmt(d) {
  const p2 = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
function vTaskRepeat(task) {
  const r = task && task.repeat;
  if (r && r.kind === 'week') {
    return { kind: 'week', every: Math.max(1, Number(r.every) || 1),
             dow: Math.min(6, Math.max(0, Number(r.dow) || 0)) };
  }
  if (r && r.kind === 'month') {
    return { kind: 'month', every: Math.max(1, Number(r.every) || 1),
             day: Math.min(31, Math.max(1, Number(r.day) || 1)) };
  }
  if (r && r.kind === 'monthEnd') {
    return { kind: 'monthEnd', every: Math.max(1, Number(r.every) || 1),
             before: Math.min(27, Math.max(0, Number(r.before) || 0)) };
  }
  const n = Math.max(1, Number((r && r.n) || (task && task.interval) || 30));
  return { kind: 'days', n: n };
}
function vRepeatDays(task) {
  const r = vTaskRepeat(task);
  if (r.kind === 'week') return r.every * 7;
  if (r.kind === 'month' || r.kind === 'monthEnd') return r.every * 30;
  return r.n;
}
function vShiftDate(from, n) {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return vFmt(d);
}
function vNextFromRepeat(task, from) {
  const r = vTaskRepeat(task);
  const base = new Date(from + 'T00:00:00');
  if (r.kind === 'week') {
    const d = new Date(base.getTime());
    do { d.setDate(d.getDate() + 1); } while (d.getDay() !== r.dow);
    if (r.every > 1) d.setDate(d.getDate() + (r.every - 1) * 7);
    return vFmt(d);
  }
  if (r.kind === 'month') {
    const y = base.getFullYear(), m = base.getMonth() + r.every;
    const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    return vFmt(new Date(ty, tm, Math.min(r.day, vDaysInMonth(ty, tm))));
  }
  if (r.kind === 'monthEnd') {
    const y = base.getFullYear(), m = base.getMonth() + r.every;
    const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    return vFmt(new Date(ty, tm, vDaysInMonth(ty, tm) - r.before));
  }
  return vShiftDate(from, r.n);
}
function vRepeatLabel(task) {
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  const PRESET = { 7: '毎週', 14: '2週ごと', 30: '毎月', 60: '2ヶ月ごと',
                   90: '3ヶ月ごと', 180: '半年ごと', 365: '毎年' };
  const r = vTaskRepeat(task);
  if (r.kind === 'week') {
    return (r.every === 1 ? '毎週' : r.every + '週ごと') + ' ' + DOW[r.dow] + '曜';
  }
  if (r.kind === 'month') {
    return (r.every === 1 ? '毎月' : r.every + 'ヶ月ごと') + ' ' + r.day + '日';
  }
  if (r.kind === 'monthEnd') {
    return (r.every === 1 ? '毎月' : r.every + 'ヶ月ごと') + ' '
      + (r.before === 0 ? '月末' : '月末の' + r.before + '日前');
  }
  return PRESET[r.n] || (r.n + '日ごと');
}
// その店舗に出す定期項目か（stores が空なら全店）
function vForStore(task, store) {
  const ss = task && task.stores;
  if (!Array.isArray(ss) || !ss.length) return true;
  return ss.indexOf(store) >= 0;
}
// その店舗の定期清掃。担当者名は持ち出さない（done.staff は読まない）。
function viewPeriodic(store) {
  const tasks = vJson(state.kv['periodicTasks'], []) || [];
  const dm = vJson(state.kv['periodicDone_' + store], {}) || {};
  const today = vToday();
  const out = [];
  (Array.isArray(tasks) ? tasks : []).forEach(t => {
    if (!t || !t.id || !vForStore(t, store)) return;
    const d = dm[t.id] || {};
    const last = d.date || null;
    const next = d.next ? d.next : (last ? vNextFromRepeat(t, last) : null);
    let state_ = 'unset', left = null;
    if (next) {
      left = Math.round((new Date(next + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
      if (left <= 0) state_ = 'due';
      else if (left <= Math.max(1, Math.round(vRepeatDays(t) * 0.2))) state_ = 'soon';
      else state_ = 'ok';
    }
    out.push({
      title: String(t.title || ''),
      area: String(t.area || ''),
      every: vRepeatLabel(t),
      last: last, next: next, left: left, state: state_,
      fixed: !!d.next,
    });
  });
  const rank = { due: 0, soon: 1, ok: 2, unset: 3 };
  out.sort((a, b) => (rank[a.state] - rank[b.state])
    || ((a.left == null ? 99999 : a.left) - (b.left == null ? 99999 : b.left)));
  return out;
}

function buildViewData(day) {
  const today = day || vToday();
  const isToday = today === vToday();
  const ROUTINES = [['routine_asa', '朝番'], ['routine_hiru', '中番'], ['routine_ban', '遅番']];
  const stores = VIEW_STORES.map(store => {
    const customAreas = vJson(vDefRead(store, 'customAreas'), []) || [];
    const custom = Array.isArray(customAreas) ? customAreas : [];
    const rec = viewRecords(store, today);

    // その店舗のエリアを1つぶん組み立てる。中身が無ければ null。
    const build = (key, name) => {
      const groups = viewGroups(store, key).map(g => ({
        section: g.section,
        items: g.items.map(it => {
          const by = (rec.doneToday[key] || {})[it.id] || null;   // 今日つけた人
          const ld = rec.lastDone[key + ':' + it.id] || null;     // 前回つけた日と人
          return {
            title: it.title,
            done: !!(by && by.length),
            by: by && by.length ? by : null,
            last: ld ? ld.date : null,
            lastBy: ld && ld.by.length ? ld.by : null,
          };
        }),
      })).filter(g => g.items.length);
      if (!groups.length) return null;                // その店舗に無い設備は出さない
      const total = groups.reduce((n, g) => n + g.items.length, 0);
      const done = groups.reduce((n, g) => n + g.items.filter(i => i.done).length, 0);
      // そのエリアで最後に何か記録が付いた日。
      // これが無い／ずっと前のエリアは「その店舗では使っていない設備」のことが多い
      // （笠寺の共通シャワーは部屋別へ移したので記録が止まっている）。
      // 隠すと本当の放置まで見えなくなるので、隠さずに分けて出す。
      let last = null;
      groups.forEach(g => g.items.forEach(i => {
        if (i.last && (!last || i.last > last)) last = i.last;
      }));
      // その場所を今日記入した人（畳んだままでも誰がやっているか分かるように）
      const who = Object.keys(rec.todayBy[key] || {}).sort();
      return { name: name, done: done, total: total, last: last,
               who: who, groups: groups };
    };

    // ① 朝番・中番・遅番のやることリスト（現場が毎日たどる順そのまま）
    const routines = [];
    ROUTINES.forEach(([key, label]) => {
      const def = custom.find(a => a && a.key === key);
      const a = build(key, (def && def.name) || label);
      if (a) routines.push(a);
    });

    // ② 清掃エリア（やることリストから開く先も含む、場所ごとの一覧）
    const keys = BUILTIN_AREAS.map(a => ({ key: a.key, name: a.name }))
      .concat(custom
        .filter(a => a && a.key && !BUILTIN_AREAS.some(b => b.key === a.key))
        .map(a => ({ key: a.key, name: a.name || a.key })))
      .filter(a => a.key.indexOf('routine_') !== 0);
    const areas = [];
    keys.forEach(a => { const x = build(a.key, a.name); if (x) areas.push(x); });

    // ③ 定期清掃（たまにやる仕事。毎日の数には混ぜない）
    const periodic = viewPeriodic(store);   // いつも「今の状態」（下の periodicAsOfToday を見ること）

    return { store: store, routines: routines, areas: areas, periodic: periodic };
  });
  return {
    date: today,
    today: vToday(),
    isToday: isToday,
    // 定期清掃は「前回やった日」を1件しか持っていないので、昔の日の状態は作れない。
    // 画面では「今の状態」と断って出す。
    periodicAsOfToday: !isToday,
    at: new Date(Date.now() + 9 * 3600000).toISOString().slice(11, 16),
    stores: stores,
  };
}

// 合言葉を入れる。合えば見るだけのクッキーを出す（本体には何の権限も無い）
app.post('/view/login', express.text({ type: '*/*', limit: '1kb' }), (req, res) => {
  if (!ADMIN_PASS) return res.status(503).json({ error: '管理者合言葉が未設定です' });
  const wait = viewThrottle(req);
  if (wait) return res.status(429).json({ error: '間違いが続いています。' + wait + '秒おいてください' });
  const p = typeof req.body === 'string' ? req.body.trim() : '';
  if (p && p === ADMIN_PASS) {
    res.set('Set-Cookie', 'vauth=' + viewCookie()
      + '; Path=/view; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax');
    return res.json({ ok: true });
  }
  viewFailed(req);
  res.sendStatus(401);
});
app.get('/view/data', (req, res) => {
  if (!ADMIN_PASS) return res.status(503).json({ error: '管理者合言葉が未設定です' });
  if (!viewOk(req)) return res.sendStatus(401);
  res.json(buildViewData(vPickDate(req.query.d)));
});
// ページ自体は誰が開いてもよい（中身は出ない。合言葉を聞く画面が出るだけ）
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// ---- 認証（データAPIのみ保護。ページ自体は誰でも開ける）----
// ホーム画面追加(iOS全画面表示)ではBasic認証ダイアログが出せないため、
// ページ内のパスワード入力 → /api/login → 認証クッキー(1年) の方式にする。
// パスワードは環境変数 BASIC_PASS（fly secrets set BASIC_PASS=... で設定）。未設定ならスキップ（ローカル開発用）。
const STORES = ['笠寺', '枇杷島', '萩野通'];
const BASIC_PASS = process.env.BASIC_PASS || '';

// クッキー値はパスワードのハッシュ。パスワードを変えると全端末が再ログインになる。
// 店舗合言葉で入った端末には店舗名を混ぜた別の値を出し、サーバー側で「どの店舗の端末か」を
// 判定できるようにする。以前は店舗合言葉でもマスターと同じ値を出していたため、
// 店舗の切り分けが画面上の見た目だけになっていた（在庫システムへ渡す拠点を
// サーバーで確定させるには、ここが分かれている必要がある）。
// 'gcc-v2:' と版を上げているので、既存の端末は次回に合言葉の再入力が1回だけ必要になる。
const authToken = (store) => crypto.createHash('sha256')
  .update('gcc-v2:' + BASIC_PASS + (store ? ':' + store : '')).digest('hex');

if (BASIC_PASS) {
  const MASTER_TOKEN = authToken(null);
  const STORE_TOKENS = STORES.map(s => [s, authToken(s)]);

  // 店舗ごとの合言葉（入力するとその店舗のシートに固定される。env未設定の店舗は無効）
  const STORE_PASSES = {};
  [['PASS_KASADERA', '笠寺'], ['PASS_BIWAJIMA', '枇杷島'], ['PASS_HAGINO', '萩野通']].forEach(([env, store]) => {
    if (process.env[env]) STORE_PASSES[process.env[env]] = store;
  });

  // ログイン: パスワード(平文テキスト)を照合してクッキーを発行。
  // マスター合言葉(BASIC_PASS)→store:null(店舗選択あり)、店舗合言葉→その店舗名を返す(店舗固定)
  app.post('/api/login', express.text({ type: '*/*', limit: '1kb' }), (req, res) => {
    const p = typeof req.body === 'string' ? req.body.trim() : '';
    const store = STORE_PASSES[p] || null;
    if (p && (p === BASIC_PASS || store)) {
      res.set('Set-Cookie', 'auth=' + authToken(store) + '; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax');
      return res.json({ ok: true, store });
    }
    res.sendStatus(401);
  });

  // ログアウト: 認証クッキーを削除（次回アクセス時に合言葉入力へ戻る）
  app.post('/api/logout', (req, res) => {
    res.set('Set-Cookie', 'auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    res.json({ ok: true });
  });

  // /api/* を保護（クッキー、またはツール用にBasic認証も可）
  // 通過したリクエストには req.authStore を付ける（店舗合言葉ならその店舗名、マスターならnull）
  app.use('/api', (req, res, next) => {
    const c = (req.get('Cookie') || '').match(/(?:^|;\s*)auth=([0-9a-f]{64})\s*(?:;|$)/);
    if (c) {
      if (c[1] === MASTER_TOKEN) { req.authStore = null; return next(); }
      const hit = STORE_TOKENS.find(([, tok]) => tok === c[1]);
      if (hit) { req.authStore = hit[0]; return next(); }
    }
    const m = (req.get('Authorization') || '').match(/^Basic (.+)$/);
    if (m) {
      const decoded = Buffer.from(m[1], 'base64').toString('utf8');
      if (decoded.slice(decoded.indexOf(':') + 1) === BASIC_PASS) { req.authStore = null; return next(); }
    }
    res.sendStatus(401);
  });
}

// ---- 管理者確認（「店舗まとめ」表示のゲート用。スタッフ認証を通った上で照合される）----
const ADMIN_PASS = process.env.ADMIN_PASS || '';
app.post('/api/admin-login', express.text({ type: '*/*', limit: '1kb' }), (req, res) => {
  if (ADMIN_PASS && typeof req.body === 'string' && req.body.trim() === ADMIN_PASS) return res.json({ ok: true });
  res.sendStatus(401);
});

// ---- 在庫システムへの受け渡し（署名付きリンク）----
// 在庫システムの GET /enter は、両サイトで共有した合言葉から作った HMAC-SHA256 の署名を
// 検証してログイン画面を飛ばす。「どこから来たか」の判定にRefererは使わない（送る側が
// 自由に書ける値で偽装できるため）。
// 合言葉はサーバーの環境変数にだけ置き、ブラウザには渡さない。渡すと誰でも自前で
// リンクを作れてしまい、清掃管理表のログインを迂回されるため。
// リンクは1回きり・5分で失効する。押されるたびにここで作り直し、保存も使い回しもしない。
const INVENTORY_BASE = (process.env.INVENTORY_BASE || 'https://inventory-system-aburiva.fly.dev').replace(/\/+$/, '');
const INVENTORY_LINK_SECRET = process.env.INVENTORY_LINK_SECRET || '';
const INVENTORY_LINK_TTL = 300; // 秒。在庫システム側の上限は600秒なので、その半分にしている
// 店舗ごとの在庫システムのアカウント: {"笠寺":{"loc":"...","user":"..."}, ...}
let INVENTORY_ACCOUNTS = {};
try {
  INVENTORY_ACCOUNTS = JSON.parse(process.env.INVENTORY_ACCOUNTS || '{}');
} catch (e) {
  console.log('INVENTORY_ACCOUNTS の書式が不正です: ' + e.message);
}

// 操作者名の制限。在庫システム側と同じ条件にしてある（向こうで弾かれないように）。
const INVENTORY_BY_MAX = 40;
const INVENTORY_BY_NG = /[<>"'&\\]|[\u0000-\u001f\u007f]/;

app.post('/api/inventory-link', express.json({ limit: '1kb' }), (req, res) => {
  // BASIC_PASS が未設定だと /api の保護が丸ごと外れるため、その状態では発行しない
  if (!BASIC_PASS) return res.status(503).json({ error: 'サーバーの認証が未設定のため発行できません' });
  if (!INVENTORY_LINK_SECRET) return res.status(503).json({ error: '在庫システムとの共有合言葉が未設定です' });

  // 拠点はサーバーが決める。店舗合言葉で入っている端末は、他店舗のリンクを作れない。
  let store = req.authStore || null;
  if (!store) {
    // マスター合言葉のセッションだけ、どの店舗で入るかを選べる
    const asked = req.body && typeof req.body.store === 'string' ? req.body.store : '';
    if (STORES.indexOf(asked) === -1) return res.status(400).json({ error: '店舗が特定できません' });
    store = asked;
  }
  const acct = INVENTORY_ACCOUNTS[store];
  if (!acct || !acct.loc || !acct.user) {
    return res.status(503).json({ error: store + ' の在庫システムの拠点情報が未設定です' });
  }

  const params = {
    loc: String(acct.loc),
    user: String(acct.user),
    exp: Math.floor(Date.now() / 1000) + INVENTORY_LINK_TTL,
    nonce: crypto.randomBytes(16).toString('hex')
  };

  // 操作している人の名前。在庫システムのアカウントは店舗で共用しているので、
  // これを渡さないと向こうの画面も履歴も全部「清掃管理表」になる。
  // 名前として読めない値は付けずに送る（付けて弾かれるとリンク自体が開けなくなる）。
  const by = req.body && typeof req.body.by === 'string' ? req.body.by.trim() : '';
  if (by && by.length <= INVENTORY_BY_MAX && !INVENTORY_BY_NG.test(by)) params.by = by;

  // 署名の対象は loc→user→exp→nonce の順。by があれば最後に足す。
  // ここの並びは在庫システム側の entry-link.js と揃っている必要がある。
  const fields = ['loc', 'user', 'exp', 'nonce'];
  if (params.by) fields.push('by');
  const canonical = fields
    .map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const sig = crypto.createHmac('sha256', INVENTORY_LINK_SECRET).update(canonical).digest('hex');
  // URLはログに出さない（1回きりとはいえ、有効なうちは入れてしまうため）
  res.json({ url: INVENTORY_BASE + '/enter?' + canonical + '&sig=' + sig });
});

// ---- 状態API（チェック記録・項目・履歴などの文字列データ）----
app.get('/api/state', (req, res) => {
  res.json({ kv: state.kv, media: state.media, mediaIds: Object.keys(state.media), rev: stateRev });
});
// 鍵を1つだけ取る。端末の保存容量には限りがあるので、大きいもの
// （ふりかえり用の履歴など）は端末に置かず、見るときにここから取りに行く。
app.get('/api/state/:key', (req, res) => {
  const v = state.kv[req.params.key];
  // 無い鍵は 404 ではなく「空」で返す。404 は端末のコンソールに赤い行を出し、
  // 本当のエラーが埋もれるため（まだ一度も履歴が無い店舗はふつうにある）。
  res.type('text/plain; charset=utf-8').send(typeof v === 'string' ? v : '');
});
app.put('/api/state/:key', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  const v = typeof req.body === 'string' ? req.body : '';
  const changed = state.kv[req.params.key] !== v;
  state.kv[req.params.key] = v;
  if (changed) bumpRev(req.params.key, false);
  saveState();
  res.json({ ok: true, rev: stateRev });
});
app.delete('/api/state/:key', (req, res) => {
  const had = Object.prototype.hasOwnProperty.call(state.kv, req.params.key);
  delete state.kv[req.params.key];
  if (had) bumpRev(req.params.key, true);
  saveState();
  res.json({ ok: true, rev: stateRev });
});

// ---- 変わったキーだけ返す（同じ店舗で2台使うときの同期用）----
// since が古すぎる・サーバーが再起動した場合は full:true（端末は /api/state を取り直す）
const WAIT_MAX_MS = 25 * 1000;   // 待つ上限（fly のプロキシに切られない範囲）
app.get('/api/changes', (req, res) => {
  const since = parseInt(req.query.since, 10);
  const reply = () => {
    const oldest = changeLog.length ? changeLog[0].r : stateRev + 1;
    if (!Number.isFinite(since) || since < 0 || since > stateRev || since < oldest - 1) {
      return res.json({ rev: stateRev, full: true });
    }
    const last = new Map();   // 同じキーが何度も変わっていたら最後だけ
    for (const c of changeLog) if (c.r > since) last.set(c.k, c.del);
    const kv = {}, del = [];
    last.forEach((isDel, k) => { if (isDel) del.push(k); else kv[k] = state.kv[k]; });
    res.json({ rev: stateRev, kv: kv, del: del });
  };
  // wait=1 なら「変化があるまで待つ」。他の端末が書いた瞬間に返るので、ほぼ即時に伝わる
  if (req.query.wait !== '1' || !Number.isFinite(since) || since !== stateRev) return reply();
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    waiters.delete(fire);
    reply();
  };
  const timer = setTimeout(fire, WAIT_MAX_MS);
  waiters.add(fire);
  req.on('close', () => { done = true; clearTimeout(timer); waiters.delete(fire); });
});

// ---- 見本メディアAPI（画像・動画のバイナリ）----
app.get('/api/media', (req, res) => res.json(Object.keys(state.media)));
app.get('/api/media/:id', (req, res) => {
  const id = req.params.id;
  if (!state.media[id]) return res.sendStatus(404);
  res.type(state.media[id]);
  // メディアは内容不変（idが一意）なので長期キャッシュ可。グローバルの no-store を上書き。
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(mediaPath(id));
});
app.put('/api/media/:id', express.raw({ type: '*/*', limit: '80mb' }), (req, res) => {
  fs.writeFileSync(mediaPath(req.params.id), req.body);
  state.media[req.params.id] = req.get('Content-Type') || 'application/octet-stream';
  saveState();
  res.json({ ok: true });
});
app.delete('/api/media/:id', (req, res) => {
  try { fs.unlinkSync(mediaPath(req.params.id)); } catch (e) {}
  delete state.media[req.params.id];
  saveState();
  res.json({ ok: true });
});

// ---- 静的ファイル ----
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---- 担当者名簿の自動同期（ジム予約システムのシフトDB＝Jobcan取込データから）----
// 直近2週間〜先45日にシフトがあるスタッフを店舗別に名簿化して staffRoster を自動更新する。
// 社員などシフトDBに居ない人は kv rosterPinned = {"店舗":[名前,...]} の固定枠で先頭に維持。
// 取得失敗や人数が少なすぎる場合は更新しない（名簿が空になる事故の防止）。
const ROSTER_API = process.env.ROSTER_API || 'https://gym-reservation-system.fly.dev';
const ROSTER_GROUPS = { 1: '萩野通', 2: '笠寺', 3: '枇杷島' }; // シフトDBのgroup_id→店舗名
async function syncStaffRoster() {
  try {
    const res = await fetch(ROSTER_API + '/api/staff');
    if (!res.ok) throw new Error('staff API ' + res.status);
    const body = await res.json();
    const staffList = Array.isArray(body) ? body : (body.staff || []);
    if (!staffList.length) throw new Error('スタッフ0名');
    const jstDate = n => new Date(Date.now() + n * 86400000 + 9 * 3600000).toISOString().slice(0, 10);
    const start = jstDate(-14), end = jstDate(45);
    const roster = { '笠寺': [], '枇杷島': [], '萩野通': [] };
    // 今日〜3日先のシフト表（担当者の自動切替用）: shiftSchedule_<店舗> = { "日付": [{n,s,e}] }
    const shiftFrom = jstDate(0), shiftTo = jstDate(3);
    const shifts = { '笠寺': {}, '枇杷島': {}, '萩野通': {} };
    for (const s of staffList) {
      try {
        const r2 = await fetch(ROSTER_API + '/api/staff/' + s.id + '/schedules?start_date=' + start + '&end_date=' + end);
        if (!r2.ok) continue;
        const j = await r2.json();
        (j.schedules || []).forEach(x => {
          const store = ROSTER_GROUPS[x.group_id];
          if (!store) return;
          if (!roster[store].includes(s.name)) roster[store].push(s.name);
          const d = String(x.date || '').slice(0, 10);
          if (d >= shiftFrom && d <= shiftTo && x.start_time && x.end_time) {
            (shifts[store][d] = shifts[store][d] || []).push({
              n: s.name, s: String(x.start_time).slice(0, 5), e: String(x.end_time).slice(0, 5)
            });
          }
        });
      } catch (e) { /* 個別失敗はスキップ */ }
    }
    // 固定枠（社員などシフトDBに居ない人）を各店の先頭に
    let pinned = {};
    try { pinned = JSON.parse(state.kv.rosterPinned || '{}'); } catch (e) {}
    Object.keys(roster).forEach(store => {
      const pin = (pinned[store] || []).filter(Boolean);
      roster[store] = pin.concat(roster[store].filter(n => !pin.includes(n)));
    });
    const total = Object.values(roster).reduce((n, a) => n + a.length, 0);
    if (total < 10) throw new Error('取得数が少なすぎるため更新中止 (' + total + '名)');
    state.kv.staffRoster = JSON.stringify(roster);
    Object.entries(shifts).forEach(([st, byDate]) => {
      state.kv['shiftSchedule_' + st] = JSON.stringify(byDate);
    });
    saveState();
    console.log('staffRoster synced: ' + Object.entries(roster).map(([st, a]) => st + ' ' + a.length + '名').join(' / '));
  } catch (e) {
    console.log('staffRoster sync skipped: ' + e.message);
  }
}
if (process.env.ROSTER_SYNC !== 'off') {
  setTimeout(syncStaffRoster, 10 * 1000);            // 起動10秒後（auto_stop環境では毎日の初回アクセス時に実行される）
  setInterval(syncStaffRoster, 24 * 60 * 60 * 1000); // 常駐時は24時間ごと
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('gym-cleaning-checklist server listening on ' + PORT + ' (data: ' + DATA_DIR + ')'));
