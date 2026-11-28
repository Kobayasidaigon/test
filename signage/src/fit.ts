/**
 * 1行がはみ出さない文字サイズを返す。
 * 全角は1文字=1em、句読点（palt で詰まる）は0.6em、半角は0.6em として概算する。
 */
export const fitSize = (text: string, base: number, maxWidth: number) => {
  const widest = Math.max(
    ...text.split("\n").map((line) =>
      [...line].reduce((w, ch) => {
        if (/[、。，．・「」『』（）]/.test(ch)) return w + 0.6;
        if (/[\x20-\x7e]/.test(ch)) return w + 0.6;
        return w + 1;
      }, 0),
    ),
  );
  if (widest === 0) return base;
  return Math.min(base, maxWidth / (widest * 1.04));
};
