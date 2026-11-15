import { describe, expect, it } from 'vitest'
import { site } from '@/site.config'
import { addStaff } from './edit'
import { featureGate } from './gate'
import { makeSample, SAMPLES } from './samples'
import { tinyPlan } from './testkit'
import type { ShiftPlan } from './types'

const withStaff = (n: number): ShiftPlan => {
  let plan = tinyPlan({ staff: [] })
  for (let i = 0; i < n; i++) plan = addStaff(plan, `人${i + 1}`)
  return plan
}

describe('料金の設定（site.config.ts）', () => {
  it('仕様書どおり: 無料は8人まで、買い切りは4,980円、30人まで動作を確かめる', () => {
    expect(site.pricing.free.staffLimit).toBe(8)
    expect(site.pricing.free.priceYen).toBe(0)
    expect(site.pricing.pro.priceYen).toBe(4980)
    expect(site.pricing.pro.testedStaffLimit).toBe(30)
  })
  it('画面に出す文と、特定商取引法の表記が、同じ数字を見ている', () => {
    expect(site.plans.pro.price).toBe('4,980円')
    expect(site.plans.free.price).toBe('0円')
    expect(site.plans.free.features[0]).toBe('スタッフ8人まで')
    expect(site.sales.price).toContain('4,980円（税込）')
    expect(site.sales.refund).toContain('スタッフ8人まで')
    // 引渡しの日数は運営者が決める。決めるまでは空（ページには「公開前に記入します」）。決めたら、日数とキーの期限の話が入る
    if (site.sales.licenseDeliveryDays === null) expect(site.sales.delivery).toBe('')
    else expect(site.sales.delivery).toContain(`${site.sales.licenseDeliveryDays}営業日以内`)
  })
  it('買い切り版の説明に、無料版でもできること（スタッフと条件を次の月に残す）を書かない', () => {
    expect(site.plans.pro.features.join('')).not.toContain('スタッフと条件')
    expect(site.plans.free.features.join('')).toContain('スタッフと条件はそのまま残ります')
    // 買い切り版だけの機能は、買う前に試せないことを、返品の条件に書いてある
    expect(site.sales.refund).toContain('お買い上げの前には試せません')
  })
  it('slug は変えていない', () => {
    expect(site.slug).toBe('shift')
  })
})

describe('無料版', () => {
  it('7人: ぜんぶ使える。CSV と引き継ぎは使えない', () => {
    expect(featureGate(withStaff(7), false)).toMatchObject({ staffLimit: 8, canAddStaff: true, canSolve: true, canCsv: false, canCarryOver: false, overBy: 0, message: null })
  })
  it('8人ちょうど: 自動作成は使える。もう足せない', () => {
    expect(featureGate(withStaff(8), false)).toMatchObject({ canAddStaff: false, canSolve: true, overBy: 0, message: null })
  })
  it('9人（有料版で作ったファイルを読み込んだときなど）: 自動作成は止まる。理由を言う', () => {
    const g = featureGate(withStaff(9), false)
    expect(g).toMatchObject({ canAddStaff: false, canSolve: false, overBy: 1 })
    expect(g.message).toContain('スタッフ8人まで')
    expect(g.message).toContain('いまは9人')
    expect(g.message).toContain('印刷')
  })
  it('0人でも落ちない', () => {
    expect(featureGate(withStaff(0), false)).toMatchObject({ canAddStaff: true, canSolve: true })
  })
  it('サンプルは、どれも無料版のまま試せる（8人以下）', () => {
    for (const s of SAMPLES) {
      const g = featureGate(makeSample(s.id, 2026, 12), false)
      expect(g.canSolve).toBe(true)
    }
  })
})

describe('有料版', () => {
  it('人数にかかわらず、ぜんぶ使える', () => {
    expect(featureGate(withStaff(9), true)).toMatchObject({ canAddStaff: true, canSolve: true, canCsv: true, canCarryOver: true, overBy: 0, untested: false, message: null })
    expect(featureGate(withStaff(30), true)).toMatchObject({ untested: false, message: null })
  })
  it('31人からは、動作を確かめていないことを言う（使えはする）', () => {
    const g = featureGate(withStaff(31), true)
    expect(g).toMatchObject({ canSolve: true, untested: true })
    expect(g.message).toContain('30人まで')
  })
  it('データの上限（100人）に届いたら、もう足せない', () => {
    expect(featureGate(withStaff(100), true).canAddStaff).toBe(false)
    expect(featureGate(withStaff(99), true).canAddStaff).toBe(true)
  })
})
