# 案A「カプセルトイ」で使った 21st の部品

どれも、そのまま貼らずに、この案の世界観（ガチャの筐体・墨色の太線・ぼかさない影・トマト赤／卵黄／ソーダのミント）に合わせて作り変えています。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Kokonut UI Detent Dial | kokonutd（@dorianbaffier / kokonutUI, MIT License） | https://21st.dev/@kokonutd/components/kokonut-detent-dial | `dial.tsx`（子どもの年齢ダイヤル、期間のつまみ）、`handle.tsx`（ガチャのハンドル） | 回す計算（角度の折り返し・ノッチに吸い付く力・はじくと惰性・端で行き過ぎて戻る）、キーボード／ホイール、数字が転がる表示はほぼそのまま。回せる角度と始まりの角度を変えられるようにし、まわりに押せる札（1年／5年／18歳まで）を置けるようにした。見た目を卵黄色のつまみ＋墨の太線＋ふちのギザギザに。ハンドルは同じ角度の計算を使い、時計回りにしか進まないラチェット（1/4回転ごとにカチッ、1周で決定、タップでも回る）に作り直した。MIT の著作権表示は `dial.tsx` の先頭に残した。 |
| Number Flow | educalvolpz (Eduardo Calvo) | https://21st.dev/@educalvolpz/components/number-flow | `stepper.tsx`（大人・子どもの人数） | 「増えたら上へ、減ったら下へ数字が転がる」考え方を借り、CSS クラスの付け外しを motion の AnimatePresence で書き直した。3けたの箱をやめ、筐体の小さな数字窓（墨の窓に黄色の数字）1つに。日本語のラベルと読み上げを足した。 |
| Stamp（Awards variant="stamp"） | designali-in (Ali Imam) | https://21st.dev/@designali-in/components/stamp | `stamp.tsx`（ご当地はんこ・スタンプ帳） | 弧にそって文字を置く textPath の考え方を使い、上に「都道府県・街」、下に「住む街ガチャ・年月」。ギザギザの切手ふちと星アイコンをやめ、駅スタンプ風の二重の輪と、名物（city.pride）から選んだ手描きの絵柄にした。インクのかすれ（feTurbulence と点の抜け）を足した。 |
| Confetti | motiondotdev（Motion 公式の例） | https://21st.dev/@motiondotdev/components/motion-confetti | `confetti.tsx`（カプセルが開いたとき。毎年の差がプラスのときだけ） | 粒の動きを前もってキーフレームに計算して流す仕組みはそのまま。ボタンを外して親から1回はじける形にし、粒をカプセルの半分・コイン・きらりに、色をこの案のパレットに変えた。動きを減らす設定では出さない。 |
| Segmented Control | balick | https://21st.dev/@balick/components/segmented-control | `tags.tsx`（働き方・今の街・保育園に通うか の札） | ラジオグループのふるまい（矢印キー・Home/End、選んだものだけ Tab で止まる）と、しるしが layoutId ですべる考え方を借りた。横一列のピルをやめ、ひもで吊るした札の格子に。選ぶと札がゆれて赤い丸のしるしが付く。 |

探したが使わなかったもの（参考にしただけ）: Vending Machine（aadilghani1。ボタンで商品が落ちる流れ）、lever-switch（theutkarshmail）、Kokonut UI Pull Cord（kokonutd）。
