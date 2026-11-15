import { describe, expect, it } from 'vitest'
import { checkBookLicense, peekLicense, sameOrgName } from './book-license'
import { generateKeyPair, issueLicense, reasonText, type License } from './license'

const base: License = { product: 'kaikei', name: 'みどり町内会', plan: 'pro', issuedAt: '2026-11-15', expiresAt: '2027-12-20' }

describe('帳簿に入っているキーを確かめる（checkBookLicense）', () => {
  it('キーが入っていなければ none（空白だけでも）', async () => {
    const { publicKey } = await generateKeyPair()
    expect(await checkBookLicense('', publicKey, 'kaikei')).toEqual({ status: 'none' })
    expect(await checkBookLicense(' \n ', publicKey, 'kaikei')).toEqual({ status: 'none' })
  })
  it('正しいキーは ok。期限の当日までは使える', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    expect(await checkBookLicense(key, publicKey, 'kaikei', '2026-11-15')).toEqual({ status: 'ok', license: base })
    expect(await checkBookLicense(key, publicKey, 'kaikei', '2027-12-20')).toEqual({ status: 'ok', license: base })
  })
  it('期限が切れたキーは expired。いつ切れたか（と、だれあてか）がわかる', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    expect(await checkBookLicense(key, publicKey, 'kaikei', '2027-12-21')).toEqual({ status: 'expired', license: base })
  })
  it('書きかえたキー・別の鍵で作ったキーは、期限が切れていても expired にはしない（本物かどうか、わからないため）', async () => {
    const { publicKey } = await generateKeyPair()
    const forged = await issueLicense({ ...base, expiresAt: '2020-01-01' }, (await generateKeyPair()).privateKey)
    expect(await checkBookLicense(forged, publicKey, 'kaikei', '2026-11-15')).toEqual({ status: 'invalid', message: reasonText.signature })
  })
  it('別のサービスのキー・形のおかしい文字は invalid。理由の文が付く', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const other = await issueLicense({ ...base, product: 'other' }, privateKey)
    expect(await checkBookLicense(other, publicKey, 'kaikei', '2026-11-15')).toEqual({ status: 'invalid', message: reasonText.product })
    expect(await checkBookLicense('abc', publicKey, 'kaikei')).toEqual({ status: 'invalid', message: reasonText.format })
  })
  it('断る文は、どうすればよいかを言う', () => {
    for (const text of Object.values(reasonText)) expect(text).toMatch(/ください/)
  })
})

describe('キーの中身を読む（peekLicense）', () => {
  it('署名を確かめずに、名前と期限を読める。空白や改行が入っていてもよい', async () => {
    const { privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    expect(peekLicense(key)).toEqual(base)
    expect(peekLicense(`${key.slice(0, 30)}\n ${key.slice(30)}`)).toEqual(base)
  })
  it('読めない文字は null（落ちない）', () => {
    for (const text of ['', 'abc', 'abc.def', '.x', 'e30.x', '%%%.%%%']) expect(peekLicense(text)).toBeNull()
  })
})

describe('キーの名前と、帳簿の団体の名前をくらべる（sameOrgName）', () => {
  it('同じ名前。空白、全角と半角、大文字と小文字のちがいは見ない', () => {
    expect(sameOrgName('みどり町内会', 'みどり町内会')).toBe(true)
    expect(sameOrgName('みどり 町内会', 'みどり町内会')).toBe(true)
    expect(sameOrgName('みどり　町内会 ', ' みどり町内会')).toBe(true)
    expect(sameOrgName('ＡＢＣサークル', 'abcサークル')).toBe(true)
    expect(sameOrgName('第３班', '第3班')).toBe(true)
  })
  it('違う名前', () => {
    expect(sameOrgName('みどり町内会', '点検1の会')).toBe(false)
    expect(sameOrgName('みどり町内会', 'みどり町内会 3班')).toBe(false)
    expect(sameOrgName('みどり町内会', '')).toBe(false)
  })
  it('キーに名前が入っていなければ、くらべない', () => {
    expect(sameOrgName('', 'みどり町内会')).toBe(true)
    expect(sameOrgName('  ', 'みどり町内会')).toBe(true)
  })
})
