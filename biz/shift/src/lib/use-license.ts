import { useCallback, useEffect, useState } from 'react'
import { site } from '@/site.config'
import { reasonText, verifyLicense, type License } from './license'

// 有料版かどうかを画面から使うためのフック。
//
// 公開前（site.licensePublicKey が空）は、キーを確かめようがないので「公開前モード」になる。
// 公開前モードでは有料版の機能をすべて開け、無料版の見え方は previewFree で切り替えて確かめられる。
// 公開後（公開鍵を入れたあと）は、正しいキーを入れた人だけが有料版になる。

const KEY = `${site.slug}:license`
const PREVIEW = `${site.slug}:preview-free`

export type LicenseState = {
  /** 読み込みが済んだか（済むまでは無料版として描く） */
  ready: boolean
  /** 有料版の機能を使えるか */
  isPro: boolean
  /** 公開前モードか（公開鍵が未設定） */
  prelaunch: boolean
  /** 公開前モードで、無料版の見え方を確かめているか */
  previewFree: boolean
  setPreviewFree: (v: boolean) => void
  /** 入っているライセンス（公開後だけ） */
  license: License | null
  /** キーを入れる。だめなら理由の文を返す */
  activate: (licenseKey: string) => Promise<string | null>
  /** キーを外す */
  deactivate: () => void
}

export function useLicense(): LicenseState {
  const prelaunch = !site.licensePublicKey
  const [ready, setReady] = useState(false)
  const [license, setLicense] = useState<License | null>(null)
  const [previewFree, setPreview] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (prelaunch) {
          setPreview(localStorage.getItem(PREVIEW) === '1')
        } else {
          const saved = localStorage.getItem(KEY)
          if (saved) {
            const r = await verifyLicense(saved, site.licensePublicKey, site.slug)
            if (alive && r.ok) setLicense(r.license)
          }
        }
      } catch {
        // 保存領域が使えないブラウザでは無料版として動かす
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [prelaunch])

  const activate = useCallback(async (licenseKey: string) => {
    if (prelaunch) return '公開前のため、まだキーを使えません。'
    const r = await verifyLicense(licenseKey, site.licensePublicKey, site.slug)
    if (!r.ok) return reasonText[r.reason]
    try {
      localStorage.setItem(KEY, licenseKey.trim())
    } catch {}
    setLicense(r.license)
    return null
  }, [prelaunch])

  const deactivate = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {}
    setLicense(null)
  }, [])

  const setPreviewFree = useCallback((v: boolean) => {
    try {
      if (v) localStorage.setItem(PREVIEW, '1')
      else localStorage.removeItem(PREVIEW)
    } catch {}
    setPreview(v)
  }, [])

  const isPro = ready && (prelaunch ? !previewFree : license !== null)
  return { ready, isPro, prelaunch, previewFree, setPreviewFree, license, activate, deactivate }
}
