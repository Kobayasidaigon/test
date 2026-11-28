import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";

// 見出し・本文: 太めの Noto Sans JP / 数字・ロゴ: 縦長コンデンスの Anton / 小さい英字ラベル: Oswald
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const oswald = loadOswald("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const fonts = {
  jp: `${noto.fontFamily}, sans-serif`,
  num: `${anton.fontFamily}, ${noto.fontFamily}, sans-serif`,
  label: `${oswald.fontFamily}, ${noto.fontFamily}, sans-serif`,
};
