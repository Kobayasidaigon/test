import { describe, expect, it } from 'vitest'
import { generateKeyPair, issueLicense, verifyLicense, type License } from './license'

const base: License = { product: 'demo', name: '山田商店', plan: 'pro', issuedAt: '2026-11-14', expiresAt: null }

describe('license', () => {
  it('正しいキーは通る', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    const r = await verifyLicense(key, publicKey, 'demo', '2026-12-01')
    expect(r).toEqual({ ok: true, license: base })
  })
  it('前後の空白や改行が入っていても通る', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    const r = await verifyLicense(`  ${key.slice(0, 20)}\n${key.slice(20)} `, publicKey, 'demo')
    expect(r.ok).toBe(true)
  })
  it('書き換えたキーは通らない', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    const forged = await issueLicense({ ...base, name: '別の人' }, (await generateKeyPair()).privateKey)
    expect(await verifyLicense(forged, publicKey, 'demo')).toEqual({ ok: false, reason: 'signature' })
    const [body, sig] = key.split('.')
    expect((await verifyLicense(`${body}x.${sig}`, publicKey, 'demo')).ok).toBe(false)
  })
  it('別のサービスのキーは通らない', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense(base, privateKey)
    expect(await verifyLicense(key, publicKey, 'other')).toEqual({ ok: false, reason: 'product' })
  })
  it('期限が切れたキーは通らない。期限の当日までは通る', async () => {
    const { publicKey, privateKey } = await generateKeyPair()
    const key = await issueLicense({ ...base, expiresAt: '2027-03-31' }, privateKey)
    expect((await verifyLicense(key, publicKey, 'demo', '2027-03-31')).ok).toBe(true)
    expect(await verifyLicense(key, publicKey, 'demo', '2027-04-01')).toEqual({ ok: false, reason: 'expired' })
  })
  it('形のおかしい文字列は format', async () => {
    const { publicKey } = await generateKeyPair()
    expect(await verifyLicense('', publicKey, 'demo')).toEqual({ ok: false, reason: 'format' })
    expect(await verifyLicense('abc', publicKey, 'demo')).toEqual({ ok: false, reason: 'format' })
    expect(await verifyLicense('abc.def', publicKey, 'demo')).toEqual({ ok: false, reason: 'format' })
  })
})
