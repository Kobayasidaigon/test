// 「いま開いている帳簿に入っているキー」で、有料版かどうかを決めるための小さな道具。
//
// キーは団体のもの（料金の説明と、特定商取引法の表記にそう書いている）。はじめは「ブラウザに残ったキー」で
// 有料版かどうかを決めていたが、それだと、同じパソコンで開いた別の団体の帳簿まで有料版になり、
// 画面が「このキーを、ひきつぎファイルに入れる」と勧めてしまった（点検で見つかった）。
// そこで、キーは帳簿（ひきつぎファイル）の中にだけ置き、その帳簿を開いているあいだだけ有料版にする。
// キーを写せば、ほかの団体でも使えてしまうことは変わらない（サーバーがないので、止めるしくみは作れない）。
// ここで防ぐのは、「道具のほうから、別の団体のファイルにキーを入れるように案内してしまう」こと。
import { fromBase64Url, reasonText, verifyLicense, type License } from './license'

/** 帳簿に入っているキーを確かめた結果。 */
export type BookLicense =
  /** 帳簿にキーが入っていない */
  | { status: 'none' }
  /** 確かめている途中（ほんの一瞬） */
  | { status: 'checking' }
  /** 有料版 */
  | { status: 'ok'; license: License }
  /** 期限が切れた。license は、いつ切れたかを画面に出すためのもの */
  | { status: 'expired'; license: License }
  /** 確かめられなかった（書きかえられた、別のサービスのキー、など）。message は、そのまま画面に出せる文 */
  | { status: 'invalid'; message: string }

/**
 * キーの中身を、署名を確かめずに読む。
 * 「だれあてのキーか」「いつ切れたか」を画面に出すためだけに使う。有料版かどうかの判定には使わないこと。
 */
export function peekLicense(licenseKey: string): License | null {
  const parts = licenseKey.replace(/\s+/g, '').split('.')
  if (parts.length !== 2 || !parts[0]) return null
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])))
    if (typeof value !== 'object' || value === null) return null
    const v = value as Record<string, unknown>
    if (typeof v.product !== 'string' || typeof v.plan !== 'string') return null
    return {
      product: v.product,
      name: typeof v.name === 'string' ? v.name : '',
      plan: v.plan,
      issuedAt: typeof v.issuedAt === 'string' ? v.issuedAt : '',
      expiresAt: typeof v.expiresAt === 'string' ? v.expiresAt : null,
    }
  } catch {
    return null
  }
}

/** 帳簿に入っているキーを確かめる。today は 'YYYY-MM-DD'（使う人の、その日の日付）。 */
export async function checkBookLicense(licenseKey: string, publicKey: string, product: string, today?: string): Promise<BookLicense> {
  if (licenseKey.replace(/\s+/g, '') === '') return { status: 'none' }
  const r = await verifyLicense(licenseKey, publicKey, product, today)
  if (r.ok) return { status: 'ok', license: r.license }
  if (r.reason === 'expired') {
    // 署名は、期限より先に確かめてある（verifyLicense の順）。ここに来るのは、本物のキーが切れたときだけ
    const license = peekLicense(licenseKey)
    if (license) return { status: 'expired', license }
  }
  return { status: 'invalid', message: reasonText[r.reason] }
}

/** 名前をくらべるために、書き方のゆれ（空白、全角と半角、大文字と小文字）をならす。 */
function normalizeName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
}

/**
 * キーの名前（お申し込みのときの団体の名前）と、帳簿の団体の名前が、同じとみなせるか。
 * 空白や全角・半角のちがいは見ない。キーに名前が入っていないときは、くらべようがないので true。
 * 違っていても、キーを断りはしない（「◯◯町内会」と「◯◯町内会 3班」のように、書き方が違うだけのことがあるため）。
 * 画面は、確かめをはさむ。
 */
export function sameOrgName(licenseName: string, orgName: string): boolean {
  const a = normalizeName(licenseName)
  const b = normalizeName(orgName)
  return a === '' || a === b
}
