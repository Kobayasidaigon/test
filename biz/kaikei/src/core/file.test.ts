import { describe, expect, it } from 'vitest'
import { setLicenseKey } from './book'
import { openBookFile } from './browser'
import { summarizeYear } from './calc'
import { carryForward } from './carry'
import { buildBookFile, parseBookFile, serializeBook, suggestFileName } from './file'
import { createSampleBook } from './sample'
import { deposit, expense, failCode, income, newBook, ok, year } from './test-helpers'
import { FILE_FORMAT, FILE_VERSION, LIMITS, type Book } from './types'

const NOW = new Date(2026, 10, 14, 10, 30, 0)

function filled(): Book {
  let book = newBook()
  book = income(book, '2026-04-10', 30_000)
  book = deposit(book, '2026-04-12', 25_000)
  book = expense(book, '2026-05-01', 1_500)
  return book
}

/** 書き出した中身を、いったん値に戻して手を入れ、もう一度文字にする（壊れたファイルを作る）。 */
function tamper(book: Book, change: (file: any) => void): string {
  const file = JSON.parse(serializeBook(book, NOW))
  change(file)
  return JSON.stringify(file)
}

describe('書き出して、読み込む', () => {
  it('書き出したものを読み込むと、元と同じ帳簿になる', () => {
    for (const book of [newBook(), filled(), ok(carryForward(filled())), createSampleBook()]) {
      const r = parseBookFile(serializeBook(book, NOW))
      expect(r.ok).toBe(true)
      if (!r.ok) continue
      expect(r.book).toEqual(book)
      expect(r.warnings).toEqual([])
      expect(r.savedAt).toBe(NOW.toISOString())
    }
  })
  it('読み込んだあとも、数字は同じ', () => {
    const book = createSampleBook()
    const r = parseBookFile(serializeBook(book, NOW))
    expect(r.ok && summarizeYear(r.book.years[0]).carryover).toBe(736_918)
  })
  it('目印と版の番号が入る。人が開いても読める形（字下げつき）', () => {
    const text = serializeBook(filled(), NOW)
    const file = JSON.parse(text)
    expect(file.format).toBe(FILE_FORMAT)
    expect(file.version).toBe(FILE_VERSION)
    expect(file.savedAt).toBe(NOW.toISOString())
    expect(text).toContain('\n  "book": {')
    expect(text.endsWith('\n')).toBe(true)
  })
  it('ライセンスキーも、ファイルと一緒に渡る', () => {
    const book = ok(setLicenseKey(filled(), 'eyJwcm9kdWN0Ijoia2Fpa2VpIn0.c2lnbmF0dXJl'))
    const r = parseBookFile(serializeBook(book, NOW))
    expect(r.ok && r.book.licenseKey).toBe('eyJwcm9kdWN0Ijoia2Fpa2VpIn0.c2lnbmF0dXJl')
  })
  it('日本語や絵文字、引用符、改行の入った文字も、そのまま戻る', () => {
    const book = expense(newBook(), '2026-04-10', 500, '"お茶"と\\菓子 😀 <b>')
    const r = parseBookFile(serializeBook(book, NOW))
    expect(r.ok && r.book.years[0].transactions[0].description).toBe('"お茶"と\\菓子 😀 <b>')
  })
  it('先頭に BOM が付いていても読める（メモ帳で保存し直したファイル）', () => {
    expect(parseBookFile('﻿' + serializeBook(filled(), NOW)).ok).toBe(true)
  })
  it('知らない項目が入っていても読める。読んだあとの帳簿には持ち込まない', () => {
    const book = filled()
    const text = tamper(book, (f) => {
      f.extra = 'x'
      f.book.futureField = { a: 1 }
      f.book.years[0].transactions[0].memo = 'y'
    })
    const r = parseBookFile(text)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.book).toEqual(book)
  })
})

describe('版1のファイルの見本（この形のファイルは、これからも読めなければならない）', () => {
  // 手で書いた、いちばん小さい版1のファイル。保存の形を変えたときは、このテストを消さずに、
  // validate.ts の移行の表に「版1からの直し方」を足して通すこと。
  const V1 = `{
    "format": "hikitsugi-kaikei",
    "version": 1,
    "savedAt": "2026-11-14T01:30:00.000Z",
    "book": {
      "orgName": "みどり子ども会",
      "orgKind": "kodomokai",
      "roleNames": { "president": "会長", "treasurer": "会計", "auditor": "会計監査" },
      "diffStyle": "actual-minus-budget",
      "licenseKey": "",
      "revision": 12,
      "years": [
        {
          "id": "y1",
          "label": "令和8年度",
          "startDate": "2026-04-01",
          "endDate": "2027-03-31",
          "officers": { "president": "", "treasurer": "", "auditors": [""] },
          "accounts": [
            { "id": "a1", "kind": "cash", "name": "現金", "openingBalance": 5000 },
            { "id": "a2", "kind": "bank", "name": "普通預金", "openingBalance": 20000 }
          ],
          "categories": [
            { "id": "c1", "side": "income", "name": "会費", "budget": 24000, "note": "" },
            { "id": "c2", "side": "expense", "name": "行事費", "budget": 20000, "note": "" }
          ],
          "transactions": [
            { "id": "t1", "date": "2026-04-12", "kind": "income", "categoryId": "c1", "description": "会費 4月分", "amount": 2000, "accountId": "a1", "toAccountId": null, "receiptNo": "" },
            { "id": "t2", "date": "2026-04-20", "kind": "expense", "categoryId": "c2", "description": "歓迎会のお菓子", "amount": 1280, "accountId": "a1", "toAccountId": null, "receiptNo": "1" },
            { "id": "t3", "date": "2026-04-21", "kind": "transfer", "categoryId": null, "description": "預け入れ", "amount": 3000, "accountId": "a1", "toAccountId": "a2", "receiptNo": "" }
          ],
          "carryoverBudget": null,
          "reconciliations": { "a1": { "date": "2026-04-30", "actual": 2720 } },
          "reportDate": "",
          "audit": { "text": "{年度}の会計を監査しました。", "date": "" },
          "nextBudget": { "c1": 26000 },
          "handover": { "date": "", "successor": "", "custody": [], "unpaid": [], "unreceived": [], "equipment": [], "memo": "" }
        }
      ]
    }
  }`
  it('読める。数字も合う', () => {
    const r = parseBookFile(V1)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.book.orgName).toBe('みどり子ども会')
    expect(r.book.revision).toBe(12)
    const s = summarizeYear(r.book.years[0])
    expect([s.openingTotal, s.incomeTotal, s.expenseTotal, s.carryover]).toEqual([25_000, 2_000, 1_280, 25_720])
    expect(s.accounts.map((a) => a.closing)).toEqual([2_720, 23_000])
    expect(r.book.years[0].nextBudget).toEqual({ c1: 26_000 })
  })
})

describe('合わないファイルは、理由を言って断る', () => {
  const code = (text: string) => {
    const r = parseBookFile(text)
    if (r.ok) return 'ok'
    expect(r.message.length).toBeGreaterThan(0)
    return r.code
  }
  it('空のファイル', () => {
    expect(code('')).toBe('empty')
    expect(code('   \n ')).toBe('empty')
  })
  it('JSON ではないファイル（写真、文書、途中で切れたファイル）', () => {
    expect(code('こんにちは')).toBe('not-json')
    expect(code('%PDF-1.7 ...')).toBe('not-json')
    expect(code('<html></html>')).toBe('not-json')
    const text = serializeBook(filled(), NOW)
    expect(code(text.slice(0, Math.floor(text.length / 2)))).toBe('not-json')
  })
  it('JSON だが、ひきつぎ会計のファイルではない', () => {
    for (const text of ['null', '123', '"文字"', '[]', '{}', '{"format":"shift-hyou","version":1,"book":{}}', '{"version":1,"book":{}}']) {
      expect(code(text), text).toBe('wrong-format')
    }
  })
  it('版の番号がおかしい', () => {
    for (const version of [undefined, null, '1', 0, -1, 1.5]) {
      expect(code(tamper(filled(), (f) => (f.version = version))), String(version)).toBe('bad-version')
    }
  })
  it('新しい版のファイルは、開き直すように言う', () => {
    const r = parseBookFile(tamper(filled(), (f) => (f.version = FILE_VERSION + 1)))
    expect(failCode(r as never)).toBe('newer-version')
    expect(!r.ok && r.message).toContain('新しい版')
  })
  it('大きすぎるファイル', () => {
    expect(code('x'.repeat(LIMITS.maxFileBytes + 1))).toBe('too-large')
  })
  it('文字ではないものを渡されても落ちない', () => {
    expect(code(undefined as unknown as string)).toBe('empty')
    expect(code(null as unknown as string)).toBe('empty')
  })
})

describe('中身が壊れたファイルは、場所と理由を言って断る', () => {
  const broken: [string, (f: any) => void, string][] = [
    ['帳簿がない', (f) => delete f.book, 'book'],
    ['帳簿が文字', (f) => (f.book = 'x'), 'book'],
    ['団体の名前がない', (f) => delete f.book.orgName, 'book.orgName'],
    ['団体の名前が空', (f) => (f.book.orgName = '  '), 'book.orgName'],
    ['団体の種類が知らない値', (f) => (f.book.orgKind = 'kaisha'), 'book.orgKind'],
    ['差の向きが知らない値', (f) => (f.book.diffStyle = 'x'), 'book.diffStyle'],
    ['役の呼び名がない', (f) => delete f.book.roleNames, 'book.roleNames'],
    ['ライセンスキーが数', (f) => (f.book.licenseKey = 1), 'book.licenseKey'],
    ['変更の回数がマイナス', (f) => (f.book.revision = -1), 'book.revision'],
    ['変更の回数が小数', (f) => (f.book.revision = 1.5), 'book.revision'],
    ['年度が一覧でない', (f) => (f.book.years = {}), 'book.years'],
    ['年度が1つもない', (f) => (f.book.years = []), 'book.years'],
    ['年度の id がない', (f) => delete f.book.years[0].id, 'book.years[0].id'],
    ['年度の呼び名が空', (f) => (f.book.years[0].label = ''), 'book.years[0].label'],
    ['始まりの日が実在しない', (f) => (f.book.years[0].startDate = '2026-02-30'), 'book.years[0].startDate'],
    ['終わりの日が始まりより前', (f) => (f.book.years[0].endDate = '2026-03-31'), 'book.years[0].endDate'],
    ['現金がない', (f) => f.book.years[0].accounts.shift(), 'book.years[0].accounts'],
    ['現金が2つ', (f) => f.book.years[0].accounts.push({ id: 'zz', kind: 'cash', name: '現金2', openingBalance: 0 }), 'book.years[0].accounts'],
    [
      '預金口座が4つ',
      (f) => {
        for (const n of ['b', 'c', 'd']) f.book.years[0].accounts.push({ id: `bank${n}`, kind: 'bank', name: n, openingBalance: 0 })
      },
      'book.years[0].accounts',
    ],
    ['置き場所の種類が知らない値', (f) => (f.book.years[0].accounts[1].kind = 'card'), 'book.years[0].accounts[1].kind'],
    ['年度はじめの残高が小数', (f) => (f.book.years[0].accounts[0].openingBalance = 100.5), 'book.years[0].accounts[0].openingBalance'],
    ['年度はじめの残高がマイナス', (f) => (f.book.years[0].accounts[0].openingBalance = -1), 'book.years[0].accounts[0].openingBalance'],
    ['年度はじめの残高が文字', (f) => (f.book.years[0].accounts[0].openingBalance = '10000'), 'book.years[0].accounts[0].openingBalance'],
    ['置き場所の id が同じ', (f) => (f.book.years[0].accounts[1].id = f.book.years[0].accounts[0].id), 'book.years[0].accounts'],
    ['科目の名前が空', (f) => (f.book.years[0].categories[0].name = ''), 'book.years[0].categories[0].name'],
    ['科目の部が知らない値', (f) => (f.book.years[0].categories[0].side = 'both'), 'book.years[0].categories[0].side'],
    ['予算が小数', (f) => (f.book.years[0].categories[0].budget = 0.1), 'book.years[0].categories[0].budget'],
    ['予算が大きすぎる', (f) => (f.book.years[0].categories[0].budget = LIMITS.maxAmount + 1), 'book.years[0].categories[0].budget'],
    ['科目の id が同じ', (f) => (f.book.years[0].categories[1].id = f.book.years[0].categories[0].id), 'book.years[0].categories'],
    ['取引の金額が 0', (f) => (f.book.years[0].transactions[0].amount = 0), 'book.years[0].transactions[0].amount'],
    ['取引の金額がマイナス', (f) => (f.book.years[0].transactions[0].amount = -500), 'book.years[0].transactions[0].amount'],
    ['取引の金額が小数', (f) => (f.book.years[0].transactions[0].amount = 1.5), 'book.years[0].transactions[0].amount'],
    ['取引の金額が文字', (f) => (f.book.years[0].transactions[0].amount = '30000'), 'book.years[0].transactions[0].amount'],
    ['取引の金額がない', (f) => delete f.book.years[0].transactions[0].amount, 'book.years[0].transactions[0].amount'],
    ['取引の金額が null', (f) => (f.book.years[0].transactions[0].amount = null), 'book.years[0].transactions[0].amount'],
    ['取引の日付が実在しない', (f) => (f.book.years[0].transactions[0].date = '2026-04-31'), 'book.years[0].transactions[0].date'],
    ['取引の日付が別の形', (f) => (f.book.years[0].transactions[0].date = '2026/4/10'), 'book.years[0].transactions[0].date'],
    ['取引の種類が知らない値', (f) => (f.book.years[0].transactions[0].kind = 'refund'), 'book.years[0].transactions[0].kind'],
    ['取引の科目がない', (f) => (f.book.years[0].transactions[0].categoryId = 'nothing'), 'book.years[0].transactions[0].categoryId'],
    ['取引の科目が null', (f) => (f.book.years[0].transactions[0].categoryId = null), 'book.years[0].transactions[0].categoryId'],
    [
      '収入に、支出の科目',
      (f) => (f.book.years[0].transactions[0].categoryId = f.book.years[0].categories.find((c: any) => c.side === 'expense').id),
      'book.years[0].transactions[0].categoryId',
    ],
    ['取引の置き場所がない', (f) => (f.book.years[0].transactions[0].accountId = 'nothing'), 'book.years[0].transactions[0].accountId'],
    ['収入に、移動の入れ先', (f) => (f.book.years[0].transactions[0].toAccountId = f.book.years[0].accounts[1].id), 'book.years[0].transactions[0].toAccountId'],
    ['移動に科目', (f) => (f.book.years[0].transactions[1].categoryId = f.book.years[0].categories[0].id), 'book.years[0].transactions[1].categoryId'],
    ['移動の入れ先がない', (f) => (f.book.years[0].transactions[1].toAccountId = null), 'book.years[0].transactions[1].toAccountId'],
    ['移動の元と先が同じ', (f) => (f.book.years[0].transactions[1].toAccountId = f.book.years[0].transactions[1].accountId), 'book.years[0].transactions[1].toAccountId'],
    ['取引の id が同じ', (f) => (f.book.years[0].transactions[1].id = f.book.years[0].transactions[0].id), 'book.years[0].transactions'],
    ['取引の内容が数', (f) => (f.book.years[0].transactions[0].description = 5), 'book.years[0].transactions[0].description'],
    ['取引の内容が長すぎる', (f) => (f.book.years[0].transactions[0].description = 'あ'.repeat(LIMITS.descriptionLength + 1)), 'book.years[0].transactions[0].description'],
    ['取引が一覧でない', (f) => (f.book.years[0].transactions = 'x'), 'book.years[0].transactions'],
    ['取引の1件が null', (f) => (f.book.years[0].transactions[0] = null), 'book.years[0].transactions[0]'],
    ['照合の金額が小数', (f) => (f.book.years[0].reconciliations = { [f.book.years[0].accounts[0].id]: { date: '2026-04-30', actual: 0.5 } }), 'book.years[0].reconciliations'],
    ['照合の日付がない', (f) => (f.book.years[0].reconciliations = { [f.book.years[0].accounts[0].id]: { actual: 5 } }), 'book.years[0].reconciliations'],
    ['予算案がマイナス', (f) => (f.book.years[0].nextBudget = { [f.book.years[0].categories[0].id]: -1 }), 'book.years[0].nextBudget'],
    ['監査の日が実在しない', (f) => (f.book.years[0].audit.date = '2026-02-30'), 'book.years[0].audit.date'],
    ['役員がない', (f) => delete f.book.years[0].officers, 'book.years[0].officers'],
    ['監査をする人の欄が0', (f) => (f.book.years[0].officers.auditors = []), 'book.years[0].officers.auditors'],
    ['引き継ぎ書がない', (f) => delete f.book.years[0].handover, 'book.years[0].handover'],
    ['未払いの金額が文字', (f) => (f.book.years[0].handover.unpaid = [{ id: 'u1', description: 'x', amount: '100' }]), 'book.years[0].handover.unpaid[0].amount'],
    ['id に使えない名前（__proto__）', (f) => (f.book.years[0].categories[0].id = '__proto__'), 'book.years[0].categories[0].id'],
    ['id に使えない名前（constructor）', (f) => (f.book.years[0].accounts[1].id = 'constructor'), 'book.years[0].accounts[1].id'],
    ['id に空白', (f) => (f.book.years[0].id = 'a b'), 'book.years[0].id'],
  ]
  for (const [name, change, path] of broken) {
    it(name, () => {
      const r = parseBookFile(tamper(filled(), change))
      expect(r.ok).toBe(false)
      if (r.ok) return
      expect(r.code).toBe('invalid')
      expect(r.message).toContain(path)
      expect(r.message).toContain('ファイルの中身')
    })
  }

  it('年度の期間が重なっている・古い順でない', () => {
    const book = ok(carryForward(filled()))
    const overlap = parseBookFile(tamper(book, (f) => (f.book.years[1].startDate = '2027-03-31')))
    expect(!overlap.ok && overlap.code).toBe('invalid')
    const reversed = parseBookFile(tamper(book, (f) => f.book.years.reverse()))
    expect(!reversed.ok && reversed.code).toBe('invalid')
    const sameId = parseBookFile(tamper(book, (f) => (f.book.years[1].id = f.book.years[0].id)))
    expect(!sameId.ok && sameId.code).toBe('invalid')
  })
  it('取引や年度の数が上限をこえている', () => {
    const tooMany = tamper(filled(), (f) => {
      const one = f.book.years[0].transactions[0]
      f.book.years[0].transactions = Array.from({ length: LIMITS.maxTransactionsPerYear + 1 }, (_, i) => ({ ...one, id: `x${i}` }))
    })
    expect(failCode(parseBookFile(tooMany) as never)).toBe('invalid')
  })
  it('上限ちょうどの数の取引は読める', () => {
    const many = tamper(filled(), (f) => {
      const one = f.book.years[0].transactions[0]
      f.book.years[0].transactions = Array.from({ length: LIMITS.maxTransactionsPerYear }, (_, i) => ({ ...one, id: `x${i}` }))
    })
    const r = parseBookFile(many)
    expect(r.ok && summarizeYear(r.book.years[0]).incomeTotal).toBe(30_000 * LIMITS.maxTransactionsPerYear)
  })
})

describe('読めるけれど、確かめてほしいファイル', () => {
  it('年度のつながりが合わないファイルは、読んだうえで知らせる（断ると、データを開く手立てがなくなるため）', () => {
    const book = ok(carryForward(filled()))
    const r = parseBookFile(tamper(book, (f) => (f.book.years[1].accounts[0].openingBalance += 1000)))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.warnings).toHaveLength(1)
      expect(r.warnings[0]).toContain('年度はじめの残高')
    }
  })
  it('消した置き場所の照合や、消した科目の予算案が残っていても読める（その分は捨てる）', () => {
    const r = parseBookFile(
      tamper(filled(), (f) => {
        f.book.years[0].reconciliations.gone = { date: '2026-04-30', actual: 1 }
        f.book.years[0].nextBudget.gone = 500
      }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.book.years[0].reconciliations).toEqual({})
      expect(r.book.years[0].nextBudget).toEqual({})
    }
  })
})

describe('あやしいキーを持ち込まない', () => {
  it('__proto__ というキーの入ったファイルを読んでも、ほかの値に影響しない', () => {
    const text = serializeBook(filled(), NOW)
      .replace('"book": {', '"__proto__": { "polluted": true }, "book": { "__proto__": { "polluted": true },')
      .replace('"reconciliations": {}', '"reconciliations": { "__proto__": { "date": "2026-04-30", "actual": 1 } }')
    const r = parseBookFile(text)
    expect(r.ok).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    if (r.ok) {
      expect((r.book as unknown as Record<string, unknown>).polluted).toBeUndefined()
      expect(Object.keys(r.book.years[0].reconciliations)).toEqual([])
    }
  })
})

describe('ファイルの名前', () => {
  it('団体の名前、年度、日付が入る', () => {
    expect(suggestFileName(createSampleBook(), NOW)).toBe('ひきつぎ会計_あおぞら町内会_令和8年度_2026-11-14.json')
  })
  it('ファイルの名前に使えない文字は取りのぞく', () => {
    const book: Book = { ...filled(), orgName: 'A/B\\C:D*E?F"G<H>I|J 町内会\n' }
    expect(suggestFileName(book, NOW)).toBe('ひきつぎ会計_ABCDEFGHIJ町内会_令和8年度_2026-11-14.json')
    expect(suggestFileName({ ...filled(), orgName: '///' }, NOW)).toBe('ひきつぎ会計_名前なし_令和8年度_2026-11-14.json')
    expect(suggestFileName({ ...filled(), orgName: '..secret' }, NOW)).toBe('ひきつぎ会計_secret_令和8年度_2026-11-14.json')
  })
  it('長い名前は切る', () => {
    const name = suggestFileName({ ...filled(), orgName: 'あ'.repeat(60) }, NOW)
    expect(name.length).toBeLessThan(80)
  })
  it('日付は、その端末の暦の日付（夜中でも前の日にならない）', () => {
    expect(suggestFileName(filled(), new Date(2026, 10, 14, 0, 5, 0))).toContain('_2026-11-14.json')
    expect(suggestFileName(filled(), new Date(2026, 10, 14, 23, 55, 0))).toContain('_2026-11-14.json')
  })
})

describe('buildBookFile（保存する中身を作って、その場で確かめる）', () => {
  it('名前と中身を返す', () => {
    const built = ok(buildBookFile(filled(), NOW))
    expect(built.fileName).toBe('ひきつぎ会計_テスト町内会_令和8年度_2026-11-14.json')
    expect(parseBookFile(built.text).ok).toBe(true)
  })
  it('あとで開けない中身になるときは、ファイルを作らない', () => {
    const book = filled()
    const bad: Book = { ...book, years: [{ ...year(book), transactions: [{ ...year(book).transactions[0], amount: 1.5 }] }] }
    const r = buildBookFile(bad, NOW)
    expect(failCode(r)).toBe('self-check')
  })
})

describe('openBookFile（利用者が選んだファイルを読む）', () => {
  it('ひきつぎファイルを読める', async () => {
    const book = filled()
    const r = await openBookFile(new Blob([serializeBook(book, NOW)], { type: 'application/json' }))
    expect(r.ok && r.book).toEqual(book)
  })
  it('大きすぎるファイルは、読む前に断る', async () => {
    const r = await openBookFile(new Blob([new Uint8Array(LIMITS.maxFileBytes + 1)]))
    expect(!r.ok && r.code).toBe('too-large')
  })
  it('写真などの関係ないファイルは断る', async () => {
    const r = await openBookFile(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])], { type: 'image/jpeg' }))
    expect(!r.ok && r.code).toBe('not-json')
  })
  it('空のファイルは断る', async () => {
    const r = await openBookFile(new Blob([]))
    expect(!r.ok && r.code).toBe('empty')
  })
})
