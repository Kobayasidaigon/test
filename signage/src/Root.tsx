import React from "react";
import { Composition, Folder } from "remotion";
import { Signage, FPS, TOTAL } from "./Signage";
import { signageSchema, variantSchema, type SignageProps } from "./schema";
import data from "./variants.json";

const FORMATS = [
  { key: "landscape", width: 1920, height: 1080, label: "横 16:9（受付モニター）" },
  { key: "portrait", width: 1080, height: 1920, label: "縦 9:16（スタンド型）" },
] as const;

const variants = data.variants.map((v) => variantSchema.parse(v));

export const Root: React.FC = () => (
  <>
    {FORMATS.map((f) => (
      <Folder key={f.key} name={f.key}>
        {variants.map((v) => {
          const props: SignageProps = {
            ...data.brand,
            accent: v.accent,
            copy: v.copy,
          };
          return (
            <Composition
              key={v.id}
              id={`${v.id}-${f.key}`}
              component={Signage}
              schema={signageSchema}
              defaultProps={props}
              durationInFrames={TOTAL}
              fps={FPS}
              width={f.width}
              height={f.height}
            />
          );
        })}
      </Folder>
    ))}
  </>
);
