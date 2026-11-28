import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { Hairlines, Reveal, Tag, Underline } from "../components/parts";

export const POINT_GAP = 54; // 各ポイントが出てくる間隔(フレーム)

/** 3. コツ3つ(チャコール): POINT 01〜03。白抜きの数字 + 白とライムの2行 + 下線 + 説明 */
export const Points: React.FC<{ p: SignageProps }> = ({ p }) => {
  const { u, width, portrait } = useLayout();
  const { base, lime, text, deep } = p.palette;
  const pad = (portrait ? 80 : 100) * u;

  const numSize = (portrait ? 250 : 200) * u;
  const colW = portrait ? width - pad * 2 - numSize * 0.95 - 40 * u : (width - pad * 2 - 80 * u * 2) / 3;

  const Block: React.FC<{ i: number }> = ({ i }) => {
    const pt = p.points[i];
    const at = 14 + i * POINT_GAP;
    const t1 = fit(pt.line1, (portrait ? 78 : 64) * u, colW);
    const t2 = fit(pt.line2, (portrait ? 78 : 64) * u, colW);
    const cap = fit(pt.caption, (portrait ? 34 : 30) * u, colW);
    return (
      <div style={{ display: "flex", flexDirection: portrait ? "row" : "column", alignItems: portrait ? "flex-start" : "flex-start", gap: (portrait ? 40 : 10) * u }}>
        <Reveal at={at} dx={-30}>
          <div style={{ fontFamily: fonts.label, fontWeight: 700, fontSize: 26 * u, color: lime, letterSpacing: 4 * u, marginBottom: -12 * u }}>
            POINT
          </div>
          <div
            style={{
              fontFamily: fonts.num,
              fontSize: numSize,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `${3 * u}px ${lime}`,
              width: numSize * 0.95,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
        </Reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 * u, paddingTop: (portrait ? 56 : 0) * u, width: colW }}>
          <Reveal at={at + 8}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: t1, color: text, lineHeight: 1.25, whiteSpace: "nowrap" }}>{pt.line1}</div>
          </Reveal>
          <Reveal at={at + 14}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: t2, color: lime, lineHeight: 1.25, whiteSpace: "nowrap" }}>{pt.line2}</div>
          </Reveal>
          <div style={{ margin: `${12 * u}px 0 ${14 * u}px` }}>
            <Underline at={at + 18} color={lime} thickness={5 * u} />
          </div>
          <Reveal at={at + 24}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 700, fontSize: cap, color: text, whiteSpace: "nowrap" }}>{pt.caption}</div>
          </Reveal>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: base }}>
      <Hairlines />
      <div style={{ position: "absolute", left: pad, top: (portrait ? 120 : 70) * u }}>
        <Tag text={p.pointsTag} bg={lime} color={deep} at={2} />
      </div>
      <AbsoluteFill
        style={{
          padding: `0 ${pad}px`,
          justifyContent: "center",
          flexDirection: portrait ? "column" : "row",
          alignItems: portrait ? "stretch" : "center",
          gap: (portrait ? 70 : 80) * u,
          paddingBottom: (portrait ? 0 : 20) * u,
          paddingTop: (portrait ? 60 : 40) * u,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Block key={i} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
