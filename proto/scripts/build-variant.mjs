// node scripts/build-variant.mjs a  → dist-a/a.html（JSとCSSを埋め込んだ1ファイル）
import { execSync } from 'node:child_process'
const v = process.argv[2]
if (!/^[a-d]$/.test(v || '')) { console.error('usage: node scripts/build-variant.mjs <a|b|c|d>'); process.exit(1) }
execSync('npx vite build --logLevel warn', { stdio: 'inherit', env: { ...process.env, VARIANT: v } })
console.log(`built dist-${v}/${v}.html`)
