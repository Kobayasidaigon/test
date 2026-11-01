import type { FamilyInput } from './types'

// 入力例（画面の初期値）。「入力例」と画面に必ず書くこと。
// 草加市に住む共働きの家族（1歳の第1子）。東京都の区に移ると、0〜2歳の保育料と018サポートの差で家計が楽になる例。
export const SAMPLE_INPUT: FamilyInput = {
  adults: 2,
  children: [{ id: 'c1', age: 1, nursery: true }],
  income: '800_1000',
  work: 'commute',
  fromCityId: 'soka',
  years: 5,
}

// 23区に住むリモートワークの家族（4歳と1歳）。地方へ移ると、移住支援金（一度きり）が出る一方、毎年の支援は減る例。
export const SAMPLE_INPUT_REMOTE: FamilyInput = {
  adults: 2,
  children: [{ id: 'c1', age: 4, nursery: true }, { id: 'c2', age: 1, nursery: true }],
  income: '600_800',
  work: 'remote',
  fromCityId: 'kita',
  years: 5,
}
