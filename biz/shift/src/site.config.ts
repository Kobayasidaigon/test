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

// ライセンスキーを、決済から何営業日以内に送るか。運営者が決めて、数を入れる（例: 3）。
// キーは、運営者が Stripe の知らせを見て、手で発行してメールで送る（README の「7. キーの発行のしかた」）ので、すぐには届かない。
// 空（null）のあいだは、特定商取引法の表記の「商品の引渡し時期」が「公開前に記入します」になる。
const licenseDeliveryDays: number | null = null

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
  // プライバシーポリシーを定めた日（変えたときは、変えた日）。'2027-01-10' の形で入れる。空のあいだは「公開前に記入します」と出る。
  privacyPolicyDate: '',
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
        '月を変えても、スタッフと条件はそのまま残ります',
      ],
    },
    pro: {
      name: pricing.pro.name,
      price: formatYen(pricing.pro.priceYen),
      note: '税込。1回だけのお支払いで、月額の料金はありません。キーに期限はありません。',
      features: [
        `スタッフ${pricing.free.staffLimit + 1}人以上の店でも使えます（${pricing.pro.testedStaffLimit}人まで動作を確かめています）`,
        'CSV の書き出し（Excel で開けます）',
        // スタッフと条件は、無料版でも月を変えれば残る。ここには、買い切り版だけで増えることを書く
        '翌月への引き継ぎ（前の月の終わりの勤務を持っていき、月をまたぐ連勤や、続けて入れない組み合わせを数えます）',
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
    // 空のあいだは「公開前に記入します」と出る（licenseDeliveryDays を決めること）
    delivery: licenseDeliveryDays
      ? `決済の完了後、${licenseDeliveryDays}営業日以内に、ライセンスキーをメールでお送りします。運営者が手作業でお送りするため、決済のすぐあとには届きません。キーに期限はありません。`
      : '',
    // 型を number | null のまま持つ（null のままでも、数を入れたときの文が型の上で消えないように）
    licenseDeliveryDays: licenseDeliveryDays as number | null,
    // 買い切り版だけの機能（9人以上、CSV、翌月への引き継ぎ）は、販売を始めたあとは、買う前に試せない。そのことを隠さずに書く。
    // 返金の条件は運営者が決める（README の「3. 特定商取引法の表記と、プライバシーポリシーを読み直す」）。条件を変えたら、ここを書き直す
    refund: `デジタル商品のため、キーの送付後の返品・返金はお受けしていません。無料版（スタッフ${pricing.free.staffLimit}人まで、期限なし）で、自動作成・点検・印刷などの動きをお確かめください。スタッフが${pricing.free.staffLimit + 1}人以上の店は、${pricing.free.staffLimit}人ぶんを入れて試せます。${pricing.free.staffLimit + 1}人以上での自動作成、CSV の書き出し、翌月への引き継ぎは、お買い上げの前には試せません。`,
    // 動作環境。確かめたブラウザを増やしたら、ここと LP の「よくある質問」（src/components/landing/faq.tsx）を直す。
    environment: 'インターネットにつながるパソコン、タブレット、スマートフォンのブラウザで動きます。動作を確かめているのは、Google Chrome と同じしくみのブラウザ（Chromium）です。',
  },
}

export type Site = typeof site
