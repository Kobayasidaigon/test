// LP の見本に使う帳簿。
// どれも、道具と同じ関数（src/core）で作る。手で書いた数字を見本にしない。
// id も日付も決め打ちなので、静的HTMLに書き出したときと、ブラウザで描いたときで、同じ結果になる。
import {
  addTransaction,
  createSampleBook,
  setReconciliation,
  type Book,
  type DateString,
  type Result,
  type Yen,
} from '@/core'

function must<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`LP の見本を作れませんでした: ${result.message}`)
  return result.value
}

/**
 * 見本の帳簿: サンプルの「令和7年度」だけを取り出したもの。
 * サンプルの令和7年度は、次の年度へ繰り越したあとなので、そのままでは書きかえられない（読むだけ）。
 * LP では「1件入れると、決算書が変わる」を見せたいので、繰り越す前の形（令和7年度が、いちばん新しい年度）にして使う。
 */
export function createDemoBook(): Book {
  const sample = createSampleBook()
  return { ...sample, years: [sample.years[0]] }
}

/** 見本の年度（令和7年度）の id。 */
export function demoYearId(book: Book): string {
  return book.years[0].id
}

/** 「ためしに1件入れる」で、取引を入れる日と置き場所。見本の年度の終わりごろに、普通預金から払ったことにする。 */
export const TRY_DATE: DateString = '2026-03-30'
export const TRY_ACCOUNT_NAME = '普通預金'
/** 見本の資料の「今日」。決め打ちにする（静的HTMLと、ブラウザで描いた結果を同じにするため）。 */
export const DEMO_TODAY: DateString = '2026-04-05'

// ---- 残高の照合の見本 ----

/** 照合の見本で使う置き場所と、確かめた日、通帳の残高。 */
export const RECON_ACCOUNT_NAME = '普通預金'
export const RECON_DATE: DateString = '2026-03-31'
export const RECON_PASSBOOK: Yen = 481_733
/** わざと二重に入れておく取引の id。 */
export const RECON_DUPLICATE_ID = 'lp-duplicate'

/**
 * 照合の見本の帳簿: 見本の帳簿に、「防犯灯の電気代（1〜3月分）」を、わざともう1回入れたもの。
 * 通帳の残高（481,733円）と帳簿が合わなくなるので、「いくら違うか」と「考えられる原因」が出る。
 */
export function createReconcileDemoBook(): Book {
  const book = createDemoBook()
  const year = book.years[0]
  const original = year.transactions.find((t) => t.description === '防犯灯の電気代（1〜3月分）')
  if (!original) throw new Error('LP の見本: もとになる取引が見つかりません')
  const doubled = must(
    addTransaction(
      book,
      year.id,
      {
        date: original.date,
        kind: original.kind,
        categoryId: original.categoryId,
        accountId: original.accountId,
        amount: original.amount,
        description: original.description,
        receiptNo: '',
      },
      () => RECON_DUPLICATE_ID,
    ),
  )
  return must(setReconciliation(doubled, year.id, original.accountId, { date: RECON_DATE, actual: RECON_PASSBOOK }))
}
