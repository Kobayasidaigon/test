import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { SignageProps } from "./schema";
import { alpha, fontFamily, useLayout } from "./components/kit";
import { Hook } from "./scenes/Hook";
import { Calendar } from "./scenes/Calendar";
import { Reasons } from "./scenes/Reasons";
import { Cta } from "./scenes/Cta";

export const FPS = 30;
export const SCENES = [
  { key: "hook", frames: 165, C: Hook },
  { key: "calendar", frames: 215, C: Calendar },
  { key: "reasons", frames: 170, C: Reasons },
  { key: "cta", frames: 215, C: Cta },
] as const;
export const T = 15; // シーン間のクロスフェード
export const TOTAL = SCENES.reduce((s, x) => s + x.frames, 0) - T * (SCENES.length - 1);

/** うっすら動く方眼の背景（店内照明の下でも白飛びしない紙色） */
const Paper: React.FC<{ paper: string; ink: string; accent: string }> = ({ paper, ink, accent }) => {
  const frame = useCurrentFrame();
  const { u, width, height } = useLayout();
  const step = 120 * u;
  const drift = (frame * 0.25 * u) % step;
  return (
    <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(ink, 0.045)} ${1.5 * u}px, transparent ${1.5 * u}px), linear-gradient(90deg, ${alpha(ink, 0.045)} ${1.5 * u}px, transparent ${1.5 * u}px)`,
          backgroundSize: `${step}px ${step}px`,
          backgroundPosition: `${-drift}px ${-drift}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: Math.max(width, height) * 0.9,
          height: Math.max(width, height) * 0.9,
          right: -Math.max(width, height) * 0.35,
          bottom: -Math.max(width, height) * 0.45,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(accent, 0.13)}, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** 常に出ている枠：店名・案内ラベル・進行バー */
const Chrome: React.FC<SignageProps> = ({ storeName, ink, muted, accent }) => {
  const frame = useCurrentFrame();
  const { portrait, u } = useLayout();
  const m = (portrait ? 72 : 76) * u;

  let start = 0;
  const segs = SCENES.map((s, i) => {
    const from = start;
    start += s.frames - (i < SCENES.length - 1 ? T : 0);
    const to = start;
    return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  });

  return (
    <AbsoluteFill style={{ fontFamily, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: m,
          left: m,
          right: m,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 30 * u, letterSpacing: "0.22em", color: ink }}>{storeName}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12 * u,
            fontWeight: 700,
            fontSize: 24 * u,
            letterSpacing: "0.14em",
            color: muted,
          }}
        >
          <svg width={30 * u} height={30 * u} viewBox="0 0 24 24">
            <path d="M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" />
            <rect x={13} y={13} width={4} height={4} rx={1} fill={accent} />
          </svg>
          NEXT VISIT
        </div>
      </div>
      <div style={{ position: "absolute", left: m, right: m, bottom: m * 0.8, display: "flex", gap: 12 * u }}>
        {segs.map((p, i) => (
          <div key={i} style={{ flex: 1, height: 6 * u, borderRadius: 99, background: alpha(ink, 0.09), overflow: "hidden" }}>
            <div style={{ width: `${p * 100}%`, height: "100%", background: p >= 1 ? alpha(ink, 0.28) : accent }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Signage: React.FC<SignageProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // ループ再生でつなぎ目が見えないよう、最後に紙色へ戻す
  const outro = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Paper paper={props.paper} ink={props.ink} accent={props.accent} />
      <AbsoluteFill style={{ opacity: outro }}>
        <TransitionSeries>
          {SCENES.flatMap(({ key, frames, C }, i) => {
            const seq = (
              <TransitionSeries.Sequence key={key} durationInFrames={frames}>
                <C {...props} />
              </TransitionSeries.Sequence>
            );
            return i < SCENES.length - 1
              ? [seq, <TransitionSeries.Transition key={`${key}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: T })} />]
              : [seq];
          })}
        </TransitionSeries>
      </AbsoluteFill>
      <Chrome {...props} />
    </AbsoluteFill>
  );
};
