import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { OutlineWords, Reveal, Underline } from "../components/parts";

/** 2. メインメッセージ(ライムの面): 小さい前置き → 特大の一言 + 下線 → 補足 */
export const Principle: React.FC<{ p: SignageProps }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { u, width, portrait } = useLayout();
  const { lime, deep } = p.palette;
  const avail = width - (portrait ? 120 : 300) * u;
  const main = fit(p.principle.main, (portrait ? 230 : 250) * u, avail);
  const small = fit(p.principle.pre, 58 * u, avail);
  const post = fit(p.principle.post, 52 * u, avail);
  // 特大の一言はわずかに縮みながら止まる
  const settle = interpolate(frame, [18, 40], [1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: lime, alignItems: "center", justifyContent: "center" }}>
      <OutlineWords text={p.principle.bgWord} color={deep} opacity={0.14} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * u, paddingBottom: (portrait ? 60 : 0) * u }}>
        <Reveal at={6} dx={0} dy={20}>
          <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: small, color: deep, whiteSpace: "nowrap" }}>{p.principle.pre}</div>
        </Reveal>
        <Reveal at={16} dx={0} dy={30} dur={16}>
          <div
            style={{
              fontFamily: fonts.jp,
              fontWeight: 900,
              fontSize: main,
              color: deep,
              lineHeight: 1.12,
              letterSpacing: -main * 0.02,
              whiteSpace: "nowrap",
              transform: `scale(${settle})`,
            }}
          >
            {p.principle.main}
          </div>
        </Reveal>
        <Underline at={30} color={deep} thickness={10 * u} width="100%" />
        <Reveal at={42} dx={0} dy={20}>
          <div style={{ marginTop: 18 * u, fontFamily: fonts.jp, fontWeight: 900, fontSize: post, color: deep, whiteSpace: "nowrap" }}>
            {p.principle.post}
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
