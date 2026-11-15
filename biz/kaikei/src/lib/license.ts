// 有料版のライセンスキーを、サーバーなしで確かめる仕組み。
// 運営者が秘密鍵で署名したキーを発行し（scripts/license.mjs）、ブラウザは公開鍵で署名を確かめる。
// キーの形: 「本文（base64url の JSON）.署名（base64url）」
// 画面の中の制限なので、技術のある人が外すことはできる。正直に買ってくれる人のための仕組み。

export type License = {
  /** どのサービスのキーか（site.slug と同じ） */
  product: string
  /** 買った人の名前または団体名（画面に出す） */
  name: string
  /** プラン名（例: 'pro'） */
  plan: string
  /** 発行日（YYYY-MM-DD） */
  issuedAt: string
  /** 期限（YYYY-MM-DD）。買い切りなら null */
  expiresAt: string | null
}

export type VerifyResult =
  | { ok: true; license: License }
  | { ok: false; reason: 'format' | 'signature' | 'product' | 'expired' | 'unsupported' }

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' } as const
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const

export function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** 鍵の組を作る。公開鍵は site.config.ts に、秘密鍵は運営者の手元だけに置く。 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify'])
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  return { publicKey: toBase64Url(spki), privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey) }
}

/** ライセンスキーを発行する（運営者の手元で使う）。 */
export async function issueLicense(license: License, privateKey: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateKey, ALGO, false, ['sign'])
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(license)))
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)))
  return `${body}.${toBase64Url(sig)}`
}

/** ライセンスキーを確かめる。today は 'YYYY-MM-DD'。 */
export async function verifyLicense(
  licenseKey: string,
  publicKey: string,
  product: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<VerifyResult> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return { ok: false, reason: 'unsupported' }
  const parts = licenseKey.trim().replace(/\s+/g, '').split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'format' }
  let license: License
  let sig: Uint8Array<ArrayBuffer>
  try {
    license = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])))
    sig = fromBase64Url(parts[1])
  } catch {
    return { ok: false, reason: 'format' }
  }
  if (!license || typeof license.product !== 'string' || typeof license.plan !== 'string') return { ok: false, reason: 'format' }
  let valid = false
  try {
    const key = await crypto.subtle.importKey('spki', fromBase64Url(publicKey), ALGO, false, ['verify'])
    valid = await crypto.subtle.verify(SIGN, key, sig, new TextEncoder().encode(parts[0]))
  } catch {
    return { ok: false, reason: 'signature' }
  }
  if (!valid) return { ok: false, reason: 'signature' }
  if (license.product !== product) return { ok: false, reason: 'product' }
  if (license.expiresAt && license.expiresAt < today) return { ok: false, reason: 'expired' }
  return { ok: true, license }
}

export const reasonText: Record<Exclude<VerifyResult, { ok: true }>['reason'], string> = {
  format: 'キーの形が正しくありません。メールに書かれたキーを、最初から最後までコピーしてください。',
  signature: 'このキーは確認できませんでした。コピーしたときに文字が欠けていないか確かめてください。',
  // どの文も、何が起きたかに続けて、どうすればよいかを言う
  product: 'このキーは、別のサービスのものです。このサービスのキーが書かれたメールを確かめて、もう一度貼り付けてください。',
  expired: 'このキーは、期限が切れています。有料版を使うときは、あらためてお申し込みください。',
  unsupported: 'このブラウザではキーを確認できません。最新の Chrome、Safari、Edge、Firefox でお試しください。',
}
