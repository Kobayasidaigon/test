import { Config } from "@remotion/cli/config";

// サイネージ用途: 画質優先 / H.264 で多くのプレーヤーで再生できるように
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(16);
Config.setOverwriteOutput(true);
