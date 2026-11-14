# みつもり点検

## 動かす

```sh
npm install
npm run dev            # 開発用。http://localhost:5173
npm run build          # ページごとの静的HTMLを dist/ に書き出す
npm run serve          # dist/ を http://localhost:4173 で確認する
npm run build:single   # 全ページを dist-single/index.html の1ファイルにまとめる（確認用）
npm test               # 計算のテスト
npm run typecheck
```

## しくみ

- `src/site.config.ts` … サービス名、URL、運営者の情報、料金と売り方（`pricing`）。公開前に埋める項目はここに集めてある。
- `src/routes.ts` … ページの一覧。ここに足したページが `dist/<パス>/index.html` になる。
- `src/pages/` … ページ。`src/components/ui/` … 21st.dev から取り入れた部品。
- `src/core/` … 中身のロジックとデータ（項目のルール、出典、点検、確認の文面、保存の形式）。くわしくは `src/core/README.md`。
- `src/offers.ts` … 広告の枠。`url` が空の枠は表示しない（いまは全部空）。
- データはブラウザの中だけに保存する。サーバーはない。

## お金の入り方

道具は無料で、登録もいらない。有料版・ライセンスキー・決済ページはない（土台にあった仕組みは消した）。
収入は広告（アフィリエイト）だけ。提携できたら、`src/offers.ts` の `url`・`title`・`description` を入れる。広告には必ず「広告」と表示する。

## 公開の前に、運営者がやること

- `src/site.config.ts` の `baseUrl`、`contact`、`operator` を入れる。
- `src/core/sources.ts` の URL を1つずつ開いて、`src/core/items.ts` の根拠の文が合っているかを確かめる
  （2026-11-14 の確認は、公式サイトに絞った検索の抜粋で行った。理由は `src/core/README.md`）。
  確かめたら、`RULES_VERIFIED_ON` と、それぞれの `verifiedOn` を、確かめた日に直す。
