import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// 書体は public/fonts に同梱（Zen Kaku Gothic New / SIL OFL）。
// オフラインでも書き出せて、日本語の全文字がそろう。
export const fontFamily = "Zen Kaku Gothic New";
for (const [weight, file] of [
  ["500", "Medium"],
  ["700", "Bold"],
  ["900", "Black"],
] as const) {
  loadFont({ family: fontFamily, url: staticFile(`fonts/ZenKakuGothicNew-${file}.ttf`), weight });
}

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** 0→1 のなめらかな立ち上がり（delay フレーム後から dur フレームで） */
export const useRise = (delay: number, dur = 18) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

export const useSpring = (delay: number, damping = 14, mass = 0.8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
};

/** 横長か縦長か。サイズは短辺基準の u（1u = 短辺/1080）で決める */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;
  return { portrait, u, width, height };
};

/**
 * 1文字ずつ下から立ち上がる見出し。「\n」で改行。
 * 行ごとにまとまって読めるよう、行の頭で少しだけ間をあける。
 */
export const Kinetic: React.FC<{
  text: string;
  delay: number;
  size: number;
  color: string;
  weight?: number;
  stagger?: number;
  lineHeight?: number;
  align?: "left" | "center";
  highlight?: { word: string; color: string };
}> = ({
  text,
  delay,
  size,
  color,
  weight = 900,
  stagger = 1.6,
  lineHeight = 1.32,
  align = "left",
  highlight,
}) => {
  const frame = useCurrentFrame();
  const lines = text.split("\n");
  let index = 0;
  return (
    <div
      style={{
        fontFamily,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        textAlign: align,
        letterSpacing: "0.02em",
        fontFeatureSettings: '"palt" 1',
      }}
    >
      {lines.map((line, li) => {
        const hiStart = highlight ? line.indexOf(highlight.word) : -1;
        const hiEnd = hiStart >= 0 ? hiStart + highlight!.word.length : -1;
        const chars = [...line];
        const row = (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {chars.map((ch, ci) => {
              const d = delay + index * stagger + li * 6;
              index++;
              const t = interpolate(frame, [d, d + 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
              });
              const hi = ci >= hiStart && ci < hiEnd;
              return (
                <span
                  key={ci}
                  style={{
                    display: "inline-block",
                    opacity: t,
                    transform: `translateY(${(1 - t) * 0.42}em)`,
                    color: hi ? highlight!.color : undefined,
                  }}
                >
                  {ch === " " ? " " : ch}
                </span>
              );
            })}
          </div>
        );
        return row;
      })}
    </div>
  );
};

/** 文全体をふわっと出す（本文・補足用） */
export const Fade: React.FC<{
  delay: number;
  children: React.ReactNode;
  y?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, y = 24, style }) => {
  const t = useRise(delay, 22);
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const lines = (text: string) =>
  text.split("\n").map((l, i) => (
    <div key={i} style={{ whiteSpace: "nowrap" }}>
      {l}
    </div>
  ));

/** #RRGGBB に透明度を足す */
export const alpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
