import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import QRCode from "qrcode";
import { useLayout } from "../layout";
import { fonts } from "../fonts";

const ease = Easing.out(Easing.exp);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 の進み具合(start から dur フレームで) */
export const useProgress = (start: number, dur = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });
};

/** 左から少しスライドしながらフェードイン。CM の文字の出方 */
export const Reveal: React.FC<{
  at: number;
  dur?: number;
  dx?: number;
  dy?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dur = 14, dx = -40, dy = 0, style, children }) => {
  const { u } = useLayout();
  const p = useProgress(at, dur);
  return (
    <div style={{ opacity: p, transform: `translate(${(1 - p) * dx * u}px, ${(1 - p) * dy * u}px)`, ...style }}>{children}</div>
  );
};

/** ライムの箱が左から伸びて、そのあと文字が出る */
export const BoxReveal: React.FC<{
  at: number;
  bg: string;
  color: string;
  fontSize: number;
  padding?: string;
  weight?: number;
  children: React.ReactNode;
}> = ({ at, bg, color, fontSize, padding, weight = 900, children }) => {
  const box = useProgress(at, 10);
  const txt = useProgress(at + 6, 12);
  const { u } = useLayout();
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ position: "absolute", inset: 0, background: bg, transformOrigin: "left center", transform: `scaleX(${box})` }} />
      <div
        style={{
          position: "relative",
          fontFamily: fonts.jp,
          fontWeight: weight,
          fontSize,
          color,
          padding: padding ?? `${fontSize * 0.08}px ${fontSize * 0.18}px`,
          lineHeight: 1.25,
          whiteSpace: "nowrap",
          opacity: txt,
          transform: `translateX(${(1 - txt) * -20 * u}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 左から引かれる下線 */
export const Underline: React.FC<{ at: number; color: string; thickness: number; width?: string | number }> = ({
  at,
  color,
  thickness,
  width = "100%",
}) => {
  const p = useProgress(at, 16);
  return <div style={{ width, height: thickness, background: color, transformOrigin: "left center", transform: `scaleX(${p})` }} />;
};

/** 背景: チャコールに細い斜線がうっすら流れる */
export const Hairlines: React.FC<{ color?: string; opacity?: number }> = ({ color = "#ffffff", opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const shift = frame * 0.6 * u;
  const line = (gap: number, w: number) =>
    `repeating-linear-gradient(104deg, ${color} 0 ${w * u}px, transparent ${w * u}px ${gap * u}px)`;
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `${line(47, 1.2)}, ${line(83, 1.6)}, ${line(131, 1)}`,
        backgroundPosition: `${shift}px 0, ${-shift * 0.6}px 0, ${shift * 0.3}px 0`,
      }}
    />
  );
};

/** 背景に大きく流れる白抜き英字(ライムのパネル用) */
export const OutlineWords: React.FC<{ text: string; color: string; opacity?: number }> = ({ text, color, opacity = 0.22 }) => {
  const frame = useCurrentFrame();
  const { u, height } = useLayout();
  const size = 300 * u;
  const rows = Math.ceil(height / (size * 0.95)) + 1;
  const words = `${text} ${text} ${text} ${text} `;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", transform: "rotate(-4deg) scale(1.15)" }}>
      {Array.from({ length: rows }).map((_, r) => {
        const dir = r % 2 === 0 ? -1 : 1;
        const x = dir * frame * 2.2 * u - (r % 2 === 0 ? 0 : size * 4);
        return (
          <div
            key={r}
            style={{
              position: "absolute",
              top: r * size * 0.95 - size * 0.4,
              left: 0,
              whiteSpace: "nowrap",
              fontFamily: fonts.num,
              fontSize: size,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `${3 * u}px ${color}`,
              transform: `translateX(${x}px)`,
              letterSpacing: 6 * u,
            }}
          >
            {words}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 斜めのライムの面が画面を横切る切り替え。at で真ん中(画面が完全に隠れる瞬間)を迎える */
export const SlantWipe: React.FC<{ at: number; color: string; under?: string; dur?: number }> = ({ at, color, under, dur = 18 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const half = dur / 2;
  const t = interpolate(frame, [at - half, at + half], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (frame < at - half || frame > at + half) return null;
  const slant = height * 0.35;
  const W = width + slant * 2;
  // 右の画面外 → 左の画面外へ
  const x = interpolate(t, [0, 1], [width + slant, -W - slant]);
  const band = (dx: number, c: string, w: number) => (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: x + dx,
        width: w,
        background: c,
        clipPath: `polygon(${slant}px 0, 100% 0, calc(100% - ${slant}px) 100%, 0 100%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ zIndex: 100, pointerEvents: "none" }}>
      {under ? band(slant * 0.9, under, W) : null}
      {band(0, color, W)}
    </AbsoluteFill>
  );
};

/** 小さいラベル(左上の「〜の方へ」) */
export const Tag: React.FC<{ text: string; bg: string; color: string; at?: number }> = ({ text, bg, color, at = 0 }) => {
  const { u } = useLayout();
  return (
    <Reveal at={at} dx={-20}>
      <span
        style={{
          display: "inline-block",
          background: bg,
          color,
          fontFamily: fonts.jp,
          fontWeight: 700,
          fontSize: 34 * u,
          padding: `${4 * u}px ${18 * u}px`,
          letterSpacing: 1 * u,
        }}
      >
        {text}
      </span>
    </Reveal>
  );
};

/** QRコード(SVG)。描画は同期なのでレンダリングが安定する */
export const Qr: React.FC<{ text: string; size: number; fg: string; bg: string }> = ({ text, size, fg, bg }) => {
  const qr = React.useMemo(() => QRCode.create(text || " ", { errorCorrectionLevel: "M" }), [text]);
  const n = qr.modules.size;
  const quiet = 2;
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) cells.push(<rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width={1.02} height={1.02} />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill={bg} />
      <g fill={fg}>{cells}</g>
    </svg>
  );
};

/** 改行(\n)を <br/> にする */
export const Lines: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split("\n").map((l, i, arr) => (
      <React.Fragment key={i}>
        {l}
        {i < arr.length - 1 ? <br /> : null}
      </React.Fragment>
    ))}
  </>
);

/** 動画の最後の数フレームで暗転(ループ再生時に頭へ自然につながる) */
export const EndFade: React.FC<{ color: string; frames?: number }> = ({ color, frames = 14 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [durationInFrames - frames, durationInFrames - 1], [0, 1], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o, zIndex: 200 }} />;
};
