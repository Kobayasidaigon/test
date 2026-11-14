import { Link } from '@/router'
import { site } from '@/site.config'
import { adDisclosure, consultDesks, DISCLAIMER, CONSULT_NOTE, getSource, RULES_VERIFIED_ON, formatDateJa } from '@/core'

// このサイトについて。
// 【仮のページ】中身のロジックの担当（①）が、/tokushoho を消したあとのリンク切れを防ぐために置いた、最小の形。
// 文とデータ（運営のしかた、免責、相談先、出典）は本物で、src/core と site.config.ts から出している。
// 見た目と構成は、ページの担当（③）が作り直す。
const todo = '（公開前に記入します）'

export default function About() {
  const ad = getSource(adDisclosure.sourceIds[0])
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm text-muted-foreground"><Link to="/" className="underline underline-offset-4">{site.name}</Link></p>
      <h1 className="mt-4 text-2xl font-bold">このサイトについて</h1>
      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground">運営者</h2>
          <dl className="mt-2">
            <div><dt className="inline">運営者: </dt><dd className="inline">{site.operator.name || todo}</dd></div>
            <div><dt className="inline">連絡先: </dt><dd className="inline">{site.operator.email || site.contact || todo}</dd></div>
          </dl>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">料金と運営のしかた</h2>
          <p className="mt-2">{site.pricing.priceNote}</p>
          <p className="mt-2">{site.pricing.revenueNote}</p>
          <p className="mt-2">{adDisclosure.text}（出典: <a className="underline underline-offset-4" href={ad.url}>{ad.publisher}「{ad.title}」</a>）</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">この道具の立て付け</h2>
          <p className="mt-2">{DISCLAIMER}</p>
          <p className="mt-2">ルール（項目のデータと出典）の最終確認日: {formatDateJa(RULES_VERIFIED_ON)}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground">相談先</h2>
          <p className="mt-2">{CONSULT_NOTE}</p>
          <ul className="mt-2 space-y-3">
            {consultDesks.map((d) => {
              const s = getSource(d.sourceId)
              return (
                <li key={d.id}>
                  <span className="font-medium text-foreground">{d.name}{d.phone ? `（電話 ${d.phone}）` : ''}</span>
                  <br />
                  {d.what}{d.hours ? ` 受付: ${d.hours}。` : ''}{d.note ? ` ${d.note}` : ''}
                  <br />
                  <a className="underline underline-offset-4" href={s.url}>{s.publisher}「{s.title}」</a>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}
