// 住む街ガチャ — 市区町村データ（2026年11月1日時点の調査値）
// 「確認済」は公式ページ等で確かめた値、「推定」は根拠つきの見込み、「仮置き」は未確認。
// 数字を足すときは、必ず出典と確からしさを一緒に入れること。
//
// 2つの層がある:
//   CITIES     … 市の制度まで調べた「くわしい街」（detailed）
//   ALL_CITIES … 全国1,741市区町村。くわしい街はそのまま、それ以外は都道府県の制度（pref）か国の制度だけ（basic）
import type { Care, City, Source } from './types'
import { MUNICIPALITIES, PREFS, type Muni } from './municipalities'
import { MEDICAL_R7, RENT_R5 } from './national'

export { PREFS }

const S = {
  tokyoFree: { label: '東京都の保育料 第1子無償化（杉並区の案内）', url: 'https://www.city.suginami.tokyo.jp/guide/kosodate/navi/hoikuryou/1019291.html' },
  adachi: { label: '足立区 保育園の保育料', url: 'https://www.city.adachi.tokyo.jp/kodomo-unei/k-kyoiku/kosodate/hoikuen-hoikuryo.html' },
  kita: { label: '北区 0〜2歳の保育料', url: 'https://www.city.kita.lg.jp/children-edu/childcare/1002975/1002976/1002984/1020563.html' },
  ota: { label: '大田区 保育料の決め方', url: 'https://www.city.ota.tokyo.jp/seikatsu/kodomo/hoiku/hoikuryo/ketteihouhou.html' },
  edogawa: { label: '江戸川区 保育料の無償化', url: 'https://www.city.edogawa.tokyo.jp/e048/kosodate/kosodate/hoiku/azukeru/musyouka.html' },
  t018: { label: '東京都 018サポート', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/kosodate/018/index.html' },
  jil: { label: '労働政策研究・研修機構 都道府県別の有効求人倍率（2025年平均）', url: 'https://www.jil.go.jp/kokunai/blt/backnumber/2026/04/c_01.html' },
  kawaguchiR4: { label: '川口市 保育料徴収基準表（令和4年度）', url: 'https://www.city.kawaguchi.lg.jp/material/files/group/79/tyousyuukijunnhyou_R4.pdf' },
  saitama3: { label: '埼玉県議会 第3子以降の保育料無償化（63市町村）', url: 'https://www.pref.saitama.lg.jp/e1601/gikai-gaiyou/r0509/4/k0210.html' },
  saitamaMed: { label: '埼玉県の子ども医療費（解説サイト）', url: 'https://hojokin-agent.jp/subsidy/66725' },
  soka: { label: '草加市 保育料（令和8年度）', url: 'https://www.city.soka.saitama.jp/cont/s1603/020/010/010/02.html' },
  ichikawa1: { label: '市川市 第1子の保育料無償化（2026年9月〜）', url: 'https://www.city.ichikawa.lg.jp/page/73076.html' },
  ichikawa2: { label: '市川市 第2子以降の保育料無償化（2023年10月〜）', url: 'https://www.city.ichikawa.lg.jp/chi03/0000433736.html' },
  kawasakiSib: { label: '川崎市 きょうだいの保育料', url: 'https://www.city.kawasaki.jp/450/cmsfiles/contents/0000154/154113/tirashi2.pdf' },
  kawasakiFee: { label: '川崎市の保育料の目安（第三者サイト・年度不明）', url: 'https://www.seikatsu-guide.com/keyword/2600/14/14130/' },
  kawasakiMed: { label: '川崎市 小児医療費助成の拡大（2026年9月〜）', url: 'https://www.city.kawasaki.jp/450/cmsfiles/contents/0000181/181307/kakujuu.pdf' },
  yokohamaMed: { label: '横浜市 小児医療費助成（2026年6月〜18歳年度末まで）', url: 'https://www.city.yokohama.lg.jp/kenko-iryo-fukushi/kenko-iryo/iryohijosei/shoni/child.html' },
  sagamiFee: { label: '相模原市の保育料の目安（第三者サイト・年度不明）', url: 'https://www.seikatsu-guide.com/keyword/2600/14/14150/' },
  sagamiMed: { label: '相模原市 医療費助成の拡大（報道）', url: 'https://www.kanaloco.jp/taxonomy/term/1403' },
  osakaFirst: { label: '大阪市 0〜2歳第1子の保育料無償化（2026年9月〜）', url: 'https://www.city.osaka.lg.jp/hodoshiryo/seisakukikakushitsu/0000669117.html' },
  osakaSecond: { label: '大阪市 第2子以降の保育料無償化（報道）', url: 'https://www.bcnretail.com/market/detail/20240225_402969.html' },
  osakaMed: { label: '大阪市 こども医療費助成', url: 'https://www.city.osaka.lg.jp/kodomo/page/0000597952.html' },
  sakai2: { label: '堺市 第2子以降の保育料無償化', url: 'https://www.city.sakai.lg.jp/kosodate/hughug/hoiku/hoikuryou/musyoka.html' },
  sewer: { label: '北九州市上下水道局 大都市の下水道使用料の比較', url: 'https://www.city.kitakyushu.lg.jp/suidou/s00200002.html' },
  sapporoIju: { label: '札幌市 移住支援金（令和8年度）', url: 'https://www.city.sapporo.jp/keizai/koyo/ijyu_shienkin/iju_shienkin0804.html' },
  kagoshimaIju: { label: '鹿児島市 移住支援金の確認表', url: 'https://www.city.kagoshima.lg.jp/koyosuishin/sangyo/koyo/kohoshi/documents/2025checkhyou.pdf' },
  maff: { label: '農林水産省 食料・農業・農村白書（農業産出額）', url: 'https://www.maff.go.jp/j/wpaper/w_maff/r7/r7_h/trend/part1/pdf/c2_1_00.pdf' },
  kumamotoQuake: { label: '内閣府 令和8年熊本地震の被害状況（2026年10月5日）', url: 'https://www.bousai.go.jp/updates/r8kumamoto_jishin/status/pdf/r8kumamoto_jishin_20261005.pdf' },
  jmaQuake: { label: '気象庁 令和8年熊本地震', url: 'https://www.jma.go.jp/jma/menu/20260728_kumamoto_jishin.html' },
  cfaR7: { label: 'こども家庭庁 こどもに係る医療費の助成についての調査（令和7年4月1日時点）', url: 'https://www.cfa.go.jp/policies/boshihoken/kodomoiryouhityousa-r7' },
  rentR5: { label: '総務省統計局 令和5年住宅・土地統計調査 第111-3表（e-Stat、加工して作成）', url: 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040210044&fileKind=0' },
} satisfies Record<string, Source>

const unknownNursery = (note = '0〜2歳の保育料はまだ集めていません。'): City['nursery'] => ({
  firstChildFree: false, secondChild: 'half', thirdChild: 'half', monthly: {}, fiscalYear: '未確認', confidence: '仮置き', note, sources: [],
})

const muniByCode = new Map(MUNICIPALITIES.map((m) => [m.code, m]))
const meta = (code: string) => {
  const m = muniByCode.get(code)
  return m ? { code: m.code, kana: m.kana, lat: m.lat, lng: m.lng, url: m.url, phrase: m.phrase } : { code }
}

const tokyoWard = (id: string, code: string, name: string, src: Source[], confirmed: boolean): City => ({
  id, pref: '東京都', name, region: 'tokyo23', metro: 'shutoken', level: 'detailed', ...meta(code),
  nursery: {
    firstChildFree: true, secondChild: 'free', thirdChild: 'free', monthly: {},
    fiscalYear: '令和8年度', confidence: confirmed ? '確認済' : '推定',
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

// ---------- くわしい街（市の制度まで調べた街） ----------
export const CITIES: City[] = [
  tokyoWard('adachi', '131211', '足立区', [S.adachi], true),
  tokyoWard('kita', '131172', '北区', [S.kita], true),
  tokyoWard('ota', '131113', '大田区', [S.ota], true),
  tokyoWard('edogawa', '131237', '江戸川区', [S.edogawa], true),
  {
    id: 'kawaguchi', pref: '埼玉県', name: '川口市', region: 'saitama', metro: 'shutoken', level: 'detailed', ...meta('112038'),
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
    id: 'soka', pref: '埼玉県', name: '草加市', region: 'saitama', metro: 'shutoken', level: 'detailed', ...meta('112216'),
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
    id: 'ichikawa', pref: '千葉県', name: '市川市', region: 'chiba', metro: 'shutoken', level: 'detailed', ...meta('122033'),
    nursery: {
      firstChildFree: true, secondChild: 'free', thirdChild: 'free', monthly: {},
      fiscalYear: '令和8年度（第1子は2026年9月から）', confidence: '確認済',
      note: '第2子以降は2023年10月から、第1子は2026年9月から、所得制限なしで0円（認可保育園）。',
      sources: [S.ichikawa1, S.ichikawa2],
    },
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '梨', kind: 'food', fact: '市川は梨の産地として知られる。', confidence: '推定' },
    ],
  },
  {
    id: 'kawasaki', pref: '神奈川県', name: '川崎市', region: 'kanagawa', metro: 'shutoken', level: 'detailed', ...meta('141305'),
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'free',
      monthly: { '800_1000': [34400, 34400] },
      fiscalYear: '年度不明（第三者サイトの値）', confidence: '推定',
      note: '所得割20万円・0歳の第1子の目安。ほかの年収帯は確認中。きょうだいの半額・無料は川崎市の資料で確認。',
      sources: [S.kawasakiSib, S.kawasakiFee],
    },
    medical: { coversTo: 18, note: '2026年9月から高校生年代まで。通院の一部負担金も廃止（申請が必要）', confidence: '確認済', sources: [S.kawasakiMed] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '工場夜景', kind: 'industry', fact: '京浜工業地帯の工場夜景で知られる。', confidence: '推定' },
    ],
  },
  {
    id: 'sagamihara', pref: '神奈川県', name: '相模原市', region: 'kanagawa', metro: 'shutoken', level: 'detailed', ...meta('141500'),
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
    id: 'osaka', pref: '大阪府', name: '大阪市', region: 'osaka', metro: 'kansai', level: 'detailed', ...meta('271004'),
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
    id: 'sakai', pref: '大阪府', name: '堺市', region: 'osaka', metro: 'kansai', level: 'detailed', ...meta('271403'),
    nursery: {
      firstChildFree: false, secondChild: 'free', thirdChild: 'free', monthly: {},
      fiscalYear: '令和8年度', confidence: '推定',
      note: '第2子以降の0〜2歳は令和5年度から0円（所得制限なし）。第1子の月額は確認中。',
      sources: [S.sakai2],
    },
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [
      { label: '刃物', kind: 'craft', fact: '堺は包丁などの刃物づくりで知られる。', confidence: '推定' },
    ],
  },
  {
    id: 'sapporo', pref: '北海道', name: '札幌市', region: 'chiho', metro: 'other', level: 'detailed', ...meta('011002'),
    nursery: unknownNursery(),
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    iju: { family: 600000, perChild: 100000, note: '令和8年度の案内。世帯60万円＋18歳未満の子1人10万円。テレワーク要件は廃止。予算に達すると受付終了。', confidence: '推定', sources: [S.sapporoIju] },
    pride: [
      { label: '農業産出額 全国1位', kind: 'food', fact: '北海道は農業産出額が全国1位。', confidence: '推定', source: S.maff },
    ],
  },
  {
    id: 'kagoshima', pref: '鹿児島県', name: '鹿児島市', region: 'chiho', metro: 'other', level: 'detailed', ...meta('462012'),
    nursery: unknownNursery(),
    medical: { coversTo: null, note: '確認中', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    iju: { family: 1000000, perChild: 1000000, note: '子1人あたり最大100万円の加算（市の資料）。世帯の基本額は国の上限どおりと仮定。', confidence: '推定', sources: [S.kagoshimaIju] },
    pride: [
      { label: '桜島', kind: 'nature', fact: '目の前に桜島が見える街。', confidence: '推定' },
    ],
  },
]

// ---------- 国の統計（全国の市区町村） ----------
function nationalMedical(pref: string, name: string): City['medical'] | null {
  const r = MEDICAL_R7[pref + name]
  if (!r) return null
  const [tsuin, , incomeLimit, copay, note] = r
  const ageText = tsuin === 6 ? '小学校に上がる前まで' : `${tsuin}歳の年度末まで`
  return {
    coversTo: tsuin,
    note: `通院は${ageText}${incomeLimit ? '（所得制限あり。年収によっては対象外）' : ''}${copay ? '（一部自己負担あり）' : ''}。令和7年4月1日時点の全国調査${note ? `。${note}` : ''}`,
    confidence: incomeLimit ? '推定' : '確認済',
    sources: [S.cfaR7],
  }
}

function nationalRent(code: string): City['rent'] {
  const r = RENT_R5[code.slice(0, 5)]
  if (!r) return undefined
  const [all, a18] = r
  return { family: a18 ?? all, all, note: '借家に住んでいる世帯が払っている家賃の平均（居住室18〜24畳）。募集家賃より低めに出やすい', source: S.rentR5 }
}

// ---------- 全国（都道府県の制度で下地を作る） ----------
const KUMAMOTO_HIT = new Set(['432024', '432130', '434426', '434442', '434680']) // 八代市・宇城市・嘉島町・甲佐町・氷川町（内閣府の速報で犠牲者が出た市町村）

function careFor(m: Muni): Care | undefined {
  if (m.pref !== '熊本県') return undefined
  return KUMAMOTO_HIT.has(m.code)
    ? { level: 'hit', note: '令和8年熊本地震（2026年7月28日）で大きな被害を受けた街です。順位づけや「損」の演出は出しません。', sources: [S.kumamotoQuake, S.jmaQuake] }
    : { level: 'area', note: '熊本県では令和8年熊本地震（2026年7月28日）で21市町村に災害救助法が適用されました。最新の状況は県と市町村の発表で確かめてください。', sources: [S.kumamotoQuake, S.jmaQuake] }
}

const REGION_BY_PREF: Record<string, City['region']> = { 埼玉県: 'saitama', 神奈川県: 'kanagawa', 千葉県: 'chiba', 大阪府: 'osaka' }
const METRO_BY_PREF: Record<string, City['metro']> = { 東京都: 'shutoken', 埼玉県: 'shutoken', 神奈川県: 'shutoken', 千葉県: 'shutoken', 大阪府: 'kansai', 京都府: 'kansai', 兵庫県: 'kansai', 奈良県: 'kansai' }

function buildFromPref(m: Muni): City {
  const isWard = m.pref === '東京都' && m.name.endsWith('区')
  const city: City = {
    id: m.code, code: m.code, pref: m.pref, name: m.name, kana: m.kana, lat: m.lat, lng: m.lng, url: m.url, phrase: m.phrase,
    region: isWard ? 'tokyo23' : m.pref === '東京都' ? 'tokyo' : REGION_BY_PREF[m.pref] ?? 'chiho',
    metro: METRO_BY_PREF[m.pref] ?? 'other',
    level: 'basic',
    nursery: unknownNursery(),
    medical: { coversTo: null, note: '確認中（全国では9割の市区町村が通院を18歳まで助成）', confidence: '仮置き', sources: [] },
    lunch: { juniorHighFree: null, confidence: '仮置き', sources: [] },
    pride: [],
    care: careFor(m),
  }
  if (m.pref === '東京都') {
    city.level = 'pref'
    city.cash = { label: '018サポート', perChildYearly: 60000, maxAge: 18, confidence: '確認済', sources: [S.t018] }
    city.medical = { coversTo: 18, note: '東京都の制度で高校生年代まで（区市町村が実施）', confidence: '推定', sources: [] }
    city.pride = [{ label: '求人の多さ', kind: 'job', fact: '求人を受け付けた場所で数えた有効求人倍率は、東京が全国1位（1.73倍、2025年平均）。', confidence: '確認済', source: S.jil }]
    if (isWard) {
      city.nursery = { ...unknownNursery(), firstChildFree: true, secondChild: 'free', thirdChild: 'free', fiscalYear: '令和8年度', confidence: '推定', note: '23区は0〜2歳の第1子から0円（2025年9月から。都の補助で区が実施）。この区のページでは未確認。', sources: [S.tokyoFree] }
      city.lunch = { juniorHighFree: true, confidence: '推定', note: '区立中学校の給食費は無償（公開前に区の公式ページで確認）', sources: [] }
    } else {
      city.nursery = { ...unknownNursery('東京都は0〜2歳の第1子の保育料を無償にする市町村に補助している。この市町村の実施状況は確認中。'), secondChild: 'free', thirdChild: 'free', sources: [S.tokyoFree] }
    }
  } else if (m.pref === '埼玉県') {
    city.level = 'pref'
    city.medical = { coversTo: 18, note: '埼玉県は県内全市町村で18歳年度末まで（解説サイトの記述）', confidence: '推定', sources: [S.saitamaMed] }
    city.nursery = { ...unknownNursery('第3子以降は県内すべてで0円。第1子・第2子の月額は確認中。'), thirdChild: 'free', sources: [S.saitama3] }
    city.pride = [{ label: '第3子は保育料0円', kind: 'life', fact: '埼玉県は63市町村すべてで、第3子以降の保育料が無料。', confidence: '確認済', source: S.saitama3 }]
  } else if (m.code === '141003') {
    city.level = 'pref'
    city.medical = { coversTo: 18, note: '2026年6月から18歳年度末まで（申請不要）', confidence: '確認済', sources: [S.yokohamaMed] }
  }
  // 国の全国調査で分かる医療費助成（横浜市は2026年6月の拡大を優先）
  const med = m.code === '141003' ? null : nationalMedical(m.pref, m.name)
  if (med) city.medical = med
  city.rent = nationalRent(m.code)
  return city
}

const FEATURED_BY_CODE = new Map(CITIES.map((c) => [c.code!, c]))
export const ALL_CITIES: City[] = MUNICIPALITIES.map((m) => {
  const f = FEATURED_BY_CODE.get(m.code)
  if (!f) return buildFromPref(m)
  // くわしい街: 医療費が未確認なら国の全国調査で埋める（市の新しい情報があればそちらを優先）
  const med = f.medical.coversTo === null || f.medical.confidence !== '確認済' && f.region !== 'kanagawa' ? nationalMedical(m.pref, m.name) : null
  return { ...f, medical: med ?? f.medical, rent: f.rent ?? nationalRent(m.code), care: f.care ?? careFor(m) }
})

const BY_ID = new Map<string, City>()
for (const c of ALL_CITIES) { BY_ID.set(c.id, c); if (c.code) BY_ID.set(c.code, c) }
for (const c of CITIES) BY_ID.set(c.id, BY_ID.get(c.code!) ?? c)

// id（'adachi' などの短い名前）でも、地方公共団体コード（'131211'）でも引ける
export const cityById = (id: string) => BY_ID.get(id)!

export const DATA_AS_OF = '2026年11月1日'
export const DISCLAIMER = '試作版です。数字は2026年11月1日時点の調査値と推定を含みます。申請の前に、必ず市区町村の窓口で確かめてください。'
export const MUNI_SOURCE: Source = { label: '市区町村の一覧（Code for FUKUI「localgovjp」、CC0）', url: 'https://github.com/code4fukui/localgovjp' }
