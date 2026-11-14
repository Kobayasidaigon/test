import { DownloadIcon } from 'lucide-react'
import { DATA_NOTE } from '@/core'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 「入力した内容は、このブラウザの中だけにある」ことと、ファイルへの書き出しを、紙の下にいつも出しておく。
// ブラウザのデータは、消えることがある。気づかないまま失わないように、書き出しを目立つ場所に置く。
export function ExportHint({ onExport, className }: { onExport: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 border border-dashed border-ink/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-[13px] leading-6 text-ink-soft">{DATA_NOTE}</p>
      <Button variant="outline" size="sm" className="shrink-0" onClick={onExport}>
        <DownloadIcon aria-hidden className="size-4" />
        ファイルに書き出す
      </Button>
    </div>
  )
}
