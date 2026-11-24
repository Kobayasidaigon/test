// index.html を 1 コマずつ撮って MP4 (1920×1080・30fps・H.264・音声なし) にする。
//   node render.mjs                 → out/gym_free_open_day_signage.mp4
//   node render.mjs --stills 2,7.5  → out/still_2.png, out/still_7.5.png (確認用の静止画)
// 必要なもの: node, playwright (Chromium), ffmpeg
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// playwright はグローバルに入っている環境でも見つかるよう require で読む
const { chromium } = createRequire(import.meta.url)("playwright");
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "out");
mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const stillsAt = args.includes("--stills") ? args[args.indexOf("--stills") + 1].split(",").map(Number) : null;
const outFile = path.join(out, args.includes("--out") ? args[args.indexOf("--out") + 1] : "gym_free_open_day_signage.mp4");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.error("page error:", e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.join(dir, "index.html")).href + "?capture");
await page.evaluate(() => window.ready);
const { T, FPS } = await page.evaluate(() => ({ T: window.DURATION, FPS: window.FPS }));

if (stillsAt) {
  for (const t of stillsAt) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(out, `still_${t}.png`) });
  }
  await browser.close();
  console.log("stills:", stillsAt.join(", "));
} else {
  const frames = Math.round(T * FPS);
  const ff = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", "slow",
    "-crf", "17", "-maxrate", "12M", "-bufsize", "24M", "-g", "30",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-r", String(FPS), "-an", "-movflags", "+faststart", outFile,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg exit " + c)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 90 === 0) console.log(`frame ${i}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log("done:", outFile);
}
