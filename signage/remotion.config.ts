import { Config } from "@remotion/cli/config";

// サイネージ用：H.264 / yuv420p は多くのSTB・USB再生機でそのまま流れる形式。
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCrf(16);
Config.setOverwriteOutput(true);

// 手元に Chrome がある場合は REMOTION_BROWSER でパスを渡せる（未指定なら Remotion が自動取得）。
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
