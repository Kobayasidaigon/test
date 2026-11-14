// LP の見本のもとになる計算。サンプルの店を、本物の自動作成（src/core）で組む。
//
// ここの計算は重い（自動作成を何回も回す）ので、LP を描くときには呼ばない。
// 呼ぶのは、見本のファイルを作り直すとき（scripts/make-demo-snapshot.ts）と、テスト（demo-snapshot.test.ts）だけ。
// LP は、できあがったファイル（demo-snapshot.ts）を読む。
import { makeSample, solve, suggestRelaxations } from '@/core'
import { DEMO_MONTH, DEMO_SEED, DEMO_YEAR, type DemoSnapshot } from './demo-data'

export function buildDemoSnapshot(): DemoSnapshot {
  const salonPlan = makeSample('salon', DEMO_YEAR, DEMO_MONTH)
  const salon = solve(salonPlan, { seed: DEMO_SEED }).schedule

  const restaurantPlan = makeSample('restaurant', DEMO_YEAR, DEMO_MONTH)
  const restaurant = solve(restaurantPlan, { seed: DEMO_SEED }).schedule
  const result = suggestRelaxations({ ...restaurantPlan, schedule: restaurant })
  // 条件をゆるめる提案のうち、いちばん良く埋まるもの（「別の案で組み直す」は、条件の話ではないので見本にしない）
  const best = result.suggestions.find((s) => s.relaxation.kind !== 'reseed') ?? null

  return {
    year: DEMO_YEAR,
    month: DEMO_MONTH,
    seed: DEMO_SEED,
    salon,
    restaurant,
    fix: best
      ? { intro: result.text, label: best.label, text: best.text, relaxation: best.relaxation, schedule: best.plan.schedule, noEffect: result.noEffect }
      : null,
  }
}
