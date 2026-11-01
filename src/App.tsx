import { motion } from "framer-motion";
import { ArrowRight, Code, Mail, PenTool, Rocket } from "lucide-react";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

const services = [
  {
    icon: PenTool,
    title: "デザイン",
    body: "ブランドの空気感を言葉にするところから。ワイヤーフレームとビジュアルを一緒に固めます。",
  },
  {
    icon: Code,
    title: "実装",
    body: "React と Tailwind で、速くて直しやすいサイトに。スマホでの見え方まで丁寧に詰めます。",
  },
  {
    icon: Rocket,
    title: "公開・運用",
    body: "ドメインやホスティングの設定から、公開後の小さな更新まで引き続き対応します。",
  },
];

const steps = [
  { no: "01", title: "ヒアリング", body: "30分のオンライン相談で、目的と予算感をうかがいます。" },
  { no: "02", title: "デザイン", body: "トップページのたたき台を1週間ほどでお見せします。" },
  { no: "03", title: "開発・公開", body: "修正を重ねて、最短2〜3週間で公開まで進めます。" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as const },
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#030303]/60 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span className="inline-block h-3 w-6 rounded-full bg-gradient-to-r from-indigo-400 to-rose-400" />
            Shape Studio
          </a>
          <div className="flex items-center gap-5 text-sm text-white/60">
            <a href="#services" className="hidden hover:text-white sm:inline">サービス</a>
            <a href="#process" className="hidden hover:text-white sm:inline">進め方</a>
            <a
              href="#contact"
              className="rounded-full border border-white/15 px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10"
            >
              お問い合わせ
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        <HeroGeometric
          badge="Web Design & Development"
          title1="アイデアを、"
          title2="かたちに。"
          description="小さなチームのための、Web デザインと実装のスタジオ。企画からデザイン、公開まで、まるごとお手伝いします。"
        >
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#030303] transition-transform hover:scale-[1.03]"
            >
              相談してみる
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white/70 transition-colors hover:text-white"
            >
              サービスを見る
            </a>
          </div>
        </HeroGeometric>

        <section id="services" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-24 md:px-6 md:py-32">
          <motion.div {...fadeUp}>
            <p className="text-sm tracking-widest text-rose-300/80">SERVICES</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">できること</h2>
          </motion.div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {services.map(({ icon: Icon, title, body }, i) => (
              <motion.article
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/20"
              >
                <Icon className="h-6 w-6 text-indigo-300" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="process" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-24 md:px-6 md:pb-32">
          <motion.div {...fadeUp}>
            <p className="text-sm tracking-widest text-indigo-300/80">PROCESS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">進め方</h2>
          </motion.div>
          <ol className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {steps.map((s) => (
              <motion.li
                key={s.no}
                {...fadeUp}
                className="grid gap-2 py-6 md:grid-cols-[6rem_12rem_1fr] md:items-baseline"
              >
                <span className="font-mono text-sm text-white/30">{s.no}</span>
                <span className="text-lg font-semibold">{s.title}</span>
                <span className="text-sm leading-relaxed text-white/50">{s.body}</span>
              </motion.li>
            ))}
          </ol>
        </section>

        <section id="contact" className="scroll-mt-20 px-4 pb-24 md:px-6 md:pb-32">
          <motion.div
            {...fadeUp}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.12] via-transparent to-rose-500/[0.12] px-6 py-16 text-center md:py-20"
          >
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
              まずは、<br className="sm:hidden" />
              気軽にご相談ください。
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
              「まだ何も決まっていない」段階でも大丈夫です。2営業日以内にお返事します。
            </p>
            <a
              href="mailto:hello@example.com"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#030303] transition-transform hover:scale-[1.03]"
            >
              <Mail className="h-4 w-4" />
              hello@example.com
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-8 text-center text-xs text-white/30">
        © 2026 Shape Studio
      </footer>
    </div>
  );
}
