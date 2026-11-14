import { useEffect, useState } from 'react'
import { Link } from '@/router'

export default function Tool() {
  const [n, setN] = useState(0)
  useEffect(() => { setN(Number(localStorage.getItem('n') ?? 0)) }, [])
  return (
    <main className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="text-2xl font-bold">ツール</h1>
      <button className="mt-4 rounded-lg border px-4 py-2" onClick={() => { localStorage.setItem('n', String(n + 1)); setN(n + 1) }}>押した回数 {n}</button>
      <p className="mt-8"><Link to="/#pricing" className="underline">料金を見る</Link> ・ <Link to="/" className="underline">トップへ</Link></p>
    </main>
  )
}
