# 無料開放デー サイネージ動画

縦長のリール動画（1080×1920）を、店内サイネージ用の横長に作り直したものです。

- 1920×1080（横向き）・30fps・26.5 秒・H.264（High / Level 4.1）・MP4・音声なし
- 最後のコマと最初のコマがつながるので、そのままリピート再生できます

## 作り直すとき

```
node render.mjs                    # out/gym_free_open_day_signage.mp4 を書き出す（2 分ほど）
node render.mjs --stills 2.6,7.5   # その秒数の静止画だけ out/ に出す（確認用）
```

必要なもの: Node.js、Playwright（Chromium）、ffmpeg。
`index.html` をブラウザで開くと、書き出さずに動きを確認できます（`index.html?t=13.6` でその秒数の 1 コマ）。

## 文言や日付を変えるとき

`src/main.js` の先頭にある `TEXT` だけを書き換えます（店名・日付・曜日・時間・金額など）。
文字数が大きく変わると枠からはみ出すことがあるので、`--stills` で確認してください。

## 中身

| ファイル | 中身 |
|---|---|
| `index.html` / `src/main.js` | 画面と動き。`seek(t)` で t 秒の 1 コマを描く |
| `render.mjs` | 1 コマずつ撮って MP4 にする |
| `assets/room.png` | 背景（ジムの部屋）。元動画の背景を横長に組み直したもの |
| `assets/man1.png` ほか | 人物 4 人と QUO カード 2 枚。元動画から切り抜いたもの |
| `assets/NotoSansJP-Black.woff2` | 文字のフォント（Noto Sans JP Black、SIL Open Font License） |

場面は 5 つです: 無料開放デー（0〜5 秒）→ お誘い（5〜10.5 秒）→ 紹介キャンペーン（10.5〜17 秒）→ のりかえキャンペーン（17〜22 秒）→ しめ（22〜26.5 秒）。
