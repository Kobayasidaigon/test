import { BookOpenText } from 'lucide-react'
import { Link } from '@/router'
import { Button } from '@/components/ui/button'
import { Container, Phrase } from './Section'

// ページの終わりの、もう一度の入口。新しいことは言わず、最初の2つのボタンを、もう一度置くだけ。
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="pb-16 sm:pb-24">
      <Container>
        <div className="flex flex-col gap-x-10 gap-y-6 rounded-xl border border-border border-t-[3px] border-t-shu bg-paper px-5 py-8 shadow-paper sm:px-9 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="closing-title" className="text-[1.5rem] leading-[1.5] sm:text-[1.8rem]">
              <Phrase>まずは、サンプルで、</Phrase>
              <Phrase>資料の形を見てください。</Phrase>
            </h2>
            <p className="mt-2 max-w-[36em] leading-[1.85] text-muted-foreground">
              入力ずみの見本の帳簿で、入力から、資料の確認と印刷まで、ひととおり試せます。登録はいりません。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button asChild size="lg" variant="outline" className="max-sm:w-full">
              <Link to="/app#sample">
                <BookOpenText aria-hidden="true" />
                サンプルを見る
              </Link>
            </Button>
            <Button asChild size="lg" className="max-sm:w-full">
              <Link to="/app">無料で始める</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
