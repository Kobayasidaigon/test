# src/core — たたき台シフトの中身のロジック

画面（React）に依存しない、純粋な TypeScript です。画面からは `@/core`（`index.ts`）から読み込みます。

```ts
import { makeSample, startSolve, checkPlan, summarize, loadPlan, savePlan } from '@/core'
```

`browser.ts`（ファイルの保存と読み込み）と `client.ts`（Web Worker）だけは、ブラウザの機能を使います。
ほかは、静的HTMLに書き出すページ（`ssr: true`）で描くときに呼んでも安全です（`window` や `localStorage` に触りません）。

## ファイルの地図

| ファイル | 役割 |
| --- | --- |
| `types.ts` | データの型。保存するのは `ShiftPlan` 1つ |
| `dates.ts` | 日付の計算（月の日数、曜日、来月、時刻の読み取り、文にする） |
| `holidays.ts` | 日本の祝日を、決まりから計算する。出典は `HOLIDAY_SOURCES` |
| `holidays.official.ts` | 公表されている祝日の一覧（2025〜2027年）。計算と照らし合わせるためのデータ |
| `calendar.ts` | `buildCalendar(plan)` … 日ごとの情報（曜日、祝日、開ける日か、必要な人数） |
| `schedule.ts` | シフト表の読み書き（マスを見る、書く、固定する、固定を外す） |
| `edit.ts` | plan を書き換える関数（消す・月を変える、のように後始末が要るもの）。ひな形 `SHIFT_PRESETS`、`blankPlan` |
| `check.ts` | **点検**。違反と、足りないところを調べる。自動作成とは別に書いてある |
| `solver.ts` | **自動作成**。`solve(plan, { seed })` |
| `explain.ts` | 組めない理由の説明 `explainShortages`、条件をゆるめる提案 `suggestRelaxations`、マスの選択肢 `cellOptions` |
| `precheck.ts` | 組む前の下見（スタッフがいない、全員入っても足りない、など） |
| `stats.ts` | 集計（スタッフごと、日ごとの過不足） |
| `paste.ts` | Excel からの貼り付けで、希望を読み取る |
| `csv.ts` | CSV の書き出し（有料版） |
| `carry.ts` | 翌月への引き継ぎ（有料版） |
| `gate.ts` | 無料版・有料版で、できることを分ける `featureGate(plan, isPro)` |
| `storage.ts` | 保存の形式（版つき）、読み込むときの検査、保存領域、ファイルの書き出し |
| `samples.ts` | サンプル（美容室・飲食店・薬局） |
| `browser.ts` | `downloadText`、`readFileText`（ここだけ DOM を使う） |
| `client.ts` / `solver.worker.ts` | Web Worker で自動作成を回す `startSolve` |
| `testkit.ts` | テスト用の plan を作る道具（画面からは使わない） |

## データの形（`ShiftPlan`）

1つの店の、1か月ぶんです。日は「その月の何日か」（1〜31）で持ちます。

```ts
type ShiftPlan = {
  storeName: string
  year: number; month: number                       // 2022〜2099年、1〜12月
  closed: { weekdays: Weekday[]; days: number[] }   // 定休日（曜日と、個別の日）
  holidayMode: 'sunday' | 'weekday' | 'closed'      // 祝日の人数: 日曜と同じ / その曜日のまま / 休みにする
  shiftTypes: ShiftType[]                           // 勤務の種類（名前、記号、開始・終了、休憩の分、色の名前）
  tags: Tag[]                                       // 役割の札
  staff: Staff[]                                    // 名前、札、固定の休みの曜日、入れない勤務、月の日数の下限・上限
  needs: {
    weekly: Record<勤務の種類のid, number[7]>          // 曜日ごとの必要人数（日〜土）
    overrides: Record<日, Record<勤務の種類のid, number>> // 特定の日だけの上書き
    roleMins: RoleMin[]                             // 役割ごとの最低人数
  }
  wishes: Record<スタッフのid, Record<日, Wish>>      // { kind: 'off' } か { kind: 'shift', shiftId }
  rules: Rules                                      // 連勤の上限、続けて入れない組み合わせ、週1日の休み、公平さ
  schedule: Schedule                                // 表。work（入っている勤務）と locked（手で固定したマス）と seed
  carry: Carry | null                               // 前の月の終わりの勤務（翌月への引き継ぎで入る）
}
```

- 色は `#rrggbb` ではなく名前（`'tomato' | 'egg' | 'teal' | 'sky' | 'plum' | 'leaf' | 'orange' | 'gray'`）で持ちます。
  実際の色は、画面の側（`src/index.css`）で「地の色」と「文字の色」を組で決めてください（コントラストを保つため）。
  日本語の名前は `SHIFT_COLOR_LABELS`。
- 表の休みのマスは、`work` に何も入っていないマスです。固定は `locked[スタッフのid] = [日, …]`。休みのマスも固定できます。
- 入力の上限は `LIMITS`（スタッフ100人、勤務の種類8つ、記号2文字、など）。

### 日ごとの決まりの強さ（`buildCalendar`）

1. 個別の定休日（`closed.days`）… いちばん強い。必ず休み
2. 日ごとの上書き（`needs.overrides`）… 定休日の曜日や祝日でも、書いてあれば**開ける日**になる（臨時の営業）
3. 定休日の曜日（`closed.weekdays`）
4. 祝日（`holidayMode`）
5. 曜日ごとの必要人数（`needs.weekly`）

## 使い方の例

### はじめて開いたとき

```ts
const next = nextMonthOf(localToday())              // 来月
const sample = makeSample('salon', next.year, next.month)   // 'salon' | 'restaurant' | 'pharmacy'。一覧は SAMPLES
const blank = blankPlan(next.year, next.month, 'early-late') // ひな形は SHIFT_PRESETS（3種類）
```

### plan を書き換える（`edit.ts`。どれも新しい plan を返す）

```ts
addStaff(plan, '名前') / updateStaff(plan, id, { maxDays: 15 }) / removeStaff(plan, id)
setCanWork(staff, weekday, shiftId, false)      // その曜日のその勤務に入れない。canWork(staff, weekday, shiftId) で読む
addShiftType(plan, { name, symbol }) / updateShiftType(plan, id, patch) / removeShiftType(plan, id) / applyShiftPreset(plan, presetId)
addTag(plan, '鍵を持っている') / removeTag(plan, id)
setWeeklyNeed(plan, shiftId, weekday, 2) / setDayNeed(plan, day, shiftId, 3 | null) / setRoleMin(plan, shiftId, tagId, 1)
updateRules(plan, { maxConsecutive: 6 }) / addForbiddenPair(plan, 'sh2', 'sh1') / removeForbiddenPair(plan, id)
setWish(plan, staffId, day, { kind: 'off' } | null) / cycleWish(plan, staffId, day)   // 押すたびに、なし→休み希望→勤務…と回る
toggleClosedDay(plan, day) / setMonth(plan, year, month)   // 月を変えると、日付にひもづくものが消える。hasMonthData(plan) で先に確かめる
```

### 保存と読み込み（`useEffect` の中で）

```ts
const r = loadPlan(localStorage)   // { status: 'empty' | 'ok' | 'broken' | 'unavailable', … }
if (r.status === 'ok') setPlan(r.plan)
if (r.status === 'broken') show(r.reason)   // r.raw に、壊れていた文字が入っている（取り出せるようにできる）
// 理由の文は、保存領域の話として言う（「保存されていた内容が…」）。ファイルの話（「ファイルを選んでください」）にはならない
savePlan(localStorage, plan)       // 書けたら true

// ファイル
const file = buildExportFile(plan)
downloadText(file.filename, file.text, file.mime)
const read = await readFileText(inputFile)          // 大きすぎるファイルは断る
const parsed = read.ok ? parsePlanText(read.text) : read
if (parsed.ok) setPlan(parsed.plan); else show(parsed.reason)   // 理由は、そのまま画面に出せる文
```

### 自動作成（Web Worker）

```ts
const handle = startSolve(plan, {
  seed: nextSeed(plan.schedule.seed),          // 「別の案を作る」は、種を変えるだけ
  onProgress: (p) => setProgress(p),           // { phase: 'greedy' | 'improve' | 'finish', ratio: 0〜1 }
  onResult: (result) => {                      // 表ができた
    setPlan({ ...plan, schedule: result.schedule })
    setReport(result.check)                    // 点検結果。result.check.summary は、そのまま出せる文（調子つきは summaryItems）
  },
  onSuggestions: (s) => setSuggestions(s),     // 足りないところがあるときだけ、後から届く。なければ null
  onError: (message) => show(message),
})
handle.cancel()                                // やめる（画面を離れるとき、もう一度押されたとき）
```

- `plan.schedule.locked` のマスは残り、ほかのマスが作り直されます（「残りを組み直す」）。
  固定も捨てて組み直すなら、`{ ...plan, schedule: unlockAll(plan.schedule) }` をわたします。
- Worker を使えない環境では、同じ計算を画面の側で行います（結果は同じ）。
- 小さいサンプルなら、`solve(plan, { seed })` を直接呼んでもかまいません（7人 × 31日で 0.2 秒ほど）。

### 表を手で直す

```ts
const options = cellOptions(plan, plan.schedule, staffId, day)   // 休み + 勤務の種類。条件に当たるものには notes が付く
const schedule = setCell(plan.schedule, staffId, day, shiftId)   // null なら休み。押して変えたマスは固定になる
const report = checkPlan({ ...plan, schedule })                  // 直すたびに点検し直す（速い）
report.summaryItems                                              // まとめの文に、調子（'ok' | 'bad' | 'note'）を付けたもの。画面で印と色を出し分ける
const marks = violationsByCell(report)                           // キーは `${staffId}:${day}`、値は違反の文
```

### 組めないときの説明と提案

```ts
const explanations = explainShortages(plan)   // 足りないマスごと。text は、そのまま出せる文
// 例: 「12月17日（木）の早番: 「キッチン」の人が、必要1人に対して0人です。入れない理由: 休み希望1人、同じ日の別の勤務に入っている人1人、連勤の上限1人。」

// 提案は startSolve の onSuggestions に届く（直接呼ぶなら suggestRelaxations(plan)）
for (const s of suggestions.suggestions) {
  s.text   // 「連勤の上限を6日にすると、足りないところがすべて埋まります。」
  s.plan   // 条件を変えて、実際に組み直した結果。採用するときは setPlan(s.plan)
}
suggestions.text       // まとめの文（効き目のある提案がないときは、その理由）
suggestions.noEffect   // 試したが、減らなかったもの
```

### 集計、下見、プランの制限

```ts
const sum = summarize(plan)        // sum.staff[i]: 勤務日数、休み、土日祝、勤務の種類ごと、分。sum.days[i]: 過不足
formatMinutes(sum.staff[0].minutes) // 「144時間」
const pre = precheck(plan)         // blockers（組めない）と warnings（先に知らせること。同じ名前・空の名前のスタッフも、ここで知らせる）
const gate = featureGate(plan, isPro)  // canAddStaff / canSolve / canCsv / canCarryOver / message
```

### 希望の貼り付け

```ts
const preview = parseWishPaste(text, plan)     // rows、notes（どう読んだか）、problems（気をつけること）、offCount
// 同じ名前のスタッフが2人以上いる行は、staffId が null になる（どちらかに勝手に入れない）。画面で選んでもらい、assign にわたす
// 画面で preview を見せてから
setPlan(applyWishPaste(plan, preview, { mode: 'merge' }))   // 'replace' なら、出てきた人の希望を入れかえる
```

### CSV、翌月への引き継ぎ（有料版）

```ts
downloadText(csvFileName(plan), toCsv(plan), 'text/csv')
setPlan(carryToNextMonth(plan))    // 先にファイルへ書き出すよう、画面ですすめること（いまの月の表は消える）
```

## 設計で決めたこと（なぜそうしたか）

### 点検と自動作成を、別べつに書いた

`check.ts` は `solver.ts` の関数を1つも使っていません。自動作成の計算にまちがいがあっても、点検で見つけられるようにするためです。
テストでは、でたらめに作った 120 通りの店（1〜30人）で自動作成を回し、点検の関数で「必ず守る条件の違反が0件」を確かめています。

### 必ず守る条件と、なるべく満たす条件

- **必ず守る**（置く前に確かめる。守れない置き方はしない）: 休み希望、固定の休み、入れない曜日・勤務、定休日、連勤の上限、続けて入れない組み合わせ、月の勤務日数の上限、手で固定したマス。
- **なるべく満たす**（点数にして足す。`WEIGHTS`）: 人数の不足 1000 ＞ 役割の不足 700 ＞ 日数の下限 300 ＞ 人の余り 150・休みのない週 150 ＞ 入りたい希望 100 ＞ 公平さ。
  人数の不足1人ぶんは、1人を置くことで増えうるほかの点数の合計より大きいので、公平さや希望のために不足をわざと残すことはありません。
- 手で固定したマスが条件に合っていなくても、固定は残します（店長の判断を消さない）。点検が違反として知らせます。

### 人数は「必要な人数」＝ 下限としてあつかう

- 月の勤務日数の下限を決めた人がいて、必要な人数だけでは下限に届かないときは、必要な人数より多く入れます（「余り」として集計に出ます）。
  下限を決めていなければ、必要な人数より多くは入れません。
- 必要な人数が0人の勤務には、自動では入れません（手では入れられます）。

### 同じ入力・同じ種なら、同じ結果

- 乱数は種から作ります（`makeRng`。整数の計算だけ）。`Math.random` は使いません。
- 時間で打ち切らず、回数で打ち切ります（表の大きさで決まる。20人 × 31日 までは 60万回、30人で 90万回）。
- 受け入れの判定に `Math.exp` を使いません（ブラウザによって最後の桁が違うことがあるため、四則演算だけ）。

### 組めないときの提案は、組み直した結果そのものを持つ

「連勤の上限を6日にすると埋まります」と言うときは、実際にその条件で組み直し、点検して、不足が減ったものだけを出します。
提案には、組み直した plan（`Suggestion.plan`）を付けてあります。画面はそれをそのまま採用するので、「言ったとおりにならない」ことが起きません。
条件を変えなくても別の種で減らせたときは、それも提案として出し、条件をゆるめる提案はそれより良いものだけにしています
（たまたま良い案に当たっただけなのに、「この条件のせい」と言ってしまわないため）。

試すのは、次のものです: 別の種で組み直す（2回）、連勤の上限を1日・2日ふやす、続けて入れない組み合わせを1つずつやめる（4つまで）、
上限に届いた人の勤務日数の上限を1日・2日ふやす、手で固定したマスをすべて外す。
休み希望・固定の休み・入れない勤務は、ゆるめる提案をしません（人の事情なので、道具がすすめることではない）。

### 祝日

`holidays.ts` が、法律の決まり（日付の決まった祝日、月曜に動く祝日、春分・秋分、振替休日、国民の休日）から計算します。
春分の日と秋分の日は、正式には前の年の2月に発表されるので、発表済みの年（`EQUINOX_ANNOUNCED_THROUGH` = 2027）より先は「見込み」です
（`Holiday.provisional`、`holidayNotice(year)`）。あつかう年は 2022〜2099年です（2020・2021年は特例で祝日が動いたため、あつかいません）。
祝日は、必要な人数の初期設定に使うだけで、日ごとの上書きと個別の定休日で、どの日も変えられます。

### 保存の検査は、直さずに断る

読み込むときは、中身を1つずつ確かめ、確かめた値だけで plan を作り直します（知らない項目は捨てる）。
合わないところがあれば、どこが合わないかを言って断ります。勝手に直すと、利用者の知らないうちに条件の変わった表ができてしまうためです。
そのため、**消す・月を変える操作は `edit.ts` の関数を使ってください**（消したものを指す行が残ると、次の読み込みで断られます）。

### 無料版で人数が上限をこえた plan

有料版で作ったファイルを無料版で読み込んだときなどです。見る・手で直す・印刷する・ファイルに保存する、はそのままできます。
止めるのは、自動作成と、人を足すことだけです（読み込んだデータを人質にしないため）。`featureGate` の `message` に説明の文が入ります。

## できないこと・気をつけること

- 勤務の種類どうしの「時間の重なり」は見ていません。たとえば「1日」の人は「午前」の人数には数えません。
  役割の最低人数も、勤務の種類ごとです。
- 公平さは「回数」でそろえます（勤務時間の長さではそろえません）。上限・下限を決めていない人どうしは、勤務日数がだいたい同じになります。
  パートの人は、月の勤務日数の上限を入れてもらう前提です。
- スタッフの入れる・入れないは、曜日で決めます（祝日だから入れる・入れない、は決められません。日ごとには、休み希望か、表の固定で）。
- 自動作成は、いちばん良い表を保証するものではありません（入れ替えをたくさん試す方法のため）。
  「本当は埋まるのに1人足りない」案で止まることが、まれにあります。そのため、提案の最初に「別の案で組み直す」を試しています。
- 祝日は、新しく決まった祝日や、その年だけの休日を知りません。

## テスト

```sh
npm test           # src/core/*.test.ts（vitest）
```

仕様書の「テストで確かめる」に当たるもの:

- 祝日が、公表されている一覧（2025〜2027年）と一致する … `holidays.test.ts`
- 自動作成の結果が、必ず守る条件を1つも破らない（別に書いた点検の関数で） … `solver.test.ts`
- 同じ入力なら同じ結果 … `solver.test.ts`
- 20人 × 31日で3秒以内 … `solver.test.ts`
- 提案は、実際に組み直して確かめたものだけ … `explain.test.ts`
