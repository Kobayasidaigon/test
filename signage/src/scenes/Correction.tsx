import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { Handwrite, Pen, Show, Type, fit, roughPath, textEm, useLayout, useProgress } from "../components/kit";

/**
 * シーン1：赤ペンの添削。
 * 「やる気が出たら、次の予約を。」の前半を二重線で消して、「帰る前に、」と書き込む。
 */
export const Correction: React.FC<SignageProps> = ({ copy, ink, pen }) => {
  const { portrait, u, width, height } = useLayout();

  const STRIKE = 62;
  const INSERT = 92;
  const s1 = useProgress(STRIKE, 9);
  const s2 = useProgress(STRIKE + 11, 8);

  if (portrait) {
    // 縦組み。右の列が消される前半、左の列が残る後半
    const size = fit(`${copy.struck}\n${copy.kept}`, 168 * u, height - 560 * u, 0.08);
    const colH = textEm(copy.struck) * size * 1.08;
    const colW = size * 1.45;
    const line = (x: number, seed: string) =>
      roughPath([[x, -size * 0.25], [x + 3 * u, colH * 0.3], [x - 2 * u, colH * 0.62], [x + 2 * u, colH + size * 0.1]], seed, 6 * u);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "row", gap: 40 * u, alignItems: "flex-start", transform: `translateX(${-50 * u}px)` }}>
          <Show at={24}>
            <Type text={copy.kept} size={size} color={ink} vertical style={{ marginTop: size * 1.6 }} />
          </Show>
          <div style={{ position: "relative" }}>
            <Show at={8}>
              <Type text={copy.struck} size={size} color={ink} vertical />
            </Show>
            <svg width={colW} height={colH + size} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <Pen d={line(colW * 0.44, "v1")} progress={s1} color={pen} width={7 * u} />
              <Pen d={line(colW * 0.6, "v2")} progress={s2} color={pen} width={7 * u} />
            </svg>
            <Handwrite
              text={copy.insert}
              at={INSERT}
              size={size * 0.66}
              color={pen}
              vertical
              seed="ins"
              style={{ position: "absolute", left: colW * 0.98, top: size * 0.3 }}
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const size = fit(`${copy.struck}\n${copy.kept}`, 156 * u, width - 420 * u);
  const lineW = textEm(copy.struck) * size * 1.02;
  const lineH = size * 1.45;
  const line = (y: number, seed: string) =>
    roughPath([[-size * 0.12, y], [lineW * 0.3, y - 2 * u], [lineW * 0.65, y + 3 * u], [lineW + size * 0.05, y - 4 * u]], seed, 5 * u);

  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 210 * u, paddingTop: 90 * u }}>
      <div style={{ position: "relative", width: lineW }}>
        <Show at={8}>
          <Type text={copy.struck} size={size} color={ink} />
        </Show>
        <svg width={lineW} height={lineH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <Pen d={line(lineH * 0.47, "h1")} progress={s1} color={pen} width={7 * u} />
          <Pen d={line(lineH * 0.6, "h2")} progress={s2} color={pen} width={7 * u} />
        </svg>
        <Handwrite
          text={copy.insert}
          at={INSERT}
          size={size * 0.62}
          color={pen}
          seed="ins"
          style={{ position: "absolute", left: size * 0.5, bottom: lineH * 0.86, transform: "rotate(-3deg)", transformOrigin: "left bottom" }}
        />
      </div>
      <Show at={24}>
        <Type text={copy.kept} size={size} color={ink} />
      </Show>
    </AbsoluteFill>
  );
};
