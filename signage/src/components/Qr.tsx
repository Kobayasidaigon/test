import React, { useMemo } from "react";
import QRCode from "qrcode";

/** 予約ページへのQRコード。SVGで描くので、どの解像度でもにじまない。 */
export const Qr: React.FC<{
  url: string;
  size: number;
  ink: string;
  paper: string;
}> = ({ url, size, ink, paper }) => {
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
