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
  // 署名の対象は loc→user→exp→nonce の順で、値を encodeURIComponent した文字列
  const canonical = ['loc', 'user', 'exp', 'nonce']
    .map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const sig = crypto.createHmac('sha256', INVENTORY_LINK_SECRET).update(canonical).digest('hex');
  // URLはログに出さない（1回きりとはいえ、有効なうちは入れてしまうため）
  res.json({ url: INVENTORY_BASE + '/enter?' + canonical + '&sig=' + sig });
});

// ---- 状態API（チェック記録・項目・履歴などの文字列データ）----
app.get('/api/state', (req, res) => {
  res.json({ kv: state.kv, media: state.media, mediaIds: Object.keys(state.media) });
});
app.put('/api/state/:key', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  state.kv[req.params.key] = typeof req.body === 'string' ? req.body : '';
  saveState();
  res.json({ ok: true });
});
app.delete('/api/state/:key', (req, res) => {
  delete state.kv[req.params.key];
  saveState();
  res.json({ ok: true });
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
