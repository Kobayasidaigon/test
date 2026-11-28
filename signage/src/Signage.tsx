import React from "react";
import { AbsoluteFill, Series } from "remotion";
import type { SignageProps } from "./schema";
import { Cta, Hook, Punch, Slot, Turn } from "./scenes";

export const FPS = 30;

/**
 * 黄 → 青 → オレンジ → 黒 → 黄。色ごとに1つのことだけ言う。
 * シーンの終わりに次の色が斜めに横切って切り替わる。最後の黄から先頭の黄へ、ループもそのままつながる。
 */
const order = (p: SignageProps) =>
  [
    { key: "hook", frames: 84, C: Hook, bg: p.yellow },
    { key: "turn", frames: 78, C: Turn, bg: p.blue },
    { key: "slot", frames: 105, C: Slot, bg: p.orange },
    { key: "punch", frames: 72, C: Punch, bg: p.ink },
    { key: "cta", frames: 171, C: Cta, bg: p.yellow },
  ] as const;

export const TOTAL = 84 + 78 + 105 + 72 + 171; // 510 = 17秒

export const Signage: React.FC<SignageProps> = (props) => {
  const scenes = order(props);
  return (
    <AbsoluteFill style={{ background: props.yellow }}>
      <Series>
        {scenes.map(({ key, frames, C }, i) => (
          <Series.Sequence key={key} durationInFrames={frames}>
            <C {...props} next={scenes[(i + 1) % scenes.length].bg} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
