import React, { useMemo } from "react";
import QRCode from "qrcode";
import { interpolate, useCurrentFrame } from "remotion";
import { ease } from "./kit";

/**
 * 予約ページへのQRコード。SVGで描くので、どの解像度でもにじまない。
 * 出るときは左上から斜めにスキャンするように現れる。
 */
export const Qr: React.FC<{
  url: string;
  size: number;
  ink: string;
  paper: string;
  delay: number;
}> = ({ url, size, ink, paper, delay }) => {
  const frame = useCurrentFrame();
  const { n, cells } = useMemo(() => {
    const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(x, y)) cells.push({ x, y });
      }
    }
    return { n, cells };
  }, [url]);

  const quiet = 2; // 読み取りに必要な余白（セル数）
  const total = n + quiet * 2;
  const sweep = interpolate(frame, [delay, delay + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const edge = sweep * (n * 2 + 6);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <rect width={total} height={total} fill={paper} />
      {cells.map(({ x, y }) => {
        const d = x + y;
        if (d > edge) return null;
        return (
          <rect
            key={`${x}-${y}`}
            x={x + quiet}
            y={y + quiet}
            width={1.02}
            height={1.02}
            fill={ink}
          />
        );
      })}
    </svg>
  );
};
