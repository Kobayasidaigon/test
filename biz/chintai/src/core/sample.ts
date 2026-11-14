import type { AppData, Estimate } from './types'

// サンプルの見積書。「サンプルの見積書を入れる」と、LP の一番上（赤ペンが入る見積書）で使う。
//
// - 金額は、道具の動きを見せるための例。相場を示すものではない（画面にも SAMPLE_NOTE を出す）。
// - 区分がひととおり出るように選んである（ふつうはかかる／上限の決まり／必須か任意か／自分で選べる／だれが負担するか）。
// - 入居する日を固定の日付にしているのは、いつ開いても同じ結果になるようにするため
//   （「今日から2週間後」のようにすると、静的HTMLと画面で結果がずれる）。

/** サンプルであることを伝える文。 */
export const SAMPLE_NOTE = 'サンプルの見積書です。金額は、道具の動きを見せるための例で、相場を示すものではありません。'

/** サンプルの見積書。呼ぶたびに、新しいデータを返す（書き換えても、もとのサンプルは変わらない）。 */
export function sampleEstimate(): Estimate {
  return {
    rent: 78_000,
    commonFee: 4_000,
    moveInDate: '2027-03-20',
    statedTotal: 477_042,
    lines: [
      { id: 'l1', itemId: 'shikikin', label: '敷金', amount: 78_000 },
      { id: 'l2', itemId: 'reikin', label: '礼金', amount: 78_000 },
      { id: 'l3', itemId: 'maeyachin', label: '前家賃（4月分）', amount: 82_000 },
      // 3月20日〜31日の12日分。（78,000＋4,000）× 12 ÷ 31 ＝ 31,741.9…
      { id: 'l4', itemId: 'hiwari', label: '日割り家賃（3/20〜3/31）', amount: 31_742 },
      // 家賃の1か月分＋消費税。0.5か月分＋消費税（42,900円）を超えているので、「承諾していたかを確かめる」になる。
      { id: 'l5', itemId: 'chukai', label: '仲介手数料', amount: 85_800 },
      { id: 'l6', itemId: 'hoshoryo', label: '初回保証委託料', amount: 41_000 },
      { id: 'l7', itemId: 'kasaihoken', label: '火災保険料（2年）', amount: 20_000 },
      { id: 'l8', itemId: 'kagi', label: '鍵交換費用', amount: 22_000 },
      { id: 'l9', itemId: 'shodoku', label: '室内抗菌施工費', amount: 16_500 },
      { id: 'l10', itemId: 'support24', label: '24時間安心サポート（2年）', amount: 16_500 },
      { id: 'l11', itemId: 'shorui', label: '書類作成費', amount: 5_500 },
    ],
  }
}

/** サンプルを入れた、道具の内容のすべて。名前と物件名は、入れていない状態にする。 */
export function sampleData(): AppData {
  return { estimate: sampleEstimate(), message: { senderName: '', propertyName: '', lineIds: null } }
}
