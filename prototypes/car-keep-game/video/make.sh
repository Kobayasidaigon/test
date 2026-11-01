#!/usr/bin/env bash
# 縦型のSNS用動画（1080x1920・30fps）を作る。効果音つき・音なしの2本を出力する
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-./frames}"
rm -rf "$WORK"; mkdir -p "$WORK"
node record.js "$WORK"
python3 sfx.py "$WORK/sfx.json" "$WORK/sfx.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$WORK/%05d.jpg" -i "$WORK/sfx.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart car-keep-game.mp4
ffmpeg -y -loglevel error -framerate 30 -i "$WORK/%05d.jpg" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart car-keep-game-nosound.mp4
ls -lh car-keep-game*.mp4
