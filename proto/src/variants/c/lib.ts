// 案C「街カード」— 見せ方の小さな関数（計算そのものは @/shared の rank / compare を使う）
import type { City, Comparison, Confidence, FamilyInput, Pride } from '@/shared'
import { INCOME_BANDS, WORK_STYLES, yenMan } from '@/shared'

// 街ごとのインク（カードの刷り色）と、カード番号に使う全国地方公共団体コード（5けた）
export interface CityMeta { ink: string; code: string; motif: string }
export const CITY_META: Record<string, CityMeta> = {
  adachi: { ink: '#B8432F', code: '13121', motif: '荒川の土手と西新井大師' },
  kita: { ink: '#B2456E', code: '13117', motif: '飛鳥山の桜と都電' },
  ota: { ink: '#2F5F9E', code: '13111', motif: '羽田の飛行機と町工場' },
  kawaguchi: { ink: '#6B4E3D', code: '11203', motif: '鋳物の炉（キューポラ）' },
  soka: { ink: '#9A5A18', code: '11221', motif: '草加松原の太鼓橋と、せんべいのお日さま' },
  kawasaki: { ink: '#355C7D', code: '14130', motif: '工場の夜景' },
  sagamihara: { ink: '#3B3F8F', code: '14150', motif: 'ロケットと山なみ' },
  osaka: { ink: '#BF4A22', code: '27100', motif: '通天閣とたこ焼き' },
  sapporo: { ink: '#3F7D4E', code: '01100', motif: '時計台と畑' },
  kagoshima: { ink: '#2E7480', code: '46201', motif: '桜島と錦江湾' },
}
export const meta = (id: string): CityMeta => CITY_META[id] ?? { ink: '#48433D', code: '00000', motif: '街の絵' }

// 金額: 1万円以上は「◯万円」、それ未満は百円単位
export const fmtYen = (yen: number) => {
  const a = Math.abs(yen)
  if (a >= 10000) return yenMan(a)
  return `${(Math.round(a / 100) * 100).toLocaleString('ja-JP')}円`
}
// NumberFlow 用: 万円単位の数（小数1けた）
export const man1 = (yen: number) => Math.round(Math.abs(yen) / 1000) / 10

export const ageText = (age: number) => (age < 0 ? 'これから' : `${age}歳`)
export const ageLong = (age: number) => (age < 0 ? 'これから生まれる子' : `${age}歳の子`)

// 計算と同じ考え方で、くらべる年数を出す
export const periodYears = (input: FamilyInput) =>
  input.years === 18
    ? Math.max(1, 18 - Math.min(...input.children.map((c) => Math.max(c.age, 0)), 18))
    : input.years

export const yearsShort = (input: FamilyInput) => (input.years === 18 ? `18歳まで（${periodYears(input)}年）` : `${input.years}年`)
export const incomeLabel = (id: FamilyInput['income']) => INCOME_BANDS.find((b) => b.id === id)?.label ?? ''
export const workLabel = (id: FamilyInput['work']) => WORK_STYLES.find((w) => w.id === id)?.label ?? ''

// どちらの街の家計が楽か（計算の見出しと同じ 1万円のしきい値）
export type Lean = 'to' | 'from' | 'even'
export const leanOf = (perYear: number): Lean => (Math.abs(perYear) < 10000 ? 'even' : perYear > 0 ? 'to' : 'from')

export function statOf(c: Comparison) {
  const lean = leanOf(c.perYear)
  if (lean === 'to') return { lean, lead: `${c.to.name}に引っ越すと`, value: c.perYear, tail: '/年 浮く' }
  if (lean === 'from') return { lean, lead: `${c.from.name}のままが`, value: -c.perYear, tail: '/年 お得' }
  return { lean, lead: '毎年の差は', value: 0, tail: '' }
}

// 噛み砕きの一言（月・1日）
export function everydayLine(c: Comparison, month: string, day: string) {
  const lean = leanOf(c.perYear)
  if (lean === 'to') return `月にすると ${month}、1日なら ${day}。`
  if (lean === 'from') return `${c.from.name}のままなら、月 ${month.replace('月 ', '')}・1日 ${day.replace('1日 ', '')}分のゆとり。`
  return '月・1日にならすと、ほとんど差は出ません。'
}

// カードの表に出す名物（くらし系より、名産・景色・産業を先に）
export const pickPride = (city: City): Pride | undefined => city.pride.find((p) => p.kind !== 'life') ?? city.pride[0]
export const KIND_LABEL: Record<Pride['kind'], string> = {
  food: '名物', craft: 'ものづくり', industry: '産業', nature: '景色', job: 'しごと', life: 'くらし',
}

export const CONF_HELP: Record<Confidence, string> = {
  確認済: '公式の案内などで確かめた数字',
  推定: '根拠はあるが、計算でならした見込み',
  仮置き: 'まだ確かめていない数字',
}

// 「次の一歩」— 結果の向きと、いちばん効いている項目から決める
export function nextSteps(c: Comparison, input: FamilyInput) {
  const steps: { title: string; body: string }[] = []
  const lean = leanOf(c.perYear)
  const big = [...c.items]
    .filter((i) => !i.oneTime && i.total !== null && Math.abs(i.total) >= 1000)
    .sort((a, b) => Math.abs(b.total ?? 0) - Math.abs(a.total ?? 0))[0]
  if (lean === 'to') {
    if (big?.key === 'nursery') steps.push({ title: `${c.to.name}の保育料を、窓口で聞く`, body: `世帯年収${incomeLabel(input.income)}・${big.who}の月額を確かめると、この差がはっきりします。` })
    else steps.push({ title: `${c.to.name}の子育て窓口で、条件を聞く`, body: `いちばん効いている「${big?.label ?? '制度'}」の条件を確かめます。` })
  } else if (lean === 'from') {
    if (big?.key === 'nursery') steps.push({ title: '引っ越すなら、時期をずらす手も', body: '下の子が3歳になると、保育料の差はなくなります（3〜5歳は国の無償化で0円）。' })
    if (c.items.some((i) => i.key === 'cash' && (i.perYear ?? 0) < 0)) steps.push({ title: `${c.from.pref}の018サポート、届いていますか`, body: '申し込みが必要な給付です。都の外へ引っ越すと対象外になります。' })
    if (!steps.length) steps.push({ title: `${c.from.name}の制度を、取りこぼさない`, body: 'いまの街が手厚いぶん、使える制度を一度見直すのが近道です。' })
  } else {
    steps.push({ title: 'お金以外の条件でくらべる', body: '保育料や給付の差は小さめ。通勤の時間、家賃、保育園の空きでくらべてみてください。' })
  }
  if (c.oneTime > 0) steps.push({ title: '移住支援金の条件と受付を確かめる', body: `${c.to.name}の窓口へ。一度きりのお金で、早く転出すると返す決まりもあります。` })
  if (c.unknown.length) steps.push({ title: `確認中の項目を${c.to.name}に聞く`, body: `${c.unknown.map((u) => u.label).join('・')}は、まだ確かめていません。` })
  return steps.slice(0, 3)
}

// 子どもの id
let seq = 0
export const newChildId = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`
