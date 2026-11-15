// 買い切り版の案内と、ライセンスキーを入れる画面。
// - 公開前（公開鍵が未設定）: 買い切り版の機能がすべて使えることを知らせ、無料版の見え方に切りかえられる。
// - 公開後: キーを貼り付けて確かめる。だめなら、返ってきた理由の文をそのまま出す。
// 購入のボタンは、決済ページ（site.checkoutUrl）が空のあいだは「販売準備中」にする（うそのリンクを作らない）。
import { useState, type RefObject } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { site } from '@/site.config'
import type { LicenseState } from '@/lib/use-license'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/field'
import { Notice, NoticeBody, NoticeTitle } from '@/components/ui/notice'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'

export function LicenseDialog({
  open,
  onOpenChange,
  license,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  license: LicenseState
  /** 開いたボタンがもうないとき（メニューから開いたとき）に、閉じたあとフォーカスを戻す先 */
  returnFocus?: RefObject<HTMLElement | null>
}) {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { free, pro } = site.plans

  const submit = async () => {
    setBusy(true)
    setError(null)
    const reason = await license.activate(key)
    setBusy(false)
    if (reason) return setError(reason)
    setKey('')
    toast.success(`${pro.name}版のキーを確かめました。ありがとうございます。`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} returnFocus={returnFocus}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{pro.name}版について</DialogTitle>
          <DialogDescription>{free.name}版は、期限なしで、そのまま使い続けられます。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border-2 border-ink/30 bg-paper px-4 py-3">
                <p className="text-sm font-bold">{free.name}</p>
                <p className="font-num text-xl font-bold">{free.price}</p>
                <ul className="mt-2 grid gap-1 text-[13px] leading-relaxed">
                  {free.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check aria-hidden className="mt-1 size-3.5 shrink-0" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border-2 border-ink bg-card px-4 py-3 shadow-hard-sm">
                <p className="text-sm font-bold">{pro.name}</p>
                <p className="font-num text-xl font-bold">
                  {pro.price}
                  <span className="ml-1 font-sans text-xs font-medium text-ink-soft">税込・1回だけ</span>
                </p>
                <ul className="mt-2 grid gap-1 text-[13px] leading-relaxed">
                  {pro.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check aria-hidden className="mt-1 size-3.5 shrink-0" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-soft">{pro.note}</p>

            {site.checkoutUrl ? (
              <Button asChild>
                <a href={site.checkoutUrl} target="_blank" rel="noreferrer">
                  {pro.name}版を買う（{pro.price}）
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* LP の料金の札と同じ見せ方（薄くせず、点線の枠で「押せない」を伝える） */}
                <Button variant="outline" disabled className="border-dashed border-ink/50 bg-well text-ink-soft shadow-none disabled:opacity-100">
                  販売準備中
                </Button>
                <span className="text-[13px] leading-relaxed text-ink-soft">まだ買えません。販売を始めたら、ここに購入のボタンが出ます。</span>
              </div>
            )}

            {license.prelaunch ? (
              <Notice variant="info">
                <NoticeTitle>いまは公開前のため、{pro.name}版の機能をすべて試せます</NoticeTitle>
                <NoticeBody>
                  <Switch checked={license.previewFree} onChange={license.setPreviewFree} label="無料版の表示を確かめる" description="入にすると、無料版と同じ制限（スタッフの人数、CSV、翌月への引き継ぎ）がかかります。" />
                </NoticeBody>
              </Notice>
            ) : license.license ? (
              <Notice variant="ok">
                <NoticeTitle>{pro.name}版のキーが入っています</NoticeTitle>
                <NoticeBody>
                  <p>
                    お名前: {license.license.name}（{license.license.issuedAt} 発行）
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 border-ink/40"
                    onClick={() => {
                      license.deactivate()
                      toast.message('キーを外しました。無料版として動きます。')
                    }}
                  >
                    このブラウザからキーを外す
                  </Button>
                </NoticeBody>
              </Notice>
            ) : (
              <form
                className="grid gap-2 border-t-2 border-ink/15 pt-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
              >
                <Label htmlFor="license-key">ライセンスキーを入れる</Label>
                <Textarea
                  id="license-key"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setError(null)
                  }}
                  placeholder="メールに書かれたキーを、最初から最後まで貼り付けます"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'license-error' : undefined}
                  className="h-24 break-all font-num text-sm"
                />
                {error ? (
                  <p id="license-error" role="alert" className="rounded-lg border-2 border-danger bg-danger-soft px-3 py-2 text-sm font-bold leading-relaxed text-danger">
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button type="submit" variant="outline" disabled={busy || key.trim() === ''}>
                    キーを確かめる
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
