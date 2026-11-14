# ひきつぎ会計

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

- `src/site.config.ts` … サービス名、URL、決済ページ、運営者の情報。公開前に埋める項目はここに集めてある。
- `src/routes.ts` … ページの一覧。ここに足したページが `dist/<パス>/index.html` になる。
- `src/core/` … 計算、判定、保存の形式、サンプルのデータ（画面に依存しない TypeScript）。使い方と設計は `src/core/README.md`。
- `src/pages/` … ページ。道具の画面は `src/pages/Tool.tsx`（`/app`）。
- `src/components/ui/` … 21st.dev から取り入れて作り変えた部品（何をどう変えたかは `CREDITS.md`）と、朱のはんこ（`seal.tsx`）。
- `src/components/tool/` … 道具の画面（はじめの画面、入力と一覧、科目と予算、残高の照合、資料、引き継ぎ）。
- `src/components/papers/` … 総会の資料5種類の「紙」。道具の画面と LP の見本の両方で使える（静的HTMLに書き出しても崩れない）。
- `src/index.css` … 色・書体・角の丸み・影のトークン（「帳簿と、朱のはんこ」）。`src/styles/paper.css` … 資料の紙と、印刷（A4 縦）の決まり。
- `src/lib/license.ts`、`scripts/license.mjs` … 有料版のライセンスキー（サーバーなしで確かめる）。
- データはブラウザの中だけに保存する。サーバーはない。
