# sumugacha（住む街ガチャ）

家族の条件（子どもの年齢・世帯年収・働き方・今の街）を入れると、引っ越し先の街で、子育ての制度による家計の差が年いくら変わるかを計算するサイト「住む街ガチャ」（https://sumugacha.com）のリポジトリです。

## ブランチ

- `main` … 本番。Vercel がここから sumugacha.com を作ります。
- `develop` … 作業中。push するたびに Vercel が確認用のURL（プレビュー）を作ります。公開できる状態になったら、プルリクエストで `main` に入れます。

## 中身（`develop`）

- `proto/` … サイト本体（Vite + React）。本番は案A「カプセルトイ」。データと出典は `proto/data/README.md`。
- `signage/` … 店舗向け「次回予約」サイネージ動画（Remotion + ChatGPT）。使い方は `signage/README.md`。
- `docs/` … 調査の記録と公開手順（`docs/07_deploy.md`）。
