import { describe, expect, it } from 'vitest'
import { createEmptyData } from './estimate'
import { sampleData } from './sample'
import {
  APP_ID,
  BROKEN_BACKUP_KEY,
  buildExportFile,
  clearData,
  LIMITS,
  loadData,
  parseSaved,
  parseSavedText,
  saveData,
  SCHEMA_VERSION,
  STORAGE_KEY,
  toSavedFile,
  type ParseResult,
  type StorageLike,
} from './storage'

const now = new Date(2026, 10, 14, 9, 30) // 2026年11月14日 9:30（その端末の時刻）

/** メモリの中の保存領域（localStorage の代わり）。 */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

/** 何をしても例外を投げる保存領域（保存が止められているブラウザ）。 */
const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

/** 正しいファイルの中身を、一部だけ書き換えたものを作る。 */
function fileWith(mutate: (file: any) => void): unknown {
  const file = JSON.parse(JSON.stringify(toSavedFile(sampleData(), now)))
  mutate(file)
  return file
}

function reasonOf(result: ParseResult): string {
  if (result.ok) throw new Error('読み込めてしまった')
  return result.reason
}

describe('保存の形式', () => {
  it('どの道具のデータかと、版の番号と、保存した日時を持つ', () => {
    const file = toSavedFile(sampleData(), now)
    expect(file.app).toBe('chintai')
    expect(file.version).toBe(1)
    expect(file.savedAt).toBe(now.toISOString())
    expect(APP_ID).toBe('chintai')
    expect(SCHEMA_VERSION).toBe(1)
  })
  it('保存領域のキーには、サービスの名前と版が入っている', () => {
    expect(STORAGE_KEY).toBe('chintai:data:v1')
    expect(BROKEN_BACKUP_KEY).toBe('chintai:data:v1:broken')
  })
})

describe('書き出しと読み込み', () => {
  it('書き出したファイルを読み込むと、同じ内容に戻る', () => {
    const data = sampleData()
    data.message = { senderName: '山田 花子', propertyName: 'コーポみどり 203号室', lineIds: ['l8', 'l9'] }
    const file = buildExportFile(data, now)
    const back = parseSavedText(file.text)
    expect(back).toEqual({ ok: true, data, warnings: [], savedAt: now.toISOString() })
  })
  it('空のデータも、書き出して読み込める', () => {
    const back = parseSavedText(buildExportFile(createEmptyData(), now).text)
    expect(back.ok && back.data).toEqual(createEmptyData())
  })
  it('ファイル名に日時が入り、中身は JSON', () => {
    const file = buildExportFile(sampleData(), now)
    expect(file.filename).toBe('mitsumori-tenken-20261114-0930.json')
    expect(file.mime).toBe('application/json')
    expect(() => JSON.parse(file.text)).not.toThrow()
    expect(file.text.endsWith('\n')).toBe(true)
  })
  it('先頭に BOM が付いていても読める', () => {
    expect(parseSavedText('﻿' + buildExportFile(sampleData(), now).text).ok).toBe(true)
  })
  it('知らない項目（余分なキー）があっても、無視して読める', () => {
    const result = parseSaved(
      fileWith((f) => {
        f.extra = 1
        f.data.future = { a: 1 }
        f.data.estimate.lines[0].memo = 'x'
      }),
    )
    expect(result.ok && result.data).toEqual(sampleData())
  })
})

describe('合わないファイルは、理由を言って断る', () => {
  it('JSON でない', () => {
    expect(reasonOf(parseSavedText('これはJSONではない'))).toContain('JSON の形になっていません')
    expect(reasonOf(parseSavedText('{"app":"chintai",'))).toContain('JSON の形になっていません')
  })
  it('空のファイル', () => {
    expect(reasonOf(parseSavedText(''))).toContain('空です')
    expect(reasonOf(parseSavedText('  \n '))).toContain('空です')
  })
  it('大きすぎるファイル', () => {
    expect(reasonOf(parseSavedText('x'.repeat(LIMITS.maxFileChars + 1)))).toContain('大きすぎます')
  })
  it('形が違う（配列、数字、null、文字）', () => {
    for (const text of ['[]', '123', 'null', '"chintai"', 'true']) {
      expect(reasonOf(parseSavedText(text)), text).toContain('みつもり点検のデータではありません')
    }
  })
  it('ほかの道具のファイル', () => {
    expect(reasonOf(parseSaved(fileWith((f) => (f.app = 'kaikei'))))).toContain('みつもり点検で書き出したファイルではありません')
    expect(reasonOf(parseSaved(fileWith((f) => delete f.app)))).toContain('みつもり点検で書き出したファイルではありません')
    expect(reasonOf(parseSaved({}))).toContain('みつもり点検で書き出したファイルではありません')
  })
  it('版の番号がない、またはおかしい', () => {
    for (const v of [undefined, null, '1', 0, -1, 1.5, NaN]) {
      expect(reasonOf(parseSaved(fileWith((f) => (f.version = v)))), String(v)).toContain('版の番号')
    }
  })
  it('新しい版のファイルは、読み込み直すよう案内する', () => {
    const reason = reasonOf(parseSaved(fileWith((f) => (f.version = 2))))
    expect(reason).toContain('新しい版')
    expect(reason).toContain('版 2')
  })
  it('データの中身がない', () => {
    expect(reasonOf(parseSaved(fileWith((f) => delete f.data)))).toContain('データの中身')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data = []))))).toContain('データの中身')
    expect(reasonOf(parseSaved(fileWith((f) => delete f.data.estimate)))).toContain('見積書のデータ')
  })
  it('家賃・管理費・合計の値がおかしい', () => {
    for (const bad of [-1, 1.5, '78000', 100_000_000, NaN, {}, [], true]) {
      expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.rent = bad)))), String(bad)).toContain('家賃')
    }
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.commonFee = -5))))).toContain('管理費')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.statedTotal = '10万'))))).toContain('合計')
  })
  it('入居する日が、暦にない日や、違う形', () => {
    for (const bad of ['2027-02-30', '2027/03/20', '3月20日', 20270320, {}, '']) {
      expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.moveInDate = bad)))), String(bad)).toContain('入居する日')
    }
  })
  it('項目の一覧がおかしい', () => {
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines = 'x'))))).toContain('項目の一覧')
    expect(reasonOf(parseSaved(fileWith((f) => delete f.data.estimate.lines)))).toContain('項目の一覧')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines[2] = 'x'))))).toContain('項目の3行目')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines[0] = null))))).toContain('項目の1行目')
    expect(reasonOf(parseSaved(fileWith((f) => delete f.data.estimate.lines[1].itemId)))).toContain('項目の2行目')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines[1].itemId = 5))))).toContain('項目の2行目')
    expect(reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines[1].label = 5))))).toContain('項目の2行目の名前')
  })
  it('金額がおかしい行は、何行目かを言う', () => {
    for (const bad of [-1, 0.5, '16500', 100_000_000, {}]) {
      const reason = reasonOf(parseSaved(fileWith((f) => (f.data.estimate.lines[3].amount = bad))))
      expect(reason, String(bad)).toContain('項目の4行目の金額')
    }
  })
  it('行が多すぎる', () => {
    const reason = reasonOf(
      parseSaved(
        fileWith((f) => {
          f.data.estimate.lines = Array.from({ length: LIMITS.maxLines + 1 }, (_, i) => ({ id: `l${i}`, itemId: 'shikikin', label: '', amount: 1 }))
        }),
      ),
    )
    expect(reason).toContain('多すぎます')
  })
  it('断る理由は、どれも日本語の文になっている', () => {
    const reasons = [parseSavedText('x'), parseSaved(null), parseSaved({ app: 'chintai' }), parseSaved({ app: 'chintai', version: 1 })].map(reasonOf)
    for (const reason of reasons) expect(reason).toMatch(/[。）]$/)
  })
})

describe('直せるところは、直して読み込む', () => {
  it('値がない（未入力）ところは null として読む', () => {
    const result = parseSaved(
      fileWith((f) => {
        delete f.data.estimate.rent
        delete f.data.estimate.moveInDate
        delete f.data.estimate.statedTotal
        f.data.estimate.commonFee = null
        delete f.data.estimate.lines[0].amount
        delete f.data.estimate.lines[0].label
      }),
    )
    if (!result.ok) throw new Error(result.reason)
    expect(result.data.estimate.rent).toBeNull()
    expect(result.data.estimate.commonFee).toBeNull()
    expect(result.data.estimate.moveInDate).toBeNull()
    expect(result.data.estimate.statedTotal).toBeNull()
    expect(result.data.estimate.lines[0]).toEqual({ id: 'l1', itemId: 'shikikin', label: '', amount: null })
  })
  it('いまの一覧にない項目は、名前を残して「その他」にし、そのことを知らせる', () => {
    const result = parseSaved(
      fileWith((f) => {
        f.data.estimate.lines[0] = { id: 'l1', itemId: 'shin-komoku', label: '新しい費用', amount: 3_000 }
        f.data.estimate.lines[1] = { id: 'l2', itemId: 'mukashi', label: '', amount: null }
      }),
    )
    if (!result.ok) throw new Error(result.reason)
    expect(result.data.estimate.lines[0]).toEqual({ id: 'l1', itemId: 'other', label: '新しい費用', amount: 3_000 })
    expect(result.data.estimate.lines[1]).toEqual({ id: 'l2', itemId: 'other', label: '名前のない項目', amount: null })
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings[0]).toContain('新しい費用')
    expect(result.warnings[0]).toContain('「その他」として読み込みました')
  })
  it('行の ID がない、または重なっているときは、付け直す', () => {
    const result = parseSaved(
      fileWith((f) => {
        f.data.estimate.lines = [
          { id: 'l1', itemId: 'shikikin', label: '', amount: 1 },
          { id: 'l1', itemId: 'reikin', label: '', amount: 2 },
          { itemId: 'kagi', label: '', amount: 3 },
          { id: '', itemId: 'shodoku', label: '', amount: 4 },
          { id: 5, itemId: 'gaichu', label: '', amount: 5 },
        ]
        f.data.message.lineIds = null
      }),
    )
    if (!result.ok) throw new Error(result.reason)
    const ids = result.data.estimate.lines.map((l) => l.id)
    expect(new Set(ids).size).toBe(5)
    expect(ids[0]).toBe('l1')
    for (const id of ids) expect(id).toMatch(/^l\d+$/)
  })
  it('長すぎる名前は切り、前後の空白は取る', () => {
    const result = parseSaved(
      fileWith((f) => {
        f.data.estimate.lines[0].label = `  ${'あ'.repeat(200)}  `
        f.data.message.senderName = 'い'.repeat(200)
        f.data.message.propertyName = '  コーポみどり  '
      }),
    )
    if (!result.ok) throw new Error(result.reason)
    expect(result.data.estimate.lines[0].label).toHaveLength(LIMITS.maxLabel)
    expect(result.data.message.senderName).toHaveLength(LIMITS.maxSenderName)
    expect(result.data.message.propertyName).toBe('コーポみどり')
  })
  it('文面の設定がない、またはおかしいときは、はじめの状態に戻す（見積書は読み込む）', () => {
    for (const bad of [undefined, null, 'x', 5, []]) {
      const result = parseSaved(fileWith((f) => (f.data.message = bad)))
      if (!result.ok) throw new Error(result.reason)
      expect(result.data.message).toEqual({ senderName: '', propertyName: '', lineIds: null })
      expect(result.data.estimate).toEqual(sampleData().estimate)
    }
    const result = parseSaved(fileWith((f) => (f.data.message = { senderName: 5, propertyName: {}, lineIds: 'l1' })))
    expect(result.ok && result.data.message).toEqual({ senderName: '', propertyName: '', lineIds: null })
  })
  it('文面に入れる行の指定から、見積書にない行と、重なりを取りのぞく', () => {
    const result = parseSaved(fileWith((f) => (f.data.message.lineIds = ['l9', 'nai', 5, 'l9', 'l8'])))
    expect(result.ok && result.data.message.lineIds).toEqual(['l9', 'l8'])
    const empty = parseSaved(fileWith((f) => (f.data.message.lineIds = [])))
    expect(empty.ok && empty.data.message.lineIds).toEqual([]) // 「1つも選んでいない」は、null とは別に残す
  })
  it('保存した日時がおかしくても、読み込める', () => {
    const result = parseSaved(fileWith((f) => (f.savedAt = 'きのう')))
    expect(result.ok && result.savedAt).toBeNull()
  })
  it('__proto__ のようなキーが入っていても、落ちない', () => {
    const text = '{"app":"chintai","version":1,"savedAt":"x","__proto__":{"a":1},"data":{"estimate":{"__proto__":{"rent":5},"rent":null,"lines":[{"itemId":"__proto__","label":"constructor","amount":1}]}}}'
    const result = parseSavedText(text)
    if (!result.ok) throw new Error(result.reason)
    expect(result.data.estimate.lines[0].itemId).toBe('other')
    expect(({} as any).a).toBeUndefined()
  })
})

describe('ブラウザの保存領域', () => {
  it('はじめて開いたとき（保存がない）は、空のデータ', () => {
    expect(loadData(memoryStorage())).toEqual({ status: 'empty', data: createEmptyData() })
  })
  it('保存して、読み込み直しても残っている', () => {
    const storage = memoryStorage()
    const data = sampleData()
    data.message.senderName = '山田'
    expect(saveData(storage, data, now)).toEqual({ ok: true })
    expect(storage.map.has('chintai:data:v1')).toBe(true)
    expect(loadData(storage)).toEqual({ status: 'ok', data, warnings: [], savedAt: now.toISOString() })
  })
  it('壊れたデータが入っていても落ちない。空から始めて、壊れたデータは別のキーに取っておく', () => {
    for (const broken of ['{"app":"chintai","version":1,"da', 'null', '[1,2,3]', '{"app":"shift","version":1,"data":{}}', '']) {
      const storage = memoryStorage({ [STORAGE_KEY]: broken })
      const result = loadData(storage)
      expect(result.status, broken).toBe('broken')
      expect(result.data).toEqual(createEmptyData())
      if (result.status === 'broken') expect(result.reason).toContain('読めませんでした')
      expect(storage.map.get(BROKEN_BACKUP_KEY)).toBe(broken)
    }
  })
  it('保存領域の中身が読めなかった理由は、保存領域に合った言い方にする（「ファイルを選んでください」とは言わない）', () => {
    const cut = loadData(memoryStorage({ [STORAGE_KEY]: '{"app":"chintai","version":1,"da' }))
    expect(cut.status).toBe('broken')
    if (cut.status === 'broken') {
      expect(cut.reason).toContain('途中で切れているか、書き換えられています')
      expect(cut.reason).not.toContain('選んでください')
      // どうすればよいか（ファイルから戻せること）も言う。
      expect(cut.reason).toContain('ファイルを読み込む')
    }
    // JSON としては読めるが、形が違うときは、どこが違うのかを言う。
    const badLine = loadData(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ app: 'chintai', version: 1, data: { estimate: { lines: [{ itemId: 'kagi', amount: -1 }] } } }) }))
    expect(badLine.status).toBe('broken')
    if (badLine.status === 'broken') expect(badLine.reason).toContain('項目の1行目の金額')
  })
  it('壊れたデータを取っておけなくても、落ちない', () => {
    const storage: StorageLike = {
      getItem: () => '{こわれている',
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    expect(loadData(storage).status).toBe('broken')
  })
  it('保存領域が使えない（ない、例外を投げる）ときは、そのことを伝えて、空のデータで動く', () => {
    for (const storage of [null, undefined, throwingStorage]) {
      const result = loadData(storage)
      expect(result.status).toBe('unavailable')
      expect(result.data).toEqual(createEmptyData())
      if (result.status === 'unavailable') expect(result.reason).toContain('ファイルに書き出す')
    }
  })
  it('保存できなかったときは、落ちずに、理由と「ファイルに書き出す」を案内する', () => {
    for (const storage of [null, undefined, throwingStorage]) {
      const result = saveData(storage, sampleData(), now)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toContain('ファイルに書き出す')
    }
  })
  it('clearData は、保存と、取っておいた壊れたデータを消す。使えない保存領域でも落ちない', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'x', [BROKEN_BACKUP_KEY]: 'y', ほかのキー: 'z' })
    clearData(storage)
    expect([...storage.map.keys()]).toEqual(['ほかのキー'])
    expect(() => clearData(throwingStorage)).not.toThrow()
    expect(() => clearData(null)).not.toThrow()
  })
  it('ほかの道具のキーには、さわらない', () => {
    const storage = memoryStorage({ 'kaikei:data:v1': 'a', 'shift:data:v1': 'b' })
    saveData(storage, sampleData(), now)
    loadData(storage)
    expect(storage.map.get('kaikei:data:v1')).toBe('a')
    expect(storage.map.get('shift:data:v1')).toBe('b')
  })
})
