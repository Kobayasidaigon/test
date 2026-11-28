#!/usr/bin/env node
/**
 * 全業種 × 横/縦 をまとめて MP4 に書き出す（out/ に保存）。
 *
 *   npm run render                       # 全部
 *   npm run render -- --only gym         # id に gym を含むものだけ
 *   npm run render -- --format portrait  # 縦だけ
 *   npm run still                        # 確認用の静止画（各シーン1枚）
 *
 * 手元の Chrome を使うときは REMOTION_BROWSER=/path/to/chrome を付ける。
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, renderStill } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { values: args } = parseArgs({
  options: {
    only: { type: "string" },
    format: { type: "string" },
    still: { type: "boolean", default: false },
  },
});

const browserExecutable = process.env.REMOTION_BROWSER || null;
const outDir = path.join(root, "out");
fs.mkdirSync(outDir, { recursive: true });

console.log("バンドル中…");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const comps = (await getCompositions(serveUrl, { browserExecutable })).filter(
  (c) => (!args.only || c.id.includes(args.only)) && (!args.format || c.id.endsWith(args.format)),
);
if (comps.length === 0) {
  console.error("該当する動画がありません。--only / --format を確認してください。");
  process.exit(1);
}

// 静止画は各シーンがいちばん見せたい瞬間
const STILLS = { correction: 200, calendar: 380, statement: 490, cta: 700 };

for (const c of comps) {
  if (args.still) {
    for (const [name, frame] of Object.entries(STILLS)) {
      const output = path.join(outDir, `${c.id}-${name}.png`);
      await renderStill({ composition: c, serveUrl, output, frame, browserExecutable });
      console.log("✓", path.relative(root, output));
    }
    continue;
  }
  const output = path.join(outDir, `${c.id}.mp4`);
  let last = -1;
  await renderMedia({
    composition: c,
    serveUrl,
    codec: "h264",
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    crf: 16,
    imageFormat: "jpeg",
    jpegQuality: 95,
    outputLocation: output,
    browserExecutable,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        process.stdout.write(`\r${c.id}  ${p * 10}%`);
      }
    },
  });
  console.log(`\r✓ ${path.relative(root, output)}        `);
}
