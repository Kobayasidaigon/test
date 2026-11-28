#!/usr/bin/env node
/**
 * ChatGPT (OpenAI API) でサイネージのコピー案を作り、Remotion 用の props JSON に書き出す。
 *
 *   OPENAI_API_KEY=sk-... npm run copy:gpt -- --theme "朝の時間帯に来る会員向け" --n 3
 *
 * オプション
 *   --theme <文>   どんな人・場面向けのコピーにするか(省略可)
 *   --n <数>       案の数(既定 3)
 *   --base <file>  色・店舗名・QR などを引き継ぐ元の props(既定 props/current.json)
 *   --dry          API を呼ばずにプロンプトだけ表示(ChatGPT の画面に貼る用)
 * 環境変数
 *   OPENAI_API_KEY   必須(--dry 以外)
 *   OPENAI_MODEL     既定 gpt-5-mini
 *   OPENAI_BASE_URL  既定 https://api.openai.com/v1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const theme = opt("theme", "ジムに通うすべての会員");
const n = Math.max(1, Math.min(6, Number(opt("n", "3"))));
const basePath = path.resolve(root, opt("base", "props/current.json"));
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const base = JSON.parse(fs.readFileSync(basePath, "utf8"));

// 画面に収まる文字数の目安(全角)。これを超えると自動で文字が小さくなるので、守ってもらう
const LIMITS = {
  tag: 14,
  "hook.line1": 13,
  "hook.line2": 11,
  "hook.box": 11,
  "principle.pre": 15,
  "principle.main": 6,
  "principle.post": 18,
  "principle.bgWord": 16,
  pointsTag: 14,
  "points.line1": 9,
  "points.line2": 7,
  "points.caption": 22,
  "demo.title": 11,
  "cta.pre": 18,
  "cta.main": 8,
  "cta.box": 18,
  "end.sub": 14,
  "end.search": 8,
};

const str = (desc) => ({ type: "string", description: desc });
const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const pointSchema = obj({
  line1: str(`白い行。全角${LIMITS["points.line1"]}字以内`),
  line2: str(`ライム色の行。全角${LIMITS["points.line2"]}字以内`),
  caption: str(`説明。全角${LIMITS["points.caption"]}字以内`),
});
const copySchema = obj({
  angle: str("この案の切り口を一言で(社内メモ用、画面には出ない)"),
  tag: str(`左上の小さなラベル「〜の方へ」。全角${LIMITS.tag}字以内`),
  hook: obj({
    line1: str(`つかみの1行目(白)。全角${LIMITS["hook.line1"]}字以内`),
    line2: str(`2行目(ライム)。全角${LIMITS["hook.line2"]}字以内`),
    box: str(`3行目(ライムの箱)。全角${LIMITS["hook.box"]}字以内`),
  }),
  principle: obj({
    pre: str(`特大の一言の前置き。全角${LIMITS["principle.pre"]}字以内`),
    main: str(`特大で出す一言。全角${LIMITS["principle.main"]}字以内。句点「。」で終える`),
    post: str(`補足。全角${LIMITS["principle.post"]}字以内`),
    bgWord: str(`背景に流れる英字(大文字)。半角${LIMITS["principle.bgWord"]}字以内`),
  }),
  pointsTag: str(`コツ3つの画面のラベル。全角${LIMITS.pointsTag}字以内`),
  points: { type: "array", minItems: 3, maxItems: 3, items: pointSchema },
  demo: obj({ title: str(`スマホ画面の横の見出し。2行で、改行は \\n。1行全角${LIMITS["demo.title"]}字以内`) }),
  cta: obj({
    pre: str(`呼びかけの前置き。全角${LIMITS["cta.pre"]}字以内`),
    main: str(`呼びかけの大見出し。2行で、改行は \\n。1行全角${LIMITS["cta.main"]}字以内`),
    box: str(`黒い帯の一文。全角${LIMITS["cta.box"]}字以内`),
  }),
  end: obj({
    sub: str(`店舗名の下の一言。全角${LIMITS["end.sub"]}字以内`),
    search: str(`検索バー風の欄に打ち込まれる言葉。全角${LIMITS["end.search"]}字以内`),
  }),
});
const schema = obj({ variants: { type: "array", minItems: n, maxItems: n, items: copySchema } });

const system = [
  "あなたはフィットネスジムの館内デジタルサイネージのコピーライターです。",
  "テーマは「やる気より先に予定を入れる」。帰る前に、次に来る日時をスマホのカレンダーに入れてもらうことがゴールです。",
  "トーン: 明るく前向き、短く言い切る。説教くさくしない。責めない。",
  "禁止: 数字や統計の捏造(「9割が〜」など根拠のない数値)、医学的・効果の断定、他社名、絵文字。",
  "1画面で読める短さを最優先。各フィールドの文字数上限を必ず守る。",
  "案ごとに切り口(例: 共感 / 習慣化のコツ / 季節 / 初心者向け)を変える。",
].join("\n");
const user = `対象・場面: ${theme}\n店舗名: ${base.gymName}\nコピー案を ${n} 案、JSON で出してください。`;

if (flag("dry")) {
  console.log("----- system -----\n" + system + "\n\n----- user -----\n" + user);
  console.log("\n----- JSON Schema -----\n" + JSON.stringify(schema, null, 2));
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY が設定されていません。ChatGPT の画面で作る場合は prompts/chatgpt-copy.md を使ってください。");
  process.exit(1);
}

console.log(`ChatGPT (${model}) にコピー案を ${n} 案たのんでいます… テーマ: ${theme}`);
const res = await fetch(`${baseUrl}/responses`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name: "signage_copy", strict: true, schema } },
  }),
});
if (!res.ok) {
  console.error(`OpenAI API エラー ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const text =
  data.output_text ??
  (data.output || [])
    .flatMap((o) => (o.type === "message" ? o.content : []))
    .filter((c) => c.type === "output_text")
    .map((c) => c.text)
    .join("");
const { variants } = JSON.parse(text);

// 文字数チェック(超えていても書き出すが、警告する)
const width = (s) => Array.from(s).reduce((n, c) => n + (/[\x20-\x7e]/.test(c) ? 0.55 : 1), 0);
const check = (v, i) => {
  const warn = [];
  const test = (key, s) => {
    const lim = LIMITS[key];
    for (const line of String(s).split("\n")) if (lim && width(line) > lim) warn.push(`${key}「${line}」(${Math.ceil(width(line))}字 > ${lim})`);
  };
  test("tag", v.tag);
  for (const k of ["line1", "line2", "box"]) test(`hook.${k}`, v.hook[k]);
  for (const k of ["pre", "main", "post"]) test(`principle.${k}`, v.principle[k]);
  test("pointsTag", v.pointsTag);
  for (const pt of v.points) for (const k of ["line1", "line2", "caption"]) test(`points.${k}`, pt[k]);
  test("demo.title", v.demo.title);
  for (const k of ["pre", "main", "box"]) test(`cta.${k}`, v.cta[k]);
  test("end.sub", v.end.sub);
  test("end.search", v.end.search);
  if (warn.length) console.warn(`  案${i + 1}: 文字数オーバー(自動で文字が小さくなります)\n    - ${warn.join("\n    - ")}`);
};

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
fs.mkdirSync(path.join(root, "props/gpt"), { recursive: true });
variants.forEach((v, i) => {
  check(v, i);
  const { angle, ...copy } = v;
  const merged = {
    ...base,
    ...copy,
    hook: { ...base.hook, ...copy.hook },
    principle: { ...base.principle, ...copy.principle },
    demo: { ...base.demo, ...copy.demo },
    cta: { ...base.cta, ...copy.cta },
    end: { ...base.end, ...copy.end },
  };
  const file = path.join(root, "props/gpt", `${stamp}-${i + 1}.json`);
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  console.log(`  案${i + 1} [${angle}] → ${path.relative(root, file)}`);
  console.log(`     ${copy.hook.line1} / ${copy.principle.main} / ${copy.cta.main.replace(/\n/g, "")}`);
});
console.log("\nプレビュー:  npm run studio  (右パネルの props に JSON を貼るか、下のコマンドで書き出し)");
console.log("書き出し:    npm run render -- props/gpt/" + `${stamp}-1.json`);
