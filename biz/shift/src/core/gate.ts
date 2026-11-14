// 無料版と有料版で、できることを分ける。数字は site.config.ts の pricing から取る（ここに数字を書かない）。
import { site } from '@/site.config'
import type { ShiftPlan } from './types'
import { LIMITS } from './types'

export type Gate = {
  /** 入れられるスタッフの人数の上限 */
  staffLimit: number
  /** スタッフを、もう1人足せるか */
  canAddStaff: boolean
  /** 自動作成を使えるか（無料版で人数が上限をこえているときは使えない） */
  canSolve: boolean
  /** CSV の書き出しを使えるか（有料版だけ） */
  canCsv: boolean
  /** 翌月への引き継ぎを使えるか（有料版だけ） */
  canCarryOver: boolean
  /** 無料版の上限を、何人こえているか（こえていなければ 0） */
  overBy: number
  /** 有料版で、動作を確かめた人数をこえているか */
  untested: boolean
  /** 使えないものがあるときの説明の文。なければ null */
  message: string | null
}

/**
 * いまの plan と、有料版かどうか（useLicense の isPro）から、できることを決める。
 *
 * 無料版で人数が上限をこえている plan（有料版で作ったファイルを読み込んだときなど）は、
 * 見る・手で直す・印刷する・ファイルに保存する、はそのままできる。止めるのは、自動作成と、人を足すことだけ。
 * 読み込んだデータを人質にしないため。
 */
export function featureGate(plan: ShiftPlan, isPro: boolean): Gate {
  const count = plan.staff.length
  const freeLimit = site.pricing.free.staffLimit
  if (isPro) {
    const untested = count > site.pricing.pro.testedStaffLimit
    return {
      staffLimit: LIMITS.staff,
      canAddStaff: count < LIMITS.staff,
      canSolve: true,
      canCsv: true,
      canCarryOver: true,
      overBy: 0,
      untested,
      message: untested ? `スタッフが${count}人です。動作を確かめているのは${site.pricing.pro.testedStaffLimit}人までなので、自動作成に時間がかかることがあります。` : null,
    }
  }
  const overBy = Math.max(0, count - freeLimit)
  return {
    staffLimit: freeLimit,
    canAddStaff: count < freeLimit,
    canSolve: overBy === 0,
    canCsv: false,
    canCarryOver: false,
    overBy,
    untested: false,
    message:
      overBy > 0
        ? `無料版は、スタッフ${freeLimit}人までです（いまは${count}人）。表を見る、手で直す、印刷する、ファイルに保存する、はこのままできます。自動作成を使うには、スタッフを${freeLimit}人までに減らすか、買い切り版のキーを入れてください。`
        : null,
  }
}
