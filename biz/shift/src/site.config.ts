// サイト全体の設定。公開前に埋める項目はここに集めてある。
// 空の項目があるうちは、対応する表示（購入ボタン、運営者の表記など）が「準備中」になる。

/** 金額を「4,980円」の形にする */
export function formatYen(amount: number): string {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}円`
}

// 料金と、プランごとの制限。画面も LP も特定商取引法の表記も、ここの数字を見る。
// 料金や人数を変えるときは、ここだけを変える（文の中に数字を直接書かない）。
const pricing = {
  free: {
    name: '無料',
    priceYen: 0,
    /** 無料版で入れられるスタッフの人数 */
    staffLimit: 8,
  },
  pro: {
    name: '買い切り',
    /** 税込の金額（円）。1回だけの支払いで、月額はない */
    priceYen: 4980,
    /** 人数の制限はないが、動作を確かめてあるのはこの人数まで */
    testedStaffLimit: 30,
  },
} as const

export const site = {
  // 英小文字の短い名前。保存領域のキーとライセンスキーの product に使う。公開後は変えない。
  slug: 'shift',
  name: 'たたき台シフト',
  tagline: '希望休と必要人数を入れると、来月のシフトのたたき台ができる',
  // 公開するURL（末尾のスラッシュなし）。canonical と OGP に使う。
  baseUrl: '',
  // 有料プランの決済ページ（Stripe の Payment Link など）。空なら「購入」ボタンは先行案内の表示になる。
  checkoutUrl: '',
  // ライセンスキーを確かめる公開鍵（node scripts/license.mjs keygen で作る）。
  // 空のあいだは「公開前モード」で、有料版の機能をすべて試せる。
  // キーは期限なしで発行する（node scripts/license.mjs issue に --days を付けない）。買い切りのため。
  licensePublicKey: '',
  // お問い合わせ先（メールアドレス、またはフォームのURL）。
  contact: '',
  // 特定商取引法にもとづく表記に出す運営者の情報。空の項目は、ページ上で「公開前に記入します」と表示される。
  operator: {
    name: '',
    representative: '',
    address: '',
    phone: '',
    email: '',
  },
  pricing,
  // プランごとの「できること」。料金の表（LP）と、道具の中の案内が、同じ文を出す。
  // ここに書くのは、道具で実際に動くものだけ。
  plans: {
    free: {
      name: pricing.free.name,
      price: formatYen(pricing.free.priceYen),
      note: '期限なし。登録もいりません。',
      features: [
        `スタッフ${pricing.free.staffLimit}人まで`,
        'シフトの自動作成',
        '手直しと、条件に合っているかの点検',
        '組めないときの理由の説明',
        '印刷（A4）',
        'ファイルへの保存と読み込み',
      ],
    },
    pro: {
      name: pricing.pro.name,
      price: formatYen(pricing.pro.priceYen),
      note: '税込。1回だけのお支払いで、月額の料金はありません。キーに期限はありません。',
      features: [
        `スタッフ${pricing.free.staffLimit + 1}人以上の店でも使えます（${pricing.pro.testedStaffLimit}人まで動作を確かめています）`,
        'CSV の書き出し（Excel で開けます）',
        '翌月への引き継ぎ（スタッフと条件をそのまま次の月へ。月をまたぐ連勤も数えます）',
        '無料版でできること、すべて',
      ],
    },
  },
  // 特定商取引法にもとづく表記に出す、販売の条件。
  sales: {
    price: `買い切り版は ${formatYen(pricing.pro.priceYen)}（税込）です。無料版は ${formatYen(pricing.free.priceYen)} です。`,
    extraCost: 'インターネットの通信料は、お客様のご負担になります。',
    payment: 'クレジットカード（決済は Stripe を利用します）',
    paymentTiming: 'お申し込みのときに、1回だけ決済されます。月額の料金や、更新の料金はありません。',
    delivery: '決済の完了後、ライセンスキーをメールでお送りします。キーに期限はありません。',
    refund: `デジタル商品のため、キーの送付後の返品・返金はお受けしていません。無料版（スタッフ${pricing.free.staffLimit}人まで、期限なし）で動作をお確かめのうえ、お申し込みください。`,
  },
}

export type Site = typeof site
