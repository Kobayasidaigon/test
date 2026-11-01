import type { FamilyInput } from './types'

// 入力例（画面の初期値）。「入力例」と画面に必ず書くこと。
export const SAMPLE_INPUT: FamilyInput = {
  adults: 2,
  children: [{ id: 'c1', age: 1, nursery: true }],
  income: '600_800',
  work: 'commute',
  fromCityId: 'adachi',
  years: 5,
}

export const SAMPLE_INPUT_REMOTE: FamilyInput = {
  adults: 2,
  children: [{ id: 'c1', age: 4, nursery: true }, { id: 'c2', age: 1, nursery: true }],
  income: '600_800',
  work: 'remote',
  fromCityId: 'kita',
  years: 5,
}
