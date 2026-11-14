// サンプルのデータ。「サンプルを見る」と、LP に置く資料の見本に使う。
// 団体も、人の名前も、金額も、説明のために作ったもの（実在の団体ではない）。
// 手で組み立てず、画面と同じ関数（book.ts、carry.ts）で作る。まちがったデータを見本にしないため。
// id も日付も決め打ちにして、いつ・どこで作っても同じ結果になるようにしてある
// （静的HTMLに書き出した見本と、ブラウザで描いた見本が食いちがわないように）。
import {
  addBankAccount,
  addTransaction,
  createBook,
  setNextBudget,
  setReconciliation,
  updateAudit,
  updateCategory,
  updateHandover,
  updateOfficers,
  updateYear,
} from './book'
import { latestYear } from './calc'
import { carryForward } from './carry'
import type { Book, FiscalYear, Result, Side, TransactionKind, Yen } from './types'

/** 見本であることを伝える文。サンプルを見せる場所に添える。 */
export const SAMPLE_NOTE = 'この団体と数字は、説明のために作った見本です。'

function must<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`サンプルのデータを作れませんでした: ${result.message}`)
  return result.value
}

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) freeze(v)
  }
  return value
}

/** 組み立てのための小さな道具。名前で科目と置き場所を引けるようにする。 */
class Builder {
  private n = 0
  book: Book
  constructor() {
    this.book = must(
      createBook(
        {
          orgName: 'あおぞら町内会',
          orgKind: 'chonaikai',
          startDate: '2025-04-01',
          cashOpening: 18_560,
          bankAccounts: [{ name: '普通預金', openingBalance: 386_214 }],
        },
        this.id,
      ),
    )
  }
  // 「s001」「s002」…と順に振る。毎回同じ id になる
  id = (): string => `s${String(++this.n).padStart(3, '0')}`

  get year(): FiscalYear {
    return latestYear(this.book)
  }
  account(name: string): string {
    const a = this.year.accounts.find((x) => x.name === name)
    if (!a) throw new Error(`サンプル: 置き場所「${name}」がありません`)
    return a.id
  }
  category(side: Side, name: string): string {
    const c = this.year.categories.find((x) => x.side === side && x.name === name)
    if (!c) throw new Error(`サンプル: 科目「${name}」がありません`)
    return c.id
  }
  apply(result: Result<Book>): void {
    this.book = must(result)
  }
  budget(side: Side, name: string, budget: Yen, note = ''): void {
    this.apply(updateCategory(this.book, this.year.id, this.category(side, name), { budget, note }))
  }
  /** 収入・支出を1件入れる。receiptNo を渡さなければ、支出には番号が自動で付く */
  tx(date: string, kind: Exclude<TransactionKind, 'transfer'>, categoryName: string, accountName: string, description: string, amount: Yen, receiptNo?: string): void {
    this.apply(
      addTransaction(
        this.book,
        this.year.id,
        { date, kind, categoryId: this.category(kind, categoryName), accountId: this.account(accountName), description, amount, receiptNo },
        this.id,
      ),
    )
  }
  /** 置き場所の間の移動を1件入れる */
  move(date: string, from: string, to: string, description: string, amount: Yen): void {
    this.apply(
      addTransaction(
        this.book,
        this.year.id,
        { date, kind: 'transfer', accountId: this.account(from), toAccountId: this.account(to), description, amount },
        this.id,
      ),
    )
  }
}

const CASH = '現金'
const BANK = '普通預金'
const SAVINGS = '定期預金（防災の積立）'

function build(): Book {
  const b = new Builder()
  const y1 = b.year.id

  // ---------- 令和7年度（1年ぶん入力して、繰り越した年度） ----------
  b.apply(addBankAccount(b.book, y1, { name: SAVINGS, openingBalance: 200_000 }, b.id))
  b.apply(updateOfficers(b.book, y1, { president: '高橋 正夫', treasurer: '鈴木 和子', auditors: ['田中 清', '伊藤 恵子'] }))
  b.apply(updateCategory(b.book, y1, b.category('income', '市区町村の補助金'), { name: '市の補助金' }))

  b.budget('income', '会費', 372_000, '月500円 × 62世帯。10月に1世帯が転出')
  b.budget('income', '市の補助金', 40_000)
  b.budget('income', '資源回収の報奨金', 24_000)
  b.budget('income', '雑収入', 500, '夏祭りへの寄付、預金の利息')
  b.budget('expense', '事務費', 20_000)
  b.budget('expense', '会議費', 15_000)
  b.budget('expense', '行事費', 160_000, '夏祭り、敬老の日、新年会')
  b.budget('expense', '防災・防犯費', 50_000, '備蓄品の入れかえ、防災訓練、年末の夜回り')
  b.budget('expense', '環境美化費', 30_000, '春と秋の一斉清掃')
  b.budget('expense', '防犯灯の電気代', 54_000)
  b.budget('expense', '慶弔費', 20_000)
  b.budget('expense', '連合会の負担金', 37_200, '600円 × 62世帯')
  b.budget('expense', '雑費', 5_000)
  b.budget('expense', '予備費', 650_074)

  b.tx('2025-04-06', 'expense', '会議費', CASH, '総会の会場使用料（公民館）', 2_000)
  b.tx('2025-04-06', 'expense', '会議費', CASH, '総会のお茶代', 3_480)
  b.tx('2025-04-13', 'expense', '事務費', CASH, 'コピー用紙・インク', 4_378)
  b.tx('2025-04-20', 'income', '会費', CASH, '前期の会費 1班（16世帯）', 48_000)
  b.tx('2025-04-20', 'income', '会費', CASH, '前期の会費 2班（15世帯）', 45_000)
  b.tx('2025-04-27', 'income', '会費', CASH, '前期の会費 3班（17世帯）', 51_000)
  b.tx('2025-04-27', 'income', '会費', CASH, '前期の会費 4班（14世帯）', 42_000)
  b.move('2025-04-28', CASH, BANK, '会費を預け入れ', 180_000)
  b.tx('2025-04-30', 'expense', '連合会の負担金', BANK, '地区連合会の負担金（62世帯分）', 37_200)
  b.tx('2025-05-18', 'expense', '環境美化費', CASH, '一斉清掃のごみ袋・軍手', 5_236)
  b.tx('2025-05-18', 'expense', '環境美化費', CASH, '一斉清掃の飲み物', 3_960)
  b.tx('2025-06-10', 'income', '市の補助金', BANK, '自治会活動の補助金', 40_000)
  // 口座からの引き落としは領収書がないので、番号を空にする
  b.tx('2025-06-26', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（4〜6月分）', 13_180, '')
  b.move('2025-07-05', BANK, CASH, '夏祭りの準備金を引き出し', 100_000)
  b.tx('2025-07-12', 'expense', '行事費', CASH, '夏祭り 食材・飲み物', 48_730)
  b.tx('2025-07-12', 'expense', '行事費', CASH, '夏祭り 子どもの景品', 21_560)
  b.tx('2025-07-19', 'expense', '行事費', CASH, '夏祭り テントのレンタル', 16_500)
  b.tx('2025-07-20', 'income', '雑収入', CASH, '夏祭りへの寄付', 10_000)
  b.tx('2025-07-26', 'expense', '事務費', CASH, '回覧板の用紙・クリアファイル', 2_640)
  b.tx('2025-08-18', 'income', '雑収入', BANK, '預金の利息', 312)
  b.tx('2025-08-24', 'expense', '防災・防犯費', BANK, '防災倉庫の備蓄品（水・非常食）', 28_600)
  b.tx('2025-08-31', 'income', '資源回収の報奨金', BANK, '資源回収の報奨金（4〜7月分）', 9_840)
  b.tx('2025-09-07', 'expense', '防災・防犯費', CASH, '防災訓練の炊き出し材料', 8_925)
  b.move('2025-09-12', BANK, CASH, '敬老の日の記念品代を引き出し', 50_000)
  b.tx('2025-09-15', 'expense', '行事費', CASH, '敬老の日の記念品（23人分）', 34_500)
  b.tx('2025-09-26', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（7〜9月分）', 13_420, '')
  b.tx('2025-10-05', 'income', '会費', CASH, '後期の会費 1班（16世帯）', 48_000)
  b.tx('2025-10-05', 'income', '会費', CASH, '後期の会費 2班（15世帯）', 45_000)
  b.tx('2025-10-12', 'income', '会費', CASH, '後期の会費 3班（17世帯）', 51_000)
  b.tx('2025-10-12', 'income', '会費', CASH, '後期の会費 4班（13世帯）', 39_000)
  b.move('2025-10-14', CASH, BANK, '会費を預け入れ', 200_000)
  b.tx('2025-10-19', 'expense', '環境美化費', CASH, '秋の一斉清掃のごみ袋', 4_180)
  b.tx('2025-11-09', 'expense', '慶弔費', CASH, 'お見舞い', 5_000)
  b.tx('2025-11-16', 'expense', '会議費', CASH, '役員会のお茶代', 1_620)
  b.move('2025-12-01', BANK, CASH, '年末の行事の準備金を引き出し', 30_000)
  b.tx('2025-12-07', 'expense', '防災・防犯費', CASH, '年末の夜回りの軽食・カイロ', 6_380)
  b.tx('2025-12-20', 'income', '資源回収の報奨金', BANK, '資源回収の報奨金（8〜11月分）', 8_460)
  b.tx('2025-12-26', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（10〜12月分）', 13_650, '')
  b.tx('2026-01-11', 'expense', '行事費', CASH, '新年会の会場・茶菓子', 12_800)
  b.tx('2026-01-25', 'expense', '慶弔費', CASH, '香典', 5_000)
  b.tx('2026-02-08', 'expense', '事務費', CASH, '総会資料の印刷用紙', 3_278)
  b.tx('2026-02-16', 'income', '雑収入', BANK, '預金の利息', 347)
  b.tx('2026-03-08', 'income', '資源回収の報奨金', BANK, '資源回収の報奨金（12〜2月分）', 6_120)
  b.tx('2026-03-15', 'expense', '雑費', CASH, '切手・振込の手数料', 1_240)
  b.move('2026-03-20', BANK, SAVINGS, '防災の積立', 50_000)
  b.tx('2026-03-26', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（1〜3月分）', 13_510, '')
  b.tx('2026-03-29', 'expense', '事務費', CASH, '領収書のつづり・のり', 968)

  // 年度末に、通帳と手元の現金を確かめた
  b.apply(setReconciliation(b.book, y1, b.account(CASH), { date: '2026-03-31', actual: 5_185 }))
  b.apply(setReconciliation(b.book, y1, b.account(BANK), { date: '2026-03-31', actual: 481_733 }))
  b.apply(setReconciliation(b.book, y1, b.account(SAVINGS), { date: '2026-03-31', actual: 250_000 }))
  b.apply(updateYear(b.book, y1, { reportDate: '2026-04-05' }))
  b.apply(updateAudit(b.book, y1, { date: '2026-04-12' }))

  // 次年度（令和8年度）の予算案。入れていない科目は、今年度の予算と同じ
  b.apply(setNextBudget(b.book, y1, b.category('income', '会費'), 366_000))
  b.apply(setNextBudget(b.book, y1, b.category('expense', '行事費'), 150_000))
  b.apply(setNextBudget(b.book, y1, b.category('expense', '防災・防犯費'), 60_000))
  b.apply(setNextBudget(b.book, y1, b.category('expense', '連合会の負担金'), 36_600))
  b.apply(setNextBudget(b.book, y1, b.category('expense', '予備費'), 776_818))

  // 引き継ぎ書
  const places = ['会計の自宅（引き出し）', '会長の自宅', '会計の自宅（引き出し）', '会計の自宅（手提げ金庫）', '集会所の戸棚', '会長の自宅', '集会所の戸棚', '会計のパソコンと、USBメモリ']
  b.apply(
    updateHandover(b.book, y1, {
      date: '2026-04-19',
      successor: '渡辺 由美',
      custody: b.year.handover.custody.map((c, i) => ({ ...c, place: places[i] ?? '', handedOver: true })),
      unpaid: [{ id: b.id(), description: '集会所の鍵の複製代（4月に業者へ支払う）', amount: 1_650 }],
      unreceived: [{ id: b.id(), description: '資源回収の報奨金（3月分。5月に入金の予定）', amount: null }],
      equipment: [
        { id: b.id(), name: 'テント', quantity: '2張', place: '防災倉庫' },
        { id: b.id(), name: '長机', quantity: '6台', place: '集会所' },
        { id: b.id(), name: '発電機', quantity: '1台', place: '防災倉庫' },
        { id: b.id(), name: '拡声器', quantity: '1台', place: '集会所の戸棚' },
      ],
      memo: [
        '・会費は4月と10月に、班長さんが集めて持ってきてくれます。',
        '・防犯灯の電気代は、3か月ごとに普通預金から引き落とされます。',
        '・市の補助金は、5月に申請書を出すと、6月に振り込まれます。',
      ].join('\n'),
    }),
  )

  // ---------- 令和8年度（繰り越して、入力している途中の年度） ----------
  b.apply(carryForward(b.book, {}, b.id))
  const y2 = b.year.id
  b.apply(updateOfficers(b.book, y2, { president: '高橋 正夫', treasurer: '渡辺 由美', auditors: ['田中 清', '小林 茂'] }))

  b.tx('2026-04-05', 'expense', '会議費', CASH, '総会の会場使用料（公民館）', 2_000)
  b.tx('2026-04-05', 'expense', '会議費', CASH, '総会のお茶代', 2_860)
  b.tx('2026-04-08', 'expense', '雑費', BANK, '集会所の鍵の複製代', 1_650)
  b.tx('2026-04-19', 'income', '会費', CASH, '前期の会費 1班（16世帯）', 48_000)
  b.tx('2026-04-19', 'income', '会費', CASH, '前期の会費 2班（15世帯）', 45_000)
  b.tx('2026-04-26', 'income', '会費', CASH, '前期の会費 3班（17世帯）', 51_000)
  b.tx('2026-04-26', 'income', '会費', CASH, '前期の会費 4班（13世帯）', 39_000)
  b.move('2026-04-27', CASH, BANK, '会費を預け入れ', 170_000)
  b.tx('2026-04-30', 'expense', '連合会の負担金', BANK, '地区連合会の負担金（61世帯分）', 36_600)
  b.tx('2026-05-17', 'expense', '環境美化費', CASH, '一斉清掃のごみ袋・軍手', 5_478)
  b.tx('2026-05-17', 'expense', '環境美化費', CASH, '一斉清掃の飲み物', 3_720)
  b.tx('2026-05-29', 'income', '資源回収の報奨金', BANK, '資源回収の報奨金（3月分）', 2_340)
  b.tx('2026-06-12', 'income', '市の補助金', BANK, '自治会活動の補助金', 40_000)
  b.tx('2026-06-26', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（4〜6月分）', 13_380, '')
  b.move('2026-07-04', BANK, CASH, '夏祭りの準備金を引き出し', 100_000)
  b.tx('2026-07-11', 'expense', '行事費', CASH, '夏祭り 食材・飲み物', 46_290)
  b.tx('2026-07-11', 'expense', '行事費', CASH, '夏祭り 子どもの景品', 19_800)
  b.tx('2026-07-18', 'expense', '行事費', CASH, '夏祭り テントのレンタル', 16_500)
  b.tx('2026-08-17', 'income', '雑収入', BANK, '預金の利息', 402)
  b.tx('2026-08-23', 'expense', '防災・防犯費', BANK, '防災倉庫の備蓄品（水・非常食）', 31_900)
  b.tx('2026-08-30', 'income', '資源回収の報奨金', BANK, '資源回収の報奨金（4〜7月分）', 9_120)
  b.tx('2026-09-06', 'expense', '防災・防犯費', CASH, '防災訓練の炊き出し材料', 9_240)
  b.move('2026-09-11', BANK, CASH, '敬老の日の記念品代を引き出し', 40_000)
  b.tx('2026-09-21', 'expense', '行事費', CASH, '敬老の日の記念品（24人分）', 36_000)
  b.tx('2026-09-28', 'expense', '防犯灯の電気代', BANK, '防犯灯の電気代（7〜9月分）', 13_610, '')
  b.tx('2026-10-04', 'income', '会費', CASH, '後期の会費 1班（16世帯）', 48_000)
  b.tx('2026-10-04', 'income', '会費', CASH, '後期の会費 2班（15世帯）', 45_000)
  b.tx('2026-10-11', 'income', '会費', CASH, '後期の会費 3班（17世帯）', 51_000)
  b.tx('2026-10-11', 'income', '会費', CASH, '後期の会費 4班（13世帯）', 39_000)
  b.move('2026-10-13', CASH, BANK, '会費を預け入れ', 185_000)
  b.tx('2026-10-18', 'expense', '環境美化費', CASH, '秋の一斉清掃のごみ袋', 4_290)
  b.tx('2026-11-08', 'expense', '会議費', CASH, '役員会のお茶代', 1_540)

  // 預金は、10月末の通帳と照らし合わせてある。現金は、まだ（画面で試せるように残してある）
  b.apply(setReconciliation(b.book, y2, b.account(BANK), { date: '2026-10-31', actual: 651_455 }))
  b.apply(setReconciliation(b.book, y2, b.account(SAVINGS), { date: '2026-10-31', actual: 250_000 }))

  // 作る途中で増えた変更の回数は、見せても意味がないので 0 に戻す
  return { ...b.book, revision: 0 }
}

let cache: Book | null = null

/**
 * サンプルの帳簿。
 *   years[0] … 令和7年度。1年ぶんの取引、照合、予算案、引き継ぎ書がそろっている（繰り越し済みで、読むだけ）
 *   years[1] … 令和8年度。11月まで入力した途中の年度
 * 返す値は凍らせてある（書きかえようとするとエラーになる）。変えるときは book.ts の関数を通すこと。
 */
export function createSampleBook(): Book {
  cache ??= freeze(build())
  return cache
}
