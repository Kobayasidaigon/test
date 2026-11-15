// データの型。すべて、利用者が画面で決める値だけでできている。
// 業種の基準や法律の数字は、どこにも入れていない（仕様書の決まり）。

/** 曜日。0 = 日曜、6 = 土曜（JavaScript の Date と同じ並び） */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * 勤務の色。色そのもの（#rrggbb）ではなく名前で持つ。
 * 画面の側で「地の色」と「上にのせる文字の色」を組で決めて、コントラストを保てるようにするため。
 */
export const SHIFT_COLORS = ['tomato', 'egg', 'teal', 'sky', 'plum', 'leaf', 'orange', 'gray'] as const
export type ShiftColor = (typeof SHIFT_COLORS)[number]

/** 色の名前（画面の選択肢に出す日本語） */
export const SHIFT_COLOR_LABELS: Record<ShiftColor, string> = {
  tomato: 'トマト赤',
  egg: '卵の黄',
  teal: '青緑',
  sky: '空色',
  plum: 'すみれ',
  leaf: '若葉',
  orange: 'だいだい',
  gray: 'ねずみ',
}

/** 勤務の種類（早番・遅番・通し など） */
export type ShiftType = {
  id: string
  /** 名前（例: 早番） */
  name: string
  /** 表に出す短い記号。1〜2文字（例: 早） */
  symbol: string
  /** 開始の時刻 'HH:MM' */
  start: string
  /** 終了の時刻 'HH:MM'。開始と同じか前の時刻なら、次の日にまたがる勤務とみなす */
  end: string
  /** 休憩の分。勤務時間の合計から引く。わからなければ 0 */
  breakMinutes: number
  color: ShiftColor
}

/** 役割の札（「薬剤師」「鍵を持っている」など。利用者が自由に作る） */
export type Tag = { id: string; name: string }

export type Staff = {
  id: string
  name: string
  /** 持っている役割の札 */
  tagIds: string[]
  /** 固定の休みの曜日 */
  fixedOffWeekdays: Weekday[]
  /**
   * 入れない勤務。キーは勤務の種類の id、値はその勤務に入れない曜日。
   * 「入れる」ではなく「入れない」ほうを持つのは、勤務の種類を後から足したときに、
   * 何もしなくても全員がその勤務に入れる状態になるようにするため。
   */
  cannotWork: Record<string, Weekday[]>
  /** 月の勤務日数の下限。決めないなら null */
  minDays: number | null
  /** 月の勤務日数の上限。決めないなら null */
  maxDays: number | null
}

/** 役割ごとの最低人数（例: 遅番に「鍵を持っている」人が1人以上） */
export type RoleMin = { id: string; shiftId: string; tagId: string; count: number }

export type Needs = {
  /** 曜日ごとの必要人数。キーは勤務の種類の id、値は 日・月・…・土 の7つの数 */
  weekly: Record<string, number[]>
  /**
   * 特定の日だけの上書き。外側のキーは日（'1'〜'31'）、内側のキーは勤務の種類の id。
   * 書いていない勤務は、その日の曜日の人数のまま。
   * 定休日の曜日や祝日にこれを書くと、その日は「開ける日」になる（臨時の営業）。
   */
  overrides: Record<string, Record<string, number>>
  roleMins: RoleMin[]
}

/** 希望。off は必ず守る。shift は、できるだけ守る */
export type Wish = { kind: 'off' } | { kind: 'shift'; shiftId: string }

/** 続けて入れない勤務の組み合わせ（first の次の日に next を入れない） */
export type ForbiddenPair = { id: string; first: string; next: string }

export type Rules = {
  /** 連続勤務の上限（日）。決めないなら null */
  maxConsecutive: number | null
  forbiddenPairs: ForbiddenPair[]
  /** 毎週少なくとも1日は休みにする（なるべく） */
  weeklyDayOff: boolean
  /** 「毎週」の週が始まる曜日 */
  weekStart: Weekday
  /** 土日祝に入る回数を、なるべく均等にする */
  balanceWeekend: boolean
  /** 回数をなるべく均等にしたい勤務（遅番など） */
  balanceShiftIds: string[]
}

/** 祝日の必要人数の決め方。sunday = 日曜と同じ人数、weekday = その曜日のまま、closed = 休みにする */
export type HolidayMode = 'sunday' | 'weekday' | 'closed'

/** シフト表 */
export type Schedule = {
  /** 入っている勤務。外側のキーはスタッフの id、内側のキーは日、値は勤務の種類の id。無いマスは休み */
  work: Record<string, Record<string, string>>
  /** 手で固定したマス。キーはスタッフの id、値は日の一覧。休みのマスも固定できる */
  locked: Record<string, number[]>
  /** 自動作成に使った乱数の種。まだ自動作成していなければ null */
  seed: number | null
}

/** 前の月の終わりの勤務（翌月への引き継ぎで作る）。月をまたぐ連勤などを数えるのに使う */
export type Carry = {
  /** 前の月 */
  year: number
  month: number
  /**
   * キーはスタッフの id。値は前の月の終わりの日々で、古い順（最後の要素が前の月の末日）。
   * 入っていた勤務の種類の id、休みなら null。
   */
  tail: Record<string, Array<string | null>>
}

/** 1つの店の1か月ぶんのデータ。保存するのはこれ1つ */
export type ShiftPlan = {
  storeName: string
  year: number
  /** 1〜12 */
  month: number
  /** 定休日。weekdays は曜日、days はこの月の個別の日 */
  closed: { weekdays: Weekday[]; days: number[] }
  holidayMode: HolidayMode
  shiftTypes: ShiftType[]
  tags: Tag[]
  staff: Staff[]
  needs: Needs
  /** 希望。外側のキーはスタッフの id、内側のキーは日 */
  wishes: Record<string, Record<string, Wish>>
  rules: Rules
  schedule: Schedule
  carry: Carry | null
}

/**
 * あつかう年の範囲。祝日を計算できる範囲（holidays.ts の isHolidayYearSupported。決まりが今と同じで、春分・秋分の式が使える範囲）に合わせている。
 * 公表の一覧と照らして確かめたのは 2025〜2027年（holidays.test.ts）で、2028年からあとの春分の日・秋分の日は見込み（EQUINOX_ANNOUNCED_THROUGH）。
 */
export const YEAR_MIN = 2022
export const YEAR_MAX = 2099

/** 入力の上限。壊れたファイルや打ちまちがいで、画面や計算が止まらないようにするための歯止め */
export const LIMITS = {
  // スタッフは100人まで。有料版に料金のうえでの人数制限はないが、壊れたファイルで計算が終わらなくなるのを防ぐ歯止めとして置く
  // （100人 × 31日でも、自動作成は手元の計測で0.5秒ほど）
  staff: 100,
  shiftTypes: 8,
  tags: 20,
  roleMins: 40,
  forbiddenPairs: 20,
  nameLength: 40,
  symbolLength: 2,
  needPerShift: 60,
  carryTail: 31,
} as const
