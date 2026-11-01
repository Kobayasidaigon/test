// 住む街ガチャ — 試作用の市区町村データ（2026年11月1日時点の調査値）
// 「確認済」は公式ページ等で確かめた値、「推定」は根拠つきの見込み、「仮置き」は未確認。
// 数字を足すときは、必ず出典と確からしさを一緒に入れること。
import type { City, Source } from './types'

const S = {
  tokyoFree: { label: '東京都の保育料 第1子無償化（杉並区の案内）', url: 'https://www.city.suginami.tokyo.jp/guide/kosodate/navi/hoikuryou/1019291.html' },
  adachi: { label: '足立区 保育園の保育料', url: 'https://www.city.adachi.tokyo.jp/kodomo-unei/k-kyoiku/kosodate/hoikuen-hoikuryo.html' },
  kita: { label: '北区 0〜2歳の保育料', url: 'https://www.city.kita.lg.jp/children-edu/childcare/1002975/1002976/1002984/1020563.html' },
  ota: { label: '大田区 保育料の決め方', url: 'https://www.city.ota.tokyo.jp/seikatsu/kodomo/hoiku/hoikuryo/ketteihouhou.html' },
  t018: { label: '東京都 018サポート', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/kosodate/018/index.html' },
  jil: { label: '労働政策研究・研修機構 都道府県別の有効求人倍率（2025年平均）', url: 'https://www.jil.go.jp/kokunai/blt/backnumber/2026/04/c_01.html' },
  kawaguchiR4: { label: '川口市 保育料徴収基準表（令和4年度）', url: 'https://www.city.kawaguchi.lg.jp/material/files/group/79/tyousyuukijunnhyou_R4.pdf' },
  saitama3: { label: '埼玉県議会 第3子以降の保育料無償化（63市町村）', url: 'https://www.pref.saitama.lg.jp/e1601/gikai-gaiyou/r0509/4/k0210.html' },
  saitamaMed: { label: '埼玉県の子ども医療費（解説サイト）', url: 'https://hojokin-agent.jp/subsidy/66725' },
  soka: { label: '草加市 保育料（令和8年度）', url: 'https://www.city.soka.saitama.jp/cont/s1603/020/010/010/02.html' },
  kawasakiSib: { label: '川崎市 きょうだいの保育料', url: 'https://www.city.kawasaki.jp/450/cmsfiles/contents/0000154/154113/tirashi2.pdf' },
  kawasakiFee: { label: '川崎市の保育料の目安（第三者サイト・年度不明）', url: 'https://www.seikatsu-guide.com/keyword/2600/14/14130/' },
  sagamiFee: { label: '相模原市の保育料の目安（第三者サイト・年度不明）', url: 'https://www.seikatsu-guide.com/keyword/2600/14/14150/' },
  sagamiMed: { label: '相模原市 医療費助成の拡大（報道）', url: 'https://www.kanaloco.jp/taxonomy/term/1403' },
  osakaFirst: { label: '大阪市 0〜2歳第1子の保育料無償化（2026年9月〜）', url: 'https://www.city.osaka.lg.jp/hodoshiryo/seisakukikakushitsu/0000669117.html' },
  osakaSecond: { label: '大阪市 第2子以降の保育料無償化（報道）', url: 'https://www.bcnretail.com/market/detail/20240225_402969.html' },
  osakaMed: { label: '大阪市 こども医療費助成', url: 'https://www.city.osaka.lg.jp/kodomo/page/0000597952.html' },
  sewer: { label: '北九州市上下水道局 大都市の下水道使用料の比較', url: 'https://www.city.kitakyushu.lg.jp/suidou/s00200002.html' },
  sapporoIju: { label: '札幌市 移住支援金（令和8年度）', url: 'https://www.city.sapporo.jp/keizai/koyo/ijyu_shienkin/iju_shienkin0804.html' },
  kagoshimaIju: { label: '鹿児島市 移住支援金の確認表', url: 'https://www.city.kagoshima.lg.jp/koyosuishin/sangyo/koyo/kohoshi/documents/2025checkhyou.pdf' },
  maff: { label: '農林水産省 食料・農業・農村白書（農業産出額）', url: 'https://www.maff.go.jp/j/wpaper/w_maff/r7/r7_h/trend/part1/pdf/c2_1_00.pdf' },
} satisfies Record<string, Source>

const tokyoWard = (id: string, name: string, src: Source[]): City => ({
  id, pref: '東京都', name, region: 'tokyo23', metro: 'shutoken',
  nursery: {
    firstChildFree: true, secondChild: 'free', thirdChild: 'free', monthly: {},
    fiscalYear: '令和8年度', confidence: '確認済',
    note: '認可保育所等の0〜2歳児クラスは、住民税を払っている世帯の第1子も0円（2025年9月から）。延長保育料は別。',
    sources: [...src, S.tokyoFree],
  },
  cash: { label: '018サポート', perChildYearly: 60000, maxAge: 18, confidence: '確認済', sources: [S.t018] },
  medical: { coversTo: 18, note: '区の制度で高校生年代まで', confidence: '推定', sources: [] },
  lunch: { juniorHighFree: true, confidence: '推定', note: '区立中学校の給食費は無償（公開前に区の公式ページで確認）', sources: [] },
  pride: [
    { label: '求人の多さ', kind: 'job', fact: '求人を受け付けた場所で数えた有効求人倍率は、東京が全国1位（1.73倍、2025年平均）。', confidence: '確認済', source: S.jil },
  ],
})

export const CITIES: City[] = [
  tokyoWard('adachi', '足立区', [S.adachi]),
  tokyoWard('kita', '北区', [S.kita]),
  tokyoWard('ota', '大田区', [S.ota]),
  {
    id: 'kawaguchi', pref: '埼玉県', name: '川口市', region: 'saitama', metro: 'shutoken',
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'free',
      monthly: { '400_600': [33000, 33000], '600_800': [44000, 54000], '800_1000': [57000, 57000] },
      fiscalYear: '令和4年度の表で代用（令和8年度は未確認）', confidence: '推定',
      note: '世帯年収から住民税の所得割を推計して階層を当てた目安。2人目の半額は国の基準どおりと仮定。',
      sources: [S.kawaguchiR4, S.saitama3],
    },
    medical: { coversTo: 18, note: '埼玉県は県内全市町村で18歳年度末まで（解説サイトの記述）', confidence: '推定', sources: [S.saitamaMed] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '鋳物のまち', kind: 'craft', fact: '川口は昔から鋳物（いもの）づくりで知られる街。', confidence: '推定' },
      { label: '第3子は保育料0円', kind: 'life', fact: '埼玉県は63市町村すべてで、第3子以降の保育料が無料。', confidence: '確認済', source: S.saitama3 },
    ],
  },
  {
    id: 'soka', pref: '埼玉県', name: '草加市', region: 'saitama', metro: 'shutoken',
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'free',
      monthly: { '400_600': [32600, 32600], '600_800': [42000, 47600], '800_1000': [53800, 53800] },
      fiscalYear: '令和8年度', confidence: '推定',
      note: '金額は令和8年度の表。世帯年収から所得割を推計して階層を当てた目安。2人目の半額は国の基準どおりと仮定。',
      sources: [S.soka, S.saitama3],
    },
    medical: { coversTo: 18, note: '埼玉県は県内全市町村で18歳年度末まで（解説サイトの記述）', confidence: '推定', sources: [S.saitamaMed] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '草加せんべい', kind: 'food', fact: '草加は、せんべいの街として知られる。', confidence: '推定' },
      { label: '第3子は保育料0円', kind: 'life', fact: '埼玉県は63市町村すべてで、第3子以降の保育料が無料。', confidence: '確認済', source: S.saitama3 },
    ],
  },
  {
    id: 'kawasaki', pref: '神奈川県', name: '川崎市', region: 'kanagawa', metro: 'shutoken',
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'free',
      monthly: { '800_1000': [34400, 34400] },
      fiscalYear: '年度不明（第三者サイトの値）', confidence: '推定',
      note: '所得割20万円・0歳の第1子の目安。ほかの年収帯は確認中。きょうだいの半額・無料は川崎市の資料で確認。',
      sources: [S.kawasakiSib, S.kawasakiFee],
    },
    medical: { coversTo: 18, note: '2026年9月から高校生年代まで（医療機関の記事による）', confidence: '推定', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '工場夜景', kind: 'industry', fact: '京浜工業地帯の工場夜景で知られる。', confidence: '推定' },
    ],
  },
  {
    id: 'sagamihara', pref: '神奈川県', name: '相模原市', region: 'kanagawa', metro: 'shutoken',
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'half',
      monthly: { '800_1000': [43600, 43600] },
      fiscalYear: '年度不明（第三者サイトの値）', confidence: '推定',
      note: '所得割20万円・0歳の第1子の目安。ほかの年収帯ときょうだいの扱いは確認中。',
      sources: [S.sagamiFee],
    },
    medical: { coversTo: 15, note: '2027年4月から18歳まで広げると報道（見出しのみ確認）', confidence: '推定', sources: [S.sagamiMed] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '宇宙のまち', kind: 'industry', fact: 'JAXAの相模原キャンパスがあり、宇宙のまちとして知られる。', confidence: '推定' },
    ],
  },
  {
    id: 'osaka', pref: '大阪府', name: '大阪市', region: 'osaka', metro: 'kansai',
    nursery: {
      firstChildFree: true, secondChild: 'free', thirdChild: 'free', monthly: {},
      fiscalYear: '令和8年度（第1子は2026年9月から）', confidence: '確認済',
      note: '0〜2歳の第2子以降は2024年9月から、第1子は2026年9月から無料（認可の保育所など）。',
      sources: [S.osakaFirst, S.osakaSecond],
    },
    medical: { coversTo: 18, note: '所得制限は2024年4月に撤廃', confidence: '推定', sources: [S.osakaMed] },
    lunch: { juniorHighFree: true, confidence: '推定', note: '市立中学校の給食費は無償（公開前に市の公式ページで確認）', sources: [] },
    pride: [
      { label: '下水道代が安い', kind: 'life', fact: '下水道使用料（20㎥/月）は、大都市19都市で大阪市がいちばん安い（1,276円）。', confidence: '確認済', source: S.sewer },
      { label: '粉もん', kind: 'food', fact: 'たこ焼き・お好み焼きの街。', confidence: '推定' },
    ],
  },
  {
    id: 'sapporo', pref: '北海道', name: '札幌市', region: 'chiho', metro: 'other',
    nursery: { firstChildFree: false, secondChild: 'half', thirdChild: 'free', monthly: {}, fiscalYear: '未確認', confidence: '仮置き', sources: [] },
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    iju: { family: 600000, perChild: 100000, note: '令和8年度。世帯60万円＋18歳未満の子1人10万円。テレワーク要件は廃止。予算に達すると受付終了。', confidence: '確認済', sources: [S.sapporoIju] },
    pride: [
      { label: '農業産出額 全国1位', kind: 'food', fact: '北海道は農業産出額が全国1位。', confidence: '推定', source: S.maff },
    ],
  },
  {
    id: 'kagoshima', pref: '鹿児島県', name: '鹿児島市', region: 'chiho', metro: 'other',
    nursery: { firstChildFree: false, secondChild: 'half', thirdChild: 'free', monthly: {}, fiscalYear: '未確認', confidence: '仮置き', sources: [] },
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    iju: { family: 1000000, perChild: 1000000, note: '子1人あたり最大100万円の加算（市の資料）。世帯の基本額は国の上限どおりと仮定。', confidence: '推定', sources: [S.kagoshimaIju] },
    pride: [
      { label: '桜島', kind: 'nature', fact: '目の前に桜島が見える街。', confidence: '推定' },
    ],
  },
]

export const cityById = (id: string) => CITIES.find((c) => c.id === id)!

export const DATA_AS_OF = '2026年11月1日'
export const DISCLAIMER = '試作版です。数字は2026年11月1日時点の調査値と推定を含みます。申請の前に、必ず市区町村の窓口で確かめてください。'
