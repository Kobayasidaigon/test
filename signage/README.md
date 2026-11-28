# 予定サイネージ — やる気より先に、予定を入れる。

ジム館内のデジタルサイネージ用の動画です。帰る前に、次に来る日時をスマホのカレンダーに入れてもらうことを狙っています。
[Remotion](https://www.remotion.dev/) で作っていて、コピーはチャッピー(ChatGPT)で量産して差し替えられます。

- 縦 1080×1920(スタンド・柱・エレベーター横) / 横 1920×1080(受付モニター・壁掛けTV)
- 約33秒、30fps、H.264。最後は暗転して頭につながるので、ループ再生しても継ぎ目が目立ちません
- 配色はチャコール `#22262A` × ライム `#C3E11A`(既存 CM から色を拾ったもの)

## 構成

| # | シーン | 背景 | 中身 |
|---|---|---|---|
| 1 | つかみ | チャコール | 「やる気が出たら行こう」→ その考え方が、→ **続かない原因かも。**(ライムの箱) |
| 2 | メッセージ | ライム | 続けられる人は、やる気より **予定が先。**(背景に SCHEDULE FIRST が流れる) |
| 3 | コツ3つ | チャコール | POINT 01〜03(白抜き数字 + 下線) |
| 4 | デモ | チャコール | スマホのカレンダーの日付をタップ → 予定カードが入り、通知ベルが鳴る |
| 5 | 呼びかけ | ライム | 次回の予定、いま入れよう。+ QRコード |
| 6 | 締め | チャコール | 店舗名 → 検索バー風の欄に「次回の予定」が打ち込まれて [登録] |

シーンの切り替えでは、ライムの斜めの面が画面を横切ります。

## はじめかた

```bash
cd signage
npm install
npm run studio        # ブラウザでプレビュー。右パネルで文言・色をその場で編集できます
npm run render        # props/current.json の内容で out/ に縦・横の MP4 を書き出す
```

## 文言・店舗名・QR を変える

`props/current.json` を書き換えて `npm run render` するだけです。

- `gymName` … 最後に大きく出る店舗名(例: `"○○ 岐阜店"`)
- `qr.url` … 空欄のままだと「Google カレンダーの予定作成画面」へのリンクになります(予定名と場所は入った状態で開き、日時はその場で選ぶ)。会員アプリや LINE の URL があればそちらを入れてください
- `qr.enabled` … `false` で QR を消せます
- `palette` … 色(`base` 背景 / `lime` メイン / `text` 白文字 / `deep` ライムの上の文字)

文字数が多いときは、画面からはみ出さないように自動で文字が小さくなります。

## チャッピー(ChatGPT)でコピーを作る

### A. API で自動生成(案を JSON で保存 → そのまま書き出し)

```bash
export OPENAI_API_KEY=sk-...
npm run copy:gpt -- --theme "朝の時間帯に来る会員向け" --n 3
#   → props/gpt/<日時>-1.json 〜 -3.json ができる
npm run render -- props/gpt/*.json   # 全案を縦横で書き出し
```

- モデルは `OPENAI_MODEL` で変えられます(既定 `gpt-5-mini`)
- 決まった形の JSON で返させる設定(Structured Outputs)なので、返ってきたものをそのまま流し込めます
- 根拠のない数字や効果の断定は書かないように指示しています。文字数が上限を超えた案には警告を出します
- `--dry` を付けると API を呼ばずにプロンプトを表示します

### B. ChatGPT の画面で作る(API キー不要)

[prompts/chatgpt-copy.md](prompts/chatgpt-copy.md) のプロンプトを ChatGPT に貼り、返ってきた JSON を `props/current.json` か Studio の右パネルに入れてください。

## サンプル

- `props/current.json` … 既定(全会員向け)
- `props/samples/beginner.json` … 入会1か月以内の方向け

```bash
npm run render -- props/samples/beginner.json
```

## ファイル

```
src/
  Root.tsx           縦・横の2つのコンポジション
  Signage.tsx        シーンの並びと長さ、切り替え
  schema.ts          差し替えできる項目の定義(Studio の右パネルに出る)
  scenes/            Hook / Principle / Points / Demo / Cta / End
  components/parts.tsx  文字の出方・下線・斜めの切り替え・背景の斜線・QR
scripts/
  gen-copy.mjs       ChatGPT でコピー案を作る
  render-all.mjs     縦横まとめて MP4 に書き出す
prompts/chatgpt-copy.md  ChatGPT の画面に貼る用のプロンプト
```

## 注意

- ロゴやブランド名の扱いは、各社のガイドラインにしたがってください。既定の店舗名は `YOUR GYM` にしてあります
- フォントは Google Fonts(Noto Sans JP / Anton / Oswald)を書き出し時に読み込みます。ネットにつながる環境で書き出してください
