// 案B「ドット絵の旅」— 画面の言葉と、数字の言い換え。
import { INCOME_BANDS, SAMPLE_INPUT, WORK_STYLES, cityById, everyday, yenMan, type Breakdown, type Comparison, type Confidence, type FamilyInput } from '@/shared'
import type { ItemKey } from './sprites'

export type Field = 'adults' | 'children' | 'income' | 'work' | 'from' | 'years'
export const FIELDS: Field[] = ['adults', 'children', 'income', 'work', 'from', 'years']
export const STOP_LABEL: Record<Field, string> = { adults: '大人', children: '子ども', income: '年収', work: '働き方', from: '今の街', years: '期間' }

export const SAY: Record<Field, string> = {
  adults: 'ハト駅長です。旅の仲間を教えてください。いっしょに暮らす大人は何人ですか？',
  children: '子どもは何人？ 年齢も教えてください。生まれる予定の子も入れられます。',
  income: '世帯の年収は、だいたいどのくらい？ 税金を引く前の、家族みんなの合計で。',
  work: '働き方を教えてください。探せる街の広さが変わります。',
  from: '今は、どの街に住んでいますか？',
  years: '何年分の差で比べますか？',
}
export const SAY_CONFIRM = '準備ができました。この条件で、きっぷを買いますね。'

/** 入力例のままか（「入力例」と書くため） */
export function sameAsSample(input: FamilyInput, f: Field) {
  const s = SAMPLE_INPUT
  switch (f) {
    case 'adults': return input.adults === s.adults
    case 'children': return JSON.stringify(input.children.map((c) => [c.age, c.nursery])) === JSON.stringify(s.children.map((c) => [c.age, c.nursery]))
    case 'income': return input.income === s.income
    case 'work': return input.work === s.work
    case 'from': return input.fromCityId === s.fromCityId
    case 'years': return input.years === s.years
  }
}

export const ageWord = (age: number) => (age < 0 ? 'これから' : `${age}歳`)

export function childrenLine(input: FamilyInput) {
  if (!input.children.length) return '子どもはいない'
  return input.children.map((c) => `${ageWord(c.age)}${c.age <= 2 ? (c.nursery ? '（保育園）' : '（家で）') : ''}`).join('・')
}

export const incomeLabel = (input: FamilyInput) => INCOME_BANDS.find((b) => b.id === input.income)!.label
export const workOf = (input: FamilyInput) => WORK_STYLES.find((w) => w.id === input.work)!

export function yearsWord(input: FamilyInput) {
  if (input.years !== 18) return `${input.years}年`
  if (!input.children.length) return '1年'
  const youngest = Math.min(...input.children.map((c) => Math.max(c.age, 0)))
  return `下の子が18歳まで（${Math.max(1, 18 - youngest)}年）`
}

export const cityLine = (id: string) => {
  const c = cityById(id)
  return `${c.pref} ${c.name}`
}

/* ───────── 結果の言い換え ───────── */
export const confTone = (c: Confidence) => (c === '確認済' ? 'ok' : c === '推定' ? 'guess' : 'temp') as 'ok' | 'guess' | 'temp'

export const ICON_OF: Record<string, ItemKey> = { nursery: 'nursery', cash: 'envelope', lunch: 'lunch', medical: 'bandage', iju: 'suitcase' }

/** 名物から、場面に置く小物を選ぶ */
export function prideItem(cityId: string, label: string, kind: string): ItemKey {
  if (label.includes('せんべい')) return 'senbei'
  if (label.includes('鋳物')) return 'pot'
  if (label.includes('工場')) return 'factory'
  if (label.includes('宇宙')) return 'rocket'
  if (label.includes('粉もん')) return 'takoyaki'
  if (label.includes('下水道')) return 'drop'
  if (label.includes('農業')) return 'corn'
  if (label.includes('桜島')) return 'volcano'
  if (label.includes('保育料')) return 'nursery'
  if (label.includes('求人')) return 'briefcase'
  return kind === 'food' ? 'senbei' : kind === 'job' ? 'briefcase' : kind === 'nature' ? 'volcano' : kind === 'industry' ? 'factory' : 'nursery'
}
export function mainPride(c: Comparison) {
  const p = c.to.pride.find((x) => !x.label.includes('保育料')) ?? c.to.pride[0]
  return p ? prideItem(c.to.id, p.label, p.kind) : 'briefcase'
}

/** 1年あたりの差を、どちらの街の目線でも分かる言葉にする */
export function perYearWord(perYear: number, fromName: string, toName: string) {
  if (Math.abs(perYear) < 10000) return { short: 'ほぼ同じ', long: `${toName}と${fromName}は、ほぼ同じ`, tone: 'even' as const }
  if (perYear > 0) return { short: `年 約${yenMan(perYear)} 得`, long: `${toName}なら、年 約${yenMan(perYear)} 得`, tone: 'plus' as const }
  return { short: `今の街が 年 約${yenMan(-perYear)} お得`, long: `${fromName}のままが、年 約${yenMan(-perYear)} お得`, tone: 'calm' as const }
}

export function itemAmount(b: Breakdown, fromName: string, toName: string) {
  if (b.perYear === null) return { text: '確認中', tone: 'even' as const }
  if (Math.abs(b.perYear) < 1000) return { text: '差はほぼなし', tone: 'even' as const }
  if (b.perYear > 0) return { text: `${toName}だと 年 約${yenMan(b.perYear)} 得`, tone: 'plus' as const }
  return { text: `${fromName}のままが 年 約${yenMan(-b.perYear)} お得`, tone: 'calm' as const }
}

export function dayWords(yearly: number) {
  const e = everyday(yearly)
  return `${e.month}・${e.day}`
}

/** いちばん効いている項目 */
export const biggestItem = (c: Comparison) =>
  [...c.items].filter((i) => !i.oneTime && i.total !== null && Math.abs(i.total) >= 1000).sort((a, b) => Math.abs(b.total ?? 0) - Math.abs(a.total ?? 0))[0]

/** 最後に必ず出す「次の一歩」 */
export function nextSteps(c: Comparison): { title: string; body: string }[] {
  const big = biggestItem(c)
  if (c.perYear >= 10000)
    return [
      { title: `${c.to.name}の窓口で金額を確かめる`, body: `${big ? `「${big.label}」` : '保育料や給付'}は、年度や世帯で変わります。電話で「この年収なら月いくらか」を聞くのが早いです。` },
      { title: '住まいの家賃と通勤もいっしょに見る', body: `家計の差が年 約${yenMan(c.perYear)}あっても、家賃や交通費で変わります。下の枠は住まい探しの入口です。` },
    ]
  if (c.perYear <= -10000)
    return [
      { title: `${c.from.name}の制度を使いきれているか確かめる`, body: `今の街は手厚い制度が多い街です。${big ? `「${big.label}」` : '給付や助成'}の申請もれがないか、一度見直してみてください。` },
      { title: `${c.from.name}の中で住みかえを考える`, body: '引っ越すなら、同じ街の中で広い家を探すのもひとつの手です。' },
    ]
  return [
    { title: 'ほかの候補の街も見てみる', body: '「ほかの候補の街」の一覧から選ぶと、その街の結果に切り替わります。' },
    { title: '家賃や通勤で比べる', body: '制度の差はほぼありません。家賃・通勤時間・広さで選んで大丈夫です。' },
  ]
}
