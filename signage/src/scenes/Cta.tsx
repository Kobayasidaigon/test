import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { BoxReveal, Lines, OutlineWords, Qr, Reveal } from "../components/parts";

/** QR が空欄のときは「Googleカレンダーの予定作成画面」へのリンクを作る(日時は利用者が選ぶ) */
export const resolveQrUrl = (p: SignageProps) => {
  if (p.qr.url.trim()) return p.qr.url.trim();
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${p.demo.eventLabel}（${p.gymName}）`,
    details: `${p.end.note}${p.end.noteStrong}`,
    location: p.gymName,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
};

/** 5. 呼びかけ(ライムの面): 前置き → 大見出し → 黒い帯 + QR */
export const Cta: React.FC<{ p: SignageProps }> = ({ p }) => {
  const { u, width, portrait } = useLayout();
  const { lime, deep, text } = p.palette;
  const avail = portrait ? width - 140 * u : 1000 * u;
  const main = fit(p.cta.main, (portrait ? 140 : 128) * u, avail);
  const pre = fit(p.cta.pre, 50 * u, avail);
  const box = fit(p.cta.box, 42 * u, avail / 1.2);

  const copy = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", gap: 14 * u }}>
      <Reveal at={6} dx={0} dy={20}>
        <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: pre, color: deep, whiteSpace: "nowrap" }}>{p.cta.pre}</div>
      </Reveal>
      <Reveal at={16} dx={0} dy={30} dur={16}>
        <div
          style={{
            fontFamily: fonts.jp,
            fontWeight: 900,
            fontSize: main,
            color: deep,
            lineHeight: 1.18,
            textAlign: portrait ? "center" : "left",
            whiteSpace: "nowrap",
            letterSpacing: -main * 0.01,
          }}
        >
          <Lines text={p.cta.main} />
        </div>
      </Reveal>
      <div style={{ marginTop: 16 * u }}>
        <BoxReveal at={40} bg={deep} color={lime} fontSize={box} weight={700} padding={`${10 * u}px ${30 * u}px`}>
          {p.cta.box}
        </BoxReveal>
      </div>
    </div>
  );

  const qr = p.qr.enabled ? (
    <Reveal at={52} dx={0} dy={40} dur={16}>
      <div style={{ background: text, padding: 24 * u, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * u }}>
        <Qr text={resolveQrUrl(p)} size={(portrait ? 330 : 340) * u} fg={deep} bg={text} />
        <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: 30 * u, color: deep }}>{p.qr.label}</div>
      </div>
    </Reveal>
  ) : null;

  return (
    <AbsoluteFill style={{ background: lime }}>
      <OutlineWords text={p.cta.bgWord} color={deep} opacity={0.14} />
      <AbsoluteFill
        style={{
          flexDirection: portrait ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: (portrait ? 80 : 130) * u,
        }}
      >
        {copy}
        {qr}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
