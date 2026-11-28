import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { GOTHIC, Handwrite, Pen, Show, Type, alphaOf, fit, roughPath, textEm, useLayout, useProgress, writeFrames } from "../components/kit";
import { Qr } from "../components/Qr";

/**
 * シーン4：お帰りの前に、次回のご予約を。
 * QRは「印刷物」として置き、赤ペンの書き込みと矢印で指し示す。
 */
export const Cta: React.FC<SignageProps> = ({ copy, ink, pen, bookingUrl, showQr, storeName }) => {
  const { portrait, u, width, height } = useLayout();
  const [l1, ...lr] = copy.ctaTitle.split("\n");
  const l2 = lr.join("\n");

  const NOTE = 52;
  const ARROW = NOTE + writeFrames(copy.qrNote, 5);
  const arrow = useProgress(ARROW, 10);
  const head = useProgress(ARROW + 10, 5);

  const qrSize = (portrait ? 440 : 360) * u;
  const qr = (
    <div style={{ padding: 18 * u, border: `${2 * u}px solid ${ink}`, background: "#FFFFFF" }}>
      <Qr url={bookingUrl} size={qrSize} ink={ink} paper="#FFFFFF" />
    </div>
  );

  const foot = (
    <Show at={40}>
      <div style={{ fontFamily: GOTHIC, fontWeight: 500, fontSize: 34 * u, color: alphaOf(ink, 0.75), letterSpacing: "0.06em" }}>{copy.ctaSub}</div>
      <div style={{ fontFamily: GOTHIC, fontWeight: 700, fontSize: 26 * u, color: ink, letterSpacing: "0.2em", marginTop: 26 * u }}>{storeName}</div>
    </Show>
  );

  if (portrait) {
    const size = fit(copy.ctaTitle, 132 * u, height - 900 * u, 0.08);
    const box = qrSize + 40 * u;
    const qx = 100 * u;
    const qTop = height - 430 * u - box;
    const noteSize = 64 * u;
    const nx = qx + 10 * u + textEm(copy.qrNote) * noteSize + 24 * u; // 書き込みの右端
    const ex = qx + box * 0.78; // 矢印の先
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", right: 110 * u, top: 170 * u, display: "flex", flexDirection: "row-reverse", gap: 24 * u }}>
          <Show at={4}>
            <Type text={l1} size={size} color={ink} vertical />
          </Show>
          <Show at={18} style={{ marginTop: size * 1.1 }}>
            <Type text={l2} size={size} color={ink} vertical />
          </Show>
        </div>
        {showQr && (
          <>
            <Show at={30} style={{ position: "absolute", left: qx, top: qTop }}>
              {qr}
            </Show>
            <Handwrite
              text={copy.qrNote}
              at={NOTE}
              size={noteSize}
              color={pen}
              seed="qr"
              style={{ position: "absolute", left: qx + 10 * u, top: qTop - 210 * u, transform: "rotate(-5deg)" }}
            />
            <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <Pen d={roughPath([[nx, qTop - 150 * u], [nx + 60 * u, qTop - 100 * u], [ex, qTop - 14 * u]], "arrow-p", 4 * u)} progress={arrow} color={pen} width={6 * u} />
              <Pen d={roughPath([[ex - 36 * u, qTop - 46 * u], [ex, qTop - 12 * u], [ex + 26 * u, qTop - 52 * u]], "arrow-ph", 2 * u)} progress={head} color={pen} width={6 * u} />
            </svg>
          </>
        )}
        <div style={{ position: "absolute", left: 100 * u, bottom: 170 * u }}>{foot}</div>
      </AbsoluteFill>
    );
  }

  const size = fit(copy.ctaTitle, 124 * u, showQr ? 1000 * u : width - 420 * u);
  // 矢印：書き込みの右端から、QRの左上へ
  const qrLeft = width - 210 * u - qrSize - 40 * u;
  const qrTop = (height - qrSize - 40 * u) / 2 + 20 * u;
  const ax0 = qrLeft - 230 * u;
  const ay0 = qrTop - 40 * u;
  const ax1 = qrLeft - 26 * u;
  const ay1 = qrTop + 70 * u;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 210 * u, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Show at={4}>
          <Type text={l1} size={size} color={ink} />
        </Show>
        <Show at={18}>
          <Type text={l2} size={size} color={ink} />
        </Show>
        <div style={{ marginTop: 56 * u }}>{foot}</div>
      </div>
      {showQr && (
        <>
          <Show at={30} style={{ position: "absolute", left: qrLeft, top: qrTop }}>
            {qr}
          </Show>
          <Handwrite
            text={copy.qrNote}
            at={NOTE}
            size={54 * u}
            color={pen}
            seed="qr"
            style={{ position: "absolute", right: width - ax0 - 40 * u, top: ay0 - 100 * u, transform: "rotate(-6deg)" }}
          />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <Pen d={roughPath([[ax0, ay0], [ax0 + 110 * u, ay0 + 10 * u], [ax1 - 30 * u, ay1 - 50 * u], [ax1, ay1]], "arrow", 4 * u)} progress={arrow} color={pen} width={6 * u} />
            <Pen
              d={roughPath([[ax1 - 40 * u, ay1 - 14 * u], [ax1, ay1], [ax1 + 2 * u, ay1 - 42 * u]], "arrow-h", 2 * u)}
              progress={head}
              color={pen}
              width={6 * u}
            />
          </svg>
        </>
      )}
    </AbsoluteFill>
  );
};
