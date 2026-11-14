import * as React from "react"

import { cn } from "@/lib/utils"

// shadcn の Table（21st.dev。olewandowski1 の「Invoice Line Items Table」が使っている形）をもとにした表。
// 見積書の表らしく、罫線をはっきり引き、見出しの下を濃い線にした。行に乗せたときの色の変化は取った（紙なので）。
// 表が広いときは、表の中だけを横スクロールにする（ページは横に動かさない）。

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapClassName?: string }>(
  ({ className, wrapClassName, ...props }, ref) => (
    <div className={cn("relative w-full overflow-x-auto print:overflow-visible", wrapClassName)}>
      <table ref={ref} className={cn("w-full border-collapse text-[15px] leading-snug", className)} {...props} />
    </div>
  ),
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b-[1.5px] [&_tr]:border-ink/70", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t-[1.5px] border-ink/70 font-bold", className)} {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b border-rule", className)} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("px-2 py-2 text-left align-bottom text-xs font-normal text-ink-soft", className)} {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-2 py-2.5 align-top", className)} {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("caption-bottom pt-3 text-left text-[13px] leading-6 text-ink-soft", className)} {...props} />
))
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
