import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// 本番（https://sumugacha.com）用のビルド。案A「カプセルトイ」だけを、ふつうの分割ビルド
// （ハッシュ付きの JS・CSS。CDN に長くキャッシュさせる）で dist-site/ に書き出す。
// site/public/ の中身（about.html、robots.txt、画像など）はそのままコピーされる。
// 試作の4案比べ（vite.config.ts の1ファイルビルド）には影響しない。
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: resolve(root, 'site'),
  publicDir: resolve(root, 'site/public'),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  server: { fs: { allow: [root] } },
  build: {
    outDir: resolve(root, 'dist-site'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'site/index.html'),
      output: {
        // めったに変わらない部分（ライブラリと全国の市区町村データ）を別のファイルにして、更新のたびに全部を読み直させない
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
          if (/src[\\/]shared[\\/](municipalities|national)\.ts$/.test(id)) return 'data'
        },
      },
    },
  },
})
