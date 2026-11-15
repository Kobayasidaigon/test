import { formatDateJa, parseDate } from './format'

// 根拠にしている資料の一覧（出典）。
//
// 決めごと:
// - ここに入れるのは、法令と、国・自治体・公的な法人が出している資料だけ。まとめサイトや不動産会社の記事は入れない。
// - 確かめた日（verifiedOn）を必ず持たせる。画面には「ルールの最終確認日」として RULES_VERIFIED_ON を出す。
// - 確かめ方（verifiedBy）を正直に持たせる。2026-11-14 の確認では、作業した環境から官公庁のサイトを直接開けなかった
//   （WebFetch は名前解決に失敗、curl は通信の制限で 403）。そのため、検索の対象を公式サイトのドメインに絞り、
//   検索結果に出た公式ページの本文の抜粋で、該当する記述を確かめた（'official-site-search'）。
//   抜粋で確かめられなかった事実は、ルールに入れていない（README の「確かめられなかったこと」を参照）。
//   公開の前に、運営者がそれぞれの URL を開いて、もう一度確かめること。

/**
 * ルール（項目のデータと出典）を最後に確かめた日。道具とページに出す。
 * 運営者が出典を確かめ直したら、最後に確かめた日に直す（README の「公開の前に、運営者がやること 1」）。
 */
export const RULES_VERIFIED_ON = '2026-11-14'

/**
 * 公式サイトを対象にした検索で確かめた日。
 * RULES_VERIFIED_ON と分けてあるのは、運営者が RULES_VERIFIED_ON を直したときに、まだ原文で確かめていない出典の
 * 「確かめた日」まで一緒に新しくなって、「（新しい日）に、検索で確認」という、事実と違う表示になるのを防ぐため。
 */
const SEARCH_VERIFIED_ON = '2026-11-14'

export type SourceKind =
  | 'law' // 法律
  | 'notice' // 告示・通達
  | 'guideline' // ガイドライン・事例集
  | 'gov-page' // 国の機関の案内ページ
  | 'consumer-center' // 国民生活センター・自治体の消費生活センター
  | 'public-corp' // 公的な法人（法テラス）

export type VerifiedBy =
  | 'official-site-search' // 公式サイトを対象にした検索の結果に出る、公式ページの本文の抜粋で確かめた（ページそのものは開けていない）
  | 'official-page' // 公式のページ（PDF を含む）を開いて、原文で確かめた

export type Source = {
  id: string
  /** 文書名。 */
  title: string
  /** 発行元。 */
  publisher: string
  /** 公式サイトの URL。 */
  url: string
  kind: SourceKind
  /** 版や日付（わかる範囲で）。 */
  edition?: string
  /** 文書の中の場所（わかる範囲で）。 */
  place?: string
  /** 確かめた日。 */
  verifiedOn: string
  /** 確かめ方。 */
  verifiedBy: VerifiedBy
}

/**
 * 出典に共通の、確かめた日と確かめ方（2026-11-14 の、検索での確認）。
 * 原文で確かめた出典には、`...on` のあとに `verifiedBy: 'official-page', verifiedOn: '確かめた日'` を書いて、上書きする。
 * ここ（on）は、直さなくてよい。
 */
const on = { verifiedOn: SEARCH_VERIFIED_ON, verifiedBy: 'official-site-search' } as const

export const sources = {
  // ---- 仲介手数料 ----
  'takken-kokuji': {
    id: 'takken-kokuji',
    title: '宅地建物取引業者が宅地又は建物の売買等に関して受けることができる報酬の額（昭和45年建設省告示第1552号）',
    publisher: '国土交通省',
    url: 'https://www.mlit.go.jp/totikensangyo/const/1_6_bt_000266.html',
    kind: 'notice',
    edition: '最終改正 令和6年国土交通省告示第949号（令和6年7月1日施行）',
    place: '第四 貸借の媒介に関する報酬の額。宅地建物取引業法 第46条にもとづく告示（国土交通省「宅地建物取引業法関係」のページに掲載）',
    ...on,
  },
  'mlit-consumer-notice': {
    id: 'mlit-consumer-notice',
    title: '＜消費者の皆様向け＞不動産取引に関するお知らせ',
    publisher: '国土交通省',
    url: 'https://www.mlit.go.jp/totikensangyo/const/1_6_bf_000013.html',
    kind: 'gov-page',
    place: '賃貸の仲介手数料の上限の説明',
    ...on,
  },
  'takken-kaishaku': {
    id: 'takken-kaishaku',
    title: '宅地建物取引業法の解釈・運用の考え方',
    publisher: '国土交通省',
    url: 'https://www.mlit.go.jp/totikensangyo/const/content/001881261.pdf',
    kind: 'notice',
    edition: '令和8年4月1日施行版',
    place: '告示第四関係（承諾の時期）、重要事項説明書の様式（借賃以外に授受される金額）',
    ...on,
  },
  'mlit-jireishu': {
    id: 'mlit-jireishu',
    title: '民間賃貸住宅に関する相談対応事例集（再改訂版）',
    publisher: '賃貸借トラブルに係る相談対応研究会（国土交通省のサイトで公開）',
    url: 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000117.html',
    kind: 'guideline',
    edition: '令和4年3月',
    ...on,
  },
  // ---- 原状回復（鍵、クリーニング）----
  'genjo-guideline': {
    id: 'genjo-guideline',
    title: '原状回復をめぐるトラブルとガイドライン（再改訂版）',
    publisher: '国土交通省 住宅局',
    url: 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000020.html',
    kind: 'guideline',
    edition: '平成23年8月',
    place: '別表1「損耗・毀損の事例区分（部位別）一覧表」の「設備、その他（鍵など）」',
    ...on,
  },
  'genjo-qa': {
    id: 'genjo-qa',
    title: '「原状回復をめぐるトラブルとガイドライン」（再改訂版）のQ&A',
    publisher: '国土交通省',
    url: 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000024.html',
    kind: 'guideline',
    place: 'Q16（クリーニング特約）',
    ...on,
  },
  'mlit-ryuiten': {
    id: 'mlit-ryuiten',
    title: '賃貸住宅の入居・退去に係る留意点',
    publisher: '国土交通省',
    url: 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000026.html',
    kind: 'gov-page',
    ...on,
  },
  'tokyo-guideline': {
    id: 'tokyo-guideline',
    title: '賃貸住宅トラブル防止ガイドライン（第4版）',
    publisher: '東京都 住宅政策本部',
    url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/fudosan/tintai/310-3',
    kind: 'guideline',
    edition: '令和4年12月',
    ...on,
  },
  // ---- 民法（敷金、通常の使用による傷み）----
  minpo: {
    id: 'minpo',
    title: '民法（明治29年法律第89号）第621条、第622条の2',
    publisher: 'e-Gov 法令検索（デジタル庁）',
    url: 'https://laws.e-gov.go.jp/law/129AC0000000089',
    kind: 'law',
    place: '第621条（賃借人の原状回復義務）、第622条の2（敷金）',
    ...on,
  },
  'moj-chintai': {
    id: 'moj-chintai',
    title: '2020年4月1日から 賃貸借契約に関する民法のルールが変わります',
    publisher: '法務省',
    url: 'https://www.moj.go.jp/content/001399957.pdf',
    kind: 'gov-page',
    place: '敷金、原状回復の説明',
    ...on,
  },
  // ---- 消費生活センターなどの案内 ----
  'tokyo-kurashi-hoken': {
    id: 'tokyo-kurashi-hoken',
    title: '消費生活相談FAQ「賃貸住宅を契約するとき不動産仲介業者に火災保険を勧められたが、必要か。」',
    publisher: '東京都 消費生活総合センター（東京くらしWEB）',
    url: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/faq/main/94.html',
    kind: 'consumer-center',
    ...on,
  },
  'tokyo-kurashi-hajimete': {
    id: 'tokyo-kurashi-hajimete',
    title: '令和6年度第3テーマ「初めて住まいを借りるなら、ここに着目！」',
    publisher: '東京都 消費生活総合センター（東京くらしWEB）',
    url: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/wakamono/omiminiiretai/reiwa06tokushu-03.html',
    kind: 'consumer-center',
    ...on,
  },
  'kokusen-wakamono10': {
    id: 'kokusen-wakamono10',
    title: '【若者向け注意喚起シリーズ＜No.10＞】新しいお部屋で新生活！「賃貸借契約」を理解して、トラブルを防ごう！！',
    publisher: '国民生活センター',
    url: 'https://www.kokusen.go.jp/news/data/n-20220303_1.html',
    kind: 'consumer-center',
    edition: '2022年3月3日発表',
    ...on,
  },
  'saitama-jirei': {
    id: 'saitama-jirei',
    title: '消費生活相談事例「新生活スタートの季節、賃貸借契約トラブルにご注意！」',
    publisher: '埼玉県 消費生活支援センター',
    url: 'https://www.pref.saitama.lg.jp/b0304/soudanjirei/20240225.html',
    kind: 'consumer-center',
    edition: '2024年2月',
    ...on,
  },
  // ---- 広告の表示 ----
  'caa-stealth': {
    id: 'caa-stealth',
    title: '令和5年10月1日からステルスマーケティングは景品表示法違反となります。',
    publisher: '消費者庁',
    url: 'https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing',
    kind: 'gov-page',
    place: '「一般消費者が事業者の表示であることを判別することが困難である表示」（令和5年内閣府告示第19号）の説明',
    ...on,
  },
  // ---- 相談先 ----
  'caa-188': {
    id: 'caa-188',
    title: '消費者ホットライン',
    publisher: '消費者庁',
    url: 'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/',
    kind: 'gov-page',
    ...on,
  },
  'kokusen-map': {
    id: 'kokusen-map',
    title: '全国の消費生活センター等',
    publisher: '国民生活センター',
    url: 'https://www.kokusen.go.jp/map/',
    kind: 'consumer-center',
    ...on,
  },
  'houterasu-dial': {
    id: 'houterasu-dial',
    title: 'お電話でのお問合せ（法テラス・サポートダイヤル）',
    publisher: '日本司法支援センター（法テラス）',
    url: 'https://www.houterasu.or.jp/site/soudanmadoguchi-houseido/support-dial.html',
    kind: 'public-corp',
    ...on,
  },
} as const satisfies Record<string, Source>

export type SourceId = keyof typeof sources

/** 出典を1つ取り出す。 */
export function getSource(id: SourceId): Source {
  return sources[id]
}

/** 出典の一覧（LP の「根拠にしている資料」に出す）。 */
export function listSources(): Source[] {
  return Object.values(sources)
}

/**
 * 確かめ方についての、正直なことわり書き。資料の一覧、解説ページ、点検の結果、「このサイトについて」に出す。
 *
 * 2026-11-14 の確認は、作業した環境から官公庁のサイトを開けなかったので、公式サイトを対象にした検索で行った
 * （①の担当と④の担当が、別々に検索して、同じ記述が出ることを確かめた）。「確認」とだけ書くと、
 * 原文のページを開いて読んだように見えるので、どう確かめたかを、画面にも書く。
 *
 * 運用: 運営者が URL を1つずつ開いて原文で確かめたら、その出典の verifiedBy を 'official-page' に、
 * verifiedOn をその日にする。途中（一部だけ原文で確かめた）のあいだは、まだ済んでいない件数を言う。
 * 全部の出典が 'official-page' になると、この文は null になり、画面から消える。
 */
export function buildVerifyMethodNote(list: Source[]): string | null {
  const bySearch = list.filter((s) => s.verifiedBy === 'official-site-search')
  if (bySearch.length === 0) return null
  // （Array の at() は、少し古い iPhone の Safari にないので、使わない。）
  const dates = bySearch.map((s) => s.verifiedOn).sort()
  const date = formatDateJa(dates[dates.length - 1])
  const tail = '大事な判断の前には、リンク先の原文を、ご自身でも確かめてください。'
  if (bySearch.length === list.length) {
    return `${date}の確認は、それぞれの公式サイトを対象にした検索で行いました。検索結果に出る公式ページの本文の抜粋で、該当する記述があることを確かめています。資料のページそのものを開いての確認は、まだ済んでいません。${tail}`
  }
  return `資料の${list.length}件のうち${bySearch.length}件は、${date}に、それぞれの公式サイトを対象にした検索で確かめたものです（検索結果に出る公式ページの本文の抜粋で、該当する記述があることを確かめています）。この${bySearch.length}件は、資料のページそのものを開いての確認が、まだ済んでいません。${tail}`
}

export const VERIFY_METHOD_NOTE: string | null = buildVerifyMethodNote(Object.values(sources))

/** 出典ごとの「いつ、どう確かめたか」（例:「2026年11月14日に、検索で確認」）。 */
export function verifiedLabel(source: Source): string {
  return `${formatDateJa(source.verifiedOn)}に、${source.verifiedBy === 'official-page' ? '原文で確認' : '検索で確認'}`
}

/** 出典の種類の、画面に出す名前。 */
export const sourceKindLabel: Record<SourceKind, string> = {
  law: '法律',
  notice: '告示・通達',
  guideline: 'ガイドライン・事例集',
  'gov-page': '国の機関の案内',
  'consumer-center': '消費生活センターなどの案内',
  'public-corp': '公的な法人の案内',
}

/**
 * 出典の「確かめた日」「確かめ方」と、ルールの最終確認日の、つじつまを確かめる。
 * おかしなところを、直し方つきの文で返す（なければ、空の配列）。
 *
 * テスト（items.test.ts）が、これを使う。値そのもの（'2026-11-14' など）を決め打ちで確かめると、
 * 運営者が README の手順どおりに出典を確かめ直しただけで、テストが落ちてしまう。確かめるのは、形と決まりだけにする。
 *
 * - 確かめた日は、暦にある日（YYYY-MM-DD）で、今日より先ではない。
 * - 確かめ方は、'official-site-search' か 'official-page'。
 * - ルールの最終確認日は、暦にある日で、今日より先ではなく、出典の確かめた日のうち、いちばん新しい日より先でもない
 *   （どの出典も確かめていない日を、「最終確認日」として画面に出さないため）。
 *   出典を1件ずつ確かめている途中で、最終確認日のほうが古いのは、かまわない。
 */
export function findSourceProblems(list: Source[], rulesVerifiedOn: string, today: string): string[] {
  const problems: string[] = []
  const methods: string[] = ['official-site-search', 'official-page'] satisfies VerifiedBy[]
  for (const s of list) {
    if (!parseDate(s.verifiedOn)) {
      problems.push(`出典「${s.id}」の verifiedOn（${s.verifiedOn}）が、'2027-01-10' の形の、暦にある日になっていません。`)
    } else if (s.verifiedOn > today) {
      problems.push(`出典「${s.id}」の verifiedOn（${s.verifiedOn}）が、今日（${today}）より先の日になっています。`)
    }
    if (!methods.includes(s.verifiedBy)) {
      problems.push(`出典「${s.id}」の verifiedBy（${s.verifiedBy}）は、'official-site-search' か 'official-page' のどちらかにしてください。`)
    }
  }
  if (!parseDate(rulesVerifiedOn)) {
    problems.push(`RULES_VERIFIED_ON（${rulesVerifiedOn}）が、'2027-01-10' の形の、暦にある日になっていません。`)
    return problems
  }
  if (rulesVerifiedOn > today) problems.push(`RULES_VERIFIED_ON（${rulesVerifiedOn}）が、今日（${today}）より先の日になっています。`)
  const dates = list.map((s) => s.verifiedOn).filter((d) => parseDate(d)).sort()
  const newest: string | undefined = dates[dates.length - 1]
  if (newest !== undefined && rulesVerifiedOn > newest) {
    problems.push(
      `RULES_VERIFIED_ON（${rulesVerifiedOn}）が、どの出典の確かめた日（いちばん新しいのは ${newest}）よりも、先の日になっています。確かめた出典に verifiedOn: '確かめた日' を書いてから、RULES_VERIFIED_ON を直してください。`,
    )
  }
  return problems
}
