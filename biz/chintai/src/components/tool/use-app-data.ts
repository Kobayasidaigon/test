import { useCallback, useEffect, useRef, useState } from 'react'
import { clearData, createEmptyData, isEmptyData, loadData, saveData, STORAGE_KEY, type AppData } from '@/core'

// 道具の内容（AppData）を持ち、ブラウザの保存領域（localStorage）と行き来する。
//
// - 読み込むのは、ページを開いたあと（useEffect の中）。描くときには window にさわらない。
// - 内容が変わるたびに、すぐ保存する（保存ボタンは置かない。押し忘れで消えるのを防ぐため）。
// - 読めなかった、保存できなかった、というときも落ちずに、理由を notice に入れて画面に出す。
// - ほかのタブで同じ道具を開いて書き換えたときは、その内容に合わせる（古い内容で上書きして消さないため）。

export type AppNotice =
  /** 保存されていたデータを、読めなかった。 */
  | { kind: 'broken'; text: string }
  /** このブラウザでは、保存できない。 */
  | { kind: 'unavailable'; text: string }
  /** 保存に失敗した。 */
  | { kind: 'save-failed'; text: string }
  /** 読み込めたが、直したところがある。 */
  | { kind: 'warnings'; text: string; details: string[] }

/** localStorage を取り出す。プライベートブラウズなどで、さわるだけで例外になるブラウザがあるので、囲んでおく。 */
function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useAppData() {
  const [data, setDataState] = useState<AppData>(createEmptyData)
  /** 保存領域からの読み込みが終わったか。終わるまでは、入力欄を出さない（空の内容で上書きしないため）。 */
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState<AppNotice | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  /** 利用者が書き換えたか。読み込んだだけのときは、保存し直さない。 */
  const dirty = useRef(false)

  const applyLoaded = useCallback(() => {
    const loaded = loadData(getStorage())
    dirty.current = false
    setDataState(loaded.data)
    if (loaded.status === 'broken' || loaded.status === 'unavailable') {
      setNotice({ kind: loaded.status, text: loaded.reason })
      setSavedAt(null)
    } else if (loaded.status === 'ok') {
      setNotice(loaded.warnings.length > 0 ? { kind: 'warnings', text: '保存されていた内容の一部を、直して読み込みました。', details: loaded.warnings } : null)
      setSavedAt(loaded.savedAt ? new Date(loaded.savedAt) : null)
    } else {
      setNotice(null)
      setSavedAt(null)
    }
  }, [])

  useEffect(() => {
    applyLoaded()
    setReady(true)
    // ほかのタブで書き換えられたら、その内容に合わせる。
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) applyLoaded()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyLoaded])

  useEffect(() => {
    if (!ready || !dirty.current) return
    const storage = getStorage()
    if (isEmptyData(data) && data.message.lineIds === null) {
      // 全部消したあとは、保存領域も空に戻す（次に開いたとき、はじめての人と同じ画面になる）。
      clearData(storage)
      setSavedAt(null)
      setNotice((n) => (n?.kind === 'save-failed' ? null : n))
      return
    }
    const now = new Date()
    const result = saveData(storage, data, now)
    if (result.ok) {
      setSavedAt(now)
      setNotice((n) => (n?.kind === 'save-failed' ? null : n))
    } else {
      setNotice({ kind: storage ? 'save-failed' : 'unavailable', text: result.reason })
    }
  }, [data, ready])

  /** 内容を書き換える（保存もされる）。 */
  const setData = useCallback((next: AppData | ((prev: AppData) => AppData)) => {
    dirty.current = true
    setDataState(next)
  }, [])

  return { data, setData, ready, notice, setNotice, savedAt }
}

export type AppDataHandle = ReturnType<typeof useAppData>
