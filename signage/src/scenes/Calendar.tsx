import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { Fade, Kinetic, alpha, ease, fontFamily, lines, useLayout, useRise, useSpring } from "../components/kit";
import { fitSize } from "../fit";

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const ROWS = 5;
// ほかのお客さまの予約（埋まっている枠）。[列, 行]
const BUSY: [number, number][] = [
  [0, 1], [1, 3], [2, 0], [2, 4], [4, 2], [5, 0], [5, 1], [5, 3], [6, 2], [1, 4], [4, 4], [3, 1],
];
const TARGET: [number, number] = [3, 4];

/**
 * シーン2：来週のカレンダーの空き枠に、次回の予約がストンと入る。
 */
export const Calendar: React.FC<SignageProps> = ({ copy, ink, muted, accent, paper }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width } = useLayout();

  const cardW = portrait ? 920 * u : 800 * u;
  const pad = 40 * u;
  const headH = 70 * u;
  const cellW = (cardW - pad * 2) / 7;
  const cellH = portrait ? 150 * u : 108 * u;
  const gridH = cellH * ROWS;
  const cardH = pad * 2 + headH + gridH + 56 * u;

  const cardIn = useSpring(0, 16);
  const draw = useRise(6, 26);

  const DROP = 78;
  const drop = useSpring(DROP, 11, 0.9);
  const tap = interpolate(frame, [DROP - 12, DROP + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const check = interpolate(frame, [DROP + 14, DROP + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const ripple = interpolate(frame, [DROP + 6, DROP + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const emptyPulse = frame < DROP ? 0.5 + 0.5 * Math.sin(frame / 5) : 0;

  const cellX = (c: number) => pad + c * cellW;
  const cellY = (r: number) => pad + headH + r * cellH;
  const inset = 7 * u;

  const titleSize = fitSize(copy.calendarTitle, portrait ? 92 * u : 92 * u, portrait ? width - 140 * u : 780 * u);

  const grid = (
    <div
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        background: "#FFFFFF",
        borderRadius: 36 * u,
        boxShadow: `0 ${30 * u}px ${80 * u}px ${alpha(ink, 0.12)}, 0 ${2 * u}px ${6 * u}px ${alpha(ink, 0.06)}`,
        transform: `translateY(${(1 - cardIn) * 60 * u}px) scale(${0.94 + cardIn * 0.06})`,
        opacity: Math.min(1, cardIn * 1.4),
        fontFamily,
      }}
    >
      {/* 曜日 */}
      {DAYS.map((d, i) => (
        <div
          key={d}
          style={{
            position: "absolute",
            left: cellX(i),
            top: pad,
            width: cellW,
            height: headH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 32 * u,
            color: i === TARGET[0] && frame > DROP ? accent : i >= 5 ? alpha(ink, 0.55) : ink,
            opacity: interpolate(frame, [10 + i * 2, 22 + i * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {d}
        </div>
      ))}
      {/* 罫線 */}
      {Array.from({ length: ROWS + 1 }).map((_, r) => (
        <div
          key={`h${r}`}
          style={{
            position: "absolute",
            left: pad,
            top: cellY(r),
            width: (cardW - pad * 2) * draw,
            height: 2 * u,
            background: alpha(ink, 0.09),
          }}
        />
      ))}
      {Array.from({ length: 6 }).map((_, c) => (
        <div
          key={`v${c}`}
          style={{
            position: "absolute",
            left: cellX(c + 1),
            top: cellY(0),
            width: 2 * u,
            height: gridH * draw,
            background: alpha(ink, 0.06),
          }}
        />
      ))}
      {/* 埋まっている枠 */}
      {BUSY.map(([c, r], i) => {
        const t = interpolate(frame, [26 + i * 2.5, 38 + i * 2.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        return (
          <div
            key={`b${i}`}
            style={{
              position: "absolute",
              left: cellX(c) + inset,
              top: cellY(r) + inset,
              width: cellW - inset * 2,
              height: cellH - inset * 2,
              borderRadius: 14 * u,
              background: `repeating-linear-gradient(135deg, ${alpha(ink, 0.07)} 0 ${8 * u}px, ${alpha(ink, 0.03)} ${8 * u}px ${16 * u}px)`,
              opacity: t,
              transform: `scale(${0.8 + t * 0.2})`,
            }}
          />
        );
      })}
      {/* 空き枠（点線で呼ぶ） */}
      <div
        style={{
          position: "absolute",
          left: cellX(TARGET[0]) + inset,
          top: cellY(TARGET[1]) + inset,
          width: cellW - inset * 2,
          height: cellH - inset * 2,
          borderRadius: 14 * u,
          border: `${3 * u}px dashed ${alpha(accent, 0.35 + emptyPulse * 0.5)}`,
          opacity: interpolate(frame, [44, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          boxSizing: "border-box",
        }}
      />
      {/* 波紋 */}
      <div
        style={{
          position: "absolute",
          left: cellX(TARGET[0]) + cellW / 2,
          top: cellY(TARGET[1]) + cellH / 2,
          width: cellW * 2.4,
          height: cellW * 2.4,
          borderRadius: "50%",
          border: `${3 * u}px solid ${accent}`,
          transform: `translate(-50%, -50%) scale(${0.3 + ripple * 0.9})`,
          opacity: ripple > 0 ? (1 - ripple) * 0.6 : 0,
        }}
      />
      {/* 次回の予約ブロック */}
      <div
        style={{
          position: "absolute",
          left: cellX(TARGET[0]) + inset * 0.4,
          top: cellY(TARGET[1]) + inset * 0.4,
          width: cellW - inset * 0.8,
          height: cellH - inset * 0.8,
          borderRadius: 16 * u,
          background: accent,
          color: paper,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2 * u,
          transform: `translateY(${(1 - drop) * -260 * u}px) scale(${0.7 + drop * 0.3})`,
          opacity: frame < DROP ? 0 : Math.min(1, drop * 2),
          boxShadow: `0 ${14 * u}px ${30 * u}px ${alpha(accent, 0.45)}`,
          zIndex: 3,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 28 * u, lineHeight: 1 }}>{copy.slotLabel}</div>
        <div style={{ fontWeight: 700, fontSize: 22 * u, lineHeight: 1, opacity: 0.9, letterSpacing: "0.04em" }}>{copy.slotTime}</div>
        {/* チェック */}
        <svg
          width={40 * u}
          height={40 * u}
          viewBox="0 0 40 40"
          style={{ position: "absolute", right: -14 * u, top: -14 * u }}
        >
          <circle cx={20} cy={20} r={18} fill={paper} opacity={check > 0 ? 1 : 0} transform={`scale(${check})`} style={{ transformOrigin: "20px 20px" }} />
          <path d="M11 20.5 L17.5 27 L29 14" fill="none" stroke={accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check} />
        </svg>
      </div>
      {/* タップの指 */}
      <div
        style={{
          position: "absolute",
          left: cellX(TARGET[0]) + cellW / 2,
          top: cellY(TARGET[1]) + cellH / 2,
          width: 64 * u,
          height: 64 * u,
          borderRadius: "50%",
          background: alpha(ink, 0.18),
          border: `${3 * u}px solid ${alpha("#FFFFFF", 0.9)}`,
          transform: `translate(-50%, -50%) translate(${(1 - tap) * 120 * u}px, ${(1 - tap) * 140 * u}px) scale(${frame > DROP + 4 ? 0.8 : 1})`,
          opacity: interpolate(frame, [DROP - 16, DROP - 8, DROP + 10, DROP + 22], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          zIndex: 4,
        }}
      />
      {/* 凡例 */}
      <div
        style={{
          position: "absolute",
          left: pad,
          bottom: pad * 0.8,
          display: "flex",
          gap: 28 * u,
          fontSize: 22 * u,
          fontWeight: 500,
          color: muted,
          opacity: interpolate(frame, [40, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 * u }}>
          <span style={{ width: 22 * u, height: 22 * u, borderRadius: 6 * u, background: alpha(ink, 0.14) }} />
          ご予約済み
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 * u }}>
          <span style={{ width: 22 * u, height: 22 * u, borderRadius: 6 * u, background: accent }} />
          あなたの次回
        </span>
      </div>
    </div>
  );

  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 36 * u, alignItems: portrait ? "center" : "flex-start" }}>
      <Kinetic text={copy.calendarTitle} delay={14} size={titleSize} color={ink} align={portrait ? "center" : "left"} />
      <Fade delay={DROP + 20}>
        <div
          style={{
            fontFamily,
            fontWeight: 500,
            fontSize: (portrait ? 44 : 40) * u,
            lineHeight: 1.6,
            color: alpha(ink, 0.72),
            textAlign: portrait ? "center" : "left",
          }}
        >
          {lines(copy.calendarSub)}
        </div>
      </Fade>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: portrait ? "column" : "row",
        gap: portrait ? 90 * u : 100 * u,
        paddingTop: portrait ? 40 * u : 0,
      }}
    >
      {text}
      {grid}
    </AbsoluteFill>
  );
};
