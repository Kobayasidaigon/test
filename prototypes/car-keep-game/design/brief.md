# デザイン改善ブリーフ（21st 検索・実装用プロンプト）

## 目的
「この車、あと何年乗るのが一番得？」売り時ゲームの見た目から「AIが作った感じ」を消し、
題材（日本の車・道路・お金の書類）ならではの手触りを持たせる。5つの方向性を、動くゲームのまま比べられるようにする。

## 前提
- 対象：車を持つ30〜50代。SNSからスマホで来て、30秒で遊ぶ
- このページの仕事：条件を入れて走らせ → 売り時を当てさせ → 結果をシェア → 査定へ送る
- 変えないもの：計算・ゲームの流れ・文言の意味。変えるのは見た目と演出だけ
- 守ること：スマホ幅360pxで崩れない／数字は等幅／金額は「万円」／1ファイルHTML（フォントは Google Fonts）

## 「AIっぽさ」の正体（やらないこと）
- どこも同じ角丸・同じ影のカードを並べる
- Inter / Space Grotesk、紫→青グラデ、クリーム×テラコッタ、黒×蛍光1色
- 絵文字の見出し、意味のない 01/02/03、全部中央寄せ

## 各案に必ず入れるもの
1. 題材の世界から借りた素材（書類・標識・メーター・チラシ・ファミコン）
2. 書体の組み合わせ（見出し／本文／数字）
3. 配色トークン（ゲーム画面の空・道路・看板の色まで）
4. 主役になる仕掛けを1つ（ハンコ、針、出口看板、星形の値札、STAGE CLEAR）
5. 21st の参考と、そこから借りた技法

## 21st で実行した検索（get_inspiration）
| 案 | 検索語 | 採用した参考 | 借りた技法 |
|---|---|---|---|
| 1 帳票 | official paper form document UI with stamp seal, ledger grid lines, monospace numbers, receipt style result card | Kokonut UI Receipt Printer（MIT） | 1行ずつ送り出す印字、ギザギザの紙端（conic-gradient マスク） |
| 2 8bit | 8-bit pixel art retro game UI, pixel border buttons, CRT scanlines, arcade score screen | 8bit Main Menu / 8bit Game Over（8bitcn） | ピクセル枠のボタンとカード、ゲーム画面の構成 |
| 3 道路標識 | highway road sign wayfinding UI, bold signage panels, transit signage typography | 該当なし（実物の標識を参照） | 高速道路の緑看板・二重の白縁・出口看板 |
| 4 メーター | car dashboard instrument cluster gauge speedometer animated needle, LCD digits, dark carbon | Segmented LCD Number Ticker / Usage Meter | 7セグメント数字の描き方、針のメーター |
| 5 チラシ | loud retail flyer sale price tag starburst badge, halftone dots, diagonal ribbon, bold poster | Marketing Badges / Badge Tag | 星形バッジ・値札の形 |

21st の AI 生成はこのアカウントで無効（aiGenerationEnabled: false）のため、参考コンポーネントのコードを取得し、技法を素の HTML/CSS/JS に移植した。
