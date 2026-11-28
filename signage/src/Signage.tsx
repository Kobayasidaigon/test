import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SignageProps } from "./schema";
import { Paper, clamp } from "./components/kit";
import { Correction } from "./scenes/Correction";
import { Calendar } from "./scenes/Calendar";
import { Statement } from "./scenes/Statement";
import { Cta } from "./scenes/Cta";

export const FPS = 30;
// シーンはカットでつなぐ（フェードで溶かさない）。長さに差をつけて、リズムをつくる
export const SCENES = [
  { key: "correction", frames: 210, C: Correction },
  { key: "calendar", frames: 180, C: Calendar },
  { key: "statement", frames: 105, C: Statement },
  { key: "cta", frames: 225, C: Cta },
] as const;
export const TOTAL = SCENES.reduce((s, x) => s + x.frames, 0);

export const Signage: React.FC<SignageProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // ループのつなぎ目：最後だけ紙に戻す（先頭も紙から始まる）
  const outro = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Paper color={props.paper} />
      <AbsoluteFill style={{ opacity: outro }}>
        <Series>
          {SCENES.map(({ key, frames, C }) => (
            <Series.Sequence key={key} durationInFrames={frames}>
              <C {...props} />
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
