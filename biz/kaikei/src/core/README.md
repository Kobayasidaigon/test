# src/core — ひきつぎ会計の中身のロジック

画面（React）に依存しない、ただの TypeScript です。計算、判定、保存の形式、読み込みの検査、サンプルのデータ、資料の中身づくりが入っています。

- 画面からは `import { ... } from '@/core'` で読み込みます（入口は `index.ts`）。
- `browser.ts` の関数（ダウンロード、ファイルを開く）だけが、ブラウザの機能に触ります。**ボタンを押したときの処理の中からだけ**呼んでください。それ以外は、静的HTMLを書き出すとき（`ssr: true` のページ）に呼んでも安全です。
- テストは `npm test`（`src/core/*.test.ts`、vitest）。

## データの形

```
Book（帳簿。1つの団体の、すべての年度。これがそのまま「ひきつぎファイル」になる）
├ orgName, orgKind            団体の名前、種類（'chonaikai' | 'kodomokai' | 'pta' | 'circle' | 'other'）
├ roleNames                   役の呼び名 { president: '会長', treasurer: '会計', auditor: '監事' }（変えられる）
├ diffStyle                   決算書の「差」の向き（'actual-minus-budget' | 'budget-minus-actual'）
├ licenseKey                  有料版のキー（なければ ''）。ファイルと一緒に、次の担当へ渡る
├ revision                    変更の回数。変えるたびに 1 増える
└ years: FiscalYear[]         古い順。**取引・科目・予算・置き場所を書きかえられるのは、最後の1つだけ**（それより前は読むだけ。資料に書くことは、下の「読むだけの年度」）
   ├ id, label, startDate, endDate         「令和8年度」、'2026-04-01'、'2027-03-31'
   ├ officers                 { president, treasurer, auditors: string[] }（年度ごと。空でもよい。auditors は 1〜3人）
   ├ accounts: Account[]      お金の置き場所。現金が1つ（先頭）＋ 預金口座が 0〜3つ。{ id, kind, name, openingBalance }
   ├ categories: Category[]   科目。{ id, side: 'income' | 'expense', name, budget, note }。並び順は配列の順
   ├ transactions: Transaction[]   取引。入れた順に並ぶ（日付の順に見るときは sortedTransactions / transactionViews）
   │    { id, date, kind: 'income' | 'expense' | 'transfer', categoryId, description, amount, accountId, toAccountId, receiptNo }
   ├ carryoverBudget          決算書の「前年度繰越金」の予算額。null なら決算額と同じ
   ├ reconciliations          置き場所の id → { date, actual }（残高の照合の記録）
   ├ reportDate               資料の作成日（'' なら、画面の側で今日の日付を出す）
   ├ audit                    { text, date }（監査報告書の本文と、監査の日）
   ├ nextBudget               科目の id → 次年度の予算案（入れていない科目は、今年度の予算をそのまま使う）
   └ handover                 引き継ぎ書 { date, successor, custody[], unpaid[], unreceived[], equipment[], memo }
```

- 金額（`Yen`）は、1円単位の整数です。日付（`DateString`）は `'2026-04-01'` の形の文字列です。
- 「前年度繰越金」は科目ではありません。置き場所の年度はじめの残高の合計として、自動で出ます。
- 上限は `LIMITS` にあります（金額 999,999,999円、1年度の取引 5,000件、科目は収入・支出それぞれ40件、など）。

## 使い方

### 帳簿を変える

変える関数は、どれも **元の帳簿を書きかえず、新しい帳簿を `Result<Book>` で返します**。

```ts
type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string; field?: string }
```

`message` は、そのまま画面に出せる日本語の文です。`field` は、どの入力欄のことか（`'amount'`、`'date'` など）。

```tsx
import { addTransaction, checkTransaction, latestYear, type Book, type Result } from '@/core'

function apply(result: Result<Book>) {
  if (result.ok) setState((s) => s && { ...s, book: result.value })
  else setError(result.message)
}

const year = latestYear(book)                      // いま入力している年度
const input = { date: '2026-11-14', kind: 'expense' as const, categoryId, accountId, amount: 1200, description: 'ボールペン' }

// 入れる前に確かめる。errors があれば入れられない。warnings は、知らせたうえで入れられる
const check = checkTransaction(book, year.id, input, { today })
if (check.errors.length === 0) apply(addTransaction(book, year.id, input))
```

| すること | 関数 |
|---|---|
| 新しく始める | `createBook({ orgName, orgKind, startDate, cashOpening?, bankAccounts? })`。期間の初期値は `defaultFiscalPeriod(today)` |
| サンプルを入れる | `createSampleBook()`。開いている帳簿が見本かどうかは `isSampleBook(book)` |
| 団体の名前・役の呼び名・差の向き | `updateOrg(book, patch)` |
| 年度の呼び名・期間・作成日 | `updateYear(book, yearId, patch)` |
| 役員の名前 | `updateOfficers(book, yearId, patch)` |
| 置き場所 | `addBankAccount` / `updateAccount` / `removeAccount` |
| 科目 | `addCategory` / `updateCategory` / `moveCategory(…, 'up' \| 'down')` / `removeCategory` |
| 取引 | `checkTransaction` → `addTransaction` / `updateTransaction` / `removeTransaction` |
| 残高の照合 | `setReconciliation(book, yearId, accountId, { date, actual } \| null)` |
| 監査報告書の本文・日付 | `updateAudit(book, yearId, patch)` |
| 次年度の予算案 | `setNextBudget(book, yearId, categoryId, amount \| null)`（繰り越したあとの、すぐ前の年度で呼ぶと、いまの年度の同じ科目の予算額にも入る） |
| 引き継ぎ書 | `updateHandover(book, yearId, patch)`（一覧はまるごと入れかえる。行の id は `randomId()`） |
| ライセンスキーを帳簿に入れる | `setLicenseKey(book, key)` |
| 次の年度へ繰り越す | `checkCarryForward(book, { today })` → `carryForward(book)`。取り消しは `undoCarryForward(book)` |

#### 読むだけの年度（繰り越したあとの、前の年度）

`isYearLocked(book, yearId)` が true の年度では、**数字に関わるもの**を変えようとすると、`code: 'year-locked'` で断られます: 取引、科目（名前・予算額・並び・足す・消す）、置き場所、年度の呼び名と期間、前年度繰越金の予算額。

**資料に書くこと**は、読むだけの年度でも変えられます: 資料の作成日（`updateYear` に `reportDate` だけを渡す）、役員の名前（`updateOfficers`）、決算書の「説明」の文（`updateCategory` に `note` だけを渡す）、監査報告書の文と日付（`updateAudit`）、引き継ぎ書（`updateHandover`）、残高の照合の記録（`setReconciliation`）。次年度の予算案（`setNextBudget`）は、いまの年度のすぐ前の年度だけ変えられ、同じ金額が、いまの年度の同じ科目の予算額にも入ります（それより前の年度は `year-locked`）。

画面では、`locked` を「取引・科目・予算額を変えられない」という意味で使ってください（資料の欄まで disabled にしない）。

### 入力欄の文字を読む

- `parseYen('１２，０００円')` → `{ ok: true, value: 12000 }`。全角、カンマ、「円」「¥」を読みます。小数・マイナス・数字でない文字は、理由の文つきで断ります。
  - カンマは、3桁ごとの位置にあるときだけ読みます。`parseYen('12,5')` や `parseYen('1,20')` は、桁の打ちそこねかもしれないので、だまって 125・120 とは読まずに断ります（④の点検で足した決まり）。
- `parseDateInput('1/15', { startDate, endDate })` → その会計年度の中に入る年を選びます（`'2027-01-15'`）。`2026/4/1`、`令和8年4月1日`、`R8.4.1`、`0401` も読みます。
- `defaultReceiptNo(year, kind)` … 領収書の番号の初期値（支出は次の番号、収入と移動は空）。
- `descriptionSuggestions(book, categoryId)` … その科目で前に入れた内容（去年の分も出る）。

### 集計と判定

| ほしいもの | 関数 |
|---|---|
| 年度の集計（収入・支出の合計、科目ごとの予算と決算、置き場所ごとの残高、次年度繰越金） | `summarizeYear(year, book.diffStyle)` |
| 取引の一覧（日付順、科目と置き場所の名前つき） | `transactionViews(year)`、しぼりこみは `filterTransactions(views, { text, kind, categoryId, accountId, from, to })` |
| 確かめてほしいこと（年度の外の日付、マイナスの残高、同じ領収書番号、先の日付） | `listYearIssues(year, { today })` |
| 残高の照合（合わないと、いくら違うかと、考えられる原因を言う） | `reconcileYear(year)` |
| その日までの帳簿の残高 | `bookBalanceAsOf(year, accountId, date)` |
| 年度のつながり（年度はじめの残高＝前の年度の年度末の残高） | `checkYearChain(book)` |

`summarizeYear` の結果では、いつも `carryover === closingTotal`（`balanced` が true）です。`budgetGap` は「予算の収入（前年度繰越金を入れた額）− 予算の支出」で、0 なら予算が合っています。

### 資料（5種類）

`buildReports(book, yearId)` が、5種類をまとめて返します。**紙に何を書くか、の値だけ**です（罫線、余白、印刷、透かしは画面の側）。

| 資料 | 関数 | 主な中身 |
|---|---|---|
| 収支決算書 | `buildSettlement` | `income.rows`（最初の行が前年度繰越金）、`expense.rows`、`incomeTotal`、`expenseTotal`、`carryover`、`breakdown`（繰越金の内訳）、`reportDate`、`treasurer` |
| 出納帳 | `buildLedgerReport` | `ledgers[]`（置き場所ごと）。`rows`（最初の行が「前年度より繰越」）、`inflowTotal`、`outflowTotal`、`closing` |
| 会計監査報告書 | `buildAuditReport` | `addressee`、`body`（`{年度}` `{期間}` `{団体名}` を置きかえたあと）、`date`、`auditors`（署名欄の数）、`figures` |
| 次年度の予算案 | `buildBudgetDraft` | 行ごとに `currentBudget`、`currentActual`、`nextBudget`、`entered`（予算案を入れてあるか）。`gap`（0 なら予算が合っている） |
| 引き継ぎ書 | `buildHandoverReport` | `balances`（照合の結果つき）、`custody`、`unpaid`、`unreceived`、`equipment`、`memo` |

金額は数のまま返します。画面で `formatYen(n)`（`'12,345'`、マイナスは `'△1,200'`）、日付は `formatWareki(date)`（`'令和8年4月1日'`）で文字にしてください。日付が `''` のところは「手で書けるように空けて出す」か「今日の日付を出す」かを、画面で決めます。

LP の見本は、こう作れます（毎回同じ結果になるので、静的HTMLに書き出せます）。

```ts
const book = createSampleBook()
const reports = buildReports(book, book.years[0].id)!   // years[0] = 令和7年度（1年ぶんそろっている）
```

### 保存と読み込み

主役はファイル、ブラウザの中（localStorage）は控えです。

```tsx
import { loadLocal, saveLocal, stateFromNewBook, stateFromFile, markSaved, unsavedInfo, saveBookToFile, openBookFile } from '@/core'

// 開いたとき（useEffect の中で）
const r = loadLocal(localStorage)
//   { status: 'empty' }                       → はじめての画面（開く／新しく始める／サンプル）
//   { status: 'ok', state, warnings }         → 続きから
//   { status: 'broken', message, detail }     → 読めなかった（元の中身は 'kaikei:data:v1:broken' に退避ずみ）。message を出して、はじめての画面へ
//   { status: 'unavailable', message }        → 保存領域が使えない。message を出して、ファイル保存だけで使ってもらう

// 変わるたびに（useEffect の中で）
const saved = saveLocal(localStorage, state)   // だめなら saved.message を出す（容量がいっぱい、など）

// 「ファイルに保存」ボタン
const result = saveBookToFile(state.book)      // ダウンロードが始まる
if (result.ok) setState(markSaved(state, new Date()))

// 「ひきつぎファイルを開く」（<input type="file"> の files[0]）
const opened = await openBookFile(file)
if (opened.ok) setState(stateFromFile(opened.book, opened.savedAt))   // opened.warnings があれば見せる
else setError(opened.message)

// 「最後に保存してから◯件の変更があります」
const info = unsavedInfo(state)                // { neverSaved, count, message }
```

- `state` は `{ book, savedRevision, savedAt }` です。新しく作った帳簿・サンプルは `stateFromNewBook(book)` で包みます。
- 変更の数は、変える関数を呼んだ回数です。メモの欄などで1文字ごとに `updateHandover` を呼ぶと、数がどんどん増えます。**入力欄から離れたとき（blur）に呼ぶ**ようにしてください。

### ライセンスキーを、ファイルと一緒に渡す

キーは団体のものなので、**帳簿（ひきつぎファイル）の中にだけ**置きます。`core` は、キーを帳簿に入れて運ぶだけです（`setLicenseKey(book, key)`、空文字で外す）。
有料版かどうかは、画面の側（`src/components/tool/store.tsx`）が、**いま開いている帳簿に入っているキー**を `src/lib/book-license.ts` の `checkBookLicense` で確かめて決めます。ブラウザには、キーを覚えさせません（覚えさせると、同じパソコンで開いた別の団体の帳簿まで、有料版になるため）。

```tsx
import { checkBookLicense, peekLicense, sameOrgName } from '@/lib/book-license'

// (1) 帳簿のキーが変わるたびに確かめる（ファイルを開いた、キーを入れた・外した、日付が変わった）
const result = await checkBookLicense(book.licenseKey, site.licensePublicKey, site.slug, today)
//   { status: 'none' }                 キーが入っていない
//   { status: 'ok', license }          有料版
//   { status: 'expired', license }     期限が切れた（license.expiresAt を画面に出す）
//   { status: 'invalid', message }     確かめられなかった（message は、そのまま出せる文）

// (2) キーを入れる画面: 確かめが通ったら、帳簿に入れる。キーの名前と団体の名前が違うときは、先に確かめをはさむ
const r = await verifyLicense(key, site.licensePublicKey, site.slug, today)
if (r.ok && sameOrgName(r.license.name, book.orgName)) apply(setLicenseKey(book, key))
```

`src/core/file.test.ts` の「ライセンスキーを、ひきつぎファイルで次の担当へ渡す」が、発行 → 帳簿に入れる → 保存 → 開く → 確かめ、を通しで確かめています。`src/lib/book-license.test.ts` が、期限切れ・書きかえたキー・名前のくらべ方を確かめています。

### 決まった文と、出典

- `notices.ts` … 対象外のこと（`OUT_OF_SCOPE`）、資料の形の案内（`FORMAT_NOTE`）、ことわり書き（`DISCLAIMER`）、データの置き場所（`DATA_NOTE`）、ファイルを渡すときの注意（`SHARE_NOTE`）、言葉の説明（`GLOSSARY`、`explain('摘要')`）。道具と LP で同じ文を使えます。
- `sources.ts` … 事実の出典（`FACTS`）。`OUT_OF_SCOPE[n].factIds` から `findFact(id)` で引けます。
- `templates.ts` … 団体の種類（`ORG_KINDS`）、科目のひな形、監査報告書の本文の初期値。
- `src/site.config.ts` の `site.pricing` … 料金（980円、400日）。画面と LP は、金額をここから読んでください。

## 設計で決めたこと（なぜそうしたか）

1. **金額は整数だけ。** 小数を通すと `0.1 + 0.2` のような誤差が合計に入り、通帳と1円合わない帳簿ができます。入力（`parseYen`）、変える関数、読み込みの検査の3か所で、整数でない金額を断ります。上限（999,999,999円 × 5,000件）まで足しても、正確に扱える範囲に収まります。
2. **日付は文字列。** `Date` を時刻つきで持ち回ると、時差で1日ずれることがあります（年度の初日・末日でずれると致命的）。計算は UTC の暦で行い、外には `'YYYY-MM-DD'` だけを出します。「今日」は `dateFromLocal(new Date())` で取ります。
3. **合計は、取引から直に足す。** 収入・支出の合計は、科目の行を足し直さず、取引から出します。そのうえで「置き場所ごとの残高の合計」と「前年度繰越金＋収入−支出」を別々に計算して、同じになることをテストしています（でたらめな取引を数千件入れるテストを含む）。
4. **移動（預け入れ・引き出し）は、科目を持たない別の種類の取引。** 収入にも支出にも入れません。読み込みの検査でも、科目の付いた移動は断ります。
5. **読むだけの年度は、データに印を持たない。** 「いちばん新しい年度のほかは読むだけ」と、並びから決めます。印と並びが食いちがったデータを作れないようにするためです。
6. **科目と置き場所の id は、年度をまたいで同じ。** 繰り越しで id をそのまま写します。年度はじめの残高のつながりを id で確かめられ、去年の摘要を手がかりに出せます。
7. **年度の外の日付は、断らずに知らせる。** 仕様どおりです。入れた取引は合計にも入れます（入れたものを、だまって集計から外すほうが危ないため）。`listYearIssues` に、いつでも出ます。
8. **マイナスの残高は「その日の終わり」で見る。** 同じ日に引き出しと支払いを入れた順が逆でも、まちがいと言わないためです。
9. **年度末の残高がマイナスだと、繰り越せない。** マイナスの現金は実際にはありえないので、そのまま繰り越すと、次の年度がまちがった金額から始まります。足りない分の収入や引き出しを入れてから、繰り越してもらいます。**上限（999,999,999円）をこえた残高も、繰り越せません**（`closing-too-large`）。こえたまま繰り越すと、新しい年度の年度はじめの残高が、読み込みの検査を通らなくなり、ファイルに保存できず、読み込み直すと帳簿を開けなくなるためです（⑤の点検で見つかった）。
10. **繰り越しの取り消しは、新しい年度に取引がないときだけ。** 総会で承認された前の年度の数字を、あとから変えられないようにするためです。直しは、いまの年度の取引として入れてもらいます（断るときの文に、そう書いてあります）。
    - **ただし「資料に書くこと」は、繰り越したあとでも変えられる。** 新しい年度の日付の取引（4月の総会の会場費など）を入れるには、先に繰り越すしかありません。はじめは、繰り越すと前の年度のすべての欄が使えなくなり、監査 → 総会 → 引き継ぎの途中で、資料の日付・名前・予算案・引き継ぎ書を入れられなくなりました（⑤の点検で見つかった）。そこで、変えられないのは数字（取引、科目の名前と予算、置き場所、期間）だけにしました。決算書の「説明」の文も、資料に書くことなので変えられます。決算の数字は、どの操作でも変わりません（テスト「資料に書くこと…は、繰り越したあとでも入れられる。決算の数字は変わらない」）。
    - **繰り越したあとに前の年度の予算案を変えると、いまの年度の予算額にも入る。** 繰り越しのときと同じ決まり（予算案があればそれ、なければ前の年度の予算）で、紙の予算案と、新しい年度の予算が、食いちがったままにならないようにするためです。いまの年度で先に予算額を手で直していても、あとから入れた予算案の金額で上書きされます（画面に、そう書いてあります）。
11. **領収書の番号は、支出にだけ自動で振る。** 領収書をもらうのは支出のときなので、収入にも振ると、つづりの番号が飛んで見えます。番号は変えられ、空にもできます。消した取引の番号は詰めません。
12. **読み込みの検査は「断る」と「知らせる」を分ける。** 形が合わない・計算を狂わせるもの（小数の金額、ない科目を指す取引、同じ id など）は、場所と理由を言って断ります。年度のつながりが合わないだけなら、読んだうえで知らせます（断ると、利用者が自分のデータを開く手立てがなくなるため）。通ったデータは、知っている項目だけを写した新しい値にします。
13. **保存するときに、その場でもう一度読み込んで確かめる。** 「保存はできたのに、あとで開けない」ファイルを渡すのが、いちばん困るためです（`buildBookFile`）。
14. **ファイルは、取引1件を1行に書く。** ふつうの字下げだと1件が11行になり、大きさが3倍近くになります。1年ぶん（300件）で 100KB より小さく、人が開いても表のように読めます。
15. **版の番号と、移行の表。** ファイルにも保存領域にも `version` があります。形を変えるときは `FILE_VERSION` を上げて、`validate.ts` の `MIGRATIONS` に古い版からの直し方を足します。`file.test.ts` に、手で書いた版1のファイルの見本があり、これが読めなくなったらテストが落ちます。
16. **壊れた保存データは、退避してから始める。** `loadLocal` は、読めなかった中身を `kaikei:data:v1:broken` に写します。そのあと新しく始めても、元の中身が上書きで消えません。利用者が「このブラウザのデータを消す」を選んだとき（`clearLocal`）は、退避したものも一緒に消します（共用のパソコンに、前の帳簿を残さないため）。退避したデータを画面から戻す手立ては、ありません。
17. **「差」の向きと、役の呼び名は、団体で変えられる。** 決算書の差を「決算−予算」と書く団体も「予算−決算」と書く団体もあり、監査をする人を「監事」と呼ぶ団体も「会計監査」と呼ぶ団体もあるためです。
18. **サンプルは、画面と同じ関数で組み立てる。** 手で書いた JSON ではなく、`createBook` → `addTransaction` → `carryForward` で作ります。id と日付は決め打ちで、いつ作っても同じです。返す値は凍らせてあります。

## 仕様書と変えたところ

- **預金口座は 0〜3つ**（仕様書は 1〜3つ）。現金だけで回している小さなサークルが、使わない口座を消せるようにしました。新しく始めるときは、普通預金が1つ入ります。
- **役員の名前は、年度ごとに持つ**（仕様書は団体の項目）。過去の年度の資料に、その年の役員の名前が出るようにするためです。繰り越したとき、名前は空から始まります（去年の名前のまま署名欄を印刷してしまうのを防ぐため）。
- **前の年度は「数字だけ」読むだけ**（仕様書は「前の年度は読むだけにして残す」）。資料に書くこと（作成日、役員の名前、決算書の説明、監査報告書、次年度の予算案、引き継ぎ書）と、残高の照合の記録は、繰り越したあとでも変えられます（上の「設計で決めたこと」の 10）。
- **年度末の残高がマイナス、または上限をこえていると、繰り越せない**（仕様書は、マイナスの残高は「知らせる」）。
- **有料版かどうかは、帳簿に入っているキーで決める**（仕様書は「ひきつぎファイルの中にもキーを入れて」。ブラウザには覚えさせず、ファイルの中だけにしました）。サンプルの帳簿にはキーを入れられないので、販売を始めたあとのサンプルは、いつも無料版の見え方です。
- **決算書の「前年度繰越金」の予算額を、決算額と別に決められる**（`carryoverBudget`。初期値は「決算額と同じ」）。前の年の資料の形に合わせるためです。

## できていないこと・あやしいところ

- **出典は、ページの本文で確かめられていません。** `sources.ts` の5件は、どれも「検索結果に出た抜粋」で中身を確かめたものです（`how: 'search-excerpt'`）。作業環境から、国税庁・内閣府・e-Gov のページを直接開けませんでした。認可地縁団体と NPO法人の2件は、はじめに挙げていた総務省の PDF と内閣府NPOホームページの Q&A の URL が検索でも確かめられなかったので、出典を法律そのもの（e-Gov 法令検索の地方自治法、特定非営利活動促進法）に入れかえてあります（④の点検）。公開の前に、URL を開いて確かめてください。
- **「任意団体の会計には、法律で決まった様式がない」は、確かめられませんでした。** そう言い切っている公式のページを、見つけられませんでした。そのため `sources.ts` には入れていません。`FORMAT_NOTE` は「資料の形は、団体によって違います。団体の規約と、前の年の資料の形に合わせてください」という言い方にとどめています。LP でも、法律のことは言い切らないでください。
- **科目のひな形は、よくある名前の一例です。** 公式の様式から取ったものではありません。画面では `FORMAT_NOTE` を添えてください。
- **新しい科目を、次年度の予算案にだけ足すことはできません。** 予算案の行は、今年度の科目と同じです。次年度から始める科目は、今年度に予算 0円 で足す（決算書にも 0円 の行が出る）か、繰り越したあとに足すことになります。
- **同じ日の中の取引の並べ替えは、できません。** 入れた順です。
- **元に戻す（アンドゥ）は、ありません。** 消す前の確かめは、画面の側でしています（取引、口座、予算額や説明の入った科目、中身の入った引き継ぎ書の行。名前だけの科目と、空の行は、確かめなしで消えます）。
- **2つのファイルをまとめることは、できません。** 2人が別々に入力したファイルは、片方にしかできません（同時には使えない、と LP に書くこと）。
- **ファイルは、毎回ダウンロードです。** 同じファイルへの上書き保存（File System Access API）は使っていません。保存のたびに、日付の付いた新しいファイルができます。
- **ブラウザは、利用者が保存をやめたかどうかを教えてくれません。** `saveBookToFile` が確かめられるのは、ダウンロードを始めたところまでです。
- **特別会計（会計を2つ以上に分けること）、前の年度をあとから足すことは、扱っていません。**
- `LIMITS.maxFileBytes`（30MB）をこえるほど大きな帳簿は、保存を断ります（年300件の団体なら、何十年ぶん入れても届きません）。
