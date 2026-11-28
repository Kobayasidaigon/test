import React from "react";
import { AbsoluteFill } from "remotion";
import type { SignageProps } from "../schema";
import { Paper, Show, Type, fit, useLayout } from "../components/kit";

/**
 * シーン3：墨色の一枚に、言い切りのひと言。前後の紙のシーンとの対比で間をつくる。
 */
export const Statement: React.FC<SignageProps> = ({ copy, ink, paper }) => {
  const { portrait, u, width, height } = useLayout();
  const [first, ...rest] = copy.statement.split("\n");
  const second = rest.join("\n");

  if (portrait) {
    const size = fit(copy.statement, 176 * u, height - 520 * u, 0.08);
    return (
      <AbsoluteFill>
        <Paper color={ink} dark />
        <AbsoluteFill style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "flex-start", gap: 30 * u, paddingTop: 260 * u, transform: `translateX(${40 * u}px)` }}>
          <Show at={4}>
            <Type text={first} size={size} color={paper} vertical />
          </Show>
          <Show at={34} style={{ marginTop: size * 1.2 }}>
            <Type text={second} size={size} color={paper} vertical />
          </Show>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const size = fit(copy.statement, 170 * u, width - 420 * u);
  return (
    <AbsoluteFill>
      <Paper color={ink} dark />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 210 * u }}>
        <Show at={4}>
          <Type text={first} size={size} color={paper} />
        </Show>
        <Show at={34} style={{ paddingLeft: size * 1.5 }}>
          <Type text={second} size={size} color={paper} />
        </Show>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
