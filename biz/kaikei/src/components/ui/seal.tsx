import { cn } from "@/lib/utils"

// 朱のはんこ。21st.dev の部品ではなく、このサービスのために描いた SVG。
// ・LogoMark … サービスのしるし（帳簿の罫線が入った、角の丸い四角のはんこ）
// ・Seal … 丸いはんこ。照合が合ったときの「合」、読むだけの年度の「済」などに使う
// かすれ（にじみ）は SVG のフィルターで付ける。印刷や、動きを減らす設定でも、形は変わらない。

/** サービスのしるし。字の横に置く小さなはんこ。 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true">
      <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill="none" stroke="var(--shu)" strokeWidth="2.6" />
      <path d="M9 10.5h14M9 16h14M9 21.5h8.5" stroke="var(--shu)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

/** 丸いはんこ。text は1〜2文字。 */
export function Seal({
  text,
  size = 64,
  animate = false,
  className,
  title,
}: {
  text: string
  size?: number
  /** 押したときの動きを付けるか */
  animate?: boolean
  className?: string
  /** 読み上げ用の名前。渡さなければ、飾りとして読み上げない */
  title?: string
}) {
  const two = [...text].length >= 2
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0 -rotate-[8deg]", animate && "animate-[stamp-in_0.35s_ease-out_1]", className)}
    >
      <defs>
        {/* 朱肉のかすれ */}
        <filter id="seal-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#seal-rough)" fill="none" stroke="var(--shu)">
        <circle cx="32" cy="32" r="27" strokeWidth="3.4" />
        <circle cx="32" cy="32" r="22.5" strokeWidth="1" opacity="0.7" />
      </g>
      <text
        x="32"
        y={two ? 39 : 43}
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontWeight="800"
        fontSize={two ? 19 : 30}
        fill="var(--shu)"
        filter="url(#seal-rough)"
      >
        {text}
      </text>
    </svg>
  )
}
