import { useVideoConfig } from "remotion";

/**
 * 縦(1080x1920)・横(1920x1080)どちらでも同じ見た目のバランスにするための単位。
 * u = 短辺 / 1080。フォントや余白はすべて u の倍数で指定する。
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height >= width;
  const u = Math.min(width, height) / 1080;
  return { width, height, portrait, u };
};

/** 1秒 = 30フレーム */
export const sec = (s: number) => Math.round(s * 30);

/** 全角=1, 半角=0.55 として文字列の見た目の長さを数える(複数行は最長の行) */
const visualLength = (text: string) =>
  Math.max(
    1,
    ...text.split("\n").map((l) => Array.from(l).reduce((n, c) => n + (/[\x20-\x7e]/.test(c) ? 0.55 : 1), 0)),
  );

/** コピーが長くなっても横幅に収まるフォントサイズ(最大 max) */
export const fit = (text: string, max: number, avail: number) => Math.min(max, avail / visualLength(text));
