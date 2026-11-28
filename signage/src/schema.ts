import { z } from "zod";
import { zColor } from "@remotion/zod-types";

const point = z.object({
  line1: z.string().describe("白い行"),
  line2: z.string().describe("ライムの行"),
  caption: z.string(),
});

/**
 * サイネージの中身はすべてここで定義した props で差し替えられる。
 * Remotion Studio の右パネルで直接編集でき、ChatGPT で作ったコピー(JSON)もこの形で流し込む。
 */
export const signageSchema = z.object({
  gymName: z.string().describe("最後に大きく出す店舗名・ロゴ文字"),
  palette: z.object({
    base: zColor().describe("暗い背景(チャコール)"),
    lime: zColor().describe("メインカラー(ライム)"),
    text: zColor().describe("白文字"),
    deep: zColor().describe("ライムの上に置く黒い帯"),
  }),
  tag: z.string().describe("左上の小さいラベル"),
  hook: z.object({
    line1: z.string(),
    line2: z.string().describe("ライム色の行"),
    box: z.string().describe("ライムの箱に入る行"),
  }),
  principle: z.object({
    pre: z.string(),
    main: z.string().describe("一番大きく出す言葉(5〜6文字まで)"),
    post: z.string(),
    bgWord: z.string().describe("背景に流れる英字"),
  }),
  pointsTag: z.string().describe("コツの画面の左上ラベル"),
  points: z.array(point).length(3),
  demo: z.object({
    title: z.string().describe("改行は \\n"),
    eventLabel: z.string().describe("カレンダーに入る予定名"),
    eventTime: z.string(),
    note: z.string(),
  }),
  cta: z.object({
    pre: z.string(),
    main: z.string().describe("改行は \\n"),
    box: z.string(),
    bgWord: z.string(),
  }),
  end: z.object({
    sub: z.string(),
    search: z.string().describe("検索バー風の入力欄に打ち込まれる文字"),
    button: z.string(),
    note: z.string(),
    noteStrong: z.string(),
  }),
  qr: z.object({
    enabled: z.boolean(),
    url: z.string().describe("空ならGoogleカレンダーの予定作成リンクを自動生成"),
    label: z.string(),
  }),
});

export type SignageProps = z.infer<typeof signageSchema>;
