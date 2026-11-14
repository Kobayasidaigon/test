// LP の見本で使う、年月・種・型と、小さな関数。軽いので、LP を描くときに読んでよい。
// 重い計算（自動作成を回して見本を作る）は demo-build.ts に分けてある。
import type { Relaxation, Schedule, ShiftPlan } from '@/core'

/**
 * 見本に使う年月。使い方の3ステップと「組めないとき」の見本は、いつ開いてもこの月のまま見せる（例として読めればよいため）。
 * 一番上の動く見本だけは、開いた端末の「来月」に入れかえる（HeroDemo）。
 * サンプルは 2026年12月〜2027年12月で確かめてある。変えるときは、その範囲で。
 */
export const DEMO_YEAR = 2026
export const DEMO_MONTH = 12
/** 道具の画面で、最初に「組む」を押したときと同じ種 */
export const DEMO_SEED = 1

export type DemoSnapshot = {
  year: number
  month: number
  seed: number
  /** 美容室のサンプルを組んだ表 */
  salon: Schedule
  /** 飲食店のサンプルを組んだ表（人が足りない週が残る） */
  restaurant: Schedule
  /** 飲食店のサンプルで、道具が出した「埋める案」。なければ null */
  fix: {
    /** まとめの文（例: 条件を変えて、実際に組み直して確かめました。） */
    intro: string
    /** 何を変えるか（例: 連勤の上限を6日にする） */
    label: string
    /** そのまま画面に出す文 */
    text: string
    relaxation: Relaxation
    /** 条件を変えて組み直した表 */
    schedule: Schedule
    /** 試したが、足りないところが減らなかったもの */
    noEffect: string[]
  } | null
}

/** 提案の条件を当てはめた plan を作る（見本で「この条件にする」を押したとき用）。連勤の上限だけをあつかう */
export function applyDemoFix(plan: ShiftPlan, fix: NonNullable<DemoSnapshot['fix']>): ShiftPlan {
  const r = fix.relaxation
  if (r.kind !== 'maxConsecutive') return { ...plan, schedule: fix.schedule }
  return { ...plan, rules: { ...plan.rules, maxConsecutive: r.value }, schedule: fix.schedule }
}
