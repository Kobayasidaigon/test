# ひきつぎ会計で使った 21st.dev の部品

## 道具の画面で使った部品

どれも、そのまま貼らずに、このサービスの世界観（「帳簿と、朱のはんこ」— 生成りの紙の地、墨の字、帳簿の罫線の青緑、だいじな操作と印に朱）に合わせて作り変えています。見本の文・数字・人物の写真は、ひとつも残していません。置き場所は `src/components/ui/` です。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Segmented Control | ddoemonn | https://21st.dev/@ddoemonn/components/segmented-control | `segmented-control.tsx`。取引の「支出・収入・移動」の切り替え、決算書の「差」の向き、監査をする人の数 | ラジオグループのふるまい（矢印キー・Home/End、選んだものだけ Tab で止まる）と、選んだしるしがすべって動き、下の字の色がしるしの形に切りぬかれて変わる仕組みは、そのまま。もとは motion のばねで動かしていたが、CSS の transition に置きかえた（道具の画面の JavaScript を、およそ 40KB 軽くするため）。見た目を「紙の上の、墨（または青緑）のしるし」に。高さを 44px 以上に、字を大きく、幅いっぱいに広げられるようにした。使えない選択肢（置き場所が1つしかないときの「移動」）を disabled にできるようにした。 |
| Dialog | shadcn（Radix UI） | https://21st.dev/@shadcn/components/dialog | `dialog.tsx`。新しく始める、取引を直す・消す、団体の設定、まとめて印刷、繰り越し、データを消す前の確かめ | フォーカスを中に閉じこめる・Esc で閉じる・うしろを触れなくする、はもとのまま。地を紙の色に、見出しを明朝に、上のふちを帳簿の青緑の線に。スマホでは下から出る紙にした（もとは、まん中に出るだけ）。中身が長いときに、見出しとボタンを残して中だけが動くように `DialogBody` を足した。閉じるボタンを 44px に、読み上げの名前を「閉じる」に。 点検のあとで足したこと: 閉じたとき、フォーカスを「開く前にいたボタン」へ戻す（`DialogTrigger` を使わずに開いているので、もとの部品は戻す先を知らない。開いたときの要素を自分で覚えて、`onCloseAutoFocus` で戻す。その要素がもう無いときは、いちばん近い囲みへ）。`DialogBody` に ref を渡せるようにした（「新しく始める」で段を進めたとき、中身のスクロールを頭に戻すため）。 |
| Steps | adit-firdaus | https://21st.dev/@adit-firdaus/components/steps | `steps.tsx`。「新しく始める」の3つの段（団体の種類 → 名前と年度 → はじめの残高） | 番号つきのリスト（ol）、いまの段の `aria-current="step"`、済んだ段だけ押して戻れること、段の状態を読み上げ用の文でも伝えること、つなぎの線が済んだ分だけ色づくこと、を借りた。もとの専用の CSS と、すべるしるしの仕組み（別ファイルのフック）は使わず、Tailwind で書き直した。番号の丸を、はんこの形に（いまの段は朱、済んだ段は青緑にチェック）。react-icons をやめて lucide に。 点検のあとで足したこと（`NewBookWizard.tsx` の側）: 段を進める・戻ると、中身のスクロールを頭に戻して、フォーカスを新しい段へ移す（まちがいがあるときは、その欄へ）。 |
| File Dropzone | joyco | https://21st.dev/@joyco/components/file-dropzone | `file-dropzone.tsx`。はじめの画面の「ひきつぎファイルを開く」 | 点線の枠にファイルを落とせる、落とせるあいだ枠の色が変わる、中のボタンでも選べる、を借りた。画像の見本・複数ファイル・一覧・大きさの上限の表示・別ファイルのフックは使わず、「1つ選んだら、すぐ親に渡す」だけにした（中身の検査と、断る理由は `src/core` がする）。枠の中の子に入るたびに色が消えないよう、入った回数を数えるようにした。同じファイルを続けて選べるようにした。 |
| Empty | cnippet-dev | https://21st.dev/@cnippet-dev/components/cnippet-empty | `empty.tsx`。取引がまだないとき、しぼりこみで何も見つからないとき | Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent に分かれた組み立て方と、アイコンの紙が少しずれて3枚重なって見える飾りは、そのまま。重なった紙を帳簿の紙（生成りのふち、青緑のアイコン）に、見出しを明朝に、枠を点線に、余白を小さめに。 |
| Toast | shugar | https://21st.dev/@shugar/components/toast | `toast.tsx`。「ひきつぎファイルを保存しました」「科目を消しました」「使われているので消せません」などの知らせ | 画面の外の小さな保管場所（toastStore）に知らせをためて、どこからでも `toast.success(...)` で出せる仕組み、時間がたつと消える、マウスをのせているあいだは消えない、新しい3つだけを出す、ボタンを1つ付けられる、を借りた。もとは `createRoot` で別の場所に描いていたが、`<Toaster />` を画面に置く形にした（印刷のときに消すため）。重ねて縮める飾りをやめて下から積む形に。消えるまでの時間を 3秒 → 6秒（まちがいは 12秒）に。種類ごとに形の違うアイコンを出し、読み上げに伝える（role="status" / "alert"）。もとの専用のボタン部品（button-1、spinner-1）は使っていない。 点検のあとで足したこと: ダイアログが開いているあいだは、スマホとタブレットでは、知らせを画面の上に出す（下から出るダイアログのボタンに、かぶさらないように）。 |
| Table | originui（shadcn/ui の Table を整えたもの） | https://21st.dev/@originui/components/table | `table.tsx`。取引の一覧（パソコンの表） | Table / TableHeader / TableBody / TableRow / TableHead / TableCell の分け方と、表が広いときに表の中だけを横に動かせる外わくは、そのまま。線を帳簿の罫線に（見出しの下は青緑の二重線、行の間は細い青緑の線）。字を大きく。チェックボックス用の決まりは外した。 |
| Accessible Tooltip | a11ypros（MIT License の a11y-tooltip をもとにしたもの） | https://21st.dev/@a11ypros/components/a11y-tooltip | `hint.tsx`。会計の言葉（科目、摘要、予算、決算、前年度繰越金、出納帳、監査、領収書の番号）のひとこと説明 | 説明を role="tooltip" にして、出ているあいだだけ aria-describedby でつなぐこと、マウスをのせる・フォーカスで開く、Esc で閉じる、説明の上にマウスを動かしても消えない、画面のはしで切れないように横にずらす、字のきっかけを点線の下線つきのボタンで包む、を借りた。もとの専用の CSS は使わず Tailwind で書き直した。スマホではマウスをのせられないので、押しても開く・閉じるようにした。押せるところを 44px に広げた。出る向きは「下」だけに。入力欄が続くフォームの中では Tab で止まらないようにできる（そのときは、同じ説明を入力欄の aria-describedby で読み上げに渡している）。 |
| Switch | kemiljk | https://21st.dev/@kemiljk/components/switch | `switch.tsx`。公開前モードの「無料版の表示を確かめる」 | 本物の button に role="switch" と aria-checked を付ける作り、label で包むと文のところを押しても切り替わること、を借りた。もとの専用の CSS（CSS Modules）と補助のフックは使わず Tailwind で書き直した。入のときは青緑。色だけにならないよう、つまみの中に「入」「切」の字を出す。押せる高さを 44px に。 |
| Alert | shadcn | https://21st.dev/@shadcn/components/alert | `alert.tsx`。確かめてほしいこと、照合が合わないとき、無料版の透かしの知らせ、繰り越しの前の確かめ、ファイルを開けなかった理由 | Alert / AlertTitle / AlertDescription の分け方と、左にアイコンを置く割りつけは、そのまま。種類を4つに（お知らせ＝青緑、確かめてください＝からし色、できません＝朱、できました）。左のふちを太い線にして、回覧板の付せんのように見せる。種類ごとに形の違うアイコンを必ず出す（色だけにしない）。role は付けず、急ぎの知らせだけ、使う側で role="alert" を付ける。 |
| Mobile Navigation Tabs | shadcnui-blocks（shadcn/ui の Tabs＝Radix UI を使ったもの） | https://21st.dev/@shadcnui-blocks/components/tabs-08 | `tabs.tsx` の `NavTabsList` / `NavTabsTrigger`。5つの画面の切り替え（スマホでは画面の下に固定、パソコンでは上の横ならび）。同じファイルの `TabsList` / `TabsTrigger` は、資料5種類の切り替え | アイコンの下に名前を置いた下のタブ、という形を借りた。矢印キーで動く・選んだタブだけ Tab で止まる、は Radix のまま。見本のアイコン（pnpm、npm など）と文はすべて外した。選んだタブは、上に朱の線が付いた紙の色のつまみ（帳簿のインデックス）に。スマホでは下に固定し、ホームバーのぶんだけ下を空ける。パソコンでは同じ部品が、見出しの下の横ならびになる。 点検のあとで変えたこと: スマホの下の切り替えの字を 0.72rem から 0.8rem に。 |
| Button・Input・Label | shadcn | https://21st.dev/@shadcn/components/dialog（Dialog に付いてくる基本の部品） | `button.tsx`、`input.tsx`。すべての画面 | Button: だいじな操作は朱、ほかは墨のふち・青緑。高さを 44px 以上に。長い名前は折り返す（もとは1行に固定。スマホではみ出さないように）。決めていなければ type="button" にした（フォームの中で、勝手に送信されないように）。Input: 字を 17px、高さを 48px に、ふちを紙の上で形がわかる濃さに。まちがいのとき（aria-invalid）は、ふちが朱になる。`Textarea`、`NativeSelect`（ブラウザに元からある選ぶ欄に、見た目だけをそろえたもの）、`Field`（ラベル・説明・まちがいの文をひとまとめにする）を足した。Label は Radix の Label をやめて、ふつうの label に。 |

21st.dev のものではない、自分で作った部品:

- `src/components/ui/seal.tsx` … 朱のはんこ（サービスのしるし、照合が合ったときの「合」、読むだけの年度の「済」）。SVG を自分で描いた。
- `src/components/papers/` … 総会の資料5種類の「紙」（収支決算書、出納帳、会計監査報告書、次年度の予算案、引き継ぎ書）。見た目は `src/styles/paper.css`。
- `src/components/tool/` … 道具の画面（はじめの画面、5つの画面、団体の設定、金額と日付の入力欄）。

探したが使わなかったもの（参考にしただけ）: Stepper（nyxbui、corr）、Wizard Steps（ddoemonn）、Modal（ddoemonn）、Empty State（wensity、serafimcloud）、Underline Tabs（cnippet-dev）、Data Table（shadcn。TanStack Table が要るので使わず、取引の一覧は Table の部品に、`src/core` のしぼりこみの関数をつないで作った）、Bottom Nav Bar（arunachalam。選んだものだけ名前を出す形は、パソコンに慣れていない人にわかりにくいので使わず）。

## ランディングページとその他のページで使った部品

置き場所は `src/components/landing/` です。どれも、見本の文・数字・ロゴ・写真は、ひとつも残していません。絵のかわりに、道具が作る本物の資料の紙（`src/components/papers/`）と、道具の画面の一部を置いています。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Centered Nav Header | olewandowski1 | https://21st.dev/@olewandowski1/components/centered-nav-header | `SiteHeader.tsx`。LP・特商法・プライバシーポリシーの、いちばん上の見出し | 左にしるし、まん中にページ内の案内、右にだいじなボタン、という3つの並びは、そのまま。スマホで開くメニュー（Sheet）をやめて、案内を見出しの下に、いつも並べておく形にした（押さないと中身が見えないメニューは、パソコンに慣れていない人が気づきにくいため）。「Sign In」と見本のロゴは外した（登録もログインもないサービスのため）。下の線を、帳簿の二重線に。幅 320px でも1行に収まるように、せまい画面では字と間を詰める。remixicon は使っていない。 |
| Hero with Dashboard Mockup | felipemenezes098 | https://21st.dev/@felipemenezes098/components/hero-02 | `Hero.tsx`。LP のいちばん上 | 左そろえの明朝の見出し → 説明 → ボタン、の順と、その横（スマホでは下）に製品そのものを大きく置く組み立てを借りた。写真の背景と、作りものの画面（ダッシュボードの絵）をやめて、サンプルの帳簿の本物の収支決算書を置いた。出てくるときのぼかしの動き（motion）と、react-wrap-balancer は使っていない（折り返しは CSS で）。かわりに「ためしに支出を1件入れると、決算書がその場で変わる」を、道具と同じ関数（`src/core` の `checkTransaction`、`addTransaction`、`buildReports`）で動かしている。変わった行は、少しのあいだ朱のうすい色で知らせる。 |
| Feature Tab Switcher（Feature 11 from Hirael） | mohammadshehadeh（Mohammad Shehadeh。MIT License） | https://21st.dev/@mohammadshehadeh/components/feature-11 | `Documents.tsx`。「総会の資料が、5種類そろいます」 | 縦に並んだタブ（名前と、ひとことの説明）の横に、選んだものの中身を見せる枠を置く組み立てと、矢印キーでタブを動かすと中身もついてくるふるまいを借りた。中身を、見本の一覧（作りもののデータ）から、本物の資料の紙5種類にした。Radix の Tabs をやめて自分で書いた（5枚とも静的HTMLに書き出して、選んでいない紙は隠すだけにするため。スマホではタブが横に並ぶので、矢印キーは上下・左右のどちらでも動く）。タブは、帳簿のインデックス（選んだものが、朱の線の付いた紙のつまみになる）に。番号は、資料をとじる順の漢数字。「大きく表示する」を足した。MIT の表示は `Documents.tsx` の先頭に残した。 |
| How It Works Steps | ln-dev7 | https://21st.dev/@ln-dev7/components/how-it-works-09 | `HandoverSteps.tsx`。「引き継ぎは、ファイルを1つ渡すだけ」（渡す → 開く → 続きから） | 番号の丸を3つ横に並べて細い線でつなぐ形と、スマホでは縦に並べて段の間に矢じるしを置く形は、そのまま。「01 02 03」を、はんこの形の丸に漢数字に。字だけだった段に、道具の画面の一部をまねた小さな絵を付けた（ファイルの名前、年度の一覧、残高は、サンプルの帳簿から本物の関数で出している）。まん中のボタンと、英語の小見出しは外した。 |
| Us vs Them Comparison | olewandowski1 | https://21st.dev/@olewandowski1/components/comparison-2 | `FitSection.tsx`。「向いている団体と、向いていない団体」 | 左右に並べた2つの欄（片方はチェックの行、もう片方はバツの行。色だけでなく形でも分ける）を借りた。もとは「自社とほかの会社」をくらべる部品だったが、ほかのサービスを悪く言う使い方はせず、「このサービスが合う団体と、合わない団体」を正直に並べる欄にした。おすすめの札、ボタン、見本の文は外した。カードを2枚並べるのをやめて、1枚の紙を罫線で左右に分けた。「対象外」の文は、道具の画面と同じもの（`src/core/notices.ts`）を使い、下に、もとにした公の資料を並べた。 |
| Two-Plan Pricing Cards | ln-dev7 | https://21st.dev/@ln-dev7/components/pricing-16 | `Pricing.tsx`。料金（無料／1年度ぶん） | 無料と有料の2つを横に並べ、名前 → ひとこと → 金額 → チェックの一覧 → ボタン、の順に積む組み立ては、そのまま。角の丸い2枚のカードをやめて、1枚の紙を罫線で左右に分けた。「Recommended」の札と、英語の小さな字、矢じるしは外した。金額と文は、すべて `src/site.config.ts` から出す。購入のボタンは、決済ページが決まるまで「販売準備中です」と出す。 |
| FAQ Section | kevingirelli | https://21st.dev/@kevingirelli/components/faq | `Faq.tsx`。よくある質問 | 「split」の割りつけ（パソコンでは、左に見出し、右に質問の一覧）と、質問を見出し（h3）の中の押せる行にする作り、見出しの下に「ここにない質問は…」の1行を置けるところを借りた。Radix の Accordion をやめて、ブラウザに元からある `<details>` にした（閉じている答えも静的HTMLに入るので、ページ内の検索で見つかり、JavaScript が動かなくても開ける）。質問と答えの頭に「問」「答」のしるし。行の高さを 44px 以上に。見本の英語の質問は、すべて入れかえた。 |
| Minimal Two-Column Footer | ln-dev7 | https://21st.dev/@ln-dev7/components/footer-17 | `SiteFooter.tsx`。LP・特商法・プライバシーポリシーの、いちばん下 | 左にしるしと、ひとことの説明、右に縦に並べた案内、いちばん下に細い線と小さな文、という割りつけは、そのまま。見本のロゴ・文・地名は外した。年の数字は出さない（静的HTMLを作った年と、見ている年が食いちがうため）。ことわり書き（道具は補助であること）を、ここにも出す。 |

21st.dev のものではない、自分で作ったもの（LP）:

- `ReconcileDemo.tsx` … 残高の照合の見本。道具の「残高の照合」の画面の形に合わせて組み、計算は `src/core` の `setReconciliation` と `reconcileYear` を、そのまま動かしている。
- `DataSection.tsx` … 「登録なし。どこにも預けない」の絵（データがどこにあって、どこには行かないか）。
- `ClosingCta.tsx`、`LegalPage.tsx`（特商法とプライバシーポリシーの、紙の割りつけ）、`Section.tsx`（章の見出し、帳簿の二重線、はんこの形の番号）。
- `scripts/og.html` … 共有画像（`public/og.png`）のもと。右の紙は、本物の収支決算書の部品が出した HTML。

探したが使わなかったもの（LP）: Header 1（efferd。すりガラスの見出しなので使わず）、Hero with image, text and two buttons（tommyjepsen）、Accordion（originui、brijr、ddoemonn。答えを静的HTMLに入れるため `<details>` にしたので使わず）、Comparison Table（mohammadshehadeh）、How It Works（chamaac）。
