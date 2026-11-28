import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * 文言。「\n」は改行（縦組みでは列の区切り）。文節の切れ目で入れる。
 */
export const copySchema = z.object({
  /** シーン1：赤ペンの添削。struck を線で消し、insert を赤で書き込む */
  struck: z.string().describe("消される前半（例：やる気が出たら、）"),
  kept: z.string().describe("残る後半（例：次の予約を。）"),
  insert: z.string().describe("赤ペンで書き込む言葉（例：帰る前に、）"),

  /** シーン2：カレンダーに赤丸 */
  calendarTitle: z.string(),
  calendarMark: z.string().describe("赤丸の横の書き込み（例：次回）"),

  /** シーン3：言い切りの一枚 */
  statement: z.string(),

  /** シーン4：行動 */
  ctaTitle: z.string(),
  ctaSub: z.string(),
  qrNote: z.string().describe("QRの横の手書き（例：ここから30秒）"),
});

export const signageSchema = z.object({
  storeName: z.string(),
  bookingUrl: z.string().describe("QRコードの飛び先（予約ページ）"),
  showQr: z.boolean(),
  paper: zColor(),
  ink: zColor(),
  pen: zColor().describe("赤ペンの色"),
  copy: copySchema,
});

export type SignageProps = z.infer<typeof signageSchema>;
export type Copy = z.infer<typeof copySchema>;

export const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  copy: copySchema,
});
export type Variant = z.infer<typeof variantSchema>;
