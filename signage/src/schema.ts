import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * 1本の動画が持つ全設定。Remotion Studio の右パネルでそのまま編集できる。
 * 文言の「\n」は改行位置（文節の切れ目で入れる）。
 */
export const copySchema = z.object({
  /** シーン1：よくある順番 → 続く人の順番 */
  before: z.string().describe("入れ替え前の左側（例：やる気）"),
  after: z.string().describe("入れ替え前の右側（例：予定）"),
  captionBefore: z.string(),
  captionAfter: z.string(),
  headline: z.string().describe("シーン1の決めコピー。\\n で改行"),

  /** シーン2：カレンダー */
  calendarTitle: z.string(),
  calendarSub: z.string(),
  slotLabel: z.string().describe("予約ブロックの1行目（例：次回）"),
  slotTime: z.string().describe("予約ブロックの2行目（例：19:00）"),

  /** シーン3：いま予約する理由（3つ） */
  reasonsTitle: z.string(),
  reasons: z.array(z.string()).length(3),

  /** シーン4：行動 */
  ctaTitle: z.string(),
  ctaSub: z.string(),
  qrLabel: z.string(),
});

export const signageSchema = z.object({
  storeName: z.string(),
  bookingUrl: z.string().describe("QRコードの飛び先（予約ページ）"),
  showQr: z.boolean(),
  paper: zColor(),
  ink: zColor(),
  muted: zColor(),
  accent: zColor(),
  copy: copySchema,
});

export type SignageProps = z.infer<typeof signageSchema>;
export type Copy = z.infer<typeof copySchema>;

export const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  accent: z.string(),
  copy: copySchema,
});
export type Variant = z.infer<typeof variantSchema>;
