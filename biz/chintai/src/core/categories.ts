import type { Category, CategoryId } from './types'

// 区分の一覧。並びは、点検の結果に出す順（落ち着いて見られるものから、確かめるものへ）。
//
// 言い方の決めごと:
// - 断定しない。「外せる」「払わなくてよい」とは言わない。「確かめる」「〜ことがある」と言う。
// - 色だけで区分を伝えない。label（言葉）と mark（印の1文字）を必ず一緒に出す。
export const categories: Category[] = [
  {
    id: 'usual',
    label: 'ふつうはかかる',
    mark: '✓',
    short: '計算がおかしくないかだけ見ます。',
    description:
      '敷金、礼金、前家賃、日割り家賃、管理費、保証料など、多くの契約でかかるお金です。金額の高い安いは言いません。家賃の何か月分にあたるか、日割りの計算が目安と大きく違わないか、だけを見ます。',
    attention: 'calm',
  },
  {
    id: 'capped',
    label: '上限の決まりがある',
    mark: '限',
    short: '家賃から上限を計算して、見積もりの額と比べます。',
    description:
      '仲介手数料には、国土交通省の告示で上限が決められています。家賃から「0.5か月分＋消費税」と「1か月分＋消費税」を計算して、見積もりの額と比べます。',
    attention: 'check',
  },
  {
    id: 'optional',
    label: '必須か任意か、確かめる',
    mark: '？',
    short: '契約に必須かどうかを、聞いてみる項目です。',
    description:
      '室内の消毒、害虫駆除、サポートの会費、消火器などです。必須か任意かを決めた公的な決まりは見つかりませんでした。必須かどうかを、不動産会社に聞いてみる項目です。物件の条件として外せないこともあります。',
    attention: 'check',
  },
  {
    id: 'choosable',
    label: '自分で選べることがある',
    mark: '選',
    short: '指定のものでなくてもよいかを、聞いてみる項目です。',
    description:
      '火災保険です。保険に入ることが契約の条件になっていることはありますが、どの保険に入るかは、自分で選べることがあります。指定の保険でなければいけないかを聞いてみる項目です。',
    attention: 'check',
  },
  {
    id: 'who-pays',
    label: 'だれが負担するか、確かめる',
    mark: '誰',
    short: '借主の負担になる理由を、聞いてみる項目です。',
    description:
      '鍵の交換費用です。国土交通省のガイドラインには、破損や紛失がない場合の鍵の取り替えは、貸主の負担とするのが妥当という考え方が書かれています。ただし、ガイドラインは法律ではなく、契約で借主の負担と決めていることもあります。',
    attention: 'check',
  },
  {
    id: 'overlap',
    label: '重なっていないか、確かめる',
    mark: '重',
    short: 'ほかの費用と、同じ内容が重なっていないかを見る項目です。',
    description:
      '退去時のクリーニング費用の前払いなどです。敷金から引かれる分（敷引き・償却）と、同じ清掃の費用が重なっていないかを、契約書で確かめる項目です。',
    attention: 'check',
  },
  {
    id: 'contract',
    label: '契約書で確かめる',
    mark: '契',
    short: '金額よりも、条件を契約書で確かめる項目です。',
    description:
      '更新料、短期解約の違約金、フリーレントの条件などです。初期費用そのものではありませんが、あとで大きなお金になることがあるので、契約の前に条件を確かめる項目です。',
    attention: 'check',
  },
  {
    id: 'other',
    label: '何のお金か、確かめる',
    mark: '他',
    short: 'この道具の一覧にない項目です。',
    description:
      'この道具の一覧にない項目です。決まりがあるかどうかを、この道具は確かめていません。何のためのお金か、必須かどうかを、不動産会社に聞いてみる項目です。',
    attention: 'check',
  },
]

const byId = new Map<CategoryId, Category>(categories.map((c) => [c.id, c]))

/** 区分を1つ取り出す。 */
export function getCategory(id: CategoryId): Category {
  // categories は CategoryId のすべてを持っている（テストで確かめている）ので、必ず見つかる。
  return byId.get(id)!
}

/** 区分の並び順（小計を出す順）。 */
export const categoryOrder: CategoryId[] = categories.map((c) => c.id)
