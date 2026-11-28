import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { SignageProps } from "./schema";
import { Big, GOTHIC, Slam, Wipe, fit, useLayout, useShake } from "./components/kit";
import { Qr } from "./components/Qr";

type SceneProps = SignageProps & { next: string };

const useMargin = () => {
  const { portrait, u } = useLayout();
  return (portrait ? 90 : 140) * u;
};

/** シーン1（黄）：「やる気は、／待っても／来ない。」を1語ずつ叩きつける */
export const Hook: React.FC<SceneProps> = ({ copy, yellow, ink, next }) => {
  const { portrait, u, width } = useLayout();
  const { durationInFrames } = useVideoConfig();
  const m = useMargin();
  const hits = copy.hook.map((_, i) => 2 + i * 20);
  const shake = useShake(hits, 10 * u);
  const size = fit(copy.hook.join("\n"), (portrait ? 230 : 280) * u, width - m * 2);
  return (
    <AbsoluteFill style={{ background: yellow }}>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: m, transform: shake }}>
        {copy.hook.map((w, i) => (
          <Slam key={i} at={hits[i]}>
            <Big text={w} size={size} color={ink} />
          </Slam>
        ))}
      </AbsoluteFill>
      <Wipe color={next} end={durationInFrames} />
    </AbsoluteFill>
  );
};

/** シーン2（青）：「だから、先に」→「予定。」 */
export const Turn: React.FC<SceneProps> = ({ copy, blue, white, yellow, next }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width } = useLayout();
  const { durationInFrames } = useVideoConfig();
  const m = useMargin();
  const shake = useShake([16], 16 * u);
  const big = fit(copy.turnBig, (portrait ? 330 : 520) * u, width - m * 2);
  const lead = fit(copy.turnLead, (portrait ? 96 : 104) * u, width - m * 2);
  const bar = Math.min(1, Math.max(0, (frame - 24) / 5));
  return (
    <AbsoluteFill style={{ background: blue }}>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: m, transform: shake }}>
        <Slam at={2}>
          <Big text={copy.turnLead} size={lead} color={white} />
        </Slam>
        <div style={{ position: "relative", alignSelf: "flex-start" }}>
          <div
            style={{
              position: "absolute",
              left: -m,
              right: -big * 0.15,
              bottom: big * 0.14,
              height: big * 0.24,
              background: yellow,
              transform: `scaleX(${bar})`,
              transformOrigin: "left",
            }}
          />
          <Slam at={16}>
            <Big text={copy.turnBig} size={big} color={white} leading={1.05} style={{ position: "relative" }} />
          </Slam>
        </div>
      </AbsoluteFill>
      <Wipe color={next} end={durationInFrames} />
    </AbsoluteFill>
  );
};

/** シーン3（オレンジ）：「次は 木 19:00」に「予約済」のハンコ */
export const Slot: React.FC<SceneProps> = ({ copy, orange, ink, white, next }) => {
  const { portrait, u, width } = useLayout();
  const { durationInFrames } = useVideoConfig();
  const m = useMargin();
  const STAMP = 44;
  const shake = useShake([12, 22, STAMP], 14 * u);

  const timeSize = fit(copy.slotTime, (portrait ? 300 : 330) * u, portrait ? width - m * 2 : width - m * 2 - 400 * u);
  const day = portrait ? 300 * u : 330 * u;
  const leadSize = fit(copy.slotLead, (portrait ? 110 : 110) * u, width - m * 2);

  const stamp = (
    <Slam at={STAMP} origin="center" style={{ position: "absolute", right: portrait ? m : m + 20 * u, bottom: portrait ? 330 * u : 120 * u, zIndex: 2 }}>
      <div
        style={{
          transform: "rotate(-14deg)",
          border: `${12 * u}px solid ${white}`,
          borderRadius: 36 * u,
          padding: `${14 * u}px ${40 * u}px`,
          fontFamily: "Dela Gothic One",
          fontSize: 120 * u,
          lineHeight: 1.1,
          color: white,
          letterSpacing: "0.06em",
        }}
      >
        {copy.stamp}
      </div>
    </Slam>
  );

  const dayDisc = (
    <Slam at={12} origin="center">
      <div
        style={{
          width: day,
          height: day,
          borderRadius: "50%",
          background: ink,
          color: white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Dela Gothic One",
          fontSize: day * 0.58,
          lineHeight: 1,
          paddingBottom: day * 0.04,
          boxSizing: "border-box",
        }}
      >
        {copy.slotDay}
      </div>
    </Slam>
  );

  return (
    <AbsoluteFill style={{ background: orange }}>
      <AbsoluteFill style={{ transform: shake }}>
        <div style={{ position: "absolute", left: m, top: portrait ? 300 * u : 130 * u }}>
          <Slam at={2}>
            <Big text={copy.slotLead} size={leadSize} color={ink} />
          </Slam>
        </div>
        <div
          style={{
            position: "absolute",
            left: m,
            top: portrait ? 520 * u : 330 * u,
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            alignItems: portrait ? "flex-start" : "center",
            gap: (portrait ? 60 : 50) * u,
          }}
        >
          {dayDisc}
          <Slam at={22}>
            <Big text={copy.slotTime} size={timeSize} color={ink} leading={1} />
          </Slam>
        </div>
        {stamp}
      </AbsoluteFill>
      <Wipe color={next} end={durationInFrames} />
    </AbsoluteFill>
  );
};

/** シーン4（黒）：「予定があれば、」→「体は行く。」 */
export const Punch: React.FC<SceneProps> = ({ copy, ink, yellow, white, next }) => {
  const { portrait, u, width } = useLayout();
  const { durationInFrames } = useVideoConfig();
  const m = useMargin();
  const shake = useShake([20], 14 * u);
  const lead = fit(copy.punchLead, (portrait ? 110 : 110) * u, width - m * 2);
  const big = fit(copy.punchBig, (portrait ? 260 : 300) * u, width - m * 2);
  return (
    <AbsoluteFill style={{ background: ink }}>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: m, gap: 20 * u, transform: shake }}>
        <Slam at={2}>
          <Big text={copy.punchLead} size={lead} color={white} />
        </Slam>
        <Slam at={20}>
          <Big text={copy.punchBig} size={big} color={yellow} />
        </Slam>
      </AbsoluteFill>
      <Wipe color={next} end={durationInFrames} />
    </AbsoluteFill>
  );
};

/** シーン5（黄）：「帰る前に、次の1回。」とQR。ループの先頭も黄色なので、つなぎ目が出ない */
export const Cta: React.FC<SceneProps> = ({ copy, yellow, ink, white, bookingUrl, showQr, storeName }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width, height } = useLayout();
  const m = useMargin();
  const lines = copy.ctaTitle.split("\n");
  const hits = lines.map((_, i) => 2 + i * 12);
  const shake = useShake([...hits, 30], 10 * u);

  const titleMax = portrait || !showQr ? width - m * 2 : width * 0.52;
  const size = fit(copy.ctaTitle, (portrait ? 190 : 210) * u, titleMax);
  const qrSize = (portrait ? 470 : 400) * u;

  // 2秒おきに、QRがちょっと揺れて目を引く
  const cycle = (frame - 50) % 60;
  const wiggle = frame > 50 && cycle < 16 ? Math.sin((cycle / 16) * Math.PI * 3) * 3 * (1 - cycle / 16) : 0;

  const qr = showQr && (
    <Slam at={30} origin="center">
      <div style={{ transform: `rotate(${wiggle}deg)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            background: white,
            padding: 22 * u,
            border: `${8 * u}px solid ${ink}`,
            boxShadow: `${18 * u}px ${18 * u}px 0 ${ink}`,
          }}
        >
          <Qr url={bookingUrl} size={qrSize} ink={ink} paper={white} />
        </div>
        <div
          style={{
            marginTop: 44 * u,
            background: ink,
            color: yellow,
            fontFamily: "Dela Gothic One",
            fontSize: 52 * u,
            lineHeight: 1,
            padding: `${20 * u}px ${44 * u}px`,
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {copy.qrLabel}
        </div>
      </div>
    </Slam>
  );

  const foot = (
    <div style={{ fontFamily: GOTHIC, color: ink }}>
      <div style={{ fontWeight: 700, fontSize: 40 * u }}>{copy.ctaSub}</div>
      <div style={{ fontWeight: 700, fontSize: 28 * u, letterSpacing: "0.2em", marginTop: 18 * u, opacity: 0.75 }}>{storeName}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: yellow }}>
      <AbsoluteFill style={{ transform: shake }}>
        <div style={{ position: "absolute", left: m, top: portrait ? 230 * u : 0, bottom: portrait ? undefined : 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {lines.map((l, i) => (
            <Slam key={i} at={hits[i]}>
              <Big text={l} size={size} color={ink} />
            </Slam>
          ))}
          {!portrait && <div style={{ marginTop: 50 * u }}>{foot}</div>}
        </div>
        {qr && (
          <div
            style={
              portrait
                ? { position: "absolute", left: 0, right: 0, top: 230 * u + size * 1.12 * lines.length + 110 * u, display: "flex", justifyContent: "center" }
                : { position: "absolute", right: m + 20 * u, top: (height - qrSize - 150 * u) / 2 - 20 * u }
            }
          >
            {qr}
          </div>
        )}
        {portrait && <div style={{ position: "absolute", left: m, bottom: 150 * u }}>{foot}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
