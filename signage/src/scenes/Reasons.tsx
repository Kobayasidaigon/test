import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { Kinetic, alpha, ease, fontFamily, lines, useLayout, useSpring } from "../components/kit";
import { fitSize } from "../fit";

/** 理由ごとの小さな線画アイコン（24×24） */
const ICONS = [
  // 枠を押さえる：カレンダー＋チェック
  "M4 7h16v13H4z M4 11h16 M8 4v5 M16 4v5 M9 15.5l2 2 4-4",
  // 間があかない：つながる線
  "M3 17c3 0 3-10 6-10s3 10 6 10 3-10 6-10",
  // 変更も大丈夫：入れ替えの矢印
  "M4 9h13l-3-3 M20 15H7l3 3",
];

/**
 * シーン3：いま予約すると、いいこと ×3。
 */
export const Reasons: React.FC<SignageProps> = ({ copy, ink, accent }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width } = useLayout();

  const titleSize = fitSize(copy.reasonsTitle, portrait ? 88 * u : 88 * u, width - 160 * u);
  const cardW = portrait ? 880 * u : 520 * u;
  const textSize = portrait ? 56 * u : 46 * u;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: portrait ? 0 : 20 * u }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: (portrait ? 100 : 80) * u }}>
        <Kinetic text={copy.reasonsTitle} delay={4} size={titleSize} color={ink} align="center" />
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: (portrait ? 44 : 40) * u }}>
          {copy.reasons.map((r, i) => {
            const d = 26 + i * 16;
            const s = useSpring(d, 15);
            const line = interpolate(frame, [d + 6, d + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
            return (
              <div
                key={i}
                style={{
                  width: cardW,
                  boxSizing: "border-box",
                  padding: portrait ? `${60 * u}px ${56 * u}px` : `${48 * u}px ${48 * u}px ${56 * u}px`,
                  background: "#FFFFFF",
                  borderRadius: 32 * u,
                  boxShadow: `0 ${24 * u}px ${60 * u}px ${alpha(ink, 0.09)}`,
                  opacity: Math.min(1, s * 1.5),
                  transform: `translateY(${(1 - s) * 80 * u}px)`,
                  display: "flex",
                  flexDirection: portrait ? "row" : "column",
                  alignItems: portrait ? "center" : "flex-start",
                  gap: (portrait ? 40 : 34) * u,
                  fontFamily,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 * u, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 96 * u,
                      height: 96 * u,
                      borderRadius: 28 * u,
                      background: alpha(accent, 0.12),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width={56 * u} height={56 * u} viewBox="0 0 24 24">
                      <path
                        d={ICONS[i]}
                        fill="none"
                        stroke={accent}
                        strokeWidth={1.9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={1 - line}
                      />
                    </svg>
                  </div>
                  {!portrait && (
                    <div style={{ fontWeight: 900, fontSize: 30 * u, color: accent, letterSpacing: "0.08em" }}>
                      0{i + 1}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: textSize, lineHeight: 1.45, color: ink, letterSpacing: "0.01em" }}>
                  {lines(r)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
