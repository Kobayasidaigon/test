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

## 出典の確かめ方（2026-11-14）と、確かめられなかったこと

作業した環境からは、官公庁のサイトを直接開けませんでした（`WebFetch` は名前解決に失敗、`curl` は通信の制限で 403）。
そのため、**検索の対象を公式サイトのドメインに絞り**（`mlit.go.jp`、`moj.go.jp`、`e-gov.go.jp`、`caa.go.jp`、`kokusen.go.jp`、
`metro.tokyo.lg.jp`、`pref.saitama.lg.jp`、`houterasu.or.jp`）、検索結果に出た公式ページの本文の抜粋で、該当する記述を確かめました。
`sources.ts` の `verifiedBy: 'official-site-search'` は、この確かめ方を表します。

同じ日に、点検の担当（④）が、根拠と参考の文を1つずつ、もう一度、別の検索で確かめ直しました。その結果:

- 「礼金は、退去のときに返ってきません」… 出典にしていた「賃貸住宅の入居・退去に係る留意点」では確かめられなかった。事例集の分類（「後日、借主に返還しないもの（礼金、権利金等）」）で確かめられたので、文と出典を、そちらに変えた。
- 「払った更新料は、返ってきません」… 公式の資料で確かめられなかったので、根拠と解説ページから消した。
- そのほかの文は、2回目の検索でも、同じ記述が公式ページの抜粋に出ることを確かめた。

仕上げの直し（⑤。2026-11-15）でも、官公庁のサイトは開けませんでした。そのため、原文の言い回しを**かぎかっこで引いていた文**
（鍵の交換費用の国土交通省・東京都のガイドライン、礼金の2つの文、重要事項説明書の様式の欄の名前）を、「〜という趣旨の記載があります」
という言いかえに直しました。検索の抜粋だけで、1字ずつの引用をすると、言い回しが違ったときに、引用としてまちがいになるためです。
かぎかっこの引用は、その出典を原文で確かめて `verifiedBy: 'official-page'` にしてから使います（`items.test.ts` が確かめています）。

**それでも、原文のページを開いて読んだわけではありません。** 画面には、そのことを正直に出しています（`VERIFY_METHOD_NOTE`、`verifiedLabel`）。
**公開の前に、運営者が、`sources.ts` の URL を1つずつ開いて、`items.ts` の `basis` と `related` の文が合っているかを、もう一度確かめてください。**
確かめた資料は、`verifiedBy: 'official-page'` に変え、`verifiedOn` に確かめた日を書きます（リポジトリの README の「公開前にやること 1」）。
出典の日付と確かめ方のテストは、値の決め打ちではなく、形と決まり（`findSourceProblems()`）を見ているので、この書きかえでは落ちません。
`RULES_VERIFIED_ON`（画面に出す「ルールの最終確認日」）と、検索で確かめた日（`sources.ts` の中の `SEARCH_VERIFIED_ON`）は、別に持っています。
`RULES_VERIFIED_ON` を直しても、まだ原文で確かめていない出典の「確かめた日」は、変わりません。

確かめられなかったので、ルールに入れていないこと:

| こと | 扱い |
| --- | --- |
| 仲介手数料の計算のもと（借賃）に、管理費・共益費を含めないこと | 公式の資料に、はっきり書かれた記述を確かめられなかった。家賃だけで計算し、項目の `limits` に正直に書いた。 |
| 報酬の告示の現行の本文そのもの（第四の原文、ほかの報酬を受け取れないという決まり） | 国土交通省の消費者向けのページと「解釈・運用の考え方」の抜粋では確かめたが、現行の告示の本文は開けなかった。「告示のほかの報酬を受け取れない」という決まりは、書類作成費などのルールに使っていない。 |
| 宅地建物取引業法 第35条の、何号にあたるか（家賃以外に受け取るお金の説明） | 号の番号を確かめられなかった。「重要事項説明書の様式に欄がある」という事実だけを、参考（`related`）に入れた。 |
| 入居のときの消毒・抗菌、害虫駆除、サポートの会費、消火器、書類作成費について、必須か任意かを決めた公的な決まり | 見つからなかった。`basisStatus: 'none-found'`。 |
| 国土交通省のガイドラインの「消毒（台所、トイレ）」の記載 | 東京都のガイドラインの抜粋で見たが、退去のときの原状回復の話で、入居のときの消毒料とは別のものなので、使っていない。 |
| 国民生活センターの平日の相談窓口（電話番号） | 2025年12月に番号、2026年4月に名前が変わったという注記があり、いまの名前を確かめられなかった。相談先に入れていない。 |
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
