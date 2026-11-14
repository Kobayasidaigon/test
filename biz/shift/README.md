# たたき台シフト

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

- `src/site.config.ts` … サービス名、URL、決済ページ、運営者の情報、料金（`pricing`、`plans`、`sales`）。公開前に埋める項目はここに集めてある。料金の数字は、ここだけを変える。
- `src/routes.ts` … ページの一覧。ここに足したページが `dist/<パス>/index.html` になる。
- `src/core/` … 中身のロジック（データの型、自動作成、点検、組めない理由の説明、保存と読み込み、サンプル）。画面に依存しない。使い方は `src/core/README.md`。
- `src/pages/` … ページ。`src/pages/Tool.tsx` が道具の画面（/app）で、保存と読み込み、手順の切りかえ、自動作成の進行をまとめている。
- `src/components/tool/` … 道具の画面の中身（はじめの画面、①〜④の手順、印刷用の表、ファイルを開く、買い切り版の案内）。
- `src/components/shift-grid.tsx`、`shift-block.tsx`、`logo.tsx` … シフト表・勤務のブロック・印。道具の画面と LP の両方で使う。
- `src/components/ui/` … 21st.dev から取り入れて、作り変えた部品。出どころと変えたところは `CREDITS.md`。
- `src/index.css` … 色・書体・角の丸み・影のトークンと、シフト表（`.sg`）・ブロック（`.blk`）・印刷（`.pt`）の見た目。
- `src/lib/license.ts`、`scripts/license.mjs` … 有料版のライセンスキー（サーバーなしで確かめる）。
- データはブラウザの中だけに保存する。サーバーはない。
