# data/

- `localgovjp-utf8.csv` … 全国の地方公共団体（都道府県・市区町村・政令市の区）の一覧。名前、読みがな、緯度経度（役所の位置）、公式サイトURL、キャッチフレーズ、地方公共団体コード。
  - 出典: Code for FUKUI「localgovjp」 https://github.com/code4fukui/localgovjp （元データ: 国土地理院、地方公共団体情報システム機構）
  - ライセンス: CC0
  - 取得日: 2026年11月1日
- `scripts/gen-municipalities.mjs` で `src/shared/municipalities.ts` を作る（政令市の区は除き、1,741市区町村）。
