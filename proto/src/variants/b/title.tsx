// 案B「ドット絵の旅」— スタート画面
import { useMemo } from 'react'
import { SAMPLE_INPUT, cityById } from '@/shared'
import { membersOf } from './pixel'
import { PixelArrow, PixelButton, Tag } from './parts'
import { Ground, Party, Scene, Sky, Clouds, TicketMachine, Gate, Town } from './scene'

export function Title({ onStart }: { onStart: () => void }) {
  const members = useMemo(() => membersOf(SAMPLE_INPUT), [])
  const H = 96, BASE = 68
  return (
    <main className="vb-screen vb-title">
      <div className="vb-col">
        <header className="vb-title__head">
          <p className="vb-title__kicker">家族でめぐる、引っ越し先さがし</p>
          <h1 className="vb-logo" aria-label="住む街ガチャ">
            <span>住む街</span>
            <span className="vb-logo__b">ガチャ</span>
          </h1>
        </header>
        <Scene h={H} label="入力例の家族（大人2人と1歳の子）と貯金箱が、きっぷ売り場と改札に向かって歩いている">
          <Sky base={BASE} />
          <Clouds />
          <Town city={cityById('kita')} base={BASE} />
          <Ground base={BASE} h={H} roll />
          <TicketMachine x={82} base={BASE + 6} />
          <Gate x={106} base={BASE + 6} />
          <Party members={members} x0={8} base={H - 4} maxW={70} state="walk" pigMood="happy" />
        </Scene>
        <section className="vb-panel">
          <p className="vb-lead">家族と年収を教えてくれたら、引っ越し先の街で家計が1年にいくら変わるかを、街ごとに計算します。</p>
          <PixelButton size="lg" block onClick={onStart} className="vb-start">
            <PixelArrow className="vb-btn__arrow" />
            はじめる
          </PixelButton>
          <ul className="vb-notes">
            <li>質問は6つ。1分ほどで終わります。最初は<Tag tone="sample">入力例</Tag>の家族が入っています。</li>
            <li>入力した内容は、この端末の中だけで使います。どこにも送りません。</li>
            <li>結果は計算で決まります。ガチャは見せ方だけで、運では変わりません。</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
