import React from "react";
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

// 書体は public/fonts に同梱（SIL OFL 1.1）
//   Dela Gothic One … 見出し。太くて丸みのある、ポップで強いゴシック
//   Zen Kaku Gothic New … 小さな補足だけ
export const DISPLAY = "Dela Gothic One";
export const GOTHIC = "Zen Kaku Gothic New";
for (const [family, file, weight] of [
  [DISPLAY, "DelaGothicOne-Regular.ttf", "400"],
  [GOTHIC, "ZenKakuGothicNew-Medium.ttf", "500"],
  [GOTHIC, "ZenKakuGothicNew-Bold.ttf", "700"],
] as const) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 横長か縦長か。1u = 短辺/1080 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;
  return { portrait, u, width, height };
};

/** 叩きつけるように出る：大きめから一気に縮んで止まる */
export const useSlam = (at: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 420, mass: 0.55 } });
  return { visible: frame >= at, scale: 1.45 - 0.45 * s };
};

export const Slam: React.FC<{
  at: number;
  children: React.ReactNode;
  origin?: string;
  style?: React.CSSProperties;
}> = ({ at, children, origin = "left center", style }) => {
  const { visible, scale } = useSlam(at);
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: `scale(${scale})`, transformOrigin: origin, ...style }}>
      {children}
    </div>
  );
};

/** 叩きつけた瞬間に画面が少し揺れる。hits = 叩くフレームの一覧 */
export const useShake = (hits: number[], power: number) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const t = frame - h;
    if (t < 0 || t > 9) continue;
    const decay = 1 - t / 9;
    x += Math.sin(t * 2.6) * power * decay;
    y += Math.cos(t * 3.3) * power * 0.6 * decay;
  }
  return `translate(${x}px, ${y}px)`;
};

/** 見出しの文字 */
export const Big: React.FC<{
  text: string;
  size: number;
  color: string;
  leading?: number;
  style?: React.CSSProperties;
}> = ({ text, size, color, leading = 1.12, style }) => (
  <div
    style={{
      fontFamily: DISPLAY,
      fontSize: size,
      lineHeight: leading,
      color,
      whiteSpace: "pre",
      fontFeatureSettings: '"palt" 1',
      letterSpacing: "0.01em",
      ...style,
    }}
  >
    {text}
  </div>
);

/**
 * 次のシーンの色が斜めにさっと横切って、画面を塗りかえる。
 * シーンの終わり（end の dur フレーム前から）に重ねる。
 */
export const Wipe: React.FC<{ color: string; end: number; dur?: number }> = ({ color, end, dur = 8 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = interpolate(frame, [end - dur, end], [0, 1], clamp);
  if (p <= 0) return null;
  const span = width + height * 0.6;
  const x = -height * 0.6 + p * span;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
      <polygon points={`0,0 ${x + height * 0.6},0 ${x},${height} 0,${height}`} fill={color} />
    </svg>
  );
};

/** 1行の幅（em）。全角=1、句読点=0.55、半角=0.6 */
export const textEm = (line: string) =>
  [...line].reduce(
    (w, ch) =>
      w + (/[、。，．・？！]/.test(ch) ? 0.6 : /[0-9]/.test(ch) ? 0.8 : /[:.]/.test(ch) ? 0.4 : /[\x20-\x7e]/.test(ch) ? 0.7 : 1),
    0,
  );

/** はみ出さない文字サイズ */
export const fit = (text: string, base: number, max: number) => {
  const widest = Math.max(...text.split("\n").map(textEm));
  return widest ? Math.min(base, max / (widest * 1.03)) : base;
};
