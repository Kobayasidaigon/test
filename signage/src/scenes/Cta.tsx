import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { Fade, Kinetic, alpha, fontFamily, useLayout, useSpring } from "../components/kit";
import { Qr } from "../components/Qr";
import { fitSize } from "../fit";

/**
 * シーン4：お帰りの前に、次回のご予約を。QRコードと受付の案内。
 */
export const Cta: React.FC<SignageProps> = ({ copy, ink, accent, paper, bookingUrl, showQr }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width } = useLayout();

  const headSize = fitSize(
    copy.ctaTitle,
    portrait ? 104 * u : 124 * u,
    portrait || !showQr ? width - 160 * u : 1060 * u,
  );
  const card = useSpring(26, 14);
  const qrSize = (portrait ? 500 : 380) * u;

  // QRのまわりをゆっくり脈打つ輪（視線を呼ぶ）
  const pulse = (k: number) => {
    const p = ((frame - 70 - k * 30) % 60) / 60;
    return frame < 70 + k * 30 ? 0 : p;
  };

  const qrCard = showQr && (
    <div
      style={{
        position: "relative",
        transform: `translateY(${(1 - card) * 80 * u}px) scale(${0.9 + card * 0.1})`,
        opacity: Math.min(1, card * 1.4),
      }}
    >
      {[0, 1].map((k) => {
        const p = pulse(k);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 44 * u,
              border: `${4 * u}px solid ${accent}`,
              transform: `scale(${1 + p * 0.14})`,
              opacity: p > 0 ? (1 - p) * 0.5 : 0,
            }}
          />
        );
      })}
      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: 44 * u,
          padding: 36 * u,
          paddingBottom: 30 * u,
          boxShadow: `0 ${36 * u}px ${90 * u}px ${alpha(ink, 0.16)}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22 * u,
        }}
      >
        <Qr url={bookingUrl} size={qrSize} ink={ink} paper="#FFFFFF" delay={34} />
        <div
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 38 * u,
            color: paper,
            background: accent,
            borderRadius: 999,
            padding: `${14 * u}px ${36 * u}px`,
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
          }}
        >
          {copy.qrLabel}
        </div>
      </div>
    </div>
  );

  const sub = (
    <Fade delay={64}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18 * u,
          fontFamily,
          fontWeight: 700,
          fontSize: 42 * u,
          color: alpha(ink, 0.78),
          whiteSpace: "nowrap",
        }}
      >
        <svg width={44 * u} height={44 * u} viewBox="0 0 24 24">
          <path d="M12 3a4 4 0 1 1 0 8a4 4 0 0 1 0-8z M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" />
        </svg>
        {copy.ctaSub}
      </div>
    </Fade>
  );

  if (portrait || !showQr) {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 90 * u }}>
          <Kinetic text={copy.ctaTitle} delay={4} size={headSize} color={ink} align="center" />
          {qrCard}
          {sub}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 140 * u }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 56 * u }}>
        <Kinetic text={copy.ctaTitle} delay={4} size={headSize} color={ink} />
        {sub}
      </div>
      {qrCard}
    </AbsoluteFill>
  );
};
