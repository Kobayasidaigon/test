// Web Worker の中で動く側。自動作成と提案を、画面を止めずに計算する。
// 画面からは、このファイルを直接さわらず、client.ts の startSolve を使う。
import { suggestRelaxations, type SuggestionResult } from './explain'
import { solveBest, type SolveProgress, type SolveResult } from './solver'
import type { ShiftPlan } from './types'

export type WorkerRequest = {
  plan: ShiftPlan
  seed: number
  effort?: number
  /** 足りないところが残ったとき、条件を変えずに別の種で組み直す回数（初期値は RETRY_COUNT） */
  retries?: number
  /** 足りないところが残ったとき、条件をゆるめる提案も計算するか */
  withSuggestions: boolean
}

export type WorkerMessage =
  | { type: 'progress'; progress: SolveProgress }
  | { type: 'result'; result: SolveResult }
  | { type: 'suggestProgress'; done: number; total: number }
  | { type: 'suggestions'; suggestions: SuggestionResult | null }
  | { type: 'error'; message: string }

/** 依頼を1つ受けて、順に答えを送る。Worker の中でも、Worker なしの代わりの道でも、同じこの関数を使う */
export function handleRequest(req: WorkerRequest, post: (m: WorkerMessage) => void): void {
  try {
    // 足りないところが残ったら、条件を変えずに別の種で何回か組み直してから、いちばん良い表を返す（solveBest）。
    // 条件をゆるめる提案は、その表をもとに、それでも足りないときだけ計算する
    const result = solveBest(req.plan, { seed: req.seed, effort: req.effort, retries: req.retries, onProgress: (progress) => post({ type: 'progress', progress }) })
    post({ type: 'result', result })
    if (req.withSuggestions && result.check.missingTotal > 0) {
      const suggestions = suggestRelaxations({ ...req.plan, schedule: result.schedule }, { onProgress: (done, total) => post({ type: 'suggestProgress', done, total }) })
      post({ type: 'suggestions', suggestions })
    } else {
      post({ type: 'suggestions', suggestions: null })
    }
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}

// Worker として読み込まれたときだけ、受け口をつなぐ（テストや、Worker なしの道で読み込まれたときは、つながない）
declare const WorkerGlobalScope: unknown
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof (WorkerGlobalScope as never)) {
  const scope = self as unknown as { onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null; postMessage: (m: WorkerMessage) => void }
  scope.onmessage = (e) => handleRequest(e.data, (m) => scope.postMessage(m))
}
