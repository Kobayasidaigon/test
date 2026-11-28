# 次回予約サイネージ「やる気より先に、予定を入れる。」

お会計・受付まわりのモニターで流す、**次回予約をその場で入れてもらうための動画**です。
Remotion（React で動画を作る仕組み）で作っていて、文言は ChatGPT で業種ごとに作れます。

- 長さ 24秒・音なし・ループ再生向け（最後は背景色に戻るので、つなぎ目が見えません）
- 横 16:9（1920×1080、受付のモニター）と縦 9:16（1080×1920、スタンド型）の2種類
- 業種4種を同梱：汎用 / 美容室・サロン / ジム・パーソナル / 整体・歯科・クリニック
- 書き出しは H.264・yuv420p・BT.709 の MP4（USBメモリ再生やSTBでそのまま流せる形式）

## 流れ（4シーン）

| 秒 | シーン | 見せること |
|---|---|---|
| 0–5 | 入れ替え | 「やる気 → 予定」の札が入れ替わり「予定 → やる気」に。見出し「やる気より先に、予定を入れる。」 |
| 5–12 | カレンダー | 来週の空き枠に「次回」がストンと入る。「予定が入っていれば、迷わない。」 |
| 12–17 | 理由3つ | いま予約すると、お客さまにとって何がいいか |
| 17–24 | 行動 | 「お帰りの前に、次回のご予約を。」と予約ページのQRコード |

画面下のバーで、いまどのシーンかが分かります（通りがかりに途中から見ても迷わないように）。

## 使い方

```bash
cd signage
npm install

npm run studio          # ブラウザで確認・編集（右のパネルで文言・色・QRのURLを変えられる）
npm run render          # 全業種 × 横/縦 を out/ に MP4 で書き出し
npm run render -- --only gym --format portrait   # ジムの縦だけ
npm run still           # 各シーンの静止画（チラシ・SNS用にも）
```

### 自分のお店に合わせる

`src/variants.json` の `brand` を書き換えます。

- `storeName` … 左上の店名
- `bookingUrl` … QRコードの飛び先（予約ページのURL）。**必ず差し替えてください**（いまは example.com）
- `showQr` … `false` にするとQRを出さず、受付での案内だけにします
- `paper` / `ink` / `muted` … 背景・文字・補足の色。アクセント色は業種ごと（`variants[].accent`）

文言の `\n` は改行の位置です。日本語は文節の切れ目で改行すると読みやすくなります。

## ChatGPT で文言を作る

```bash
cp .env.example .env    # OPENAI_API_KEY を入れる
export $(cat .env | xargs)

npm run copy -- --id seikotsu --industry "整骨院" --tone "やさしく、安心感"
npm run copy -- --id seikotsu --industry "整骨院" --n 3     # 切り口の違う3案（A/Bテスト用）
npm run copy -- --id seikotsu --industry "整骨院" --dry    # キーなしで、ChatGPT に渡す指示だけ確認
npm run copy -- --check                                     # いまの文言を一括チェック
```

作った文言は `src/variants.json` に追加され、Studio と書き出しにそのまま出てきます。

ChatGPT の出した文言は、そのまま使わずに機械でチェックしています（`scripts/copy.mjs`）。

- **文字数**：2〜3m離れて2秒で読める長さか（見出しは1行10文字・2行まで、など項目ごとの上限）
- **表現**：「必ず」「治る」「絶対」「No.1」などの、効果を言い切る言い方や大げさな言い方が入っていないか
  （景品表示法や医療広告ガイドラインで問題になりやすい言い方。整体・歯科・クリニックでは特に）

通らなければ理由を添えて ChatGPT に作り直させます（最大3回）。
モデルは `OPENAI_MODEL`（または `--model`）で変えられます。

チェックはあくまで目安です。医療・美容の広告表現は、公開前に人の目で確認してください。

## 中身

```
signage/
  src/
    variants.json        文言・色（業種ごと）← ふだん触るのはここだけ
    Signage.tsx          全体（背景・店名・進行バー・シーンのつなぎ）
    scenes/              4つのシーン
    components/          見出しのアニメーション・QRコード
    schema.ts            設定の型（Studio の編集パネルになる）
  scripts/
    copy.mjs             ChatGPT で文言を作る＋チェック
    render.mjs           まとめて書き出し
  public/fonts/          Zen Kaku Gothic New（SIL OFL 1.1、OFL.txt 同梱）
```

書体はファイルを同梱しているので、ネットにつながっていなくても書き出せます。

### 書き出し時の Chrome

Remotion は初回に Chrome を自動で取ってきます。取れない環境では、手元の Chrome のパスを渡します。

```bash
REMOTION_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run render
```

## サイネージに入れるときのメモ

- 縦置きのモニターでも、**縦用の動画（portrait）をそのまま**流してください（横動画を回転させない）
- 再生機の「ループ再生」をオンに。24秒で1周します
- QRコードは横型で画面の高さの約1/3（32型モニターで約14cm角）。1m前後からスマホで読み取れます。遠い場所に置くときは `showQr: false` にして受付案内だけにするのも手です
