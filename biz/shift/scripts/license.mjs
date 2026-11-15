// ライセンスキーの鍵を作る・キーを発行する・確かめる。運営者の手元で使う。
//
//   node scripts/license.mjs keygen
//       鍵の組を作る。秘密鍵は .license-private.json に保存（Git には入れない。なくすと再発行できないので控えを取る）。
//       表示された公開鍵を src/site.config.ts の licensePublicKey に貼る。
//   node scripts/license.mjs issue --name "山田商店" [--plan pro] [--days 365]
//       キーを発行する。--days を付けなければ期限なし（買い切り）。
//   node scripts/license.mjs verify <キー>
//       キーの中身を確かめる。
import { readFile, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const privatePath = resolve(root, '.license-private.json')
const ALGO = { name: 'ECDSA', namedCurve: 'P-256' }
const SIGN = { name: 'ECDSA', hash: 'SHA-256' }
const b64u = (bytes) => Buffer.from(bytes).toString('base64url')

async function siteConfig() {
  const text = await readFile(resolve(root, 'src/site.config.ts'), 'utf8')
  const pick = (name) => text.match(new RegExp(`${name}:\\s*'([^']*)'`))?.[1] ?? ''
  return { slug: pick('slug'), licensePublicKey: pick('licensePublicKey') }
}

/** 説明の文を出して止める（Node のエラーをそのまま見せると、何が起きたかわかりにくいため） */
function fail(message) {
  console.error(message)
  process.exit(1)
}

/** 秘密鍵を読む。ないとき・こわれているときは、どうすればよいかを言って止める */
async function readPrivateKey() {
  let text
  try {
    text = await readFile(privatePath, 'utf8')
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      fail(
        '秘密鍵（.license-private.json）が、このフォルダにありません。\n' +
          '鍵を作ったパソコン（node scripts/license.mjs keygen を実行したパソコン）から、控えを持ってきて、このフォルダに置いてください。\n' +
          '新しく keygen をすると、発行済みのキーがすべて使えなくなるので、控えがあるうちは作り直さないでください。',
      )
    }
    fail(`秘密鍵（.license-private.json）を読めませんでした（${e && e.message ? e.message : e}）。`)
  }
  try {
    return await crypto.subtle.importKey('jwk', JSON.parse(text), ALGO, false, ['sign'])
  } catch {
    fail('秘密鍵（.license-private.json）の中身がこわれています。控えのファイルと入れかえてください。')
  }
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
  // --days は、期限つきのキーを作るときだけ。数字でないと日付が作れないので、先に断る
  if (days !== undefined && !/^[1-9][0-9]{0,4}$/.test(days)) fail('--days には、日数を数字で入れてください（例: --days 365）。買い切りのキーは、--days を付けずに発行します。')
  const today = new Date()
  const license = {
    product: slug,
    name,
    plan: flag('plan') ?? 'pro',
    issuedAt: today.toISOString().slice(0, 10),
    expiresAt: days ? new Date(today.getTime() + Number(days) * 86400000).toISOString().slice(0, 10) : null,
  }
  const key = await readPrivateKey()
  const body = b64u(new TextEncoder().encode(JSON.stringify(license)))
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)))
  console.error(JSON.stringify(license))
  console.log(`${body}.${b64u(sig)}`)
} else if (cmd === 'verify') {
  const { slug, licensePublicKey } = await siteConfig()
  const [body, sig] = (rest[0] ?? '').trim().split('.')
  if (!rest[0]) {
    console.error('使い方: node scripts/license.mjs verify <キー>   （site.config.ts に licensePublicKey が必要）')
    process.exit(1)
  }
  // 公開鍵がないのか、キーの形がちがうのかを分けて言う（どちらも「使い方」の文にすると、何を直せばよいかわからない）
  if (!licensePublicKey) fail('site.config.ts の licensePublicKey が空です。keygen で表示された公開鍵を貼ってから、確かめてください。')
  if (!body || !sig) fail('キーの形が正しくありません。キーを、最初から最後まで（途中の「.」もふくめて）コピーし直してください。')
  let key
  try {
    key = await crypto.subtle.importKey('spki', Buffer.from(licensePublicKey, 'base64url'), ALGO, false, ['verify'])
  } catch {
    fail('site.config.ts の licensePublicKey が、公開鍵の形になっていません。keygen で表示された公開鍵を、最初から最後まで貼り直してください。')
  }
  let license
  try {
    license = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    fail('キーの形が正しくありません。キーを、最初から最後まで（途中の「.」もふくめて）コピーし直してください。')
  }
  let ok = false
  try {
    ok = await crypto.subtle.verify(SIGN, key, Buffer.from(sig, 'base64url'), new TextEncoder().encode(body))
  } catch {
    ok = false
  }
  const valid = ok && license && license.product === slug
  console.log(valid ? '有効なキーです。' : '無効なキーです。', license)
  process.exit(valid ? 0 : 1)
} else {
  console.log('使い方: node scripts/license.mjs keygen | issue --name "名前" [--plan pro] [--days 365] | verify <キー>')
}
