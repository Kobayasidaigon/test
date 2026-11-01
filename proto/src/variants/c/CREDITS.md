# 案C「街カード」で使った 21st の部品

どれも、そのまま貼らずに、この案の世界観（自治体が配るダムカードのような「同じ書式で刷られた街のカード」、生成りの卓上、墨の線、街ごとの1色刷り、朱のボタン）に合わせて作り変えています。レア度や当たり外れに見える表現（虹色の箔、「rare」などの文字、カードごとに違う光り方）は、借りるときにすべて外しました。

| 部品 | 作者 | URL | どこで使ったか | どう変えたか |
| --- | --- | --- | --- | --- |
| Holographic Foil Card | daiwiikharihar | https://21st.dev/@daiwiikharihar/components/holographic-foil-card | `card.tsx`（`useTilt` と `Shine`。結果のカードとスタート画面のカード） | ポインタの位置を motion value にし、ばね（useSpring）で追わせて rotateX / rotateY と光の位置に変える仕組みはそのまま。虹色の箔と「Holographic rare」の文字はやめ、どのカードにも同じ「ニスの光」と、光が当たったところだけ浮かぶ街路の地紋（マスクで光の位置だけ見せる）にした。スマホでは `touch-action: pan-y` で、横になぞると傾き・縦は普通にスクロールできるようにし、指を離すと水平にもどす。ときどき光の帯が横切る動きを足した。動きを減らす設定では傾けない。 |
| Tilt Flip Card | cesaroeduardo | https://21st.dev/@cesaroeduardo/components/flip-card | `card.tsx`（カードを裏返す）、`deck.tsx`（ガチャで1枚が表になる） | 表と裏を backface-visibility で重ね、外から渡す `flipped` で回す構成と、タップで裏返す操作を借りた。回転を motion のばねに置き換え、裏面をダムカードの裏のような「この街の制度メモ」（保育料・きょうだい・018サポート・医療費・給食費・移住支援金と、それぞれの確からしさ）にした。カード全体を role=button にするとカードの文字がすべてボタン名になるので、裏返しはカードの下の見えるボタン（aria-pressed）でもできるようにし、指で傾けたあとのタップは裏返さない（動いた距離で見分ける）。 |
| Card Hand Gallery | ruixen.ui | https://21st.dev/@ruixen.ui/components/card-hand-gallery | `hand.tsx`（結果の「ほかの街カード」） | 手札の真ん中からの距離で角度と沈み込みを決める扇の計算（rotate = ずれ × 角度、y = abs(rotate) × 1.9）、選んだ1枚だけ持ち上げる見せ方、真ん中のカードの説明だけを出す作り、動きを減らす設定で扇を平らにする扱いを借りた。決まった位置の扇ではなく、スナップ付きの横スクロールに乗せ、スクロール位置から毎フレーム角度・沈み込み・重なり順を計算する形に作り直した。カードを重ねて「手に持った札」に見せ、上へはじいて引き抜く操作は「タップで表に出す」に、左右の送りボタンを足した。 |
| Card stack（Motion 公式の例） | motiondotdev | https://21st.dev/@motiondotdev/components/motion-card-stack | `deck.tsx`（ガチャの山札） | 山札の1枚ずつに sin(index) で決まる「置いたときの小さな傾き」を持たせ、重なり順で少しずつずらす考え方を借りた。指で1枚ずつ後ろへ送る代わりに、山を左右に割ってまぜる動き（リフル2回）→ いちばん上の1枚が飛び出す → 裏返る → 紙片が散る、を motion の `useAnimate` のシーケンスで組んだ（約3秒・とばせる・動きを減らす設定では出さない）。出てくる1枚は計算（rank）のいちばん上で、まぜるのは演出だけ。 |
| Quantity Stepper | arihantcodes（Spectrum UI） | https://21st.dev/@arihantcodes_1f7b8c4d/components/quantity-stepper | `flipcounter.tsx`（子どもの年齢を「めくる」） | 押しっぱなしで加速しながら進む、端まで来ると数字が小さく震える、spinbutton としてのキーボード操作（↑↓・PageUp/Down・Home/End）、ポインタ操作だけを読み上げる live region を借りた。数字が縦に転がる動きを、日めくりのように上の辺を軸に紙がめくれる動き（rotateX）に変え、-1 を「これから（生まれる）」として出すようにした。白いピルを、リングで留めた厚紙の札に。端で止まったときは朱色に光る。文言はすべて日本語に。 |

## 探したが、考え方を参考にしただけのもの（コードは使っていない）
- Grain Light Card（fransederr）https://21st.dev/@fransederr/components/grain-light-card — 「光が当たった線だけが光る」。カードの地紋の光り方の参考。
- Holo Card（rmahammad）https://21st.dev/@rmahammad/components/holo-card — カードの下の影が傾きと一緒に動く考え方。
- Swipe Deck（ddoemonn）、Card Stack（kuratlielia）、Blur Reveal Deck（og）— 山札・手札の操作の比較に見ただけ。

## 21st 以外
- 金額の数字が転がる表示は、入っているライブラリ `@number-flow/react` をそのまま使った（カードの「毎年の差」）。
- 街の絵（10都市）、カードの裏の柄、家族、貯金箱、小銭の山は、すべてこの案のために SVG で描いた（`art.tsx`）。
