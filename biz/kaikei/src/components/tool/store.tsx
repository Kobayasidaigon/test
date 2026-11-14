import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  STORAGE_KEY,
  clearLocal,
  dateFromLocal,
  findYear,
  isSampleBook,
  isYearLocked,
  latestYear,
  loadLocal,
  markSaved,
  openBookFile,
  saveBookToFile,
  saveLocal,
  stateFromFile,
  stateFromNewBook,
  summarizeYear,
  unsavedInfo,
  type Book,
  type DateString,
  type FiscalYear,
  type LocalState,
  type Result,
  type StorageLike,
  type UnsavedInfo,
  type YearSummary,
} from '@/core'
import { site } from '@/site.config'
import { useLicense, type LicenseState } from '@/lib/use-license'
import { toast } from '@/components/ui/toast'

// 道具の画面ぜんたいで使う状態（帳簿、見ている年度、保存、ライセンス）を、ひとつにまとめたもの。
// 帳簿そのものは src/core の関数で変える。ここは「変えた結果を画面に入れる」「ブラウザの中に控えを保存する」
// 「ファイルに保存する・開く」をつなぐだけ。

/** localStorage を取る。プライベートブラウズなどで触れないときは null（画面は落とさない）。 */
function getStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** どの画面（タブ）を開いていたかを覚えておく場所の名前（このタブを閉じるまで）。 */
export const TAB_STORAGE = `${site.slug}:tab`

/** 開いていた画面を忘れる。新しい帳簿を始めたとき・ファイルを開いたときは、いつも「入力」の画面から始めるため。 */
function forgetTab(): void {
  try {
    window.sessionStorage.removeItem(TAB_STORAGE)
  } catch {
    // 覚えていなくても困らない
  }
}

/** このブラウザに入れてあるライセンスキー（use-license.ts が保存したもの）。なければ空。 */
export function storedLicenseKey(): string {
  try {
    return window.localStorage.getItem(`${site.slug}:license`) ?? ''
  } catch {
    return ''
  }
}

export type ApplyOptions = {
  /** うまくいったときに出す知らせ */
  done?: string
  /** うまくいかなかったとき、知らせを出さない（呼んだ側で、入力欄の下に理由を出すとき） */
  quiet?: boolean
}

export type Notice = { kind: 'warn' | 'error' | 'info'; message: string; detail?: string }

export type Store = {
  /** 読み込みが済んだか */
  ready: boolean
  state: LocalState | null
  /** はじめの画面や、画面の上に出す知らせ（保存データが壊れていた、など） */
  notice: Notice | null
  clearNotice: () => void
  /** ブラウザの中に保存できないときの文（できているときは null） */
  storageProblem: string | null
  /** 別のタブ（ウィンドウ）で、同じデータが変わったか */
  changedElsewhere: boolean
  reloadFromStorage: () => void
  /** 新しい帳簿・サンプルで始める */
  startWith: (book: Book) => void
  /** ひきつぎファイルを開く。だめなら理由の文を返す */
  openFile: (file: Blob) => Promise<string | null>
  /** ブラウザの中のデータを消して、はじめの画面に戻る */
  reset: () => void
  license: LicenseState
  today: DateString
}

/** 帳簿を開いているときに、各画面が使うもの。 */
export type Workspace = Store & {
  state: LocalState
  book: Book
  /** いま見ている年度 */
  year: FiscalYear
  /** 見ている年度が、読むだけか（繰り越したあとの前の年度） */
  locked: boolean
  summary: YearSummary
  setYearId: (id: string) => void
  /** core の関数の結果を、帳簿に入れる。うまくいったら true */
  apply: (result: Result<Book>, options?: ApplyOptions) => boolean
  /** ファイルに保存する（ダウンロードが始まる） */
  saveFile: () => void
  unsaved: UnsavedInfo
  /**
   * ファイルに保存したほうがよいか（まだ保存していない、または、保存してから変更がある）。
   * 何も変えていないサンプルは、保存をすすめない（見本なので、残さなくてよい）
   */
  dirty: boolean
  isSample: boolean
  isPro: boolean
}

export function useStore(): Store & { yearId: string | null; setYearId: (id: string) => void; setState: (updater: (s: LocalState | null) => LocalState | null) => void } {
  const license = useLicense()
  const [ready, setReady] = useState(false)
  const [state, setStateRaw] = useState<LocalState | null>(null)
  const [yearId, setYearId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [storageProblem, setStorageProblem] = useState<string | null>(null)
  const [changedElsewhere, setChangedElsewhere] = useState(false)
  // 「今日」は、開いたときの日付で決める（途中で日付が変わっても、入力の途中で年度の判定が動かないように）
  const today = useMemo(() => dateFromLocal(new Date()), [])
  // このタブが最後に書いた中身。別のタブからの変更と、自分の保存を見分けるために覚えておく
  const lastWritten = useRef<string | null>(null)

  const load = useCallback(() => {
    const storage = getStorage()
    if (!storage) {
      setStorageProblem('このブラウザでは、データを自動で保存できません。こまめに「ファイルに保存」を押してください。')
      setStateRaw(null)
      return
    }
    const r = loadLocal(storage)
    if (r.status === 'ok') {
      setStateRaw(r.state)
      setYearId(latestYear(r.state.book).id)
      if (r.warnings.length > 0) setNotice({ kind: 'warn', message: r.warnings.join(' ') })
    } else {
      setStateRaw(null)
      if (r.status === 'broken') setNotice({ kind: 'error', message: r.message, detail: r.detail })
      if (r.status === 'unavailable') setStorageProblem(r.message)
    }
  }, [])

  // 開いたときに、ブラウザの中のデータを読む
  useEffect(() => {
    load()
    setReady(true)
  }, [load])

  // 帳簿が変わるたびに、ブラウザの中に控えを保存する
  useEffect(() => {
    if (!ready || state === null) return
    const storage = getStorage()
    if (!storage) return
    const r = saveLocal(storage, state)
    setStorageProblem(r.ok ? null : r.message)
    try {
      lastWritten.current = storage.getItem(STORAGE_KEY)
    } catch {
      lastWritten.current = null
    }
  }, [state, ready])

  // 別のタブで同じデータが変わったら、知らせる（気づかないまま、古いほうで上書きしないように）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (e.newValue !== lastWritten.current) setChangedElsewhere(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ひきつぎファイルにライセンスキーが入っていて、まだ有料版でなければ、そのキーを確かめる
  // （キーは団体のもの。前の担当が入れたキーが、ファイルと一緒に次の担当へ渡る）
  const triedKeys = useRef(new Set<string>())
  const bookKey = state?.book.licenseKey ?? ''
  const { ready: licenseReady, prelaunch, license: activeLicense, activate } = license
  useEffect(() => {
    if (!bookKey || !licenseReady || prelaunch || activeLicense) return
    if (triedKeys.current.has(bookKey)) return
    triedKeys.current.add(bookKey)
    let alive = true
    activate(bookKey).then((reason) => {
      if (!alive) return
      if (reason === null) toast.success('ひきつぎファイルに入っているライセンスキーで、有料版になりました。')
      else toast.warning(`ひきつぎファイルに入っているライセンスキーは、使えませんでした。${reason}`, { duration: 12_000 })
    })
    return () => {
      alive = false
    }
  }, [bookKey, licenseReady, prelaunch, activeLicense, activate])

  const startWith = useCallback((book: Book) => {
    forgetTab()
    setStateRaw(stateFromNewBook(book))
    setYearId(latestYear(book).id)
    setNotice(null)
    setChangedElsewhere(false)
  }, [])

  const openFile = useCallback(async (file: Blob): Promise<string | null> => {
    const r = await openBookFile(file)
    if (!r.ok) return r.message
    forgetTab()
    setStateRaw(stateFromFile(r.book, r.savedAt))
    setYearId(latestYear(r.book).id)
    setChangedElsewhere(false)
    setNotice(r.warnings.length > 0 ? { kind: 'warn', message: `ファイルは開けましたが、確かめてほしいことがあります。${r.warnings.join(' ')}` } : null)
    return null
  }, [])

  const reset = useCallback(() => {
    const storage = getStorage()
    if (storage) clearLocal(storage)
    forgetTab()
    lastWritten.current = null
    setStateRaw(null)
    setYearId(null)
    setNotice(null)
    setChangedElsewhere(false)
  }, [])

  const reloadFromStorage = useCallback(() => {
    setChangedElsewhere(false)
    load()
  }, [load])

  return {
    ready,
    state,
    setState: setStateRaw,
    yearId,
    setYearId,
    notice,
    clearNotice: useCallback(() => setNotice(null), []),
    storageProblem,
    changedElsewhere,
    reloadFromStorage,
    startWith,
    openFile,
    reset,
    license,
    today,
  }
}

/** 帳簿を開いているときの、各画面からの入口を組み立てる。 */
export function useWorkspaceValue(store: ReturnType<typeof useStore>, state: LocalState): Workspace {
  const { setState, yearId, setYearId, license } = store
  const book = state.book
  const year = (yearId && findYear(book, yearId)) || latestYear(book)
  const locked = isYearLocked(book, year.id)
  const summary = useMemo(() => summarizeYear(year, book.diffStyle), [year, book.diffStyle])

  const apply = useCallback(
    (result: Result<Book>, options: ApplyOptions = {}) => {
      if (!result.ok) {
        if (!options.quiet) toast.error(result.message)
        return false
      }
      setState((s) => (s ? { ...s, book: result.value } : s))
      if (options.done) toast.success(options.done)
      return true
    },
    [setState],
  )

  // 保存のボタンは、いつ押されても「そのときの帳簿」を保存する（古い帳簿をつかんだままにしない）
  const latest = useRef(state)
  latest.current = state
  const saveFile = useCallback(() => {
    const now = new Date()
    const r = saveBookToFile(latest.current.book, now)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    setState((s) => (s ? markSaved(s, now) : s))
    toast.success(
      <>
        ひきつぎファイルを保存しました。
        <span className="mt-0.5 block break-all text-[0.84rem] opacity-90">{r.value.fileName}</span>
      </>,
      { duration: 9_000 },
    )
  }, [setState])

  const unsaved = unsavedInfo(state)
  const isSample = isSampleBook(book)
  return {
    ...store,
    state,
    book,
    year,
    locked,
    summary,
    setYearId,
    apply,
    saveFile,
    unsaved,
    dirty: !(isSample && book.revision === 0) && (unsaved.neverSaved || unsaved.count > 0),
    isSample,
    isPro: license.isPro,
  }
}

const WorkspaceContext = createContext<Workspace | null>(null)
export const WorkspaceProvider = WorkspaceContext.Provider

/** 各画面から、帳簿と操作を使う。 */
export function useWorkspace(): Workspace {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('帳簿を開いていない画面で useWorkspace を使っています')
  return value
}

/**
 * いくつかの変更を、続けて帳簿に入れる（団体の設定をまとめて保存するとき、など）。
 * 途中でうまくいかなければ、そこで止めて、その結果（理由の文つき）を返す。帳簿は、どれも入っていないまま。
 */
export function chain(book: Book, steps: ((book: Book) => Result<Book>)[]): Result<Book> {
  let current = book
  for (const step of steps) {
    const r = step(current)
    if (!r.ok) return r
    current = r.value
  }
  return { ok: true, value: current }
}
