import { describe, expect, it } from 'vitest'
import { site } from '../site.config'
import { carryForward, undoCarryForward } from './carry'
import { serializeBook } from './file'
import { createSampleBook } from './sample'
import {
  BROKEN_KEY,
  STORAGE_KEY,
  clearLocal,
  loadLocal,
  markSaved,
  saveLocal,
  stateFromFile,
  stateFromNewBook,
  unsavedInfo,
  type StorageLike,
} from './storage'
import { expense, income, newBook, ok } from './test-helpers'

/** localStorage のかわりに使う、にせものの保存先。 */
function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const NOW = new Date('2026-11-14T01:30:00.000Z')

describe('保存のキー', () => {
  it('サービスの名前と、版が入っている', () => {
    expect(STORAGE_KEY).toBe(`${site.slug}:data:v1`)
    expect(BROKEN_KEY.startsWith(STORAGE_KEY)).toBe(true)
    expect(BROKEN_KEY).not.toBe(STORAGE_KEY)
  })
})

describe('ブラウザの中への保存と読み込み', () => {
  it('はじめて開いたときは、空', () => {
    expect(loadLocal(fakeStorage())).toEqual({ status: 'empty' })
    expect(loadLocal(fakeStorage({ [STORAGE_KEY]: '' }))).toEqual({ status: 'empty' })
  })
  it('保存したものを、同じ形で読める', () => {
    const storage = fakeStorage()
    const state = markSaved(stateFromNewBook(income(newBook(), '2026-04-10', 30_000)), NOW)
    expect(saveLocal(storage, state)).toEqual({ ok: true })
    expect(loadLocal(storage)).toEqual({ status: 'ok', state, warnings: [] })
  })
  it('まだファイルに保存していない状態も、そのまま戻る', () => {
    const storage = fakeStorage()
    const state = stateFromNewBook(createSampleBook())
    saveLocal(storage, state)
    const r = loadLocal(storage)
    expect(r.status === 'ok' && r.state).toEqual({ book: createSampleBook(), savedRevision: null, savedAt: null })
  })
  it('年度が2つある帳簿も戻る', () => {
    const storage = fakeStorage()
    const state = stateFromNewBook(ok(carryForward(income(newBook(), '2026-04-10', 30_000))))
    saveLocal(storage, state)
    const r = loadLocal(storage)
    expect(r.status === 'ok' && r.state.book.years).toHaveLength(2)
  })
})

describe('壊れたデータを読んでも落ちない', () => {
  const brokenTexts: [string, string][] = [
    ['JSON として読めない', '{"format": "hikitsugi-kaikei-local", "version": 1, "book": {'],
    ['ただの文字', 'こんにちは'],
    ['null', 'null'],
    ['数', '42'],
    ['一覧', '[1, 2, 3]'],
    ['空のまとまり', '{}'],
    ['目印が違う', '{"format":"something-else","version":1,"book":{}}'],
    ['版がない', '{"format":"hikitsugi-kaikei-local","book":{}}'],
    ['新しい版', '{"format":"hikitsugi-kaikei-local","version":99,"book":{}}'],
    ['帳簿がない', '{"format":"hikitsugi-kaikei-local","version":1}'],
    ['帳簿の中身が足りない', '{"format":"hikitsugi-kaikei-local","version":1,"book":{"orgName":"x","years":[]}}'],
    // ひきつぎファイルの中身を、そのまま保存領域に入れたもの（形は似ているが、目印が違う）
    ['ひきつぎファイルの中身', serializeBook(newBook(), NOW)],
  ]
  for (const [name, text] of brokenTexts) {
    it(`${name}: 「読めなかった」と返し、元の中身を退避する`, () => {
      const storage = fakeStorage({ [STORAGE_KEY]: text })
      const r = loadLocal(storage)
      expect(r.status).toBe('broken')
      if (r.status !== 'broken') return
      expect(r.message).toContain('読めませんでした')
      expect(r.detail.length).toBeGreaterThan(0)
      // 元の中身は、別のキーに残っている。もとのキーは空いたので、新しく始めても上書きで消えない
      expect(storage.data.get(BROKEN_KEY)).toBe(text)
      expect(storage.data.has(STORAGE_KEY)).toBe(false)
      expect(loadLocal(storage)).toEqual({ status: 'empty' })
    })
  }
  it('金額が小数になっているデータは、読まない（まちがった数字で資料を作らない）', () => {
    const storage = fakeStorage()
    saveLocal(storage, stateFromNewBook(expense(newBook(), '2026-04-10', 500)))
    const raw = JSON.parse(storage.data.get(STORAGE_KEY)!)
    raw.book.years[0].transactions[0].amount = 500.5
    storage.setItem(STORAGE_KEY, JSON.stringify(raw))
    const r = loadLocal(storage)
    expect(r.status).toBe('broken')
    expect(r.status === 'broken' && r.detail).toContain('transactions[0].amount')
  })
  it('「最後に保存したとき」の記録だけが壊れていたら、帳簿は読んで、まだ保存していない扱いにする', () => {
    const storage = fakeStorage()
    saveLocal(storage, markSaved(stateFromNewBook(newBook()), NOW))
    const raw = JSON.parse(storage.data.get(STORAGE_KEY)!)
    raw.savedRevision = 'こわれた値'
    raw.savedAt = 12345
    storage.setItem(STORAGE_KEY, JSON.stringify(raw))
    const r = loadLocal(storage)
    expect(r.status === 'ok' && [r.state.savedRevision, r.state.savedAt]).toEqual([null, null])
  })
  it('保存領域が使えないブラウザでも落ちない', () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }
    const r = loadLocal(blocked)
    expect(r.status).toBe('unavailable')
    expect(r.status === 'unavailable' && r.message).toContain('ファイルに保存')
    const saved = saveLocal(blocked, stateFromNewBook(newBook()))
    expect(saved.ok).toBe(false)
    expect(!saved.ok && saved.message).toContain('ファイルに保存')
    expect(() => clearLocal(blocked)).not.toThrow()
  })
  it('容量がいっぱいで保存できないときは、理由を返す', () => {
    const full = fakeStorage()
    full.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(saveLocal(full, stateFromNewBook(newBook())).ok).toBe(false)
  })
  it('退避に失敗しても、落ちない', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'こわれた' })
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(loadLocal(storage).status).toBe('broken')
  })
  it('消す。読めなかったデータの退避も、一緒に消す（共用のパソコンに、前の帳簿を残さない）', () => {
    const storage = fakeStorage({ [BROKEN_KEY]: '退避したもの（前の団体の帳簿）', 'ほかのサービスのデータ': 'そのまま' })
    saveLocal(storage, stateFromNewBook(newBook()))
    clearLocal(storage)
    expect(loadLocal(storage)).toEqual({ status: 'empty' })
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
    expect(storage.data.has(BROKEN_KEY)).toBe(false)
    // このサービスのもの以外には、さわらない
    expect(storage.data.get('ほかのサービスのデータ')).toBe('そのまま')
  })
})

describe('「最後に保存してから◯件の変更があります」', () => {
  it('新しく作った帳簿は、まだファイルに保存していない', () => {
    const info = unsavedInfo(stateFromNewBook(newBook()))
    expect(info.neverSaved).toBe(true)
    expect(info.count).toBe(0)
    expect(info.message).toContain('まだファイルに保存していません')
  })
  it('保存した直後は 0件。変えるたびに1件ずつ増える', () => {
    let state = markSaved(stateFromNewBook(newBook()), NOW)
    expect(unsavedInfo(state)).toEqual({ neverSaved: false, count: 0, message: '' })
    expect(state.savedAt).toBe(NOW.toISOString())
    state = { ...state, book: income(state.book, '2026-04-10', 30_000) }
    expect(unsavedInfo(state).count).toBe(1)
    state = { ...state, book: expense(state.book, '2026-04-11', 500) }
    state = { ...state, book: expense(state.book, '2026-04-12', 600) }
    const info = unsavedInfo(state)
    expect(info.count).toBe(3)
    expect(info.message).toBe('最後にファイルへ保存してから、3件の変更があります。')
    // もう一度保存すると 0件 に戻る
    expect(unsavedInfo(markSaved(state, NOW)).count).toBe(0)
  })
  it('ファイルから開いた直後は 0件', () => {
    const book = expense(income(newBook(), '2026-04-10', 30_000), '2026-04-11', 500)
    const state = stateFromFile(book, '2026-11-01T00:00:00.000Z')
    expect(unsavedInfo(state)).toEqual({ neverSaved: false, count: 0, message: '' })
    expect(unsavedInfo({ ...state, book: expense(book, '2026-04-12', 1) }).count).toBe(1)
  })
  it('繰り越しと、その取り消しも、変更として数える', () => {
    let state = markSaved(stateFromNewBook(newBook()), NOW)
    state = { ...state, book: ok(carryForward(state.book)) }
    expect(unsavedInfo(state).count).toBe(1)
    state = { ...state, book: ok(undoCarryForward(state.book)) }
    expect(unsavedInfo(state).count).toBe(2)
  })
  it('ブラウザを閉じて開き直しても、件数が続く', () => {
    const storage = fakeStorage()
    let state = markSaved(stateFromNewBook(newBook()), NOW)
    state = { ...state, book: income(state.book, '2026-04-10', 30_000) }
    saveLocal(storage, state)
    const r = loadLocal(storage)
    expect(r.status === 'ok' && unsavedInfo(r.state).count).toBe(1)
  })
})
