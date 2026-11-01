# 案D「家計レシート」で使った 21st の部品

どれも、そのまま貼らずに、この案の世界観（感熱紙のレシート・はちみつ色の木の食卓・朱のはんこと赤ペン・等幅の印字）に合わせて作り変えています。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Kokonut UI Receipt Printer | kokonutd（@dorianbaffier / kokonutUI, MIT License） | https://21st.dev/@kokonutd/components/kokonut-receipt-printer | `printer.tsx`（ガチャの演出） | 1行送っては止まるサーマルプリンターの送り方（LINE・FEED_RATE・LINE_PAUSE・LINE_JITTER と、目標へ寄せていく式）、紙を送っている間だけ本体が震えるしかけ、ちぎるときの小さな振動を借りた。紙は下に垂れるのではなく、本物のレジのように上へ出てくる向きに変え（先に印字した見出しが上に来る）、物理で揺らして引っぱってちぎる部分はやめて「ガチャン！→ジジジ…→チリッ」で自動で結果へ進むようにした。「とばす」ボタンを足し、動きを減らす設定では演出そのものを出さない。MIT の著作権表示は `printer.tsx` の先頭に残した。 |
| Receipt Pricing | n1m4mz | https://21st.dev/@n1m4mz/components/receipt-pricing | `receipt.tsx`、`theme.css` の `.vd-paper`、`choice.tsx` のラジオのふるまい、`lib.ts` の番号とバーコード | 上下のギザギザを CSS マスクで切る作り、感熱紙の細い横じま、点線のリーダーでつないだ行、二重線の上の合計、FNV ハッシュで決める番号とバーコード、斜めのはんこ、「古い紙がちぎれて落ちる → 新しい紙が上から現れる（印字ヘッドの影つき）」出し直しの段取りを借りた。料金表をやめて「家計の差額」のレシートにし、品目の行をタップで開くボタンにして計算の中身・出典・確からしさ（確認済／推定／仮置き）を出した。確認中の行、一度きりの「別会計」、赤ペンの丸と一言、倍角の店名と合計を足した。月額・年額の切り替えのラジオグループの書き方（矢印キー・Home/End・選んだものだけ Tab で止まる）は、伝票に丸をつける選択肢（`choice.tsx`）に使った。 |
| Quantity Stepper | arihantcodes_1f7b8c4d（Spectrum UI） | https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper | `stepper.tsx`（大人・子どもの人数、子どもの年齢） | 増えると下から・減ると上から数字が転がる動き、押すとむにっと縮む手ざわり、端でそれ以上押すと横にふるえて赤くなる合図、長押しで速くなる連打、ARIA の spinbutton とキー操作を借りた。白いピルの見た目を感熱紙とインクの線の札に変え、「これから生まれる」などの言葉も出せるように format / valueText を足した。キーボードや読み上げソフトで押したとき（detail が 0 の click）にも1つ動くようにした。framer-motion を motion/react に。 |
| Checkout Till | aadilghani1 | https://21st.dev/@aadilghani1/components/checkout-till | `printer.tsx`（プリンターの絵と段取り） | react-isokit が要るため、考え方だけ借りて作り直した: 合計キーで信号が届くとプリンターのランプが点き、紙のロールが回って紙が出る。ここでは平面の SVG で、表示窓（計算中…→印字中→できた）・ランプ・FEED ボタン・紙のロールが回って見える窓を描いた。 |

探したが使わなかったもの（参考にしただけ）: Receipt Printer（aadarshm）、Receipt Tiers（arihantcodes_1f7b8c4d）、Kokonut UI Tear Button（kokonutd）、Seat Selection（lavikatiyar）、Styled Radio Group（ai2）、Number counter（motiondotdev）。

## 自分で描いたもの（21st ではない）

- 食卓の場面（`scene.tsx`）と、家族・いす・茶碗とみそ汁・席札・貯金箱・名物の絵（`art.tsx`）。名物は `city.pride` から選ぶ: 求人チラシ（23区）、鋳物の鍋（川口）、せんべい（草加）、工場夜景の写真立て（川崎）、ロケットの置物（相模原）、たこ焼き（大阪）、野菜かご（札幌）、桜島の写真立て（鹿児島）、制度は卓上POP。名物には「名物」の小旗を立てる。
- 赤ペンの丸（`choice.tsx` の HandCircle）。少しゆがんで最後が重なる楕円を、毎回その文字の大きさに合わせて描く。
