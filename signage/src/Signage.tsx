import React from "react";
import { AbsoluteFill, Series } from "remotion";
import type { SignageProps } from "./schema";
import { Hook } from "./scenes/Hook";
import { Principle } from "./scenes/Principle";
import { Points } from "./scenes/Points";
import { Demo } from "./scenes/Demo";
import { Cta } from "./scenes/Cta";
import { End } from "./scenes/End";
import { EndFade, SlantWipe } from "./components/parts";
import { sec } from "./layout";

// シーンの長さ(フレーム, 30fps)
export const SCENES = [
  { id: "hook", frames: sec(4.5), C: Hook },
  { id: "principle", frames: sec(4.5), C: Principle },
  { id: "points", frames: sec(8), C: Points },
  { id: "demo", frames: sec(5.5), C: Demo },
  { id: "cta", frames: sec(6), C: Cta },
  { id: "end", frames: sec(5), C: End },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.frames, 0);

export const Signage: React.FC<SignageProps> = (p) => {
  // シーンの切れ目ごとに斜めのライムが横切る(切れ目の瞬間は画面が完全に隠れる)
  const cuts = SCENES.slice(0, -1).reduce<number[]>((acc, s) => [...acc, (acc.at(-1) ?? 0) + s.frames], []);
  return (
    <AbsoluteFill style={{ background: p.palette.base }}>
      <Series>
        {SCENES.map(({ id, frames, C }) => (
          <Series.Sequence key={id} durationInFrames={frames} name={id}>
            <C p={p} />
          </Series.Sequence>
        ))}
      </Series>
      {cuts.map((at) => (
        <SlantWipe key={at} at={at} color={p.palette.lime} under={p.palette.deep} />
      ))}
      <EndFade color={p.palette.base} />
    </AbsoluteFill>
  );
};
