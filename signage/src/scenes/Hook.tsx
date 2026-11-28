import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { fit, useLayout } from "../layout";
import { fonts } from "../fonts";
import { BoxReveal, Hairlines, Reveal, Tag } from "../components/parts";

/** 1. つかみ(チャコール): 白い行 → ライムの行 → ライムの箱 */
export const Hook: React.FC<{ p: SignageProps }> = ({ p }) => {
  const { u, width, portrait } = useLayout();
  const { base, lime, text, deep } = p.palette;
  const pad = (portrait ? 80 : 110) * u;
  const avail = width - pad * 2;
  const max = (portrait ? 96 : 104) * u;
  const s1 = fit(p.hook.line1, max, avail);
  const s2 = fit(p.hook.line2, max, avail);
  const s3 = fit(p.hook.box, max * 1.08, avail / 1.15);

  return (
    <AbsoluteFill style={{ background: base }}>
      <Hairlines />
      <div style={{ position: "absolute", left: pad, top: (portrait ? 120 : 70) * u }}>
        <Tag text={p.tag} bg={lime} color={deep} at={2} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: pad, paddingRight: pad, paddingBottom: (portrait ? 80 : 0) * u }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 * u }}>
          <Reveal at={12}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: s1, color: text, lineHeight: 1.3, whiteSpace: "nowrap" }}>
              {p.hook.line1}
            </div>
          </Reveal>
          <Reveal at={30}>
            <div style={{ fontFamily: fonts.jp, fontWeight: 900, fontSize: s2, color: lime, lineHeight: 1.3, whiteSpace: "nowrap" }}>
              {p.hook.line2}
            </div>
          </Reveal>
          <div style={{ marginTop: 18 * u }}>
            <BoxReveal at={52} bg={lime} color={deep} fontSize={s3}>
              {p.hook.box}
            </BoxReveal>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
