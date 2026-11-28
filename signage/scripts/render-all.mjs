#!/usr/bin/env node
/**
 * props の JSON ごとに 縦(1080x1920)・横(1920x1080) の MP4 を書き出す。
 *
 *   npm run render                              → props/current.json を縦横で
 *   npm run render -- props/gpt/*.json          → ChatGPT の案をまとめて
 *   npm run render -- props/current.json --only portrait
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && i !== onlyIdx + 1 && a.endsWith(".json"));
if (files.length === 0) files.push("props/current.json");

const targets = [
  { id: "YoteiPortrait", suffix: "portrait" },
  { id: "YoteiLandscape", suffix: "landscape" },
].filter((t) => !only || t.suffix === only);

// Chromium の場所を指定したいとき: REMOTION_BROWSER=/path/to/chrome
const browser = process.env.REMOTION_BROWSER ? ["--browser-executable", process.env.REMOTION_BROWSER] : [];

fs.mkdirSync(path.join(root, "out"), { recursive: true });
for (const f of files) {
  const name = path.basename(f, ".json");
  for (const t of targets) {
    const out = `out/${name}-${t.suffix}.mp4`;
    console.log(`\n▶ ${f} → ${out}`);
    const r = spawnSync("npx", ["remotion", "render", t.id, out, `--props=${f}`, ...browser], { cwd: root, stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
console.log("\n完了: out/ フォルダを確認してください");
