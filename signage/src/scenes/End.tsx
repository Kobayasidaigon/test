import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { Hairlines, Reveal } from "../components/parts";

/** 6. 締め(チャコール): 店舗名 → 一言 → 検索バー風の入力欄に「次回の予定」が打ち込まれて[登録] */
export const End: React.FC<{ p: SignageProps }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { u, width, portrait } = useLayout();
  const { base, lime, text, deep } = p.palette;

  const name = fit(p.gymName, (portrait ? 230 : 210) * u, width - 160 * u);
  const barW = (portrait ? 820 : 760) * u;
  const barH = 92 * u;

  // タイピング
  const TYPE_AT = 34;
  const chars = Array.from(p.end.search);
  const typed = Math.max(0, Math.min(chars.length, Math.floor((frame - TYPE_AT) / 3)));
  const doneAt = TYPE_AT + chars.length * 3;
  const caret = frame < doneAt + 6 && Math.floor(frame / 8) % 2 === 0;
  const PRESS = doneAt + 10;
  const press = frame >= PRESS && frame < PRESS + 6 ? 0.92 : 1;
  const flash = interpolate(frame, [PRESS, PRESS + 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: base }}>
      <Hairlines />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 * u }}>
        <Reveal at={2} dx={0} dy={30} dur={16}>
          <div style={{ fontFamily: fonts.num, fontSize: name, color: lime, lineHeight: 1.05, letterSpacing: 2 * u, whiteSpace: "nowrap" }}>
            {p.gymName}
          </div>
        </Reveal>
        <Reveal at={14} dx={0} dy={16}>
          <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: 50 * u, color: text, whiteSpace: "nowrap" }}>{p.end.sub}</div>
        </Reveal>

        <Reveal at={24} dx={0} dy={16}>
          <div
            style={{
              marginTop: 30 * u,
              width: barW,
              height: barH,
              borderRadius: 999,
              background: text,
              display: "flex",
              alignItems: "center",
              padding: `0 ${12 * u}px 0 ${40 * u}px`,
              boxSizing: "border-box",
              boxShadow: `0 0 0 ${flash * 14 * u}px rgba(195,225,26,${flash * 0.45})`,
            }}
          >
            <div style={{ flex: 1, fontFamily: fonts.jp, fontWeight: 700, fontSize: 40 * u, color: deep, whiteSpace: "nowrap", overflow: "hidden" }}>
              {chars.slice(0, typed).join("")}
              <span style={{ display: "inline-block", width: 4 * u, height: 44 * u, marginLeft: 4 * u, verticalAlign: "middle", background: deep, opacity: caret ? 1 : 0 }} />
            </div>
            <div
              style={{
                background: lime,
                color: deep,
                borderRadius: 999,
                fontFamily: fonts.jp,
                fontWeight: 900,
                fontSize: 34 * u,
                padding: `${10 * u}px ${36 * u}px`,
                transform: `scale(${press})`,
              }}
            >
              {p.end.button}
            </div>
          </div>
        </Reveal>

        <Reveal at={PRESS + 6} dx={0} dy={12}>
          <div style={{ marginTop: 14 * u, fontFamily: fonts.jp, fontWeight: 700, fontSize: 34 * u, color: text, whiteSpace: "nowrap" }}>
            {p.end.note}
            <span style={{ color: lime }}>{p.end.noteStrong}</span>
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
