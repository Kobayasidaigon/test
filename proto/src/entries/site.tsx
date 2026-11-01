// 本番（sumugacha.com）の入口。中身は案Aと同じ。試作用の表示の調整は site/site.css で行う。
import React from 'react'
import { createRoot } from 'react-dom/client'
import './site.css'
import Variant from '@/variants/a'

createRoot(document.getElementById('root')!).render(<React.StrictMode><Variant /></React.StrictMode>)
