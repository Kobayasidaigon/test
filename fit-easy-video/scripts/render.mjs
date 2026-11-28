// FIT-EASY 法人契約動画 — 書き出しスクリプト
//
//   node scripts/render.mjs                 本番書き出し（モーションブラー付き MP4）
//   node scripts/render.mjs --stills 1,5.5  指定秒の静止画を out/stills/ に書き出し（確認用）
//
// オプション: --fps 30 --samples 8 --fast-samples 20 --shutter 0.5 --workers 4 --crf 17 --out out/xxx.mp4
//             --from 0 --to 40（秒。部分書き出し用）
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Playwright は環境にインストール済みのもの（NODE_PATH 上）を使う
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1920, H = 1080;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    a[k] = v;
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const FPS = Number(args.fps ?? 30);
const SAMPLES = Number(args.samples ?? 8);
const FAST_SAMPLES = Number(args['fast-samples'] ?? 20); // 速い区間だけサンプル数を増やす
const SHUTTER = Number(args.shutter ?? 0.5); // 180°シャッター
const CRF = String(args.crf ?? 17);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function openPage(url) {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t) => {
    await page.evaluate((tt) => window.__seek(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  const duration = await page.evaluate(() => window.__duration);
  const fastRanges = await page.evaluate(() => window.__fastRanges || []);
  return { browser, page, shot, duration, fastRanges };
}

function encoder(outFile) {
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-profile:v', 'high', '-level', '4.1',
    '-tune', 'animation', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const write = (buf) => new Promise((res) => { if (ff.stdin.write(buf)) res(); else ff.stdin.once('drain', res); });
  return { write, end: async () => { ff.stdin.end(); await done; } };
}

// 1 フレーム分：シャッターが開いている間を SAMPLES 回撮って平均（＝モーションブラー）
async function renderFrame(shot, i, fastRanges = []) {
  const tc = i / FPS;
  const n = fastRanges.some(([a, b]) => tc >= a && tc <= b) ? FAST_SAMPLES : SAMPLES;
  const times = [];
  for (let k = 0; k < n; k++) times.push(tc + ((k + 0.5) / n - 0.5) * (SHUTTER / FPS));
  const pngs = [];
  for (const t of times) pngs.push(await shot(Math.max(0, t)));
  if (pngs.every((p) => p.equals(pngs[0]))) {
    return sharp(pngs[0]).removeAlpha().raw().toBuffer();
  }
  const acc = new Uint16Array(W * H * 3);
  for (const p of pngs) {
    const raw = await sharp(p).removeAlpha().raw().toBuffer();
    for (let j = 0; j < raw.length; j++) acc[j] += raw[j];
  }
  const out = Buffer.allocUnsafe(acc.length);
  const half = n >> 1;
  for (let j = 0; j < acc.length; j++) out[j] = Math.floor((acc[j] + half) / n);
  return out;
}

async function worker() {
  const { url, start, end, seg } = args;
  const s = Number(start), e = Number(end);
  const { browser, shot, fastRanges } = await openPage(url);
  const enc = encoder(seg);
  const t0 = Date.now();
  for (let i = s; i < e; i++) {
    await enc.write(await renderFrame(shot, i, fastRanges));
    if ((i - s) % 30 === 0) process.send?.({ progress: i - s, total: e - s, ms: Date.now() - t0 });
  }
  await enc.end();
  await browser.close();
  process.send?.({ done: true });
}

async function main() {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/src/index.html`;

  if (args.stills) {
    const dir = path.join(ROOT, 'out', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const { browser, shot } = await openPage(url);
    for (const t of String(args.stills).split(',').map(Number)) {
      const png = await shot(t);
      const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
      fs.writeFileSync(f, png);
      console.log(f);
    }
    await browser.close();
    server.close();
    return;
  }

  const probe = await openPage(url);
  const duration = probe.duration;
  // 決定性チェック：直接シークと順次シークで同じ絵になるか
  const dump = () => [...document.querySelectorAll('#stage *')].map((e) => (e.getAttribute('style') || '') + '|' + (e.getAttribute('transform') || '') + '|' + (e.getAttribute('d') || ''));
  await probe.page.evaluate((t) => window.__seek(t), 31.3);
  const direct = await probe.page.evaluate(dump);
  for (const t of [0, 9, 15, 20, 28, 31.3]) await probe.page.evaluate((tt) => window.__seek(tt), t);
  const seq = await probe.page.evaluate(dump);
  if (direct.some((v, i) => v !== seq[i])) console.warn('⚠ seek is not deterministic (animation state differs)');
  await probe.browser.close();

  const from = Math.round(Number(args.from ?? 0) * FPS);
  const to = Math.round(Number(args.to ?? duration) * FPS);
  const total = to - from;
  const nW = Math.min(Number(args.workers ?? Math.max(1, os.cpus().length)), total);
  const out = path.resolve(ROOT, args.out ?? 'out/fit-easy-corporate.mp4');
  const tmp = path.join(ROOT, 'out', 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  console.log(`render ${total} frames (${(total / FPS).toFixed(2)}s) @${FPS}fps, ${SAMPLES}/${FAST_SAMPLES} samples/frame, ${nW} workers`);

  const t0 = Date.now();
  const per = Math.ceil(total / nW);
  const progress = new Array(nW).fill(0);
  const segs = [];
  await Promise.all(Array.from({ length: nW }, (_, w) => {
    const s = from + w * per, e = Math.min(to, s + per);
    const seg = path.join(tmp, `seg_${String(w).padStart(2, '0')}.mp4`);
    segs.push(seg);
    return new Promise((res, rej) => {
      const cp = fork(fileURLToPath(import.meta.url), ['--worker', '--url', url, '--start', String(s), '--end', String(e), '--seg', seg,
        '--fps', String(FPS), '--samples', String(SAMPLES), '--fast-samples', String(FAST_SAMPLES), '--shutter', String(SHUTTER), '--crf', CRF]);
      cp.on('message', (m) => {
        if (m.progress != null) {
          progress[w] = m.progress;
          const doneN = progress.reduce((a, b) => a + b, 0);
          process.stdout.write(`\r  ${doneN}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s   `);
        }
      });
      cp.on('exit', (c) => (c === 0 ? res() : rej(new Error('worker failed ' + c))));
    });
  }));
  console.log(`\n  frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
    ff.on('close', (c) => (c === 0 ? res() : rej(new Error('concat failed'))));
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  server.close();
  console.log('wrote', out);
}

(args.worker ? worker() : main()).catch((e) => { console.error(e); process.exit(1); });
