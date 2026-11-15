// ブラウザの中への自動の保存（localStorage）。
// 主役はファイルで、こちらは「閉じても続きから始められる」ための控え。
// localStorage そのものには触らず、渡された保存先を使う（テストでは、にせものの保存先を渡す）。
import { FILE_VERSION, fail, type Book, type Fail } from './types'
import { parseBookValue } from './validate'

/** 保存のキー。`${site.slug}:data:v1` と同じ（storage.test.ts で確かめている）。 */
export const STORAGE_KEY = 'kaikei:data:v1'
/** 読めなかったデータの退避先。上書きで消してしまわないように、ここへ写してから始める。 */
export const BROKEN_KEY = 'kaikei:data:v1:broken'

const LOCAL_FORMAT = 'hikitsugi-kaikei-local'

/** localStorage と同じ使い方ができるもの。 */
export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** ブラウザの中に置く状態。帳簿と、「最後にファイルへ保存したとき」の記録。 */
export type LocalState = {
  book: Book
  /** 最後にファイルへ保存した（またはファイルから開いた）ときの revision。まだ一度も保存していなければ null */
  savedRevision: number | null
  /** 最後にファイルへ保存した日時（ISO 8601）。まだなら null */
  savedAt: string | null
}

/** 新しく作った帳簿（サンプルを含む）から始める。まだファイルには保存していない状態。 */
export function stateFromNewBook(book: Book): LocalState {
  return { book, savedRevision: null, savedAt: null }
}

/** ファイルから開いた帳簿から始める。開いた時点では、ファイルと同じ中身。 */
export function stateFromFile(book: Book, savedAt: string | null): LocalState {
  return { book, savedRevision: book.revision, savedAt }
}

/** ファイルに保存したあとに呼ぶ。 */
export function markSaved(state: LocalState, now: Date): LocalState {
  return { ...state, savedRevision: state.book.revision, savedAt: now.toISOString() }
}

export type UnsavedInfo = {
  /** まだ一度もファイルに保存していないか */
  neverSaved: boolean
  /** 最後に保存してからの変更の数。一度も保存していなければ、これまでの変更の数 */
  count: number
  /** そのまま画面に出せる文。保存してあって変更がなければ空 */
  message: string
}

/** 「最後に保存してから◯件の変更があります」を出すための値。 */
export function unsavedInfo(state: LocalState): UnsavedInfo {
  if (state.savedRevision === null) {
    return {
      neverSaved: true,
      count: state.book.revision,
      message: 'まだファイルに保存していません。ブラウザの中のデータは消えることがあるので、ファイルに保存してください。',
    }
  }
  // ファイルから開いたあとに繰り越しを取り消したときなど、revision が戻ることはないが、念のため 0 より小さくしない
  const count = Math.max(0, state.book.revision - state.savedRevision)
  return {
    neverSaved: false,
    count,
    message: count === 0 ? '' : `最後にファイルへ保存してから、${count}件の変更があります。`,
  }
}

export type LoadLocalResult =
  /** 何も保存されていない（はじめて開いた） */
  | { status: 'empty' }
  | { status: 'ok'; state: LocalState; warnings: string[] }
  /** 保存されていたが読めなかった。元の中身は BROKEN_KEY に退避してある。detail は、くわしい理由（問い合わせのときに使う） */
  | { status: 'broken'; message: string; detail: string }
  /** 保存領域が使えない（プライベートブラウズなど） */
  | { status: 'unavailable'; message: string }

/** ブラウザの中のデータを読む。壊れていても落ちない。 */
export function loadLocal(storage: StorageLike): LoadLocalResult {
  let text: string | null
  try {
    text = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      status: 'unavailable',
      message: 'このブラウザでは、データを自動で保存できません。こまめに「ファイルに保存」を押してください。',
    }
  }
  if (text === null || text === '') return { status: 'empty' }

  const broken = (why: string): LoadLocalResult => {
    // 読めなかった中身を退避する。このあと新しく始めても、元の中身が残るようにするため
    try {
      storage.setItem(BROKEN_KEY, text!)
      storage.removeItem(STORAGE_KEY)
    } catch {
      // 退避できなくても、画面は続ける
    }
    return {
      status: 'broken',
      message: 'ブラウザの中に残っていたデータを読めませんでした。ひきつぎファイルがあれば、それを開いてください。なければ、新しく始めてください。',
      detail: why,
    }
  }

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return broken('データの形が壊れています')
  }
  const parsed = parseBookValue(value, LOCAL_FORMAT)
  if (!parsed.ok) return broken(parsed.message)
  const raw = value as { savedRevision?: unknown; savedAt?: unknown }
  const savedRevision =
    typeof raw.savedRevision === 'number' && Number.isSafeInteger(raw.savedRevision) && raw.savedRevision >= 0 ? raw.savedRevision : null
  return {
    status: 'ok',
    state: { book: parsed.book, savedRevision, savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null },
    warnings: parsed.warnings,
  }
}

/** ブラウザの中に保存する。容量がいっぱいのときなどは、理由を返す（画面は落とさない）。 */
export function saveLocal(storage: StorageLike, state: LocalState): { ok: true } | Fail {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ format: LOCAL_FORMAT, version: FILE_VERSION, savedRevision: state.savedRevision, savedAt: state.savedAt, book: state.book }),
    )
    return { ok: true }
  } catch {
    return fail('storage', 'ブラウザの中に保存できませんでした。「ファイルに保存」を押して、ファイルに残してください。')
  }
}

/**
 * ブラウザの中のデータを消す（「このブラウザのデータを消す」）。
 * 読めなかったデータの退避（BROKEN_KEY）も、一緒に消す。退避には、前の帳簿がまるごと入っていることがあり、
 * 「共用のパソコンを使い終わったときに消す」と案内しているのに、団体の名前や取引が残ってしまうため（点検で見つかった）。
 */
export function clearLocal(storage: StorageLike): void {
  for (const key of [STORAGE_KEY, BROKEN_KEY]) {
    try {
      storage.removeItem(key)
    } catch {
      // 保存領域が使えないなら、消すものもない
    }
  }
}
