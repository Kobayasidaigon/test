// 公表されている祝日・休日の一覧（2025〜2027年）。計算（holidays.ts）と照らし合わせるためのデータ。
// 実行時の計算には使わない。テスト（holidays.test.ts）と、出典を画面に書くときに使う。
//
// 確かめ方について（正直に書く）:
//   この作業の環境からは www8.cao.go.jp と eco.mtk.nao.ac.jp を直接開けなかった（接続先の制限）。
//   そのため、検索（対象を公式サイトのドメインだけに絞った Web 検索）が返したページの内容で確かめた。
//   2026年と2027年は内閣府のページ、2025年は国立天文台の暦要項のページである
//   （内閣府のページは、今は2026年と2027年だけを載せている。2025年は内閣府の CSV に入っているが、CSV の中身は読めなかった）。
//   公開前に、運営者がブラウザで出典のページを開いて、もう一度見ておくと確実である。

export type OfficialHoliday = { month: number; day: number; name: string }

export const OFFICIAL_HOLIDAY_LISTS: Array<{
  year: number
  source: { title: string; url: string; checkedOn: string }
  /** 祝日でない休日（振替休日・国民の休日）は、名前を「休日」としている（公表の表記に合わせた） */
  days: OfficialHoliday[]
}> = [
  {
    year: 2025,
    source: {
      title: '国立天文台 暦計算室「令和7年(2025)暦要項 国民の祝日」',
      url: 'https://eco.mtk.nao.ac.jp/koyomi/yoko/2025/rekiyou251.html',
      checkedOn: '2026-11-14',
    },
    days: [
      { month: 1, day: 1, name: '元日' },
      { month: 1, day: 13, name: '成人の日' },
      { month: 2, day: 11, name: '建国記念の日' },
      { month: 2, day: 23, name: '天皇誕生日' },
      { month: 2, day: 24, name: '休日' },
      { month: 3, day: 20, name: '春分の日' },
      { month: 4, day: 29, name: '昭和の日' },
      { month: 5, day: 3, name: '憲法記念日' },
      { month: 5, day: 4, name: 'みどりの日' },
      { month: 5, day: 5, name: 'こどもの日' },
      { month: 5, day: 6, name: '休日' },
      { month: 7, day: 21, name: '海の日' },
      { month: 8, day: 11, name: '山の日' },
      { month: 9, day: 15, name: '敬老の日' },
      { month: 9, day: 23, name: '秋分の日' },
      { month: 10, day: 13, name: 'スポーツの日' },
      { month: 11, day: 3, name: '文化の日' },
      { month: 11, day: 23, name: '勤労感謝の日' },
      { month: 11, day: 24, name: '休日' },
    ],
  },
  {
    year: 2026,
    source: {
      title: '内閣府「国民の祝日について」',
      url: 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html',
      checkedOn: '2026-11-14',
    },
    days: [
      { month: 1, day: 1, name: '元日' },
      { month: 1, day: 12, name: '成人の日' },
      { month: 2, day: 11, name: '建国記念の日' },
      { month: 2, day: 23, name: '天皇誕生日' },
      { month: 3, day: 20, name: '春分の日' },
      { month: 4, day: 29, name: '昭和の日' },
      { month: 5, day: 3, name: '憲法記念日' },
      { month: 5, day: 4, name: 'みどりの日' },
      { month: 5, day: 5, name: 'こどもの日' },
      { month: 5, day: 6, name: '休日' },
      { month: 7, day: 20, name: '海の日' },
      { month: 8, day: 11, name: '山の日' },
      { month: 9, day: 21, name: '敬老の日' },
      { month: 9, day: 22, name: '休日' },
      { month: 9, day: 23, name: '秋分の日' },
      { month: 10, day: 12, name: 'スポーツの日' },
      { month: 11, day: 3, name: '文化の日' },
      { month: 11, day: 23, name: '勤労感謝の日' },
    ],
  },
  {
    year: 2027,
    source: {
      title: '内閣府「国民の祝日について」',
      url: 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html',
      checkedOn: '2026-11-14',
    },
    days: [
      { month: 1, day: 1, name: '元日' },
      { month: 1, day: 11, name: '成人の日' },
      { month: 2, day: 11, name: '建国記念の日' },
      { month: 2, day: 23, name: '天皇誕生日' },
      { month: 3, day: 21, name: '春分の日' },
      { month: 3, day: 22, name: '休日' },
      { month: 4, day: 29, name: '昭和の日' },
      { month: 5, day: 3, name: '憲法記念日' },
      { month: 5, day: 4, name: 'みどりの日' },
      { month: 5, day: 5, name: 'こどもの日' },
      { month: 7, day: 19, name: '海の日' },
      { month: 8, day: 11, name: '山の日' },
      { month: 9, day: 20, name: '敬老の日' },
      { month: 9, day: 23, name: '秋分の日' },
      { month: 10, day: 11, name: 'スポーツの日' },
      { month: 11, day: 3, name: '文化の日' },
      { month: 11, day: 23, name: '勤労感謝の日' },
    ],
  },
]
