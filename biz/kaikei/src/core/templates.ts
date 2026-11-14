// 新しく始めるときのひな形（団体の種類ごとの科目、役の呼び名など）。
// 任意団体の科目に決まった形はないので、これは「よくある名前の一例」。
// 画面では「団体の規約と、前の年の資料に合わせて変えてください」と添えること。
import type { CustodyItem, OrgKind, RoleNames, Side } from './types'

export type OrgKindInfo = {
  kind: OrgKind
  /** 選ぶ画面に出す名前 */
  label: string
  /** ひとこと説明 */
  description: string
}

export const ORG_KINDS: OrgKindInfo[] = [
  { kind: 'chonaikai', label: '町内会・自治会', description: '町内会、自治会、班、老人クラブなど' },
  { kind: 'kodomokai', label: '子ども会', description: '子ども会、育成会、スポーツ少年団など' },
  { kind: 'pta', label: 'PTA', description: 'PTA、保護者会、父母の会など' },
  { kind: 'circle', label: 'サークル', description: '趣味やスポーツのサークル、同好会など' },
  { kind: 'other', label: 'そのほか', description: '科目を、自分で一から作る' },
]

export type CategoryTemplate = { side: Side; name: string }

const income = (name: string): CategoryTemplate => ({ side: 'income', name })
const expense = (name: string): CategoryTemplate => ({ side: 'expense', name })

// 「前年度繰越金」は科目ではなく、置き場所の年度はじめの残高から自動で出すので、ここには入れない。
// 「バザーの売上」のように、税の申告がからむかもしれない科目は、ひな形に入れていない（このサービスの対象外のため）。
const CATEGORY_TEMPLATES: Record<OrgKind, CategoryTemplate[]> = {
  chonaikai: [
    income('会費'),
    income('市区町村の補助金'),
    income('資源回収の報奨金'),
    income('雑収入'),
    expense('事務費'),
    expense('会議費'),
    expense('行事費'),
    expense('防災・防犯費'),
    expense('環境美化費'),
    expense('防犯灯の電気代'),
    expense('慶弔費'),
    expense('連合会の負担金'),
    expense('雑費'),
    expense('予備費'),
  ],
  kodomokai: [
    income('会費'),
    income('補助金・助成金'),
    income('資源回収の収入'),
    income('雑収入'),
    expense('行事費'),
    expense('活動費'),
    expense('保険料'),
    expense('記念品費'),
    expense('連合会の負担金'),
    expense('事務費'),
    expense('雑費'),
    expense('予備費'),
  ],
  pta: [
    income('会費'),
    income('補助金・助成金'),
    income('資源回収の収入'),
    income('雑収入'),
    expense('総会・会議費'),
    expense('学年・学級の活動費'),
    expense('行事費'),
    expense('広報費'),
    expense('研修費'),
    expense('慶弔費'),
    expense('記念品費'),
    expense('保険料'),
    expense('連合会の負担金'),
    expense('事務費'),
    expense('雑費'),
    expense('予備費'),
  ],
  circle: [
    income('会費'),
    income('参加費'),
    income('補助金・助成金'),
    income('雑収入'),
    expense('会場費'),
    expense('用具・備品費'),
    expense('講師への謝礼'),
    expense('大会・発表会の費用'),
    expense('保険料'),
    expense('通信・事務費'),
    expense('雑費'),
    expense('予備費'),
  ],
  // 「そのほか」でも、取引を1件も入れられない状態にはしない。最小限の科目だけ入れておく
  other: [income('会費'), income('雑収入'), expense('事務費'), expense('雑費')],
}

/** 団体の種類に合った科目のひな形（新しい配列を返す）。 */
export function categoryTemplate(kind: OrgKind): CategoryTemplate[] {
  return CATEGORY_TEMPLATES[kind].map((c) => ({ ...c }))
}

/** 役の呼び名の初期値。サークルは「会長」より「代表」が多いので分けてある。画面で変えられる。 */
export function defaultRoleNames(kind: OrgKind): RoleNames {
  return {
    president: kind === 'circle' ? '代表' : '会長',
    treasurer: '会計',
    auditor: kind === 'chonaikai' ? '監事' : '会計監査',
  }
}

/** 監査をする人の数の初期値（署名欄の数）。 */
export function defaultAuditorCount(kind: OrgKind): number {
  return kind === 'chonaikai' || kind === 'pta' ? 2 : 1
}

/**
 * 会計監査報告書の本文の初期値。{年度} {期間} {団体名} は、資料を作るときに置きかわる。
 * 決まった文はないので、団体で言い回しを変えられる。
 */
export const DEFAULT_AUDIT_TEXT =
  '{年度}（{期間}）の{団体名}の会計について、帳簿、預金通帳、領収書などを照らし合わせて監査した結果、適正に処理されていることを認めます。'

/** 引き継ぎ書の「保管場所のチェック」の初期の項目。 */
export const DEFAULT_CUSTODY_LABELS = [
  '預金通帳',
  '銀行の届出印（はんこ）',
  'キャッシュカード',
  '手元の現金（金庫など）',
  '領収書のつづり',
  '会の印鑑',
  '規約と会員名簿',
  'ひきつぎファイル（このデータ）',
] as const

export function defaultCustody(makeId: () => string): CustodyItem[] {
  return DEFAULT_CUSTODY_LABELS.map((label) => ({ id: makeId(), label, place: '', handedOver: false }))
}
