// 画面や LP に事実を書くときの、出典の一覧。
// 「対象外」の理由（税の申告、法人格のある団体）や、和暦の計算のもとになる事実を、ここにまとめる。
//
// 【大事な注意】確かめ方（how）について
// この一覧は 2026-11-14 に作った。そのときの作業環境からは、下の公式サイト（国税庁、総務省、内閣府、e-Gov）の
// ページを直接開けなかった（接続が許可されていなかった）。そのため、どれも
// 「検索結果に出た、公式サイトのページの抜粋」で確かめたものにとどまる（how: 'search-excerpt'）。
// 公開の前に、運営者が URL を開いて、claim の文と合っていることを確かめ、how を 'page' に書きかえること。
// 確かめられなかったことは、ここに入れていない（src/core/README.md の「できていないこと・あやしいところ」を見る）。

export type Fact = {
  id: string
  /** 事実を、ふつうの言葉で短く書いたもの。画面に出すときは、この範囲をこえて言い切らない */
  claim: string
  /** 出典 */
  source: {
    /** 文書の名前 */
    title: string
    /** 出している役所 */
    publisher: string
    url: string
  }
  /** 根拠になる条文や通達の番号（あれば） */
  basis?: string
  /** 確かめた日 */
  checkedOn: string
  /**
   * 確かめ方。
   *   'page' … ページを開いて、本文で確かめた
   *   'search-excerpt' … 検索結果に出た、公式サイトのページの抜粋で確かめた（本文は開けていない）
   */
  how: 'page' | 'search-excerpt'
}

export const FACTS: Fact[] = [
  {
    id: 'tax-revenue-business',
    claim:
      '法人でない団体（町内会、PTA、サークルなど。税の決まりでは「人格のない社団等」と呼ばれることがある）でも、' +
      '決まりで定められた「収益事業」にあたる事業を行うと、その事業のもうけには法人税がかかる。',
    source: {
      title: '法人税基本通達 第15章 第1節 第1款「共通事項」（15-1-1）',
      publisher: '国税庁',
      url: 'https://www.nta.go.jp/law/tsutatsu/kihon/hojin/15/15_01_01.htm',
    },
    basis: '法人税法 第4条第1項、法人税基本通達 15-1-1',
    checkedOn: '2026-11-14',
    how: 'search-excerpt',
  },
  {
    id: 'tax-revenue-business-law',
    claim: '人格のない社団等が法人税を納める義務を負うのは、収益事業を行う場合などに限られる。',
    source: {
      title: '法人税法（昭和40年法律第34号）',
      publisher: 'e-Gov 法令検索（デジタル庁）',
      url: 'https://laws.e-gov.go.jp/law/340AC0000000034',
    },
    basis: '法人税法 第4条第1項',
    checkedOn: '2026-11-14',
    how: 'search-excerpt',
  },
  {
    id: 'ninka-chien',
    claim:
      '市町村長の認可を受けた町内会・自治会（認可地縁団体）は法人格を持ち、財産目録を作って事務所に備えておくことが、法律で決められている。',
    source: {
      title: '認可地縁団体制度の概要',
      publisher: '総務省',
      url: 'https://www.soumu.go.jp/main_content/000466332.pdf',
    },
    basis: '地方自治法 第260条の2、第260条の4第1項',
    checkedOn: '2026-11-14',
    how: 'search-excerpt',
  },
  {
    id: 'npo-reports',
    claim:
      'NPO法人は、毎年度、事業報告書、活動計算書、貸借対照表、財産目録などを作り、所轄庁に出すことが、法律で決められている。',
    source: {
      title: '内閣府NPOホームページ「事業報告書等」',
      publisher: '内閣府',
      url: 'https://www.npo-homepage.go.jp/qa/ninshouseido/ninshou-houkoku',
    },
    basis: '特定非営利活動促進法',
    checkedOn: '2026-11-14',
    how: 'search-excerpt',
  },
  {
    id: 'reiwa-start',
    claim: '元号「令和」は、2019年（平成31年）5月1日から使われている。',
    source: {
      title: '元号について（元号を改める政令 平成31年政令第143号）',
      publisher: '内閣府',
      url: 'https://www.cao.go.jp/others/soumu/gengou/index.html',
    },
    basis: '元号を改める政令（平成31年政令第143号）附則',
    checkedOn: '2026-11-14',
    how: 'search-excerpt',
  },
]

/** id で出典を引く。 */
export function findFact(id: string): Fact | undefined {
  return FACTS.find((f) => f.id === id)
}
