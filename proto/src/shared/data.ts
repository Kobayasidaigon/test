// 住む街ガチャ — 市区町村データ（2026年11月1日時点の調査値）
// 「確認済」は公式ページ等で確かめた値、「推定」は根拠つきの見込み、「仮置き」は未確認。
// 数字を足すときは、必ず出典と確からしさを一緒に入れること。
//
// 2つの層がある:
//   CITIES     … 市の制度まで調べた「くわしい街」（level 'detailed'）。全国データ（国の医療費・家賃・待機児童・災害への配慮）を合わせたあとの City
//   ALL_CITIES … 全国1,741市区町村。くわしい街は合わせたあとの City、それ以外は、県や市区町村の制度が一部わかる街（pref）か、国の全国調査だけ分かる街（basic）
//
// 全国の材料（scripts/gen-national.mjs が national.ts に入れる）の使い方:
//   - くわしい街は、その街の調べを先に使う。全国の材料で埋めるのは、まだ調べていない項目（仮の値のまま・出典なし）だけ
//   - 全国の材料に入っていない街・項目は「確認中」「準備中」のまま（0円・「ない」にしない）
import type { Care, City, Confidence, DataLevel, Source } from './types'
import { MUNICIPALITIES, PREFS, type Muni } from './municipalities'
import { IJU, LUNCH, MEDICAL, MEDICAL_META, NAT_SOURCES, NAT_TEXTS, NURSERY, RENT_R5, WAITLIST_META, WAITLIST_R8 } from './national'
import { DETAILED_20 } from './detailed20'

export { PREFS }

const S = {
  tokyoFree: { label: '東京都の保育料 第1子無償化（杉並区の案内）', url: 'https://www.city.suginami.tokyo.jp/guide/kosodate/navi/hoikuryou/1019291.html' },
  adachi: { label: '足立区 保育園の保育料', url: 'https://www.city.adachi.tokyo.jp/kodomo-unei/k-kyoiku/kosodate/hoikuen-hoikuryo.html' },
  kita: { label: '北区 0〜2歳の保育料', url: 'https://www.city.kita.lg.jp/children-edu/childcare/1002975/1002976/1002984/1020563.html' },
  ota: { label: '大田区 保育料の決め方', url: 'https://www.city.ota.tokyo.jp/seikatsu/kodomo/hoiku/hoikuryo/ketteihouhou.html' },
  edogawa: { label: '江戸川区 保育料の無償化', url: 'https://www.city.edogawa.tokyo.jp/e048/kosodate/kosodate/hoiku/azukeru/musyouka.html' },
  t018: { label: '東京都福祉局 018サポート（令和8年度も子1人に月5,000円、所得制限なし）', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/kosodate/018/index.html' },
  tokyoFirstFree: { label: '東京都福祉局 保育料等の無償化について（第1子の無償化を実施する区市町村を、都が令和7年9月から支援）', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/hoiku/mushouka' },
  kunitachiFree: { label: '国立市 認可保育所等における利用者負担額（保育料）の第1子無償化について', url: 'https://www.city.kunitachi.tokyo.jp/soshiki/Dept04/Div03/Sec01/gyomu/0276/0277/0279/12840.html' },
  tokyoLunchR6: { label: '東京都教育委員会 令和6年度 東京都公立学校給食費負担軽減事業（費用の2分の1を補助）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/information/press/2024/07/2024071602' },
  tokyoLunchAll: { label: '東京都「東京都の少子化対策2025」p.19（都内全ての区市町村で学校給食費を無償化、2025年1月から）', url: 'https://www.spt.metro.tokyo.lg.jp/kodomoseisaku/book/2025-02_tokyo_syoshika2025/pageindices/index19.html' },
  tokyoLunchR8: { label: '東京都「『叶えたい』を支えたいアクションプラン2026」p.42（国の交付金を受けて都の支援のしくみを変更）', url: 'https://www.spt.metro.tokyo.lg.jp/kodomoseisaku/book/202602-kanasasa-actionplan/pageindices/index42.html' },
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
  cfaMed: { label: MEDICAL_META.label, url: MEDICAL_META.url },
  rentR5: { label: '総務省統計局 令和5年住宅・土地統計調査 第111-3表（e-Stat、加工して作成）', url: 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040210044&fileKind=0' },
} satisfies Record<string, Source>

// まだ調べていない街の保育料。国の基準（同時に通う子で数えて2人目は半額・3人目以降は0円）だけを置く。
// 月額の表がないので、お金がかかる子は「確認中」になる
const unknownNursery = (note = '0〜2歳の保育料はまだ集めていません（国の基準だけで計算）。'): City['nursery'] => ({
  firstChildFree: false, secondChild: 'half', thirdChild: 'free', monthly: {}, fiscalYear: '未確認', confidence: '仮置き', note, sources: [],
})
// くわしい街のうち、保育料をまだ調べていない街（unknownNursery のまま）か
const isPlaceholderNursery = (n: City['nursery']) => n.fiscalYear === '未確認' && n.confidence === '仮置き' && !n.sources.length

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
// 最初に調べた13の街。2026年11月1日に調べ終わった20市は detailed20.ts（下で足す）
const FIRST_13: City[] = [
  tokyoWard('adachi', '131211', '足立区', [S.adachi], true),
  tokyoWard('kita', '131172', '北区', [S.kita], true),
  tokyoWard('ota', '131113', '大田区', [S.ota], true),
  tokyoWard('edogawa', '131237', '江戸川区', [S.edogawa], true),
  {
    id: 'kawaguchi', pref: '埼玉県', name: '川口市', region: 'saitama', metro: 'shutoken', level: 'detailed', ...meta('112038'),
    nursery: {
      firstChildFree: false, secondChild: 'half', thirdChild: 'free', thirdCount: 'household',
      monthly: { '400_600': [33000, 33000], '600_800': [44000, 54000], '800_1000': [57000, 57000] },
      fiscalYear: '令和4年度の表で代用（令和8年度は未確認）', confidence: '推定',
      note: '世帯年収から住民税の所得割を推計して階層を当てた目安。2人目の半額は国の基準どおりと仮定。3人目以降は、上の子の年齢を問わず0円（埼玉県の事業）。',
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
      firstChildFree: false, secondChild: 'half', thirdChild: 'free', thirdCount: 'household',
      monthly: { '400_600': [32600, 32600], '600_800': [42000, 47600], '800_1000': [53800, 53800] },
      fiscalYear: '令和8年度', confidence: '推定',
      note: '金額は令和8年度の表。世帯年収から所得割を推計して階層を当てた目安。2人目の半額は国の基準どおりと仮定。3人目以降は、上の子の年齢を問わず0円（埼玉県の事業）。',
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
    iju: { family: 1000000, perChild: 1000000, familyUpTo: true, perChildUpTo: true, note: '子1人あたり最大100万円の加算（市の資料）。世帯の基本額は国の上限（最大100万円）どおりと仮定。', confidence: '推定', sources: [S.kagoshimaIju] },
    pride: [
      { label: '桜島', kind: 'nature', fact: '目の前に桜島が見える街。', confidence: '推定' },
    ],
  },
]

// くわしい街の全部（全国データを合わせる前）。20市には、役所の位置・読みがななどを全国データから足す
const DETAILED_RAW: City[] = [...FIRST_13, ...DETAILED_20.map((c): City => ({ ...c, ...meta(c.code!) }))]

// ---------- 国の統計と全国の材料（national.ts） ----------
const CONF: Confidence[] = ['確認済', '推定', '仮置き']
const natSources = (idx: number[]) => idx.map((i) => NAT_SOURCES[i])
const uniqSources = (list: Source[]) => list.filter((s, i) => list.findIndex((x) => x.url === s.url) === i)

function nationalMedical(pref: string, name: string): City['medical'] | null {
  const r = MEDICAL[pref + name]
  if (!r) return null
  const [tsuin, , incomeLimit, copay, note] = r
  const ageText = tsuin === 6 ? '小学校に上がる前まで' : `${tsuin}歳の年度末まで`
  return {
    coversTo: tsuin,
    note: `通院は${ageText}${incomeLimit ? '（所得制限あり。年収によっては対象外）' : ''}${copay ? '（一部自己負担あり）' : ''}。${MEDICAL_META.asOf}時点の全国調査${note ? `。${note}` : ''}`,
    confidence: incomeLimit ? '推定' : '確認済',
    sources: [S.cfaMed],
  }
}

function nationalRent(code: string): City['rent'] {
  const r = RENT_R5[code.slice(0, 5)]
  if (!r) return undefined
  const [all, a18] = r
  return { family: a18 ?? all, all, note: '借家に住んでいる世帯が払っている家賃の平均（居住室18〜24畳）。募集家賃より低めに出やすい', source: S.rentR5 }
}

// 待機児童（全1,741市区町村が表に載っている。0人も、表に書かれた数）
const WAITLIST_SOURCE: Source = { label: WAITLIST_META.label, url: WAITLIST_META.url }
function nationalWaitlist(m: Muni): City['waitlist'] {
  const count = WAITLIST_R8[m.code]
  if (count === undefined) return undefined
  const kuma = m.pref === '熊本県'
  return {
    count, asOf: WAITLIST_META.asOf, source: WAITLIST_SOURCE,
    note: kuma ? `${WAITLIST_META.note}。${WAITLIST_META.kumamotoNote}` : WAITLIST_META.note,
    confidence: kuma ? '推定' : '確認済',
  }
}

// 中学校の給食費（表にない街は null のまま＝確認中）
function nationalLunch(code: string): City['lunch'] | null {
  const r = LUNCH[code]
  if (!r) return null
  const [free, conf, asOf, note, src] = r
  return { juniorHighFree: free === 1, confidence: CONF[conf], note: `${NAT_TEXTS[note]}（時点: ${NAT_TEXTS[asOf]}）`, sources: natSources(src) }
}

// 移住支援金（表にない街は、iju も ijuCheck も付けない＝準備中）
function nationalIju(code: string): Pick<City, 'iju' | 'ijuCheck'> {
  const r = IJU[code]
  if (!r) return {}
  const sources = natSources(r.src)
  const note = `${NAT_TEXTS[r.note]}（時点: ${NAT_TEXTS[r.asOf]}）`
  if (r.s === 'yes') {
    const cond = r.cn !== undefined ? `子どもの加算は${NAT_TEXTS[r.cn]}。` : ''
    return { iju: { family: r.f!, perChild: r.c!, ...(r.s1 ? { single: r.s1 } : {}), familyUpTo: !!r.fu, perChildUpTo: !!r.cu, note: `${cond}${note}`, confidence: CONF[r.conf], sources } }
  }
  return { ijuCheck: { result: r.s, note, confidence: CONF[r.conf], sources } }
}

// 0〜2歳の保育料の制度を、下地（国の基準・都や県の制度）に重ねる。制度が表にない街は null
function nationalNursery(code: string, base: City['nursery'], extra: Source[] = []): City['nursery'] | null {
  const r = NURSERY[code]
  if (!r) return null
  const n: City['nursery'] = { ...base, monthly: { ...base.monthly } }
  if (r.ff) Object.assign(n, { firstChildFree: true, secondChild: 'free', thirdChild: 'free' })
  if (r.ffu && !n.firstChildFree) n.firstFreeUnder = r.ffu
  if (r.sf && n.secondChild !== 'free') {
    n.secondChild = 'free'
    if (r.sfu) n.secondFreeUnder = r.sfu
    if (r.so) n.secondOnly = true
    if (r.sc === 'h') n.secondCount = 'household'
  }
  if (r.tf && !n.firstChildFree) {
    n.thirdChild = 'free'
    if (r.tc === 'h') n.thirdCount = 'household'
  }
  if (r.fa !== undefined && !n.firstChildFree) n.freeFromAge = r.fa
  if (r.cc !== undefined) n.countConfidence = CONF[r.cc]
  n.confidence = CONF[r.conf]
  n.fiscalYear = NAT_TEXTS[r.asOf]
  n.note = NAT_TEXTS[r.note]
  n.sources = uniqSources([...extra, ...base.sources, ...natSources(r.src)])
  return n
}

// ---------- 全国（都道府県の制度で下地を作り、全国の材料を重ねる） ----------
const KUMAMOTO_HIT = new Set(['432024', '432130', '434426', '434442', '434680']) // 八代市・宇城市・嘉島町・甲佐町・氷川町（内閣府の速報で犠牲者が出た市町村）

function careFor(m: Muni): Care | undefined {
  if (m.pref !== '熊本県') return undefined
  return KUMAMOTO_HIT.has(m.code)
    ? { level: 'hit', note: '令和8年熊本地震（2026年7月28日）で大きな被害を受けた街です。順位づけや「損」の演出は出しません。', sources: [S.kumamotoQuake, S.jmaQuake] }
    : { level: 'area', note: '熊本県では令和8年熊本地震（2026年7月28日）で21市町村に災害救助法が適用されました。最新の状況は県と市町村の発表で確かめてください。', sources: [S.kumamotoQuake, S.jmaQuake] }
}

const REGION_BY_PREF: Record<string, City['region']> = { 埼玉県: 'saitama', 神奈川県: 'kanagawa', 千葉県: 'chiba', 大阪府: 'osaka' }
const METRO_BY_PREF: Record<string, City['metro']> = { 東京都: 'shutoken', 埼玉県: 'shutoken', 神奈川県: 'shutoken', 千葉県: 'shutoken', 大阪府: 'kansai', 京都府: 'kansai', 兵庫県: 'kansai', 奈良県: 'kansai' }

// 東京都の区以外で、第1子の保育料の無償化を市のページでも確かめた市（くわしい街の町田・八王子・調布のほか）。出典に足す
const TOKYO_FIRST_FREE: Record<string, Source> = { '132152': S.kunitachiFree } // 国立市

// 都の全区市町村の給食費の無償化（2025年1月から）。中学校の今年度の値は、全国の材料（lunch-mext.csv）にある街だけ入れる
const tokyoLunch = (): City['lunch'] => ({
  juniorHighFree: null, confidence: '仮置き',
  note: '東京都は2025年1月から全区市町村で給食費を無償化と発表した（都が半分を補助）。令和8年度に都の支援のしくみが変わり、この市町村の中学校がいまも無料かは確認中。',
  sources: [S.tokyoLunchAll, S.tokyoLunchR6, S.tokyoLunchR8],
})

// 段（どこまで分かるか）。くわしい街でなければ、国の基準より先の制度が1つでも分かる街は pref、なければ basic
// （東京圏の中の街は移住支援金の対象外の街が多いので、移住支援金は「実施」と分かった街だけ数える）
export function levelFor(c: City): DataLevel {
  if (c.level === 'detailed') return 'detailed'
  const n = c.nursery
  const nursery = n.firstChildFree || n.firstFreeUnder !== undefined || n.secondChild === 'free' || n.freeFromAge !== undefined ||
    n.secondCount === 'household' || n.thirdCount === 'household' || Object.keys(n.monthly).length > 0
  const iju = !!c.iju || (c.metro !== 'shutoken' && !!c.ijuCheck)
  return nursery || !!c.cash || c.lunch.juniorHighFree !== null || iju ? 'pref' : 'basic'
}

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
    city.cash = { label: '018サポート', perChildYearly: 60000, maxAge: 18, confidence: '確認済', sources: [S.t018] }
    city.medical = { coversTo: 18, note: '東京都の制度で高校生年代まで（区市町村が実施）', confidence: '推定', sources: [] }
    city.pride = [{ label: '求人の多さ', kind: 'job', fact: '求人を受け付けた場所で数えた有効求人倍率は、東京が全国1位（1.73倍、2025年平均）。', confidence: '確認済', source: S.jil }]
    if (isWard) {
      city.nursery = { ...unknownNursery(), firstChildFree: true, secondChild: 'free', thirdChild: 'free', fiscalYear: '令和8年度', confidence: '推定', note: '23区は0〜2歳の第1子から0円（2025年9月から。都の補助で区が実施）。この区のページでは未確認。', sources: [S.tokyoFree] }
      city.lunch = { juniorHighFree: true, confidence: '推定', note: '区立中学校の給食費は無償（区のページでは未確認）', sources: [S.tokyoLunchAll] }
    } else {
      // 第1子の無償化は、都が区市町村を補助するしくみで、実施は区市町村ごと。都の実績（令和7年度）で実施が分かった街は、全国の材料で入れる。
      // 分からない街は、国の基準（同時に通う2人目は半額、3人目は0円）で計算する（月額がないので「確認中」になる）
      city.nursery = { ...unknownNursery('都は2025年9月から、0〜2歳の第1子の保育料を無償にする区市町村を補助している。この市町村が実施しているかは確認中なので、国の基準（同時に通う2人目は半額、3人目は0円）で計算。'), sources: [S.tokyoFirstFree] }
      city.lunch = tokyoLunch()
    }
  } else if (m.pref === '埼玉県') {
    city.medical = { coversTo: 18, note: '埼玉県は県内全市町村で18歳年度末まで（解説サイトの記述）', confidence: '推定', sources: [S.saitamaMed] }
    city.nursery = { ...unknownNursery('第3子以降は、上の子の年齢を問わず県内すべてで0円（県の事業）。第1子・第2子の月額は確認中。'), thirdChild: 'free', thirdCount: 'household', sources: [S.saitama3] }
    city.pride = [{ label: '第3子は保育料0円', kind: 'life', fact: '埼玉県は63市町村すべてで、第3子以降の保育料が無料。', confidence: '確認済', source: S.saitama3 }]
  }
  // 全国の材料を重ねる（保育料の制度・中学校の給食費・移住支援金・待機児童）
  const tokyoBase = m.pref === '東京都' && !isWard ? { ...unknownNursery(''), sources: [S.tokyoFirstFree] } : city.nursery
  const nat = nationalNursery(m.code, tokyoBase, TOKYO_FIRST_FREE[m.code] ? [TOKYO_FIRST_FREE[m.code]] : [])
  if (nat) city.nursery = nat
  const lunch = nationalLunch(m.code)
  if (lunch) city.lunch = lunch
  Object.assign(city, nationalIju(m.code))
  // 国の全国調査で分かる医療費助成（横浜市はくわしい街になったので、ここには来ない）
  const med = nationalMedical(m.pref, m.name)
  if (med) city.medical = med
  city.rent = nationalRent(m.code)
  city.waitlist = nationalWaitlist(m)
  city.level = levelFor(city)
  return city
}

const FEATURED_BY_CODE = new Map(DETAILED_RAW.map((c) => [c.code!, c]))
export const ALL_CITIES: City[] = MUNICIPALITIES.map((m) => {
  const f = FEATURED_BY_CODE.get(m.code)
  if (!f) return buildFromPref(m)
  // くわしい街: 医療費が未確認（または弱い）なら国の全国調査で埋める（神奈川の市は、国の調査より新しい市の情報を優先）
  const weak = f.medical.coversTo === null || (f.medical.confidence !== '確認済' && f.region !== 'kanagawa')
  const natMed = weak ? nationalMedical(m.pref, m.name) : null
  // 調べたが照合で確かめきれなかった市（coversTo が null で出典つき）は、そのメモと出典を国の調査に添える
  const medical = natMed ? (f.medical.coversTo === null && f.medical.sources.length ? { ...natMed, note: `${natMed.note}。${f.medical.note}`, sources: [...natMed.sources, ...f.medical.sources] } : natMed) : f.medical
  // 保育料: まだ調べていない街（unknownNursery のまま）だけ、全国の材料で埋める
  const nursery = isPlaceholderNursery(f.nursery) ? nationalNursery(m.code, f.nursery) ?? f.nursery : f.nursery
  // 給食: まだ調べていない街（値も出典もメモもない）は全国の材料で埋める。値が同じで出典がない街は、出典の付いた全国の材料にする
  const natLunch = nationalLunch(m.code)
  const lunch = natLunch && !f.lunch.sources.length && (f.lunch.juniorHighFree === null ? !f.lunch.note : f.lunch.juniorHighFree === natLunch.juniorHighFree) ? natLunch : f.lunch
  // 移住支援金: 街の調べ（iju・ijuCheck）がなければ全国の材料
  const iju = f.iju || f.ijuCheck ? {} : nationalIju(m.code)
  return { ...f, ...iju, medical, nursery, lunch, rent: f.rent ?? nationalRent(m.code), waitlist: nationalWaitlist(m), care: f.care ?? careFor(m) }
})

const BY_ID = new Map<string, City>()
for (const c of ALL_CITIES) { BY_ID.set(c.id, c); if (c.code) BY_ID.set(c.code, c) }

// くわしい街（level 'detailed'）の一覧。全国データを合わせたあとの City（ALL_CITIES と同じもの）を、くわしい街の並びで
export const CITIES: City[] = DETAILED_RAW.map((c) => BY_ID.get(c.code!)!)
for (const c of CITIES) BY_ID.set(c.id, c)

// id（'adachi' などの短い名前）でも、地方公共団体コード（'131211'）でも引ける
export const cityById = (id: string) => BY_ID.get(id)!

export const DATA_AS_OF = '2026年11月1日'
export const DISCLAIMER = '試作版です。数字は2026年11月1日時点の調査値と推定を含みます。申請の前に、必ず市区町村の窓口で確かめてください。'
export const MUNI_SOURCE: Source = { label: '市区町村の一覧（Code for FUKUI「localgovjp」、CC0）', url: 'https://github.com/code4fukui/localgovjp' }
// 中学校の給食費の全国平均（計算に使う月額の出典）
export const MEXT_LUNCH_SOURCE: Source = { label: '文部科学省 学校給食実施状況等調査 令和7年度（中学校の給食費の全国平均 月6,013円、2026年7月30日公表）', url: 'https://www.mext.go.jp/content/20260730-mxt-kenshoku-000051287_03.pdf' }
// 全国のデータの出典（画面の「ご注意」と site/public/about.html に書く。どれも加工して作成）。
// 保育料の無償化・給食費・移住支援金の街ごとの値は、都道府県・市区町村の公開資料から（出典は項目ごとに付けている）
export const NATIONAL_SOURCES: Source[] = [
  { label: MEDICAL_META.label, url: MEDICAL_META.url },
  S.rentR5,
  { label: WAITLIST_META.label, url: WAITLIST_META.url },
  MEXT_LUNCH_SOURCE,
  { label: '内閣府 地方創生「移住支援金」（制度のしくみ。実施している市町村は都道府県・市町村の案内から）', url: 'https://www.chisou.go.jp/sousei/ijyu_shienkin.html' },
]
