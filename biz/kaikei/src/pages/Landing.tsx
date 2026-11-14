import { Link } from '@/router'
import { site } from '@/site.config'

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="text-4xl font-bold">{site.name}</h1>
      <p className="mt-4 text-muted-foreground">{site.tagline}</p>
      <div className="mt-8 flex gap-4">
        <Link to="/app" className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">使ってみる</Link>
        <a href="#pricing" className="rounded-lg border px-5 py-3">料金</a>
      </div>
      <section id="pricing" className="mt-[120vh]"><h2 className="text-2xl font-bold">料金</h2></section>
      <footer className="mt-24 flex gap-4 text-sm text-muted-foreground">
        <Link to="/tokushoho">特定商取引法にもとづく表記</Link>
        <Link to="/privacy">プライバシーポリシー</Link>
      </footer>
    </main>
  )
}
