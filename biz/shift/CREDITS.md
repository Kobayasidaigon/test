# たたき台シフトで使った 21st.dev の部品

どれも、そのまま貼らずに、このサービスの世界観（少し黄みのある白の地に濃い紺の文字、勤務は色つきのブロック、紺の太めの輪郭線、ぼかさずにずらした影）に合わせて作り変えています。見本に入っていた英語の文・数字・人物の写真は、すべて消して、日本語の本物の文に入れ替えました。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Steps | adit-firdaus | https://21st.dev/@adit-firdaus/components/steps | `src/components/ui/steps.tsx`（道具の画面の上にある、4つの手順の見出し） | `<ol>` と `aria-current="step"` で流れを伝える組み立て、番号の入った印、印どうしをつなぐ線、速く押しても押した様子が見える `usePressFeedback`（押した状態を最低 90ms 保つ）は、そのまま使った。もとは「先の手順は押せない」進み具合の表示だが、この道具は行き来が自由なので、どの手順も押せるボタンにした。丸い印を、勤務のブロックと同じ四角（いまの手順は卵色に、ずらした影）にした。すべる丸（sliding thumb）と専用の CSS（may-steps…）は使わず、Tailwind のクラスで書き直した。手順ごとのひとこと（「スタッフ 7人」「見直すところ 2か所」）と、スマホ用の短い名前を足した。 |
| Segmented Control | klyv-ui（Klyv contributors, MIT License） | https://21st.dev/@klyv-ui/components/segmented-control | `src/components/ui/segmented.tsx`（②祝日の人数、③入れるものの切りかえ、貼り付けたときの希望のあつかい） | radiogroup のふるまい（矢印キーで動く、選んだものだけ Tab で止まる）は、そのまま。丸いピルをやめ、紺の輪郭線でつながった角ばった箱にして、選んだものは紺の地に白ぬきにした。選択肢が多いとき用に、折り返して並ぶ札の形（`variant="chips"`）を足し、ラベルの前に勤務のブロックを置けるようにした（`lead`）。アイコンだけの選択肢と、縦並びは外した。MIT の著作権表示は、ファイルの先頭に残してある。 |
| Animated Dialog | rmahammad | https://21st.dev/@rmahammad/components/animated-dialog | `src/components/ui/dialog.tsx`（日ごとの人数、貼り付け、ファイルを開く、月を変える前の確かめ、翌月への引き継ぎ、買い切り版の案内。スマホでは、マスの勤務を選ぶシートにも） | Radix Dialog にまかせる作り（フォーカスを閉じこめる、Esc、外を押すと閉じる）、幅 640px 以下では下から出るシートになること、頭と足が動かず中身だけがスクロールする組み立て（Header / Body / Footer）、はずまないばねの動きは、そのまま。すりガラスの背景、ぼかした影、ふちの光沢の線をやめ、紺の輪郭線と、ずらした影にした。開く動きは1種類にしぼった。位置合わせを外側の枠にまかせて、動きの transform とぶつからないようにした。「閉じる」を日本語の名前にし、押しやすい 44px にした。 |
| Popover | originui | https://21st.dev/@originui/components/popover | `src/components/ui/popover.tsx`（マスを押したときの勤務の選択肢、ブロックの色えらび、ひな形から選び直す、右上の「そのほかの操作」）。いっしょに付いてきた Input と Label をもとに `src/components/ui/field.tsx`（入力欄、ラベル、選択、文の欄） | Radix Popover をくるむ作りは、そのまま。うすい枠と、ぼかした影をやめて、紺の輪郭線と、ずらした影に。矢印（Arrow）は外した。マスの選択肢では、押したマスを位置の基準にして開く（`PopoverAnchor` の `virtualRef`）。入力欄は高さを 44px にし、スマホで画面が拡大されないよう字を 16px にした。 |
| Quantity Stepper | arihantcodes（Spectrum UI） | https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper | `src/components/ui/number-field.tsx`（必要な人数、月の勤務日数、休憩の分、連勤の上限、役割の最低人数） | −／＋を押し続けると、だんだん速くくり返す動き、上限・下限に当たると数が小さくゆれる知らせ、↑↓／PageUp／PageDown のキー操作を借りた。まん中を、数を直接打てる本物の入力欄にした（全角の数字でも読む）。空（＝決めない）を許せるようにし、単位（人・日・分）を出せるようにした。framer-motion を使わず CSS だけにした（数字が転がる動きは、表の中では目ざわりなので外した）。丸いピルを、紺の輪郭線の箱に。 |
| Switch | halaska-studio | https://21st.dev/@halaska-studio/components/switch | `src/components/ui/switch.tsx`（②の条件、日ごとの「店を開けない」、公開前モードの「無料版の表示を確かめる」） | `<button role="switch">` とラベルを1つの `<label>` でくるむ組み立てと、つまみが少しはずんで動く動きを借りた。テーマ用の部品（usePal など）に頼っていたので、Tailwind のクラスだけで書き直した。丸いつまみを、ブロックと同じ四角に。色だけに頼らないよう、「入」「切」の字を出し、ラベルの下に説明を置けるようにした。 |
| Toast | shugar | https://21st.dev/@shugar/components/toast | `src/components/ui/toast.tsx`（保存した・消した・取り込んだ、などの短いお知らせと、「元に戻す」） | 部品の外に置いた入れ物（store）に足していく作り、マウスを乗せているあいだは消えない（pause / resume）、取り消しの操作つきのお知らせ、を借りた。`createRoot` で body に別の React を足す形をやめ、`<Toaster />` を画面に1つ置く形にした。重ねて奥に引っこむ動きをやめ、順に積むだけにした。紺の地に白ぬきの字と、卵色のずらした影。読み上げのために `role="status"`（まちがいは `alert`）を付けた。スマホでは上に出す（下からのシートをかくさないため）。「元に戻す」付きのお知らせは、そのあとで別の変更をしたら消えるようにした（`validFor` と `dropStale`。古いお知らせで、別の変更が戻ってしまわないように）。 |
| Empty | cnippet-dev | https://21st.dev/@cnippet-dev/components/cnippet-empty | `src/components/ui/empty.tsx`（スタッフがまだいないとき、③④でスタッフや勤務の種類がないとき） | Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent に分けた組み立てと、絵の後ろに、かたむけた札を2枚重ねる見せ方を借りた。後ろの2枚を、勤務のブロック（卵色と空色）にした。うすい影と光沢の線をやめ、紺の点線の枠にした。 |
| File Dropzone | joyco | https://21st.dev/@joyco/components/file-dropzone | `src/components/ui/dropzone.tsx`（はじめの画面と「ファイルを開く」の、ファイルの読み込み口） | 点線の枠にファイルを落とすか、ボタンで選ぶか、の2通りの入口、落とせるときに枠の色が変わること、まちがいを枠のすぐ下に `role="alert"` で出すことを借りた。画像の見本と、複数のファイルの一覧は外した（読むのは .json の1つだけ）。中身の確かめは `src/core/` にまかせ、断る理由の文をそのまま出す。 |
| Alert | shadcn | https://21st.dev/@shadcn/components/alert | `src/components/ui/notice.tsx`（組む前の注意、無料版の制限、保存できないとき、貼り付けの読み方、など） | 絵と、見出し・本文に分けた組み立てと、種類で色を変える作りを借りた。種類を4つ（info / ok / warn / danger）にして、種類ごとに決まった絵を自動で出す（色だけで伝えない）。左に太い帯を付けた紺の輪郭線の箱に。 |
| Button | shadcn/ui（File Dropzone といっしょに、21st から届いた部品。土台にも同じものが入っていた） | https://21st.dev/@joyco/components/file-dropzone（この部品の付属として取った） | `src/components/ui/button.tsx`（すべてのボタン） | cva で種類と大きさを分ける作りは、そのまま。紺の 2px の輪郭線と、ずらした影を付け、押すと影のぶんだけ沈むようにした。いちばん大事な操作は卵色。スマホでは、どの大きさも高さ 44px 以上。フォームの中でも勝手に送信しないよう、`type="button"` を初期値にした。 |

## ランディングページと、そのほかのページで使った部品

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Header 1 | efferd | https://21st.dev/@efferd/components/header-1 | `src/components/landing/site-header.tsx`（LP・特商法・プライバシーの上のナビ） | 上に固定して、スクロールしたら下の線が出る作り（useScroll）、せまい画面で「開く・閉じる」のボタンからメニューを出す組み立て、三本線が×に変わる絵（MenuToggleIcon）、aria-expanded / aria-controls の付け方を借りた。すりガラス（backdrop-blur）をやめて、地の色と紺の線にした。メニューは body に別枠で出す形（createPortal）をやめ、ナビのすぐ下に出る箱にした（静的HTMLに書き出すページなので、描くときに document に触らない）。Esc とリンクを押したときに閉じる。見本の印と英語のリンク（Features / Pricing / Sign In）は消し、このサービスの印と、ページの中の見出しへのリンクに入れかえた。幅 360px 未満では、ナビに入りきらない「道具を開く」をメニューの中に出す。 |
| Hero with Product Mockup | vaib215 | https://21st.dev/@vaib215/components/hero-with-product-mockup | `src/components/landing/hero.tsx`、`hero-demo.tsx`（LP の一番上） | 見出し・ひとこと・ボタンと、製品の窓を組み合わせる形と、「窓の後ろに、色の板をずらして重ねる」見せ方、窓の頭に小さな印を3つ並べる形を借りた。板のかたむき・グラデーション・ぼかした影をやめ、紺の輪郭線の板を右下にずらして重ねた。にせの画面（検索欄、絵文字のアイコン、スマホの枠、見本の文「Transform your digital experience」など）はすべて消し、窓の中身を本物の部品にした（サンプルの店で、道具と同じ自動作成をページの中で動かす `ShiftGrid`）。窓の頭の3つの印は、信号の丸ではなく勤務のブロックにした。 |
| How It Works Steps | ln-dev7 | https://21st.dev/@ln-dev7/components/how-it-works-09 | `src/components/landing/how.tsx`（使い方の3ステップ） | 番号の印を横に3つ並べて1本の線でつなぐ組み立てと、下にまとめのボタンを1つ置く形を借りた。丸い印を、勤務のブロックと同じ四角（卵色、ずらした影）に。線は点線に。文だけだった各ステップの下に、道具の画面と同じ部品（必要な人数の表、希望休の表、できたシフト表）を置いた。まん中そろえを左そろえにし、せまい画面では縦に並べる。見本の英語の文と数字（135 sections など）は消した。 |
| Comparison Section | mohammadshehadeh（Hirael, MIT License） | https://21st.dev/@mohammadshehadeh/components/comparison-03 | `src/components/landing/limits.tsx`（できないこと） | 2枚の板を1つの枠の中にとなり合わせ、片方は「−」、もう片方は「✓」で並べる組み立てと、下に3つの短い事実を1行で置く形（outcome strip）を借りた。「前と後」の比べ方をやめて「できないこと／できること」にし、打ち消し線は使わない（読みにくいため）。できないことには、1つずつ説明の文を足した。「できること」は料金の表と同じ文（`site.plans`）から出す。等幅の英語の小見出しと見本の文・数字は消した。MIT の表示（出どころの URL と作者）は、ファイルの先頭に残してある。 |
| Two-Plan Pricing Cards | ln-dev7 | https://21st.dev/@ln-dev7/components/pricing-16 | `src/components/landing/pricing.tsx`（料金） | 2枚の札をとなり合わせ、名前とひとこと → 上下を線ではさんだ金額 → ✓の一覧 → いちばん下にボタン、という組み立てと、札の上のふちにのせる小さな札、下の断り書きを借りた。「Recommended」と押すのをやめ、札には「どんな店向けか」を書いた。細い枠と丸い角を、紺の輪郭線と、ずらした影に（買い切りの札は、卵色の影）。金額と一覧の文は `site.config.ts` から出す。購入のボタンは、決済ページ（`site.checkoutUrl`）が空のあいだは「販売準備中」にして、押せなくした。となりに「買い切り版の、使いはじめ方」を足した。見本の英語の文と金額（$119）は消した。 |
| Accordion | ddoemonn | https://21st.dev/@ddoemonn/components/accordion | `src/components/ui/accordion.tsx`（LP の「よくある質問」） | 1つの枠の中に行を線で区切って重ねる組み立て、行の頭の右に開くと向きが変わる山形の印、↑↓／Home／End で行の頭を行き来するキー操作、行の頭を見出しとしてあつかうこと、開いた中身を少しくぼんだ地にすることを借りた。もとは motion で高さを測って動かし、閉じた中身を aria-hidden にしていたが、HTML の `<details>` に作り変えた（JavaScript が動く前の静的HTMLでも開けて、ページ内の検索でも答えが見つかるように）。開く動きは CSS だけ（対応していないブラウザでは、そのまま開く）。細い灰色の枠とぼかした影を、紺の輪郭線と、ずらした影に。行を 56px の高さにした。見本の文（Shipping / Returns / Sizing）は消した。 |
| Minimal Footer | efferd | https://21st.dev/@efferd/components/minimal-footer | `src/components/landing/site-footer.tsx`（LP・特商法・プライバシーのフッター） | 6列の格子で、左に印とひとこと、右にリンクの列を2つ置く組み立てと、下に細い線をはさんで1行を置く形を借りた。SNS の絵のリンク（このサービスには SNS がない）と、光のグラデーション、見本のリンク（Careers / Blog など）と著作権の行をやめた。紺の地に、地の色の文字。リンクは、このサイトに本当にあるページだけ。下の1行は、法令についての断り書きにした。 |

Segmented Control（klyv-ui。上の表にあるもの）は、LP の一番上の「見本の店」の切りかえ（`hero-demo.tsx`）にも使っている。

## 自分で作ったもの（21st の部品ではない）

- `src/components/shift-grid.tsx` … シフト表（行がスタッフ、列が日）。名前の列を左に固定した横スクロール、矢印キーでのマスの移動、ブロックがはまる動き。
- `src/components/shift-block.tsx` … 勤務のブロック。
- `src/components/logo.tsx` … 印（3つのブロック）。自分で描いた SVG。
- `src/components/tool/PrintSheet.tsx` … 印刷用の表（A4 横）。
- ②のカレンダー、勤務の種類・スタッフの入力の行。
- `src/components/landing/about.tsx` … 「どういう道具か」の3枚の絵（希望休のメモと吹き出し、はまったブロック、貼り出した表）。自分で描いた SVG と、勤務のブロック。
- `src/components/landing/data.tsx` … 「データの扱い」の図（パソコンの中 ⇄ ファイル、サーバーへは送らない）。
- `src/components/landing/reasons.tsx` … 「組めないとき」の見本。道具の画面（④シフト表）の「点検の結果」「足りないところを埋める案」と同じ組み立てを、LP 用に書いたもの。
- `src/components/landing/legal-page.tsx` … 特商法・プライバシーのページの枠。
- `scripts/og.html` … 共有画像（`public/og.png`）のもと。
- `public/404.html` … 見つからないページ。React を使わない1枚だけのHTMLで、色・書体・ブロックの絵を、ほかのページに合わせて手で書いた。

## 探したが、使わなかったもの（参考にしただけ）

- 表: Pinnable Columns Table（felipemenezes098）は TanStack Table が要るので使わず、表は自分で作った。
- 手順: Stepper（originui、sean0205）は、Steps のほうが「押せる手順」に近かったので使わなかった。
- 数の入力: Number Field（coss.com）は Base UI が要るので使わなかった。
- お知らせ: Undo Pill（arihantcodes）、Undo Feedback（sltowl）は、Toast の取り消しで足りたので使わなかった。
- 料金: Lifetime Deal Pricing Card（diarmuradi）は、打ち消し線の「もとの値段」と、利用者の顔写真の列（うその実績になる）が前提なので使わなかった。
- くらべ方: Us vs Them Comparison（olewandowski1）は、他社とくらべる形なので使わなかった（他社の名前を出さない決まり）。
- 画面の枠: Safari（ruixen.ui、dillionverma）、Browser（designali-in）は、画像を入れる枠なので使わなかった（LP には、画像ではなく本物の部品を置いた）。
- 機能の見せ方: Feature Tab Switcher（mohammadshehadeh）は、タブにすると中身がかくれるので使わなかった（3ステップは、ぜんぶ見えるように並べた）。
- ナビ・フッター: Header Navbar（karthikmudunuri）、Simple Centered Footer（ln-dev7）は、えらんだものと役割が同じなので使わなかった。
