import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SignageProps } from "../schema";
import { GOTHIC, Handwrite, MINCHO, Pen, Show, Type, alphaOf, fit, roughEllipse, roughPath, useLayout, useProgress } from "../components/kit";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const FIRST = 3; // 1日が水曜
const DAYS = 30;
const TODAY = 10;
const NEXT = 24; // 2週間後

/**
 * シーン2：壁掛けカレンダー。今日から2週間後の日付に、赤ペンで丸をつける。
 */
export const Calendar: React.FC<SignageProps> = ({ copy, ink, pen }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { portrait, u, width } = useLayout();

  const calW = portrait ? 940 * u : 860 * u;
  const cellW = calW / 7;
  const cellH = portrait ? 150 * u : 124 * u;
  const headH = 64 * u;
  const rows = Math.ceil((FIRST + DAYS) / 7);
  const calH = headH + rows * cellH;

  const pos = (d: number) => {
    const i = FIRST + d - 1;
    return { c: i % 7, r: Math.floor(i / 7) };
  };
  const cell = (d: number) => {
    const { c, r } = pos(d);
    return { x: c * cellW, y: headH + r * cellH };
  };

  const CIRCLE = 40;
  const circle = useProgress(CIRCLE, 15);
  const tick = useProgress(CIRCLE + 16, 5);
  const n = cell(NEXT);
  const numX = n.x + cellW * 0.32;
  const numY = n.y + cellH * 0.36;
  const t = cell(TODAY);

  // ゆっくり寄る（三脚で撮ったような、ごくわずかな動き）
  const push = interpolate(frame, [0, durationInFrames], [1, 1.035]);

  const dayColor = (c: number) => (c === 0 ? "#B2413A" : c === 6 ? "#3C5688" : ink);

  const cal = (
    <div style={{ position: "relative", width: calW, height: calH, transform: `scale(${push})`, transformOrigin: "60% 70%" }}>
      {WEEK.map((w, c) => (
        <div
          key={w}
          style={{
            position: "absolute",
            left: c * cellW,
            top: 0,
            width: cellW,
            height: headH,
            display: "flex",
            alignItems: "center",
            paddingLeft: cellW * 0.14,
            fontFamily: GOTHIC,
            fontWeight: 700,
            fontSize: 26 * u,
            color: dayColor(c),
            letterSpacing: "0.1em",
          }}
        >
          {w}
        </div>
      ))}
      {Array.from({ length: rows + 1 }).map((_, r) => (
        <div key={r} style={{ position: "absolute", left: 0, right: 0, top: headH + r * cellH, height: Math.max(1, 1.5 * u), background: alphaOf(ink, r === 0 ? 0.7 : 0.18) }} />
      ))}
      {Array.from({ length: DAYS }).map((_, i) => {
        const d = i + 1;
        const { c } = pos(d);
        const { x, y } = cell(d);
        const past = d < TODAY;
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: x + cellW * 0.14,
              top: y + cellH * 0.1,
              fontFamily: MINCHO,
              fontWeight: 700,
              fontSize: (portrait ? 52 : 46) * u,
              lineHeight: 1,
              color: dayColor(c),
              opacity: past ? 0.32 : 1,
            }}
          >
            {d}
          </div>
        );
      })}
      {/* 今日：鉛筆の小さな書き込み */}
      <Handwrite
        text="今日"
        at={14}
        perChar={4}
        size={30 * u}
        color={alphaOf(ink, 0.6)}
        seed="today"
        style={{ position: "absolute", left: t.x + cellW * 0.14, top: t.y + cellH * 0.58 }}
      />
      {/* 次回：赤ペンの丸と書き込み */}
      <svg width={calW} height={calH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <Pen d={roughEllipse(numX, numY, cellW * 0.42, cellH * 0.4, "circle")} progress={circle} color={pen} width={6 * u} />
        <Pen
          d={roughPath([[numX + cellW * 0.45, numY + cellH * 0.25], [numX + cellW * 0.75, numY + cellH * 0.55], [numX + cellW * 0.95, numY + cellH * 0.72]], "tick", 4 * u)}
          progress={tick}
          color={pen}
          width={5 * u}
        />
      </svg>
      <Handwrite
        text={copy.calendarMark}
        at={CIRCLE + 20}
        perChar={6}
        size={(portrait ? 72 : 66) * u}
        color={pen}
        seed="mark"
        style={{ position: "absolute", left: numX + cellW * 0.75, top: numY + cellH * 0.55, transform: "rotate(-8deg)" }}
      />
    </div>
  );

  if (portrait) {
    const size = fit(copy.calendarTitle, 96 * u, width - 200 * u);
    return (
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div style={{ position: "absolute", top: 300 * u }}>{cal}</div>
        <Show at={4} style={{ position: "absolute", left: 100 * u, top: 1300 * u }}>
          <Type text={copy.calendarTitle} size={size} color={ink} weight={900} />
        </Show>
      </AbsoluteFill>
    );
  }

  const size = fit(copy.calendarTitle, 84 * u, 700 * u);
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 160 * u, gap: 90 * u }}>
      <Show at={4} style={{ width: 640 * u, flexShrink: 0 }}>
        <Type text={copy.calendarTitle} size={size} color={ink} />
      </Show>
      <div style={{ marginTop: 40 * u }}>{cal}</div>
    </AbsoluteFill>
  );
};

