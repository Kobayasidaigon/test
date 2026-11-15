// ライセンスキーの鍵を作る・キーを発行する・確かめる。運営者の手元で使う。
//
//   node scripts/license.mjs keygen
//       鍵の組を作る。秘密鍵は .license-private.json に保存（Git には入れない。なくすと再発行できないので控えを取る）。
//       表示された公開鍵を src/site.config.ts の licensePublicKey に貼る。
//   node scripts/license.mjs issue --name "山田商店" [--plan pro] [--days 365]
//       キーを発行する。--days を付けなければ期限なし（買い切り）。
//       発行したキーの控え（発行日、期限、名前、キー）を、.license-issued.tsv に1行足す（Git には入れない）。
//       「キーをなくした」「メールが届かない」と言われたときは、この控えのキーを送り直す（出し直すと、期限が延びてしまう）。
//   node scripts/license.mjs verify <キー>
//       キーが、道具の画面で使えるかを確かめる（署名、サービス名、期限）。メールで折り返されたキーを、そのまま貼ってよい。
import { readFile, writeFile, appendFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const privatePath = resolve(root, '.license-private.json')
const issuedPath = resolve(root, '.license-issued.tsv')
/** 今日の日付（手元の時計で）。道具の画面も、使う人の手元の日付で期限を見る。 */
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const ALGO = { name: 'ECDSA', namedCurve: 'P-256' }
const SIGN = { name: 'ECDSA', hash: 'SHA-256' }
const b64u = (bytes) => Buffer.from(bytes).toString('base64url')

async function siteConfig() {
  const text = await readFile(resolve(root, 'src/site.config.ts'), 'utf8')
  const pick = (name) => text.match(new RegExp(`${name}:\\s*'([^']*)'`))?.[1] ?? ''
  return { slug: pick('slug'), licensePublicKey: pick('licensePublicKey') }
}

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : undefined
}

if (cmd === 'keygen') {
  try {
    await access(privatePath)
    console.error('.license-private.json がすでにあります。作り直すと、発行済みのキーがすべて使えなくなります。作り直すときは、先にファイルを消してください。')
    process.exit(1)
  } catch {}
  const pair = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify'])
  const publicKey = b64u(new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey)))
  await writeFile(privatePath, JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey), null, 2) + '\n', { mode: 0o600 })
  console.log('秘密鍵を .license-private.json に保存しました（Git には入りません。控えを安全な場所に取ってください）。')
  console.log('\nsrc/site.config.ts の licensePublicKey に、次の公開鍵を貼ってください:\n')
  console.log(publicKey)
} else if (cmd === 'issue') {
  const { slug } = await siteConfig()
  const name = flag('name')
  if (!name) {
    console.error('使い方: node scripts/license.mjs issue --name "買った人の名前" [--plan pro] [--days 365]')
    process.exit(1)
  }
  const days = flag('days')
  const today = new Date()
  const license = {
    product: slug,
    name,
    plan: flag('plan') ?? 'pro',
    issuedAt: today.toISOString().slice(0, 10),
    expiresAt: days ? new Date(today.getTime() + Number(days) * 86400000).toISOString().slice(0, 10) : null,
  }
  const key = await crypto.subtle.importKey('jwk', JSON.parse(await readFile(privatePath, 'utf8')), ALGO, false, ['sign'])
  const body = b64u(new TextEncoder().encode(JSON.stringify(license)))
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)))
  const licenseKey = `${body}.${b64u(sig)}`
  console.error(JSON.stringify(license))
  console.log(licenseKey)
  // 控えを残す。だれに・いつ・どのキーを出したかがわからないと、問い合わせのときに、同じキーを送り直せない
  try {
    const clean = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ')
    await appendFile(issuedPath, [license.issuedAt, license.expiresAt ?? '期限なし', clean(license.name), clean(license.plan), licenseKey].join('\t') + '\n', { mode: 0o600 })
    console.error('控えを .license-issued.tsv に足しました（発行日・期限・名前・キー。Git には入りません）。')
  } catch (e) {
    console.error(`控えを .license-issued.tsv に書けませんでした（${e.message}）。上のキーを、自分で控えてください。`)
  }
} else if (cmd === 'verify') {
  const { slug, licensePublicKey } = await siteConfig()
  // 道具の画面と同じように、空白と改行を取りのぞいてから確かめる（メールで折り返されたキーを、そのまま貼って確かめられるように）
  const text = rest.join('').replace(/\s+/g, '')
  if (!text || !licensePublicKey) {
    console.error('使い方: node scripts/license.mjs verify <キー>   （site.config.ts に licensePublicKey が必要）')
    process.exit(1)
  }
  const parts = text.split('.')
  let license = null
  let signed = false
  try {
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('format')
    license = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (!license || typeof license.product !== 'string' || typeof license.plan !== 'string') throw new Error('format')
    const key = await crypto.subtle.importKey('spki', Buffer.from(licensePublicKey, 'base64url'), ALGO, false, ['verify'])
    signed = await crypto.subtle.verify(SIGN, key, Buffer.from(parts[1], 'base64url'), new TextEncoder().encode(parts[0]))
  } catch {
    console.log('キーの形が正しくありません。キーを、最初から最後までコピーしたか確かめてください。')
    process.exit(1)
  }
  // 道具の画面（src/lib/license.ts の verifyLicense）と同じ順に、同じことを確かめる。ここで「有効」と出たキーは、画面でも通る
  if (!signed) {
    console.log('無効なキーです（署名が合いません）。文字が欠けているか、別の鍵で作ったキーです。', license)
    process.exit(1)
  }
  if (license.product !== slug) {
    console.log(`無効なキーです（別のサービス「${license.product}」のキーです）。`, license)
    process.exit(1)
  }
  if (license.expiresAt && license.expiresAt < localToday()) {
    console.log(`期限が切れています（${license.expiresAt} まで）。道具の画面でも、使えません。`, license)
    process.exit(1)
  }
  console.log(license.expiresAt ? `有効なキーです（${license.expiresAt} まで使えます）。` : '有効なキーです（期限はありません）。', license)
} else {
  console.log('使い方: node scripts/license.mjs keygen | issue --name "名前" [--plan pro] [--days 365] | verify <キー>')
}
