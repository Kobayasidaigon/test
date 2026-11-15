# src/core — みつもり点検の中身（ロジックとデータ）

画面（React）に依存しない、純粋な TypeScript です。`window`・`document`・`localStorage` に、直接さわりません。
静的HTMLの書き出し（`ssr: true` のページ）からも、ブラウザからも、同じ結果が出ます。

```ts
import { inspectEstimate, sampleData, buildMessage, searchItems, loadData, saveData } from '@/core'
```

## いちばん短い使い方

```ts
import {
  sampleData, inspectEstimate, getCategory, formatYen,
  buildMessage, ASK_TOTAL_LABEL, ASK_TOTAL_NOTE,
} from '@/core'

const data = sampleData()                         // サンプルの見積書（「サンプルの見積書を入れる」）
const result = inspectEstimate(data.estimate)     // 点検する

result.total            // 477042   初期費用の合計
result.byCategory       // 区分ごとの小計 [{ category: 'usual', count: 5, subtotal: 310742 }, …]
result.askTotal         // 60500    「もし全部外せた場合の差」（ASK_TOTAL_LABEL、ASK_TOTAL_NOTE を必ず添える）
result.attentionCount   // 6        確かめる項目の数
result.notes            // 見積書全体の気づき（家賃が未入力、合計が合わない、など）

for (const f of result.findings) {
  getCategory(f.category).label   // 「必須か任意か、確かめる」 ← 言葉
  getCategory(f.category).mark    // 「？」                   ← 印（色だけで伝えないため）
  f.level                         // 'ok' | 'note' | 'check' | 'alert'  ← 赤ペンの強さ
  f.headline                      // 「必須か任意かを、確かめる項目です。」
  f.reasons                       // なぜそう言うのか（計算の結果を含む）
  f.checks                        // 確かめること
  f.basis                         // 根拠 [{ text, sources: [{ title, publisher, url, verifiedOn, … }] }]
  f.related                       // 参考（公的な機関の案内や、相談の例）
  f.limits                        // この道具が確かめられなかったこと
  f.caveat                        // 添えること（特約などで外せないこともある、など）
  f.howToAsk                      // 聞き方（ひとこと）
  f.guideSlug                     // 解説ページ（/items/<slug>）があれば、その slug
}

const mail = buildMessage({ inspection: result, lineIds: null, senderName: '山田 花子', propertyName: '' }, 'mail')
mail.subject   // 「お見積りについてのご確認」
mail.body      // 本文（コピーのボタンで、そのままコピーする）
```

## ファイルと、公開しているもの

| ファイル | 役割 | 主な公開 |
| --- | --- | --- |
| `types.ts` | データの型 | `Estimate` `EstimateLine` `AppData` `MessageSettings` `ItemDef` `ItemGuide` `Category` `CategoryId` `Finding` `FindingLevel` `Inspection` `BrokerageCalc` `ProrationCalc` `MonthsCalc` `BasisNote` `ResolvedBasis` |
| `sources.ts` | 出典の一覧（文書名、発行元、URL、確かめた日、確かめ方） | `sources` `getSource(id)` `listSources()` `sourceKindLabel` `RULES_VERIFIED_ON` `VERIFY_METHOD_NOTE`（確かめ方のことわり書き。全部を原文で確かめると null）`buildVerifyMethodNote(list)` `verifiedLabel(source)` `findSourceProblems(list, rulesVerifiedOn, today)`（日付と確かめ方の、つじつまの検査）`Source` `SourceId` |
| `categories.ts` | 区分（7つ＋「その他」） | `categories` `getCategory(id)` `categoryOrder` |
| `items.ts` | 項目の一覧（26個）と、解説ページの中身（12ページ分） | `items` `otherItem` `getItem(id)` `isPresetItemId(id)` `listItemsByCategory()` `listGuideItems()` `findGuideItem(slug)` `resolveBasis(notes)` `listItemSources(item)` `NO_RULE_TEXT` `OTHER_ITEM_ID` |
| `calc.ts` | 計算（仲介手数料の上限、日割りの目安、月額との比） | `brokerageCaps(rent)` `checkBrokerage()` `prorationDays()` `checkProration()` `compareToMonthly()` `monthsOf()` `isWholeHalfMonths()` |
| `inspect.ts` | 点検（この道具の中心） | `inspectEstimate(estimate)` `isOtherLine(line)` |
| `search.ts` | 見積書の言葉から項目を探す | `searchItems(query, limit?)` `guessItemId(label)` `labelForMatch(query, match)` `normalizeForSearch(text)` |
| `message.ts` | 確認の文面（メール用・LINE用） | `buildMessage(input, style)` `defaultAskLineIds(inspection)` `selectedFindings()` |
| `estimate.ts` | 見積書を作る・書き換える（もとを書き換えない） | `createEmptyData()` `createEmptyEstimate()` `addLine()` `updateLine()` `removeLine()` `moveLine()` `pruneMessageLineIds()` `lineLabel()` `nextLineId()` `isEmptyData()` |
| `storage.ts` | 保存の形式（版つき）、読み込むときの検査、保存領域、ファイル | `STORAGE_KEY` `SCHEMA_VERSION` `loadData(storage)` `saveData(storage, data, now)` `clearData(storage)` `buildExportFile(data, now)` `parseSavedText(text)` `parseSaved(value)` `LIMITS` |
| `sample.ts` | サンプルの見積書 | `sampleData()` `sampleEstimate()` `isSampleEstimate(estimate)` `SAMPLE_NOTE` |
| `consult.ts` | 相談先（188 など）、広告の表示の根拠 | `consultDesks` `adDisclosure` |
| `texts.ts` | 画面・LP で同じ言い方をするための文 | `DISCLAIMER` `CONSULT_NOTE` `ASK_TOTAL_LABEL` `ASK_TOTAL_NOTE` `MESSAGE_NOTE` `NOT_DOING` `DATA_NOTE` `AD_LABEL` |
| `wording.ts` | 言ってはいけない言い方の一覧 | `BANNED_PHRASES` `LEGAL_WORDS` `findBannedPhrase(text)` |
| `format.ts` | 表示と入力 | `formatYen()` `formatYenOrBlank()` `formatDateJa()` `formatMonthDayJa()` `formatMonths(months, exact?)` `toOneLine(text)` `parseAmountInput(text)` `parseDate()` `isValidDate()` `isValidAmount()` `daysInMonth()` `MAX_AMOUNT` |

core の外にあるもの:

- `src/offers.ts` … 広告の枠。`visibleOffers(placement?, itemId?)` が、`url` が空の枠を返さない（はじめは全部空）。
- `src/lib/file-io.ts` … ブラウザにさわる部分だけ。`downloadTextFile(file)` と `readTextFile(file)`。
- `src/site.config.ts` … `site.pricing` に、料金と売り方（無料、登録なし、収入は広告）をまとめてある。

## 画面での使い方の例

### 道具の流れ

```ts
// 1. 開いたとき（useEffect の中で）
const loaded = loadData(window.localStorage)
// loaded.status: 'empty'（はじめて）| 'ok' | 'broken'（読めなかった。reason を出す）| 'unavailable'（保存できないブラウザ。reason を出す）
// どの場合も loaded.data は使えるデータ（だめなら空）。

// 2. 家賃などを入れる
data = { ...data, estimate: { ...data.estimate, rent: parseAmountInput('7.8万') } }   // 78000。直せない文字は null

// 3. 項目を足す
searchItems('抗菌')            // [{ item: 室内の消毒・抗菌, score, matched: '抗菌' }]  ← 候補の一覧
listItemsByCategory()          // 区分ごとの項目の一覧（押して選ぶ画面）
data = { ...data, estimate: addLine(data.estimate, 'shodoku', { label: '室内抗菌施工費', amount: 16500 }) }
data = { ...data, estimate: addLine(data.estimate, guessItemId('入居安心パック'), { label: '入居安心パック' }) } // 合わなければ 'other'
data = pruneMessageLineIds({ ...data, estimate: removeLine(data.estimate, 'l3') })   // 行を消したら、文面の指定からも消す

// 4. 変わるたびに保存する
const saved = saveData(window.localStorage, data, new Date())   // { ok: false, reason } なら、reason を出す

// 5. 書き出しと読み込み
downloadTextFile(buildExportFile(data, new Date()))             // mitsumori-tenken-20261114-0930.json
const parsed = parseSavedText(await readTextFile(file))
if (!parsed.ok) show(parsed.reason)                             // 「このファイルは、みつもり点検で書き出したファイルではありません。」など
else { data = parsed.data; show(parsed.warnings) }              // warnings: 直して読み込んだところ
```

### 確認の文面

```ts
const inspection = inspectEstimate(data.estimate)
// data.message.lineIds が null のあいだは、確かめる項目（f.askDefault）を全部入れる。
// チェックボックスを動かしたら、defaultAskLineIds(inspection) をもとに、配列にして持つ。
const mail = buildMessage({ inspection, ...data.message }, 'mail')   // { subject, body, lineIds }
const line = buildMessage({ inspection, ...data.message }, 'line')   // subject は null
// body が '' のときは、入れる項目が1つもない（「文面に入れる項目を選んでください」と出す）。
```

### 解説ページ（/items/<slug>）と一覧（/items）

```ts
// routes.ts に足す（ssr: true）。ページの部品は、useRoutePath() から slug を取り出して findGuideItem(slug) で項目を得る。
...listGuideItems().map((item) => ({
  path: `/items/${item.guide.slug}`,
  title: `${item.guide.title} | みつもり点検`,
  description: item.guide.description,
  ssr: true,
  load: () => import('./pages/ItemGuide'),
}))

const item = findGuideItem('kagi-kokan')!
item.guide.lead / item.guide.what / item.guide.points   // 何のお金か／確かめること（くわしく）
item.aliases                                            // 見積書での書かれ方
item.ask.mail / item.ask.line / item.howToAsk           // 聞き方の文例
resolveBasis(item.basis)                                // 根拠（出典つき）。item.basisStatus が 'none-found' なら NO_RULE_TEXT を出す
resolveBasis(item.related)                              // 参考
item.limits / item.caveat                               // 確かめられなかったこと／添えること
getCategory(item.category)                              // 区分
RULES_VERIFIED_ON                                       // ルールの最終確認日（formatDateJa で「2026年11月14日」）
```

### 画面の担当（②）が足したもの

- `labelForMatch(query, match)`（`search.ts`）… 探した言葉から項目を選んで足すときに、行の名前として残す文字を決める。
  見積書の言葉（「室内抗菌施工費」「消毒料」）は残し、探すための短い言葉（「抗菌」）や読みがなは残さない。
- `isEmptyData(data)`（`estimate.ts`）… まだ何も入っていないか。置きかえる前に確かめるかどうかを決める。
- `isSampleEstimate(estimate)`（`sample.ts`）… サンプルのままか。結果の画面に `SAMPLE_NOTE` を出すかどうかを決める。
- `loadData()` の `broken` の理由 … 保存領域の中身が JSON として読めないときは、「ファイルを選んでください」ではなく、
  保存領域に合った言い方にした。ファイルから戻せることも言う。

## 設計で決めたこと（なぜそうしたか）

### 断定しない、を型とテストで守る

- 判定の文（`headline`）は、「〜を確かめる項目です」「〜の可能性があります」の形だけ。金額がどんなに大きくても、
  `optional` の項目の結果は変わらない（相場で判定しない。`inspect.test.ts` で確かめている）。
- 言ってはいけない言い方（「外せます」「払わなくてよい」「ぼったくり」「相場より」など）を `wording.ts` に並べ、
  項目のデータのすべての文と、いろいろな金額・条件で出した点検の結果の文を、テストで調べている。
  画面や LP の文を書いたら、`findBannedPhrase(text)` で確かめられる。
- 確認の文面には、法律や決まりの名前を出さない（`LEGAL_WORDS` でテスト）。根拠は、本人が結果の画面で読むためのもの。

### 事実と出典

- 事実を書いた文（`BasisNote`）には、必ず出典の ID を付ける。出典のない文は、テストで落ちる。
- 「決まりは見つかりませんでした」は `basisStatus: 'none-found'` で表す。`basis` は空で、`why` が `NO_RULE_TEXT` になる。
- 決まりではないが公的な機関が出している案内や相談の例は、`related`（参考）に分けた。根拠と同じ重さに見せないため。
- 確かめられなかったことは `limits` に書く（例: 仲介手数料の計算のもとに、管理費・共益費を含めるかどうか）。

### 区分は 7つ＋「その他」

仕様書の7つに、利用者が自由に足した項目のための `other`（「何のお金か、確かめる」）を加えた。
一覧にない項目について、この道具は何も確かめていないので、ほかの区分に入れると、うその分類になるため。

### 「もし全部外せた場合の差」（`askTotal`）に入れるもの

`askRemovable: true` の項目（「必須か任意か、確かめる」の全部と、鍵の交換費用）だけ。
火災保険（外すのではなく、選び直す）、クリーニングの前払い、仲介手数料の差額、一覧にない項目は入れない。
入れると、「外せるかもしれない額」を大きく見せてしまうため。仲介手数料の差は、その行の `calc.overHalf` に出る。

### 合計への入り方（`totalRole`）

- `add` … 初期費用として足す。
- `subtract` … フリーレント、値引き。見積書で引かれている額を**プラスの数で**入れ、合計から引く（マイナスの金額は扱わない）。
- `exclude` … 更新料、短期解約の違約金、敷引き。初期費用ではないので、合計に入れない（`excludedTotal` に出る）。

### 仲介手数料の計算

- 上限の目安は、家賃 × 0.55 と 家賃 × 1.1（円未満は切り捨て）。小数の誤差を避けるため、整数のまま比べる。
- 計算のもとは**家賃だけ**。管理費・共益費を含めるかどうかを書いた公式の資料を確かめられなかったので、
  上限を超えているときは、（家賃＋管理費）での計算と同じ額かどうかを調べて、「計算のもとを聞く」材料にする。
- 上限との差が1円未満なら、端数の処理の違いとみなす（`roundingOnly`）。
- 上限を超えていても、言い方は「超えている可能性があります」まで。入力した家賃のまちがいもありうるため。
- **仲介手数料の行が2つ以上あるとき**（「仲介手数料」と「仲介手数料（消費税）」を分けて書いた見積書 など）は、金額の入っている行を
  **合わせた額**で、上限と比べる（`calc.amount` が比べた額、`calc.lineCount` が合わせた行の数）。1行ずつ比べると、合計では上限を
  超えていても、どの行にも「おさまっています」と出てしまうため。合わせた行には、同じ判定と理由（「2行の合計が、…」）が出る。
  確認の文面は、合わせた額でたずねる。同じ質問が2回入らないように、はじめから文面に入れる（`askDefault`）のは、最初の行だけ。

### 0円の行

- 初期費用として足す、確かめる区分の項目（消毒、鍵の交換、火災保険、クリーニングの前払い、一覧にない項目 など）の行が 0円のときは、
  確かめる項目にも、「もし全部外せた場合の差」にも、はじめの文面にも入れない（`level: 'ok'`、「見積もりの額は、0円になっています。」）。
  「鍵の交換費用 0円」に赤ペンを入れて、「貸主様にご負担いただけますか」とたずねる文面を作ると、的はずれになるため。
- 重なりの知らせ（`overlapsWith`）は、相手の行が 0円のときは出さない。敷金が 0円の見積書では、クリーニングの前払いの聞き方も、
  「敷金からも引かれますか」ではなく、「この金額のほかに請求されることはありますか」だけにする。相手の金額が未入力のときは、出す。
- 更新料など、初期費用ではない項目（合計に入れない・引く項目）は、金額がなくても条件を確かめる項目なので、0円でも変えない。

### 「何か月分」の言い方

- `monthsOf()` は、小数第2位に丸めた数。78,100円 ÷ 78,000円 も 1 になる。丸めた数だけを見て「1か月分にあたります」と言い切ると、
  「1か月分とは違う額です」という判定と食い違う。
- そこで、0.5か月分の刻みに**ちょうど**合うかどうか（`isWholeHalfMonths()`。割り算をせずに、整数のまま確かめる）を `MonthsCalc.exact` に持たせ、
  ちょうどのときだけ「1か月分」と言い切る。ちょうどでなければ、「約1か月分（ちょうど1か月分より 100円 多い額）」と、差も言う。
  保証料の割合（％）も、割り切れないときは「約」を付ける。

### 日割り家賃

- 数え方は会社によって違うので、1つの数字と比べない。割る日数（その月の日数・30日・31日）と、計算のもと
  （家賃だけ・家賃＋管理費）の組み合わせで出した幅から、**家賃の1日分**より大きく外れたときだけ知らせる。
- 多いときは `check`（家賃がかかり始める日を確かめる）。少ないときは `note`（借りる人に不利ではないので、赤ペンは入れない）。
- 「日割り管理費」を別の行に書く見積書があるので、管理費だけの日割りとして合うときも `ok`。

### 見積書の言葉から探す（`search.ts`）

- 合い方の点は、ぴったり（100）＞ 前から合う（80）＞ 項目の言葉の一部（60）＞ 打った言葉の中に、項目の言葉が入っている（40＋言葉の長さ）。
- 「家賃」「賃料」「管理費」のように、**ほかの項目の言葉の一部にもなっている言葉**は、打った言葉の中に入っていても、決め手にならない。
  こういう言葉は、長さを点にせず、いちばん低い点（40）にする。「家賃（日割）」「3月分賃料（日割）」で、前家賃ではなく、日割り家賃が
  いちばん上に出るようにするため（前は同点で、前家賃が先に出て、日割りの額に「1か月分とは違う額です」と赤ペンが入っていた）。
  どの言葉がそれにあたるかは、項目のデータから自動で決めるので、項目を足しても、ここを直す必要はない。
- 見積書での別の呼び方を足すときは、項目の `aliases`（画面にも出す）か `keywords`（探すためだけ）に足す。

### 名前は、1行にそろえる

- 行の名前、送る人の名前、物件名は、確認の文面の中にそのまま入る。読み込んだファイルの名前に改行が入っていると、文面の中に、
  別の段落として入ってしまう。読み込むとき（`storage.ts`）、点検するとき（`inspect.ts` の `label`）、文面の見出しを作るとき（`message.ts`）に、
  `toOneLine()` で、改行や続いた空白を1つの空白に直す。

### 保存

- 保存領域のキーは `chintai:data:v1`。中身は `{ app: 'chintai', version: 1, savedAt, data }`。ファイルも同じ形。
- 読み込むときは、中身を1つずつ確かめる。型の違う値は、何行目かを言って断る。
  断る理由の文は、どこから来た値かで言い方を変える（`parseSaved(value, 'file' | 'storage')`。保存領域には、選んだファイルがないので、
  「このファイルは」ではなく「保存されていたデータは」と言う）。
  直せるもの（知らない項目の ID → 「その他」、重なった行の ID、長すぎる名前、文面の設定）は、直して読み込み、`warnings` で知らせる。
- 保存領域の中身が読めなかったときは、空から始めて、読めなかった中身を `chintai:data:v1:broken` に取っておく
  （次の保存で上書きされて、なくならないように）。
- 保存領域は引数で受け取る（`StorageLike`）。テストでは、メモリの入れ物や、例外を投げる入れ物を渡している。
- 版を上げるときは、`SCHEMA_VERSION` を上げて、`storage.ts` の `migrate` に古い版からの直し方を足す。キーは変えない。

### 日付と ID

- 日付は `'2027-03-20'` の文字列で持つ（`Date` にすると、時差で1日ずれる）。
- 行の ID は `l1`、`l2`、…（乱数や時刻を使わない。同じ操作から同じデータができる）。
- サンプルの入居日は固定（`2027-03-20`）。「今日から何日後」にすると、静的HTMLと画面で結果がずれるため。

## 出典の確かめ方と、確かめられなかったこと

### 2026-11-14: 公式サイトに絞った検索で確かめた

作業した環境からは、官公庁のサイトを直接開けませんでした。そのため、検索の対象を公式サイトのドメインに絞り、
検索結果に出た公式ページの本文の抜粋で、該当する記述を確かめました（`sources.ts` の `verifiedBy: 'official-site-search'`）。
同じ日に、点検の担当（④）が、別の検索で確かめ直し、確かめられなかった文（「払った更新料は、返ってきません」など）を消しました。

### 2026-11-15: ページ（と PDF）を開いて、原文で確かめた

それぞれの URL を `curl` で開き、HTML はそのまま、PDF は文字にして、根拠と参考の文（`items.ts` の `B` と `R`）、解説ページの文、
相談先（`consult.ts`）を、原文と1つずつ照らし合わせました。開けた18件は `verifiedBy: 'official-page'`、`verifiedOn: '2026-11-15'` にしてあります。
ダウンロードしたファイルは、リポジトリの外の作業用フォルダに置きました（リポジトリには入れていません）。

開いたもの（ページの先にある本文の PDF を含む）:

- 報酬の告示の現行の本文（令和6年7月1日以降の PDF）の第四・第九・第十一、「宅地建物取引業法の解釈・運用の考え方」（令和8年4月1日施行版）の第46条第1項関係、その別添3「重要事項説明の様式例」。
- 「原状回復をめぐるトラブルとガイドライン」（再改訂版）の全文の PDF（第1章 Ⅰ と別表1）、同じQ&AのQ16、東京都「賃貸住宅トラブル防止ガイドライン」第4版の全文の PDF。
- 「民間賃貸住宅に関する相談対応事例集」（再改訂版）の PDF、国民生活センターの注意喚起のページと報告書本文の PDF、消費者ホットラインのページと「概要」の PDF、ステルスマーケティングの告示（令和5年3月28日内閣府告示第19号）の PDF。
- 民法 第621条・第622条の2。e-Gov 法令検索のページは、本文をあとから読み込む作りなので、同じホストの e-Gov 法令 API（`laws.e-gov.go.jp/api/2/law_data/129AC0000000089`）で、現行の条文を読みました。

直したこと:

- **URL が変わっていた**（いまのページに直した）: 埼玉県の相談事例（`/b0304/soudanjirei/20240225.html` は 404 → `/b0304/shohisoudan/jirei/sumai/20240225.html`。掲載日は2026年2月19日）。
- **ページがなくなっていた**: 国土交通省「賃貸住宅の入居・退去に係る留意点」（`jutakukentiku_house_tk3_000026.html` は 404）。同じ住宅局の「民間賃貸住宅」のページ（`tk3_000016`）の「民間賃貸住宅の入居・退去に関する留意点等」に URL を直し（出典の ID `mlit-ryuiten` はそのまま）、そこに書かれていること（契約書に署名、捺印をする前に、入居時・更新時の費用と、退去時の原状回復の範囲を確かめる）だけを、根拠に残した。前のページにあったとしていた「更新料は法令上の義務ではないが、慣行としてある地域もあり、契約書で決めていれば原則有効」「鍵の交換・ルームクリーニングの特約を確かめる」は、いまのページにないので、更新料は事例集に書かれていること（法令上の根拠となる規定がなく、全国的な慣習でもない／平成23年7月15日の最高裁判所の判決）に書き直した。
- **根拠の記述が、URL の先の PDF にあった**: 原状回復のガイドラインは、概要のページ（`tk3_000020`）ではなく、本文を配っているダウンロードのページ（`tk3_000021`）に、東京都のガイドラインは、概要のページではなく、全文のダウンロードのページに、URL を直した。
- **出典を足した**: 重要事項説明書の様式の欄（「借賃以外に授受される金額」）は、「解釈・運用の考え方」の本文の PDF ではなく、別の PDF（別添3「重要事項説明の様式例」）にあったので、`takken-jusetsu-yoshiki` を足した（資料は18件から19件になった）。
- **原文より強い・ずれた言い方を直した**:
  - 敷引き: 「金額が高額に過ぎなければ有効とした判決を紹介」→「原則的には有効と解されているとしたうえで、高額に過ぎる場合は、特段の事情がない限り消費者契約法により無効になる、という考え方を示した判決（平成23年3月24日）を紹介」。
  - 民法 第621条: 「ふつうの傷みは、元に戻す義務を負いません」→「借主が元に戻す義務を負う傷みから、ふつうの傷みと年数による変化を除いている」（条文の書き方に合わせた）。
  - 事例集を「国土交通省の事例集」と書いていた文: 作ったのは「賃貸借トラブルに係る相談対応研究会」なので、「国土交通省が公開している事例集」にした。事例集は「あくまでも例を示すものであり、法的な見解を示すものではない」と断っている。
  - 保証会社: 「入居の条件」→ 事例集の言い方の「契約締結の条件」（賃貸借契約を結ぶ条件）。
  - 東京都の火災保険のFAQ: ページに作った部署の名前がないので、「東京都の消費生活総合センターは」→「東京都の消費生活相談FAQ（東京くらしWEB）は」。
  - 仲介手数料の解説: 「見積書の額は、家賃の1.1倍になります」→「1.1倍になっていることがあります」（免税事業者は、告示の第十一②で計算が違う）。
  - 長期の空き家の特例: 解釈・運用の考え方に書かれている「上限を超えて受け取れるのは、貸主からの報酬に限られる」「入居者を募集している賃貸集合住宅の空き室は、長期の空家等にあたらない」を、文に入れた。
  - クリーニング特約（Q16）: 有効かどうかの3つの点のうち、抜けていた②（通常損耗の分まで負担させる趣旨と範囲が、明記されているか口頭で説明されているか）を足した。
  - 相談先: 法テラスは「オペレーターは個別の法律相談や法的判断を行うことはできません」、利用料は0円で通話料がかかること、IP電話などからの番号（03-6745-5600）を、ページのとおりに書いた。消費者ホットラインは「相談は無料、窓口につながった時点から通話料」を足した。国民生活センターのページは、いまは「消費者トラブル解決ナビ」で窓口を案内しているので、そう書いた。
- **数字は、原文と同じだった**: 0.55倍・1.1倍（告示 第四）、2.2倍（第九）、平成23年3月24日・平成23年7月15日（最高裁判所の判決）、令和5年10月1日（ステマの告示の施行）、188、0570-078374、法テラスの受付（平日9時〜21時、土曜9時〜17時、祝日・年末年始を除く）。

同じ日に、別の担当が、出典をもう一度開いて確かめ直し、次の3つを直しました。

- 更新料の最高裁判所の判決（平成23年7月15日）: 事例集の参考資料「最近の最高裁判例」にある判決の要旨は、「賃貸借契約書に一義的かつ具体的に記載された更新料条項は」と、契約書にはっきり書かれていることを条件にしている。この条件が抜けていたので、根拠の文・`why`・解説ページの文に「賃貸借契約書にはっきりと具体的に書かれた」を足した。
- 鍵の交換費用: 区分の説明（`categories.ts`）と解説ページの説明文に、「破損や紛失がない場合の」が抜けていたので足した（ガイドラインの別表1は、鍵の紛失や不適切な使用による破損の取替えは、借主の負担と判断される場合が多い、としている）。
- 仲介手数料: 告示の第二から第十（0.55倍・1.1倍）は、課税事業者についての決まりで、免税事業者は第十一②と、解釈・運用の考え方の「５ 消費税の免税事業者の仕入れに係る消費税の円滑かつ適正な転嫁について」で計算が違う（上限は、消費税を含んだ倍率で出す額より低い）。見積書からは、相手の会社が免税事業者かどうかわからないので、計算は変えず、項目の `limits` に書いた。

**開けなかった出典が1件あります**: 法務省「2020年4月1日から 賃貸借契約に関する民法のルールが変わります」（`moj-chintai`）。作業した環境からは、法務省のサイト全体が 403（CloudFront の「Request blocked」）で開けませんでした。
この出典は、2026-11-14 の検索での確認の印（`verifiedBy: 'official-site-search'`）のままです。画面のことわり書き（`VERIFY_METHOD_NOTE`）は、「19件のうち1件は、…まだ済んでいません」と出ます。
この出典を付けている文（敷金の定義と返還、通常の使用による傷み）は、同じ文に付けている民法の条文で、原文を確かめてあります。
公開の前に、運営者がこの PDF を開いて確かめ、合っていれば `verifiedBy: 'official-page'` と `verifiedOn` を書いてください（リポジトリの README の「公開前にやること 1」）。

かぎかっこの引用は、その出典を原文で確かめて `verifiedBy: 'official-page'` にしてから、原文と1字ずつ同じに使います（`items.test.ts` が、原文で確かめていない出典の文に「」がないことを確かめています）。
いま、かぎかっこで引いているのは、重要事項説明の様式例の欄の名前（「借賃以外に授受される金額」）だけです。
出典の日付と確かめ方のテストは、値の決め打ちではなく、形と決まり（`findSourceProblems()`）を見ているので、この書きかえでは落ちません。
`RULES_VERIFIED_ON`（画面に出す「ルールの最終確認日」）と、検索で確かめた日（`sources.ts` の中の `SEARCH_VERIFIED_ON`）は、別に持っています。
`RULES_VERIFIED_ON` を直しても、まだ原文で確かめていない出典の「確かめた日」は、変わりません。

確かめられなかったので、ルールに入れていないこと:

| こと | 扱い |
| --- | --- |
| 仲介手数料の計算のもと（借賃）に、管理費・共益費を含めないこと | 告示の本文・解釈・運用の考え方・事例集を開いても、はっきり書かれた記述は見つからなかった。家賃だけで計算し、項目の `limits` に正直に書いた。 |
| 消費税の免税事業者が受け取れる報酬の上限（告示 第十一②） | 見積書からは、相手の会社が免税事業者かどうかわからないので、上限の計算には使っていない。消費税を含んだ倍率（0.55倍、1.1倍）で計算し、項目の `limits` に正直に書いた。 |
| 報酬の告示の「ほかの報酬を受け取れない」という決まり（第十一①） | 2026-11-15 に、現行の告示の本文で、第四と、第十一①（第二から第十までの規定によるほか、報酬を受けることができない。依頼者の依頼による広告の料金は別）を確かめた。ただ、書類作成費などが、仲介会社の報酬にあたるかどうかは、見積書からはわからないので、書類作成費などのルールには使っていない。 |
| 宅地建物取引業法 第35条の、何号にあたるか（家賃以外に受け取るお金の説明） | 法律の条文は、出典に入れていないので、号の番号は書いていない。「重要事項説明の様式例に欄がある」という事実（別添3で確かめた）だけを、参考（`related`）に入れた。 |
| 入居のときの消毒・抗菌、害虫駆除、サポートの会費、消火器、書類作成費について、必須か任意かを決めた公的な決まり | 見つからなかった。`basisStatus: 'none-found'`。 |
| 国土交通省のガイドラインの「消毒（台所、トイレ）」の記載 | ガイドラインの別表1と、東京都のガイドラインにある（貸主の負担とすることが妥当）。ただ、退去のときの原状回復の話で、入居のときの消毒料とは別のものなので、使っていない。 |
| 国民生活センターの「バックアップ相談」（平日10時〜16時、03-3446-0999） | 2026-11-15 に、国民生活センターのページで、いまの名前と番号を確かめた（令和7年12月3日に番号、令和8年4月1日に名前が変わったという注記がある）。188 が話中でつながらないときの窓口なので、相談先には足していない。 |
| 礼金、保証料などの相場の数字 | 国土交通省の事例集に数字はあるが、高い安いの判定に使わないので、入れていない。 |
| 短期解約の違約金、フリーレント、値引き、町内会費、口座振替の手数料についての決まり | 確かめていない。`basisStatus: 'none-found'`。 |

## テスト

```sh
npm test    # src/core/*.test.ts と src/offers.test.ts
```

- `calc.test.ts` … 仲介手数料の上限の境界（ちょうど、1円超え、端数）、日割り（月の日数、うるう年、1日・月末の入居、幅の境界）、0.5か月分の刻みにちょうど合うか。
- `inspect.test.ts` … サンプル、空の見積書、家賃や入居日がない場合、区分ごとの判定、仲介手数料が2行以上ある場合、1か月分と少しだけ違う額、0円の行、重なり、合計への入り方、言い方の検査。
- `items.test.ts` … 項目のデータ（出典の有無、公式サイトの URL、確かめた日と確かめ方のつじつま、かぎかっこの引用、禁句、文面の形、解説ページの数と重なり）。
- `search.test.ts` … 仕様書の例（「抗菌」）、全角・半角・カタカナ・ひらがな、すべての別の呼び方、「日割」「当月」の入った言葉。
- `message.test.ts` … 名前と物件名の差し込み、行の順、法律の言葉を出さないこと、名前の中の改行。
- `storage.test.ts` … 書き出しと読み込み、合わないファイルを断る理由、名前の中の改行、壊れた保存領域、保存できないブラウザ。

テストは、「いまの値」ではなく、「形と決まり」を確かめる（出典の日付、広告の枠が空かどうか、解説ページの数の上の限りは、決め打ちにしない）。
運営者が README の手順どおりに、出典を確かめ直したり、広告を入れたり、解説ページを足したりしても、落ちないようにするため。
- `estimate.test.ts` … 行を足す・書き換える・消す・動かす、サンプル、相談先。
