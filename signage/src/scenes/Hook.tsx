import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { Fade, Kinetic, alpha, ease, fontFamily, useLayout, useSpring } from "../components/kit";
import { fitSize } from "../fit";

/**
 * シーン1：「やる気 → 予定」の2つの札が入れ替わって「予定 → やる気」になる。
 * 順番が逆だった、という気づきを3秒で見せる。
 */
export const Hook: React.FC<SignageProps> = ({ copy, ink, muted, accent, paper }) => {
  const frame = useCurrentFrame();
  const { portrait, u, width } = useLayout();

  const SWAP = 46;
  const swap = useSpring(SWAP, 16, 1);
  const popA = useSpring(4, 12);
  const popB = useSpring(12, 12);

  const chipSize = (portrait ? 84 : 70) * u;
  // 札の位置。矢印を真ん中に置き、それぞれの札の内側の端が矢印から一定の距離になるようにする
  // （「痛くなったら」のような長い言葉でも矢印に重ならない）
  const chipW = (t: string) => ([...t].length + 1.56) * chipSize + 8 * u;
  const G = (portrait ? 110 : 120) * u; // 中心から札の内側の端まで
  const chipH = 1.84 * chipSize;
  const half = (t: string) => (portrait ? chipH / 2 : chipW(t) / 2);
  const at = (side: -1 | 1, t: string) => {
    const d = side * (G + half(t));
    return portrait ? { x: 0, y: d } : { x: d, y: 0 };
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const move = (from: { x: number; y: number }, to: { x: number; y: number }, bend: number) => ({
    x: lerp(from.x, to.x, swap) + (portrait ? bend : 0),
    y: lerp(from.y, to.y, swap) + (portrait ? 0 : bend),
  });
  const arc = 150 * u * Math.sin(Math.PI * Math.min(1, Math.max(0, swap)));
  // やる気：先頭 → うしろへ。上（縦長なら左）を通る／予定：うしろ → 先頭へ。下（縦長なら右）を通る
  const aPos = move(at(-1, copy.before), at(1, copy.before), -arc);
  const bPos = move(at(1, copy.after), at(-1, copy.after), arc);

  const c = Math.min(1, Math.max(0, swap));
  const aFill = interpolateColors(c, [0, 1], [ink, paper]);
  const aText = interpolateColors(c, [0, 1], [paper, ink]);
  const bFill = interpolateColors(c, [0, 1], [paper, accent]);
  const bText = interpolateColors(c, [0, 1], [ink, paper]);

  const arrowIn = interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const arrowDip = interpolate(frame, [SWAP - 2, SWAP + 6, SWAP + 22, SWAP + 34], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const capT = interpolate(frame, [SWAP + 4, SWAP + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spark = useSpring(SWAP + 22, 10, 0.6);

  const headSize = fitSize(copy.headline, portrait ? 104 * u : 128 * u, width - (portrait ? 140 : 300) * u);

  const Chip: React.FC<{ label: string; fill: string; text: string; border: string; pos: { x: number; y: number }; pop: number; z: number; children?: React.ReactNode }> = ({ label, fill, text, border, pos, pop, z, children }) => (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        zIndex: z,
        transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${pop})`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 900,
          fontSize: chipSize,
          lineHeight: 1,
          padding: `${0.42 * chipSize}px ${0.78 * chipSize}px`,
          borderRadius: 999,
          background: fill,
          color: text,
          border: `${4 * u}px solid ${border}`,
          whiteSpace: "nowrap",
          boxShadow: `0 ${18 * u}px ${40 * u}px ${alpha(ink, 0.1)}`,
          position: "relative",
        }}
      >
        {label}
        {children}
      </div>
    </div>
  );

  const stageH = portrait ? 2 * (G + chipH) + 120 * u : 260 * u;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: (portrait ? 70 : 50) * u }}>
        {/* キャプション：よくある順番 → 続く人の順番 */}
        <Fade delay={0} y={12}>
          <div style={{ position: "relative", height: 46 * u, fontFamily, fontWeight: 700, fontSize: (portrait ? 44 : 38) * u, letterSpacing: "0.12em" }}>
            <div style={{ opacity: 1 - capT, color: muted, whiteSpace: "nowrap", position: "absolute", left: "50%", transform: `translateX(-50%) translateY(${-capT * 20 * u}px)` }}>
              {copy.captionBefore}
            </div>
            <div style={{ opacity: capT, color: accent, whiteSpace: "nowrap", position: "absolute", left: "50%", transform: `translateX(-50%) translateY(${(1 - capT) * 20 * u}px)` }}>
              {copy.captionAfter}
            </div>
          </div>
        </Fade>

        {/* 札の入れ替え */}
        <div style={{ position: "relative", width: width, height: stageH }}>
          <svg
            width={120 * u}
            height={120 * u}
            viewBox="0 0 120 120"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${portrait ? 90 : 0}deg)`,
              opacity: arrowIn * arrowDip,
            }}
          >
            <path
              d="M14 60 H96 M74 36 L100 60 L74 84"
              fill="none"
              stroke={c > 0.5 ? accent : muted}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - arrowIn}
            />
          </svg>
          <Chip label={copy.before} fill={aFill} text={aText} border={ink} pos={aPos} pop={popA} z={1}>
            {/* あとからついてくる、の小さなきらめき */}
            <svg
              width={chipSize * 0.7}
              height={chipSize * 0.7}
              viewBox="0 0 24 24"
              style={{ position: "absolute", right: -chipSize * 0.32, top: -chipSize * 0.38, transform: `scale(${spark}) rotate(${spark * 20}deg)` }}
            >
              <path d="M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1Z" fill={accent} />
            </svg>
          </Chip>
          <Chip label={copy.after} fill={bFill} text={bText} border={c > 0.5 ? accent : ink} pos={bPos} pop={popB} z={2} />
        </div>

        <Kinetic text={copy.headline} delay={SWAP + 38} size={headSize} color={ink} align="center" stagger={1.4} />
      </div>
    </AbsoluteFill>
  );
};
