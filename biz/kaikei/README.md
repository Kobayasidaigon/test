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
- `src/pages/` … ページ。`src/components/ui/` … 21st.dev から取り入れた部品。
- `src/lib/license.ts`、`scripts/license.mjs` … 有料版のライセンスキー（サーバーなしで確かめる）。
- データはブラウザの中だけに保存する。サーバーはない。
