// デザイン案の切り替え（#a〜#d）。プレビュー用。
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import A from '@/variants/a'
import B from '@/variants/b'
import C from '@/variants/c'
import D from '@/variants/d'
import { VARIANT_INFO } from '@/variants/info'

const MAP = { a: A, b: B, c: C, d: D } as const
type Key = keyof typeof MAP
const read = (): Key => {
  const h = location.hash.replace('#', '')
  return (h in MAP ? h : 'a') as Key
}

function App() {
  const [k, setK] = useState<Key>(read)
  useEffect(() => {
    const on = () => setK(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const V = MAP[k]
  return (
    <div>
      <nav aria-label="デザイン案" style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 50, display: 'flex', gap: 6, overflowX: 'auto', padding: '8px max(12px, env(safe-area-inset-left, 0px))', background: '#101114', color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
        <span style={{ alignSelf: 'center', opacity: 0.7, whiteSpace: 'nowrap' }}>デザイン案</span>
        {(Object.keys(MAP) as Key[]).map((key) => (
          <a key={key} href={`#${key}`} aria-current={k === key ? 'page' : undefined}
            style={{ whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: 999, textDecoration: 'none', color: k === key ? '#101114' : '#fff', background: k === key ? '#fff' : 'rgba(255,255,255,0.12)' }}>
            {key.toUpperCase()}　{VARIANT_INFO[key].name}
          </a>
        ))}
      </nav>
      <V key={k} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
