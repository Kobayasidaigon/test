#!/usr/bin/env node
/**
 * ChatGPT（OpenAI API）で業種に合わせたサイネージ文言を作り、src/variants.json に足す。
 *
 *   OPENAI_API_KEY=sk-... npm run copy -- --id seikotsu --industry "整骨院" --tone "やさしく、安心感"
 *   npm run copy -- --id seikotsu --industry "整骨院" --n 3        # A/B/C の3案（seikotsu-a, -b, -c）
 *   npm run copy -- --id seikotsu --industry "整骨院" --dry       # APIを呼ばずにプロンプトだけ表示
 *   npm run copy -- --check                                      # いまの variants.json を文字数・表現チェック
 *
 * 生成した文言は、文字数（遠くから読める長さ）と表現（効果の断定・誇大表現）を機械でチェックし、
 * 通らなければ理由を添えて作り直させる（最大3回）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VARIANTS = path.join(root, "src/variants.json");

const { values: args } = parseArgs({
  options: {
    id: { type: "string" },
    industry: { type: "string" },
    tone: { type: "string", default: "落ち着いていて、押しつけがましくない" },
    accent: { type: "string" },
    note: { type: "string", default: "" },
    n: { type: "string", default: "1" },
    model: { type: "string" },
    dry: { type: "boolean", default: false },
    check: { type: "boolean", default: false },
  },
});

const runCheck = () => {
  const data = JSON.parse(fs.readFileSync(VARIANTS, "utf8"));
  let bad = 0;
  for (const v of data.variants) {
    const errors = check(v.copy);
    bad += errors.length;
    console.log(`${errors.length ? "×" : "✓"} ${v.id}${errors.map((e) => "\n    " + e).join("")}`);
  }
  process.exit(bad ? 1 : 0);
};

if (!args.check && (!args.id || !args.industry)) {
  console.error('使い方: npm run copy -- --id <英小文字> --industry "<業種>" [--tone "<トーン>"] [--n 3] [--dry]');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(args.id)) {
  console.error("--id は英小文字・数字・ハイフンだけにしてください（動画のファイル名になります）");
  process.exit(1);
}

// ---- 文字数のルール（1行あたりの全角文字数。サイネージは2〜3mから一瞬で読める長さに） ----
const RULES = {
  before: { lines: 1, max: 6 },
  after: { lines: 1, max: 6 },
  captionBefore: { lines: 1, max: 12 },
  captionAfter: { lines: 1, max: 12 },
  headline: { lines: 2, max: 10 },
  calendarTitle: { lines: 2, max: 11 },
  calendarSub: { lines: 2, max: 16 },
  slotLabel: { lines: 1, max: 3 },
  slotTime: { lines: 1, max: 5 },
  reasonsTitle: { lines: 1, max: 13 },
  reasons: { lines: 2, max: 11 },
  ctaTitle: { lines: 2, max: 10 },
  ctaSub: { lines: 1, max: 14 },
  qrLabel: { lines: 1, max: 8 },
};
// 効果の断定・誇大表現（景品表示法・医療広告ガイドライン等で問題になりやすい言い方）
const NG = ["必ず", "絶対", "確実", "治る", "完治", "保証", "No.1", "ナンバーワン", "日本一", "最高", "最安", "100%", "誰でも"];

const width = (s) => [...s].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.5 : 1), 0);

const check = (copy) => {
  const errors = [];
  for (const [key, rule] of Object.entries(RULES)) {
    const vals = key === "reasons" ? copy.reasons : [copy[key]];
    if (key === "reasons" && vals.length !== 3) errors.push("reasons は3つ");
    vals.forEach((v, i) => {
      const name = key === "reasons" ? `reasons[${i}]` : key;
      if (typeof v !== "string" || !v.trim()) return errors.push(`${name} が空`);
      const lines = v.split("\n");
      if (lines.length > rule.lines) errors.push(`${name} は${rule.lines}行まで（いま${lines.length}行）`);
      lines.forEach((l) => {
        if (width(l) > rule.max) errors.push(`${name} の「${l}」は${rule.max}文字まで（いま${width(l)}文字）`);
      });
      for (const w of NG) if (v.includes(w)) errors.push(`${name} に「${w}」（断定・誇大表現）`);
    });
  }
  return errors;
};

if (args.check) runCheck();

// ---- ChatGPT に渡す指示 ----
const example = JSON.parse(fs.readFileSync(VARIANTS, "utf8")).variants[0].copy;
const instructions = `あなたは日本の店舗サイネージ専門のコピーライターです。
来店客がお会計・受付の前後に見るモニター（20〜30秒ループ、音なし）の文言を書きます。
目的は「次回の予約を、帰る前にいま入れてもらう」こと。
軸になる考え方は「やる気より先に、予定を入れる」——人はやる気が出てから動くのではなく、予定があるから動ける。

書き方のルール：
- 2〜3m離れて、2秒で読める短さ。漢字を詰め込まず、ひらがなを混ぜてやわらかく。
- 改行は文節の切れ目で「\\n」を入れる。各項目の行数・1行の文字数の上限を守る。
- 押しつけない。命令形より「〜を。」「〜しませんか」くらいの温度。
- 効果を断定しない（「必ず」「治る」「絶対」「No.1」などは使わない）。数字の実績・統計を作らない。
- before → after は「よくある順番」→「続く人の順番」の入れ替え。after は予約・予定を表す短い語。
- slotLabel は「次回」など3文字以内、slotTime は「19:00」のような時刻。
- reasons は「いま予約すると、お客さまにとって何がいいか」を3つ。店側の都合（売上・稼働）は書かない。

1行の文字数の上限：
${Object.entries(RULES).map(([k, r]) => `- ${k}: ${r.lines}行まで、1行${r.max}文字まで`).join("\n")}

参考（汎用版）：
${JSON.stringify(example, null, 2)}`;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          angle: { type: "string", description: "この案の切り口を一言で" },
          accent: { type: "string", description: "業種に合うアクセント色 #RRGGBB（紙色 #F5F2EC 上で白文字が読める濃さ）" },
          copy: {
            type: "object",
            additionalProperties: false,
            properties: Object.fromEntries(
              Object.keys(RULES).map((k) => [k, k === "reasons" ? { type: "array", items: { type: "string" } } : { type: "string" }]),
            ),
            required: Object.keys(RULES),
          },
        },
        required: ["angle", "accent", "copy"],
      },
    },
  },
  required: ["variants"],
};

const n = Math.max(1, Math.min(5, Number(args.n) || 1));
const brief = `業種：${args.industry}
トーン：${args.tone}
案の数：${n}（それぞれ切り口を変える）${args.note ? `\n補足：${args.note}` : ""}`;

if (args.dry) {
  console.log("---- instructions ----\n" + instructions + "\n\n---- input ----\n" + brief);
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY がありません。.env.example を参考に設定してください（--dry ならキーなしで確認できます）");
  process.exit(1);
}

const { default: OpenAI } = await import("openai");
const client = new OpenAI();
const model = args.model || process.env.OPENAI_MODEL || "gpt-5";

let input = brief;
let result;
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`ChatGPT (${model}) に依頼中… ${attempt}回目`);
  const res = await client.responses.create({
    model,
    instructions,
    input,
    text: { format: { type: "json_schema", name: "signage_copy", schema, strict: true } },
  });
  result = JSON.parse(res.output_text);
  const problems = result.variants.flatMap((v, i) => check(v.copy).map((e) => `案${i + 1}: ${e}`));
  if (result.variants.length >= n && problems.length === 0) break;
  console.log(problems.map((p) => "  × " + p).join("\n"));
  if (attempt === 3) {
    console.error("3回作り直しても条件を満たしませんでした。上の指摘を見て、--note で補足するか手で直してください。");
    process.exit(1);
  }
  input = `${brief}\n\n前回の案には次の問題がありました。直した案を${n}つ出してください。\n${problems.join("\n")}\n\n前回の案：\n${JSON.stringify(result, null, 2)}`;
}

// ---- variants.json に追加（同じ id があれば置き換え） ----
const data = JSON.parse(fs.readFileSync(VARIANTS, "utf8"));
const hex = /^#[0-9a-fA-F]{6}$/;
const made = result.variants.slice(0, n).map((v, i) => ({
  id: n === 1 ? args.id : `${args.id}-${"abcde"[i]}`,
  name: n === 1 ? args.industry : `${args.industry}（${"ABCDE"[i]}：${v.angle}）`,
  accent: args.accent && hex.test(args.accent) ? args.accent : hex.test(v.accent) ? v.accent : "#E4572E",
  copy: v.copy,
}));
for (const v of made) {
  const at = data.variants.findIndex((x) => x.id === v.id);
  if (at >= 0) data.variants[at] = v;
  else data.variants.push(v);
}
fs.writeFileSync(VARIANTS, JSON.stringify(data, null, 2) + "\n");

for (const v of made) {
  console.log(`\n✓ ${v.id}  ${v.name}  ${v.accent}`);
  console.log("  " + v.copy.headline.replace("\n", " / "));
  console.log("  " + v.copy.ctaTitle.replace("\n", " / "));
}
console.log(`\nsrc/variants.json に追加しました。確認：npm run studio　書き出し：npm run render -- --only ${args.id}`);
