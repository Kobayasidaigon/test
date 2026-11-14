// 画面から自動作成を呼ぶ入口。Web Worker の中で計算して、画面が固まらないようにする。
//
// Worker は、コードを1つのファイルの中にうめ込む形（?worker&inline）で読み込む。
// 1ファイルのビルド（dist-single/index.html を file:// で開く）でも動くようにするため。
// Worker が使えない環境では、同じ計算を画面の側で行う（少しのあいだ画面が止まるが、結果は同じ）。
import type { SuggestionResult } from './explain'
import type { SolveProgress, SolveResult } from './solver'
import type { WorkerMessage, WorkerRequest } from './solver.worker'
import type { ShiftPlan } from './types'

export type StartSolveOptions = {
  /** 乱数の種。「別の案を作る」では、前と違う数にする */
  seed: number
  effort?: number
  /** 足りないところが残ったとき、条件をゆるめる提案も計算する（初期値は true） */
  withSuggestions?: boolean
  /** 途中経過 */
  onProgress?: (progress: SolveProgress) => void
  /** 表ができた（提案より先に届く） */
  onResult: (result: SolveResult) => void
  /** 提案の計算の途中経過 */
  onSuggestProgress?: (done: number, total: number) => void
  /** 提案ができた。足りないところがない、または提案を頼んでいないときは null */
  onSuggestions?: (suggestions: SuggestionResult | null) => void
  /** 計算の途中で止まった */
  onError?: (message: string) => void
}

export type SolveHandle = {
  /** 計算をやめる。やめたあとは、何も届かない */
  cancel: () => void
}

/**
 * 自動作成を始める。結果は onResult に届く。
 * plan.schedule で固定されているマスは残り、ほかのマスが作り直される。
 */
export function startSolve(plan: ShiftPlan, options: StartSolveOptions): SolveHandle {
  const request: WorkerRequest = { plan, seed: options.seed, effort: options.effort, withSuggestions: options.withSuggestions ?? true }
  let cancelled = false
  let worker: Worker | null = null
  let resultDelivered = false

  const deliver = (m: WorkerMessage): void => {
    if (cancelled) return
    if (m.type === 'progress') options.onProgress?.(m.progress)
    else if (m.type === 'result') {
      resultDelivered = true
      options.onResult(m.result)
    }
    else if (m.type === 'suggestProgress') options.onSuggestProgress?.(m.done, m.total)
    else if (m.type === 'suggestions') {
      options.onSuggestions?.(m.suggestions)
      worker?.terminate()
      worker = null
    } else {
      options.onError?.(m.message)
      worker?.terminate()
      worker = null
    }
  }

  /** Worker を使わない道。画面の描きかえを1回はさんでから計算する */
  const runHere = (): void => {
    setTimeout(async () => {
      if (cancelled) return
      const { handleRequest } = await import('./solver.worker')
      handleRequest(request, deliver)
    }, 0)
  }

  void (async () => {
    if (typeof Worker === 'undefined') return runHere()
    try {
      const { default: SolverWorker } = await import('./solver.worker?worker&inline')
      if (cancelled) return
      const w = new SolverWorker()
      worker = w
      w.onmessage = (e: MessageEvent<WorkerMessage>) => deliver(e.data)
      w.onerror = () => {
        // Worker を作れたが動かなかった（古いブラウザ、制限のある環境）。
        // 表がまだ届いていなければ、画面の側でやり直す。表が届いたあとなら、提案だけをあきらめる
        w.terminate()
        if (worker !== w) return
        worker = null
        if (resultDelivered) deliver({ type: 'suggestions', suggestions: null })
        else runHere()
      }
      w.postMessage(request)
    } catch {
      runHere()
    }
  })()

  return {
    cancel: () => {
      cancelled = true
      worker?.terminate()
      worker = null
    },
  }
}
