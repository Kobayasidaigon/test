import type { LocalState } from '@/core'
import { Toaster } from '@/components/ui/toast'
import { Welcome } from '@/components/tool/Welcome'
import { WorkspaceShell } from '@/components/tool/WorkspaceShell'
import { WorkspaceProvider, useStore, useWorkspaceValue } from '@/components/tool/store'

// 道具の画面（/app）。
// ブラウザの中に帳簿が残っていれば続きから、なければ、はじめの画面（開く／新しく始める／サンプル）を出す。
// 帳簿そのものの計算と保存の形式は src/core、画面の部品は src/components/tool と src/components/papers にある。

function Workspace({ store, state }: { store: ReturnType<typeof useStore>; state: LocalState }) {
  const value = useWorkspaceValue(store, state)
  return (
    <WorkspaceProvider value={value}>
      <WorkspaceShell />
    </WorkspaceProvider>
  )
}

export default function Tool() {
  const store = useStore()
  return (
    <>
      {!store.ready ? (
        // ブラウザの中のデータを読むまでの、ほんの一瞬。画面ががたつかないように、高さだけ取っておく
        <div className="min-h-dvh" aria-busy="true" />
      ) : store.state ? (
        <Workspace store={store} state={store.state} />
      ) : (
        <Welcome store={store} />
      )}
      {/* 知らせは、スマホでは下のタブのすぐ上、パソコンでは右下に出す */}
      <Toaster className={store.state ? 'bottom-[4.6rem] lg:bottom-5' : 'bottom-4'} />
    </>
  )
}
