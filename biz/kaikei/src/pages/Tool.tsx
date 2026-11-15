import { useLayoutEffect, useRef } from 'react'
import { createSampleBook, isSampleBook, type LocalState } from '@/core'
import { Toaster, toast } from '@/components/ui/toast'
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

/**
 * LP の「サンプルを見る」から来たとき（/app#sample。1ファイルのビルドでは #/app#sample）は、
 * はじめの画面を飛ばして、サンプルの帳簿を開く。
 * このブラウザに入力中の帳簿があるときは、入れかえない（だまって消さないため）。そのときは、理由を知らせる。
 */
function useSampleLink(store: ReturnType<typeof useStore>) {
  const { ready, state, notice, startWith } = store
  // いつ確かめても「そのときの帳簿」と「そのときの知らせ」を見るように、覚えておく
  const latest = useRef({ state, notice })
  latest.current = { state, notice }
  // 描く前に済ませる（はじめの画面が、一瞬だけ見えてしまわないように）
  useLayoutEffect(() => {
    if (!ready) return
    const check = () => {
      if (!/#sample$/.test(window.location.hash)) return
      // 印を URL から外す。読み込み直したときや、データを消したあとに、もう一度サンプルが開かないようにするため
      try {
        const { pathname, search, hash } = window.location
        window.history.replaceState(null, '', pathname + search + hash.replace(/#sample$/, ''))
      } catch {
        // 外せなくても、困るのは「読み込み直すとサンプルが開く」ことだけ
      }
      const current = latest.current.state
      if (current === null) {
        // 保存データが壊れていた、などの知らせが出ているときは、はじめの画面にとどまって、その知らせを読んでもらう
        // （サンプルを開くと、知らせが消えてしまうため）
        if (latest.current.notice === null) startWith(createSampleBook())
      } else if (!isSampleBook(current.book)) {
        toast.message('サンプルは開きませんでした。このブラウザに、入力中の帳簿が残っているためです。サンプルを見るときは、先に「ファイルに保存」をしてから、「引き継ぎ」の画面のいちばん下でデータを消してください。', { duration: 14_000 })
      }
    }
    check()
    // この画面を開いたまま、URL の終わりに #sample が付いたときにも確かめる
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [ready, startWith])
}

export default function Tool() {
  const store = useStore()
  useSampleLink(store)
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
