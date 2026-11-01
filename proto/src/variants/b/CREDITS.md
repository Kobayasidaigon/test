# 案B「ドット絵の旅」— 21st.dev から借りた部品

どれもそのまま貼らず、この案の世界観（紙色のウィンドウ・墨色のドット枠・金色の小判）に合わせて作り変えた。
コードは `parts.tsx` にまとめ、ファイル先頭のコメントにも同じことを書いている。

| 部品 | 作者 | URL | この案での名前 | どう変えたか |
|---|---|---|---|---|
| 8-bit Button | theorcdev（8bitcn） | https://21st.dev/@theorcdev/components/8bit-button | `PixelButton` | 角を欠いたドットの枠・上のハイライトと下の影・押すと沈む、の考え方を借りた。10個の div で組んでいた枠を box-shadow 4本に置き換え、shadcn の Button を使わず素の button + cva に。色を金色（進む）と紙色（もどる）に変更。 |
| 8-bit Progress | theorcdev（8bitcn） | https://21st.dev/@theorcdev/components/8bit-progress | `PixelGauge` | 縦横2枚の枠をずらして重ねて角を欠く作り方と、マス目で埋まる retro 表示を借りた。真ん中から「今の街 ⇔ 候補の街」の手厚い側へ伸びる両側ゲージに作り変え、1マスずつ点く動き・両端の街の名前・読み上げ用の文を追加。 |
| Quantity Stepper | arihantcodes（Spectrum UI） | https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper | `PixelStepper` | 数字が上下に転がる・端で首を振る・長押しで連続・spinbutton のキーボード操作と読み上げはそのまま。丸い形をドットの四角に、＋−をドットの字形に、文言を日本語に、表示を「これから／◯歳」「◯人」にできるよう変更。キーボードで＋−にも届くようにした。 |
| Typewriter Text | educalvolpz（SmoothUI） | https://21st.dev/@educalvolpz/components/typewriter-text | `TypeText` | 1文字ずつ出す・動きを減らす設定なら全文、の考え方を借りた。句読点で少し間をあける、ウィンドウのタップで全文、読み上げには最初から全文を渡す、まだ出ていない文字の幅を先に取って行がずれないようにする、終わったら三角を点滅、を追加。 |
| Confetti | motiondotdev | https://21st.dev/@motiondotdev/components/motion-confetti | `PixelConfetti` | 速度・減衰・重力・ゆらぎからキーフレームを作る計算をそのまま使った。丸や細長い紙を四角いドットと金貨に、位置を 3px 単位にそろえてドットらしく、色をこの案の色に、ボタンでの発火を外からの合図（家族が喜ぶとき）に変更。動きを減らす設定では出さない。 |

ほかに、検索して考え方だけ参考にしたもの（コードは使っていない）: 8bit Health Bar / 8bit Main Menu（theorcdev）。

ドット絵（家族・貯金箱・ハト駅長・街並み・名物の小物）は、すべてこの案のために文字グリッドで描いた（`sprites.ts`・`scene.tsx`）。
