// LP の見本（demo-snapshot.ts）が、本物の計算の結果と同じであることを確かめる。
// 「LP に書くのは、道具で実際に動くことだけ」を、テストで守るため。
// ここが落ちたら、自動作成かサンプルが変わっている。npm run snapshot で見本を作り直すこと。
import { describe, expect, it } from 'vitest'
import { checkPlan, explainShortages, makeSample } from '@/core'
import { buildDemoSnapshot } from './demo-build'
import { applyDemoFix, DEMO_MONTH, DEMO_YEAR } from './demo-data'
import { DEMO_SNAPSHOT } from './demo-snapshot'

describe('LP の見本', () => {
  it('ファイルにしてある見本は、いま計算し直した結果と同じ', () => {
    expect(DEMO_SNAPSHOT).toEqual(buildDemoSnapshot())
  })

  it('美容室の見本は、違反も不足も0件', () => {
    const plan = { ...makeSample('salon', DEMO_YEAR, DEMO_MONTH), schedule: DEMO_SNAPSHOT.salon }
    const report = checkPlan(plan)
    expect(report.violations).toHaveLength(0)
    expect(report.missingTotal).toBe(0)
  })

  it('飲食店の見本は、足りないところが残り、理由の文が出る（LP の「組めないとき」の見本に使う）', () => {
    const plan = { ...makeSample('restaurant', DEMO_YEAR, DEMO_MONTH), schedule: DEMO_SNAPSHOT.restaurant }
    const report = checkPlan(plan)
    expect(report.violations).toHaveLength(0)
    expect(report.missingTotal).toBeGreaterThan(0)
    const texts = explainShortages(plan).map((e) => e.text)
    expect(texts.length).toBeGreaterThan(0)
    for (const t of texts) expect(t).toContain('入れない理由')
  })

  it('見本の「埋める案」を当てはめると、言ったとおりに、足りないところがなくなる', () => {
    const fix = DEMO_SNAPSHOT.fix
    expect(fix).not.toBeNull()
    if (!fix) return
    expect(fix.text).toContain('すべて埋まります')
    const fixed = applyDemoFix(makeSample('restaurant', DEMO_YEAR, DEMO_MONTH), fix)
    const report = checkPlan(fixed)
    expect(report.violations).toHaveLength(0)
    expect(report.missingTotal).toBe(0)
  })
})
