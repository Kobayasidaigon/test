# FIT-EASY 店内サイネージ「やる気は、待っても来ない。」

FIT-EASY の店内モニターで流す、**帰る前に「次に来る日」をスマホのカレンダーに入れてもらうための動画**です（予約制ではないので「予約」とは言いません）。
Remotion（React で動画を作る仕組み）で作っていて、文言は ChatGPT で作れます。

- 17秒・音なし・ループ再生向け（最後と最初が同じ黄色なので、つなぎ目が出ません）
- 横 16:9（1920×1080）と縦 9:16（1080×1920）
- 文言2種を同梱：A「やる気は、待っても来ない。」/ B「行けたら行く、は行かない。」
- 書き出しは H.264・yuv420p・BT.709 の MP4（USBメモリ再生やSTBでそのまま流せる形式）

## 流れ

明るい色面に、太いゴシックを叩きつける構成です。1画面で1つのことだけ言い、次の色が斜めに横切って切り替わります。

| 秒 | 色 | 見せること |
|---|---|---|
| 0–2.8 | 黄 | 「やる気は、／待っても／来ない。」を1語ずつ |
| 2.8–5.4 | 青 | 「だから、先に」→「予定。」 |
| 5.4–8.9 | オレンジ | 「次は 木 19:00」。スマホのカレンダーに「ジム」の予定が入り、「決定」のハンコ |
| 8.9–11.3 | 黒 | 「予定があれば、」→「体は行く。」 |
| 11.3–17 | 黄 | 「帰る前に、カレンダーへ。」と、カレンダーに予定を追加するQR |

## 使い方

```bash
cd signage
npm install

npm run studio          # ブラウザで確認・編集（右のパネルで文言・色・QRのURLを変えられる）
npm run render          # 全業種 × 横/縦 を out/ に MP4 で書き出し
npm run render -- --only fiteasy-b --format portrait  # B案の縦だけ
npm run still           # 各シーンの静止画（チラシ・SNS用にも）
```

### 自分のお店に合わせる

`src/variants.json` の `brand` を書き換えます。

- `storeName` … 左上の店名
- `storeName` は「FIT-EASY ○○店」の○○を店名に
- `qrUrl` … QRコードの飛び先。いまは Google カレンダーの「予定を追加」画面（予定名「ジム（FIT-EASY）」）を開くリンクです。
  日時はお客さんが自分で選びます。iPhone の標準カレンダーに入れたい場合は、.ics ファイルを置いたURLに差し替えてください
- `showQr` … `false` にするとQRを出さず、受付での案内だけにします
- `yellow` / `blue` / `orange` / `ink` / `white` … 5色。FIT-EASY のブランドカラーに差し替えてください（いまは仮の色）

文言の `\n` は改行の位置です。日本語は文節の切れ目で改行すると読みやすくなります。

## ChatGPT で文言を作る

```bash
cp .env.example .env    # OPENAI_API_KEY を入れる
export $(cat .env | xargs)

npm run copy -- --id yoga --industry "ヨガスタジオ" --tone "やわらかく、でも背中を押す"
npm run copy -- --id yoga --industry "ヨガスタジオ" --n 3   # 切り口の違う3案（A/Bテスト用）
npm run copy -- --id yoga --industry "ヨガスタジオ" --dry  # キーなしで、ChatGPT に渡す指示だけ確認
npm run copy -- --check                                     # いまの文言を一括チェック
```

作った文言は `src/variants.json` に追加され、Studio と書き出しにそのまま出てきます。

ChatGPT の出した文言は、そのまま使わずに機械でチェックしています（`scripts/copy.mjs`）。

- **文字数**：2〜3m離れて2秒で読める長さか（見出しは1行10文字・2行まで、など項目ごとの上限）
- **表現**：「必ず」「絶対」「No.1」などの、効果を言い切る言い方や大げさな言い方が入っていないか
  （景品表示法で問題になりやすい言い方）

通らなければ理由を添えて ChatGPT に作り直させます（最大3回）。
モデルは `OPENAI_MODEL`（または `--model`）で変えられます。

チェックはあくまで目安です。公開前に人の目で確認してください。

## 中身

```
signage/
  src/
    variants.json        文言・色（業種ごと）← ふだん触るのはここだけ
    Signage.tsx          全体（シーンの順番と長さ）
    scenes.tsx           5つのシーン
    components/          叩きつける動き・揺れ・色の切り替え・QRコード
    schema.ts            設定の型（Studio の編集パネルになる）
  scripts/
    copy.mjs             ChatGPT で文言を作る＋チェック
    render.mjs           まとめて書き出し
  public/fonts/          Dela Gothic One（見出し）・Zen Kaku Gothic New（補足）
                         どちらも SIL OFL 1.1、ライセンス文同梱
```

書体はファイルを同梱しているので、ネットにつながっていなくても書き出せます。

### 書き出し時の Chrome

Remotion は初回に Chrome を自動で取ってきます。取れない環境では、手元の Chrome のパスを渡します。

```bash
REMOTION_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run render
```

## サイネージに入れるときのメモ

- 縦置きのモニターでは、**縦用の動画（portrait）をそのまま**流してください（横動画を回転させない）
- 再生機の「ループ再生」をオンに。17秒で1周します
- QRコードは横型で画面の高さの約1/3（32型モニターで約14cm角）。1m前後からスマホで読み取れます。遠い場所に置くときは `showQr: false` にして受付案内だけにするのも手です
