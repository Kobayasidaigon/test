import React from "react";
import { interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

// 書体は public/fonts に同梱（すべて SIL OFL 1.1）。
//   明朝：Zen Old Mincho … 見出し。ポスターの組版の強さ
//   手書き：Zen Kurenaido … 赤ペンの書き込み
//   ゴシック：Zen Kaku Gothic New … 小さな補足だけ
export const MINCHO = "Zen Old Mincho";
export const HAND = "Zen Kurenaido";
export const GOTHIC = "Zen Kaku Gothic New";

const FONTS: [string, string, string][] = [
  [MINCHO, "ZenOldMincho-Bold.ttf", "700"],
  [MINCHO, "ZenOldMincho-Black.ttf", "900"],
  [HAND, "ZenKurenaido-Regular.ttf", "400"],
  [GOTHIC, "ZenKakuGothicNew-Medium.ttf", "500"],
  [GOTHIC, "ZenKakuGothicNew-Bold.ttf", "700"],
];
for (const [family, file, weight] of FONTS) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight });
}

/** 横長か縦長か。1u = 短辺/1080 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;
  return { portrait, u, width, height };
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** f フレーム目から n フレームで 0→1（直線。手の動きはほぼ等速なので、イージングはかけない） */
export const useProgress = (from: number, n: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + n], [0, 1], clamp);
};

/** 一瞬で出す（ポスターの切り替えのように、ふわっとさせない）。2フレームだけなじませる */
export const Show: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2], [0, 1], clamp);
  return <div style={{ opacity: o, ...style }}>{children}</div>;
};

/** 明朝の組版。vertical=true で縦組み */
export const Type: React.FC<{
  text: string;
  size: number;
  color: string;
  vertical?: boolean;
  weight?: 700 | 900;
  leading?: number;
  style?: React.CSSProperties;
}> = ({ text, size, color, vertical = false, weight = 900, leading = 1.45, style }) => (
  <div
    style={{
      fontFamily: MINCHO,
      fontWeight: weight,
      fontSize: size,
      lineHeight: leading,
      color,
      writingMode: vertical ? "vertical-rl" : "horizontal-tb",
      fontFeatureSettings: '"palt" 1',
      letterSpacing: vertical ? "0.08em" : "0.02em",
      whiteSpace: "pre",
      ...style,
    }}
  >
    {vertical ? upright(text) : text}
  </div>
);

/** 縦組みで半角の数字・英字を立てる（縦中横）。「1回」の1が横倒しにならないように */
const upright = (text: string) =>
  text.split(/([0-9A-Za-z]{1,3})/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ textCombineUpright: "all" }}>
        {part}
      </span>
    ) : (
      part
    ),
  );

/**
 * 手書きの文字が、書く速さで1文字ずつ現れる。
 * 文字ごとに少しだけ傾きと位置をずらして、活字っぽさを消す。
 */
export const Handwrite: React.FC<{
  text: string;
  at: number;
  size: number;
  color: string;
  vertical?: boolean;
  perChar?: number;
  seed?: string;
  style?: React.CSSProperties;
}> = ({ text, at, size, color, vertical = false, perChar = 5, seed = "h", style }) => {
  const frame = useCurrentFrame();
  let i = 0;
  return (
    <div
      style={{
        fontFamily: HAND,
        fontSize: size,
        lineHeight: 1.25,
        color,
        writingMode: vertical ? "vertical-rl" : "horizontal-tb",
        whiteSpace: "pre",
        ...style,
      }}
    >
      {text.split("\n").map((line, li) => (
        <div key={li}>
          {[...line].map((ch, ci) => {
            const start = at + i * perChar + li * 6;
            i++;
            const p = interpolate(frame, [start, start + perChar + 1], [0, 100], clamp);
            const r = (random(`${seed}-r-${li}-${ci}`) - 0.5) * 7;
            const dx = (random(`${seed}-x-${li}-${ci}`) - 0.5) * 0.06;
            const dy = (random(`${seed}-y-${li}-${ci}`) - 0.5) * 0.08;
            return (
              <span
                key={ci}
                style={{
                  display: "inline-block",
                  transform: `translate(${dx}em, ${dy}em) rotate(${r}deg)`,
                  clipPath: vertical ? `inset(0 0 ${100 - p}% 0)` : `inset(0 ${100 - p}% 0 0)`,
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** 文字数×速さ＝書き終わるまでのフレーム数 */
export const writeFrames = (text: string, perChar = 5) => [...text.replace(/\n/g, "")].length * perChar + 6;

/**
 * 手で引いた線。点を少しずつ揺らし、なめらかにつなぐ。
 * 2本重ねて、ペンの太さのムラを出す。
 */
export const roughPath = (pts: [number, number][], seed: string, wobble: number) => {
  const jittered = pts.map(([x, y], i) => [
    x + (random(`${seed}-px-${i}`) - 0.5) * wobble,
    y + (random(`${seed}-py-${i}`) - 0.5) * wobble,
  ]);
  let d = `M ${jittered[0][0]} ${jittered[0][1]}`;
  for (let i = 1; i < jittered.length; i++) {
    const [x0, y0] = jittered[i - 1];
    const [x1, y1] = jittered[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q ${x0} ${y0} ${mx} ${my}`;
    if (i === jittered.length - 1) d += ` T ${x1} ${y1}`;
  }
  return d;
};

/** 手書きの楕円（描き始めと終わりが少し重なってはみ出す） */
export const roughEllipse = (cx: number, cy: number, rx: number, ry: number, seed: string) => {
  const pts: [number, number][] = [];
  const start = -2.2 + random(`${seed}-s`) * 0.4;
  const turns = 1.12;
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = start + (i / n) * Math.PI * 2 * turns;
    const grow = 1 + (i / n) * 0.08; // 描き終わりは少し外へずれる
    pts.push([cx + Math.cos(t) * rx * grow, cy + Math.sin(t) * ry * grow]);
  }
  return roughPath(pts, seed, Math.min(rx, ry) * 0.06);
};

/** 描かれていく線（stroke-dashoffset）。pathLength=1 で長さをそろえる */
export const Pen: React.FC<{
  d: string;
  progress: number;
  color: string;
  width: number;
  opacity?: number;
}> = ({ d, progress, color, width, opacity = 0.92 }) => (
  <>
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
      opacity={progress > 0 ? opacity : 0}
    />
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width * 0.55}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
      opacity={progress > 0 ? 0.5 : 0}
      transform={`translate(${width * 0.18}, ${-width * 0.12})`}
    />
  </>
);

/** 紙の地。ごく弱いざらつきを重ねる（フラットなデジタル感を消す） */
export const Paper: React.FC<{ color: string; dark?: boolean }> = ({ color, dark = false }) => (
  <div style={{ position: "absolute", inset: 0, background: color }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, mixBlendMode: dark ? "screen" : "multiply", opacity: dark ? 0.08 : 0.5 }}>
      <filter id={dark ? "grain-d" : "grain"}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed={3} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0.16 0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${dark ? "grain-d" : "grain"})`} />
    </svg>
  </div>
);

/** 1行の幅（em）。全角=1、句読点=0.5（palt）、半角=0.55 */
export const textEm = (line: string) =>
  [...line].reduce((w, ch) => w + (/[、。，．・]/.test(ch) ? 0.5 : /[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0);

/** はみ出さない文字サイズ */
export const fit = (text: string, base: number, max: number, spacing = 0.02) => {
  const widest = Math.max(...text.split("\n").map(textEm));
  return widest ? Math.min(base, max / (widest * (1 + spacing))) : base;
};

/** #RRGGBB に透明度を足す */
export const alphaOf = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
