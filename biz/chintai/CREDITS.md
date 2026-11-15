# みつもり点検で使った 21st.dev の部品

どれも、そのまま貼らずに、このサービスの世界観（白い見積書の紙、青みのある灰色の机、黒いインク、赤ペンの赤、蛍光ペンの黄色。角はほとんど丸めない。影は、机に置いた紙の影だけ）に合わせて作り変えています。見本の文・数字・人物の写真は、ひとつも残していません。ライセンスの表示が付いていた部品は1つ（Feature Tab Switcher。MIT）で、表示をファイルの先頭に残しています。

## 道具の画面（`/app`）と、土台の部品

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Steps | adit-firdaus | https://21st.dev/@adit-firdaus/components/steps | `src/components/ui/steps.tsx`（道具の上の、3つの手順「見積書を入れる／点検の結果／確認の文面」） | 手順の状態（すんだ／いま／これから）を current から決める考え方、`<ol>` と `aria-current="step"` の組み立て、状態を言葉でも伝える（色だけにしない）ところを残した。丸い番号とつなぐ線をやめて、紙のファイルの「見出しの耳（インデックス）」にした（いまの手順の耳は、紙とつながる白。ほかは机の色に沈める）。もとは「先の手順は押せない」決まりだったが、行き来して使う道具なので、どの手順も押せるようにした。耳の右に、小さなしるし（確かめる項目の数。赤ペンの字）を置けるようにした。もとの部品が使っていた専用の CSS と、すべるしるしのフック、react-icons は使っていない。 |
| Segmented Control | ddoemonn | https://21st.dev/@ddoemonn/components/segmented-control | `src/components/ui/segmented-control.tsx`（確認の文面の「メール用／LINE用」の切り替え） | ラジオグループのふるまい（矢印キー・Home・End、選んだものだけ Tab で止まる）と、選んだしるしの下だけ文字の色が反転する仕組み（しるしの中に、もう1組の文字を逆向きに動かして重ねる）を残した。motion のばねの動きを、CSS の transition に置きかえた（道具の画面が読み込むプログラムを軽くするため。gzip で約 40kB 減った）。見た目を、書類の「どちらかを選ぶ欄」（四角い枠、黒いインクのしるし）にし、高さを 44px にした。 |
| File Dropzone | joyco | https://21st.dev/@joyco/components/file-dropzone | `src/components/ui/file-dropzone.tsx`（「ファイルを読み込む」の画面の、ファイルの読み込み口） | 破線の枠に落とす／ボタンで選ぶ、の2つの選び方、落とす前に枠の色が変わること、断った理由を `role="alert"` で枠の下に出すことを残した。画像のプレビュー、複数のファイル、送信の進み具合は取った（1つの JSON を読むだけ）。中身の検査は呼ぶ側（`core` の `parseSavedText`）に任せ、断る理由の文を外から受け取って出す形にした。同じファイルを続けて選び直せるようにした。 |
| Combobox | halaska-studio | https://21st.dev/@halaska-studio/components/combobox | `src/components/ui/combobox.tsx`（「項目を足す」の、見積書の言葉から探す欄。行の種類を変える画面の、言葉で探す欄） | 入力欄にフォーカスを置いたまま `aria-activedescendant` で候補を指す作り、↓↑で動かす・Enter で決める・Esc で閉じる、マウスを乗せると指す候補が動く、外側を押すと閉じる、を残した（依存ライブラリなし）。もとは「ボタンを押すと開く箱の中に、絞り込みの欄がある」形だったが、欄そのものをいつも見せて、打つと下に候補が出る形にした。候補を探すのは `core` の `searchItems`（全角・半角、カタカナ・ひらがなをそろえて探す）。候補のいちばん下に「この名前のまま、一覧にない項目として足す」を置けるようにし、見つかった数を読み上げで伝え、日本語の変換を決める Enter では選ばないようにした。候補が画面の下にはみ出すときは、欄を上へ動かす。デザイン用のトークン、すりガラス、紫のアクセントは使っていない。 |
| Toast | shugar | https://21st.dev/@shugar/components/toast | `src/components/ui/toast.tsx`（行を消した、サンプルを入れた、ファイルを読み込んだ・書き出した、全部消した、のお知らせ。「元に戻す」つき） | 画面の外の小さな入れ物（store）に、どこからでもお知らせを足せる作り、数秒で消えること、マウスを乗せているあいだは消えないこと、「元に戻す」をお知らせの中に置けることを残した。`createRoot` で body に別の React を作るのをやめて、ページの中に `<Toaster />` を置く形にした。重なって縮む見せ方をやめて、下から積むだけ（最大3つ）。「元に戻す」は、絵だけのボタンではなく文字のボタンにし、キーボードのフォーカスでも消えるまでの時間が止まるようにした。見た目を、机の上の付せん（蛍光ペンの黄色）に。エラーは、赤ペンの線の付いた白い紙。`role="status"`／`role="alert"` で読み上げに伝える。 |
| Alert Dialog | shadcn | https://21st.dev/@shadcn/components/alert-dialog | `src/components/ui/alert-dialog.tsx`（「サンプルに置きかえる」「全部消す」の前の、確かめの画面） | Radix の Alert Dialog の組み立ては、そのまま（外側を押しても閉じない、はじめのフォーカスは「やめる」）。見た目を、机の上にもう1枚置いた紙にした（白い紙、角を丸めない、紙の影）。スマホでは、下から出る紙にして、親指が届くところにボタンが来るようにした。閉じたときに、開いたボタンへフォーカスを戻す処理を足した（Trigger を使わずに state で開け閉めしているため）。 |
| Dialog | shadcn | https://21st.dev/@shadcn/components/dialog | `src/components/ui/dialog.tsx`（「ファイルを読み込む」の画面、行の「種類を変える」画面） | 上と同じ。閉じるボタンを 44px にし、読み上げの名前を「閉じる」にした。中身が長いときは、紙の中だけがスクロールする。印刷には出さない。 |
| Empty | cnippet-dev | https://21st.dev/@cnippet-dev/components/cnippet-empty | `src/components/ui/empty.tsx`（見積書の項目がまだないとき、結果と文面に出すものがないとき、文面に入れる項目を選んでいないとき） | 組み立て（Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent）は、もとのまま。重ねたアイコンの飾りをやめ、紙の上の「記入欄の空き」（破線の枠）にした。絵は、自分で描いた SVG（何も書かれていない見積書と、赤ペン）。 |
| Accordion | ddoemonn | https://21st.dev/@ddoemonn/components/accordion | `src/components/ui/disclosure.tsx`（点検の結果の、1行ごとの「理由と根拠を見る」） | `useAccordion`（開いている欄の管理、見出しのボタンに付ける属性、↓↑・Home・End で見出しの間を動く）と、閉じた中身に `inert` を付けることを残した。高さを測って動かす仕組み（motion と ResizeObserver）をやめて、CSS の grid（0fr → 1fr）で開く形にした。印刷のときに、CSS だけで「確かめる項目の欄は、閉じていても開いて出す」ことができるようにするため。いくつでも同時に開ける形にし、「全部開く／全部閉じる」「1つだけ開く」を足した。中身の高さの上限と、中でのスクロールは取った（根拠の文は、全部見えたほうがよい）。見出しと中身の見た目は、使う側（`finding-card.tsx`）が決める。 |
| Copy Button | ddoemonn | https://21st.dev/@ddoemonn/components/copy-button | `src/components/ui/copy-button.tsx`（確認の文面の「本文をコピーする」「件名をコピーする」） | `useCopyToClipboard`（`navigator.clipboard` が使えないブラウザでは、見えない入力欄と `execCommand` でコピーする）、「コピーする → コピーしました → 数秒で戻る」の状態、失敗のときの表示、読み上げへの通知、文字が切りかわっても幅が変わらない作りを残した。motion の動きをやめて CSS だけにし、見た目をサイト共通のボタンにそろえた。チェックの印は、手描きの赤ペンの線が描かれる動きにした。 |
| Input | originui | https://21st.dev/@originui/components/input | `src/components/ui/input.tsx`（家賃・管理費・入居する日・行の名前・金額・名前・物件名の入力欄） | 見積書の記入欄らしく、角を丸めず、下の線を濃くした。高さ 44px、文字 16px（iPhone で、入力のたびに画面が拡大されないように）。もとの「右に単位を置く」例をもとに、単位つきの入力欄（`InputWithUnit`。「円」）を作った。まちがった値のときは、赤ペンの色の枠にする（`aria-invalid`）。 |
| Checkbox | originui | https://21st.dev/@originui/components/checkbox | `src/components/ui/checkbox.tsx`（「確認の文面に入れる」のチェック、文面に入れる項目の一覧） | Radix の Checkbox の組み立てはそのまま。点検票のチェック欄らしく、四角い枠に、赤ペンの手描きのチェックが、枠から少しはみ出して入るようにした。押せる範囲を、見た目より広げて 44px にした。 |
| Invoice Line Items Table（shadcn の Table） | olewandowski1 | https://21st.dev/@olewandowski1/components/table-3 | `src/components/ui/table.tsx`（点検の結果の「区分ごとの小計」） | 表の部品（Table / TableHeader / TableBody / TableRow / TableHead / TableCell …）を取り入れた。見本の請求書の中身（会社名、金額、税率）は、すべて捨てた。罫線をはっきり引き、見出しの下と合計の下を濃い線にした。行に乗せたときの色の変化は取った（紙なので）。表が広いときは、表の中だけを横スクロールにする。 |
| Button | shadcn | （単独では取っていない。上の Alert Dialog・Dialog・File Dropzone が、一緒に配っている部品） | `src/components/ui/button.tsx`（すべてのボタン） | 土台に入っていたもの（21st.dev の部品が一緒に配る、shadcn の Button と同じコード）。いちばん大事なボタンは、黒いインクのベタにした（赤は「赤ペンの書き込み」だけに使うので、ボタンには使わない）。消す操作は、赤ペンの色の文字と枠（ベタにはしない）。高さを 44px 以上にし、`type="button"` をはじめの値にした。 |

## LP（`/`）と、その他のページ

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Centered Nav Header | olewandowski1 | https://21st.dev/@olewandowski1/components/centered-nav-header | `src/components/site/site-header.tsx`（LP と、その他のページの、上の帯） | 左に印、真ん中に行き先、右にいちばん大事なボタン、という3つの並びと、せまい画面では行き先をメニューのボタンにしまうことを残した。見本の「Sign In」と区切り線は取った（会員登録がない）。右のボタンは、道具を開く「見積書を点検する」の1つだけ。せまい画面のメニューは、横から出る別の画面（Radix の Sheet）をやめて、帯のすぐ下に開く1枚の紙にした（ページの中の行き先 `#faq` などを、ふつうのリンクとして動かすため。Esc・外を押す・行き先を押す、で閉じる）。帯は机の色のベタで、すりガラスにはしていない。Remix Icon は使わず、土台に入っている lucide の絵にした。 |
| Hero with Dashboard Mockup | felipemenezes098 | https://21st.dev/@felipemenezes098/components/hero-02 | `src/components/landing/hero.tsx`（LP の一番上） | 左寄せの見出し・説明・ボタン1つ、という静かな組み立てと、「絵は、製品そのものを置く」という考え方を残した。写真の背景の上に浮かべた見本のダッシュボード（うその数字のグラフ）は捨てて、本物の部品（`InspectedSheet`）に、サンプルの見積書を本物のロジックで点検した結果を渡して置いた。見出しの下に絵を置く縦の並びを、広い画面では横の並びにした（開いてすぐ、赤ペンの入る行が見えるように）。出てくるときのぼかしと動き（motion）、行を整えるライブラリ（react-wrap-balancer）、セリフ体の見出しは使っていない。動くのは、行が画面に入ったときに赤ペンが入る、その1つだけ。 |
| Feature Tab Switcher（Hirael の Feature 11。MIT License、Mohammad Shehadeh） | mohammadshehadeh | https://21st.dev/@mohammadshehadeh/components/feature-11 | `src/components/landing/categories.tsx`（LP の「何がわかるか」。区分を選ぶと、その区分の行の点検が出る） | 左に縦に並んだ見出し（題と、ひとことの説明）、右にその中身、という並びと、タブとしてのふるまい（矢印キーで見出しを動かすと中身もついてくる、選んだ見出しだけ Tab で止まる）を残した。見本の中身（共有の受信箱の例、人の頭文字の丸）は、すべて捨てた。右に出すのは、本物の判定ロジックが出した、その区分の行の点検の結果（理由、確かめること、聞き方、根拠と出典）。見出しは、紙のファイルの「見出しの耳」にして（道具の手順の耳と同じ考え方）、選んだ耳が右の紙とつながるようにした。アイコンのかわりに、区分の印（赤ペンの丸の中の1文字）。Radix の Tabs は入れず、ふるまいを自分で書いた。せまい画面では、見出しを2列に並べ、「理由と根拠」をはじめは閉じておく。MIT の著作権表示は、ファイルの先頭に残した。 |
| How It Works Steps | ln-dev7 | https://21st.dev/@ln-dev7/components/how-it-works-09 | `src/components/landing/how-it-works.tsx`（LP の「使い方」） | 番号と、番号をつなぐ1本の線、その下に題と短い説明、アイコンを使わず文字で見せる、という組み立てを残した。丸い番号を、道具の画面と同じ黒い四角の番号にし、真ん中寄せを左寄せにした。見本の文（「135 production sections」など）、上の小さな英語のラベル、下の丸いボタンは取った。手順ごとに、道具の本物の部品を小さく置いた（1 は、その場で打てる項目さがし。2 と 3 は、サンプルの見積書を本物のロジックに通した結果）。 |
| Minimal Footer | efferd | https://21st.dev/@efferd/components/minimal-footer | `src/components/site/site-footer.tsx`（LP と、その他のページの、いちばん下） | 左に印とひとことの説明、右にリンクの列、いちばん下に細い線と小さな文、という組み立てを残した。見本の会社の説明、SNS のアイコンの列、「All rights reserved」は取った（このサイトに SNS はない）。ぼんやり光る背景（radial-gradient）と等幅の書体をやめ、机の上の濃い罫線だけにした。リンクの列は、項目ごとの解説（データから作る）と、このサイトのページ。いちばん下に、法律の助言ではないことと、ルールの最終確認日を書いた。 |

LP とその他のページでは、道具の画面のために取り入れた部品も、そのまま使っています。

- Accordion（ddoemonn。`ui/disclosure.tsx`）… LP の「よくある質問」（`landing/faq.tsx`）と、「何がわかるか」の「理由と根拠を見る」。
- Segmented Control（ddoemonn。`ui/segmented-control.tsx`）… LP の「文面の見本」の、メール用／LINE用の切り替え。
- Input（originui。`ui/input.tsx`）… LP の「使い方」の項目さがしと、仲介手数料の解説ページの小さな点検（`guide/brokerage-try.tsx`）。
- Button（shadcn。`ui/button.tsx`）… すべてのボタン。

## 21st.dev の部品ではないもの（自分で作ったもの）

- `src/components/pen.tsx` … 赤ペンの丸・二重丸・下線・チェック・矢印・区分の印・日付のはんこ。自分で描いた SVG（少しゆがんだ手描きの線）。
- `src/components/sheet.tsx`、`inspected-sheet.tsx`、`finding-card.tsx`、`category-mark.tsx`、`source-link.tsx`、`consult-desks.tsx`、`message-preview.tsx`、`offer-slot.tsx`、`brand.tsx` … 紙、赤ペンが入った見積書、1行ごとの結果、区分の印、出典、相談先、便せん、広告の枠、サイトの印。
- `src/components/tool/` … 道具の画面の組み立て（手順1〜3、金額の入力欄、項目を選ぶ部品、ファイルの書き出しと読み込み、保存）。
- `src/components/landing/` のうち、`section.tsx`（欄の見出し）、`message-sample.tsx`（文面の見本）、`not-doing.tsx`（しないこと）、`sources.tsx`（資料の一覧）、`guides.tsx`（解説への入口）、`operation.tsx`（運営）、`demo.ts`（LP で見せる点検の結果）。
- `src/components/site/page-shell.tsx`（その他のページの枠、いまいる場所）、`src/components/guide/brokerage-try.tsx`（仲介手数料の小さな点検）。
- `public/favicon.svg`、`public/og.png`（もとは `scripts/og.html`）… 白い見積書に、赤ペンの丸。自分で描いた SVG。

LP のために探して、説明を読んだが、取らなかったもの: Preview Switch Hero（ruixen.ui。星の評価・顔写真の列・会社ロゴの列が前提の形なので、使わず）、Header 1（efferd。動かすと帯がすりガラスになる形なので、使わず）、Accordion（wensity。Base UI が要るので、使わず。よくある質問は、もう入っている ddoemonn の Accordion を使った）、Tabs（shadcn・originui。Radix の Tabs が要るので、ふるまいを自分で書いた）。

道具の画面のために探したが使わなかったもの（参考にしただけ）: Stepper（originui、sean0205。丸い番号と線の形なので、耳の形にした）、Combobox（uvain。cmdk が要るので使わず）、Toast（cnippet-dev。Base UI が要るので使わず）、Money Input（kuratlielia。小数の通貨向けなので、金額の欄は Input をもとに自分で作った）。

## 仕上げの点検（④）で、部品に入れた直し

| 部品 | どこ | 何を直したか |
| --- | --- | --- |
| Combobox（halaska-studio） | `src/components/ui/combobox.tsx` | 候補を「指す」のを、マウスが乗ったとき（mouseenter）ではなく、マウスを実際に動かしたとき（mousemove で、場所が変わったとき）だけにした。キーボードで打っている人のマウスが、たまたま候補の一覧の出る場所に止まっていると、指す候補が勝手に動き、Enter で「一覧にない項目として足す」が選ばれてしまっていたため。 |
