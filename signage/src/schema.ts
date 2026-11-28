import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/** 文言。「\n」は改行 */
export const copySchema = z.object({
  /** シーン1（黄）：1語ずつ叩きつける。2〜4個 */
  hook: z.array(z.string()).min(2).max(4),
  /** シーン2（青）：小さく前置き → 大きく一語 */
  turnLead: z.string(),
  turnBig: z.string(),
  /** シーン3（オレンジ）：次の予定と「予約済」のハンコ */
  slotLead: z.string(),
  slotDay: z.string().describe("曜日1文字（例：木）"),
  slotTime: z.string().describe("時刻（例：19:00）"),
  stamp: z.string(),
  /** シーン4（黒）：決めのひと言 */
  punchLead: z.string(),
  punchBig: z.string(),
  /** シーン5（黄）：行動 */
  ctaTitle: z.string(),
  ctaSub: z.string(),
  qrLabel: z.string(),
});

export const signageSchema = z.object({
  storeName: z.string(),
  bookingUrl: z.string().describe("QRコードの飛び先（予約ページ）"),
  showQr: z.boolean(),
  yellow: zColor(),
  blue: zColor(),
  orange: zColor(),
  ink: zColor(),
  white: zColor(),
  copy: copySchema,
});

export type SignageProps = z.infer<typeof signageSchema>;
export type Copy = z.infer<typeof copySchema>;

export const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  copy: copySchema,
});
