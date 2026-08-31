# ジム清掃チェックシート（gym-cleaning-checklist.fly.dev）回収メモ

2026-08-31、本番サイトから回収。このアプリのソースコードはGitHubのどのリポジトリにも
存在しなかったため、稼働中のサイトから取得した。

## 回収できたもの

- `public/index.html` … アプリ本体（238KB・完全版）。CSS/JSすべてインラインの1枚構成で、
  以下の機能が全部この中に入っている:
  - エリア別チェックリスト（シャワールーム / トイレ / トレーニングフロア / マシン・器具 / エントランス・受付）
  - 各項目の清掃方法・OK/NG見本写真（写真/動画）登録
  - 定期項目（頻度つき）・月次点検（採点式）
  - 店舗別の合言葉ログイン・管理者ゲート（タイトル5回タップ）・3店舗まとめダッシュボード
  - 作業者名簿の管理・データのバックアップ/復元
- `endpoint-probe.txt` … 本番サーバーのエンドポイント応答調査

## アプリの構成（判明分）

- クライアント: この index.html 1枚。**データはサーバー（/api/state）が正**で、
  localStorage は端末キャッシュ（オフライン時はローカル更新→pendingSyncで後送）
- **定義は店舗別**: 清掃項目・エリア構成・朝番/中番/遅番の「やることリスト」は
  店舗ごとに独立していて、`sdef_<店舗>_<キー>` という名前で /api/state に保存される
  （例: `sdef_笠寺_customAreas`, `sdef_枇杷島_customItems_routine_*`,
  `sdef_<店舗>_hiddenItems_<エリア>`）。店舗別が無ければ共通キーにフォールバック。
  朝番・中番・遅番のリスト自体が画面から追加されたカスタムエリア（routine_*）＝サーバーデータで、
  HTMLの初期定義には入っていない。
- つまり「特定店舗の項目を消す」はコード修正ではなく**サーバー上のデータ変更**
  （アプリのUIで消すのと同じ場所に書く）。HTMLの初期定義を消すと全店舗に効いてしまう。
- サーバー: 薄いAPI層。認証必須（未認証は401）
  - `POST /api/login` / `POST /api/admin-login` / `POST /api/logout`
  - `GET /api/state`、`GET/PUT /api/state/:key` … 端末間同期用のキー値ストア
  - `GET /api/media`、`GET/PUT/DELETE /api/media/:id` … 見本写真/動画の保存
  - `GET /api/version`
  - `/login`・`/health` は200、その他のパスは index.html を返すcatch-all

## まだ回収できていないもの

- サーバー側ソースコード（上記APIの実装）
- サーバーに保存されている見本写真/動画などのデータ

回収手段は用意済み: `gym-reservation-system` リポジトリの
`.github/workflows/recover-cleaning-app.yml`（`claude/recover-cleaning-app` ブランチ）が、
Fly.io の本番Dockerイメージからソース一式を取り出して `recovered-cleaning-app`
ブランチに保存する。ただし既存の `FLY_API_TOKEN` は gym-reservation-system 専用で
このアプリに届かないため、`gym-cleaning-checklist` にアクセスできるトークンを
リポジトリSecret `FLY_CLEANING_TOKEN` として登録してから再実行する必要がある。

## 回収後にこのリポジトリ側で加えた変更（本番未反映）

- `public/index.html`: やることリスト内の外部リンク項目を、裸の🔗アイコンから
  行内の全幅ボタン表示に変更（タイトルに「在庫」またはURLに inventory を含む場合は
  「在庫管理システムを開く」、それ以外は「サイトを開く」）。エリアページ側の
  リンクボタンも同じ文言ロジックに統一。
- `public/index.html`: ヘッダー右上に「📖 使用方法」ボタンを追加（`/usage-guide.pdf` を
  新規タブで開く）。
- `public/usage-guide.pdf`: スタッフ向け使い方ガイドのPDF（docs/usage-guide.html から生成）。
  ※本番サーバーが index.html 以外の静的ファイルを配信するかは未確認
  （現状 /manifest.json 等は index.html を返す catch-all 挙動）。サーバーソース回収後、
  静的配信が無ければ /usage-guide.pdf を返すルートを足すこと。

**上記の本番へのデプロイはすべてFly.ioアクセス取得後。**

## 注意

- 本番の見た目や文言の修正はこの index.html を編集すればよいが、本番サイトへの反映
  （デプロイ）にはサーバー側一式の回収（または再実装）とFly.ioへのデプロイ手段が必要。
- 既存端末のデータ（localStorage）はオリジン（URL）に紐づくため、本番反映は同じ
  アプリ名 gym-cleaning-checklist へのデプロイで行うこと。URLが変わるとスタッフの
  端末に保存された記録が見えなくなる。
