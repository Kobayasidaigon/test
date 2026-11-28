import React from "react";
import { Composition, Folder } from "remotion";
import { Signage, TOTAL_FRAMES } from "./Signage";
import { signageSchema } from "./schema";
import { defaultProps } from "./defaults";
import "./fonts";

export const RemotionRoot: React.FC = () => (
  <Folder name="Yotei">
    {/* 縦型サイネージ(スタンド・柱・エレベーター横) */}
    <Composition
      id="YoteiPortrait"
      component={Signage}
      schema={signageSchema}
      defaultProps={defaultProps}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    {/* 横型サイネージ(受付モニター・壁掛けTV) */}
    <Composition
      id="YoteiLandscape"
      component={Signage}
      schema={signageSchema}
      defaultProps={defaultProps}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  </Folder>
);
