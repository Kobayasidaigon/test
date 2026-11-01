# sumugacha.com の公開手順（Vercel）

2026年11月1日。この環境からは Vercel につながらないため、アカウントとドメインの操作は運営者が行う。リポジトリ側の準備は済んでいる。

## リポジトリ側の準備（済み）

- `vercel.json`（リポジトリの一番上）: `proto/` で `npm ci` → `npm run build:site` → `proto/dist-site` を公開。Vercel の画面で設定を変える必要はない。
- 本番ビルドは案A「カプセルトイ」だけ（`proto/site/index.html` → `proto/src/entries/site.tsx`）。試作の4案比べ（`proto/vite.config.ts`）とは別。
- 広告の仮の枠（「PR（提携後に表示）」）は本番では出さない（`proto/site/site.css`）。
- `/about`（このサイトについて・データの出典・プライバシー・広告について）、`robots.txt`、`sitemap.xml`、共有画像 `og.png`（1200×630）、アイコン一式。
- 共有画像とアイコンの作り直し: `cd proto && npm run make:og`（元の絵は `proto/scripts/og/`）。
- 手元での確認: `cd proto && npm run build:site && npm run preview:site`。

## 運営者がやること

1. **Vercel に GitHub でログイン**し、Add New → Project → `Kobayasidaigon/test` を Import → 設定は変えずに Deploy。
   - リポジトリが一覧に出ないときは、Vercel の GitHub アプリにこのリポジトリへのアクセスを許可する。
2. **本番は main ブランチから出る。** 作業ブランチ（`claude/affiliate-niche-site`）を main に入れるまで、sumugacha.com には中身が出ない。
   - 作業ブランチに push するたびに、確認用の URL（プレビュー）が自動でできる。プレビューは検索エンジンに載らない。
3. **ドメインをつなぐ。** Project → Settings → Domains で `sumugacha.com` を追加し、「www.sumugacha.com を sumugacha.com へリダイレクト」を選ぶ（サイトの正式な URL は `https://sumugacha.com/` にしてある）。
   - ドメインを Vercel で買った場合は、何もしなくてよい。
   - ほかの会社で買った場合は、Vercel の画面に出る DNS の値を、その会社の管理画面に入れる（例: `@` の A レコード `76.76.21.21`、`www` の CNAME `cname.vercel-dns.com`。プロジェクトによって値がちがうので、画面に出た値を使う）。前からある `@` の A レコードは消す。
   - 反映には数分〜数時間かかる。HTTPS の証明書は Vercel が自動で付ける。

## 気をつけること

- **Vercel の無料プラン（Hobby）は、お金を得ない個人利用に限られる。** アフィリエイトが主な目的のサイトや、広告（AdSense など）を載せたサイトは、Pro（1人 月20ドル）が必要（Vercel の Fair Use Guidelines）。アフィリエイトのリンクや広告を入れる前に Pro に切り替える。無料のまま続けたいなら Cloudflare Pages などへ移す手もある（ビルドの設定は同じ）。
- 運営者の情報とお問い合わせ先は、まだ `/about` に入れていない（決まったら足す）。ASP の審査ではよく見られる。
- 表示名「住む街ガチャ」は、公開前に J-PlatPat で「街ガチャ」の登録の範囲を確かめると安心（`docs/06_naming.md`）。万一のときは表示名を「すむガチャ」に変えるだけで、ドメイン sumugacha.com はそのまま使える。
