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
- `src/pages/` … ページ。`src/pages/Tool.tsx` が道具の画面（`/app`）。
- `src/index.css`、`index.html` … 見た目の土台（「見積書に、赤ペンで点検を入れる」）。色のトークン（机 `desk`、紙 `paper`、インク `ink`、赤ペン `pen`、蛍光ペン `marker`、えんぴつ `pencil`）、
  書体（`font-sans` ＝ BIZ UDPGothic、`num` ＝ BIZ UDGothic の数字、`font-pen` ＝ Zen Kurenaido の手書き）、紙（`sheet`）、印刷（A4）の決まり。
- `src/components/ui/` … 21st.dev から取り入れて、作り変えた部品（一覧は `CREDITS.md`）。
- `src/components/` … このサービスの部品。赤ペンの線（`pen.tsx`）、紙（`sheet.tsx`）、赤ペンが入った見積書（`inspected-sheet.tsx`）、
  1行ごとの結果（`finding-card.tsx`）、区分の印（`category-mark.tsx`）、出典（`source-link.tsx`）、相談先（`consult-desks.tsx`）、
  確認の文面の便せん（`message-preview.tsx`）、広告の枠（`offer-slot.tsx`）、サイトの印（`brand.tsx`）。LP からも使える（描くときに window にさわらない）。
- `src/components/tool/` … 道具の画面の組み立て（手順1〜3、保存、ファイルの書き出しと読み込み）。
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
