import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))

// ふつうのビルド（npm run build）: ページごとの静的HTMLを dist/ に書き出す（scripts/prerender.mjs）。
// 1ファイルのビルド（npm run build:single）: 全ページを dist-single/index.html の1枚にまとめる。確認用。
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    resolve: { alias: { '@': resolve(root, 'src') } },
    define: { __SINGLE__: JSON.stringify(single) },
    build: single ? { outDir: 'dist-single', emptyOutDir: true } : { emptyOutDir: true },
    // 開発サーバーが依存を調べる入口を index.html だけにする（build:single で作った dist-single/index.html まで読むと、
    // 中にうめ込んだ依存を探しに行って「could not be resolved」と出るため）
    optimizeDeps: { entries: ['index.html'] },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
