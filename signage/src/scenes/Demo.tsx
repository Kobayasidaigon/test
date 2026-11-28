import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { Hairlines, Reveal } from "../components/parts";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const TARGET_DAY = 18; // 指でタップする日(見た目だけ)
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** スマホのカレンダーに予定が入るアニメーション(ブランド配色) */
const Phone: React.FC<{ p: SignageProps; scale: number }> = ({ p, scale: s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { lime, deep } = p.palette;
  const W = 520 * s;
  const H = 1020 * s;
  const screen = "#2E3338";
  const frameC = "#111315";

  const TAP = 46;
  const DROP = 58;
  const BELL = 86;
  const fingerIn = interpolate(frame, [16, TAP], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const fingerOut = interpolate(frame, [TAP + 10, TAP + 28], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const press = frame >= TAP && frame < TAP + 7 ? 0.88 : 1;
  const ripple = interpolate(frame, [TAP, TAP + 16], [0, 1], clamp);
  const drop = spring({ frame: frame - DROP, fps, config: { damping: 16, stiffness: 180 } });
  const bell = frame >= BELL ? Math.sin((frame - BELL) * 0.9) * 16 * Math.max(0, 1 - (frame - BELL) / 30) : 0;
  const bellIn = interpolate(frame, [BELL - 4, BELL + 4], [0, 1], clamp);

  const inner = W - 44 * s;
  const cols = 7;
  const firstDow = 3;
  const days = 30;
  const cell = (inner - 48 * s) / cols;
  const gridTop = 250 * s;
  const rowH = cell * 0.9;
  const idx = firstDow + TARGET_DAY - 1;
  const tx = 24 * s + (idx % cols) * cell + cell / 2;
  const ty = gridTop + 56 * s + Math.floor(idx / cols) * rowH + rowH / 2;

  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: 78 * s, background: frameC, padding: 22 * s, boxSizing: "border-box" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 58 * s, background: screen, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 22 * s, left: "50%", width: 150 * s, height: 40 * s, marginLeft: -75 * s, borderRadius: 99, background: frameC }} />
        <div style={{ padding: `${100 * s}px ${34 * s}px 0` }}>
          <div style={{ fontFamily: fonts.label, fontWeight: 700, fontSize: 28 * s, color: lime, letterSpacing: 3 * s }}>CALENDAR</div>
          <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: 56 * s, color: "#fff", lineHeight: 1.3 }}>次回の予定</div>
        </div>
        <div style={{ position: "absolute", top: gridTop, left: 24 * s, display: "flex" }}>
          {WEEK.map((w, i) => (
            <div key={w} style={{ width: cell, textAlign: "center", fontFamily: fonts.jp, fontWeight: 700, fontSize: 24 * s, color: i === 0 ? lime : "#9AA1A8" }}>
              {w}
            </div>
          ))}
        </div>
        {Array.from({ length: days }).map((_, d) => {
          const k = firstDow + d;
          const isT = d + 1 === TARGET_DAY;
          const on = isT && frame >= TAP + 2;
          return (
            <div
              key={d}
              style={{
                position: "absolute",
                left: 24 * s + (k % cols) * cell,
                top: gridTop + 56 * s + Math.floor(k / cols) * rowH,
                width: cell,
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: cell * 0.8,
                  height: cell * 0.8,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? lime : "transparent",
                  color: on ? deep : "#fff",
                  fontFamily: fonts.num,
                  fontSize: 32 * s,
                  transform: isT ? `scale(${press})` : undefined,
                }}
              >
                {d + 1}
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: tx - 70 * s,
            top: ty - 70 * s,
            width: 140 * s,
            height: 140 * s,
            borderRadius: 999,
            border: `${5 * s}px solid ${lime}`,
            transform: `scale(${0.3 + ripple})`,
            opacity: frame >= TAP ? 1 - ripple : 0,
          }}
        />
        {/* 予定カード */}
        <div
          style={{
            position: "absolute",
            left: 24 * s,
            right: 24 * s,
            bottom: 54 * s,
            background: lime,
            borderRadius: 26 * s,
            padding: `${24 * s}px ${30 * s}px`,
            display: "flex",
            alignItems: "center",
            gap: 20 * s,
            transform: `translateY(${(1 - drop) * 420 * s}px)`,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 700, fontSize: 26 * s, color: deep }}>
              {TARGET_DAY}日 {p.demo.eventTime}
            </div>
            <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: 48 * s, color: deep, lineHeight: 1.25 }}>{p.demo.eventLabel}</div>
          </div>
          <svg width={60 * s} height={60 * s} viewBox="0 0 24 24" style={{ opacity: bellIn, transform: `rotate(${bell}deg)`, transformOrigin: "50% 10%" }}>
            <path d="M12 2a6 6 0 0 0-6 6v4l-2 3h16l-2-3V8a6 6 0 0 0-6-6Z" fill={deep} />
            <circle cx="12" cy="19" r="2.6" fill={deep} />
          </svg>
        </div>
      </div>
      {/* 指 */}
      <div
        style={{
          position: "absolute",
          left: 22 * s + tx - 20 * s + (1 - fingerIn) * 260 * s + fingerOut * 240 * s,
          top: 22 * s + ty - 8 * s + (1 - fingerIn) * 420 * s + fingerOut * 380 * s,
          transform: `scale(${press}) rotate(-18deg)`,
          transformOrigin: "20% 0%",
          opacity: 1 - fingerOut,
        }}
      >
        <svg width={160 * s} height={216 * s} viewBox="0 0 68 92">
          <path
            d="M14 6c0-3.3 2.7-6 6-6s6 2.7 6 6v30l4-1c3-.5 5.5 1.4 6 4l1 2 3-1c2.8-.5 5.2 1.3 5.8 3.8l.7 2.4 2.6-.6c3-.5 5.7 1.6 6 4.6L57 66c.6 10-6 26-24 26-12 0-18-6-23-14L1 60c-1.6-2.8-.6-6.4 2.2-8 2.6-1.4 5.8-.7 7.6 1.6L14 58V6Z"
            fill="#fff"
            stroke={deep}
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

/** 4. デモ(チャコール): 見出し + スマホのカレンダーに予定が入る */
export const Demo: React.FC<{ p: SignageProps }> = ({ p }) => {
  const { u, width, portrait } = useLayout();
  const { base, lime, text } = p.palette;
  const pad = (portrait ? 80 : 110) * u;
  const lines = p.demo.title.split("\n");
  const titleSize = fit(p.demo.title, (portrait ? 92 : 84) * u, portrait ? width - pad * 2 : 900 * u);

  const title = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 * u }}>
      {lines.map((l, i) => (
        <Reveal key={i} at={6 + i * 12}>
          <div
            style={{
              fontFamily: fonts.jp,
              fontWeight: 900,
              fontSize: titleSize,
              lineHeight: 1.3,
              color: i === lines.length - 1 ? lime : text,
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </div>
        </Reveal>
      ))}
      <Reveal at={40}>
        <div style={{ marginTop: 18 * u, fontFamily: fonts.jp, fontWeight: 500, fontSize: 30 * u, color: text, opacity: 0.8 }}>{p.demo.note}</div>
      </Reveal>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: base }}>
      <Hairlines />
      {portrait ? (
        <AbsoluteFill style={{ padding: `${130 * u}px ${pad}px 0`, flexDirection: "column", gap: 60 * u }}>
          {title}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Reveal at={4} dx={0} dy={80} dur={18}>
              <Phone p={p} scale={1.12 * u} />
            </Reveal>
          </div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: `0 ${pad}px`, gap: 120 * u }}>
          <Reveal at={4} dx={0} dy={80} dur={18}>
            <Phone p={p} scale={0.92 * u} />
          </Reveal>
          {title}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
