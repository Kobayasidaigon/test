// 道具の画面が持つデータ（plan）の入れ物。
// - 開いたときに、ブラウザの保存領域から読む。壊れていても落ちない（読めなかった理由を持っておく）。
// - plan が変わるたびに、保存領域へ書く（保存ボタンはない。書けなかったら、そのことを知らせる）。
// - 「元に戻す」のために、変える前の plan を少し覚えておく。
import { useCallback, useEffect, useRef, useState } from 'react'
import { clearPlan, loadPlan, savePlan, type ShiftPlan, type StorageLike } from '@/core'

export type LoadIssue =
  /** 保存されていたが、読めなかった。raw は保存されていた文字（ファイルとして取り出せるように持っておく） */
  | { kind: 'broken'; reason: string; raw: string }
  /** 保存領域そのものが使えない（プライベートブラウズなど） */
  | { kind: 'unavailable' }

export type SaveState = { status: 'idle' | 'saved' | 'failed'; at: Date | null }

export type UpdateOptions = {
  /**
   * 同じ名前の変更が続けて来たら、「元に戻す」の1回ぶんにまとめる
   * （名前を1文字打つたびに1回ぶん、とならないように）。
   */
  coalesce?: string
}

/** 覚えておく「元に戻す」の回数 */
const HISTORY_LIMIT = 40
/** この時間のうちに来た同じ名前の変更を、1回ぶんにまとめる */
const COALESCE_MS = 2500

function getStorage(): StorageLike | null {
  // 保存領域が止められているブラウザでは、localStorage に触っただけで例外が出ることがある
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function usePlanStore() {
  const [ready, setReady] = useState(false)
  const [plan, setPlanState] = useState<ShiftPlan | null>(null)
  const [issue, setIssue] = useState<LoadIssue | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle', at: null })
  const [undoCount, setUndoCount] = useState(0)

  // いちばん新しい plan。続けて呼ばれた update が、古い plan をもとに計算しないようにする
  const planRef = useRef<ShiftPlan | null>(null)
  const history = useRef<ShiftPlan[]>([])
  const lastCoalesce = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    const storage = getStorage()
    if (!storage) setIssue({ kind: 'unavailable' })
    else {
      const r = loadPlan(storage)
      if (r.status === 'ok') {
        planRef.current = r.plan
        setPlanState(r.plan)
        setSave({ status: 'saved', at: r.savedAt ? new Date(r.savedAt) : null })
      } else if (r.status === 'broken') setIssue({ kind: 'broken', reason: r.reason, raw: r.raw })
      else if (r.status === 'unavailable') setIssue({ kind: 'unavailable' })
    }
    setReady(true)
  }, [])

  const write = useCallback((next: ShiftPlan | null) => {
    const storage = getStorage()
    if (next === null) {
      if (storage) clearPlan(storage)
      setSave({ status: 'idle', at: null })
      return
    }
    const ok = storage ? savePlan(storage, next) : false
    setSave({ status: ok ? 'saved' : 'failed', at: ok ? new Date() : null })
    // 書けたなら、前に読めなかったデータは上書きされたので、知らせを消す
    if (ok) setIssue((i) => (i?.kind === 'broken' ? null : i))
  }, [])

  const commit = useCallback(
    (next: ShiftPlan | null, options: UpdateOptions & { keepHistory?: boolean } = {}) => {
      const prev = planRef.current
      if (next === prev) return
      if (prev && options.keepHistory !== false) {
        const now = Date.now()
        const last = lastCoalesce.current
        const merged = !!options.coalesce && last?.key === options.coalesce && now - last.at < COALESCE_MS
        if (!merged) {
          history.current = [...history.current.slice(-(HISTORY_LIMIT - 1)), prev]
          setUndoCount(history.current.length)
        }
        lastCoalesce.current = options.coalesce ? { key: options.coalesce, at: now } : null
      }
      planRef.current = next
      setPlanState(next)
      write(next)
    },
    [write],
  )

  /** いまの plan を書きかえる。fn は、新しい plan を返す（core の edit.ts の関数をそのまま使える） */
  const update = useCallback(
    (fn: (plan: ShiftPlan) => ShiftPlan, options?: UpdateOptions) => {
      const prev = planRef.current
      if (!prev) return
      commit(fn(prev), options)
    },
    [commit],
  )

  /** plan をまるごと入れかえる（サンプル、ファイルの読み込み、自動作成の結果、はじめからやり直す） */
  const replace = useCallback((next: ShiftPlan | null, options?: { keepHistory?: boolean }) => commit(next, options), [commit])

  /** 1つ前に戻す。戻せたら true */
  const undo = useCallback(() => {
    const prev = history.current[history.current.length - 1]
    if (!prev) return false
    history.current = history.current.slice(0, -1)
    setUndoCount(history.current.length)
    lastCoalesce.current = null
    planRef.current = prev
    setPlanState(prev)
    write(prev)
    return true
  }, [write])

  /** 読めなかったデータの知らせを消す（消して始める、を選んだとき） */
  const dismissIssue = useCallback(() => {
    const storage = getStorage()
    if (storage) clearPlan(storage)
    setIssue(null)
  }, [])

  return { ready, plan, planRef, issue, save, update, replace, undo, canUndo: undoCount > 0, dismissIssue }
}

export type PlanStore = ReturnType<typeof usePlanStore>
