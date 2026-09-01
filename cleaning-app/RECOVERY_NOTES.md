# ジム清掃チェックシート（gym-cleaning-checklist）作業記録

2026-09-01 時点。ソースの回収から本番反映まで完了済み。

## 経緯

このアプリのソースコードはGitHubのどのリポジトリにも存在しなかったため、
本番のDockerイメージから回収した。回収物は gym-reservation-system リポジトリの
`recovered-cleaning-app` ブランチにある。

## アプリの構成

3ファイルだけの小さなアプリ。

| ファイル | 役割 |
|---|---|
| `server.js` | 198行のExpressサーバー。データ保存・認証・静的配信 |
| `package.json` | 依存はexpressのみ |
| `public/index.html` | アプリ本体（239KB・CSS/JS全部入り） |

### データの置き場所

- **サーバーが正**：`/data/state.json`（Fly.ioの永続ボリューム `vol_r682ye1en6em1gp4`・1GB）
  - `auto_backup_enabled: true` / 5世代保持で日次の自動バックアップあり
  - デプロイしてもデータは消えない
- localStorage は端末側のキャッシュ（オフライン時は後送）
- 見本の写真・動画は `/data/media/`

### 定義は店舗ごと

清掃項目・エリア構成・時間帯リストは店舗ごとに独立していて、
`sdef_<店舗>_<キー>` という名前で保存される。店舗別が無ければ共通キーにフォールバック。

- 時間帯は **朝番(`routine_asa`) / 中番(`routine_hiru`) / 遅番(`routine_ban`)**
- 時間帯リストの項目は画面から追加されたカスタム項目（`customItems_routine_*`）
- 組み込み項目を消す場合は `hiddenItems_<エリア>` にIDを足す方式

### 認証

サーバーの環境変数（Fly secrets）に設定済み。

| 変数 | 用途 |
|---|---|
| `BASIC_PASS` | マスター合言葉（店舗選択あり） |
| `PASS_KASADERA` / `PASS_BIWAJIMA` / `PASS_HAGINO` | 店舗別の合言葉（その店舗に固定される） |
| `ADMIN_PASS` | 「店舗まとめ」表示のゲート |

`/api/*` はクッキー認証。ツールからは Basic認証（パスワード＝`BASIC_PASS`）でも通る。
ページ自体は誰でも開ける（データだけ保護されている）。

### 担当者名の自動セット

`server.js` が予約システム（`gym-reservation-system` のJobcan取込データ）から
毎日シフトを取得し、`staffRoster` と `shiftSchedule_<店舗>` を自動更新している。
そのため担当者欄はシフト表に基づいて自動で入る。

## 実施した変更（本番反映済み）

### 1. 笠寺・枇杷島の遅番から3項目を削除

| 項目 | ID |
|---|---|
| サウナ清掃・マット交換 | `routine_ban_v3_06` |
| パウダールーム・更衣室の清掃 | `routine_ban_v3_07` |
| 紙コップ補充（トイレにも） | `routine_ban_v3_12` |

- 萩野通は対象外（未変更）
- 朝番の「サウナ清掃」、中番の「プロテイン用紙コップ補充」は残してある
- 変更前の値は GitHub Actions のアーティファクト `before-delete-routine-ban` に保存（復元用）

### 2. 画面の変更

- ヘッダー右上に「📖 使用方法」ボタンを追加（`/usage-guide.pdf` を開く）
- やることリストの外部リンクを、🔗アイコンから行内の全幅ボタンに変更
  （タイトルに「在庫」またはURLに inventory を含む場合は「在庫管理システムを開く」）
- 使い方ガイドPDF（A4・9ページ）を `public/usage-guide.pdf` として同梱

`server.js` は回収したものと完全一致（サーバーの挙動は変えていない）。

## このリポジトリの中身

| パス | 内容 |
|---|---|
| `public/index.html` | 本番と同じ画面ファイル（上記の変更入り） |
| `public/usage-guide.pdf` | スタッフ向け使い方ガイド |
| `server.js` `package.json` `package-lock.json` | 回収したサーバー側（未編集） |
| `docs/usage-guide.html` | ガイドの元（Web版・PDFの生成元） |

### 使い方ガイドの中身

朝番・中番・遅番の進め方、担当者がシフトから自動で入ること、在庫入力、
清掃項目の見本の見かた、遅番のサーマナイフのショット数（男性・女性を別々に入力）まで。
画面はすべて実際のスクリーンショット。

PDFを作り直すときは、画像が印刷時に読み込まれず白紙になることがあるため、
生成前に `loading="eager"` にして `img.decode()` の完了を待つこと。
1枚でも `naturalWidth === 0` なら失敗させて気づけるようにしてある。

## 作業用ワークフロー（gym-reservation-system / claude/recover-cleaning-app ブランチ）

| ファイル | 用途 |
|---|---|
| `recover-cleaning-app.yml` | 本番イメージからソースを回収する |
| `cleaning-prod-ops.yml` | 本番データの調査・項目削除 |
| `cleaning-deploy.yml` | 本番へデプロイする |
| `check-secrets.yml` | 必要なSecretの登録状況を確認する |

いずれも `FLY_CLEANING_TOKEN`（デプロイ用トークン）で動く。

### トークンの権限について

登録されているのは**デプロイ用トークン**。できること・できないことは以下のとおり。

- できる：`status` / イメージ取得 / SSH / デプロイ
- できない：ボリュームのスナップショット操作（日次の自動バックアップは別途有効）

## 次に何かする場合の注意

- 項目の削除・変更は `state.json` を直接書き換えず、**アプリのAPI（PUT /api/state/:key）経由**で行うこと。
  サーバーはメモリ上に状態を持っていて、次の保存でファイルを上書きするため。
- 店舗ごとに定義が独立しているので、1店舗だけ変えたい場合は `sdef_<店舗>_...` を対象にする。
- 画面を変えたら `docs/usage-guide.html` とPDFも合わせて更新する。
