import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// VARIANT=a なら a.html だけを dist-a/ に1ファイルで書き出す。未指定なら index.html（デザイン切り替え付き）を dist/ に。
const variant = process.env.VARIANT
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  build: {
    outDir: variant ? `dist-${variant}` : 'dist',
    emptyOutDir: true,
    rollupOptions: { input: resolve(root, variant ? `${variant}.html` : 'index.html') },
  },
})
